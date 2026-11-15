// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The pure parts of `pnpm check`: the gate list, the budget (DECISIONS.md, D3) and the summary. The budget makes
 * sure that the check fits a standard hosted runner.
 */

/**
 * One gate: a named command of `pnpm check`. The gates of one lane run one after the other, in the order of the
 * list; the lanes run side by side (M4-71). A gate that needs another one's output is in that gate's lane, after it.
 */
export interface Gate {
	readonly name: string;
	readonly command: readonly string[];
	readonly lane: number;
}

/**
 * The gates. Three lanes keep the four cores of a hosted runner busy inside 6 GB: the typecheck, the build and the API
 * reports (which read the build) in one; the quick gates and then lint (two processes, `scripts/lint.ts`) in the
 * second; the tests (two workers) in the third. The first failure stops the check.
 */
export const GATES: readonly Gate[] = [
	{ name: "typecheck", command: ["pnpm", "typecheck"], lane: 0 },
	{ name: "layer check", command: ["pnpm", "check:layers"], lane: 1 },
	{ name: "licence gate", command: ["pnpm", "check:licences"], lane: 1 },
	{ name: "sign-off check", command: ["pnpm", "check:signoff"], lane: 1 },
	{ name: "lint (limits, TSDoc, 4 GB heap)", command: ["pnpm", "lint"], lane: 1 },
	{ name: "tests (budgets, words, English, README, names, exceptions, workspace shape)", command: ["pnpm", "test"], lane: 2 },
	{ name: "build", command: ["pnpm", "build"], lane: 0 },
	{ name: "API reports", command: ["pnpm", "api"], lane: 0 },
];

/** The budget of the whole check. */
export const CHECK_BUDGET = { seconds: 600, memoryMb: 6144 } as const;

/**
 * The gates by lane, each lane in the order of the list.
 *
 * @param gates - The gates.
 * @returns One list of gates per lane, in the order of the lane numbers.
 */
export function lanes(gates: readonly Gate[]): readonly (readonly Gate[])[] {
	const numbers = [...new Set(gates.map((gate) => gate.lane))].sort((left, right) => left - right);
	return numbers.map((lane) => gates.filter((gate) => gate.lane === lane));
}

/** What one gate did. `peakMb` is `undefined` where memory cannot be measured. */
export interface GateResult {
	readonly name: string;
	readonly ok: boolean;
	readonly seconds: number;
	readonly peakMb: number | undefined;
}

/**
 * What the whole check did: the gates that ended, the time from the start to the end of the last gate, and the
 * peak of the memory of all gates that ran at the same time. `peakMb` is `undefined` where memory cannot be measured.
 */
export interface CheckRun {
	readonly results: readonly GateResult[];
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
 * @param run - What the check did.
 * @returns The failures; an empty list when the check is green and inside its budget.
 */
export function failures(run: CheckRun): readonly string[] {
	const { results, seconds } = run;
	const peak = run.peakMb ?? 0;
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
 * @param run - What the check did.
 * @returns A table of the gates with time and peak memory, then the totals and the verdict.
 */
export function summary(run: CheckRun): string {
	const memory = (value: number | undefined): string => (value === undefined ? "not measured" : `${value.toFixed(0)} MB`);
	const failed = failures(run);
	return [
		"| Gate | Result | Time | Peak memory |",
		"|---|---|---|---|",
		...run.results.map((result) => `| ${result.name} | ${result.ok ? "pass" : "FAIL"} | ${result.seconds.toFixed(1)} s | ${memory(result.peakMb)} |`),
		"",
		`Total: ${run.seconds.toFixed(1)} s of ${CHECK_BUDGET.seconds} s, lanes side by side; peak memory ${memory(run.peakMb)} of ${CHECK_BUDGET.memoryMb} MB, of all gates at once.`,
		failed.length === 0 ? "pnpm check: green" : `pnpm check: FAILED\n${failed.map((line) => `- ${line}`).join("\n")}`,
	].join("\n");
}
