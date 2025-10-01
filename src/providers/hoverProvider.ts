/**
 * CBS Hover Provider - CBS 함수에 대한 Hover 툴팁 제공
 * 마우스를 CBS 함수 위에 올렸을 때 한글 설명을 표시합니다
 */

import * as vscode from 'vscode';
import { getFunctionInfo } from '../core/cbsDatabase';

/**
 * CBS Hover Provider 클래스
 * VS Code의 Hover 기능을 CBS 함수에 대해 제공합니다
 */
export class CBSHoverProvider implements vscode.HoverProvider {
    /**
     * Hover 정보를 제공합니다
     * 커서 위치의 CBS 함수를 감지하고 한글 설명 툴팁을 반환합니다
     *
     * @param document 현재 문서
     * @param position 커서 위치
     * @param token 취소 토큰
     * @returns Hover 객체 (툴팁) 또는 null
     */
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        // CBS 함수 호출 내부인지 확인 ({{...}})
        const line = document.lineAt(position.line).text;
        const cbsContext = this.getCBSContext(line, position.character);

        if (!cbsContext) {
            return null;
        }

        // 커서 위치의 단어 또는 특수 문자 추출
        const wordResult = this.getExtendedWordAtPosition(document, position, line);
        if (!wordResult) {
            return null;
        }

        const { word, range } = wordResult;

        // CBS 문맥에서 함수명 추출
        const functionName = this.extractFunctionName(cbsContext, word);

        if (!functionName) {
            return null;
        }

        // 데이터베이스에서 함수 정보 조회
        const functionInfo = getFunctionInfo(functionName);

        if (!functionInfo) {
            return null;
        }

        // Hover 툴팁 내용 생성
        const hoverContent = this.createHoverContent(functionInfo);

        return new vscode.Hover(hoverContent, range);
    }

    /**
     * 커서 위치의 단어를 추출합니다 (CBS 특수 문자 포함: #, ?, //, :)
     * 일반적인 단어뿐만 아니라 CBS의 특수 연산자도 감지합니다
     *
     * @param document 현재 문서
     * @param position 커서 위치
     * @param line 현재 줄 텍스트
     * @returns 단어와 해당 범위를 포함한 객체 또는 null
     */
    private getExtendedWordAtPosition(
        document: vscode.TextDocument,
        position: vscode.Position,
        line: string
    ): { word: string; range: vscode.Range } | null {
        const char = position.character;

        // 먼저 2글자 패턴 확인 (::, //)
        if (char < line.length - 1) {
            const twoChar = line.substring(char, char + 2);
            if (twoChar === '//' || twoChar === '::') {
                return {
                    word: twoChar,
                    range: new vscode.Range(position, position.translate(0, 2))
                };
            }
        }

        // 커서가 특수 문자 위에 있는지 확인
        if (char < line.length) {
            const currentChar = line[char];
            if (currentChar === '#' || currentChar === '?' || currentChar === ':' || currentChar === '/') {
                // :와 /의 경우 :: 또는 // 의 일부인지 확인
                if (currentChar === ':' && char > 0 && line[char - 1] === ':') {
                    return {
                        word: '::',
                        range: new vscode.Range(position.translate(0, -1), position.translate(0, 1))
                    };
                }
                if (currentChar === '/' && char > 0 && line[char - 1] === '/') {
                    return {
                        word: '//',
                        range: new vscode.Range(position.translate(0, -1), position.translate(0, 1))
                    };
                }
                if (currentChar === '/' && char < line.length - 1 && line[char + 1] === '/') {
                    return {
                        word: '//',
                        range: new vscode.Range(position, position.translate(0, 2))
                    };
                }

                // 단일 특수 문자
                return {
                    word: currentChar,
                    range: new vscode.Range(position, position.translate(0, 1))
                };
            }
        }

        // 커서가 특수 문자 바로 뒤에 있는지 확인
        if (char > 0) {
            const prevChar = line[char - 1];
            if (prevChar === '#' || prevChar === '?' || prevChar === ':' || prevChar === '/') {
                // :: 또는 // 확인
                if (prevChar === ':' && char > 1 && line[char - 2] === ':') {
                    return {
                        word: '::',
                        range: new vscode.Range(position.translate(0, -2), position)
                    };
                }
                if (prevChar === '/' && char > 1 && line[char - 2] === '/') {
                    return {
                        word: '//',
                        range: new vscode.Range(position.translate(0, -2), position)
                    };
                }
                if (prevChar === '/' && char < line.length && line[char] === '/') {
                    return {
                        word: '//',
                        range: new vscode.Range(position.translate(0, -1), position.translate(0, 1))
                    };
                }

                return {
                    word: prevChar,
                    range: new vscode.Range(position.translate(0, -1), position)
                };
            }
        }

        // 일반 함수명에 대해 표준 단어 범위 시도
        const range = document.getWordRangeAtPosition(position);
        if (range) {
            return {
                word: document.getText(range),
                range: range
            };
        }

        return null;
    }

    /**
     * 커서 위치 주변의 CBS 문맥을 추출합니다
     * 커서가 {{ }}  내부에 있으면 그 사이의 내용을 반환합니다
     * 중첩된 CBS 표현식도 올바르게 처리합니다 (예: {{#if {{? {{getvar::x}}}}}})
     *
     * @param line 현재 줄 텍스트
     * @param cursorPosition 커서의 문자 위치
     * @returns CBS 표현식 내용 또는 null (커서가 CBS 표현식 외부인 경우)
     */
    private getCBSContext(line: string, cursorPosition: number): string | null {
        // 스택 기반 파서를 사용하여 중첩된 {{ }} 쌍 처리
        const contexts: Array<{start: number, end: number, depth: number, content: string}> = [];
        const stack: Array<{start: number, depth: number}> = [];
        let currentDepth = 0;

        for (let i = 0; i < line.length - 1; i++) {
            if (line[i] === '{' && line[i + 1] === '{') {
                // {{ 발견 - 스택에 푸시
                stack.push({ start: i, depth: currentDepth });
                currentDepth++;
                i++; // 다음 '{' 건너뛰기
            } else if (line[i] === '}' && line[i + 1] === '}') {
                // }} 발견 - 스택에서 팝
                currentDepth--;
                if (stack.length > 0) {
                    const opening = stack.pop()!;
                    const start = opening.start;
                    const end = i + 2;
                    const content = line.substring(start + 2, i);
                    const depth = opening.depth;

                    contexts.push({ start, end, depth, content });
                }
                i++; // 다음 '}' 건너뛰기
            }
        }

        // 커서를 포함하는 가장 안쪽 문맥 찾기
        // 깊이 기준 내림차순 정렬하여 가장 안쪽을 먼저 찾음
        contexts.sort((a, b) => b.depth - a.depth);

        for (const context of contexts) {
            if (cursorPosition >= context.start && cursorPosition <= context.end) {
                // 커서가 중괄호가 아닌 실제 내용 위에 있는지 확인
                const contentStart = context.start + 2;
                const contentEnd = context.end - 2;

                if (cursorPosition >= contentStart && cursorPosition <= contentEnd) {
                    return context.content;
                }
            }
        }

        // 닫히지 않은 {{ 확인 (사용자가 아직 입력 중인 경우)
        const openIndex = line.lastIndexOf('{{', cursorPosition);
        if (openIndex !== -1) {
            const closeIndex = line.indexOf('}}', openIndex);
            if (closeIndex === -1 || closeIndex > cursorPosition) {
                return line.substring(openIndex + 2, Math.min(line.length, cursorPosition + 20));
            }
        }

        return null;
    }

    /**
     * CBS 문맥에서 함수명을 추출합니다
     * 다양한 CBS 표현식 형태를 처리합니다:
     * - {{functionName}} - 일반 함수 호출
     * - {{functionName::arg1::arg2}} - 인자가 있는 함수 호출
     * - {{#functionName condition}} - 블록 열기 태그
     * - {{#functionName::operator::value}} - 연산자가 있는 블록
     * - {{/functionName}} - 블록 닫기 태그
     * - {{? expression with functionName}} - 수학 표현식
     * - {{:else}} - 특수 키워드
     * - {{// comment}} - 주석
     *
     * @param context CBS 표현식 내용 ({{}} 제외)
     * @param word 커서 위치의 단어 또는 특수 문자
     * @returns 함수명 또는 null
     */
    private extractFunctionName(context: string, word: string): string | null {
        let cleaned = context.trim();
        const wordLower = word.toLowerCase();

        // 특수 케이스를 먼저 처리

        // {{// comment}} - 주석
        if (cleaned.startsWith('//')) {
            if (word === '//' || wordLower === 'comment') {
                return '//';
            }
        }

        // {{:else}} 또는 {{:each}} - 특수 키워드
        if (cleaned.startsWith(':')) {
            const specialName = cleaned.split(/\s+/)[0];
            const funcName = specialName.substring(1).toLowerCase(); // : 제거

            // : 또는 함수명 자체에 호버링한 경우
            if (word === ':' || wordLower === funcName || wordLower === specialName.toLowerCase()) {
                return funcName; // "else" 또는 "each" 반환
            }
        }

        // {{? expression}} - 수학 표현식
        if (cleaned.startsWith('?')) {
            if (word === '?') {
                return '?';
            }
            // ?를 제거하고 중첩 함수 처리 계속
            cleaned = cleaned.substring(1).trim();
        }

        // {{#functionName}} 또는 {{/functionName}} - 블록 태그
        let hasBlockPrefix = false;
        if (cleaned.startsWith('#')) {
            hasBlockPrefix = true;
            cleaned = cleaned.substring(1).trim();

            // # 에 직접 호버링한 경우, 함수명 추출
            if (word === '#') {
                const functionName = this.extractBaseFunctionName(cleaned);
                return '#' + functionName; // "#if", "#when" 등 반환
            }
        } else if (cleaned.startsWith('/')) {
            cleaned = cleaned.substring(1).trim();

            // / 에 호버링한 경우, 닫기 태그
            if (word === '/') {
                const functionName = this.extractBaseFunctionName(cleaned);
                return '#' + functionName; // 조회를 위해 "#if" 반환 (닫기 태그도 같은 함수 사용)
            }
        }

        // 기본 함수명 추출
        const functionName = this.extractBaseFunctionName(cleaned);
        const functionLower = functionName.toLowerCase();

        // 단어가 추출된 함수명과 일치하는지 확인
        if (functionLower === wordLower || functionLower.includes(wordLower)) {
            // 블록 함수이고 접두사가 감지된 경우, #를 포함하여 반환
            if (hasBlockPrefix) {
                return '#' + functionLower;
            }
            return functionLower;
        }

        // 부분 일치 확인 (별칭에 유용)
        if (wordLower.length > 2 && functionLower.startsWith(wordLower)) {
            if (hasBlockPrefix) {
                return '#' + functionLower;
            }
            return functionLower;
        }

        // 단어 자체를 사용 (중첩 함수 또는 함수명에 직접 호버링한 경우)
        return wordLower;
    }

    /**
     * 정리된 문맥에서 기본 함수명을 추출합니다
     * ::, 공백 및 기타 구분자를 처리합니다
     *
     * @param cleaned 정리된 CBS 표현식 내용 (접두사 제거됨)
     * @returns 기본 함수명
     */
    private extractBaseFunctionName(cleaned: string): string {
        const separatorIndex = cleaned.indexOf('::');
        const spaceIndex = cleaned.indexOf(' ');

        if (separatorIndex !== -1 && (spaceIndex === -1 || separatorIndex < spaceIndex)) {
            // :: 구분자가 있음 (일반 함수 호출)
            return cleaned.substring(0, separatorIndex).trim();
        } else if (spaceIndex !== -1) {
            // 공백이 있음 (인자가 있는 블록 함수일 가능성)
            return cleaned.substring(0, spaceIndex).trim();
        } else {
            // 구분자가 없음, 전체 문자열이 함수명
            return cleaned.trim();
        }
    }

    /**
     * 함수 정보로부터 마크다운 Hover 툴팁 내용을 생성합니다
     *
     * @param info CBS 함수 정보
     * @returns 마크다운 형식의 Hover 툴팁
     */
    private createHoverContent(info: CBSFunctionInfo): vscode.MarkdownString {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;

        // 함수명과 설명
        markdown.appendMarkdown(`**${info.name}**\n\n`);
        markdown.appendMarkdown(`${info.description}\n\n`);

        // 인자 목록
        if (info.arguments.length > 0) {
            markdown.appendMarkdown(`**인자**:\n`);
            for (const arg of info.arguments) {
                markdown.appendMarkdown(`- \`${arg}\`\n`);
            }
            markdown.appendMarkdown('\n');
        }

        // 사용 예제
        if (info.example) {
            markdown.appendMarkdown(`**예제**: \`${info.example}\`\n\n`);
        }

        // 별칭 목록
        if (info.aliases.length > 0) {
            markdown.appendMarkdown(`**별칭**: ${info.aliases.join(', ')}\n`);
        }

        return markdown;
    }
}

/**
 * CBS 함수 정보 인터페이스
 * cbsDatabase.ts에서 조회된 함수 메타데이터를 나타냅니다
 */
interface CBSFunctionInfo {
    /** 함수 이름 */
    name: string;
    /** 함수 설명 (한글) */
    description: string;
    /** 인자 목록 */
    arguments: string[];
    /** 사용 예제 */
    example: string;
    /** 별칭 목록 */
    aliases: string[];
}