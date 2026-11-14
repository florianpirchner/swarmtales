// SPDX-License-Identifier: Apache-2.0
/**
 * The local ESLint rules of the repository.
 *
 * - `swt/max-code-lines` and `swt/code-lines-warning`: the file limit, counted in code lines. They are one rule
 *   under two names, because ESLint gives a rule one severity and the limit has two steps (warn at 250, fail at 300).
 * - `swt/max-function-code-lines`: the function limit, counted the same way. With `skipSuites`, the callback of
 *   `describe(...)` is left out, because it wraps a whole test file.
 * - `swt/disable-needs-issue`: an exception to a rule is a disable comment with a reason and a linked issue
 *   (`scripts/lib/exceptions.ts`). A gate test enforces the same on the file text, where no comment can switch it off.
 */
import type { ESLint, Rule } from "eslint";
import { codeLineNumbers } from "../lib/code-lines.ts";
import { exceptionProblem } from "../lib/exceptions.ts";
import { relative, sep } from "node:path";
import { isTestFile, REPO_ROOT } from "../lib/files.ts";

const MAX_SCHEMA: Rule.RuleMetaData["schema"] = [
	{
		type: "object",
		properties: { max: { type: "integer", minimum: 1 }, skipSuites: { type: "boolean" } },
		required: ["max"],
		additionalProperties: false,
	},
];

type Callee = Extract<Rule.Node, { readonly type: "CallExpression" }>["callee"];

/** The identifier a call chain starts with: `describe` for `describe.each(rows)("name", ...)`. */
function chainStart(callee: Callee): string | undefined {
	if (callee.type === "MemberExpression") return chainStart(callee.object);
	if (callee.type === "CallExpression") return chainStart(callee.callee);
	return callee.type === "Identifier" ? callee.name : undefined;
}

/** Says whether a function is the body of a test suite: the callback of `describe(...)`, which wraps a whole file. */
function isSuite(node: Rule.Node): boolean {
	const call: Rule.Node | null = node.parent;
	if (call?.type !== "CallExpression") return false;
	return call.arguments.some((argument) => argument === node) && chainStart(call.callee) === "describe";
}

interface LimitOptions {
	readonly max: number;
	readonly skipSuites: boolean;
}

function limitOptions(options: readonly unknown[]): LimitOptions {
	const [first] = options;
	if (typeof first !== "object" || first === null || !("max" in first) || typeof first.max !== "number") {
		throw new TypeError("the rule needs the option { max: number }");
	}
	return { max: first.max, skipSuites: "skipSuites" in first && first.skipSuites === true };
}

const fileLimit: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		schema: MAX_SCHEMA,
		messages: { tooLong: "This file has {{count}} code lines; the limit is {{max}}. Split the file." },
	},
	create(context) {
		const { max } = limitOptions(context.options);
		return {
			Program() {
				const count = codeLineNumbers(context.sourceCode.text, context.filename).size;
				if (count <= max) return;
				context.report({ loc: { line: 1, column: 0 }, messageId: "tooLong", data: { count: String(count), max: String(max) } });
			},
		};
	},
};

const functionLimit: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		schema: MAX_SCHEMA,
		messages: { tooLong: "This function has {{count}} code lines; the limit is {{max}}. Split the function." },
	},
	create(context) {
		const { max, skipSuites } = limitOptions(context.options);
		let lines: ReadonlySet<number> | undefined;
		const check = (node: Rule.Node): void => {
			if (node.loc === null || node.loc === undefined || (skipSuites && isSuite(node))) return;
			lines ??= codeLineNumbers(context.sourceCode.text, context.filename);
			let count = 0;
			for (let line = node.loc.start.line; line <= node.loc.end.line; line += 1) if (lines.has(line)) count += 1;
			if (count > max) context.report({ node, messageId: "tooLong", data: { count: String(count), max: String(max) } });
		};
		return { FunctionDeclaration: check, FunctionExpression: check, ArrowFunctionExpression: check };
	},
};

const disableNeedsIssue: Rule.RuleModule = {
	meta: { type: "problem", schema: [], messages: { malformed: "{{problem}}" } },
	create(context) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					const problem = exceptionProblem(comment.value, isTestFile(relative(REPO_ROOT, context.filename).split(sep).join("/")));
					if (problem !== undefined) context.report({ loc: comment.loc ?? { line: 1, column: 0 }, messageId: "malformed", data: { problem } });
				}
			},
		};
	},
};

/** The local plugin; `eslint.config.js` registers it under the name `swt`. */
export const swt: ESLint.Plugin = {
	meta: { name: "swt" },
	rules: {
		"max-code-lines": fileLimit,
		"code-lines-warning": fileLimit,
		"max-function-code-lines": functionLimit,
		"disable-needs-issue": disableNeedsIssue,
	},
};
