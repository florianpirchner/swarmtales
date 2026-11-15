// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The plan of an experiment: every arm at every seed and replicate, in an order the spec alone fixes. The runner
 * plays the plan, the analysis asks it which runs are still open.
 */
import { jsonHash } from "@swarmtales/chain";
import { unknownMetric } from "../errors.ts";
import { mulberry32 } from "../stats/summary.ts";
import { checkCells, type ExperimentSpec } from "./spec.ts";

/**
 * One run of the plan.
 *
 * @public
 */
export interface PlannedRun {
	/** The place in the shuffled plan; a replacement has the replaced run's index plus the length of the plan. */
	readonly index: number;
	/** The id of the arm. */
	readonly arm: string;
	/** The seed. */
	readonly seed: number;
	/** The replicate; a replacement has the replaced run's replicate plus 100. */
	readonly replicate: number;
	/** The param overrides of the arm. */
	readonly params: Readonly<Record<string, unknown>>;
}

/**
 * The hash that binds the plan and the state file of an experiment to its spec. It leaves `budget` and
 * `concurrency` out (decision A18): they say how a series is paid and paced, not what is measured, so a series
 * stopped at its cap continues with the same plan after the total was raised.
 *
 * @param spec - The experiment spec.
 * @returns The sha256 of the canonical JSON of the spec without the two fields.
 */
export function bindingHash(spec: ExperimentSpec): string {
	return jsonHash(Object.fromEntries(Object.entries(spec).filter(([field]) => field !== "budget" && field !== "concurrency")));
}

/** What a replacement adds to the replicate of the run it replaces. */
export const REPLACEMENT = 100;

/**
 * Plans the runs of a spec: arm x seed x replicate, shuffled with a generator seeded from the spec's hash
 * (taken without `budget` and `concurrency`, decision A18), so the arms are interleaved and the order is fixed by the spec.
 *
 * @param spec - The experiment spec.
 * @returns The planned runs in play order; the same spec gives the same plan.
 * @throws LabError `SWT-E001` when the spec lists a seed or an arm id twice: the plan would hold a cell twice.
 * @example
 * ```ts
 * for (const run of planRuns(spec)) console.log(run.index, run.arm, run.seed, run.replicate);
 * ```
 *
 * @public
 */
export function planRuns(spec: ExperimentSpec): readonly PlannedRun[] {
	const cells = checkCells(spec).arms.flatMap((arm) => spec.seeds.flatMap((seed) => Array.from({ length: spec.replicates }, (_, replicate) => ({ arm: arm.id, seed, replicate, params: arm.params }))));
	const next = mulberry32(Number.parseInt(bindingHash(spec).slice(0, 8), 16));
	for (let i = cells.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		const [a, b] = [cells[i], cells[j]];
		if (a !== undefined && b !== undefined) [cells[i], cells[j]] = [b, a];
	}
	return cells.map((cell, index) => ({ index, ...cell }));
}

/**
 * The one replacement of an excluded run: the same arm and seed, the replicate plus 100.
 *
 * @param run - The excluded run of the plan.
 * @param planLength - The number of runs of the plan.
 * @returns The replacement; its index is the run's plus the length of the plan.
 */
export function replacementOf(run: PlannedRun, planLength: number): PlannedRun {
	return { ...run, index: planLength + run.index, replicate: run.replicate + REPLACEMENT };
}

/**
 * The runs that have no record yet: first the one replacement of every excluded run of the plan, then the rest of
 * the plan in its order. A replacement is not replaced again.
 *
 * @param spec - The experiment spec.
 * @param records - The records so far: the planned run, its status and, for a replacement, the index it replaces.
 * @returns The open runs in play order.
 */
export function openRuns(spec: ExperimentSpec, records: readonly { readonly planned: PlannedRun; readonly status: string; readonly replaces?: number }[]): PlannedRun[] {
	const plan = planRuns(spec);
	const done = new Set(records.map((record) => record.planned.index));
	const replacements = records.filter((record) => record.status === "excluded" && record.replaces === undefined).map((record) => replacementOf(record.planned, plan.length));
	return [...replacements, ...plan].filter((run) => !done.has(run.index));
}

/**
 * The metric keys a spec names: the primary one, the secondary ones and both keys of every guardrail.
 *
 * @param spec - The experiment spec.
 * @returns The keys, each once, in the order of the spec.
 */
export function specMetrics(spec: ExperimentSpec): readonly string[] {
	const guardrails = spec.metrics.guardrails.flatMap((guardrail) => (guardrail.per === undefined ? [guardrail.metric] : [guardrail.metric, guardrail.per]));
	return [...new Set([spec.metrics.primary, ...spec.metrics.secondary, ...guardrails])];
}

/**
 * Refuses a spec that names a metric nobody exports.
 *
 * @param spec - The experiment spec.
 * @param known - The metric keys that exist: of the loaded mechanics, or of the facts of the runs.
 * @param generic - Whether a generic key of the lab (`run.*`, `models.*`) is known without being listed.
 * @throws LabError `SWT-E010` for the first metric of the spec that is not known.
 *
 * @public
 */
export function checkMetrics(spec: ExperimentSpec, known: readonly string[], generic: boolean): void {
	const missing = specMetrics(spec).find((key) => !known.includes(key) && !(generic && /^(run|models)\./.test(key)));
	if (missing !== undefined) throw unknownMetric(missing, known);
}
