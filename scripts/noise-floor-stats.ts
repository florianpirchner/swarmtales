/**
 * The noise floor of a game (docs/refactoring-before-release/02-experiment-science.md, section 3.4): how much
 * the primary metric differs between runs of the same game, arm and seed, where only the model's sampling
 * differs. Pure functions over recorded run folders; no model, no money. `scripts/noise-floor.ts` is the
 * command line. The numbers are read from `events.jsonl`, `usage.json` and the genesis of the signed chain.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRng } from "@swarmtales/kernel";
import { Type, type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";

// ---------------------------------------------------------------- the log lines the metrics read

const Scores = Type.Record(Type.String(), Type.Number());
const DraftMatchEnded = Type.Object({ type: Type.Literal("draft_match_ended"), scores: Scores });
const DraftGameScored = Type.Object({ type: Type.Literal("draft_game_scored"), reference: Type.Object({ sharedLanes: Type.Number() }) });
const DraftCardPicked = Type.Object({ type: Type.Literal("draft_card_picked"), missed: Type.Boolean() });
const MatchEnded = Type.Object({ type: Type.Literal("match_ended"), scores: Scores });
const BlockScored = Type.Object({
	type: Type.Literal("block_scored"),
	game: Type.String(),
	reference: Type.Object({ cooperation: Type.Number(), perRound: Type.Array(Type.Number()), missed: Type.Number() }),
});
const Typed = Type.Object({ type: Type.String() });
const Usage = Type.Object({ totals: Type.Object({ requests: Type.Number(), costUsd: Type.Number() }) });
const Genesis = Type.Object({
	genesis: Type.Object({
		story: Type.String(),
		storyHash: Type.String(),
		seed: Type.Number(),
		commit: Type.Optional(Type.String()),
		runtime: Type.Optional(Type.Number()),
		models: Type.Record(Type.String(), Type.String()),
	}),
});

type LogLine = Static<typeof Typed>;

function parse<T extends TSchema>(schema: T, value: unknown, what: string): Static<T> {
	if (!Check(schema, value)) throw new Error(`${what} does not have the expected shape`);
	return value;
}

function sum(values: Iterable<number>): number {
	let total = 0;
	for (const value of values) total += value;
	return total;
}

// ---------------------------------------------------------------- game specs

/** What a game's noise floor is measured on. The first metric is the primary one. */
export interface GameSpec {
	readonly name: string;
	readonly primary: string;
	/** The event that counts as one decision of a resident. */
	readonly decisionEvent: string;
	/** Every metric of one finished run, from its log lines. Throws when the run did not finish. */
	metrics(lines: readonly unknown[]): Readonly<Record<string, number>>;
	/** Decisions the runtime made for a resident that did not act in time. */
	missed(lines: readonly unknown[]): number;
}

function only<T extends TSchema>(schema: T, lines: readonly unknown[]): Static<T>[] {
	const found: Static<T>[] = [];
	for (const line of lines) if (Check(schema, line)) found.push(line);
	return found;
}

const QUARRY: GameSpec = {
	name: "quarry",
	primary: "tablePoints",
	decisionEvent: "draft_card_picked",
	metrics(lines) {
		const ended = only(DraftMatchEnded, lines);
		const match = ended[0];
		if (match === undefined || ended.length !== 1) throw new Error("expected exactly one draft_match_ended line");
		return { tablePoints: sum(Object.values(match.scores)), sharedLanes: sum(only(DraftGameScored, lines).map((game) => game.reference.sharedLanes)) };
	},
	missed: (lines) => only(DraftCardPicked, lines).filter((pick) => pick.missed).length,
};

const ECON_LAB: GameSpec = {
	name: "econ-lab",
	primary: "dilemmaCooperation",
	decisionEvent: "decision_made",
	metrics(lines) {
		const ended = only(MatchEnded, lines);
		const match = ended[0];
		if (match === undefined || ended.length !== 1) throw new Error("expected exactly one match_ended line");
		const blocks = only(BlockScored, lines);
		const block = (game: string) => {
			const found = blocks.filter((entry) => entry.game === game);
			const first = found[0];
			if (first === undefined || found.length !== 1) throw new Error(`expected exactly one block_scored line of ${game}`);
			return first.reference;
		};
		const dilemma = block("dilemma");
		const first = dilemma.perRound[0];
		if (first === undefined) throw new Error("the dilemma block has no round");
		return { dilemmaCooperation: dilemma.cooperation, dilemmaRound1: first, fundCooperation: block("public-goods").cooperation, tablePoints: sum(Object.values(match.scores)) };
	},
	missed: (lines) => sum(only(BlockScored, lines).map((block) => block.reference.missed)),
};

export const GAMES: Readonly<Record<string, GameSpec>> = { quarry: QUARRY, "econ-lab": ECON_LAB };

// ---------------------------------------------------------------- one run

export interface RunFacts {
	/** The folder name inside its series, e.g. `quarry-31-rep2`. */
	readonly folder: string;
	readonly arm: string;
	readonly seed: number;
	/** The replicate number of a `-rep<k>` folder. */
	readonly replicate?: number;
	readonly metrics: Readonly<Record<string, number>>;
	readonly requests: number;
	readonly decisions: number;
	readonly requestsPerDecision: number;
	readonly costUsd: number;
	readonly missed: number;
	readonly turnErrors: number;
	readonly runtime: number;
	readonly commit: string;
	readonly model: string;
	readonly storyHash: string;
}

const FOLDER = /^(?<arm>.+)-(?<seed>\d+)(?:-rep(?<replicate>\d+))?$/;

function jsonLines(file: string): unknown[] {
	return readFileSync(file, "utf8")
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line): unknown => JSON.parse(line));
}

/** Reads one recorded run (`<series>/<folder>/run/`). The arm and seed come from the signed genesis, not from the folder name. */
export function readRun(series: string, folder: string, game: GameSpec): RunFacts {
	const directory = join(series, folder, "run");
	const lines = jsonLines(join(directory, "events.jsonl"));
	const types = lines.map((line): LogLine => parse(Typed, line, `${directory}/events.jsonl`));
	const count = (type: string) => types.filter((line) => line.type === type).length;
	const usage = parse(Usage, JSON.parse(readFileSync(join(directory, "usage.json"), "utf8")), `${directory}/usage.json`);
	const { genesis } = parse(Genesis, jsonLines(join(directory, "events.chain.jsonl"))[0], `${directory}/events.chain.jsonl`);
	const name = FOLDER.exec(folder)?.groups;
	if (name?.arm !== genesis.story || Number(name.seed) !== genesis.seed) throw new Error(`${directory}: the folder name does not match the genesis (${genesis.story}, seed ${String(genesis.seed)})`);
	const requests = count("request");
	const decisions = count(game.decisionEvent);
	if (decisions === 0) throw new Error(`${directory}: no ${game.decisionEvent} line`);
	return {
		folder,
		arm: genesis.story,
		seed: genesis.seed,
		...(name.replicate === undefined ? {} : { replicate: Number(name.replicate) }),
		metrics: game.metrics(lines),
		requests,
		decisions,
		requestsPerDecision: requests / decisions,
		costUsd: usage.totals.costUsd,
		missed: game.missed(lines),
		turnErrors: count("turn_error"),
		runtime: genesis.runtime ?? 1,
		commit: genesis.commit ?? "unknown",
		model: genesis.models.residents ?? "unknown",
		storyHash: genesis.storyHash,
	};
}

/** Every run of a series folder (the subfolders that hold a `run/events.jsonl`), by arm, seed and replicate. */
export function readSeries(series: string, game: GameSpec): RunFacts[] {
	return readdirSync(series, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(series, entry.name, "run", "events.jsonl")))
		.map((entry) => readRun(series, entry.name, game))
		.sort((a, b) => a.arm.localeCompare(b.arm) || a.seed - b.seed || (a.replicate ?? 0) - (b.replicate ?? 0));
}

// ---------------------------------------------------------------- statistics

export interface Summary {
	readonly n: number;
	readonly values: readonly number[];
	readonly mean: number;
	/** Sample standard deviation (n - 1); 0 for a single value. */
	readonly sd: number;
	readonly min: number;
	readonly max: number;
	readonly range: number;
	/** Standard error of the mean. */
	readonly se: number;
	/** 95% interval of the mean: percentile bootstrap over the values (too narrow at small n; read it with `t95`). */
	readonly bootstrap95: readonly [number, number];
	/** 95% interval of the mean by Student's t. */
	readonly t95: readonly [number, number];
}

export function mean(values: readonly number[]): number {
	if (values.length === 0) throw new Error("no values");
	return sum(values) / values.length;
}

export function sd(values: readonly number[]): number {
	if (values.length < 2) return 0;
	const centre = mean(values);
	return Math.sqrt(sum(values.map((value) => (value - centre) ** 2)) / (values.length - 1));
}

/** Two-sided 95% quantiles of Student's t for 1 to 30 degrees of freedom. */
const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];

export function t95(degrees: number): number {
	if (degrees < 1) return Number.POSITIVE_INFINITY;
	return T95[Math.min(Math.floor(degrees), T95.length) - 1] ?? 1.96;
}

function quantile(sorted: readonly number[], q: number): number {
	const position = (sorted.length - 1) * q;
	const low = Math.floor(position);
	const a = sorted[low];
	const b = sorted[Math.min(low + 1, sorted.length - 1)];
	if (a === undefined || b === undefined) throw new Error("no values");
	return a + (b - a) * (position - low);
}

export const BOOTSTRAP_SEED = 20261114;
export const BOOTSTRAP_RESAMPLES = 10000;

/** Percentile bootstrap interval (95%) of the mean; seeded, so the same values give the same interval. */
export function bootstrapMean95(values: readonly number[], seed = BOOTSTRAP_SEED, resamples = BOOTSTRAP_RESAMPLES): [number, number] {
	if (values.length === 0) throw new Error("no values");
	const rng = createRng(seed);
	const means: number[] = [];
	for (let i = 0; i < resamples; i++) {
		means.push(mean(values.map(() => values[Math.floor(rng.next() * values.length)] ?? 0)));
	}
	means.sort((a, b) => a - b);
	return [quantile(means, 0.025), quantile(means, 0.975)];
}

export function summarize(values: readonly number[]): Summary {
	const centre = mean(values);
	const spread = sd(values);
	const se = spread / Math.sqrt(values.length);
	const half = values.length < 2 ? 0 : t95(values.length - 1) * se;
	const min = Math.min(...values);
	const max = Math.max(...values);
	return { n: values.length, values, mean: centre, sd: spread, min, max, range: max - min, se, bootstrap95: bootstrapMean95(values), t95: [centre - half, centre + half] };
}

// ---------------------------------------------------------------- the analysis

export interface ArmReplicates {
	readonly arm: string;
	readonly seed: number;
	readonly folders: readonly string[];
	readonly metrics: Readonly<Record<string, Summary>>;
	readonly requestsPerDecision: Summary;
	readonly costUsd: Summary;
	readonly requests: Summary;
	readonly decisions: Summary;
	readonly missed: number;
	readonly turnErrors: number;
	readonly runtime: readonly number[];
	readonly commits: readonly string[];
	readonly models: readonly string[];
	readonly storyHashes: readonly string[];
}

export interface BaselineSeries {
	readonly control: string;
	readonly treatment: string;
	readonly seeds: readonly number[];
	readonly runtime: readonly number[];
	readonly storyHashes: Readonly<Record<string, readonly string[]>>;
	/** The primary metric per seed, in the order of `seeds`. */
	readonly controlValues: Summary;
	readonly treatmentValues: Summary;
	/** Treatment minus control on the same seed. */
	readonly paired: Summary;
	readonly controlRequestsPerDecision: Summary;
	readonly controlCostUsd: Summary;
}

export interface Comparison {
	/** Replicate SD of the control arm (same seed) over the SD of the control arm across the baseline's seeds. */
	readonly replicateSdOverSeedSd: number;
	/** Share of the across-seed variance that is not replicate noise: max(0, 1 - replicate variance / across-seed variance). */
	readonly dealVarianceShare: number;
	/** SD a paired difference would have from replicate noise alone (both arms measured: root of the summed variances; else root 2 times the control's). */
	readonly pairedSdFromReplicateNoise: number;
	/** The SD of the paired difference that the baseline series observed. */
	readonly pairedSdObserved: number;
	/** The series effect (mean paired difference) over the replicate SD of one control run. */
	readonly effectOverReplicateSd: number;
	/** SE the series effect would have over the baseline's seed count from replicate noise alone, and the effect over it. */
	readonly effectSeFromReplicateNoise: number;
	readonly effectOverNoiseSe: number;
	/** The baseline's single control run at the replicate seed, and where it lies among the replicates (in replicate SDs from their mean). */
	readonly baselineAtSeed?: number;
	readonly baselineAtSeedZ?: number;
	/** With treatment replicates: treatment minus control at the replicate seed, its Welch SE and 95% interval. */
	readonly sameSeedEffect?: { readonly difference: number; readonly se: number; readonly t95: readonly [number, number]; readonly baselinePairedAtSeed?: number };
}

export interface NoiseFloor {
	readonly game: string;
	readonly primaryMetric: string;
	readonly bootstrap: { readonly seed: number; readonly resamples: number; readonly method: string };
	readonly control: ArmReplicates;
	readonly treatment?: ArmReplicates;
	/** More replicate groups of the same series (another seed or arm), reported but not used in the comparison. */
	readonly other: readonly ArmReplicates[];
	readonly baseline: BaselineSeries;
	readonly comparison: Comparison;
}

function unique<T>(values: readonly T[]): T[] {
	return [...new Set(values)];
}

function armReplicates(runs: readonly RunFacts[]): ArmReplicates {
	const first = runs[0];
	if (first === undefined) throw new Error("no replicate runs");
	const column = (pick: (run: RunFacts) => number) => summarize(runs.map(pick));
	return {
		arm: first.arm,
		seed: first.seed,
		folders: runs.map((run) => run.folder),
		metrics: Object.fromEntries(Object.keys(first.metrics).map((metric) => [metric, column((run) => run.metrics[metric] ?? Number.NaN)])),
		requestsPerDecision: column((run) => run.requestsPerDecision),
		costUsd: column((run) => run.costUsd),
		requests: column((run) => run.requests),
		decisions: column((run) => run.decisions),
		missed: sum(runs.map((run) => run.missed)),
		turnErrors: sum(runs.map((run) => run.turnErrors)),
		runtime: unique(runs.map((run) => run.runtime)),
		commits: unique(runs.map((run) => run.commit)),
		models: unique(runs.map((run) => run.model)),
		storyHashes: unique(runs.map((run) => run.storyHash)),
	};
}

/** The replicate groups of a series: runs of the same arm and seed, in folder order. */
export function replicateGroups(runs: readonly RunFacts[]): ArmReplicates[] {
	const groups = new Map<string, RunFacts[]>();
	for (const run of runs) {
		if (run.replicate === undefined) continue;
		const key = `${run.arm}@${String(run.seed)}`;
		groups.set(key, [...(groups.get(key) ?? []), run]);
	}
	return [...groups.values()].map(armReplicates);
}

export function baselineSeries(runs: readonly RunFacts[], control: string, treatment: string, primary: string): BaselineSeries {
	const of = (arm: string) => new Map(runs.filter((run) => run.arm === arm && run.replicate === undefined).map((run) => [run.seed, run]));
	const controls = of(control);
	const treatments = of(treatment);
	const seeds = [...controls.keys()].filter((seed) => treatments.has(seed)).sort((a, b) => a - b);
	if (seeds.length < 2) throw new Error(`the baseline has fewer than two seeds with both ${control} and ${treatment}`);
	const pick = (arm: Map<number, RunFacts>, value: (run: RunFacts) => number) =>
		seeds.map((seed) => {
			const run = arm.get(seed);
			if (run === undefined) throw new Error(`no run of seed ${String(seed)}`);
			return value(run);
		});
	const primaryOf = (run: RunFacts) => run.metrics[primary] ?? Number.NaN;
	const controlValues = pick(controls, primaryOf);
	const treatmentValues = pick(treatments, primaryOf);
	const used = [...controls.values(), ...treatments.values()].filter((run) => seeds.includes(run.seed));
	return {
		control,
		treatment,
		seeds,
		runtime: unique(used.map((run) => run.runtime)),
		storyHashes: { [control]: unique(pick(controls, () => 0).map((_, index) => controls.get(seeds[index] ?? -1)?.storyHash ?? "")), [treatment]: unique(seeds.map((seed) => treatments.get(seed)?.storyHash ?? "")) },
		controlValues: summarize(controlValues),
		treatmentValues: summarize(treatmentValues),
		paired: summarize(treatmentValues.map((value, index) => value - (controlValues[index] ?? Number.NaN))),
		controlRequestsPerDecision: summarize(pick(controls, (run) => run.requestsPerDecision)),
		controlCostUsd: summarize(pick(controls, (run) => run.costUsd)),
	};
}

/** Welch's degrees of freedom for two samples; infinite when neither varies. */
function welchDegrees(a: Summary, b: Summary): number {
	const va = a.sd ** 2 / a.n;
	const vb = b.sd ** 2 / b.n;
	const denominator = va ** 2 / (a.n - 1) + vb ** 2 / (b.n - 1);
	return denominator === 0 ? Number.POSITIVE_INFINITY : (va + vb) ** 2 / denominator;
}

function ratio(a: number, b: number): number {
	return b === 0 ? (a === 0 ? 0 : Number.POSITIVE_INFINITY) : a / b;
}

export function compare(control: ArmReplicates, treatment: ArmReplicates | undefined, baseline: BaselineSeries, primary: string): Comparison {
	const replicates = control.metrics[primary];
	if (replicates === undefined) throw new Error(`no metric ${primary}`);
	const treated = treatment?.metrics[primary];
	const seedIndex = baseline.seeds.indexOf(control.seed);
	const baselineAtSeed = seedIndex < 0 ? undefined : baseline.controlValues.values[seedIndex];
	const pairedNoise = treated === undefined ? Math.SQRT2 * replicates.sd : Math.sqrt(replicates.sd ** 2 + treated.sd ** 2);
	const effect = baseline.paired.mean;
	const noiseSe = pairedNoise / Math.sqrt(baseline.seeds.length);
	const sameSeed = (() => {
		if (treated === undefined || treatment?.seed !== control.seed) return undefined;
		const se = Math.sqrt(replicates.sd ** 2 / replicates.n + treated.sd ** 2 / treated.n);
		const difference = treated.mean - replicates.mean;
		const half = t95(welchDegrees(replicates, treated)) * se;
		const paired = seedIndex < 0 ? undefined : baseline.paired.values[seedIndex];
		return { difference, se, t95: [difference - half, difference + half] as const, ...(paired === undefined ? {} : { baselinePairedAtSeed: paired }) };
	})();
	return {
		replicateSdOverSeedSd: ratio(replicates.sd, baseline.controlValues.sd),
		dealVarianceShare: Math.max(0, 1 - ratio(replicates.sd ** 2, baseline.controlValues.sd ** 2)),
		pairedSdFromReplicateNoise: pairedNoise,
		pairedSdObserved: baseline.paired.sd,
		effectOverReplicateSd: ratio(Math.abs(effect), replicates.sd),
		effectSeFromReplicateNoise: noiseSe,
		effectOverNoiseSe: ratio(Math.abs(effect), noiseSe),
		...(baselineAtSeed === undefined ? {} : { baselineAtSeed, baselineAtSeedZ: ratio(baselineAtSeed - replicates.mean, replicates.sd) }),
		...(sameSeed === undefined ? {} : { sameSeedEffect: sameSeed }),
	};
}

export interface NoiseFloorInput {
	readonly game: GameSpec;
	/** The series folder with the `-rep<k>` runs. */
	readonly replicates: string;
	/** The recorded baseline series (one run per arm and seed). */
	readonly baseline: string;
	readonly control: string;
	readonly treatment: string;
	readonly seed: number;
}

export function noiseFloor(input: NoiseFloorInput): NoiseFloor {
	const groups = replicateGroups(readSeries(input.replicates, input.game));
	const at = (arm: string) => groups.find((group) => group.arm === arm && group.seed === input.seed);
	const control = at(input.control);
	if (control === undefined) throw new Error(`no replicates of ${input.control} at seed ${String(input.seed)} in ${input.replicates}`);
	const treatment = at(input.treatment);
	const baseline = baselineSeries(readSeries(input.baseline, input.game), input.control, input.treatment, input.game.primary);
	return {
		game: input.game.name,
		primaryMetric: input.game.primary,
		bootstrap: { seed: BOOTSTRAP_SEED, resamples: BOOTSTRAP_RESAMPLES, method: "percentile interval of the mean" },
		control,
		...(treatment === undefined ? {} : { treatment }),
		other: groups.filter((group) => group !== control && group !== treatment),
		baseline,
		comparison: compare(control, treatment, baseline, input.game.primary),
	};
}

// ---------------------------------------------------------------- text

function fixed(value: number, digits: number): string {
	return Number.isFinite(value) ? value.toFixed(digits) : "inf";
}

function interval(pair: readonly [number, number], digits: number): string {
	return `${fixed(pair[0], digits)} to ${fixed(pair[1], digits)}`;
}

function replicateRow(group: ArmReplicates, primary: string, digits: number): string {
	const metric = group.metrics[primary];
	if (metric === undefined) throw new Error(`no metric ${primary}`);
	return `| \`${group.arm}\` | ${String(group.seed)} | ${String(metric.n)} | ${metric.values.map((value) => fixed(value, digits)).join(", ")} | ${fixed(metric.mean, digits)} | ${fixed(metric.sd, digits)} | ${fixed(metric.min, digits)} to ${fixed(metric.max, digits)} (${fixed(metric.range, digits)}) | ${interval(metric.bootstrap95, digits)} | ${interval(metric.t95, digits)} | ${fixed(group.requestsPerDecision.mean, 2)} (${fixed(group.requestsPerDecision.min, 2)} to ${fixed(group.requestsPerDecision.max, 2)}) | ${fixed(group.costUsd.mean, 4)} (${fixed(group.costUsd.min, 4)} to ${fixed(group.costUsd.max, 4)}) | ${String(group.missed)} / ${String(group.turnErrors)} |`;
}

/** The result tables of `NOISE-FLOOR.md`, as Markdown; `digits` is the precision of the primary metric. */
export function renderNoiseFloor(result: NoiseFloor, digits: number): string {
	const { baseline, comparison } = result;
	const groups = [result.control, ...(result.treatment === undefined ? [] : [result.treatment]), ...result.other];
	const lines = [
		`Primary metric: \`${result.primaryMetric}\`. Bootstrap: ${result.bootstrap.method}, ${String(result.bootstrap.resamples)} resamples, seed ${String(result.bootstrap.seed)}.`,
		"",
		"| Arm | Seed | n | Values | Mean | SD | Range | Bootstrap 95% | t 95% | Requests per decision | Cost per run (USD) | Missed / turn errors |",
		"|---|---:|---:|---|---:|---:|---|---|---|---|---|---|",
		...groups.map((group) => replicateRow(group, result.primaryMetric, digits)),
		"",
		`Baseline series (runtime ${baseline.runtime.map((revision) => `r${String(revision)}`).join(", ")}, seeds ${baseline.seeds.join(", ")}):`,
		"",
		"| | Mean | SD across seeds | Range |",
		"|---|---:|---:|---|",
		`| \`${baseline.control}\` | ${fixed(baseline.controlValues.mean, digits)} | ${fixed(baseline.controlValues.sd, digits)} | ${fixed(baseline.controlValues.min, digits)} to ${fixed(baseline.controlValues.max, digits)} |`,
		`| \`${baseline.treatment}\` | ${fixed(baseline.treatmentValues.mean, digits)} | ${fixed(baseline.treatmentValues.sd, digits)} | ${fixed(baseline.treatmentValues.min, digits)} to ${fixed(baseline.treatmentValues.max, digits)} |`,
		`| paired difference | ${fixed(baseline.paired.mean, digits)} (SE ${fixed(baseline.paired.se, digits)}) | ${fixed(baseline.paired.sd, digits)} | ${fixed(baseline.paired.min, digits)} to ${fixed(baseline.paired.max, digits)} |`,
		"",
		"| Comparison | Value |",
		"|---|---:|",
		`| replicate SD of the control / SD across seeds | ${fixed(comparison.replicateSdOverSeedSd, 2)} |`,
		`| share of the across-seed variance that is the deal, not replicate noise | ${fixed(comparison.dealVarianceShare, 2)} |`,
		`| SD of a paired difference from replicate noise alone | ${fixed(comparison.pairedSdFromReplicateNoise, digits)} |`,
		`| SD of the paired difference observed in the baseline | ${fixed(comparison.pairedSdObserved, digits)} |`,
		`| effect / replicate SD of one control run | ${fixed(comparison.effectOverReplicateSd, 2)} |`,
		`| SE of the series effect from replicate noise alone (${String(baseline.seeds.length)} seeds) | ${fixed(comparison.effectSeFromReplicateNoise, digits)} |`,
		`| effect / that SE | ${fixed(comparison.effectOverNoiseSe, 2)} |`,
		...(comparison.baselineAtSeed === undefined || comparison.baselineAtSeedZ === undefined ? [] : [`| baseline control run at seed ${String(result.control.seed)} | ${fixed(comparison.baselineAtSeed, digits)} (${fixed(comparison.baselineAtSeedZ, 2)} replicate SDs from the replicate mean) |`]),
		...(comparison.sameSeedEffect === undefined
			? []
			: [
					`| treatment minus control at seed ${String(result.control.seed)}, replicate means | ${fixed(comparison.sameSeedEffect.difference, digits)} (SE ${fixed(comparison.sameSeedEffect.se, digits)}, 95% ${interval(comparison.sameSeedEffect.t95, digits)}) |`,
					...(comparison.sameSeedEffect.baselinePairedAtSeed === undefined ? [] : [`| the baseline's paired difference at that seed (one run per arm) | ${fixed(comparison.sameSeedEffect.baselinePairedAtSeed, digits)} |`]),
				]),
	];
	return `${lines.join("\n")}\n`;
}
