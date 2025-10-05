/**
 * CBS Signature Help Provider - VS Code Integration
 * Provides function signature hints showing parameter information
 */

import * as vscode from 'vscode';
import { CBSSignatureEngine, SignatureInfo as EngineSignatureInfo, ParameterInfo as EngineParameterInfo } from '../core/signatureEngine';

/**
 * CBS Signature Help Provider
 * Integrates CBSSignatureEngine with VS Code's SignatureHelpProvider API
 */
export class CBSSignatureProvider implements vscode.SignatureHelpProvider {
    private engine: CBSSignatureEngine;

    constructor() {
        this.engine = new CBSSignatureEngine();
    }

    /**
     * Provide signature help for the given position and document
     *
     * @param document The document in which the command was invoked
     * @param position The position at which the command was invoked
     * @param token A cancellation token
     * @param context Information about how signature help was triggered
     * @returns Signature help or null if no signature help is available
     */
    provideSignatureHelp(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.SignatureHelpContext
    ): vscode.ProviderResult<vscode.SignatureHelp> {
        // Get full document text
        const text = document.getText();

        // Convert position to character offset
        const offset = document.offsetAt(position);

        // Get signature help from engine
        const engineSignature = this.engine.getSignatureHelp(text, offset);

        if (!engineSignature) {
            return null;
        }

        // Convert engine signature to VS Code signature help
        return this.toVSCodeSignatureHelp(engineSignature);
    }

    /**
     * Convert engine signature info to VS Code SignatureHelp
     */
    private toVSCodeSignatureHelp(engineSignature: EngineSignatureInfo): vscode.SignatureHelp {
        const signatureHelp = new vscode.SignatureHelp();

        // Create signature information
        const signature = new vscode.SignatureInformation(
            engineSignature.label,
            new vscode.MarkdownString(engineSignature.documentation)
        );

        // Add parameter information
        signature.parameters = engineSignature.parameters.map(param =>
            this.toVSCodeParameterInfo(param)
        );

        // Add signature to help
        signatureHelp.signatures = [signature];

        // Set active signature (we only have one, so it's always 0)
        signatureHelp.activeSignature = 0;

        // Set active parameter (which parameter is currently being entered)
        signatureHelp.activeParameter = engineSignature.activeParameter;

        return signatureHelp;
    }

    /**
     * Convert engine parameter info to VS Code ParameterInformation
     */
    private toVSCodeParameterInfo(engineParam: EngineParameterInfo): vscode.ParameterInformation {
        return new vscode.ParameterInformation(
            engineParam.label,
            new vscode.MarkdownString(engineParam.documentation)
        );
    }
}
