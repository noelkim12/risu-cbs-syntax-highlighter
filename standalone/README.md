# CBS Editor - Standalone JavaScript Library

CBS (Curly Braced Syntax) 에디터를 HTML textarea에서 바로 사용할 수 있는 순수 JavaScript 라이브러리입니다.

## 🎯 특징

- ✅ **Zero Dependencies**: 외부 라이브러리 없이 순수 JavaScript만 사용
- ✅ **간단한 사용법**: `<script>` 태그 하나로 즉시 사용 가능
- ✅ **실시간 구문 강조**: `{{}}` 중괄호 쌍을 자동으로 하이라이트
- ✅ **중첩 레벨 표시**: 중첩된 표현식을 색상으로 구분
- ✅ **경량**: Minified 기준 약 15KB

## 📦 설치

### 1. 빌드

```bash
cd standalone
node build.js
```

빌드 결과: `dist/cbs-editor.js` (15KB)

### 2. HTML에서 사용

```html
<!DOCTYPE html>
<html>
<head>
  <title>CBS Editor Demo</title>
</head>
<body>
  <textarea id="cbs-editor"></textarea>

  <!-- CBS Editor 로드 -->
  <script src="cbs-editor.js"></script>

  <!-- 초기화 -->
  <script>
    const textarea = document.getElementById('cbs-editor');
    const editor = new CBSTextarea(textarea, {
      highlightEnabled: true
    });
  </script>
</body>
</html>
```

## 🚀 사용 예시

### 기본 사용

```javascript
// Textarea 요소 선택
const textarea = document.getElementById('my-textarea');

// CBS Editor 초기화
const editor = new CBSTextarea(textarea);

// 완료! 이제 구문 강조가 자동으로 적용됩니다
```

### 옵션 설정

```javascript
const editor = new CBSTextarea(textarea, {
  highlightEnabled: true,      // 구문 강조 활성화 (기본값: true)
  autocompleteEnabled: false,  // 자동완성 (Phase 2)
  signatureEnabled: false      // 시그니처 힌트 (Phase 2)
});
```

### API

```javascript
// 기능 활성화
editor.enable('highlight');

// 기능 비활성화
editor.disable('highlight');

// 하이라이트 새로고침
editor.refresh();

// 에디터 제거
editor.destroy();
```

## 🎨 구문 강조

CBS 코드를 입력하면 자동으로 중괄호 쌍이 하이라이트됩니다:

```cbs
{{char}} says: {{random::Hello::Hi}}

{{#if {{equal::{{user}}::Alice}}}}
  Welcome, Alice!
{{/if}}

{{replace::{{getvar::name}}::old::new}}
```

**중첩 레벨별 색상**:
- Level 0: 🟡 Gold
- Level 1: 🩷 Pink
- Level 2: 🩵 Cyan
- Level 3: 🟣 Purple
- Level 4: 🔵 Blue
- Level 5: 🟠 Orange

## 📁 프로젝트 구조

```
standalone/
├── src/
│   ├── cbs-core.js          # 핵심 데이터베이스 + 파서
│   ├── cbs-highlighter.js   # 구문 강조 엔진
│   └── cbs-textarea.js      # 통합 API
├── dist/
│   └── cbs-editor.js        # 빌드된 단일 파일 (15KB)
├── demo/
│   └── index.html           # 데모 페이지
├── build.js                 # 빌드 스크립트
└── README.md
```

## 🧪 데모 실행

```bash
# 1. 빌드
cd standalone
node build.js

# 2. 데모 페이지 열기
# demo/index.html 파일을 브라우저에서 열기
```

## 📋 로드맵

### ✅ Phase 1 (완료)
- [x] 구문 강조 (Syntax Highlighting)
- [x] 중첩 레벨 색상 구분
- [x] 빌드 시스템
- [x] 데모 페이지

### 🚧 Phase 2 (예정)
- [ ] 자동완성 (Auto-completion)
  - `{{` 입력 시 함수 목록 드롭다운
  - 키보드 탐색 (↑↓ Enter)
  - 실시간 필터링
- [ ] 시그니처 힌트 (Signature Help)
  - `::` 입력 시 인자 정보 툴팁
  - 현재 인자 위치 하이라이트

### 📦 Phase 3 (예정)
- [ ] Minification
- [ ] Source maps
- [ ] NPM 패키지 배포
- [ ] TypeScript 타입 정의

## 🔧 개발

### 소스 파일 수정

`src/` 디렉토리의 파일을 수정한 후:

```bash
node build.js
```

변경사항이 `dist/cbs-editor.js`에 자동으로 반영됩니다.

### CBS 함수 추가

`src/cbs-core.js`의 `CBSDatabase`에 함수 추가:

```javascript
addFunction({
  name: 'myfunction',
  description: '내 함수 설명',
  aliases: ['myfunc'],
  arguments: ['arg1', 'arg2'],
  example: '{{myfunction::value1::value2}}'
});
```

## 🌐 브라우저 호환성

- ✅ Chrome/Edge (최신)
- ✅ Firefox (최신)
- ✅ Safari (최신)
- ⚠️ IE11: 미지원 (ES6+ 사용)

## 📄 라이선스

MIT License

## 🙏 Credits

Based on the VS Code Extension for CBS Language Support.
