// SPDX-License-Identifier: Apache-2.0
/** The lab base: the schemas, the `E` catalogue, and the committed rerun plan of the M2 gate (specs, baselines, ledger). */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { SwtError, SwtIssueSchema } from "@swarmtales/contracts";
import * as errors from "../src/errors.ts";
import * as lab from "../src/index.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const json = (path: string): unknown => JSON.parse(readFileSync(join(ROOT, path), "utf8"));
// The games of the M2 gate; the specs of M4 have their own test (`apps/cli/test/experiment-plan.test.ts`).
const SPEC_FILES = ["econ-lab", "quarry"].flatMap((game) => {
	try {
		return readdirSync(join(ROOT, "games", game, "experiments")).map((name) => `games/${game}/experiments/${name}`);
	} catch {
		return [];
	}
});
const specs = new Map(SPEC_FILES.map((file) => [file, lab.parseExperimentSpec(json(file), file)]));
const spec = (file: string): lab.ExperimentSpec => {
	const found = specs.get(file);
	if (found === undefined) throw new Error(`no spec ${file}`);
	return found;
};
const OPEN = "games/quarry/experiments/open-quarries.json";
const BRAIN = "games/econ-lab/experiments/brain.json";
const FROZEN = "games/quarry/experiments/open-quarries-frozen.json";

/** Runs the code and returns the code of the `SwtError` it throws. */
function codeOf(run: () => unknown): string | undefined {
	try {
		run();
	} catch (error) {
		return error instanceof SwtError ? error.code : "not an SwtError";
	}
	return undefined;
}

/**
 * The metric keys of section 7.3 (the heads of issue 15) and the generic keys of 6.1. Until the heads exist this
 * list stands in for them; issue 22 checks the specs against the loaded heads (`SWT-E010`).
 */
const METRICS = new Set([
	...["tablePoints", "sharedLanes", "decisions", "missedPicks"].map((id) => `draft-rounds.${id}`),
	...["dilemmaCooperation", "dilemmaRound1", "fundCooperation", "tablePoints", "decisions", "missedDecisions"].map((id) => `econ-games.${id}`),
	"strategy-brain.brainWrites", "models.requests", "models.costUsd",
]);

describe("the committed plan", () => {
	it("has the four specs of the gate and the two series of decision A29, and each one parses", () => {
		expect([...specs.keys()].sort()).toEqual(["games/econ-lab/experiments/brain-no-results.json", BRAIN, "games/econ-lab/experiments/noise-floor.json", "games/quarry/experiments/noise-floor.json", FROZEN, OPEN]);
	});

	it("A29: the frozen series is the gate's quarry series in small, with the open arm frozen and no pass rule", () => {
		const [frozen, open] = [spec(FROZEN), spec(OPEN)];
		expect(frozen).toMatchObject({ purpose: "exploratory", design: open.design, seeds: open.seeds.slice(0, 6), replicates: 1, model: open.model, exclusions: open.exclusions, allowedRefusals: open.allowedRefusals });
		expect(frozen.pass).toBeUndefined();
		expect(frozen.arms).toEqual([{ id: "control", params: {}, control: true }, { id: "open-frozen", params: { openHands: true, frozenHands: true } }]);
		expect(frozen.metrics).toEqual({ ...open.metrics, guardrails: open.metrics.guardrails.map((rail) => (rail.arm === "open" ? { ...rail, arm: "open-frozen" } : rail)) });
		expect(frozen.budget).toEqual({ perRunUsd: open.budget.perRunUsd, totalUsd: 0.6, estimateUsdPerRun: { control: 0.0344, "open-frozen": 0.0417 } });
	});

	it("names only metrics of section 7.3 and 6.1, and only its own arms", () => {
		for (const [file, { metrics, arms, budget, pass }] of specs) {
			const used = [metrics.primary, ...metrics.secondary, ...metrics.guardrails.flatMap((rail) => [rail.metric, ...(rail.per === undefined ? [] : [rail.per])])];
			expect(used.filter((key) => !METRICS.has(key)), file).toEqual([]);
			const ids = arms.map((arm) => arm.id);
			expect(Object.keys(budget.estimateUsdPerRun), file).toEqual(ids);
			expect([...(pass?.contrast ?? []), ...metrics.guardrails.flatMap((rail) => (rail.arm === undefined ? [] : [rail.arm]))].filter((arm) => !ids.includes(arm)), file).toEqual([]);
		}
	});

	it("B10: the rule missed-decision can see a missed decision of each game: its metric has the name the rule looks for", () => {
		for (const [file, { metrics, exclusions }] of specs) {
			expect(exclusions, file).toContain("missed-decision");
			const missed = metrics.guardrails.map((rail) => rail.metric).filter((key) => /\.missed[A-Z]\w*$/.test(key));
			expect(missed.filter((key) => METRICS.has(key)), file).toHaveLength(1);
		}
	});

	it("holds the two effects of section 8.1 and the caps of 8.4", () => {
		expect(spec(OPEN)).toMatchObject({ purpose: "confirmatory", design: "paired", seeds: [31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79], replicates: 1, pass: { contrast: ["open", "control"], sign: "positive", minN: 10 } });
		expect(spec(OPEN).arms).toEqual([{ id: "control", params: {}, control: true }, { id: "open", params: { openHands: true } }]);
		expect(spec(BRAIN)).toMatchObject({ purpose: "confirmatory", design: "unpaired", seeds: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52], replicates: 1, pass: { contrast: ["brain", "nobrain"], sign: "negative", minN: 10 } });
		expect(spec(BRAIN).arms).toEqual([{ id: "nobrain", params: { brain: false }, control: true }, { id: "brain", params: {} }]);
		const estimate = ({ arms, seeds, replicates, budget }: lab.ExperimentSpec): string => (arms.reduce((sum, arm) => sum + (budget.estimateUsdPerRun[arm.id] ?? Number.NaN), 0) * seeds.length * replicates).toFixed(2);
		expect(SPEC_FILES.map((file) => [spec(file).id, estimate(spec(file)), spec(file).budget.totalUsd, spec(file).budget.perRunUsd, spec(file).concurrency])).toEqual([
			["econ-lab-brain-no-results", "0.20", 0.4, 0.05, 2], ["econ-lab-brain", "0.40", 0.75, 0.05, 2], ["econ-lab-noise-floor", "0.06", 0.25, 0.05, 2], ["quarry-noise-floor", "0.17", 0.5, 0.1, 2], ["quarry-open-quarries-frozen", "0.46", 0.6, 0.1, 2], ["quarry-open-quarries", "0.91", 1.5, 0.1, 2],
		]);
		const ledger = readFileSync(join(ROOT, "games/m2-ledger.jsonl"), "utf8").split("\n");
		expect(JSON.parse(ledger[0] ?? "")).toEqual({ capUsd: 4 });
		expect([...specs.values()].reduce((sum, { budget }) => sum + budget.totalUsd, 0)).toBeLessThanOrEqual(4);
	});

	it("refuses a spec with an unknown key, at every level, as SWT-E001", () => {
		const good = json(OPEN);
		expect(codeOf(() => lab.parseExperimentSpec(good))).toBeUndefined();
		const broken: readonly unknown[] = [
			{ ...spec(OPEN), preregistration: "x" },
			{ ...spec(OPEN), budget: { ...spec(OPEN).budget, capUsd: 1 } },
			{ ...spec(OPEN), arms: [{ id: "a", params: {}, treatment: true }] },
			{ ...spec(OPEN), metrics: { ...spec(OPEN).metrics, guardrails: [{ metric: "models.costUsd", most: 1 }] } },
			{ ...spec(OPEN), seeds: [] },
			"text",
		];
		expect(broken.map((value) => codeOf(() => lab.parseExperimentSpec(value, "x.json")))).toEqual(broken.map(() => "SWT-E001"));
		let message = "";
		try {
			lab.parseExperimentSpec(broken[0], "x.json");
		} catch (error) {
			message = String(error);
		}
		expect(message).toContain("x.json");
		expect(message).toContain("preregistration");
	});
});

describe("the legacy baselines", () => {
	// The numbers are those of `stories/<game>/runs/noise-floor.json` of the old platform (branch `m0/noise-floor`,
	// commit 48ddf0a), block `control`. The line of each number in that file is given beside it.
	const SOURCE = [
		{
			file: "games/quarry/noise-floor.legacy.json", game: "quarry", arm: "control", seed: 31 /* line 11 */, metric: "draft-rounds.tablePoints", kernelRevision: 2 /* line 167 */,
			values: [1080, 1163, 1109, 1033, 1021] /* lines 23-27 */, mean: 1081.2 /* line 29 */, sd: 57.9068217052188 /* line 30 */,
			rails: { "models.requests per draft-rounds.decisions": 1.2972222222222223 /* line 78 */, "models.costUsd": 0.034390152 /* line 102 */ },
		},
		{
			file: "games/econ-lab/noise-floor.legacy.json", game: "econ-lab", arm: "nobrain", seed: 41 /* line 11 */, metric: "econ-games.dilemmaCooperation", kernelRevision: 2 /* line 215 */,
			values: [1, 1, 1, 1, 0.35] /* lines 23-27 */, mean: 0.8699999999999999 /* line 29 */, sd: 0.2906888370749727 /* line 30 */,
			rails: { "models.requests per econ-games.decisions": 1.3194444444444444 /* line 126 */, "models.costUsd": 0.012333016999999998 /* line 150 */ },
		},
	];

	it.each(SOURCE)("$file parses and equals its source", (source) => {
		const floor = lab.parseNoiseFloor(json(source.file), source.file);
		expect(floor).toMatchObject({ game: source.game, arm: source.arm, seed: source.seed, metric: source.metric, platform: "legacy", kernelRevision: source.kernelRevision, values: source.values });
		expect(floor.summary).toMatchObject({ n: 5, mean: source.mean, sd: source.sd, min: Math.min(...source.values), max: Math.max(...source.values) });
		expect(floor.values.reduce((sum, value) => sum + value, 0) / floor.values.length).toBeCloseTo(floor.summary.mean, 12);
		expect(Object.fromEntries(Object.entries(floor.guardrails).map(([name, summary]) => [name, summary.mean]))).toEqual(source.rails);
		const user = [...specs.values()].find((candidate) => candidate.baseline === source.file);
		expect(user).toMatchObject({ design: "replicates", seeds: [floor.seed], replicates: 5, arms: [{ id: floor.arm }], metrics: { primary: floor.metric } });
		expect(codeOf(() => lab.parseNoiseFloor({ ...floor, note: "x" }))).toBe("SWT-E001");
	});
});

describe("the E catalogue and the results schema", () => {
	it("gives every code a valid issue", () => {
		const thrown = [
			errors.badFile("experiment spec", "/x is unknown"), errors.unknownParam("open", "openHand", ["openHands"]), errors.estimateAboveCap(2, 1.5), errors.capReached(1.2, 0.4, 0.4, 1.5),
			errors.notComparable("a", "b", "kernel.revision"), errors.badRunFolder("runs/a", "has no end event"), errors.seriesBroken("a run reported a leak"),
			errors.unknownMetric("draft-rounds.points", ["draft-rounds.tablePoints"]), errors.analysisTooEarly(3),
		];
		expect(thrown.map((error) => error.code)).toEqual(["SWT-E001", "SWT-E002", "SWT-E003", "SWT-E004", "SWT-E005", "SWT-E006", "SWT-E007", "SWT-E010", "SWT-E011"]);
		for (const error of thrown) {
			expect(error).toBeInstanceOf(lab.LabError);
			expect(error.issues.every((issue) => Check(SwtIssueSchema, issue))).toBe(true);
		}
	});

	it("accepts a results file with an absent value and refuses an unknown key", () => {
		const results = {
			format: "swarmtales-results", version: 1, spec: { id: "quarry-open-quarries", hash: "h" }, code: { commit: "c", kernelRevision: 3 },
			runs: [{ run: "r1", arm: "open", seed: 31, replicate: 0, manifestHash: "m", head: "h", status: "excluded", reason: "cost-cap", costUsd: 0.4 }],
			values: [{ run: "r1", metric: "draft-rounds.tablePoints", value: "absent" }],
			estimates: [{ metric: "draft-rounds.tablePoints", role: "primary", contrast: ["open", "control"], estimator: "mean of paired differences", estimate: 12.5, se: 20, interval: [-31, 56], n: 11, test: "sign-flip", p: 0.5, over: "included" }],
			pass: { rule: "open minus control is positive", estimate: 12.5, n: 11, verdict: "kept" },
			guardrails: [{ metric: "models.requests", per: "draft-rounds.decisions", arm: "open", value: 1.3, held: true }],
			tolerance: { kind: "mean", baselineMean: 1081.2, newMean: 1100, difference: 18.8, se: 37, within: true },
			deviations: [],
		};
		expect(lab.parseExperimentResults(results).values[0]?.value).toBe("absent");
		expect(codeOf(() => lab.parseExperimentResults({ ...results, judging: {} }))).toBe("SWT-E001");
		expect(codeOf(() => lab.parseExperimentResults({ ...results, values: [{ run: "r1", metric: "m", value: null }] }))).toBe("SWT-E001");
	});
});
