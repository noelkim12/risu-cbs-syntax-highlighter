/**
 * CBS Formatter - Core formatting logic for CBS syntax
 * Can be used standalone in web environments
 */

import { CBSParser, CBSBlock } from './parser';

export interface FormatterOptions {
    indentSize: number;
    indentStyle: 'space' | 'tab';
    preserveMarkdown: boolean;
    alignArguments: boolean;
}

export const defaultFormatterOptions: FormatterOptions = {
    indentSize: 4,
    indentStyle: 'space',
    preserveMarkdown: true,
    alignArguments: false
};

export class CBSFormatter {
    private options: FormatterOptions;

    constructor(options: Partial<FormatterOptions> = {}) {
        this.options = { ...defaultFormatterOptions, ...options };
    }

    format(text: string): string {
        const parser = new CBSParser(text);
        const { blocks, errors } = parser.parse();

        if (errors.length > 0) {
            // If there are errors, return original text to avoid breaking it further
            console.warn('CBS parsing errors detected:', errors);
            return text;
        }

        return this.formatText(text, blocks);
    }

    private formatText(text: string, blocks: CBSBlock[]): string {
        const lines = text.split('\n');
        const result: string[] = [];
        let currentIndent = 0;
        let i = 0;

        // Track which lines contain block markers
        const blockLines = this.mapBlocksToLines(text, blocks);

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed === '') {
                result.push('');
                i++;
                continue;
            }

            // Check if line contains block close
            if (this.hasBlockClose(trimmed)) {
                currentIndent = Math.max(0, currentIndent - 1);
            }

            // Apply indentation
            const indent = this.getIndent(currentIndent);
            const formatted = this.formatLine(trimmed, indent);
            result.push(formatted);

            // Check if line contains block open
            if (this.hasBlockOpen(trimmed)) {
                currentIndent++;
            }

            i++;
        }

        return result.join('\n');
    }

    private formatLine(line: string, indent: string): string {
        // Don't modify markdown headers
        if (line.startsWith('#') && this.options.preserveMarkdown) {
            return indent + line;
        }

        // Format CBS expressions
        let formatted = line;

        // Normalize spacing around ::
        if (this.options.alignArguments) {
            formatted = formatted.replace(/::/g, ' :: ');
            // Remove extra spaces
            formatted = formatted.replace(/\s+::\s+/g, ' :: ');
        }

        // Normalize spacing inside braces
        formatted = formatted.replace(/\{\{\s+/g, '{{');
        formatted = formatted.replace(/\s+\}\}/g, '}}');

        return indent + formatted;
    }

    private hasBlockOpen(line: string): boolean {
        return /\{\{#[a-zA-Z_][a-zA-Z0-9_]*/.test(line);
    }

    private hasBlockClose(line: string): boolean {
        return /\{\{\/[a-zA-Z_0-9]*\}\}/.test(line);
    }

    private getIndent(level: number): string {
        if (this.options.indentStyle === 'tab') {
            return '\t'.repeat(level);
        } else {
            return ' '.repeat(level * this.options.indentSize);
        }
    }

    private mapBlocksToLines(text: string, blocks: CBSBlock[]): Map<number, CBSBlock[]> {
        const map = new Map<number, CBSBlock[]>();

        for (const block of blocks) {
            if (!map.has(block.line)) {
                map.set(block.line, []);
            }
            map.get(block.line)!.push(block);

            // Recursively process children
            this.addChildBlocks(map, block.children);
        }

        return map;
    }

    private addChildBlocks(map: Map<number, CBSBlock[]>, blocks: CBSBlock[]): void {
        for (const block of blocks) {
            if (!map.has(block.line)) {
                map.set(block.line, []);
            }
            map.get(block.line)!.push(block);

            if (block.children.length > 0) {
                this.addChildBlocks(map, block.children);
            }
        }
    }
}