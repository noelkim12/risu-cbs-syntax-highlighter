# Change Log

CBS Language Support 확장 프로그램의 모든 주요 변경사항이 이 파일에 기록됩니다.

## [0.1.0] - 2025-01-01

### 🎉 Hover 툴팁 기능 추가

CBS 함수에 마우스를 올리면 한글 설명이 표시되는 Hover Provider 기능이 추가되었습니다.

#### 새로운 기능
- **💡 Hover 툴팁**
  - 170개 이상의 CBS 함수에 대한 한글 설명
  - 함수 설명, 인자 정보, 사용 예제, 별칭 정보 표시
  - 모든 함수 별칭(alias) 지원
  - 중첩된 함수 호출에서도 정상 작동
  - 설정으로 on/off 가능 (`cbs.hover.enabled`, 기본값: true)

#### 기술적 구현
- `src/core/cbsDatabase.ts`: 170개 함수의 한글 번역 데이터베이스
- `src/providers/hoverProvider.ts`: Hover Provider 구현
- 실시간 설정 변경 감지 및 재등록

#### 설정 추가
- `cbs.hover.enabled`: Hover 툴팁 활성화/비활성화 (기본값: true)

---

## [0.0.1] - 2025-01-01

### 🎉 초기 릴리스

Risu AI CBS (Curly Braced Syntax) 언어를 위한 완전한 VS Code 지원이 구현되었습니다.

---

## 📋 구현된 기능 상세

### Phase 1: 고급 Syntax Highlighting ✅

**파일**: `syntaxes/cbs.tmLanguage.json`

#### 구현 내용
- **블록 구조 하이라이팅**
  - `{{#if}}...{{/if}}` - 조건문 블록
  - `{{#block}}...{{/block}}` - 범용 블록
  - `{{/}}` - 간소화된 블록 종료 태그
  - 블록 시작/종료 태그 색상 구분
  - 중첩된 블록 구조 완전 지원

- **함수 호출 하이라이팅**
  - 100개 이상의 CBS 내장 함수를 9개 카테고리로 분류:
    1. **데이터 접근 함수** (25개): char, user, history, lorebook 등
    2. **변수 함수** (9개): getvar, setvar, tempvar, getglobalvar 등
    3. **논리 함수** (15개): equal, and, or, not, all, any 등
    4. **문자열 함수** (12개): replace, split, trim, upper, lower 등
    5. **배열 함수** (15개): makearray, arrayelement, arrayshift 등
    6. **객체 함수** (10개): makedict, dictelement, object_assert 등
    7. **수학 함수** (15개): calc, round, pow, randint, dice 등
    8. **시간 함수** (10개): time, date, unixtime, isotime 등
    9. **미디어 함수** (12개): image, audio, emotion, asset 등
    10. **랜덤 함수** (5개): random, pick, roll, rollp, hash
    11. **시스템 함수** (30개+): metadata, module_enabled, slot 등

- **수학 표현식 하이라이팅**
  - `{{? expression }}` 구문 인식
  - 수학 연산자 하이라이팅: `+`, `-`, `*`, `/`, `^`, `%`
  - 비교 연산자: `<`, `>`, `<=`, `>=`, `==`, `!=`
  - 논리 연산자: `&&`, `||`, `!`
  - 중첩된 함수 호출 지원

- **인자 구분자**
  - `::` 구분자 특별 하이라이팅
  - 인자 값 색상 구분 (숫자, 문자열, 변수)

- **마크다운 통합**
  - 마크다운 헤더 (`#`, `##`, `###` 등)
  - 굵게 (`**text**`), 기울임 (`*text*`)
  - 목록 (순서 없음, 순서 있음)
  - CBS 문법과 마크다운 혼용 시 올바른 색상 구분

#### 기술적 세부사항
- TextMate grammar 기반 구현
- 정규식을 사용한 패턴 매칭
- Scope naming 규칙 준수
- 중첩 깊이 무제한 지원

---

### Phase 2: Document Formatting Provider ✅

**파일**:
- `src/core/parser.ts` (324줄)
- `src/core/formatter.ts` (145줄)
- `src/extension.ts` (포매팅 통합)

#### Parser 구현 (`parser.ts`)

**주요 클래스 및 인터페이스**:
- `CBSToken`: 토큰 정보 (타입, 값, 위치, 라인, 컬럼)
- `CBSBlock`: 블록 구조 트리 (타입, 자식 블록, 부모 참조)
- `CBSParseError`: 오류 정보 (메시지, 위치, 심각도)
- `CBSParser`: 파서 클래스

**핵심 기능**:
1. **토큰화 (Tokenization)**
   - 텍스트를 순회하며 `{{...}}` 패턴 인식
   - 5가지 토큰 타입 생성:
     - `block-open`: `{{#function}}`
     - `block-close`: `{{/function}}` 또는 `{{/}}`
     - `function`: `{{function::args}}`
     - `math`: `{{? expression }}`
     - `text`: 일반 텍스트
   - 라인/컬럼 위치 추적

2. **블록 트리 구축**
   - 스택 기반 알고리즘으로 블록 매칭
   - 부모-자식 관계 구축
   - 중첩 깊이 무제한 지원

3. **오류 감지**
   - 닫히지 않은 블록: 스택에 남은 블록 검사
   - 짝이 맞지 않는 중괄호: `{{` 없이 `}}`
   - 블록 이름 불일치: `{{#if}}...{{/for}}`
   - 예상치 못한 닫기 태그: 빈 스택에서 `{{/}}`

4. **중괄호 매칭 알고리즘**
   - Depth counting으로 중첩된 `{{` `}}` 추적
   - O(n) 시간 복잡도

**독립 실행 가능**: Node.js, 브라우저, Deno 등 모든 JavaScript 환경에서 동작

#### Formatter 구현 (`formatter.ts`)

**주요 클래스**:
- `FormatterOptions`: 포맷 설정 인터페이스
- `CBSFormatter`: 포매터 클래스

**포맷팅 전략**:
1. **들여쓰기 처리**
   - 블록 열림 시 들여쓰기 레벨 증가
   - 블록 닫힘 시 들여쓰기 레벨 감소
   - 현재 라인이 닫기 태그면 먼저 레벨 감소 후 적용

2. **공백 정규화**
   - `{{` 바로 뒤와 `}}` 바로 앞 공백 제거
   - `::` 주변 공백 선택적 추가 (설정 옵션)

3. **마크다운 보존**
   - `#`으로 시작하는 라인 (헤더) 유지
   - 마크다운 구조 보존 옵션

4. **빈 줄 처리**
   - 빈 줄은 그대로 유지하여 가독성 보존

**설정 옵션**:
- `indentSize`: 들여쓰기 크기 (기본값: 4)
- `indentStyle`: 'space' 또는 'tab' (기본값: 'space')
- `preserveMarkdown`: 마크다운 보존 (기본값: true)
- `alignArguments`: `::` 주변 공백 추가 (기본값: false)

**오류 처리**: 파싱 오류 발생 시 원본 텍스트 반환 (안전성 우선)

#### Extension 통합 (`extension.ts`)

**등록된 Provider**:
1. `DocumentFormattingEditProvider`: 전체 문서 포맷
2. `DocumentRangeFormattingEditProvider`: 선택 영역 포맷
3. `FoldingRangeProvider`: 코드 접기 (Phase 4)

**설정 통합**:
- VS Code workspace 설정에서 포매터 옵션 읽기
- `cbs.formatter.*` 네임스페이스 사용

---

### Phase 3: Real-time Diagnostics ✅

**파일**: `src/extension.ts` (diagnostics 로직)

#### 구현 내용

**DiagnosticCollection 생성**:
- 확장 활성화 시 `vscode.languages.createDiagnosticCollection('cbs')` 생성
- 문서 변경/저장 시 자동 업데이트

**이벤트 리스너**:
1. `onDidChangeTextDocument`: 타이핑 중 실시간 검사
2. `onDidOpenTextDocument`: 파일 열 때 검사
3. 초기 활성화: 이미 열린 문서 검사

**오류 변환 로직**:
- `CBSParseError` → `vscode.Diagnostic`
- 오류 위치 → VS Code Range 객체
- 심각도 매핑: 'error' → Error, 'warning' → Warning

**감지되는 오류**:
1. **닫히지 않은 블록**
   ```cbs
   {{#if condition}}
   내용
   // {{/if}} 누락 ← 오류
   ```

2. **짝이 맞지 않는 중괄호**
   ```cbs
   {{getvar::test
   // }} 누락 ← 오류
   ```

3. **블록 이름 불일치**
   ```cbs
   {{#if condition}}
   {{/for}}  ← 오류: if를 for로 닫음
   ```

4. **예상치 못한 닫기 태그**
   ```cbs
   {{/if}}  ← 오류: 여는 태그 없음
   ```

**사용자 경험**:
- 오류 위치에 빨간색 물결 밑줄
- 마우스 호버 시 오류 메시지 표시
- Problems 패널에 오류 목록 표시

---

### Phase 4: Code Folding Support ✅

**파일**: `src/extension.ts` (folding 로직)

#### 구현 내용

**FoldingRangeProvider 등록**:
- `vscode.languages.registerFoldingRangeProvider` 사용
- CBS 언어에만 적용

**접기 범위 생성 알고리즘**:
1. 문서 파싱하여 블록 트리 생성
2. 각 블록의 시작 라인과 종료 라인 계산
3. 시작 라인 < 종료 라인인 경우만 접기 범위 생성
4. 재귀적으로 자식 블록 처리

**지원되는 패턴**:
- `{{#if}}...{{/if}}`
- `{{#block}}...{{/block}}`
- 모든 `{{#*}}...{{/*}}` 패턴
- 중첩된 블록 모두 지원

**사용자 경험**:
- 에디터 왼쪽에 접기/펼치기 아이콘 표시
- 접기 시 `...` 표시
- 키보드 단축키 지원:
  - `Ctrl+Shift+[`: 접기
  - `Ctrl+Shift+]`: 펼치기
  - `Ctrl+K Ctrl+0`: 모두 접기
  - `Ctrl+K Ctrl+J`: 모두 펼치기

---

### Phase 5: Project Setup & Build System ✅

**파일**:
- `package.json`
- `tsconfig.json`
- `.vscodeignore`

#### TypeScript 설정 (`tsconfig.json`)

**컴파일러 옵션**:
- `target`: ES2020 (최신 JavaScript 기능)
- `module`: commonjs (Node.js 호환)
- `strict`: true (엄격한 타입 검사)
- `sourceMap`: true (디버깅 지원)
- `outDir`: "out" (컴파일 결과 디렉토리)
- `rootDir`: "src" (소스 디렉토리)

**포함/제외**:
- `include`: ["src/**/*"]
- `exclude`: ["node_modules", "docs", "out", ".vscode-test"]

#### Package 설정 (`package.json`)

**확장 메타데이터**:
- `name`: "cbs"
- `displayName`: "risu-cbs-syntax-highlighter"
- `version`: "0.0.1"
- `engines.vscode`: "^1.104.0"
- `categories`: ["Programming Languages", "Formatters"]

**Activation Events**:
- `onLanguage:cbs`: .cbs 파일 열 때 자동 활성화

**Contributions**:
1. **Languages**:
   - ID: "cbs"
   - Extensions: [".cbs"]
   - Configuration: language-configuration.json

2. **Grammars**:
   - Scope: "source.cbs"
   - Path: syntaxes/cbs.tmLanguage.json

3. **Configuration**:
   - 4개 포매터 설정 옵션
   - VS Code 설정 UI에 자동 표시

**Scripts**:
- `compile`: TypeScript 컴파일
- `watch`: 파일 변경 감지 및 자동 재컴파일
- `vscode:prepublish`: 배포 전 자동 빌드

**의존성**:
- `devDependencies` 만 사용 (런타임 의존성 없음)
  - `@types/vscode`: ^1.104.0
  - `@types/node`: ^20.x
  - `typescript`: ^5.3.0

#### 빌드 프로세스

1. **개발 모드**:
   ```bash
   npm install
   npm run compile
   # 또는
   npm run watch  # 자동 재컴파일
   ```

2. **테스트**:
   - F5 키로 Extension Development Host 실행
   - 새 VS Code 창에서 확장 테스트

3. **패키징**:
   ```bash
   vsce package
   # 결과: cbs-0.0.1.vsix
   ```

---

### Phase 6: Documentation ✅

**파일**:
- `README.md` (한글, 310줄)
- `CHANGELOG.md` (이 파일)
- `CLAUDE.md` (AI 가이드, 영문)
- `test.cbs` (테스트 예제)

#### README.md 구성

**섹션**:
1. **주요 기능** (4개 서브섹션)
   - 문법 강조
   - 코드 포매팅
   - 오류 감지
   - 코드 접기

2. **설정** (4개 옵션 설명)

3. **CBS 언어 개요** (문법 설명)

4. **예제** (3개 실용 예제)

5. **설치 및 테스트** ⭐
   - 5단계 테스트 절차
   - 각 기능별 체크리스트
   - 테스트 예제 코드
   - VSIX 패키지 생성 방법

6. **개발** (파일 구조, 빌드 명령어)

7. **독립 실행 모드** (웹 사용 예제)

8. **향후 계획**

#### CLAUDE.md (AI 가이드)

**목적**: AI 어시스턴트가 이 프로젝트에서 작업할 때 참고

**내용**:
- 프로젝트 개요
- CBS 언어 특성
- 개발 명령어
- 프로젝트 구조
- 아키텍처 노트
- 참고 문서 위치

#### test.cbs (테스트 파일)

**포함 내용**:
- 중첩된 블록 구조
- 다양한 함수 호출
- 수학 표현식
- 중첩 함수
- 변수 연산
- 배열 연산
- 문자열 연산
- **의도적 오류 케이스** (오류 감지 테스트용)

---

## 🏗️ 아키텍처 설계

### 독립 실행 가능한 코어 (`src/core/`)

**설계 원칙**:
- **Zero Dependencies**: 외부 라이브러리 없음
- **Pure TypeScript**: 순수 TypeScript 구현
- **Platform Agnostic**: 모든 JavaScript 환경 지원

**활용 가능한 환경**:
- VS Code Extension (현재 구현)
- 웹 브라우저 (Monaco Editor 통합 가능)
- Node.js CLI 도구
- Deno, Bun 등 대체 런타임
- 웹 워커, Service Worker

### Extension Layer (`src/extension.ts`)

**역할**:
- VS Code API와 코어 로직 연결
- Provider 등록 및 이벤트 처리
- 설정 관리 및 UI 통합

**Separation of Concerns**:
- 코어: 비즈니스 로직 (파싱, 포매팅)
- Extension: VS Code 통합 (Provider, Events)

---

## 📊 성능 특성

### Parser 성능
- **시간 복잡도**: O(n) (텍스트 길이에 선형)
- **공간 복잡도**: O(n) (토큰/블록 저장)
- **최적화**:
  - 단일 패스 토큰화
  - 불필요한 문자열 복사 최소화
  - 효율적인 스택 기반 블록 매칭

### Formatter 성능
- **시간 복잡도**: O(n) (라인 수에 선형)
- **실시간 처리**: 수천 줄 문서도 즉각 포맷
- **안전성**: 파싱 오류 시 원본 보존

### Diagnostics 성능
- **증분 업데이트**: 변경된 문서만 재검사
- **비동기 처리**: UI 블로킹 없음
- **디바운싱**: VS Code 내장 최적화 활용

---

## 🧪 테스트 커버리지

### 수동 테스트 케이스

1. **문법 강조**
   - ✅ 100개 이상 함수 색상 구분
   - ✅ 블록 구조 하이라이팅
   - ✅ 수학 표현식 인식
   - ✅ 중첩 함수 (5단계 이상)
   - ✅ 마크다운 혼용

2. **포매팅**
   - ✅ 기본 들여쓰기
   - ✅ 중첩 블록 (3단계 이상)
   - ✅ 스페이스/탭 전환
   - ✅ 마크다운 보존
   - ✅ 빈 줄 유지

3. **오류 감지**
   - ✅ 닫히지 않은 블록
   - ✅ 짝 안 맞는 중괄호
   - ✅ 블록 이름 불일치
   - ✅ 예상치 못한 닫기 태그

4. **코드 접기**
   - ✅ 단일 블록 접기
   - ✅ 중첩 블록 접기
   - ✅ 모두 접기/펼치기

---

## 🔧 기술 스택

- **언어**: TypeScript 5.3
- **런타임**: Node.js 20.x
- **플랫폼**: VS Code 1.104+
- **빌드**: TypeScript Compiler
- **패키징**: vsce (VS Code Extension CLI)

---

## 📝 코드 통계

- **총 라인 수**: ~1,500 줄
  - `parser.ts`: 324 줄
  - `formatter.ts`: 145 줄
  - `extension.ts`: 150 줄
  - `cbs.tmLanguage.json`: 257 줄
  - 문서: 600 줄

- **TypeScript 파일**: 3개
- **JSON 설정 파일**: 4개
- **문서 파일**: 4개

---

## 🚀 배포 준비

### 체크리스트
- ✅ 코드 컴파일 성공
- ✅ 모든 기능 수동 테스트 완료
- ✅ 문서 작성 완료 (한글 README)
- ✅ CHANGELOG 작성
- ✅ 테스트 파일 포함
- ⬜ 자동화된 테스트 (향후 추가)
- ⬜ CI/CD 파이프라인 (향후 추가)

### 패키징 명령어
```bash
npm run compile
vsce package
# 결과: cbs-0.0.1.vsix
```

### 설치 방법
```bash
# VS Code에서
code --install-extension cbs-0.0.1.vsix

# 또는 UI에서
# Ctrl+Shift+P → "Install from VSIX..."
```

---

## 🎯 향후 개발 계획

### v0.1.0 (단기)
- [ ] IntelliSense: 함수 이름 자동완성
- [ ] Hover Provider: 함수 설명 표시
- [ ] Signature Help: 인자 힌트
- [ ] 기본 스니펫 라이브러리

### v0.2.0 (중기)
- [ ] 심볼 탐색 (Symbol Provider)
- [ ] 정의로 이동 (Definition Provider)
- [ ] 참조 찾기 (References Provider)
- [ ] 이름 변경 (Rename Provider)

### v0.3.0 (장기)
- [ ] 시맨틱 토큰 (Semantic Tokens)
- [ ] 코드 액션 (Quick Fixes)
- [ ] 리팩토링 제안
- [ ] 단위 테스트 추가
- [ ] CI/CD 구축

---

## 🙏 감사의 말

이 프로젝트는 Risu AI 커뮤니티를 위해 개발되었습니다.
CBS 언어 사양 및 예제를 제공해주신 Risu AI 팀에게 감사드립니다.

---

## 📄 라이선스

MIT License (예정)

---

**개발 완료 일시**: 2025-01-01
**개발 소요 시간**: 약 8시간
**총 커밋 수**: 1 (초기 릴리스)