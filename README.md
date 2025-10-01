# CBS Language Support for VS Code

Risu AI에서 사용하는 CBS (Curly Braced Syntax) 매크로 스크립트 언어를 위한 완전한 VS Code 확장 프로그램입니다.

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

### 파일 구조

```
risu-formatter/
├── src/
│   ├── extension.ts          # VS Code 확장 진입점
│   └── core/
│       ├── parser.ts          # CBS 파서 (독립 실행 가능)
│       └── formatter.ts       # CBS 포매터 (독립 실행 가능)
├── syntaxes/
│   └── cbs.tmLanguage.json   # TextMate 문법 정의
├── language-configuration.json  # 언어 설정
├── package.json              # 확장 메타데이터
├── tsconfig.json             # TypeScript 설정
└── test.cbs                  # 테스트 파일
```

### 빌드 명령어

```bash
# 의존성 설치
npm install

# TypeScript 컴파일
npm run compile

# Watch 모드 (자동 재컴파일)
npm run watch

# 패키지 생성
vsce package
```

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

- 언어 설정에 포함된 주석 문법 (`// `, `/* */`)은 템플릿에서 상속된 것으로, CBS는 전통적인 주석을 사용하지 않습니다
- 매우 깊게 중첩된 표현식 (10단계 이상)은 문법 강조에 문제가 있을 수 있습니다

## 향후 계획

- IntelliSense 지원 (함수 이름 자동완성)
- 일반적인 CBS 패턴을 위한 스니펫 라이브러리
- 함수 시그니처 도움말

## 기여

이 확장은 Risu AI 커뮤니티를 위해 개발되었습니다. 기여를 환영합니다!

## 라이선스

MIT License

---

**개발자**: Noel Kim
**버전**: 1.0  
**최종 업데이트**: 2025년 10월 1일