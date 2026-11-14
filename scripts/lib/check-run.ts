// SPDX-License-Identifier: Apache-2.0
/**
 * The pure parts of `pnpm check`: the gate list, the budget (DECISIONS.md, D3) and the summary. The budget makes
 * sure that the check fits a standard hosted runner.
 */

/** One gate: a named command of `pnpm check`. */
export interface Gate {
	readonly name: string;
	readonly command: readonly string[];
}

/** The gates, in the order they run. The first failure stops the check. */
export const GATES: readonly Gate[] = [
	{ name: "typecheck", command: ["pnpm", "typecheck"] },
	{ name: "lint (limits, TSDoc, 4 GB heap)", command: ["pnpm", "lint"] },
	{ name: "tests (budgets, words, English, README, names, exceptions, workspace shape)", command: ["pnpm", "test"] },
	{ name: "layer check", command: ["pnpm", "check:layers"] },
	{ name: "licence gate", command: ["pnpm", "check:licences"] },
	{ name: "sign-off check", command: ["pnpm", "check:signoff"] },
	{ name: "build", command: ["pnpm", "build"] },
	{ name: "API reports", command: ["pnpm", "api"] },
];

/** The budget of the whole check. */
export const CHECK_BUDGET = { seconds: 600, memoryMb: 6144 } as const;

/** What one gate did. `peakMb` is `undefined` where memory cannot be measured. */
export interface GateResult {
	readonly name: string;
	readonly ok: boolean;
	readonly seconds: number;
	readonly peakMb: number | undefined;
}

/**
 * Sums the resident memory of one process group from the output of `ps -eo pgid=,rss=`.
 *
 * @param output - The output of `ps`: one line per process with the group id and the resident set size in kB.
 * @param group - The process group id.
 * @returns The group's resident memory in MB.
 */
export function groupMemoryMb(output: string, group: number): number {
	let kilobytes = 0;
	for (const line of output.split("\n")) {
		const [pgid, rss] = line.trim().split(/\s+/);
		if (Number(pgid) === group) kilobytes += Number(rss);
	}
	return kilobytes / 1024;
}

/**
 * Decides the result of a check from its gates and the budget.
 *
 * @param results - The results of the gates that ran.
 * @returns The failures; an empty list when the check is green and inside its budget.
 */
export function failures(results: readonly GateResult[]): readonly string[] {
	const seconds = results.reduce((sum, result) => sum + result.seconds, 0);
	const peak = Math.max(0, ...results.map((result) => result.peakMb ?? 0));
	return [
		...results.filter((result) => !result.ok).map((result) => `the gate "${result.name}" failed`),
		...(results.length < GATES.length ? [`${GATES.length - results.length} gate(s) did not run`] : []),
		...(seconds > CHECK_BUDGET.seconds ? [`the check took ${seconds.toFixed(0)} s; the budget is ${CHECK_BUDGET.seconds} s`] : []),
		...(peak > CHECK_BUDGET.memoryMb ? [`the check used ${peak.toFixed(0)} MB; the budget is ${CHECK_BUDGET.memoryMb} MB`] : []),
	];
}

/**
 * Renders the summary of a check, in a form that a pull request can quote.
 *
 * @param results - The results of the gates that ran.
 * @returns A table of the gates with time and peak memory, then the totals and the verdict.
 */
export function summary(results: readonly GateResult[]): string {
	const memory = (value: number | undefined): string => (value === undefined ? "not measured" : `${value.toFixed(0)} MB`);
	const seconds = results.reduce((sum, result) => sum + result.seconds, 0);
	const measured = results.flatMap((result) => (result.peakMb === undefined ? [] : [result.peakMb]));
	const failed = failures(results);
	return [
		"| Gate | Result | Time | Peak memory |",
		"|---|---|---|---|",
		...results.map((result) => `| ${result.name} | ${result.ok ? "pass" : "FAIL"} | ${result.seconds.toFixed(1)} s | ${memory(result.peakMb)} |`),
		"",
		`Total: ${seconds.toFixed(1)} s of ${CHECK_BUDGET.seconds} s; peak memory ${memory(measured.length > 0 ? Math.max(...measured) : undefined)} of ${CHECK_BUDGET.memoryMb} MB.`,
		failed.length === 0 ? "pnpm check: green" : `pnpm check: FAILED\n${failed.map((line) => `- ${line}`).join("\n")}`,
	].join("\n");
}
