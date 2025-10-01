import * as vscode from 'vscode';
import { CBSFormatter } from './core/formatter';
import { CBSParser } from './core/parser';
import { CBSHoverProvider } from './providers/hoverProvider';

let diagnosticCollection: vscode.DiagnosticCollection;
let hoverProviderDisposable: vscode.Disposable | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('CBS Language Support extension is now active');

    // Create diagnostic collection for error reporting
    diagnosticCollection = vscode.languages.createDiagnosticCollection('cbs');
    context.subscriptions.push(diagnosticCollection);

    // Register hover provider if enabled
    registerHoverProvider(context);

    // Register document formatting provider
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('cbs', {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                return formatDocument(document);
            }
        })
    );

    // Register document range formatting provider
    context.subscriptions.push(
        vscode.languages.registerDocumentRangeFormattingEditProvider('cbs', {
            provideDocumentRangeFormattingEdits(
                document: vscode.TextDocument,
                range: vscode.Range
            ): vscode.TextEdit[] {
                return formatRange(document, range);
            }
        })
    );

    // Register folding range provider for block structures
    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider('cbs', {
            provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
                return provideFoldingRanges(document);
            }
        })
    );

    // Update diagnostics on document change
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'cbs') {
                updateDiagnostics(event.document);
            }
        })
    );

    // Update diagnostics on document open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.languageId === 'cbs') {
                updateDiagnostics(document);
            }
        })
    );

    // Update diagnostics for already open documents
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'cbs') {
            updateDiagnostics(document);
        }
    });

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('cbs.hover.enabled')) {
                registerHoverProvider(context);
            }
        })
    );
}

function registerHoverProvider(context: vscode.ExtensionContext): void {
    // Dispose existing hover provider if any
    if (hoverProviderDisposable) {
        hoverProviderDisposable.dispose();
        hoverProviderDisposable = null;
    }

    // Check if hover is enabled in settings
    const config = vscode.workspace.getConfiguration('cbs.hover');
    const enabled = config.get('enabled', true);

    if (enabled) {
        hoverProviderDisposable = vscode.languages.registerHoverProvider('cbs', new CBSHoverProvider());
        context.subscriptions.push(hoverProviderDisposable);
    }
}

function formatDocument(document: vscode.TextDocument): vscode.TextEdit[] {
    const config = vscode.workspace.getConfiguration('cbs.formatter');
    const formatter = new CBSFormatter({
        indentSize: config.get('indentSize', 4),
        indentStyle: config.get('indentStyle', 'space'),
        preserveMarkdown: config.get('preserveMarkdown', true),
        alignArguments: config.get('alignArguments', false)
    });

    const text = document.getText();
    const formatted = formatter.format(text);

    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
    );

    return [vscode.TextEdit.replace(fullRange, formatted)];
}

function formatRange(document: vscode.TextDocument, range: vscode.Range): vscode.TextEdit[] {
    const config = vscode.workspace.getConfiguration('cbs.formatter');
    const formatter = new CBSFormatter({
        indentSize: config.get('indentSize', 4),
        indentStyle: config.get('indentStyle', 'space'),
        preserveMarkdown: config.get('preserveMarkdown', true),
        alignArguments: config.get('alignArguments', false)
    });

    const text = document.getText(range);
    const formatted = formatter.format(text);

    return [vscode.TextEdit.replace(range, formatted)];
}

function updateDiagnostics(document: vscode.TextDocument): void {
    const parser = new CBSParser(document.getText());
    const { errors } = parser.parse();

    const diagnostics: vscode.Diagnostic[] = errors.map(error => {
        const range = new vscode.Range(
            document.positionAt(error.start),
            document.positionAt(error.end)
        );

        const severity = error.severity === 'error'
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;

        return new vscode.Diagnostic(range, error.message, severity);
    });

    diagnosticCollection.set(document.uri, diagnostics);
}

function provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    const parser = new CBSParser(document.getText());
    const { blocks } = parser.parse();

    const foldingRanges: vscode.FoldingRange[] = [];

    function processBlock(block: any): void {
        const startLine = block.line;
        const endPosition = document.positionAt(block.end);
        const endLine = endPosition.line;

        if (endLine > startLine) {
            foldingRanges.push(new vscode.FoldingRange(startLine, endLine));
        }

        // Process children
        if (block.children) {
            for (const child of block.children) {
                processBlock(child);
            }
        }
    }

    for (const block of blocks) {
        processBlock(block);
    }

    return foldingRanges;
}

export function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }

    if (hoverProviderDisposable) {
        hoverProviderDisposable.dispose();
    }
}