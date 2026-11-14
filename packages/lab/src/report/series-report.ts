// SPDX-License-Identifier: Apache-2.0
/**
 * `README.md` of a series: the plan from the spec, and every number from the results of the analysis.
 */
import type { ExperimentResults } from "../experiment/results.ts";
import type { ExperimentSpec } from "../experiment/spec.ts";
import { mean } from "../stats/summary.ts";
import { ABSENT, code, section, shown, table } from "./format.ts";

const VERDICTS = { kept: "kept", "not-kept": "not kept", "no-verdict": "no verdict" } as const;

function plan(results: ExperimentResults, spec: ExperimentSpec): readonly string[] {
	const arms = spec.arms.map((arm) => `${code(arm.id)}${arm.control === true ? " (control)" : ""} \`${JSON.stringify(arm.params)}\``);
	const model = `${spec.model.provider} ${code(spec.model.id)}${spec.model.thinking === undefined ? "" : `, thinking ${spec.model.thinking}`}`;
	return [
		`- Purpose: ${spec.purpose}; design: ${spec.design}`,
		`- Game: ${code(spec.game)}; model: ${model}`,
		`- Arms: ${arms.join("; ")}`,
		`- Seeds: ${spec.seeds.join(", ")}; replicates: ${spec.replicates}`,
		`- Primary metric: ${code(spec.metrics.primary)}; secondary: ${spec.metrics.secondary.map((metric) => code(metric)).join(", ") || "none"}`,
		`- Exclusions: ${spec.exclusions.join(", ") || "none"}`,
		`- Budget: ${spec.budget.perRunUsd} USD per run, ${spec.budget.totalUsd} USD in total`,
		`- Spec hash: ${code(results.spec.hash)}; code: commit ${code(results.code.commit)}, runtime revision ${results.code.kernelRevision}`,
	];
}

function runs(results: ExperimentResults): readonly string[] {
	const rows = results.runs.map((run) => [code(run.run), code(run.arm), String(run.seed), String(run.replicate), run.status, run.reason ?? "", shown(run.costUsd), code(run.head, 12)]);
	return table(["Run", "Arm", "Seed", "Replicate", "Status", "Reason", "Cost (USD)", "Signed head"], rows, "no run");
}

// The mean of every metric over the included runs of each arm. An arm without a number for a metric (it does not
// export it, or no run measured it) reads "absent".
function armMeans(results: ExperimentResults, spec: ExperimentSpec): readonly string[] {
	const metrics = [...new Set([spec.metrics.primary, ...spec.metrics.secondary, ...results.values.map((row) => row.metric)])];
	const rows = metrics.map((metric) => [
		code(metric),
		...spec.arms.map((arm) => {
			const included = new Set(results.runs.filter((run) => run.arm === arm.id && run.status === "included").map((run) => run.run));
			const numbers = results.values.flatMap((row) => (row.metric === metric && included.has(row.run) && typeof row.value === "number" ? [row.value] : []));
			return numbers.length === 0 ? ABSENT : `${shown(mean(numbers))} (n ${numbers.length})`;
		}),
	]);
	return table(["Metric", ...spec.arms.map((arm) => code(arm.id))], rows, "no metric");
}

// One row per metric of the spec and set of runs; an estimate the analysis could not compute reads "absent".
function estimates(results: ExperimentResults, spec: ExperimentSpec): readonly string[] {
	const rows = [spec.metrics.primary, ...spec.metrics.secondary].flatMap((metric, index) =>
		(["included", "finished"] as const).map((over) => {
			const found = results.estimates.find((estimate) => estimate.metric === metric && estimate.over === over);
			const head = [code(metric), index === 0 ? "primary" : "secondary", over];
			if (found === undefined) return [...head, ABSENT, ABSENT, ABSENT, ABSENT, ABSENT, ""];
			return [...head, shown(found.estimate), shown(found.se), `${shown(found.interval[0])} to ${shown(found.interval[1])}`, String(found.n), shown(found.p), `${found.estimator}; ${found.test}`];
		}),
	);
	return table(["Metric", "Role", "Over", "Estimate", "SE", "95 % interval", "n", "p", "Estimator and test"], rows, "no metric");
}

// The verdict is read from its own field: a result without a verdict prints no estimate, whatever number it carries.
function pass(results: ExperimentResults): readonly string[] {
	if (results.pass === undefined) return ["none: the experiment is reported, not gated"];
	const { rule, verdict, estimate, n } = results.pass;
	const read = verdict === "no-verdict" ? `n ${n}` : `estimate ${shown(estimate)}, n ${n}`;
	return [`- Rule: ${rule}`, `- Verdict: **${VERDICTS[verdict]}** (${read})`];
}

function tolerance(results: ExperimentResults): readonly string[] {
	const found = results.tolerance;
	if (found === undefined) return ["none: no baseline was compared"];
	const what = found.kind === "mean" ? "mean" : "share";
	return [
		`The ${what} of the new runs is ${shown(found.newMean)}, of the baseline ${shown(found.baselineMean)}: a difference of ${shown(found.difference)} with a standard error of ${shown(found.se)}.`,
		`**${found.within ? "Within" : "Outside"}** the noise of the baseline.`,
	];
}

/**
 * Renders `README.md` of a series: the plan, the run table, the means by arm, the estimates, the pass rule, the
 * guardrails, the tolerance and the deviations.
 *
 * @remarks
 * Pure: results and spec in, Markdown out. No number is typed: each comes from `results`, or is the mean of
 * values of `results`. A metric that an arm does not export reads `absent` in the column of that arm, an estimate
 * that could not be computed reads `absent`, and a pass rule without a verdict prints its n and no estimate (the table of the estimates has the number when there is one).
 *
 * @param results - The results of the analysis (`analyse`).
 * @param spec - The spec of the experiment the results belong to.
 * @returns The Markdown text, ending with a line break.
 * @example
 * ```ts
 * writeFileSync(join(directory, "README.md"), renderSeriesReport(analyse(state, facts), state.spec));
 * ```
 *
 * @public
 */
export function renderSeriesReport(results: ExperimentResults, spec: ExperimentSpec): string {
	const guardrails = results.guardrails.map((row) => [code(row.metric), row.per === undefined ? "" : code(row.per), code(row.arm), shown(row.value), row.held ? "held" : "not held"]);
	const deviations = results.deviations.map((row) => [row.at, row.what, row.why]);
	return [
		`# Experiment ${spec.id}`,
		"",
		spec.question,
		...section("## Plan", plan(results, spec)),
		...section("## Runs", runs(results)),
		...section("## Means by arm (included runs)", armMeans(results, spec)),
		...section("## Estimates", estimates(results, spec)),
		...section("## Pass rule", pass(results)),
		...section("## Guardrails", table(["Metric", "Per", "Arm", "Mean", "Result"], guardrails, "none")),
		...section("## Tolerance", tolerance(results)),
		...section("## Deviations", table(["At", "What", "Why"], deviations, "none")),
		"",
	].join("\n");
}
