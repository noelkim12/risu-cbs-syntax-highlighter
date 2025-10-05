/**
 * CBS Textarea - Integration Layer
 * Main API for CBS editor functionality
 */

class CBSTextarea {
  constructor(textareaElement, options = {}) {
    if (!textareaElement || textareaElement.tagName !== 'TEXTAREA') {
      throw new Error('CBSTextarea requires a textarea element');
    }

    this.textarea = textareaElement;
    this.options = {
      highlightEnabled: true,
      autocompleteEnabled: true,
      signatureEnabled: true,     // Now enabled!
      ...options
    };

    this.highlighter = null;
    this.autocomplete = null;
    this.signature = null;

    this.initialize();
  }

  initialize() {
    // Initialize highlighter
    if (this.options.highlightEnabled) {
      this.highlighter = new CBSHighlighter(this.textarea);
    }

    // Initialize autocomplete
    if (this.options.autocompleteEnabled) {
      this.autocomplete = new CBSAutocomplete(this.textarea);
    }

    // Initialize signature help
    if (this.options.signatureEnabled) {
      this.signature = new CBSSignature(this.textarea);
    }

    // Attach events
    this.attachEvents();

    // Initial highlight
    if (this.highlighter) {
      this.highlighter.highlight();
    }
  }

  attachEvents() {
    // Input event: highlight + autocomplete trigger
    this.textarea.addEventListener('input', (e) => {
      // Update highlight
      if (this.highlighter) {
        this.highlighter.highlight();
      }

      // Trigger autocomplete
      if (this.autocomplete) {
        const value = this.textarea.value;
        const cursorPos = this.textarea.selectionStart;

        // Check for trigger characters
        if (cursorPos >= 2) {
          const lastTwo = value.substring(cursorPos - 2, cursorPos);
          const lastThree = cursorPos >= 3 ? value.substring(cursorPos - 3, cursorPos) : '';

          // Trigger on {{ or {{# or {{: or {{/
          if (lastTwo === '{{' || lastThree === '{{#' || lastThree === '{{:' || lastThree === '{{/') {
            this.autocomplete.show(lastTwo);
          } else if (cursorPos >= 1) {
            // Also trigger on any typing inside CBS
            const context = CBSParser.findCBSContext(value, cursorPos);
            if (context && context.isInsideCBS) {
              this.autocomplete.show();
            }
          }
        }
      }

      // Trigger signature help
      if (this.signature) {
        const value = this.textarea.value;
        const cursorPos = this.textarea.selectionStart;

        // Check if we're inside CBS and after ::
        if (cursorPos >= 2) {
          const lastTwo = value.substring(cursorPos - 2, cursorPos);

          // Show signature help when typing :: or inside function arguments
          if (lastTwo === '::' || lastTwo.endsWith(':')) {
            this.signature.show();
          } else {
            const context = CBSParser.findCBSContext(value, cursorPos);
            if (context && context.isInsideCBS && context.currentInput.includes('::')) {
              this.signature.show();
            } else {
              this.signature.hide();
            }
          }
        }
      }
    });

    // Keydown event: autocomplete navigation
    this.textarea.addEventListener('keydown', (e) => {
      if (this.autocomplete && this.autocomplete.isVisible) {
        const handled = this.autocomplete.onKeyDown(e);
        if (handled) {
          return; // Prevent default behavior
        }
      }
    });

    // Blur event: hide autocomplete and signature
    this.textarea.addEventListener('blur', () => {
      // Delay to allow click on autocomplete item
      setTimeout(() => {
        if (this.autocomplete) {
          this.autocomplete.hide();
        }
        if (this.signature) {
          this.signature.hide();
        }
      }, 200);
    });

    // Window resize: update highlight
    window.addEventListener('resize', () => {
      if (this.highlighter) {
        this.highlighter.highlight();
      }
    });

    // Scroll event: reposition autocomplete and signature
    this.textarea.addEventListener('scroll', () => {
      if (this.autocomplete && this.autocomplete.isVisible) {
        this.autocomplete.position(); // Reposition instead of hide
      }
      if (this.signature && this.signature.isVisible) {
        this.signature.position();
      }
    });
  }

  // Public API
  enable(feature) {
    if (feature === 'highlight' && !this.highlighter) {
      this.options.highlightEnabled = true;
      this.highlighter = new CBSHighlighter(this.textarea);
      this.highlighter.highlight();
    } else if (feature === 'autocomplete' && !this.autocomplete) {
      this.options.autocompleteEnabled = true;
      this.autocomplete = new CBSAutocomplete(this.textarea);
    } else if (feature === 'signature' && !this.signature) {
      this.options.signatureEnabled = true;
      this.signature = new CBSSignature(this.textarea);
    }
  }

  disable(feature) {
    if (feature === 'highlight' && this.highlighter) {
      this.options.highlightEnabled = false;
      this.highlighter.destroy();
      this.highlighter = null;
    } else if (feature === 'autocomplete' && this.autocomplete) {
      this.options.autocompleteEnabled = false;
      this.autocomplete.destroy();
      this.autocomplete = null;
    } else if (feature === 'signature' && this.signature) {
      this.options.signatureEnabled = false;
      this.signature.destroy();
      this.signature = null;
    }
  }

  refresh() {
    if (this.highlighter) {
      this.highlighter.highlight();
    }
  }

  destroy() {
    if (this.highlighter) {
      this.highlighter.destroy();
    }
    if (this.autocomplete) {
      this.autocomplete.destroy();
    }
    if (this.signature) {
      this.signature.destroy();
    }
  }
}

// Export to global scope
if (typeof window !== 'undefined') {
  window.CBSTextarea = CBSTextarea;
}
