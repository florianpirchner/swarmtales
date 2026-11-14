// SPDX-License-Identifier: Apache-2.0
/**
 * The analysis of an experiment on hand tables: the pass rule gives kept, not kept and no verdict; the estimate
 * over every finished run stands beside the gated one; a metric of one arm only is "absent"; guardrails and the
 * tolerance are reported; an analysis before every planned run has a status is refused.
 */
import { jsonHash } from "@swarmtales/chain";
import { SwtError } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { analyse, type ExperimentSpec, type ExperimentState, type FactValue, type NoiseFloor, planRuns, type RunFacts, type RunRecord, summarize } from "../src/index.ts";

const BASE: ExperimentSpec = {
	format: "swarmtales-experiment", version: 1, id: "toy", question: "Does it?", purpose: "pilot", game: "games/toy/game.ts", model: { provider: "anthropic", id: "haiku" },
	arms: [{ id: "control", params: {}, control: true }, { id: "open", params: { open: true } }],
	seeds: [1, 2, 3], replicates: 1, design: "paired",
	metrics: {
		primary: "toy.score", secondary: ["brain.writes"],
		guardrails: [{ metric: "models.costUsd", arm: "open", max: 0.02 }, { metric: "models.requests", per: "toy.decisions", within: { of: 1.3, share: 0.1 } }],
	},
	allowedRefusals: ["TOOL_LOCKED"], exclusions: ["error-end"],
	budget: { perRunUsd: 0.1, totalUsd: 1, estimateUsdPerRun: {} },
};
const SPEC: ExperimentSpec = { ...BASE, pass: { contrast: ["open", "control"], sign: "positive", minN: 3 } };
type Cell = readonly [arm: string, seed: number, score: FactValue, status?: RunRecord["status"], replicate?: number];

/** A state and the facts of its runs from a hand table; the open arm alone has a brain, and it asks more often. */
function table(spec: ExperimentSpec, cells: readonly Cell[]): { state: ExperimentState; facts: RunFacts[] } {
	const plan = planRuns(spec);
	const runs = cells.map(([arm, seed, , status = "included", replicate = 0]): RunRecord => {
		const index = plan.findIndex((run) => run.arm === arm && run.seed === seed && run.replicate === replicate % 100);
		const replaced = replicate >= 100 ? { replaces: index } : {};
		return { planned: { index: index + (replicate >= 100 ? plan.length : 0), arm, seed, replicate, params: {} }, directory: `runs/${arm}-${seed}-${replicate}`, status, costUsd: 0.01, ...(status === "included" ? {} : { reason: "error-end" }), ...replaced };
	});
	const facts = cells.filter(([, , , status]) => status !== "stopped").map(([arm, seed, score, , replicate = 0]): RunFacts => {
		const open = arm === "open";
		const values = { "toy.score": score, "toy.decisions": 10, "models.requests": open ? 20 : 13, "models.costUsd": 0.01, "run.refusals.TOOL_LOCKED": 2, ...(open ? { "brain.writes": seed, "run.refusals.STEP_LIMIT": 3 } : {}) };
		return { run: `${arm}-${seed}-${replicate}`, manifestHash: "m", head: "h", game: "toy", seed, replicate, arm, end: { reason: "ticks", tick: 9 }, values };
	});
	return { state: { spec, specHash: jsonHash(spec), runs, spentUsd: 0.01 * runs.length, code: { commit: "c0ffee", kernelRevision: 3 } }, facts };
}
const results = (spec: ExperimentSpec, cells: readonly Cell[], baseline?: NoiseFloor) => {
	const { state, facts } = table(spec, cells);
	return analyse(state, facts, baseline);
};
const CONTROL: readonly Cell[] = [["control", 1, 10], ["control", 2, 20], ["control", 3, 30]];

describe("analyse", () => {
	it("keeps the sign on a hand table, with the paired estimate, its standard error and the exact sign-flip p", () => {
		const kept = results(SPEC, [...CONTROL, ["open", 1, 15], ["open", 2, 23], ["open", 3, 31]]);
		expect(kept.pass).toMatchObject({ estimate: 3, n: 3, verdict: "kept" });
		expect(kept.estimates).toHaveLength(2);
		expect(kept.estimates[0]).toMatchObject({ metric: "toy.score", role: "primary", contrast: ["open", "control"], estimate: 3, n: 3, p: 0.25, test: "sign-flip exact", over: "included" });
		expect(kept.estimates[0]?.se).toBeCloseTo(2 / Math.sqrt(3));
		expect(kept.estimates[1]).toEqual({ ...kept.estimates[0], over: "finished" });
		expect([kept.spec, kept.code, kept.runs.length, kept.deviations]).toEqual([{ id: "toy", hash: jsonHash(SPEC) }, { commit: "c0ffee", kernelRevision: 3 }, 6, []]);
	});

	it("does not keep a sign that turned, and at exactly 0", () => {
		expect(results(SPEC, [...CONTROL, ["open", 1, 5], ["open", 2, 17], ["open", 3, 29]]).pass).toMatchObject({ estimate: -3, verdict: "not-kept" });
		expect(results(SPEC, [...CONTROL, ["open", 1, 11], ["open", 2, 20], ["open", 3, 29]]).pass).toMatchObject({ estimate: 0, verdict: "not-kept" });
		expect(results({ ...SPEC, pass: { contrast: ["open", "control"], sign: "negative", minN: 3 } }, [...CONTROL, ["open", 1, 5], ["open", 2, 17], ["open", 3, 29]]).pass?.verdict).toBe("kept");
	});

	it("gives no verdict below the smallest n, and reports the estimate over every finished run beside it", () => {
		const cells: readonly Cell[] = [...CONTROL, ["open", 1, 15], ["open", 2, 23], ["open", 3, 40, "excluded"], ["open", 3, 0, "stopped", 100]];
		const short = results(SPEC, cells);
		expect(short.pass).toMatchObject({ estimate: 4, n: 2, verdict: "no-verdict" });
		expect(short.estimates.filter((row) => row.role === "primary").map((row) => [row.over, row.n, row.estimate])).toEqual([["included", 2, 4], ["finished", 3, 6]]);
		expect(short.runs.map((run) => run.status).slice(-2)).toEqual(["excluded", "stopped"]);
		expect(short.deviations).toEqual([{ at: "open-3-0", what: "the run is excluded", why: "error-end" }, { at: "open-s3-r100", what: "the run is stopped, and it was the one replacement", why: "error-end" }]);
		const none = results(SPEC, [...CONTROL, ["open", 1, 15], ["open", 2, "absent"], ["open", 3, "absent"]]);
		expect([none.pass?.verdict, none.pass?.estimate, none.pass?.n, none.estimates]).toEqual(["no-verdict", "absent", 1, []]);
		expect(none.pass?.rule).not.toContain("reads 0");
	});

	it("reads a metric of one arm as absent, and refuses a metric no run has (E010)", () => {
		const { state, facts } = table(SPEC, [...CONTROL, ["open", 1, 15], ["open", 2, 23], ["open", 3, 31]]);
		const read = analyse(state, facts);
		expect(read.values.filter((row) => row.metric === "brain.writes").map((row) => row.value)).toEqual(["absent", "absent", "absent", 1, 2, 3]);
		expect(read.estimates.some((row) => row.metric === "brain.writes")).toBe(false);
		expect(() => analyse({ ...state, spec: { ...SPEC, metrics: { ...SPEC.metrics, secondary: ["brain.reads"] } } }, facts)).toThrow(/SWT-E010.*"brain\.reads"/);
	});

	it("reports guardrails per arm and a refusal code that is not allowed; they never change the verdict", () => {
		const read = results(SPEC, [...CONTROL, ["open", 1, 15], ["open", 2, 23], ["open", 3, 31]]);
		expect(read.guardrails).toEqual([
			{ metric: "models.costUsd", arm: "open", value: 0.01, held: true },
			{ metric: "models.requests", per: "toy.decisions", arm: "control", value: 1.3, held: true },
			{ metric: "models.requests", per: "toy.decisions", arm: "open", value: 2, held: false },
			{ metric: "run.refusals.STEP_LIMIT", arm: "open", value: 3, held: false },
		]);
		expect(read.pass?.verdict).toBe("kept");
	});

	it("summarizes a replicates design and compares it with the noise floor; unpaired arms get a permutation p", () => {
		const spec: ExperimentSpec = { ...BASE, arms: [{ id: "control", params: {}, control: true }], design: "replicates", metrics: { ...SPEC.metrics, secondary: [] }, tolerance: { kind: "mean" } };
		const floor = (values: readonly number[]): NoiseFloor => ({ format: "swarmtales-noise-floor", version: 1, game: "toy", arm: "control", seed: 1, metric: "toy.score", platform: "legacy", kernelRevision: 2, values: [...values], summary: summarize(values), guardrails: {} });
		const near = results(spec, CONTROL, floor([12, 22, 26]));
		expect(near.estimates[0]).toMatchObject({ contrast: ["control"], estimator: "mean of the arm", estimate: 20, n: 3, test: "none" });
		expect([near.pass, near.tolerance]).toEqual([undefined, expect.objectContaining({ kind: "mean", baselineMean: 20, newMean: 20, within: true })]);
		expect(results(spec, CONTROL, floor([80, 90, 100])).tolerance?.within).toBe(false);
		const share = results({ ...spec, tolerance: { kind: "share", threshold: 20 } }, CONTROL, floor([20, 20, 20, 20, 5]));
		expect(share.tolerance).toMatchObject({ kind: "share", baselineMean: 0.8, within: true });
		const unpaired = results({ ...SPEC, design: "unpaired" }, [...CONTROL, ["open", 1, 31], ["open", 2, 41], ["open", 3, 51]]);
		expect(unpaired.estimates[0]).toMatchObject({ estimate: 21, n: 6, test: "label-permutation exact", p: 0.1 });
		expect(unpaired.pass).toMatchObject({ n: 3, verdict: "kept" });
	});

	it("B6: an included run without a value of the primary metric is a deviation, not a silent smaller n", () => {
		const read = results(SPEC, [...CONTROL, ["open", 1, 15], ["open", 2, 23], ["open", 3, "absent"]]);
		expect([read.pass?.n, read.pass?.verdict]).toEqual([2, "no-verdict"]);
		expect(read.deviations).toEqual([{ at: "open-3-0", what: "the run is included and has no value of toy.score", why: "the metric is absent in the run, or the facts of the run were not read; the run is left out of the estimates" }]);
		const { state, facts } = table(SPEC, [...CONTROL, ["open", 1, 15], ["open", 2, 23], ["open", 3, 31]]);
		expect(analyse(state, facts.slice(0, 5)).deviations.map((row) => row.at)).toEqual(["open-s3-r0"]);
	});

	it("B7: a noise floor of another metric or another arm is refused (E001), not compared", () => {
		const spec: ExperimentSpec = { ...BASE, arms: [{ id: "control", params: {}, control: true }], design: "replicates", metrics: { ...SPEC.metrics, secondary: [] }, tolerance: { kind: "mean" } };
		const floor: NoiseFloor = { format: "swarmtales-noise-floor", version: 1, game: "toy", arm: "control", seed: 1, metric: "toy.score", platform: "legacy", kernelRevision: 2, values: [12, 22, 26], summary: summarize([12, 22, 26]), guardrails: {} };
		expect(results(spec, CONTROL, floor).tolerance?.within).toBe(true);
		expect(() => results(spec, CONTROL, { ...floor, metric: "toy.decisions" })).toThrow(/SWT-E001.*toy\.decisions/);
		expect(() => results(spec, CONTROL, { ...floor, arm: "open" })).toThrow(/SWT-E001.*"open"/);
	});

	it("B13: a pass rule over a design without a contrast gives no verdict, not the sign of one arm's mean", () => {
		const cells: readonly Cell[] = [...CONTROL, ["open", 1, 5], ["open", 2, 7], ["open", 3, 9]];
		const lone = results({ ...SPEC, design: "replicates" }, cells);
		expect(lone.estimates[0]).toMatchObject({ contrast: ["control"], estimate: 20 });
		expect(lone.pass).toMatchObject({ verdict: "no-verdict", n: 0 });
		expect(lone.pass?.rule).toContain("the design replicates has no contrast");
		expect(results({ ...SPEC, design: "unpaired" }, cells).pass).toMatchObject({ estimate: -13, verdict: "not-kept" });
	});

	// Finding B8 (open): a seed listed twice, or 100 replicates and more, share one cell key, and the later run replaces the earlier one without a word.
	it.fails("B8: a spec with a seed listed twice is refused, or both runs of the seed count", () => {
		const twice = results({ ...SPEC, seeds: [1, 1, 2], pass: { contrast: ["open", "control"], sign: "positive", minN: 2 } }, [["control", 1, 10], ["control", 1, 20], ["control", 2, 30], ["open", 1, 11], ["open", 1, 21], ["open", 2, 31]]);
		expect(twice.pass?.n).toBe(3);
	});

	it("refuses an analysis before every planned run, and the replacement of an excluded one, has a status (E011)", () => {
		const { state, facts } = table(SPEC, [...CONTROL, ["open", 1, 15], ["open", 2, 23], ["open", 3, 31, "excluded"]]);
		const code = (run: () => unknown): string => {
			try {
				run();
			} catch (error) {
				return error instanceof SwtError ? `${error.code} ${error.message}` : String(error);
			}
			return "no error";
		};
		expect(code(() => analyse(state, facts))).toMatch(/^SWT-E011 .*1 planned runs/);
		expect(code(() => analyse({ ...state, runs: state.runs.slice(0, 3) }, facts))).toMatch(/^SWT-E011 .*3 planned runs/);
	});
});
