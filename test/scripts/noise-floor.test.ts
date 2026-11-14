import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { GAMES, bootstrapMean95, noiseFloor, readRun, renderNoiseFloor, sd, summarize, t95 } from "../../scripts/noise-floor-stats.ts";

const root = mkdtempSync(join(tmpdir(), "noise-floor-"));
afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

interface FixtureRun {
	readonly story: string;
	readonly seed: number;
	readonly replicate?: number;
	readonly runtime?: number;
	/** The lines of the game; `request` lines are added. */
	readonly lines: readonly object[];
	readonly requests: number;
	readonly costUsd: number;
}

/** Writes a run folder with the three files the analysis reads. */
function writeRun(series: string, run: FixtureRun): string {
	const folder = `${run.story}-${String(run.seed)}${run.replicate === undefined ? "" : `-rep${String(run.replicate)}`}`;
	const directory = join(root, series, folder, "run");
	mkdirSync(directory, { recursive: true });
	const requests = Array.from({ length: run.requests }, () => ({ type: "request", agent: "A01" }));
	writeFileSync(join(directory, "events.jsonl"), [...requests, ...run.lines].map((line, seq) => JSON.stringify({ ...line, seq })).join("\n") + "\n");
	writeFileSync(join(directory, "usage.json"), JSON.stringify({ totals: { requests: run.requests, costUsd: run.costUsd } }));
	const genesis = { story: run.story, storyHash: "abc", seed: run.seed, commit: "c0ffee", models: { residents: "fixture/model" }, ...(run.runtime === undefined ? {} : { runtime: run.runtime }) };
	writeFileSync(join(directory, "events.chain.jsonl"), `${JSON.stringify({ kind: "genesis", seq: 0, genesis })}\n`);
	return folder;
}

/** A quarry match of four picks whose table scores `points`. */
function quarry(story: string, seed: number, points: number, extra: Partial<FixtureRun> = {}): FixtureRun {
	const pick = (missed: boolean) => ({ type: "draft_card_picked", missed });
	return {
		story,
		seed,
		requests: 6,
		costUsd: 0.03,
		lines: [pick(false), pick(false), pick(false), pick(false), { type: "draft_game_scored", reference: { sharedLanes: 2 } }, { type: "draft_match_ended", scores: { A01: points - 100, A02: 100 } }],
		...extra,
	};
}

function econ(story: string, seed: number, cooperation: number): FixtureRun {
	const decision = { type: "decision_made" };
	const scored = (game: string, value: number, missed: number) => ({ type: "block_scored", game, reference: { cooperation: value, perRound: [1, value], missed } });
	return { story, seed, requests: 3, costUsd: 0.01, lines: [decision, decision, scored("ultimatum", 1, 0), scored("public-goods", 0.2, 1), scored("dilemma", cooperation, 0), { type: "match_ended", scores: { A01: 100, A02: 50 } }] };
}

describe("noise floor statistics", () => {
	it("summarizes values with the sample standard deviation and a t interval", () => {
		const summary = summarize([2, 4, 4, 4, 5, 5, 7, 9]);
		expect(summary.mean).toBe(5);
		expect(summary.sd).toBeCloseTo(2.138, 3);
		expect(summary.range).toBe(7);
		expect(summary.se).toBeCloseTo(2.138 / Math.sqrt(8), 3);
		expect(summary.t95[0]).toBeCloseTo(5 - 2.365 * summary.se, 6);
		expect(sd([3])).toBe(0);
		expect(t95(4)).toBe(2.776);
		expect(t95(1000)).toBe(2.042);
	});

	it("gives the same bootstrap interval for the same values, inside their range", () => {
		const values = [1003, 950, 990, 1020, 940];
		const [low, high] = bootstrapMean95(values);
		expect(bootstrapMean95(values)).toEqual([low, high]);
		expect(low).toBeGreaterThanOrEqual(940);
		expect(high).toBeLessThanOrEqual(1020);
		expect(low).toBeLessThan(980.6);
		expect(high).toBeGreaterThan(980.6);
		expect(bootstrapMean95([5, 5, 5])).toEqual([5, 5]);
	});
});

describe("noise floor of a series", () => {
	const points = [1000, 1010, 990, 1020, 980];
	points.forEach((value, index) => writeRun("replicates", quarry("quarry", 31, value, { replicate: index + 1, runtime: 2, ...(index === 0 ? { lines: [...quarry("quarry", 31, value).lines, { type: "draft_card_picked", missed: true }, { type: "turn_error" }] } : {}) })));
	[1100, 1120, 1080].forEach((value, index) => writeRun("replicates", quarry("quarry-open", 31, value, { replicate: index + 1, runtime: 2 })));
	writeRun("replicates", quarry("quarry", 37, 900, { replicate: 1, runtime: 2 }));
	const controls = [1003, 900, 950, 940];
	const treatments = [1103, 950, 1050, 1020];
	[31, 37, 41, 43].forEach((seed, index) => {
		writeRun("baseline", quarry("quarry", seed, controls[index] ?? 0));
		writeRun("baseline", quarry("quarry-open", seed, treatments[index] ?? 0));
	});
	// A third arm and a seed without a pair are ignored.
	writeRun("baseline", quarry("quarry-nobrain", 31, 5));
	writeRun("baseline", quarry("quarry", 47, 5));

	const quarrySpec = GAMES.quarry;
	const econSpec = GAMES["econ-lab"];
	if (quarrySpec === undefined || econSpec === undefined) throw new Error("game specs missing");
	const result = noiseFloor({ game: quarrySpec, replicates: join(root, "replicates"), baseline: join(root, "baseline"), control: "quarry", treatment: "quarry-open", seed: 31 });

	it("reads the facts of one run from its log, usage file and genesis", () => {
		const run = readRun(join(root, "replicates"), "quarry-31-rep1", quarrySpec);
		expect(run).toMatchObject({ arm: "quarry", seed: 31, replicate: 1, requests: 6, decisions: 5, missed: 1, turnErrors: 1, runtime: 2, costUsd: 0.03, commit: "c0ffee", model: "fixture/model" });
		expect(run.metrics).toEqual({ tablePoints: 1000, sharedLanes: 2 });
		expect(readRun(join(root, "baseline"), "quarry-31", quarrySpec).runtime).toBe(1);
	});

	it("computes the replicate spread of the control arm", () => {
		const metric = result.control.metrics.tablePoints;
		expect(metric).toMatchObject({ n: 5, mean: 1000, min: 980, max: 1020, range: 40 });
		expect(metric?.sd).toBeCloseTo(Math.sqrt(250), 6);
		expect(result.control.requestsPerDecision.max).toBe(1.5);
		expect(result.control.requestsPerDecision.min).toBe(1.2);
		expect(result.control.costUsd.mean).toBeCloseTo(0.03, 9);
		expect(result.control.missed).toBe(1);
		expect(result.control.runtime).toEqual([2]);
		expect(result.treatment?.metrics.tablePoints?.mean).toBe(1100);
		expect(result.other.map((group) => [group.arm, group.seed])).toEqual([["quarry", 37]]);
	});

	it("pairs the baseline on its seeds and compares the effect with the replicate noise", () => {
		expect(result.baseline.seeds).toEqual([31, 37, 41, 43]);
		expect(result.baseline.runtime).toEqual([1]);
		expect(result.baseline.paired.values).toEqual([100, 50, 100, 80]);
		expect(result.baseline.paired.mean).toBe(82.5);
		const { comparison } = result;
		const replicateSd = Math.sqrt(250);
		expect(comparison.replicateSdOverSeedSd).toBeCloseTo(replicateSd / sd(controls), 6);
		expect(comparison.dealVarianceShare).toBeCloseTo(1 - 250 / sd(controls) ** 2, 6);
		expect(comparison.pairedSdFromReplicateNoise).toBeCloseTo(Math.sqrt(250 + 400), 6);
		expect(comparison.effectOverReplicateSd).toBeCloseTo(82.5 / replicateSd, 6);
		expect(comparison.effectSeFromReplicateNoise).toBeCloseTo(Math.sqrt(650) / 2, 6);
		expect(comparison.baselineAtSeed).toBe(1003);
		expect(comparison.baselineAtSeedZ).toBeCloseTo(3 / replicateSd, 6);
		expect(comparison.sameSeedEffect?.difference).toBe(100);
		expect(comparison.sameSeedEffect?.se).toBeCloseTo(Math.sqrt(250 / 5 + 400 / 3), 6);
		expect(comparison.sameSeedEffect?.baselinePairedAtSeed).toBe(100);
	});

	it("renders the tables and survives a control arm that does not vary", () => {
		expect(renderNoiseFloor(result, 1)).toContain("| `quarry` | 31 | 5 | 1000.0, 1010.0, 990.0, 1020.0, 980.0 | 1000.0 | 15.8 |");
		[1, 2, 3].forEach((replicate) => writeRun("econ-replicates", { ...econ("econ-lab-nobrain", 41, 1), replicate }));
		[41, 42].forEach((seed, index) => {
			writeRun("econ-baseline", econ("econ-lab-nobrain", seed, [1, 0.6][index] ?? 0));
			writeRun("econ-baseline", econ("econ-lab", seed, [0.05, 0.25][index] ?? 0));
		});
		const econResult = noiseFloor({ game: econSpec, replicates: join(root, "econ-replicates"), baseline: join(root, "econ-baseline"), control: "econ-lab-nobrain", treatment: "econ-lab", seed: 41 });
		expect(econResult.control.metrics.dilemmaCooperation).toMatchObject({ mean: 1, sd: 0, bootstrap95: [1, 1] });
		expect(econResult.control.metrics.fundCooperation?.mean).toBeCloseTo(0.2, 9);
		expect(econResult.control.missed).toBe(3);
		expect(econResult.baseline.paired.mean).toBeCloseTo(-0.65, 9);
		expect(econResult.comparison.effectOverReplicateSd).toBe(Number.POSITIVE_INFINITY);
		expect(econResult.comparison.dealVarianceShare).toBe(1);
		expect(renderNoiseFloor(econResult, 2)).toContain("| effect / replicate SD of one control run | inf |");
	});

	it("refuses a folder whose name does not match the signed genesis, and an unfinished run", () => {
		const folder = writeRun("broken", quarry("quarry", 31, 900));
		expect(() => readRun(join(root, "broken"), folder, econSpec)).toThrow(/no decision_made line/);
		mkdirSync(join(root, "renamed"), { recursive: true });
		writeRun("renamed/x", quarry("quarry", 31, 900));
		expect(() => readRun(join(root, "renamed"), "x", quarrySpec)).toThrow();
		const unfinished = writeRun("unfinished", { ...quarry("quarry", 37, 900), lines: [{ type: "draft_card_picked", missed: false }] });
		expect(() => readRun(join(root, "unfinished"), unfinished, quarrySpec)).toThrow(/exactly one draft_match_ended/);
	});
});
