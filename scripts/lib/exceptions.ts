// SPDX-License-Identifier: Apache-2.0
/**
 * The exception format (issue 9): a rule is switched off only by a disable comment with a reason and a linked
 * issue. The ESLint rule `swt/disable-needs-issue` reports it in the editor; `scripts/gates/exceptions.test.ts`
 * enforces it on the file text, because a disable comment can also switch off the rule that checks disable comments.
 */
import ts from "typescript";

const DISABLE = /^\s*eslint-disable(?:-next-line|-line)?(?:\s|$)/;
const NAMES_RULE = /^\s*eslint-disable(?:-next-line|-line)?\s+[@\w]/;
const INLINE_CONFIG = /^\s*eslint\s+[@\w/-]+\s*:/;
const ISSUE = /#\d+|\/issues\/\d+/;
const REASON_WITH_ISSUE = /\s--\s.*(?:#\d+|\/issues\/\d+)/s;
const TS_OFF = /^\s*@ts-(?:ignore|nocheck)\b/;
const TS_EXPECT = /^\s*@ts-expect-error\b/;
const FORMAT = "An exception needs a reason and a linked issue: `eslint-disable-next-line <rule> -- <reason>, see #<issue>`.";

function disableProblem(value: string): string | undefined {
	if ((value.split(" -- ")[0] ?? "").includes("swt/disable-needs-issue")) return "The rule swt/disable-needs-issue cannot be disabled.";
	if (!NAMES_RULE.test(value)) return "An exception names the rule it disables; a comment that disables every rule is forbidden.";
	return REASON_WITH_ISSUE.test(value) ? undefined : FORMAT;
}

/**
 * Judges one comment.
 *
 * @param value - The text of the comment without its markers.
 * @param inTest - True for a comment of a test file, where `@ts-expect-error` proves a type error on purpose.
 * @returns What is wrong with the comment, or `undefined` when it is no exception or a well-formed one.
 */
export function exceptionProblem(value: string, inTest: boolean): string | undefined {
	if (INLINE_CONFIG.test(value)) return "A comment may not configure the linter. Rules are set in eslint.config.js.";
	if (TS_OFF.test(value)) return "@ts-ignore and @ts-nocheck are forbidden. Fix the type.";
	if (DISABLE.test(value)) return disableProblem(value);
	if (TS_EXPECT.test(value) && !inTest && !ISSUE.test(value)) return "Outside a test, @ts-expect-error needs a reason and a linked issue (#<issue>).";
	return undefined;
}

/** One comment of a source text. */
export interface SourceComment {
	readonly line: number;
	readonly value: string;
}

/**
 * Lists the comments of a TypeScript or JavaScript text. Text inside strings and template literals is not a comment.
 *
 * @param text - The source text.
 * @returns The comments in order, each without its markers.
 */
export function commentsOf(text: string): readonly SourceComment[] {
	const source = ts.createSourceFile("comments.tsx", text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
	const found = new Map<number, SourceComment>();
	const add = (ranges: readonly ts.CommentRange[] | undefined): void => {
		for (const range of ranges ?? []) {
			const raw = text.slice(range.pos, range.end);
			const value = range.kind === ts.SyntaxKind.SingleLineCommentTrivia ? raw.slice(2) : raw.slice(2, -2);
			found.set(range.pos, { line: source.getLineAndCharacterOfPosition(range.pos).line + 1, value });
		}
	};
	const visit = (node: ts.Node): void => {
		if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
		add(ts.getLeadingCommentRanges(text, node.getFullStart()));
		add(ts.getTrailingCommentRanges(text, node.getEnd()));
		node.getChildren(source).forEach(visit);
	};
	visit(source);
	return [...found.values()].sort((a, b) => a.line - b.line);
}

/**
 * Finds the malformed exceptions of a source text.
 *
 * @param text - The source text.
 * @param inTest - True for a test file.
 * @returns One message per malformed exception, with the line in front.
 */
export function exceptionOffences(text: string, inTest: boolean): readonly string[] {
	return commentsOf(text).flatMap((comment) => {
		const problem = exceptionProblem(comment.value, inTest);
		return problem === undefined ? [] : [`${comment.line}: ${problem}`];
	});
}
