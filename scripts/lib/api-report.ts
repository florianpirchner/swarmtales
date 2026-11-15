// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The normal form of an API report (decision A87, issue M5-74). The type checker prints the members of a union of
 * string literals in the order it happened to visit them, which changes from one build to the next
 * (`"accuse" | "audit"` against `"audit" | "accuse"`). Sorting the members of every run of adjacent string
 * literals in a union makes the report change only when the API does. Everything else stays byte for byte.
 */

/** One string literal in double or single quotes, with escapes. */
const LITERAL = String.raw`(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`;
/** The separator of two union members, which may span a line break. */
const BAR = String.raw`\s*\|\s*`;
/** A run of at least two string literals joined by `|`. */
const RUN = new RegExp(`${LITERAL}(?:${BAR}${LITERAL})+`, "g");
const ONE_LITERAL = new RegExp(LITERAL, "g");

function compareCodeUnits(a: string, b: string): number {
	if (a === b) {
		return 0;
	}
	return a < b ? -1 : 1;
}

/** Sorts the literals of one run and keeps its separators in place. */
function sortRun(run: string): string {
	const literals = run.match(ONE_LITERAL) ?? [];
	const separators = run.split(ONE_LITERAL).slice(1, -1);
	const sorted = [...literals].sort(compareCodeUnits);
	return sorted.map((literal, index) => literal + (separators[index] ?? "")).join("");
}

/**
 * Brings an API report into its normal form: line ends become `\n`, and the members of every run of adjacent
 * string literals in a union are sorted by code unit. All other text is left as it is.
 *
 * @param report - The text of a report as api-extractor wrote it.
 * @returns The report in normal form.
 * @example
 * ```ts
 * normalizeReport('type T = "b" | "a";'); // 'type T = "a" | "b";'
 * ```
 */
export function normalizeReport(report: string): string {
	return report.replace(/\r\n/g, "\n").replace(RUN, sortRun);
}

/**
 * Compares a freshly built report in normal form with the committed one.
 *
 * @param fresh - The report of the current build, already in normal form.
 * @param committed - The committed report, or `undefined` when there is none.
 * @returns `undefined` when they are equal, otherwise why they differ (with the first differing line).
 */
export function reportDifference(fresh: string, committed: string | undefined): string | undefined {
	if (committed === undefined) {
		return "the committed report is missing";
	}
	const expected = committed.replace(/\r\n/g, "\n");
	if (fresh === expected) {
		return undefined;
	}
	const freshLines = fresh.split("\n");
	const expectedLines = expected.split("\n");
	const line = freshLines.findIndex((text, index) => text !== expectedLines[index]);
	const at = line === -1 ? freshLines.length : line;
	return `line ${String(at + 1)}: committed ${JSON.stringify(expectedLines[at] ?? "")}, built ${JSON.stringify(freshLines[at] ?? "")}`;
}
