import * as vscode from 'vscode';
import { getFunctionInfo } from '../core/cbsDatabase';

export class CBSHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }

        // Get the word at the cursor position
        const word = document.getText(range);

        // Check if we're inside a CBS function call {{...}}
        const line = document.lineAt(position.line).text;
        const cbsContext = this.getCBSContext(line, position.character);

        if (!cbsContext) {
            return null;
        }

        // Extract function name from CBS context
        const functionName = this.extractFunctionName(cbsContext, word);

        if (!functionName) {
            return null;
        }

        // Get function information from database
        const functionInfo = getFunctionInfo(functionName);

        if (!functionInfo) {
            return null;
        }

        // Create hover content
        const hoverContent = this.createHoverContent(functionInfo);

        return new vscode.Hover(hoverContent, range);
    }

    /**
     * Get CBS context around the cursor position
     * Returns the content between {{ and }} if cursor is inside
     */
    private getCBSContext(line: string, cursorPosition: number): string | null {
        // Find all {{ }} pairs in the line
        const regex = /\{\{([^}]*)\}\}/g;
        let match;

        while ((match = regex.exec(line)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;

            // Check if cursor is inside this CBS expression
            if (cursorPosition >= start && cursorPosition <= end) {
                return match[1]; // Return content inside {{ }}
            }
        }

        // Check for unclosed {{ (for cases where user is still typing)
        const openIndex = line.lastIndexOf('{{', cursorPosition);
        const closeIndex = line.indexOf('}}', cursorPosition);

        if (openIndex !== -1 && (closeIndex === -1 || closeIndex > cursorPosition)) {
            const content = line.substring(openIndex + 2, cursorPosition + 10);
            const nextClose = content.indexOf('}}');
            if (nextClose !== -1) {
                return content.substring(0, nextClose);
            }
            return content;
        }

        return null;
    }

    /**
     * Extract function name from CBS context
     * Handles cases like:
     * - {{functionName}}
     * - {{functionName::arg1::arg2}}
     * - {{#functionName}}
     * - {{/functionName}}
     * - {{? expression with functionName}}
     */
    private extractFunctionName(context: string, word: string): string | null {
        // Remove leading # or / for block syntax
        let cleaned = context.trim();
        if (cleaned.startsWith('#') || cleaned.startsWith('/')) {
            cleaned = cleaned.substring(1).trim();
        }

        // Remove leading ? for math expressions
        if (cleaned.startsWith('?')) {
            cleaned = cleaned.substring(1).trim();
        }

        // Extract function name (before first ::)
        const separatorIndex = cleaned.indexOf('::');
        let functionName: string;

        if (separatorIndex !== -1) {
            functionName = cleaned.substring(0, separatorIndex).trim();
        } else {
            functionName = cleaned.trim();
        }

        // If function name contains the word we're hovering, use function name
        // This handles cases where cursor is on the function name itself
        if (functionName.toLowerCase().includes(word.toLowerCase()) ||
            word.toLowerCase() === functionName.toLowerCase()) {
            return functionName.toLowerCase();
        }

        // Try using the word itself (for nested functions)
        return word.toLowerCase();
    }

    /**
     * Create markdown hover content from function info
     */
    private createHoverContent(info: CBSFunctionInfo): vscode.MarkdownString {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        // Function name and description
        markdown.appendMarkdown(`**${info.name}**\n\n`);
        markdown.appendMarkdown(`${info.description}\n\n`);

        // Arguments
        if (info.arguments.length > 0) {
            markdown.appendMarkdown(`**인자**:\n`);
            for (const arg of info.arguments) {
                markdown.appendMarkdown(`- \`${arg}\`\n`);
            }
            markdown.appendMarkdown('\n');
        }

        // Example
        if (info.example) {
            markdown.appendMarkdown(`**예제**: \`${info.example}\`\n\n`);
        }

        // Aliases
        if (info.aliases.length > 0) {
            markdown.appendMarkdown(`**별칭**: ${info.aliases.join(', ')}\n`);
        }

        return markdown;
    }
}

interface CBSFunctionInfo {
    name: string;
    description: string;
    arguments: string[];
    example: string;
    aliases: string[];
}