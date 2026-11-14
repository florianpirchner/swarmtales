// SPDX-License-Identifier: Apache-2.0
/**
 * The analysis of an experiment: from the records of the runner and the facts of the runs to `results.json`. Every
 * estimate is computed twice, over the included runs (the pass rule reads this one) and over every finished run.
 */
import { analysisTooEarly, badFile } from "../errors.ts";
import type { RunFacts } from "../facts/facts.ts";
import { type Effect, pairedEffect, unpairedEffect } from "../stats/effect.ts";
import { mean, sd, t95 } from "../stats/summary.ts";
import { shareWithinNoise, withinNoise } from "../stats/tolerance.ts";
import type { NoiseFloor } from "./noise-schema.ts";
import { checkMetrics, openRuns, REPLACEMENT, specMetrics } from "./plan.ts";
import { type ExperimentResults, parseExperimentResults } from "./results.ts";
import type { ExperimentState, RunRecord } from "./run.ts";
import type { ExperimentSpec } from "./spec.ts";

type Over = "included" | "finished";
type Guardrail = ExperimentSpec["metrics"]["guardrails"][number];
interface Row {
	readonly record: RunRecord;
	readonly run: string;
	readonly facts: RunFacts | undefined;
}
const REFUSALS = "run.refusals.";

// The values of one arm by cell (seed and replicate). Over the finished runs, the excluded run of a cell counts
// and its replacement only when the excluded one has no value; a stopped run never counts.
function cells(rows: readonly Row[], arm: string, metric: string, over: Over): Map<string, number> {
	const found = new Map<string, number>();
	for (const { record, facts } of rows) {
		const value = facts?.values[metric];
		const counts = over === "included" ? record.status === "included" : record.status !== "stopped";
		if (record.planned.arm !== arm || !counts || typeof value !== "number") continue;
		const key = `${record.planned.seed}/${record.planned.replicate % REPLACEMENT}`;
		if (record.replaces === undefined || !found.has(key)) found.set(key, value);
	}
	return found;
}

// Treatment and control arm, or the one arm of a replicates design.
function contrastOf(spec: ExperimentSpec): readonly string[] {
	const control = spec.arms.find((arm) => arm.control === true) ?? spec.arms[0];
	const treatment = spec.arms.find((arm) => arm !== control);
	if (spec.design === "replicates" || treatment === undefined) return [control?.id ?? ""];
	return spec.pass?.contrast ?? [treatment.id, control?.id ?? ""];
}

// The effect of one metric; `n` is what the pass rule counts (complete pairs, or runs in each arm). No effect when
// the statistics need more values than there are.
function effectOf(spec: ExperimentSpec, rows: readonly Row[], metric: string, over: Over): { readonly estimator: string; readonly n: number; readonly effect: Effect | undefined } {
	const [treatment = "", control] = contrastOf(spec);
	const b = cells(rows, treatment, metric, over);
	if (control === undefined) {
		const values = [...b.values()];
		const [estimate, se] = values.length < 2 ? [0, 0] : [mean(values), sd(values) / Math.sqrt(values.length)];
		const half = t95(values.length - 1) * se;
		return { estimator: "mean of the arm", n: values.length, effect: values.length < 2 ? undefined : { estimate, se, n: values.length, interval95: [estimate - half, estimate + half], p: 1, test: "none" } };
	}
	const a = cells(rows, control, metric, over);
	if (spec.design === "paired") {
		const keys = [...b.keys()].filter((key) => a.has(key));
		const of = (arm: Map<string, number>) => keys.map((key) => arm.get(key) ?? 0);
		return { estimator: "mean of the paired differences, treatment minus control", n: keys.length, effect: keys.length < 2 ? undefined : pairedEffect(of(a), of(b)) };
	}
	const n = Math.min(a.size, b.size);
	return { estimator: "difference of the arm means, treatment minus control", n, effect: n < 2 ? undefined : unpairedEffect([...a.values()], [...b.values()]) };
}

// Every deviation from the plan: a run that is not included, and an included run that gives the primary metric no
// number (the metric is absent, or its facts were not passed in), so that a smaller n is never silent.
function deviationsOf(spec: ExperimentSpec, rows: readonly Row[]): ExperimentResults["deviations"] {
	return rows.flatMap(({ record, run, facts }) => {
		if (record.status !== "included") return [{ at: run, what: `the run is ${record.status}${record.replaces === undefined ? "" : ", and it was the one replacement"}`, why: record.reason ?? "no reason recorded" }];
		if (typeof facts?.values[spec.metrics.primary] === "number") return [];
		return [{ at: run, what: `the run is included and has no value of ${spec.metrics.primary}`, why: "the metric is absent in the run, or the facts of the run were not read; the run is left out of the estimates" }];
	});
}

function estimatesOf(spec: ExperimentSpec, rows: readonly Row[]): ExperimentResults["estimates"] {
	return [spec.metrics.primary, ...spec.metrics.secondary].flatMap((metric, index) =>
		(["included", "finished"] as const).flatMap((over) => {
			const { estimator, effect } = effectOf(spec, rows, metric, over);
			if (effect === undefined) return [];
			const { estimate, se, n, test, p, interval95: [low, high] } = effect;
			return [{ metric, role: index === 0 ? ("primary" as const) : ("secondary" as const), contrast: [...contrastOf(spec)], estimator, estimate, se, interval: [low, high] satisfies [number, number], n, test, p, over }];
		}),
	);
}

function passOf(spec: ExperimentSpec, rows: readonly Row[]): ExperimentResults["pass"] {
	if (spec.pass === undefined) return undefined;
	const { sign, minN, contrast } = spec.pass;
	const { effect, n } = effectOf(spec, rows, spec.metrics.primary, "included");
	const [word, factor] = sign === "positive" ? ["greater", 1] : ["less", -1];
	const rule = `${spec.metrics.primary}, ${contrast[0]} minus ${contrast[1]} over the included runs, is ${word} than 0; a verdict needs ${minN} ${spec.design === "paired" ? "complete pairs" : "runs in each arm"}`;
	// A design without a contrast would hand the rule the mean of one arm, and its sign would read as a verdict.
	if (contrastOf(spec).length < 2) return { rule: `${rule} (the design ${spec.design} has no contrast of two arms)`, estimate: "absent", n: 0, verdict: "no-verdict" };
	if (effect === undefined) return { rule, estimate: "absent", n, verdict: "no-verdict" };
	return { rule, estimate: effect.estimate, n, verdict: n < minN ? "no-verdict" : effect.estimate * factor > 0 ? "kept" : "not-kept" };
}

// The mean of a guardrail's measure over the included runs of an arm, and whether it is inside the limits.
function guardrailOf(guardrail: Guardrail, arm: string, runs: readonly Row[]): ExperimentResults["guardrails"][number] {
	const ratios = runs.flatMap(({ facts }) => {
		const value = facts?.values[guardrail.metric];
		const per = guardrail.per === undefined ? 1 : facts?.values[guardrail.per];
		return typeof value === "number" && typeof per === "number" && per !== 0 ? [value / per] : [];
	});
	const value = ratios.length === 0 ? ("absent" as const) : mean(ratios);
	const { max = Number.POSITIVE_INFINITY, min = Number.NEGATIVE_INFINITY, within } = guardrail;
	const held = value !== "absent" && value <= max && value >= min && (within === undefined || Math.abs(value - within.of) <= within.share * Math.abs(within.of));
	return { metric: guardrail.metric, ...(guardrail.per === undefined ? {} : { per: guardrail.per }), arm, value, held };
}

// The guardrails of the spec, and one row that does not hold per arm and refusal code outside `allowedRefusals`.
function guardrailsOf(spec: ExperimentSpec, rows: readonly Row[]): ExperimentResults["guardrails"] {
	const arms = spec.arms.map((arm) => arm.id);
	const included = (arm: string) => rows.filter(({ record }) => record.status === "included" && record.planned.arm === arm);
	const limits = spec.metrics.guardrails.flatMap((guardrail) => (guardrail.arm === undefined ? arms : [guardrail.arm]).map((arm) => guardrailOf(guardrail, arm, included(arm))));
	const allowed = spec.allowedRefusals;
	if (allowed === undefined) return limits;
	const refusals = arms.flatMap((arm) => {
		const counts = included(arm).map(({ facts }) => facts?.values ?? {});
		const keys = [...new Set(counts.flatMap((values) => Object.keys(values)))].filter((key) => key.startsWith(REFUSALS) && !allowed.includes(key.slice(REFUSALS.length)));
		return keys.map((metric) => ({ metric, arm, value: mean(counts.map((values) => (typeof values[metric] === "number" ? values[metric] : 0))), held: false }));
	});
	return [...limits, ...refusals];
}

function toleranceOf(spec: ExperimentSpec, rows: readonly Row[], baseline: NoiseFloor | undefined): ExperimentResults["tolerance"] {
	const arm = contrastOf(spec).at(-1) ?? "";
	const values = [...cells(rows, arm, spec.metrics.primary, "included").values()];
	if (baseline === undefined || spec.tolerance === undefined || values.length === 0) return undefined;
	// A baseline of another metric or arm would give a tolerance of two things that were never the same measure.
	if (baseline.metric !== spec.metrics.primary || baseline.arm !== arm) throw badFile("noise-floor file", `it holds ${baseline.metric} of the arm "${baseline.arm}", and the experiment compares ${spec.metrics.primary} of the arm "${arm}"`);
	if (spec.tolerance.kind === "mean") return { kind: "mean", ...withinNoise(baseline.values, values) };
	return { kind: "share", ...shareWithinNoise(baseline.values, values, spec.tolerance.threshold) };
}

/**
 * Computes the results of an experiment from the records of the runner and the facts of its runs.
 *
 * @remarks
 * A run of the facts belongs to the record with its arm, seed and replicate. Every estimate is reported over the
 * included runs and over every finished run that has a value (excluded ones included; a stopped run never). An
 * estimate that the statistics cannot compute (fewer than two pairs, or two runs in an arm) has no row; the pass
 * rule then reads `no-verdict`, as it does below `pass.minN`. A metric that only one arm exports is `"absent"` in
 * the other and gives no estimate. An included run without a number for the primary metric is left out of the
 * estimates and listed in `deviations`. A guardrail that does not hold never changes the verdict.
 *
 * @param state - The state of the experiment, as `runExperiment` returned it or `readExperimentState` read it.
 * @param facts - The facts of the runs that could be read (`readRun` of each record's folder).
 * @param baseline - The noise floor the control values are compared with, when the spec has a `tolerance`.
 * @returns The results, valid against `ExperimentResultsSchema`.
 * @throws LabError `SWT-E011` when a planned run, or the replacement of an excluded one, has no record yet;
 * `SWT-E010` when no run of the facts has a metric of the spec; `SWT-E001` when the baseline holds another metric or
 * another arm than the one the tolerance compares.
 * @example
 * ```ts
 * const results = analyse(state, state.runs.filter((run) => run.status !== "stopped").map((run) => readRun(run.directory, metrics)));
 * console.log(results.pass?.verdict);
 * ```
 *
 * @public
 */
export function analyse(state: ExperimentState, facts: readonly RunFacts[], baseline?: NoiseFloor): ExperimentResults {
	const { spec } = state;
	const open = openRuns(spec, state.runs).length;
	if (open > 0) throw analysisTooEarly(open);
	if (facts.length > 0) checkMetrics(spec, [...new Set(facts.flatMap((run) => Object.keys(run.values)))], false);
	const rows = state.runs.map((record): Row => {
		const { arm, seed, replicate } = record.planned;
		const found = facts.find((run) => run.arm === arm && run.seed === seed && run.replicate === replicate);
		return { record, run: found?.run ?? `${arm}-s${seed}-r${replicate}`, facts: found };
	});
	const [pass, tolerance] = [passOf(spec, rows), toleranceOf(spec, rows, baseline)];
	return parseExperimentResults({
		format: "swarmtales-results",
		version: 1,
		spec: { id: spec.id, hash: state.specHash },
		code: state.code ?? { commit: "unknown", kernelRevision: 1 },
		runs: rows.map(({ record, run, facts: read }) => ({ run, arm: record.planned.arm, seed: record.planned.seed, replicate: record.planned.replicate, manifestHash: read?.manifestHash ?? "", head: read?.head ?? "", status: record.status, ...(record.reason === undefined ? {} : { reason: record.reason }), costUsd: record.costUsd })),
		values: rows.flatMap(({ run, facts: read }) => (read === undefined ? [] : specMetrics(spec).map((metric) => ({ run, metric, value: read.values[metric] ?? "absent" })))),
		estimates: estimatesOf(spec, rows),
		...(pass === undefined ? {} : { pass }),
		guardrails: guardrailsOf(spec, rows),
		...(tolerance === undefined ? {} : { tolerance }),
		deviations: deviationsOf(spec, rows),
	});
}
