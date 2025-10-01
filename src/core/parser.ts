/**
 * CBS Parser - Core parsing logic for CBS syntax
 * Can be used standalone in web environments
 */

export interface CBSToken {
    type: 'block-open' | 'block-close' | 'function' | 'math' | 'text' | 'argument-separator';
    value: string;
    start: number;
    end: number;
    line: number;
    column: number;
}

export interface CBSBlock {
    type: string;
    start: number;
    end: number;
    line: number;
    children: CBSBlock[];
    parent?: CBSBlock;
}

export interface CBSParseError {
    message: string;
    start: number;
    end: number;
    line: number;
    severity: 'error' | 'warning';
}

export class CBSParser {
    private text: string;
    private position: number;
    private line: number;
    private column: number;
    private tokens: CBSToken[];
    private errors: CBSParseError[];

    constructor(text: string) {
        this.text = text;
        this.position = 0;
        this.line = 0;
        this.column = 0;
        this.tokens = [];
        this.errors = [];
    }

    parse(): { tokens: CBSToken[]; errors: CBSParseError[]; blocks: CBSBlock[] } {
        this.tokenize();
        const blocks = this.buildBlockTree();
        return {
            tokens: this.tokens,
            errors: this.errors,
            blocks
        };
    }

    private tokenize(): void {
        while (this.position < this.text.length) {
            const char = this.text[this.position];

            if (char === '\n') {
                this.line++;
                this.column = 0;
                this.position++;
                continue;
            }

            // Check for {{ start
            if (char === '{' && this.peek(1) === '{') {
                this.parseTemplate();
            } else {
                this.position++;
                this.column++;
            }
        }
    }

    private parseTemplate(): void {
        const start = this.position;
        const startLine = this.line;
        const startColumn = this.column;

        this.position += 2; // Skip {{
        this.column += 2;

        // Check for block open {{#
        if (this.current() === '#') {
            this.parseBlockOpen(start, startLine, startColumn);
            return;
        }

        // Check for block close {{/
        if (this.current() === '/') {
            this.parseBlockClose(start, startLine, startColumn);
            return;
        }

        // Check for math expression {{?
        if (this.current() === '?') {
            this.parseMathExpression(start, startLine, startColumn);
            return;
        }

        // Regular function call
        this.parseFunctionCall(start, startLine, startColumn);
    }

    private parseBlockOpen(start: number, startLine: number, startColumn: number): void {
        this.position++; // Skip #
        this.column++;

        const nameStart = this.position;
        while (this.position < this.text.length &&
               this.current() !== '}' &&
               this.current() !== ' ' &&
               this.current() !== '\n') {
            this.position++;
            this.column++;
        }

        const blockName = this.text.substring(nameStart, this.position);

        // Find closing }}
        const end = this.findClosingBraces();
        if (end === -1) {
            this.errors.push({
                message: `Unclosed block open tag: {{#${blockName}}}`,
                start,
                end: this.position,
                line: startLine,
                severity: 'error'
            });
        } else {
            this.position = end + 2;
            this.column += 2;
        }

        this.tokens.push({
            type: 'block-open',
            value: blockName,
            start,
            end: this.position,
            line: startLine,
            column: startColumn
        });
    }

    private parseBlockClose(start: number, startLine: number, startColumn: number): void {
        this.position++; // Skip /
        this.column++;

        const nameStart = this.position;
        while (this.position < this.text.length &&
               this.current() !== '}' &&
               this.current() !== '\n') {
            this.position++;
            this.column++;
        }

        const blockName = this.text.substring(nameStart, this.position).trim();

        const end = this.findClosingBraces();
        if (end === -1) {
            this.errors.push({
                message: `Unclosed block close tag: {{/${blockName}}}`,
                start,
                end: this.position,
                line: startLine,
                severity: 'error'
            });
        } else {
            this.position = end + 2;
            this.column += 2;
        }

        this.tokens.push({
            type: 'block-close',
            value: blockName,
            start,
            end: this.position,
            line: startLine,
            column: startColumn
        });
    }

    private parseMathExpression(start: number, startLine: number, startColumn: number): void {
        this.position++; // Skip ?
        this.column++;

        const end = this.findClosingBraces();
        if (end === -1) {
            this.errors.push({
                message: 'Unclosed math expression',
                start,
                end: this.position,
                line: startLine,
                severity: 'error'
            });
        } else {
            const expression = this.text.substring(this.position, end).trim();
            this.position = end + 2;
            this.column += 2;

            this.tokens.push({
                type: 'math',
                value: expression,
                start,
                end: this.position,
                line: startLine,
                column: startColumn
            });
        }
    }

    private parseFunctionCall(start: number, startLine: number, startColumn: number): void {
        const end = this.findClosingBraces();
        if (end === -1) {
            this.errors.push({
                message: 'Unclosed function call',
                start,
                end: this.position,
                line: startLine,
                severity: 'error'
            });
        } else {
            const content = this.text.substring(this.position, end);
            this.position = end + 2;
            this.column += 2;

            this.tokens.push({
                type: 'function',
                value: content,
                start,
                end: this.position,
                line: startLine,
                column: startColumn
            });
        }
    }

    private findClosingBraces(): number {
        let depth = 1;
        let pos = this.position;

        while (pos < this.text.length - 1) {
            if (this.text[pos] === '{' && this.text[pos + 1] === '{') {
                depth++;
                pos += 2;
            } else if (this.text[pos] === '}' && this.text[pos + 1] === '}') {
                depth--;
                if (depth === 0) {
                    return pos;
                }
                pos += 2;
            } else {
                pos++;
            }
        }

        return -1;
    }

    private buildBlockTree(): CBSBlock[] {
        const blocks: CBSBlock[] = [];
        const stack: CBSBlock[] = [];

        for (const token of this.tokens) {
            if (token.type === 'block-open') {
                const block: CBSBlock = {
                    type: token.value,
                    start: token.start,
                    end: token.end,
                    line: token.line,
                    children: []
                };

                if (stack.length > 0) {
                    const parent = stack[stack.length - 1];
                    block.parent = parent;
                    parent.children.push(block);
                } else {
                    blocks.push(block);
                }

                stack.push(block);
            } else if (token.type === 'block-close') {
                if (stack.length === 0) {
                    this.errors.push({
                        message: `Unexpected block close tag: {{/${token.value}}}`,
                        start: token.start,
                        end: token.end,
                        line: token.line,
                        severity: 'error'
                    });
                } else {
                    const openBlock = stack.pop()!;
                    openBlock.end = token.end;

                    // Check if block names match (empty close tag {{/}} is allowed)
                    if (token.value !== '' && token.value !== openBlock.type) {
                        this.errors.push({
                            message: `Block mismatch: expected {{/${openBlock.type}}} but got {{/${token.value}}}`,
                            start: token.start,
                            end: token.end,
                            line: token.line,
                            severity: 'error'
                        });
                    }
                }
            }
        }

        // Check for unclosed blocks
        for (const block of stack) {
            this.errors.push({
                message: `Unclosed block: {{#${block.type}}}`,
                start: block.start,
                end: block.end,
                line: block.line,
                severity: 'error'
            });
        }

        return blocks;
    }

    private current(): string {
        return this.text[this.position];
    }

    private peek(offset: number): string {
        return this.text[this.position + offset];
    }
}