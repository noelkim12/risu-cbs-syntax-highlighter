/**
 * CBS Signature Help
 * Provides function signature hints showing parameter information
 */

class CBSSignature {
  constructor(textarea) {
    this.textarea = textarea;
    this.tooltip = null;
    this.isVisible = false;
    this.currentSignature = null;

    this.initialize();
  }

  initialize() {
    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'cbs-signature-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      display: none;
      background: white;
      color: #333;
      border: 1px solid #ccc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      padding: 8px 12px;
      z-index: 10001;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      max-width: 500px;
      line-height: 1.4;
    `;

    document.body.appendChild(this.tooltip);

    // Prevent tooltip from stealing focus
    this.tooltip.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
  }

  /**
   * Get signature help for current cursor position
   */
  getSignatureHelp(text, position) {
    const context = this.findFunctionCall(text, position);

    if (!context) {
      return null;
    }

    // Look up function information
    const functionInfo = CBSDatabase.getFunctionInfo(context.functionName);

    if (!functionInfo) {
      return null;
    }

    // Calculate which parameter is active
    const activeParam = this.calculateActiveParameter(context);

    // Build signature info
    return this.buildSignatureInfo(functionInfo, activeParam);
  }

  /**
   * Find the function call context at cursor position
   * Handles nested CBS expressions
   */
  findFunctionCall(text, position) {
    const beforeCursor = text.substring(0, position);

    // Find the nearest {{ before cursor
    const lastOpenIndex = beforeCursor.lastIndexOf('{{');

    if (lastOpenIndex === -1) {
      return null;
    }

    // Check if we're still inside CBS (no closing }} after {{)
    const afterOpen = text.substring(lastOpenIndex, position);
    const hasClosing = afterOpen.includes('}}');

    if (hasClosing) {
      return null;
    }

    // Extract CBS content
    let cbsContent = afterOpen.substring(2); // Remove {{

    // Remove special prefixes (#, /, :)
    cbsContent = cbsContent.replace(/^[#/:]+/, '');

    // Handle nested function calls by finding the innermost one
    const nestedContext = this.findInnermostFunction(cbsContent, position - lastOpenIndex - 2);

    if (nestedContext) {
      return nestedContext;
    }

    // Parse the main function call
    return this.parseFunctionCall(cbsContent, position - lastOpenIndex - 2);
  }

  /**
   * Find the innermost function call when there are nested expressions
   * Example: {{replace::{{getvar::name}}::old::new}}
   *          If cursor is inside {{getvar::name}}, return that context
   */
  findInnermostFunction(text, cursorPos) {
    let depth = 0;
    let lastOpenPos = -1;

    for (let i = 0; i < Math.min(text.length, cursorPos); i++) {
      if (i < text.length - 1 && text[i] === '{' && text[i + 1] === '{') {
        lastOpenPos = i;
        depth++;
        i++; // Skip next {
      } else if (i < text.length - 1 && text[i] === '}' && text[i + 1] === '}') {
        depth--;
        i++; // Skip next }
      }
    }

    // If we found a nested {{ before cursor
    if (lastOpenPos !== -1 && depth > 0) {
      const nestedContent = text.substring(lastOpenPos + 2);
      const nestedCursorPos = cursorPos - lastOpenPos - 2;

      // Remove special prefixes
      const cleanedContent = nestedContent.replace(/^[#/:]+/, '');
      const prefixLength = nestedContent.length - cleanedContent.length;

      return this.parseFunctionCall(cleanedContent, nestedCursorPos - prefixLength);
    }

    return null;
  }

  /**
   * Parse a function call to extract context
   */
  parseFunctionCall(cbsContent, cursorPos) {
    // Find the first :: separator
    const firstSeparator = cbsContent.indexOf('::');

    if (firstSeparator === -1) {
      // No separator yet, might be typing function name
      return null;
    }

    // Cursor must be after the first ::
    if (cursorPos <= firstSeparator) {
      return null;
    }

    const functionName = cbsContent.substring(0, firstSeparator).trim();
    const argumentText = cbsContent.substring(firstSeparator + 2, cursorPos);
    const cursorPositionInArgs = cursorPos - firstSeparator - 2;

    // Count arguments by counting :: separators in argumentText
    const argumentCount = this.countArguments(argumentText);

    return {
      functionName,
      argumentText,
      cursorPositionInArgs,
      argumentCount
    };
  }

  /**
   * Count how many arguments have been entered
   * Each :: separator adds one argument
   */
  countArguments(argumentText) {
    if (argumentText.trim() === '') {
      return 0;
    }

    // Count :: separators, but ignore those inside nested {{}}
    let count = 0;
    let depth = 0;

    for (let i = 0; i < argumentText.length - 1; i++) {
      if (argumentText[i] === '{' && argumentText[i + 1] === '{') {
        depth++;
        i++; // Skip next {
      } else if (argumentText[i] === '}' && argumentText[i + 1] === '}') {
        depth--;
        i++; // Skip next }
      } else if (depth === 0 && argumentText[i] === ':' && argumentText[i + 1] === ':') {
        count++;
        i++; // Skip next :
      }
    }

    // We've entered at least one argument (the current one)
    return count;
  }

  /**
   * Calculate which parameter is currently active
   */
  calculateActiveParameter(context) {
    // The argument count tells us which parameter we're on
    return Math.max(0, context.argumentCount);
  }

  /**
   * Build signature information from function info
   */
  buildSignatureInfo(functionInfo, activeParameter) {
    const parameters = functionInfo.arguments.map(arg => ({
      label: arg,
      documentation: this.getParameterDocumentation(functionInfo.name, arg)
    }));

    // Build signature label: "functionName(param1, param2, param3)"
    const paramLabels = functionInfo.arguments.join(', ');
    const label = `${functionInfo.name}(${paramLabels})`;

    // Ensure activeParameter doesn't exceed parameter count
    const safeActiveParam = Math.min(activeParameter, parameters.length - 1);

    return {
      label,
      documentation: this.formatFunctionDocumentation(functionInfo),
      parameters,
      activeParameter: Math.max(0, safeActiveParam)
    };
  }

  /**
   * Get documentation for a specific parameter
   */
  getParameterDocumentation(functionName, paramName) {
    // Common parameter descriptions
    const commonDescriptions = {
      'name': '변수 또는 항목의 이름',
      'value': '설정할 값',
      'string': '문자열 값',
      'target': '찾을 대상 문자열',
      'replacement': '대체할 문자열',
      'array': '배열 또는 리스트',
      'index': '배열 인덱스 (0부터 시작)',
      'condition': '조건식 (1 또는 true가 참)',
      'expression': '수학 표현식',
      'format': '날짜/시간 형식 문자열',
      'timestamp': '유닉스 타임스탬프',
      'a': '첫 번째 값',
      'b': '두 번째 값',
      'delimiter': '구분자 문자열',
      'arg1': '첫 번째 인자',
      'arg2': '두 번째 인자',
      'arg3': '세 번째 인자',
      'number': '숫자 값',
      'min': '최소값',
      'max': '최대값',
      'start': '시작 위치',
      'end': '끝 위치',
      'key': '키 이름',
      'prefix': '접두사 문자열',
      'suffix': '접미사 문자열',
      'substring': '부분 문자열',
      'base': '밑수',
      'exponent': '지수',
      'decimals': '소수점 자리수',
      'NdM': '주사위 표기법 (예: 2d6)',
      'hex': '16진수 값',
      'code': '유니코드 코드',
      'size': '크기 값',
      'label': '레이블 텍스트',
      'action': '실행할 동작',
      'text': '텍스트 내용',
      'operator': '연산자 (and, or, is, not 등)',
      'namespace': '네임스페이스 또는 모듈 이름',
      'type': '타입 또는 종류',
      'dict': '딕셔너리/객체',
      'json': 'JSON 데이터',
      'key1': '첫 번째 키',
      'key2': '두 번째 키'
    };

    return commonDescriptions[paramName] || `${paramName} 인자`;
  }

  /**
   * Format function documentation for signature help
   */
  formatFunctionDocumentation(info) {
    let doc = info.description;

    if (info.example) {
      doc += `\n\n예제: ${info.example}`;
    }

    return doc;
  }

  /**
   * Show signature help at current cursor position
   */
  show() {
    const text = this.textarea.value;
    const cursorPos = this.textarea.selectionStart;

    const signature = this.getSignatureHelp(text, cursorPos);

    if (!signature) {
      this.hide();
      return;
    }

    this.currentSignature = signature;
    this.render();
    this.position();
    this.isVisible = true;
  }

  /**
   * Render signature help tooltip
   */
  render() {
    if (!this.currentSignature) {
      return;
    }

    const { label, documentation, parameters, activeParameter } = this.currentSignature;

    // Build HTML
    let html = '<div class="cbs-signature-main">';

    // Function signature with active parameter highlighted
    html += '<div class="cbs-signature-label">';

    // Parse the label to highlight active parameter
    const funcNameEnd = label.indexOf('(');
    const funcName = label.substring(0, funcNameEnd);
    const paramsText = label.substring(funcNameEnd + 1, label.length - 1);
    const params = paramsText.split(', ');

    html += `<span class="cbs-func-name">${this.escapeHTML(funcName)}</span>(`;

    params.forEach((param, i) => {
      if (i > 0) html += ', ';
      if (i === activeParameter) {
        html += `<span class="cbs-active-param">${this.escapeHTML(param)}</span>`;
      } else {
        html += `<span class="cbs-param">${this.escapeHTML(param)}</span>`;
      }
    });

    html += ')';
    html += '</div>';

    // Function documentation
    if (documentation) {
      html += `<div class="cbs-signature-doc">${this.escapeHTML(documentation)}</div>`;
    }

    // Active parameter documentation
    if (parameters[activeParameter]) {
      const paramDoc = parameters[activeParameter].documentation;
      html += `<div class="cbs-param-doc">`;
      html += `<strong>${this.escapeHTML(parameters[activeParameter].label)}</strong>: `;
      html += this.escapeHTML(paramDoc);
      html += `</div>`;
    }

    html += '</div>';

    this.tooltip.innerHTML = html;
  }

  /**
   * Position the tooltip near the cursor
   */
  position() {
    // Get cursor position in pixels
    const textBeforeCursor = this.textarea.value.substring(0, this.textarea.selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length - 1;
    const currentColumn = lines[lines.length - 1].length;

    // Get textarea metrics
    const style = window.getComputedStyle(this.textarea);
    const fontSize = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingTop = parseFloat(style.paddingTop);

    // Calculate position
    const rect = this.textarea.getBoundingClientRect();
    const charWidth = fontSize * 0.6; // Approximate monospace char width

    let left = rect.left + paddingLeft + (currentColumn * charWidth) - this.textarea.scrollLeft;
    let top = rect.top + paddingTop + (currentLine * lineHeight) - lineHeight - this.textarea.scrollTop;

    // Keep tooltip in viewport
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 300;
    const tooltipHeight = tooltipRect.height || 100;

    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    if (top < 0) {
      // Show below cursor instead
      top = rect.top + paddingTop + (currentLine * lineHeight) + lineHeight;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.display = 'block';
  }

  /**
   * Hide signature help
   */
  hide() {
    this.tooltip.style.display = 'none';
    this.isVisible = false;
    this.currentSignature = null;
  }

  /**
   * Escape HTML special characters
   */
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy signature help
   */
  destroy() {
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.CBSSignature = CBSSignature;
}
