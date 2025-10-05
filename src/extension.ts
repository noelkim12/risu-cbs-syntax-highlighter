/**
 * CBS Language Support Extension - VS Code 확장 메인 진입점
 * CBS (Curly Braced Syntax) 언어에 대한 완전한 VS Code 지원을 제공합니다
 *
 * 주요 기능:
 * - 문법 강조 (Syntax Highlighting) - TextMate 문법 정의 기반
 * - 코드 포맷팅 (Document Formatting) - 자동 들여쓰기 및 정렬
 * - 오류 진단 (Diagnostics) - 실시간 구문 오류 감지
 * - Hover 툴팁 (Hover Provider) - 함수 정보 표시
 * - 코드 접기 (Folding Ranges) - 블록 구조 접기/펼치기
 * - 자동완성 (IntelliSense) - CBS 함수 자동완성
 * - 시그니처 도움말 (Signature Help) - 함수 인자 힌트 표시
 */

import * as vscode from 'vscode';
import { CBSFormatter } from './core/formatter';
import { CBSParser } from './core/parser';
import { CBSHoverProvider } from './providers/hoverProvider';
import { CBSCompletionProvider } from './providers/completionProvider';
import { CBSSignatureProvider } from './providers/signatureProvider';
import { CBSBracketPairHighlighter } from './providers/bracketPairProvider';

/** 진단 정보를 수집하는 컬렉션 */
let diagnosticCollection: vscode.DiagnosticCollection;

/** Hover Provider의 Disposable 객체 (설정 변경 시 재등록을 위해) */
let hoverProviderDisposable: vscode.Disposable | null = null;

/** Bracket Pair Highlighter 인스턴스 */
let bracketHighlighter: CBSBracketPairHighlighter | null = null;

/**
 * 확장이 활성화될 때 호출됩니다
 * 모든 CBS 언어 기능을 등록하고 초기화합니다
 *
 * @param context VS Code 확장 컨텍스트
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('CBS Language Support extension is now active');

    // 오류 보고를 위한 진단 컬렉션 생성
    diagnosticCollection = vscode.languages.createDiagnosticCollection('cbs');
    context.subscriptions.push(diagnosticCollection);

    // 설정에 따라 Hover Provider 등록
    registerHoverProvider(context);

    // 문서 전체 포맷팅 제공자 등록
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('cbs', {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                return formatDocument(document);
            }
        })
    );

    // 문서 범위 포맷팅 제공자 등록 (선택 영역만 포맷)
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

    // 블록 구조를 위한 코드 접기 제공자 등록
    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider('cbs', {
            provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
                return provideFoldingRanges(document);
            }
        })
    );

    // 문서 변경 시 진단 업데이트
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'cbs') {
                updateDiagnostics(event.document);
            }
        })
    );

    // 문서 열릴 때 진단 업데이트
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.languageId === 'cbs') {
                updateDiagnostics(document);
            }
        })
    );

    // 이미 열려있는 문서들에 대해 진단 업데이트
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'cbs') {
            updateDiagnostics(document);
        }
    });

    // 설정 변경 감지 (Hover 기능 활성화/비활성화)
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('cbs.hover.enabled')) {
                registerHoverProvider(context);
            }
        })
    );

    // 자동완성 (IntelliSense) 제공자 등록
    // 트리거 문자: { ({{ 입력 시), # ({{# 입력 시), : (:: 입력 시)
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            'cbs',
            new CBSCompletionProvider(),
            '{', '#', ':'
        )
    );

    // 시그니처 도움말 제공자 등록
    // 트리거 문자: : (:: 입력 시 함수 인자 힌트 표시)
    context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider(
            'cbs',
            new CBSSignatureProvider(),
            ':', ':'
        )
    );

    // CBS 중괄호 쌍 하이라이터 초기화
    bracketHighlighter = new CBSBracketPairHighlighter();

    // 활성 에디터 변경 시 하이라이트 업데이트
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && bracketHighlighter) {
                bracketHighlighter.updateActiveEditor(editor);
            }
        })
    );

    // 문서 내용 변경 시 하이라이트 업데이트
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document && bracketHighlighter) {
                bracketHighlighter.updateActiveEditor(editor);
            }
        })
    );

    // 커서 위치 변경 시 현재 중괄호 쌍 하이라이트
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (event.textEditor && bracketHighlighter) {
                bracketHighlighter.updateActiveEditor(event.textEditor);
            }
        })
    );

    // 현재 활성 에디터에 대해 즉시 하이라이트 적용
    if (vscode.window.activeTextEditor && bracketHighlighter) {
        bracketHighlighter.updateActiveEditor(vscode.window.activeTextEditor);
    }
}

/**
 * Hover Provider를 등록합니다
 * 설정에서 Hover 기능이 활성화되어 있는 경우에만 등록됩니다
 *
 * @param context VS Code 확장 컨텍스트
 */
function registerHoverProvider(context: vscode.ExtensionContext): void {
    // 기존 Hover Provider가 있으면 해제
    if (hoverProviderDisposable) {
        hoverProviderDisposable.dispose();
        hoverProviderDisposable = null;
    }

    // 설정에서 Hover 활성화 여부 확인
    const config = vscode.workspace.getConfiguration('cbs.hover');
    const enabled = config.get('enabled', true);

    if (enabled) {
        hoverProviderDisposable = vscode.languages.registerHoverProvider('cbs', new CBSHoverProvider());
        context.subscriptions.push(hoverProviderDisposable);
    }
}

/**
 * 문서 전체를 포맷팅합니다
 * 사용자 설정에 따라 들여쓰기, 간격 등을 자동으로 정리합니다
 *
 * @param document 포맷팅할 문서
 * @returns 포맷팅을 위한 텍스트 편집 배열
 */
function formatDocument(document: vscode.TextDocument): vscode.TextEdit[] {
    // 사용자 설정 로드
    const config = vscode.workspace.getConfiguration('cbs.formatter');
    const formatter = new CBSFormatter({
        indentSize: config.get('indentSize', 4),
        indentStyle: config.get('indentStyle', 'space'),
        preserveMarkdown: config.get('preserveMarkdown', true),
        alignArguments: config.get('alignArguments', false)
    });

    // 문서 전체 텍스트 포맷팅
    const text = document.getText();
    const formatted = formatter.format(text);

    // 전체 문서 범위로 텍스트 교체
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
    );

    return [vscode.TextEdit.replace(fullRange, formatted)];
}

/**
 * 문서의 선택된 범위만 포맷팅합니다
 * 사용자가 특정 영역만 포맷하고 싶을 때 사용됩니다
 *
 * @param document 포맷팅할 문서
 * @param range 포맷팅할 범위
 * @returns 포맷팅을 위한 텍스트 편집 배열
 */
function formatRange(document: vscode.TextDocument, range: vscode.Range): vscode.TextEdit[] {
    // 사용자 설정 로드
    const config = vscode.workspace.getConfiguration('cbs.formatter');
    const formatter = new CBSFormatter({
        indentSize: config.get('indentSize', 4),
        indentStyle: config.get('indentStyle', 'space'),
        preserveMarkdown: config.get('preserveMarkdown', true),
        alignArguments: config.get('alignArguments', false)
    });

    // 선택된 범위의 텍스트만 포맷팅
    const text = document.getText(range);
    const formatted = formatter.format(text);

    return [vscode.TextEdit.replace(range, formatted)];
}

/**
 * 문서의 진단 정보를 업데이트합니다
 * CBS 파서를 사용하여 구문 오류를 감지하고 에디터에 표시합니다
 *
 * @param document 진단할 문서
 */
function updateDiagnostics(document: vscode.TextDocument): void {
    // 문서 텍스트 파싱하여 오류 감지
    const parser = new CBSParser(document.getText());
    const { errors } = parser.parse();

    // 파싱 오류를 VS Code 진단 객체로 변환
    const diagnostics: vscode.Diagnostic[] = errors.map(error => {
        const range = new vscode.Range(
            document.positionAt(error.start),
            document.positionAt(error.end)
        );

        // 오류 심각도 설정
        const severity = error.severity === 'error'
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;

        return new vscode.Diagnostic(range, error.message, severity);
    });

    // 진단 컬렉션에 업데이트
    diagnosticCollection.set(document.uri, diagnostics);
}

/**
 * 문서의 코드 접기 범위를 제공합니다
 * CBS 블록 구조 ({{#block}}...{{/block}})를 감지하여 접기 가능한 영역을 생성합니다
 *
 * @param document 코드 접기 범위를 생성할 문서
 * @returns 코드 접기 범위 배열
 */
function provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
    // 문서 텍스트 파싱하여 블록 구조 분석
    const parser = new CBSParser(document.getText());
    const { blocks } = parser.parse();

    const foldingRanges: vscode.FoldingRange[] = [];

    /**
     * 블록을 재귀적으로 처리하여 접기 범위 생성
     * @param block 처리할 CBS 블록
     */
    function processBlock(block: any): void {
        const startLine = block.line;
        const endPosition = document.positionAt(block.end);
        const endLine = endPosition.line;

        // 여러 줄에 걸쳐 있는 블록만 접기 범위로 추가
        if (endLine > startLine) {
            foldingRanges.push(new vscode.FoldingRange(startLine, endLine));
        }

        // 중첩된 자식 블록들도 재귀적으로 처리
        if (block.children) {
            for (const child of block.children) {
                processBlock(child);
            }
        }
    }

    // 모든 최상위 블록 처리
    for (const block of blocks) {
        processBlock(block);
    }

    return foldingRanges;
}

/**
 * 확장이 비활성화될 때 호출됩니다
 * 등록된 모든 리소스를 정리합니다
 */
export function deactivate() {
    // 진단 컬렉션 해제
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }

    // Hover Provider 해제
    if (hoverProviderDisposable) {
        hoverProviderDisposable.dispose();
    }

    // Bracket Highlighter 해제
    if (bracketHighlighter) {
        bracketHighlighter.dispose();
    }
}