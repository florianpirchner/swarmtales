// SPDX-License-Identifier: Apache-2.0
/** Word scanning shared by the kernel word-list test and the name lint. */
import ts from "typescript";

/** One place where a listed word was found. */
export interface WordHit {
	readonly line: number;
	readonly word: string;
}

/**
 * Splits a text into lower-case words. An identifier in camel case, Pascal case or snake case gives one word per part
 * (`ResidentId` gives `resident` and `id`).
 *
 * @param text - The text.
 * @returns The words in order.
 */
export function wordsOf(text: string): readonly string[] {
	return (text.match(/[A-Za-z]+/g) ?? []).flatMap((run) => run.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+/g) ?? []).map((word) => word.toLowerCase());
}

/** The word itself and what it may be the plural of. */
function singulars(word: string): readonly string[] {
	return [
		word,
		...(word.endsWith("s") ? [word.slice(0, -1)] : []),
		...(word.endsWith("es") ? [word.slice(0, -2)] : []),
		...(word.endsWith("ies") ? [`${word.slice(0, -3)}y`] : []),
	];
}

/**
 * Finds listed words in a text, in the singular or in the plural (`votes`, `matches`, `cities`).
 *
 * @param text - The text to scan, line by line.
 * @param listed - The lower-case words to find.
 * @returns One hit per line and word.
 */
export function findWords(text: string, listed: ReadonlySet<string>): readonly WordHit[] {
	const hits: WordHit[] = [];
	text.split(/\r?\n/).forEach((content, index) => {
		const found = new Set<string>();
		for (const word of wordsOf(content)) {
			const hit = singulars(word).find((form) => listed.has(form));
			if (hit !== undefined) found.add(hit);
		}
		for (const word of found) hits.push({ line: index + 1, word });
	});
	return hits;
}

const NAME_KINDS: ReadonlySet<ts.SyntaxKind> = new Set([
	ts.SyntaxKind.Identifier, ts.SyntaxKind.PrivateIdentifier, ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NoSubstitutionTemplateLiteral,
	ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail, ts.SyntaxKind.JsxText,
]);

/**
 * Reduces a source text to its identifiers and the text of its string literals, each on the line where it starts.
 * Comments, keywords and punctuation are left out.
 *
 * @param text - The source text.
 * @returns A text with the same number of lines that holds only the names and strings.
 */
export function namesAndStrings(text: string): string {
	const source = ts.createSourceFile("words.ts", text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
	const lines = text.split(/\r?\n/).map((): string[] => []);
	const visit = (node: ts.Node): void => {
		if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
		if (NAME_KINDS.has(node.kind)) {
			const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line;
			lines[line]?.push(node.getText(source).replace(/\s+/g, " "));
			return;
		}
		node.getChildren(source).forEach(visit);
	};
	visit(source);
	return lines.map((parts) => parts.join(" ")).join("\n");
}
