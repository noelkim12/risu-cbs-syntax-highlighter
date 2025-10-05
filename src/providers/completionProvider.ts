/**
 * CBS Completion Provider - VS Code Integration
 * Provides IntelliSense auto-completion for CBS functions
 */

import * as vscode from 'vscode';
import { CBSCompletionEngine, CompletionItem as EngineCompletionItem, CompletionKind } from '../core/completionEngine';

/**
 * CBS Completion Provider
 * Integrates CBSCompletionEngine with VS Code's CompletionItemProvider API
 */
export class CBSCompletionProvider implements vscode.CompletionItemProvider {
    private engine: CBSCompletionEngine;

    constructor() {
        this.engine = new CBSCompletionEngine();
    }

    /**
     * Provide completion items for the current position
     *
     * @param document The document in which the command was invoked
     * @param position The position at which the command was invoked
     * @param token A cancellation token
     * @param context How the completion was triggered
     * @returns Array of completion items or a thenable that resolves to such
     */
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        // Get full document text
        const text = document.getText();

        // Convert position to character offset
        const offset = document.offsetAt(position);

        // Get trigger character (if any)
        const trigger = context.triggerCharacter;

        // Get completions from engine
        const engineItems = this.engine.getCompletions(text, offset, trigger);

        // Convert engine items to VS Code completion items
        const vscodeItems = engineItems.map(item => this.toVSCodeCompletionItem(item));

        return vscodeItems;
    }

    /**
     * Convert engine completion item to VS Code completion item
     */
    private toVSCodeCompletionItem(engineItem: EngineCompletionItem): vscode.CompletionItem {
        const item = new vscode.CompletionItem(
            engineItem.label,
            this.toVSCodeCompletionKind(engineItem.kind)
        );

        // Set detail (short description shown next to the item)
        item.detail = engineItem.detail;

        // Set documentation (full documentation shown in detail panel)
        item.documentation = new vscode.MarkdownString(engineItem.documentation);

        // Set insert text with snippet support
        item.insertText = new vscode.SnippetString(engineItem.insertText);

        // Set sort text for ordering
        item.sortText = engineItem.sortText;

        // Set filter text (what the item is filtered by)
        item.filterText = engineItem.label;

        // Set commit characters (auto-accept on these characters)
        // For CBS, we might want to commit on }} or ::
        item.commitCharacters = [':', '}'];

        return item;
    }

    /**
     * Convert engine completion kind to VS Code completion kind
     */
    private toVSCodeCompletionKind(engineKind: CompletionKind): vscode.CompletionItemKind {
        switch (engineKind) {
            case CompletionKind.Function:
                return vscode.CompletionItemKind.Function;
            case CompletionKind.Keyword:
                return vscode.CompletionItemKind.Keyword;
            case CompletionKind.Variable:
                return vscode.CompletionItemKind.Variable;
            case CompletionKind.Constant:
                return vscode.CompletionItemKind.Constant;
            default:
                return vscode.CompletionItemKind.Text;
        }
    }

    /**
     * Resolve a completion item (optional)
     * This is called when a completion item is selected
     * We can add additional information here if needed
     */
    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        // Currently, all information is provided upfront
        // This method can be used for lazy loading of documentation if needed
        return item;
    }
}
