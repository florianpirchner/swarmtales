// SPDX-License-Identifier: Apache-2.0
/**
 * The plan and the runner of an experiment, with a fake `PlayRun` that writes a real, verifiable run folder per
 * run: the plan is fixed by the spec, a stopped experiment continues without replaying, every cap stops before a
 * run, three failed runs stop the series, an excluded run is replaced once, and runs that do not compare stop it.
 */
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { jsonHash } from "@swarmtales/chain";
import { type Envelope, type RunEnd, type RunManifest, SwtError } from "@swarmtales/contracts";
import { openRunFolder } from "@swarmtales/runlog";
import { afterEach, describe, expect, it } from "vitest";
import { comparable, type ExperimentSpec, type MetricTable, type PlannedRun, type PlayRun, planRuns, readExperimentState, runExperiment } from "../src/index.ts";

const HASH = "a".repeat(64);
const GAME = { id: "toy" };
const KEYS = generateKeyPairSync("ed25519");
const SOURCE = "@swarmtales/testkit/guess-number";
const METRICS: MetricTable = {
	"guess-number": [{ id: "score", title: "Score", reads: ["scored"], compute: (events) => events.map((event) => (typeof event.payload === "number" ? event.payload : 0)).at(-1) }],
	"strategy-brain": [{ id: "brainWrites", title: "Brain writes", reads: ["written"], compute: (events) => events.length }],
};
const SPEC: ExperimentSpec = {
	format: "swarmtales-experiment", version: 1, id: "toy", question: "Does it?", purpose: "pilot", game: "games/toy/game.ts", model: { provider: "anthropic", id: "haiku" },
	arms: [{ id: "control", params: {}, control: true }, { id: "open", params: { open: true } }],
	seeds: [1, 2], replicates: 1, design: "paired",
	metrics: { primary: "guess-number.score", secondary: ["strategy-brain.brainWrites", "run.ticks"], guardrails: [] },
	exclusions: ["error-end"],
	budget: { perRunUsd: 0.1, totalUsd: 1, estimateUsdPerRun: { control: 0.01, open: 0.01 } },
};

/** The manifest a player writes for a planned run; `model` is the resolved model id of its one actor. */
function manifestOf(run: Pick<PlannedRun, "arm" | "seed" | "replicate">, experiment = { id: SPEC.id, specHash: jsonHash(SPEC) }, model = "claude-haiku"): RunManifest {
	return {
		format: "swarmtales-run", version: 1, run: { id: `${run.arm}-s${run.seed}-r${run.replicate}`, startedAt: "2026-11-14T10:00:00.000Z", purpose: "pilot" },
		game: { id: "toy", hash: jsonHash(GAME), params: {} }, kernel: { revision: 3, version: "0.0.0", commit: "c0ffee", node: "26.13.0" },
		scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: HASH },
		plugins: [{ id: "guess-number", package: "@swarmtales/testkit", version: "0.0.0", optionsHash: HASH }],
		actors: [{ id: "resident:A01", kind: "resident", grant: "resident", driver: "@swarmtales/models/resident", textHashes: { system: HASH, toolSpecs: HASH }, model: { provider: "anthropic", requestedId: "haiku", resolvedId: model, params: { temperature: "provider-default", topP: "provider-default", maxOutputTokens: 4000, thinking: "medium" }, pricing: "pi-ai@1" } }],
		texts: {}, seed: run.seed, replicate: run.replicate, limits: { maxTicks: 30, budgetUsd: 0.1 }, naming: 1, log: { format: "swarmtales.events", version: 1 }, experiment: { ...experiment, arm: run.arm },
	};
}

interface Step { readonly reason?: RunEnd["reason"]; readonly costUsd?: number; readonly model?: string; readonly experiment?: string; readonly fail?: boolean | "leak"; readonly limit?: string; readonly extra?: readonly (readonly [source: string, type: string, payload: unknown])[] }
const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const root = (): string => roots[roots.push(mkdtempSync(join(tmpdir(), "lab-experiment-"))) - 1] ?? "";

const limitOf = (step: Step): { limit?: string } => (step.limit === undefined ? {} : { limit: step.limit });
/** The log of a fake run: the start, the score, the extra lines of the step, a reached limit, the end. */
function linesOf(step: Step, seed: number, reason: RunEnd["reason"]): readonly (readonly [tick: number, source: string, type: string, payload: unknown])[] {
	const reached = step.limit === undefined ? [] : [["kernel", "limit_reached", { limit: step.limit, reason: "a test" }] as const];
	const middle = [...(step.extra ?? []), ...reached].map(([source, type, payload]) => [0, source, type, payload] as const);
	return [[0, "kernel", "run_started", { seed }], [0, SOURCE, "scored", seed * 10], ...middle, [1, "kernel", "run_ended", { reason }]];
}

/** A fake player: writes a finished run folder per run, as `script` says; counts its calls and the runs in flight. */
function player(directory: string, script: (run: PlannedRun, call: number) => Step = () => ({})) {
	const seen = { calls: new Array<PlannedRun>(), flying: 0, most: 0 };
	const play: PlayRun = async (run, _capUsd, experiment) => {
		const step = script(run, seen.calls.push(run));
		seen.most = Math.max(seen.most, ++seen.flying);
		await Promise.resolve();
		seen.flying--;
		if (step.fail !== undefined) throw new SwtError({ code: step.fail === "leak" ? "SWT-X030" : "SWT-X001", summary: "the player failed", why: "A test.", fix: "None." });
		const manifest = manifestOf(run, { id: step.experiment ?? experiment.id, specHash: experiment.specHash }, step.model);
		let clock = Date.UTC(2026, 10, 14, 10);
		const folder = openRunFolder(join(directory, manifest.run.id), manifest, { now: () => new Date((clock += 1000)), keys: KEYS, game: GAME, texts: {} });
		const reason = step.reason ?? "ticks";
		const lines = linesOf(step, run.seed, reason);
		for (const [index, [tick, source, type, payload]] of lines.entries()) folder.sink.write({ seq: index + 1, tick, source, type, actor: "kernel", ...(index === 0 ? {} : { causedBy: index }), payload } satisfies Envelope);
		folder.sink.close?.({ reason, tick: 1, ...limitOf(step) });
		folder.close();
		return { directory: join(directory, manifest.run.id), costUsd: step.costUsd ?? 0.01 };
	};
	return { play, seen };
}
const refusal = async (run: Promise<unknown>): Promise<string> => run.then(() => "no error", (error: unknown) => (error instanceof SwtError ? `${error.code} ${error.message}` : String(error)));
const cell = (run: PlannedRun) => `${run.arm}/${run.seed}/${run.replicate}`;

describe("planRuns", () => {
	it("gives the same plan for the same spec: every cell once, shuffled by the spec's hash", () => {
		const spec = { ...SPEC, seeds: [1, 2, 3, 4, 5, 6], replicates: 2 };
		const plan = planRuns(spec);
		expect(planRuns(structuredClone(spec))).toEqual(plan);
		expect(plan.map((run) => run.index)).toEqual([...plan.keys()]);
		expect(new Set(plan.map(cell)).size).toBe(24);
		expect(plan.find((run) => run.arm === "open")?.params).toEqual({ open: true });
		const arms = plan.map((run) => run.arm);
		expect(arms).not.toEqual([...arms].sort());
		expect(planRuns({ ...spec, question: "Another one?" }).map(cell)).not.toEqual(plan.map(cell));
	});
});

describe("runExperiment", () => {
	it("stops after three failed runs (E007) and continues without replaying", async () => {
		const directory = root();
		const broken = player(directory, () => ({ fail: true }));
		expect(await refusal(runExperiment(SPEC, broken.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E007 .*3 runs in a row/);
		expect(broken.seen.calls.map(cell)).toEqual(planRuns(SPEC).slice(0, 3).map(cell));
		const stopped = readExperimentState(directory);
		expect([stopped?.spentUsd.toFixed(4), stopped?.runs.map((run) => [run.status, run.costUsd])]).toEqual(["0.3000", [["stopped", 0.1], ["stopped", 0.1], ["stopped", 0.1]]]);
		const leak = player(root(), () => ({ fail: "leak" }));
		expect(await refusal(runExperiment(SPEC, leak.play, { directory: roots.at(-1) ?? "", metrics: METRICS }))).toMatch(/^SWT-E007 .*reported a leak/);
		expect(leak.seen.calls).toHaveLength(1);
		const healthy = player(directory);
		const state = await runExperiment(SPEC, healthy.play, { directory, metrics: METRICS });
		expect(healthy.seen.calls).toEqual(planRuns(SPEC).slice(3));
		expect(state.runs.map((run) => run.status)).toEqual(["stopped", "stopped", "stopped", "included"]);
		expect([state.spentUsd.toFixed(4), state.code]).toEqual(["0.3100", { commit: "c0ffee", kernelRevision: 3 }]);
		expect(readExperimentState(directory)).toEqual(state);
		const again = player(directory);
		await runExperiment(SPEC, again.play, { directory, metrics: METRICS });
		expect(again.seen.calls).toEqual([]);
		expect(await refusal(runExperiment({ ...SPEC, question: "Another one?" }, again.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E006 .*another spec/);
	});

	it("stops at the cap before a run (E004), counts what an earlier call spent, and reserves the cap of every run in flight", async () => {
		const spec = { ...SPEC, budget: { ...SPEC.budget, totalUsd: 0.25 } };
		const directory = root();
		const one = player(directory, () => ({ costUsd: 0.06 }));
		expect(await refusal(runExperiment(spec, one.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E004 .*0\.1800 spent \+ 0\.00 reserved \+ 0\.10 for the run is above 0\.25/);
		expect(one.seen.calls).toHaveLength(3);
		expect(await refusal(runExperiment(spec, one.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E004/);
		expect(one.seen.calls).toHaveLength(3);
		const three = player(root());
		expect(await refusal(runExperiment({ ...spec, concurrency: 3 }, three.play, { directory: roots.at(-1) ?? "", metrics: METRICS }))).toMatch(/^SWT-E004 .*0\.0000 spent \+ 0\.20 reserved/);
		expect([three.seen.calls.length, three.seen.most, readExperimentState(roots.at(-1) ?? "")?.runs.length]).toEqual([2, 2, 2]);
	});

	it("replaces an excluded run once, with the replicate plus 100", async () => {
		const directory = root();
		const { play, seen } = player(directory, (run) => (run.arm === "open" && run.seed === 2 ? { reason: "error" } : {}));
		const state = await runExperiment(SPEC, play, { directory, metrics: METRICS });
		const index = planRuns(SPEC).findIndex((run) => run.arm === "open" && run.seed === 2);
		expect(seen.calls.map(cell).filter((name) => name.startsWith("open/2/"))).toEqual(["open/2/0", "open/2/100"]);
		expect(seen.calls[index + 1]).toMatchObject({ index: 4 + index, replicate: 100 });
		expect(state.runs.filter((run) => run.status === "excluded")).toMatchObject([{ planned: { index }, reason: "error-end" }, { planned: { index: 4 + index }, reason: "error-end", replaces: index }]);
		expect(state.runs).toHaveLength(5);
	});

	it("refuses a run with another model id (E005) and a run of another experiment (E006), and keeps their records", async () => {
		const directory = root();
		const other = player(directory, (_run, call) => (call === 2 ? { model: "claude-other" } : {}));
		expect(await refusal(runExperiment(SPEC, other.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E005 .*actors\.model\.resolvedId differs/);
		expect(readExperimentState(directory)?.runs.map((run) => run.status)).toEqual(["included", "stopped"]);
		const foreign = player(root(), () => ({ experiment: "elsewhere" }));
		expect(await refusal(runExperiment(SPEC, foreign.play, { directory: roots.at(-1) ?? "", metrics: METRICS }))).toMatch(/^SWT-E006 .*another experiment/);
		expect(foreign.seen.calls).toHaveLength(1);
	});

	it("refuses a metric no mechanic exports (E010) and a plan above the cap (E003) before any run", async () => {
		const { play, seen } = player(root());
		const options = { directory: roots.at(-1) ?? "", metrics: METRICS };
		expect(await refusal(runExperiment({ ...SPEC, metrics: { ...SPEC.metrics, secondary: ["guess-number.nope"] } }, play, options))).toMatch(/^SWT-E010 .*"guess-number\.nope"/);
		expect(await refusal(runExperiment({ ...SPEC, budget: { ...SPEC.budget, totalUsd: 0.03 } }, play, options))).toMatch(/^SWT-E003 .*0\.04 USD, the cap is 0\.03/);
		expect(seen.calls).toEqual([]);
	});
});

describe("runExperiment under attack (M2 review B)", () => {
	const tight = { ...SPEC, seeds: [1, 2, 3, 4], budget: { ...SPEC.budget, totalUsd: 0.25 } };

	it("B1: a cost that is no number does not switch the cap off", async () => {
		const directory = root();
		const { play, seen } = player(directory, () => ({ costUsd: Number.NaN }));
		expect(await refusal(runExperiment(tight, play, { directory, metrics: METRICS }))).toMatch(/^SWT-E00[47]/);
		expect(seen.calls.length).toBeLessThanOrEqual(3);
		expect(readExperimentState(directory)?.runs.every((run) => run.status === "stopped" && run.costUsd === 0.1)).toBe(true);
	});

	it("B2: a state file whose money was edited (spentUsd, the spec's budget) does not raise the cap", async () => {
		const directory = root();
		const first = player(directory, () => ({ costUsd: 0.06 }));
		expect(await refusal(runExperiment(tight, first.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E004/);
		const saved = readExperimentState(directory);
		writeFileSync(join(directory, "experiment.json"), JSON.stringify({ ...saved, spentUsd: 0, spec: { ...saved?.spec, budget: { ...saved?.spec.budget, totalUsd: 100 } } }));
		const second = player(directory, () => ({ costUsd: 0.06 }));
		expect(await refusal(runExperiment(tight, second.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E00[46]/);
		expect(second.seen.calls).toEqual([]);
	});

	it("B3: the three failures in a row are counted across a continue", async () => {
		const directory = root();
		const spec = { ...SPEC, seeds: [1, 2, 3, 4, 5, 6] };
		const broken = player(directory, () => ({ fail: true }));
		expect(await refusal(runExperiment(spec, broken.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E007/);
		expect(await refusal(runExperiment(spec, broken.play, { directory, metrics: METRICS }))).toMatch(/^SWT-E007/);
		expect(broken.seen.calls).toHaveLength(4);
		const healthy = player(directory);
		expect((await runExperiment(spec, healthy.play, { directory, metrics: METRICS })).runs).toHaveLength(12);
	});

	it("B4: a run whose facts cannot be computed keeps its record and its cost, and the other worker stops", async () => {
		const directory = root();
		const metrics: MetricTable = { ...METRICS, "guess-number": [{ id: "score", title: "Score", reads: ["scored"], compute: () => { throw new TypeError("a broken metric"); } }] };
		const { play, seen } = player(directory, () => ({ costUsd: 0.05 }));
		const outcome = await refusal(runExperiment({ ...SPEC, seeds: [1, 2, 3, 4, 5, 6], concurrency: 2 }, play, { directory, metrics }));
		await new Promise((resolve) => setTimeout(resolve, 50));
		const state = readExperimentState(directory);
		expect(outcome).toMatch(/^SWT-E007/);
		expect([seen.calls.length, state?.runs.length, state?.spentUsd.toFixed(2)]).toEqual([seen.calls.length, seen.calls.length, (0.05 * seen.calls.length).toFixed(2)]);
		expect(seen.calls.length).toBeLessThanOrEqual(4);
		expect([state?.runs[0]?.status, state?.runs[0]?.reason]).toEqual(["stopped", "a broken metric"]);
	});

	it("B9: each exclusion rule holds for the facts it names: the cost cap's limit id, a failed request, a missed decision", async () => {
		const metrics: MetricTable = { ...METRICS, "guess-number": [...(METRICS["guess-number"] ?? []), { id: "missedGuesses", title: "Missed", reads: ["missed"], compute: (events) => events.length }] };
		const steps: Readonly<Record<number, Step>> = {
			1: { reason: "limit", limit: "models.budget" },
			2: { extra: [["@swarmtales/models/resident", "request_failed", {}]] },
			3: { extra: [[SOURCE, "missed", 1]] },
			4: { reason: "limit", limit: "guess-number.over" },
		};
		const spec: ExperimentSpec = { ...SPEC, arms: [{ id: "control", params: {}, control: true }], seeds: [1, 2, 3, 4], design: "replicates", exclusions: ["failed-request", "missed-decision", "cost-cap", "error-end"] };
		const directory = root();
		const { play } = player(directory, (run) => (run.replicate === 0 ? (steps[run.seed] ?? {}) : {}));
		const state = await runExperiment(spec, play, { directory, metrics });
		const reasons = Object.fromEntries(state.runs.filter((run) => run.planned.replicate === 0).map((run) => [run.planned.seed, run.reason ?? run.status]));
		expect(reasons).toEqual({ 1: "cost-cap", 2: "failed-request", 3: "missed-decision", 4: "included" });
		expect(state.runs).toHaveLength(7);
	});

	// Finding B5 (open): the cap of the experiment holds only while every run stays under its own cap. The meter of a
	// run stops before the next request, so a run may report more than `perRunUsd`, and the sum then passes `totalUsd`.
	it.fails("B5: the sum of what is spent never passes totalUsd, also when a run reports more than its own cap", async () => {
		const directory = root();
		const { play } = player(directory, () => ({ costUsd: 0.15 }));
		await refusal(runExperiment(tight, play, { directory, metrics: METRICS }));
		expect(readExperimentState(directory)?.spentUsd).toBeLessThanOrEqual(0.25 + 1e-9);
	});
});

describe("comparable", () => {
	it("compares two runs by model, kernel and scheduler, and by game and texts inside one arm only", () => {
		const control = manifestOf({ arm: "control", seed: 1, replicate: 0 });
		const open = manifestOf({ arm: "open", seed: 1, replicate: 0 });
		const changed = { game: { ...open.game, hash: "b".repeat(64) }, actors: open.actors.map((actor) => ({ ...actor, textHashes: { system: "c".repeat(64), toolSpecs: "d".repeat(64) } })) };
		expect(comparable(control, manifestOf({ arm: "control", seed: 2, replicate: 1 }))).toBe(true);
		expect(comparable(control, { ...open, ...changed })).toBe(true);
		expect(comparable(control, { ...control, ...changed })).toBe(false);
		expect(comparable(control, manifestOf({ arm: "open", seed: 1, replicate: 0 }, undefined, "claude-other"))).toBe(false);
		expect(comparable(control, { ...open, kernel: { ...open.kernel, revision: 4 } })).toBe(false);
	});
});
