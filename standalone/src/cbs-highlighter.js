/**
 * CBS Syntax Highlighter
 * Highlights {{ }} bracket pairs with nesting colors
 */

class CBSHighlighter {
  constructor(textarea) {
    this.textarea = textarea;
    this.container = null;
    this.overlay = null;
    // Slightly darker colors for better visibility without borders
    this.colors = [
      '#FFD70033', // Gold - 20% opacity
      '#FF6B9D33', // Pink - 20% opacity
      '#4EC9B033', // Cyan - 20% opacity
      '#C586C033', // Purple - 20% opacity
      '#569CD633', // Blue - 20% opacity
      '#CE917833'  // Orange - 20% opacity
    ];

    this.initialize();
  }

  initialize() {
    // Get computed styles from textarea
    const textareaStyles = window.getComputedStyle(this.textarea);

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'cbs-highlighter-container';
    this.container.style.cssText = `
      position: relative;
      display: inline-block;
      width: 100%;
    `;

    // Create backdrop (for rendering highlighted text)
    this.overlay = document.createElement('div');
    this.overlay.className = 'cbs-highlighter-overlay';
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      font: inherit;
      padding: inherit;
      border: inherit;
      margin: 0;
      color: ${textareaStyles.color};
    `;

    // Wrap textarea
    const parent = this.textarea.parentNode;
    parent.insertBefore(this.container, this.textarea);
    this.container.appendChild(this.overlay);
    this.container.appendChild(this.textarea);

    // Store original styles
    this.originalTextareaColor = textareaStyles.color;
    this.originalBackground = textareaStyles.backgroundColor;

    // Make textarea text invisible but keep caret/selection visible
    this.textarea.style.position = 'relative';
    this.textarea.style.background = 'transparent';
    this.textarea.style.zIndex = '2';
    this.textarea.style.color = 'transparent';
    this.textarea.style.caretColor = this.originalTextareaColor;
    // Selection color remains visible (browser default)

    // Add original background to container
    this.container.style.background = this.originalBackground;

    // Copy all font-related styles to overlay
    this.syncStyles();

    // Bind events
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    window.addEventListener('resize', () => this.syncStyles());
  }

  syncStyles() {
    // Sync all text rendering styles from textarea to overlay
    const textareaStyles = window.getComputedStyle(this.textarea);

    this.overlay.style.fontFamily = textareaStyles.fontFamily;
    this.overlay.style.fontSize = textareaStyles.fontSize;
    this.overlay.style.fontWeight = textareaStyles.fontWeight;
    this.overlay.style.fontStyle = textareaStyles.fontStyle;
    this.overlay.style.lineHeight = textareaStyles.lineHeight;
    this.overlay.style.letterSpacing = textareaStyles.letterSpacing;
    this.overlay.style.wordSpacing = textareaStyles.wordSpacing;
    this.overlay.style.textTransform = textareaStyles.textTransform;
    this.overlay.style.textIndent = textareaStyles.textIndent;
    this.overlay.style.boxSizing = textareaStyles.boxSizing;

    this.overlay.style.paddingTop = textareaStyles.paddingTop;
    this.overlay.style.paddingRight = textareaStyles.paddingRight;
    this.overlay.style.paddingBottom = textareaStyles.paddingBottom;
    this.overlay.style.paddingLeft = textareaStyles.paddingLeft;

    this.overlay.style.borderTopWidth = textareaStyles.borderTopWidth;
    this.overlay.style.borderRightWidth = textareaStyles.borderRightWidth;
    this.overlay.style.borderBottomWidth = textareaStyles.borderBottomWidth;
    this.overlay.style.borderLeftWidth = textareaStyles.borderLeftWidth;
    this.overlay.style.borderStyle = 'solid';
    this.overlay.style.borderColor = 'transparent';
  }

  syncScroll() {
    this.overlay.scrollTop = this.textarea.scrollTop;
    this.overlay.scrollLeft = this.textarea.scrollLeft;
  }

  highlight() {
    const text = this.textarea.value;
    const pairs = CBSParser.findBracketPairs(text);

    if (pairs.length === 0) {
      this.overlay.innerHTML = this.renderText(text);
      return;
    }

    let html = '';
    let lastIndex = 0;

    // Sort pairs by start position
    const sortedPairs = pairs.sort((a, b) => a.openStart - b.openStart);

    // Create ranges for all brackets
    const ranges = [];
    for (const pair of sortedPairs) {
      ranges.push({
        start: pair.openStart,
        end: pair.openEnd,
        level: pair.level,
        type: 'open'
      });
      ranges.push({
        start: pair.closeStart,
        end: pair.closeEnd,
        level: pair.level,
        type: 'close'
      });
    }

    // Sort by position
    ranges.sort((a, b) => a.start - b.start);

    // Build HTML
    for (const range of ranges) {
      // Add text before this range
      if (range.start > lastIndex) {
        html += this.renderText(text.substring(lastIndex, range.start));
      }

      // Add highlighted bracket (no border to avoid width changes)
      const colorIndex = range.level % this.colors.length;
      const bracketText = text.substring(range.start, range.end);
      html += `<span style="background-color: ${this.colors[colorIndex]}; border-radius: 2px;">${this.renderText(bracketText)}</span>`;

      lastIndex = range.end;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      html += this.renderText(text.substring(lastIndex));
    }

    this.overlay.innerHTML = html;
    this.syncScroll();
  }

  renderText(text) {
    // Just escape HTML - white-space: pre-wrap handles the rest
    return this.escapeHTML(text);
  }

  escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      const parent = this.container.parentNode;
      parent.insertBefore(this.textarea, this.container);
      parent.removeChild(this.container);

      // Restore original textarea styles
      this.textarea.style.background = '';
      this.textarea.style.position = '';
      this.textarea.style.zIndex = '';
      this.textarea.style.color = '';
      this.textarea.style.caretColor = '';
    }
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.CBSHighlighter = CBSHighlighter;
}
