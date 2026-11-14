// SPDX-License-Identifier: Apache-2.0
/**
 * The error for a developer: a code, what, where, why and a fix. A refusal is a tool outcome and never an error.
 */
import { Type, type Static } from "typebox";

const text = (description: string): { readonly description: string } => ({ description });

/**
 * The pattern of an error code. The letter is the area: G game, M mechanic, D Director, R run and kernel,
 * X models, P texts, L log and chain, C command line. A code is never reused or renumbered.
 *
 * @public
 */
export const SWT_CODE = "^SWT-[GMDRXPLC][0-9]{3}$";

/**
 * The schema of one problem.
 *
 * @public
 */
export const SwtIssueSchema = Type.Object(
	{
		code: Type.String({ pattern: SWT_CODE, description: "The error code" }),
		summary: Type.String(text("What is wrong, in one sentence")),
		where: Type.Optional(
			Type.Object(
				{
					file: Type.Optional(Type.String(text("The file"))),
					line: Type.Optional(Type.Integer(text("The line in the file"))),
					path: Type.Optional(Type.String(text("The data path, for example `mechanics[1].options.size`"))),
					package: Type.Optional(Type.String(text("The package that owns the place"))),
				},
				{ additionalProperties: false, description: "The place of the problem" },
			),
		),
		why: Type.String(text("The rule that is broken, in one sentence")),
		fix: Type.String(text("An action that solves it; a \"did you mean\" where a name was mistyped")),
		details: Type.Optional(Type.Record(Type.String(text("A name")), Type.Unknown(text("A value")), text("Machine-readable details"))),
	},
	{ additionalProperties: false, description: "One problem a developer must solve" },
);

/**
 * One problem a developer must solve.
 *
 * @public
 */
export type SwtIssue = Static<typeof SwtIssueSchema>;

function placeOf(where: SwtIssue["where"]): string {
	if (where === undefined) return "";
	const file = where.file === undefined ? undefined : where.line === undefined ? where.file : `${where.file}:${where.line}`;
	const owner = where.package === undefined ? undefined : `package ${where.package}`;
	return [file, where.path, owner].filter((part) => part !== undefined).join(", ");
}

/**
 * Prints one issue in the five-line form: what, where, why, fix and the link to the reference.
 *
 * @param issue - The issue.
 * @returns The lines, joined by line feeds. The `at` line is left out when the issue names no place.
 * @example
 * ```ts
 * formatIssue({ code: "SWT-G002", summary: "schema is 2", why: "This version reads schema 1.", fix: "Set schema to 1." });
 * // error SWT-G002: schema is 2
 * //   This version reads schema 1.
 * //   fix: Set schema to 1.
 * //   docs: docs/reference/errors.md#swt-g002
 * ```
 *
 * @public
 */
export function formatIssue(issue: SwtIssue): string {
	const place = placeOf(issue.where);
	return [
		`error ${issue.code}: ${issue.summary}`,
		...(place === "" ? [] : [`  at ${place}`]),
		`  ${issue.why}`,
		`  fix: ${issue.fix}`,
		`  docs: docs/reference/errors.md#${issue.code.toLowerCase()}`,
	].join("\n");
}

/**
 * One or several problems, reported together. `message` is the first issue in the five-line form.
 *
 * @public
 */
export class SwtError extends Error {
	/** Every problem, in the order given. */
	readonly issues: readonly SwtIssue[];

	/**
	 * Builds the error from its issues.
	 *
	 * @param issues - One issue or a list of them.
	 * @param options - The options of the error.
	 * @param options.cause - The failure that led to this one.
	 */
	constructor(issues: SwtIssue | readonly SwtIssue[], options?: { readonly cause?: unknown }) {
		const list: readonly SwtIssue[] = Array.isArray(issues) ? issues : [issues];
		const first = list[0];
		super(first === undefined ? "error: no issue was given" : formatIssue(first), options);
		this.name = "SwtError";
		this.issues = list;
	}

	/**
	 * The code of the first issue.
	 *
	 * @returns The code, or an empty string when the error holds no issue.
	 */
	get code(): string {
		return this.issues[0]?.code ?? "";
	}
}

/**
 * The edit distance of two words (insert, delete, replace), by rows.
 *
 * @param a - One word.
 * @param b - The other word.
 * @returns The number of edits.
 */
function distance(a: string, b: string): number {
	let row = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		const next = [i];
		for (let j = 1; j <= b.length; j++) {
			const replace = (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
			next.push(Math.min(replace, (row[j] ?? 0) + 1, (next[j - 1] ?? 0) + 1));
		}
		row = next;
	}
	return row[b.length] ?? 0;
}

/**
 * Finds the known name a mistyped name most likely means, for a "did you mean".
 *
 * @param name - The name as it was written.
 * @param known - The names that exist.
 * @returns The known name with the smallest edit distance, when that is at most 2; the first one on a tie.
 *
 * @public
 */
export function closest(name: string, known: readonly string[]): string | undefined {
	let best: string | undefined;
	let bestDistance = 3;
	for (const candidate of known) {
		const d = distance(name, candidate);
		if (d < bestDistance) {
			best = candidate;
			bestDistance = d;
		}
	}
	return best;
}
