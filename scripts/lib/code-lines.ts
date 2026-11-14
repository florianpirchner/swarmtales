// SPDX-License-Identifier: Apache-2.0
/**
 * The one definition of a code line (DECISIONS.md, D13): a line that holds at least one token. Blank lines and
 * lines that hold only comments do not count. The budget tests and the ESLint limits both count with this module.
 */
import ts from "typescript";

function isDocNode(node: ts.Node): boolean {
	return node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode;
}

/**
 * Finds the lines of a TypeScript or JavaScript text that hold code.
 *
 * @param text - The source text.
 * @param path - The file's path; a `.tsx` or `.jsx` file is read with JSX. A TypeScript file when left out.
 * @returns The 1-based numbers of the lines with at least one token.
 */
export function codeLineNumbers(text: string, path = "counted.ts"): ReadonlySet<number> {
	const kind = /\.[jt]sx$/.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
	const source = ts.createSourceFile("counted", text, ts.ScriptTarget.Latest, false, kind);
	const lines = new Set<number>();
	const visit = (node: ts.Node): void => {
		if (isDocNode(node)) return;
		const children = node.getChildren(source);
		if (children.length > 0) {
			children.forEach(visit);
			return;
		}
		const start = node.getStart(source);
		const end = node.getEnd();
		if (end <= start) return;
		const first = source.getLineAndCharacterOfPosition(start).line;
		const last = source.getLineAndCharacterOfPosition(end - 1).line;
		for (let line = first; line <= last; line += 1) lines.add(line + 1);
	};
	visit(source);
	return lines;
}

/**
 * Counts the code lines of a TypeScript or JavaScript text.
 *
 * @param text - The source text.
 * @param path - The file's path, see {@link codeLineNumbers}.
 * @returns The number of lines with at least one token.
 */
export function countCodeLines(text: string, path?: string): number {
	return codeLineNumbers(text, path).size;
}
