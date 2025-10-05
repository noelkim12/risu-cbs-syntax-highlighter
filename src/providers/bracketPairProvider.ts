/**
 * CBS Bracket Pair Highlighter
 * Highlights matching {{ }} pairs with different colors based on nesting level
 */

import * as vscode from 'vscode';

/**
 * Bracket pair information
 */
interface BracketPair {
    openStart: number;      // Start position of {{
    openEnd: number;        // End position of {{ (openStart + 2)
    closeStart: number;     // Start position of }}
    closeEnd: number;       // End position of }} (closeStart + 2)
    level: number;          // Nesting level (0 = outermost)
}

/**
 * CBS Bracket Pair Provider
 * Manages highlighting of matching {{ }} pairs
 */
export class CBSBracketPairProvider {
    private decorationTypes: vscode.TextEditorDecorationType[] = [];
    private readonly maxLevels = 6; // Support 6 nesting levels with different colors

    constructor() {
        this.initializeDecorationTypes();
    }

    /**
     * Initialize decoration types for different nesting levels
     * Each level gets a different color from the rainbow
     */
    private initializeDecorationTypes(): void {
        // Color palette for nesting levels (rainbow-like)
        const colors = [
            '#FFD700', // Gold (level 0)
            '#FF6B9D', // Pink (level 1)
            '#4EC9B0', // Cyan (level 2)
            '#C586C0', // Purple (level 3)
            '#569CD6', // Blue (level 4)
            '#CE9178'  // Orange (level 5)
        ];

        for (let i = 0; i < this.maxLevels; i++) {
            this.decorationTypes.push(
                vscode.window.createTextEditorDecorationType({
                    // Very subtle background with low opacity (10%)
                    backgroundColor: `${colors[i]}1A`,
                    // Thin border with medium opacity (40%)
                    border: `1px solid ${colors[i]}66`,
                    borderRadius: '2px',
                    // Overview ruler with reduced opacity
                    overviewRulerColor: `${colors[i]}80`,
                    overviewRulerLane: vscode.OverviewRulerLane.Right
                })
            );
        }
    }

    /**
     * Update bracket pair decorations for the given editor
     */
    public updateDecorations(editor: vscode.TextEditor): void {
        if (!editor || editor.document.languageId !== 'cbs') {
            return;
        }

        const text = editor.document.getText();
        const bracketPairs = this.findBracketPairs(text);

        // Group pairs by nesting level
        const pairsByLevel: BracketPair[][] = [];
        for (let i = 0; i < this.maxLevels; i++) {
            pairsByLevel.push([]);
        }

        for (const pair of bracketPairs) {
            const levelIndex = pair.level % this.maxLevels;
            pairsByLevel[levelIndex].push(pair);
        }

        // Apply decorations for each level
        for (let i = 0; i < this.maxLevels; i++) {
            const ranges: vscode.Range[] = [];

            for (const pair of pairsByLevel[i]) {
                // Highlight opening {{
                ranges.push(new vscode.Range(
                    editor.document.positionAt(pair.openStart),
                    editor.document.positionAt(pair.openEnd)
                ));

                // Highlight closing }}
                ranges.push(new vscode.Range(
                    editor.document.positionAt(pair.closeStart),
                    editor.document.positionAt(pair.closeEnd)
                ));
            }

            editor.setDecorations(this.decorationTypes[i], ranges);
        }
    }

    /**
     * Find all matching {{ }} bracket pairs with nesting levels
     */
    private findBracketPairs(text: string): BracketPair[] {
        const pairs: BracketPair[] = [];
        const stack: Array<{ position: number; level: number }> = [];
        let currentLevel = 0;

        for (let i = 0; i < text.length - 1; i++) {
            if (text[i] === '{' && text[i + 1] === '{') {
                // Found opening {{
                stack.push({ position: i, level: currentLevel });
                currentLevel++;
                i++; // Skip next character
            } else if (text[i] === '}' && text[i + 1] === '}') {
                // Found closing }}
                if (stack.length > 0) {
                    const opening = stack.pop()!;
                    currentLevel--;

                    pairs.push({
                        openStart: opening.position,
                        openEnd: opening.position + 2,
                        closeStart: i,
                        closeEnd: i + 2,
                        level: opening.level
                    });
                }
                i++; // Skip next character
            }
        }

        return pairs;
    }

    /**
     * Clear all decorations
     */
    public clearDecorations(editor: vscode.TextEditor): void {
        for (const decorationType of this.decorationTypes) {
            editor.setDecorations(decorationType, []);
        }
    }

    /**
     * Dispose of all decoration types
     */
    public dispose(): void {
        for (const decorationType of this.decorationTypes) {
            decorationType.dispose();
        }
    }
}

/**
 * CBS Bracket Pair Highlighter with Cursor Context
 * Enhanced version that highlights the current bracket pair under cursor
 */
export class CBSBracketPairHighlighter {
    private bracketPairProvider: CBSBracketPairProvider;
    private currentPairDecorationType: vscode.TextEditorDecorationType;
    private updateTimeout: NodeJS.Timeout | undefined;

    constructor() {
        this.bracketPairProvider = new CBSBracketPairProvider();

        // Create decoration type for current bracket pair (subtle highlight)
        this.currentPairDecorationType = vscode.window.createTextEditorDecorationType({
            // Subtle background with low opacity (15%)
            backgroundColor: '#FFFF0026',
            // Medium border with opacity (50%)
            border: '1px solid #FFFF0080',
            borderRadius: '2px'
        });
    }

    /**
     * Update decorations for active editor
     */
    public updateActiveEditor(editor: vscode.TextEditor | undefined): void {
        if (!editor || editor.document.languageId !== 'cbs') {
            return;
        }

        // Debounce updates to avoid performance issues
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        this.updateTimeout = setTimeout(() => {
            this.bracketPairProvider.updateDecorations(editor);
            this.highlightCurrentPair(editor);
        }, 100);
    }

    /**
     * Highlight the bracket pair that contains the cursor
     */
    private highlightCurrentPair(editor: vscode.TextEditor): void {
        const position = editor.selection.active;
        const offset = editor.document.offsetAt(position);
        const text = editor.document.getText();

        const currentPair = this.findCurrentBracketPair(text, offset);

        if (currentPair) {
            const ranges = [
                new vscode.Range(
                    editor.document.positionAt(currentPair.openStart),
                    editor.document.positionAt(currentPair.openEnd)
                ),
                new vscode.Range(
                    editor.document.positionAt(currentPair.closeStart),
                    editor.document.positionAt(currentPair.closeEnd)
                )
            ];

            editor.setDecorations(this.currentPairDecorationType, ranges);
        } else {
            editor.setDecorations(this.currentPairDecorationType, []);
        }
    }

    /**
     * Find the bracket pair that contains the given cursor position
     */
    private findCurrentBracketPair(text: string, cursorOffset: number): BracketPair | null {
        const stack: Array<{ position: number; level: number }> = [];
        let currentLevel = 0;
        let innermostPair: BracketPair | null = null;
        let innermostLevel = -1;

        for (let i = 0; i < text.length - 1; i++) {
            if (text[i] === '{' && text[i + 1] === '{') {
                stack.push({ position: i, level: currentLevel });
                currentLevel++;
                i++;
            } else if (text[i] === '}' && text[i + 1] === '}') {
                if (stack.length > 0) {
                    const opening = stack.pop()!;
                    currentLevel--;

                    const pair: BracketPair = {
                        openStart: opening.position,
                        openEnd: opening.position + 2,
                        closeStart: i,
                        closeEnd: i + 2,
                        level: opening.level
                    };

                    // Check if cursor is inside this pair
                    if (cursorOffset >= pair.openStart && cursorOffset <= pair.closeEnd) {
                        // Keep the innermost (highest level) pair
                        if (pair.level > innermostLevel) {
                            innermostPair = pair;
                            innermostLevel = pair.level;
                        }
                    }
                }
                i++;
            }
        }

        return innermostPair;
    }

    /**
     * Dispose of all resources
     */
    public dispose(): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.bracketPairProvider.dispose();
        this.currentPairDecorationType.dispose();
    }
}
