// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The errors of the lab: the catalogue of the codes `SWT-E001` to `SWT-E011`. Every failure of an experiment is an
 * `SwtError` of the contracts with one issue; the lab throws nothing else.
 */
import { SwtError } from "@swarmtales/contracts";

/**
 * A failure of an experiment or of the lab: an `SwtError` with one issue of the codes `SWT-E001` to `SWT-E011`.
 *
 * @remarks
 * `SWT-E001` a file of the lab does not match its schema; `SWT-E002` an arm overrides a param the game does not
 * declare (read from the manifest of a finished run); `SWT-E003` the plan's estimate is above the cap; `SWT-E004` the cap was reached between two runs;
 * `SWT-E005` two runs do not compare, or a run was not played with the model, the params and the cap of the spec; `SWT-E006` a run folder is unfinished, unverified or of another experiment;
 * `SWT-E007` a broken series; `SWT-E010` a metric no loaded mechanic exports; `SWT-E011` an analysis before every
 * planned run has a status. `SWT-E008` is not the lab's: the code is reserved in this range for the chess reference
 * engine of the command line (`apps/cli/src/chess-engine.ts`), its one owner. `SWT-E009` is not used.
 *
 * @example
 * ```ts
 * try {
 * 	parseExperimentSpec(JSON.parse(text), "games/quarry/experiments/open-quarries.json");
 * } catch (error) {
 * 	if (error instanceof LabError && error.code === "SWT-E001") console.error(error.message);
 * }
 * ```
 *
 * @public
 */
export class LabError extends SwtError {}

/**
 * What a player rejects with when a run was refused before any model call, for example because the spend ledger has
 * no room for its cap. It carries the issues of the refusal. The runner charges nothing for such a run and writes no
 * record: the experiment stops with this error, and the run is played by the next call.
 *
 * @example
 * ```ts
 * const play: PlayRun = async (run, capUsd) => {
 * 	if (!ledger.fits(capUsd)) throw new RunRefused({ code: "SWT-C025", summary: "the spend ledger has no room", why: "The cap of the milestone is held by code.", fix: "Raise the cap." });
 * 	return playLive(run, capUsd);
 * };
 * ```
 *
 * @public
 */
export class RunRefused extends SwtError {}

const issue = (code: string, summary: string, why: string, fix: string, file?: string): LabError =>
	new LabError(file === undefined ? { code, summary, why, fix } : { code, summary, where: { file }, why, fix });

/**
 * `SWT-E001`: an experiment spec, a noise-floor file or a results file does not match its schema.
 *
 * @param what - What kind of file it is, for example "experiment spec".
 * @param problem - The first mismatch: the data path and what is wrong there.
 * @param file - The file's path, when the value came from a file.
 * @returns The error.
 */
export function badFile(what: string, problem: string, file?: string): LabError {
	return issue("SWT-E001", `${file ?? `the ${what}`}: ${problem}`, "A file of the lab has exactly the fields of its schema; an unknown key is an error, never ignored.", "Correct the named field, or remove a key the schema does not have.", file);
}

/**
 * `SWT-E002`: an arm overrides a param the game family does not declare.
 *
 * @param arm - The id of the arm.
 * @param param - The name of the param.
 * @param declared - The params the game family declares.
 * @returns The error.
 */
export function unknownParam(arm: string, param: string, declared: readonly string[]): LabError {
	return issue("SWT-E002", `arm "${arm}" overrides the param "${param}", which the game does not declare`, "An arm is a diff of the typed params of a game family.", `Use one of [${declared.join(", ")}], or add the param to the game family.`);
}

/**
 * `SWT-E003`: the estimated cost of the plan is above the experiment's cap.
 *
 * @param estimateUsd - The sum of the estimates of the planned runs.
 * @param totalUsd - The cap of the experiment.
 * @returns The error.
 */
export function estimateAboveCap(estimateUsd: number, totalUsd: number): LabError {
	return issue("SWT-E003", `the plan is estimated at ${estimateUsd.toFixed(2)} USD, the cap is ${totalUsd.toFixed(2)} USD`, "An experiment does not start when its estimate does not fit under `budget.totalUsd`.", "Plan fewer runs, or raise the cap with the owner's go.");
}

/**
 * `SWT-E004`: the experiment's cap was reached between two runs.
 *
 * @param spentUsd - What the finished runs cost.
 * @param reservedUsd - What is reserved for the runs in flight.
 * @param perRunUsd - The cap of the run that was not started.
 * @param totalUsd - The cap of the experiment.
 * @returns The error.
 */
export function capReached(spentUsd: number, reservedUsd: number, perRunUsd: number, totalUsd: number): LabError {
	return issue("SWT-E004", `the next run does not fit: ${spentUsd.toFixed(4)} spent + ${reservedUsd.toFixed(2)} reserved + ${perRunUsd.toFixed(2)} for the run is above ${totalUsd.toFixed(2)} USD`, "A run starts only when its whole cap fits under the cap of the experiment; no run is stopped half way for it.", "Read the state file; the experiment continues with the same plan under a cap the owner approves.");
}

/**
 * `SWT-E005`: two runs of one experiment do not compare.
 *
 * @param run - The id of the run that differs.
 * @param other - The id of the run it was compared with.
 * @param field - The first manifest field that differs.
 * @returns The error.
 */
export function notComparable(run: string, other: string, field: string): LabError {
	return issue("SWT-E005", `run ${run} does not compare with run ${other}: ${field} differs`, "Runs are pooled only when kernel, scheduler, model, pricing and tool texts are the same.", "Play the series with one checkout and one model id; do not pool the two runs.");
}

/**
 * `SWT-E005`: a finished run was not played as the spec plans it, so it does not compare with the planned runs.
 *
 * @param run - The id of the run.
 * @param field - The manifest field that differs from the spec.
 * @param found - The value of the manifest.
 * @param planned - The value the spec plans.
 * @returns The error.
 */
export function notAsPlanned(run: string, field: string, found: unknown, planned: unknown): LabError {
	const shown = (value: unknown): string => (value === undefined ? "nothing" : JSON.stringify(value));
	return issue("SWT-E005", `run ${run} does not compare with the runs the spec plans: ${field} is ${shown(found)}, the spec has ${shown(planned)}`, "Runs are pooled only when kernel, scheduler, model, pricing and tool texts are the same, and each is played with the model of the spec, the params of its arm and the per-run cap.", "Play every run of the series from its spec with `swt experiment run`; do not pool the run.");
}

/**
 * `SWT-E006`: a run folder is unfinished, unverified or belongs to another experiment.
 *
 * @param directory - The run folder.
 * @param problem - What is wrong with it, as the rest of a sentence that starts with the folder.
 * @returns The error.
 */
export function badRunFolder(directory: string, problem: string): LabError {
	return issue("SWT-E006", `${directory}: ${problem}`, "Facts are read only from a finished run whose log verifies and whose manifest names this experiment.", "Verify the folder with `swt verify`; leave a broken run out, with its record kept.", directory);
}

/**
 * `SWT-E007`: the experiment stops, because three runs in a row were excluded or failed, or a run reported a leak.
 *
 * @param reason - What happened, as a sentence.
 * @returns The error.
 */
export function seriesBroken(reason: string): LabError {
	return issue("SWT-E007", `the experiment stops: ${reason}`, "A systematic fault costs three runs, not the series; a leak stops at once.", "Find the cause in the run folders that were kept before any further run.");
}

/**
 * `SWT-E010`: a metric of the spec is exported by no loaded mechanic.
 *
 * @param metric - The metric key, "<plugin id>.<metric id>".
 * @param known - The metric keys the loaded mechanics export.
 * @returns The error.
 */
export function unknownMetric(metric: string, known: readonly string[]): LabError {
	return issue("SWT-E010", `the metric "${metric}" is exported by no loaded mechanic`, "A metric of a spec is a generic key of the lab or \"<plugin id>.<metric id>\" of a mechanic of the game.", `Use one of [${known.join(", ")}].`);
}

/**
 * `SWT-E011`: the analysis is asked for before every planned run has a status.
 *
 * @param open - How many planned runs have no record yet.
 * @returns The error.
 */
export function analysisTooEarly(open: number): LabError {
	return issue("SWT-E011", `${open} planned runs have no status yet`, "An estimate is computed once, over the whole plan; nobody looks at half a series.", "Finish the experiment with `swt experiment run`, then analyse it.");
}
