/**
 * CBS Auto-completion
 * Provides IntelliSense-style auto-completion dropdown
 */

class CBSAutocomplete {
  constructor(textarea) {
    this.textarea = textarea;
    this.dropdown = null;
    this.currentItems = [];
    this.selectedIndex = 0;
    this.isVisible = false;
    this.triggerPosition = 0;

    this.initialize();
  }

  initialize() {
    // Create dropdown element
    this.dropdown = document.createElement("div");
    this.dropdown.className = "cbs-autocomplete-dropdown";
    this.dropdown.style.cssText = `
      position: absolute;
      display: none;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-height: 300px;
      min-width: 300px;
      overflow-y: auto;
      z-index: 10000;
      border-radius: 4px;
    `;

    document.body.appendChild(this.dropdown);

    // Prevent dropdown from stealing focus
    this.dropdown.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    // Handle item click
    this.dropdown.addEventListener("click", (e) => {
      const item = e.target.closest(".cbs-autocomplete-item");
      if (item) {
        const index = parseInt(item.dataset.index, 10);
        this.selectedIndex = index;
        this.insertSelected();
      }
    });
  }

  show(trigger) {
    const context = CBSParser.findCBSContext(
      this.textarea.value,
      this.textarea.selectionStart
    );

    if (!context || !context.isInsideCBS) {
      this.hide();
      return;
    }

    // Get completions based on context
    this.currentItems = this.getCompletions(context, trigger);

    if (this.currentItems.length === 0) {
      this.hide();
      return;
    }

    this.selectedIndex = 0;
    this.triggerPosition = this.textarea.selectionStart;
    this.render();
    this.position();
    this.isVisible = true;
  }

  getCompletions(context, trigger) {
    const items = [];
    const allFunctions = CBSDatabase.getAllFunctions();
    const input = context.currentInput.toLowerCase();

    // Filter based on context
    for (const func of allFunctions) {
      const funcName = func.name.toLowerCase();

      // Handle different contexts
      if (context.isBlockFunction && !funcName.startsWith("#")) {
        continue; // Only show block functions for {{#
      }

      if (context.isSpecialKeyword && !funcName.startsWith(":")) {
        continue; // Only show special keywords for {{:
      }

      // Remove prefix for matching
      const cleanName = funcName.replace(/^[#:]+/, "");
      const cleanInput = input.replace(/^[#:]+/, "");

      // Match by name or alias
      if (
        cleanName.includes(cleanInput) ||
        func.aliases.some((alias) => alias.toLowerCase().includes(cleanInput))
      ) {
        // Calculate priority
        let priority = 0;
        if (cleanName.startsWith(cleanInput)) priority = 100;
        else if (cleanName.includes(cleanInput)) priority = 50;

        items.push({
          label: func.name.replace(/^#/, ""), // Display without #
          detail: func.description,
          insertText: this.generateInsertText(func),
          args: func.arguments,
          example: func.example,
          priority: priority,
          isBlock: func.name.startsWith("#"),
        });
      }
    }

    // Sort by priority and name
    items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.label.localeCompare(b.label);
    });

    return items.slice(0, 20); // Limit to 20 items
  }

  generateInsertText(func) {
    const name = func.name.replace(/^#/, "");

    if (func.arguments.length === 0) {
      return name;
    }

    // For block functions, generate block structure
    if (func.name.startsWith("#") || func.name.startsWith("//")) {
      return name; // Just insert name, user can type the rest
    }

    // For regular functions with arguments
    return name + "::";
  }

  render() {
    let html = "";

    for (let i = 0; i < this.currentItems.length; i++) {
      const item = this.currentItems[i];
      const isSelected = i === this.selectedIndex;

      html += `
        <div class="cbs-autocomplete-item ${
          isSelected ? "selected" : ""
        }" data-index="${i}">
          <div class="cbs-autocomplete-label">
            ${item.isBlock ? '<span class="cbs-block-badge">#</span>' : ""}
            <strong>${this.escapeHTML(item.label)}</strong>
            ${
              item.args.length > 0
                ? `<span class="cbs-args">(${this.escapeHTML(
                    item.args.join(", ")
                  )})</span>`
                : ""
            }
          </div>
          <div class="cbs-autocomplete-detail">${this.escapeHTML(
            item.detail
          )}</div>
        </div>
      `;
    }

    this.dropdown.innerHTML = html;
  }

  position() {
    // Get cursor position in pixels
    const textBeforeCursor = this.textarea.value.substring(
      0,
      this.textarea.selectionStart
    );
    const lines = textBeforeCursor.split("\n");
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

    let left =
      rect.left +
      paddingLeft +
      currentColumn * charWidth -
      this.textarea.scrollLeft;
    let top =
      rect.top +
      paddingTop +
      currentLine * lineHeight +
      lineHeight -
      this.textarea.scrollTop;

    // Keep dropdown in viewport
    const dropdownWidth = 300;
    const dropdownHeight = Math.min(300, this.currentItems.length * 60);

    if (left + dropdownWidth > window.innerWidth) {
      left = window.innerWidth - dropdownWidth - 10;
    }

    if (top + dropdownHeight > window.innerHeight) {
      top = rect.top - dropdownHeight - 5;
    }

    this.dropdown.style.left = `${left}px`;
    this.dropdown.style.top = `${top}px`;
    this.dropdown.style.display = "block";
  }

  hide() {
    this.dropdown.style.display = "none";
    this.isVisible = false;
    this.currentItems = [];
    this.selectedIndex = 0;
  }

  selectNext() {
    if (!this.isVisible) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.currentItems.length;
    this.render();
    this.scrollToSelected();
  }

  selectPrev() {
    if (!this.isVisible) return;
    this.selectedIndex =
      (this.selectedIndex - 1 + this.currentItems.length) %
      this.currentItems.length;
    this.render();
    this.scrollToSelected();
  }

  scrollToSelected() {
    const items = this.dropdown.querySelectorAll(".cbs-autocomplete-item");
    if (items[this.selectedIndex]) {
      items[this.selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }

  insertSelected() {
    if (!this.isVisible || this.currentItems.length === 0) return;

    const item = this.currentItems[this.selectedIndex];
    const text = this.textarea.value;
    const cursorPos = this.textarea.selectionStart;

    // Find the start of the current CBS expression
    const beforeCursor = text.substring(0, cursorPos);
    const lastOpenIndex = beforeCursor.lastIndexOf("{{");

    if (lastOpenIndex === -1) return;

    // Find what we're replacing
    const cbsContent = text.substring(lastOpenIndex + 2, cursorPos);
    const replaceStart = lastOpenIndex + 2;

    // Handle special prefixes
    let prefix = "";
    if (cbsContent.startsWith("#")) {
      prefix = "#";
    } else if (cbsContent.startsWith(":")) {
      prefix = ":";
    }

    // Build new text
    const before = text.substring(0, replaceStart);
    const after = text.substring(cursorPos);
    const newText = before + prefix + item.insertText + after;

    // Update textarea
    this.textarea.value = newText;

    // Set cursor position
    const newCursorPos = replaceStart + prefix.length + item.insertText.length;
    this.textarea.selectionStart = newCursorPos;
    this.textarea.selectionEnd = newCursorPos;

    // Trigger input event for highlighter
    this.textarea.dispatchEvent(new Event("input", { bubbles: true }));

    // Hide dropdown
    this.hide();

    // Focus back to textarea
    this.textarea.focus();
  }

  onKeyDown(event) {
    if (!this.isVisible) return false;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.selectNext();
        return true;

      case "ArrowUp":
        event.preventDefault();
        this.selectPrev();
        return true;

      case "Enter":
      case "Tab":
        event.preventDefault();
        this.insertSelected();
        return true;

      case "Escape":
        event.preventDefault();
        this.hide();
        return true;

      default:
        return false;
    }
  }

  escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    if (this.dropdown && this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
  }
}

// Export to global scope
if (typeof window !== "undefined") {
  window.CBSAutocomplete = CBSAutocomplete;
}
