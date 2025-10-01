# CBS Language Support for VS Code

Risu AI에서 사용하는 CBS (Curly Braced Syntax) 매크로 스크립트 언어를 위한 완전한 VS Code 확장 프로그램입니다.

## 📦 프로젝트 구조 (Scaffold)

이 확장 프로그램은 다음과 같은 모듈식 구조로 설계되어 있습니다:

```
risu-formatter/
├── src/                            # TypeScript 소스 코드
│   ├── extension.ts                # VS Code 확장 진입점
│   ├── core/                       # 핵심 CBS 처리 로직 (독립 실행 가능)
│   │   ├── parser.ts               # CBS 구문 파서
│   │   ├── formatter.ts            # CBS 코드 포매터
│   │   └── cbsDatabase.ts          # CBS 함수 메타데이터 데이터베이스 (170+ 함수)
│   └── providers/                  # VS Code 기능 제공자
│       ├── hoverProvider.ts        # Hover 툴팁 제공
│       ├── diagnosticProvider.ts   # 오류 진단 제공
│       └── foldingProvider.ts      # 코드 접기 제공
├── syntaxes/                       # TextMate 문법 정의
│   └── cbs.tmLanguage.json         # CBS 구문 강조 규칙
├── language-configuration.json     # 언어 편집 설정 (브래킷 매칭 등)
├── package.json                    # 확장 메타데이터 및 설정
├── tsconfig.json                   # TypeScript 컴파일러 설정
└── test.cbs                        # 테스트 파일
```

### 🔍 주요 소스 코드 설명

#### **`src/extension.ts`** - VS Code 확장 진입점

VS Code 확장의 메인 진입점으로, 모든 기능을 활성화하고 등록합니다.

**주요 역할**:
- CBS 언어 서비스 초기화
- 모든 Provider(Hover, Diagnostic, Folding) 등록
- Document Formatter 등록
- 사용자 설정 로드 및 적용

**핵심 함수**:
```typescript
export function activate(context: vscode.ExtensionContext)
```
- 확장이 활성화될 때 호출되어 모든 기능을 초기화합니다
- `vscode.languages.registerHoverProvider()`: Hover 툴팁 등록
- `vscode.languages.registerDocumentFormattingEditProvider()`: 포매터 등록
- `vscode.languages.registerFoldingRangeProvider()`: 코드 접기 등록

#### **`src/core/parser.ts`** - CBS 구문 파서

CBS 코드를 토큰으로 분해하고 블록 트리를 구성하는 핵심 파서입니다.

**주요 역할**:
- CBS 표현식 토큰화 (`{{function}}`, `{{#if}}`, `{{? math}}`)
- 중첩된 블록 구조 파싱
- 구문 오류 감지 및 보고
- 블록 트리 생성

**핵심 클래스 및 인터페이스**:
```typescript
export interface CBSToken {
    type: 'block-open' | 'block-close' | 'function' | 'math' | 'text';
    value: string;
    start: number;
    end: number;
    line: number;
    column: number;
}

export interface CBSBlock {
    type: string;              // 블록 타입 (if, when, each 등)
    start: number;
    end: number;
    line: number;
    children: CBSBlock[];      // 중첩된 자식 블록들
    parent?: CBSBlock;
}

export class CBSParser {
    parse(): { tokens: CBSToken[]; errors: CBSParseError[]; blocks: CBSBlock[] }
}
```

**파싱 프로세스**:
1. **Tokenize**: 텍스트를 한 글자씩 읽으며 `{{`를 만나면 CBS 표현식 감지
2. **Template Parsing**: 표현식 타입 판별 (`#`, `/`, `?`, 일반 함수)
3. **Block Tree Building**: 블록 열기/닫기 토큰을 스택으로 매칭하여 트리 구성
4. **Error Detection**: 닫히지 않은 블록, 불일치하는 블록 등 감지

**중첩 처리**:
```typescript
private findClosingBraces(): number
```
- 깊이 추적 알고리즘으로 중첩된 `{{}}` 올바르게 매칭
- 예: `{{#if {{? {{getvar::x}}}}}}`를 올바르게 파싱

#### **`src/core/formatter.ts`** - CBS 코드 포매터

CBS 코드의 들여쓰기와 간격을 자동으로 정리하는 포매터입니다.

**주요 역할**:
- 블록 구조에 따른 자동 들여쓰기
- `::` 구분자 주변 공백 정규화
- 마크다운 구문 보존
- 중괄호 내부 공백 정리

**핵심 클래스 및 인터페이스**:
```typescript
export interface FormatterOptions {
    indentSize: number;        // 들여쓰기 크기 (스페이스 개수)
    indentStyle: 'space' | 'tab';
    preserveMarkdown: boolean; // 마크다운 구문 보존 여부
    alignArguments: boolean;   // :: 주변 공백 추가 여부
}

export class CBSFormatter {
    format(text: string): string
}
```

**포맷팅 알고리즘**:
1. **Parse**: `CBSParser`로 블록 구조 분석
2. **Line Processing**: 각 줄을 순회하며 들여쓰기 계산
   - 블록 열기 (`{{#if}}`) 감지 → 다음 줄 들여쓰기 증가
   - 블록 닫기 (`{{/if}}`) 감지 → 현재 줄 들여쓰기 감소
3. **Formatting**: 공백 정규화 및 마크다운 보존
4. **Output**: 포맷팅된 텍스트 반환

**설정 가능한 포맷팅 규칙**:
- 들여쓰기 스타일 (스페이스/탭)
- 들여쓰기 크기 (2, 4, 8 등)
- `::` 구분자 정렬 여부
- 마크다운 헤더(`#`) 보존 여부

#### **`src/core/cbsDatabase.ts`** - CBS 함수 메타데이터

170개 이상의 CBS 내장 함수에 대한 메타데이터를 관리하는 데이터베이스입니다.

**주요 역할**:
- 모든 CBS 함수의 이름, 설명, 인자, 예제 저장
- 함수 별칭 관리 (예: `getvar` = `tempvar`)
- Hover 툴팁에서 함수 정보 제공
- 함수 검색 및 조회 API 제공

**핵심 인터페이스**:
```typescript
interface CBSFunction {
    name: string;              // 함수 이름
    description: string;       // 한글 설명
    aliases: string[];         // 별칭 목록
    arguments: string[];       // 인자 목록
    example: string;          // 사용 예제
}
```

**함수 카테고리** (170+ 함수):
- **데이터 접근**: `char`, `user`, `history`, `lorebook` (20개)
- **변수**: `getvar`, `setvar`, `tempvar`, `addvar` (8개)
- **논리 연산**: `equal`, `and`, `or`, `not`, `all`, `any` (12개)
- **문자열**: `replace`, `split`, `trim`, `upper`, `lower`, `length` (15개)
- **배열**: `makearray`, `arrayelement`, `arraypush`, `filter` (15개)
- **객체**: `makedict`, `dictelement`, `object_assert` (10개)
- **수학**: `calc`, `round`, `pow`, `min`, `max`, `sum` (15개)
- **시간**: `time`, `date`, `unixtime`, `isotime`, `datetimeformat` (10개)
- **미디어**: `image`, `audio`, `emotion`, `video`, `bg` (15개)
- **랜덤**: `random`, `pick`, `roll`, `dice`, `hash` (6개)
- **암호화**: `xor`, `crypt`, `caesar`, `encrypt`, `decrypt` (8개)
- **제어**: `hiddenkey`, `trigger_id`, `jb`, `jbtoggled` (4개)
- **시스템**: `chat_index`, `blank`, `br`, `model`, `maxcontext` (30개)
- **블록**: `#if`, `#when`, `#each`, `:else`, `#puredisplay`, `//`, `?` (7개)

**함수 조회 API**:
```typescript
export function getFunctionInfo(name: string): CBSFunction | undefined
```
- 함수 이름 또는 별칭으로 검색
- 대소문자 구분 없이 조회 가능
- `#if`, `#when` 등 특수 문자 포함 함수도 지원

#### **`src/providers/hoverProvider.ts`** - Hover 툴팁 제공자

CBS 함수 위에 마우스를 올렸을 때 한글 설명 툴팁을 표시합니다.

**주요 역할**:
- 커서 위치의 CBS 함수 감지
- `cbsDatabase.ts`에서 함수 정보 조회
- 마크다운 형식의 툴팁 생성
- 특수 문자(`#`, `?`, `::`, `//`) 처리

**핵심 메서드**:
```typescript
provideHover(document, position, token): vscode.Hover | null
```
1. **Context Detection**: `getCBSContext()` - 커서가 `{{...}}` 내부인지 확인
2. **Word Extraction**: `getExtendedWordAtPosition()` - 특수 문자 포함 단어 추출
3. **Function Resolution**: `extractFunctionName()` - CBS 문맥에서 함수명 추출
4. **Info Retrieval**: `getFunctionInfo()` - 함수 정보 조회
5. **Tooltip Creation**: `createHoverContent()` - 마크다운 툴팁 생성

**특수 문자 처리**:
- `{{#if}}` → `#` 감지 후 `"#if"` 반환
- `{{:else}}` → `:` 감지 후 `"else"` 반환
- `{{?}}` → `?` 감지 후 `"?"` 반환
- `{{//}}` → `//` 감지 후 `"//"` 반환

**중첩 표현식 처리**:
```typescript
private getCBSContext(line: string, cursorPosition: number): string | null
```
- 스택 기반 파서로 중첩된 `{{...}}` 올바르게 감지
- 예: `{{#if {{? {{getvar::x}}}}}}` → 가장 안쪽 표현식 감지

#### **`src/providers/diagnosticProvider.ts`** - 오류 진단 제공자

CBS 코드의 구문 오류를 실시간으로 감지하고 표시합니다.

**주요 역할**:
- 파일 저장 또는 변경 시 자동으로 구문 검사
- `CBSParser`의 오류 정보를 VS Code 진단으로 변환
- 에디터에 빨간 밑줄과 오류 메시지 표시

**감지하는 오류 유형**:
1. **닫히지 않은 블록**: `{{#if}}` 후 `{{/if}}` 누락
2. **블록 불일치**: `{{#if}}...{{/when}}` (열기/닫기 타입 다름)
3. **예상치 못한 닫기 태그**: `{{/if}}` 앞에 `{{#if}}` 없음
4. **중괄호 누락**: `{{function::arg` (닫는 `}}` 누락)

**핵심 메서드**:
```typescript
updateDiagnostics(document: vscode.TextDocument): void
```
1. `CBSParser.parse()` 호출하여 오류 수집
2. 각 오류를 `vscode.Diagnostic` 객체로 변환
3. `diagnosticCollection.set()` 호출하여 에디터에 표시

#### **`src/providers/foldingProvider.ts`** - 코드 접기 제공자

CBS 블록 구조를 접고 펼칠 수 있는 기능을 제공합니다.

**주요 역할**:
- `{{#block}}...{{/block}}` 구조 감지
- 접기 가능한 영역(Folding Range) 생성
- 중첩된 블록도 개별 접기 가능

**핵심 메서드**:
```typescript
provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[]
```
1. `CBSParser.parse()` 호출하여 블록 트리 수집
2. 각 블록을 `vscode.FoldingRange`로 변환
3. 중첩된 블록도 재귀적으로 처리

**지원하는 블록 타입**:
- `{{#if}}...{{/if}}`
- `{{#when}}...{{/when}}`
- `{{#each}}...{{/each}}`
- `{{#puredisplay}}...{{/puredisplay}}`
- 사용자 정의 블록 `{{#custom}}...{{/custom}}`

#### **`syntaxes/cbs.tmLanguage.json`** - TextMate 문법 정의

VS Code의 문법 강조(Syntax Highlighting)를 위한 TextMate 문법 규칙입니다.

**주요 역할**:
- CBS 표현식 패턴 매칭
- 함수, 블록, 연산자 등을 색상으로 구분
- 중첩 표현식 지원
- 마크다운 구문 통합

**핵심 패턴**:
1. **`cbs-comment`**: `{{// 주석}}`
2. **`cbs-else`**: `{{:else}}`
3. **`cbs-block-open`**: `{{#function ...}}`
4. **`cbs-block-close`**: `{{/function}}`
5. **`cbs-math-expression`**: `{{? 1+2}}`
6. **`cbs-function-call`**: `{{function::arg1::arg2}}`

**함수 카테고리별 색상**:
- **데이터 접근**: `entity.name.function.data.cbs`
- **변수**: `entity.name.function.variable.cbs`
- **논리 연산**: `entity.name.function.logic.cbs`
- **문자열**: `entity.name.function.string.cbs`
- **배열**: `entity.name.function.array.cbs`
- **시스템**: `entity.name.function.system.cbs`

**중첩 처리**:
모든 패턴에 재귀적 `patterns` 포함:
```json
"patterns": [
    {"include": "#cbs-comment"},
    {"include": "#cbs-block-open"},
    {"include": "#cbs-function-call"}
]
```

#### **`language-configuration.json`** - 언어 편집 설정

VS Code 에디터의 CBS 언어 편집 동작을 정의합니다.

**주요 설정**:
- **Brackets**: `{}`, `[]`, `()` 매칭
- **Auto-closing Pairs**: `{{` 입력 시 자동으로 `}}` 추가
- **Surrounding Pairs**: 텍스트 선택 후 `{` 입력 시 `{...}` 감싸기
- **Comments**: `//`, `/* */` (주: CBS는 `{{//}}`를 사용하므로 이 설정은 참고용)

**브래킷 설정**:
```json
{
    "brackets": [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"]
    ],
    "autoClosingPairs": [
        { "open": "{{", "close": "}}" },
        { "open": "{", "close": "}" }
    ]
}
```

## 주요 기능

### 🎨 문법 강조 (Syntax Highlighting)

- **블록 구조**: `{{#if}}...{{/if}}`, `{{#block}}...{{/block}}`
- **함수 호출**: `{{char}}`, `{{getvar::name}}`
- **수학 표현식**: `{{? 1 + 2 * 6}}`
- **중첩 함수**: `{{random::{{user}}::{{char}}}}`
- **100개 이상의 내장 함수**를 카테고리별로 색상 구분:
  - 데이터 접근 (char, user, history 등)
  - 변수 (getvar, setvar, tempvar)
  - 논리 연산 (if, equal, and, or)
  - 문자열 연산 (replace, split, trim)
  - 배열 & 객체 (makearray, arrayelement)
  - 수학 (calc, round, pow)
  - 시간 & 날짜 (time, date, unixtime)
  - 미디어 (image, audio, emotion)
  - 랜덤 (random, roll, dice)

### ✨ 코드 포매팅

CBS 코드를 올바른 들여쓰기와 간격으로 자동 정렬:

- **자동 들여쓰기** - 중첩된 블록 자동 인식
- **들여쓰기 스타일 설정** - 스페이스 또는 탭 선택
- **마크다운 보존** - 마크다운 포맷 유지
- **인자 정렬** - `::` 구분자 주변 공백 옵션

**사용 방법**:
- 마우스 우클릭 → "문서 서식" 선택
- 키보드 단축키: `Shift+Alt+F` (Windows/Linux) 또는 `Shift+Option+F` (Mac)
- 저장 시 자동 포맷 설정 가능

### 🔍 오류 감지 (Error Detection)

실시간 문법 오류 감지 및 표시:

- **닫히지 않은 블록**: `{{/if}}` 또는 `{{/block}}` 누락
- **짝이 맞지 않는 중괄호**: `{{` 없이 `}}`만 있는 경우
- **블록 불일치**: `{{#if}}...{{/for}}`와 같은 잘못된 매칭
- **예상치 못한 닫기 태그**: 여는 태그 없이 `{{/if}}`만 있는 경우

오류는 에디터에서 밑줄과 함께 도움말 메시지로 표시됩니다.

### 📁 코드 접기 (Code Folding)

더 나은 코드 구조화를 위한 블록 접기/펼치기:

- `{{#if}}...{{/if}}` 블록 접기
- `{{#block}}...{{/block}}` 구조 접기
- 중첩된 블록 자동 감지

### 💡 Hover 툴팁

마우스를 CBS 함수 위에 올리면 한글 설명이 표시됩니다:

- **함수 설명**: 함수가 하는 일에 대한 한글 설명
- **인자 정보**: 필요한 인자 목록
- **사용 예제**: 함수 사용 예시
- **별칭**: 다른 이름으로 호출 가능한 별칭 정보

**예시**:
```cbs
{{getvar::score}}  ← 마우스를 올리면 "채팅 변수를 가져옵니다" 표시
{{char}}           ← "캐릭터의 이름 또는 별명을 반환합니다"
{{random::a::b}}   ← "인자 중 하나를 랜덤하게 선택합니다"
```

**설정**: `cbs.hover.enabled` (기본값: true)

### 🌐 마크다운 통합

CBS는 마크다운과 함께 사용되도록 설계되었습니다. 이 확장은:

- 마크다운 포맷 보존 (제목, 굵게, 기울임, 목록)
- 마크다운에 포함된 CBS 문법 강조
- 마크다운 구조를 깨지 않고 CBS 포맷팅

## 설정

VS Code 설정에서 포매터를 구성할 수 있습니다:

```json
{
  "cbs.formatter.indentSize": 4,
  "cbs.formatter.indentStyle": "space",
  "cbs.formatter.preserveMarkdown": true,
  "cbs.formatter.alignArguments": false,
  "cbs.hover.enabled": true
}
```

### 설정 옵션

**포매터 설정**:
- `cbs.formatter.indentSize`: 들여쓰기 레벨당 스페이스 개수 (기본값: 4)
- `cbs.formatter.indentStyle`: "space" 또는 "tab" 선택 (기본값: "space")
- `cbs.formatter.preserveMarkdown`: 마크다운 포맷 유지 (기본값: true)
- `cbs.formatter.alignArguments`: `::` 구분자 주변에 공백 추가 (기본값: false)

**Hover 툴팁 설정**:
- `cbs.hover.enabled`: CBS 함수에 마우스를 올렸을 때 한글 설명 툴팁 표시 (기본값: true)

## CBS 언어 개요

CBS (Curly Braced Syntax)는 다음과 같은 주요 기능을 가진 템플릿 매크로 언어입니다:

### 기본 문법

```cbs
{{function_name}}
{{function_name::arg1::arg2::arg3}}
{{random::{{user}}::{{char}}}}
```

### 블록 문법

```cbs
{{#if condition}}
  여기에 내용
{{/if}}

{{#block name}}
  여기에 내용
{{/block}}
{{/}}
```

### 수학 표현식

```cbs
{{? 1 + 2 * 6}}
{{? {{getvar::count}} > 5}}
```

## 예제

### 예제 1: 캐릭터 설명

```cbs
# 캐릭터 프로필

이름: {{char}}
성격: {{personality}}

{{#if {{? {{getvar::relationship}}>5}}}}
{{char}}는 {{user}}와 친밀한 관계입니다.
{{/if}}
```

### 예제 2: 동적 콘텐츠

```cbs
{{#if {{? {{getglobalvar::mode}}=1}}}}
## 일반 모드
현재 시간: {{time}}
랜덤 인사: {{random::안녕::하이::헬로}} {{user}}!
{{/if}}
```

### 예제 3: 복잡한 로직

```cbs
{{#if {{? {{lastmessageid}}>=10}}}}
  {{#if {{? {{getvar::score}}>100}}}}
    **축하합니다!** 높은 점수를 달성했습니다!
  {{/if}}
{{/if}}
```

## 설치 및 테스트

### 개발 환경에서 테스트

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **컴파일**
   ```bash
   npm run compile
   ```

3. **Extension Development Host 실행**
   - VS Code에서 이 폴더 열기
   - `F5` 키를 눌러 새 VS Code 창 열기
   - 또는 "실행 및 디버그" 메뉴에서 "Run Extension" 선택

4. **테스트 파일 열기**
   - 새로 열린 창에서 `test.cbs` 파일 열기
   - 또는 새로운 `.cbs` 파일 생성

5. **기능 테스트**
   - ✅ **문법 강조**: CBS 함수가 색상으로 표시되는지 확인
   - ✅ **포매팅**:
     - 마우스 우클릭 → "문서 서식" 선택
     - 또는 `Shift+Alt+F` 단축키 사용
     - 들여쓰기가 자동으로 정렬되는지 확인
   - ✅ **오류 감지**:
     - `{{#if}}` 작성 후 닫는 태그를 쓰지 않으면 빨간 밑줄 표시
     - `{{getvar::test` (닫는 중괄호 누락) 작성 시 오류 표시
   - ✅ **코드 접기**:
     - 블록 구조 왼쪽의 접기 아이콘 클릭
     - `{{#if}}...{{/if}}` 블록이 접히는지 확인

### 테스트 예제 코드

프로젝트 루트의 `test.cbs` 파일에 다음 예제가 포함되어 있습니다:

```cbs
# 테스트 CBS 파일

{{#if {{? {{getglobalvar::toggle_response_mode}}<3}}}}
{{#if {{? {{lastmessageid}}>=8}}}}
  중첩된 블록 테스트
{{/if}}
{{/if}}

기본 함수: {{char}}는 {{user}}의 친구입니다.

수학 표현식: {{? 1 + 2 * 6}}

중첩 함수: {{random::{{user}}::{{char}}}}

# 오류 케이스 (빨간 밑줄로 표시되어야 함)

{{#if 닫히지 않은 블록

{{getvar::test - 중괄호 누락
```

### VSIX 패키지 생성 (배포용)

```bash
# vsce 설치 (처음 한 번만)
npm install -g @vscode/vsce

# 패키지 생성
npm run compile
vsce package
```

생성된 `.vsix` 파일을 VS Code에서 설치:
1. VS Code에서 `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)
2. "Extensions: Install from VSIX..." 선택
3. 생성된 `.vsix` 파일 선택

## 개발

### 빌드 명령어

```bash
# 의존성 설치
npm install

# TypeScript 컴파일
npm run compile

# Watch 모드 (자동 재컴파일)
npm run watch

# 패키지 생성
npm run package
# 또는
vsce package
```

### 개발 워크플로우

1. **코드 수정**: `src/` 디렉토리에서 TypeScript 코드 수정
2. **컴파일**: `npm run compile` 또는 `npm run watch`로 자동 컴파일
3. **테스트**: `F5`로 Extension Development Host 실행
4. **디버깅**: VS Code 디버거를 사용하여 브레이크포인트 설정
5. **패키징**: `npm run package`로 VSIX 파일 생성

## 독립 실행 모드 (웹에서 사용)

파서와 포매터는 VS Code 없이도 독립적으로 사용 가능합니다:

```typescript
import { CBSParser, CBSFormatter } from './core';

// CBS 코드 파싱
const parser = new CBSParser(text);
const { tokens, errors, blocks } = parser.parse();

// CBS 코드 포맷팅
const formatter = new CBSFormatter({
  indentSize: 4,
  indentStyle: 'space'
});
const formatted = formatter.format(text);
```

이 기능은 웹 브라우저나 다른 JavaScript 환경에서도 CBS 파싱/포맷팅을 사용할 수 있도록 zero-dependency로 설계되었습니다.

## 알려진 제한사항

- `language-configuration.json`에 포함된 주석 문법 (`//`, `/* */`)은 일반적인 프로그래밍 언어 템플릿에서 상속된 것으로, CBS는 `{{//}}` 형식의 주석을 사용합니다
- 매우 깊게 중첩된 표현식 (15단계 이상)은 TextMate 문법 엔진의 한계로 문법 강조가 제한될 수 있습니다
- 파서는 중첩 제한이 없지만, 실시간 문법 강조는 성능을 위해 재귀 깊이가 제한되어 있습니다

## 향후 계획

- **IntelliSense 지원**: 함수 이름 자동완성 (Completion Provider)
- **스니펫 라이브러리**: 일반적인 CBS 패턴을 위한 코드 스니펫
- **함수 시그니처 도움말**: 함수 입력 시 인자 힌트 (Signature Help)
- **정의로 이동**: 변수 정의 위치로 점프 (Definition Provider)
- **참조 찾기**: 변수/함수 사용 위치 검색 (References Provider)
- **리팩토링**: 변수/함수 이름 일괄 변경 (Rename Provider)

## 기술 스택

- **언어**: TypeScript 5.0+
- **런타임**: Node.js 18+
- **프레임워크**: VS Code Extension API 1.85.0+
- **문법 정의**: TextMate Grammar (JSON)
- **빌드 도구**: TypeScript Compiler, VS Code Extension Manager (vsce)

## 기여

이 확장은 Risu AI 커뮤니티를 위해 개발되었습니다. 기여를 환영합니다!

### 기여 방법

1. **이슈 보고**: GitHub Issues에 버그 리포트 또는 기능 제안
2. **Pull Request**: 코드 개선 또는 새 기능 구현
3. **문서 개선**: README, 코드 주석, 예제 추가
4. **테스트**: 다양한 CBS 코드로 확장 테스트 및 피드백

### 개발 가이드

- **코드 스타일**: TypeScript 표준 스타일 가이드 준수
- **주석**: 모든 public API에 JSDoc 주석 (한글) 작성
- **테스트**: 새 기능에 대한 테스트 케이스 추가
- **커밋**: 명확한 커밋 메시지 작성 (한글/영문 모두 가능)

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

**개발자**: Noel Kim
**버전**: 1.0.0
**최종 업데이트**: 2025년 10월 2일
**GitHub**: [risu-formatter](https://github.com/yourusername/risu-formatter)
**VS Code Marketplace**: Coming Soon