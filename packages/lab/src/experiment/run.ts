// SPDX-License-Identifier: Apache-2.0
/**
 * The runner of an experiment: plays the plan with an injected player, holds every cap by code before a run
 * starts, and rewrites the state file after every run, so a stopped experiment continues without replaying.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsonHash } from "@swarmtales/chain";
import { type MetricDefinition, type RunManifest, RunManifestSchema, SwtError } from "@swarmtales/contracts";
import { MANIFEST_FILE } from "@swarmtales/runlog";
import { type Static, Type } from "typebox";
import { badFile, badRunFolder, capReached, estimateAboveCap, type LabError, notComparable, seriesBroken } from "../errors.ts";
import type { RunFacts } from "../facts/facts.ts";
import { readRun } from "../facts/read.ts";
import { difference } from "./compare.ts";
import { checkMetrics, openRuns, type PlannedRun, planRuns, replacementOf } from "./plan.ts";
import { type ExperimentSpec, ExperimentSpecSchema, parseLabFile } from "./spec.ts";

/** The name of the state file in the experiment's folder. */
export const STATE_FILE = "experiment.json";
/** The code of a leak (`apps/cli`); a player that throws it stops the experiment at once. */
const LEAK = "SWT-X030";
/** The id of the cost meter's limit (`models`, which the lab may not import). */
const COST_LIMIT = "models.budget";
const BROKEN = 3;
const EPSILON = 1e-9;

const Planned = Type.Object(
	{
		index: Type.Integer({ minimum: 0, description: "The place in the plan" }),
		arm: Type.String({ description: "The arm" }),
		seed: Type.Integer({ minimum: 0, description: "The seed" }),
		replicate: Type.Integer({ minimum: 0, description: "The replicate" }),
		params: Type.Record(Type.String(), Type.Unknown({ description: "The value of one param" }), { description: "The param overrides of the arm" }),
	},
	{ additionalProperties: false, description: "A planned run" },
);
const Played = Type.Object(
	{
		planned: Planned,
		directory: Type.String({ description: "The run folder; empty when the player failed before it named one" }),
		status: Type.Union([Type.Literal("included"), Type.Literal("excluded"), Type.Literal("stopped")], { description: "Whether the run counts: included, excluded by a rule of the spec, or stopped (failed, unreadable or not comparable)" }),
		reason: Type.Optional(Type.String({ description: "The exclusion rule, or why the run is stopped" })),
		replaces: Type.Optional(Type.Integer({ minimum: 0, description: "The plan index of the excluded run this one replaces" })),
		costUsd: Type.Number({ minimum: 0, description: "What the run cost; its whole cap when the player failed" }),
	},
	{ additionalProperties: false, description: "The record of one played run" },
);

/**
 * The schema of the state file `experiment.json` of an experiment's folder.
 *
 * @public
 */
export const ExperimentStateSchema = Type.Object(
	{
		spec: ExperimentSpecSchema,
		specHash: Type.String({ description: "The sha256 of the canonical JSON of the spec" }),
		runs: Type.Array(Played, { description: "The records, in the order the runs ended" }),
		spentUsd: Type.Number({ minimum: 0, description: "The sum of the costs of the records" }),
		code: Type.Optional(
			Type.Object(
				{ commit: Type.String({ description: "The commit of the platform's source tree, or `unknown`" }), kernelRevision: Type.Integer({ minimum: 1, description: "The runtime revision of the kernel" }) },
				{ additionalProperties: false, description: "The code that played the first run that was read" },
			),
		),
	},
	{ additionalProperties: false, description: "The state of an experiment: its spec and the record of every run played so far" },
);

/**
 * The record of one played run.
 *
 * @public
 */
export type RunRecord = Readonly<Static<typeof Played>>;

/**
 * The state of an experiment.
 *
 * @public
 */
export type ExperimentState = Readonly<Static<typeof ExperimentStateSchema>>;

/**
 * What a player reports about one run: its folder and its cost.
 *
 * @public
 */
export interface RunOutcome {
	/** The run folder. */
	readonly directory: string;
	/** What the run cost, in USD. */
	readonly costUsd: number;
}

/**
 * Plays one planned run under a cost cap and writes its run folder, with the experiment in the manifest. Injected
 * by the command line; the lab does not know how a run is played. A rejection is a failed run; a rejection with
 * an `SwtError` of the code `SWT-X030` (a leak) stops the experiment at once.
 *
 * @public
 */
export type PlayRun = (run: PlannedRun, capUsd: number, experiment: { readonly id: string; readonly specHash: string }) => Promise<RunOutcome>;

/**
 * The metric definitions by plugin id, as the heads of the installed mechanics declare them.
 *
 * @public
 */
export type MetricTable = Readonly<Record<string, readonly MetricDefinition[]>>;

/**
 * Where an experiment keeps its state, and the metrics its runs are read with.
 *
 * @public
 */
export interface ExperimentOptions {
	/** The experiment's folder; `experiment.json` is written into it. */
	readonly directory: string;
	/** The metric definitions by plugin id. */
	readonly metrics: MetricTable;
}

function parsed(directory: string, name: string): unknown {
	try {
		const value: unknown = JSON.parse(readFileSync(join(directory, name), "utf8"));
		return value;
	} catch {
		throw badFile("file", "it cannot be read as JSON", join(directory, name));
	}
}

function manifestOf(directory: string): RunManifest {
	return parseLabFile(RunManifestSchema, parsed(directory, MANIFEST_FILE), "run manifest", join(directory, MANIFEST_FILE));
}

/**
 * Reads the state file of an experiment's folder.
 *
 * @param directory - The experiment's folder.
 * @returns The state, or `undefined` when the folder has no state file yet.
 * @throws LabError `SWT-E001` when the file is not JSON or does not match `ExperimentStateSchema`.
 * @public
 */
export function readExperimentState(directory: string): ExperimentState | undefined {
	if (!existsSync(join(directory, STATE_FILE))) return undefined;
	return parseLabFile(ExperimentStateSchema, parsed(directory, STATE_FILE), "experiment state", join(directory, STATE_FILE));
}

// The first rule of the spec's exclusions that holds for the facts of a run.
function exclusion(spec: ExperimentSpec, facts: RunFacts): string | undefined {
	const positive = ([, value]: readonly [string, number | "absent"]) => typeof value === "number" && value > 0;
	const values = Object.entries(facts.values);
	const holds = {
		"failed-request": values.some((entry) => entry[0] === "models.failedRequests" && positive(entry)),
		"missed-decision": values.some((entry) => /\.missed[A-Z]\w*$/.test(entry[0]) && positive(entry)),
		"cost-cap": facts.end.limit === COST_LIMIT,
		"error-end": facts.end.reason === "error",
	};
	return spec.exclusions.find((rule) => holds[rule]);
}

class Series {
	state: ExperimentState;
	stop: LabError | undefined;
	private readonly play: PlayRun;
	private readonly options: ExperimentOptions;
	private readonly planLength: number;
	private readonly queue: PlannedRun[];
	private readonly firsts = new Map<string, RunManifest>();
	private inFlight = 0;
	private failures = 0;

	constructor(state: ExperimentState, play: PlayRun, options: ExperimentOptions) {
		this.state = state;
		this.play = play;
		this.options = options;
		this.planLength = planRuns(state.spec).length;
		this.queue = openRuns(state.spec, state.runs);
		for (const record of state.runs) if (record.status !== "stopped") this.first(manifestOf(record.directory));
		// The failures in a row at the end of an earlier call still count: a continue of a broken series pays one run, not three.
		this.failures = state.runs.length - 1 - state.runs.findLastIndex((record) => record.status === "included");
	}

	private first(manifest: RunManifest): void {
		const arm = manifest.experiment?.arm ?? "";
		if (!this.firsts.has(arm)) this.firsts.set(arm, manifest);
	}

	// Why a finished run cannot belong to this series: another experiment, another planned run, or not comparable.
	private mismatch(planned: PlannedRun, manifest: RunManifest, directory: string): LabError | undefined {
		const { spec, specHash } = this.state;
		if (manifest.experiment?.id !== spec.id || manifest.experiment.specHash !== specHash) return badRunFolder(directory, `the run belongs to another experiment: its manifest does not name "${spec.id}" with the spec hash ${specHash}`);
		if (manifest.experiment.arm !== planned.arm || manifest.seed !== planned.seed || manifest.replicate !== planned.replicate)
			return badRunFolder(directory, `the run is not the planned one (arm "${planned.arm}", seed ${planned.seed}, replicate ${planned.replicate})`);
		for (const other of this.firsts.values()) {
			const field = difference(manifest, other);
			if (field !== undefined) return notComparable(manifest.run.id, other.run.id, field);
		}
		return undefined;
	}

	private judge(base: Omit<RunRecord, "status" | "reason">): RunRecord {
		let facts: RunFacts;
		try {
			facts = readRun(base.directory, this.options.metrics);
		} catch (error) {
			// Any failure is a record: a run that was paid for never leaves the state file, whatever broke while reading it.
			return { ...base, status: "stopped", reason: error instanceof Error ? error.message : String(error) };
		}
		const manifest = manifestOf(base.directory);
		const fatal = this.mismatch(base.planned, manifest, base.directory);
		if (fatal !== undefined) {
			this.stop ??= fatal;
			return { ...base, status: "stopped", reason: fatal.message };
		}
		this.first(manifest);
		this.state = { ...this.state, code: this.state.code ?? { commit: manifest.kernel.commit ?? "unknown", kernelRevision: manifest.kernel.revision } };
		const rule = exclusion(this.state.spec, facts);
		return rule === undefined ? { ...base, status: "included" } : { ...base, status: "excluded", reason: rule };
	}

	private async one(planned: PlannedRun): Promise<RunRecord> {
		const { spec, specHash } = this.state;
		const replaces = planned.index >= this.planLength ? { replaces: planned.index - this.planLength } : {};
		let outcome: RunOutcome;
		try {
			outcome = await this.play(planned, spec.budget.perRunUsd, { id: spec.id, specHash });
		} catch (error) {
			if (error instanceof SwtError && error.code === LEAK) this.stop ??= seriesBroken(`the run of arm "${planned.arm}" at seed ${planned.seed} reported a leak`);
			return { planned, directory: "", status: "stopped", reason: error instanceof Error ? error.message : String(error), costUsd: spec.budget.perRunUsd, ...replaces };
		}
		// A cost that is no amount would make every later sum pass the cap check: the run counts with its whole cap.
		if (!Number.isFinite(outcome.costUsd) || outcome.costUsd < 0) return { planned, directory: outcome.directory, status: "stopped", reason: `the player reported the cost ${String(outcome.costUsd)}, which is no amount`, costUsd: spec.budget.perRunUsd, ...replaces };
		return this.judge({ planned, ...outcome, ...replaces });
	}

	private add(record: RunRecord): void {
		this.state = { ...this.state, runs: [...this.state.runs, record], spentUsd: this.state.spentUsd + record.costUsd };
		mkdirSync(this.options.directory, { recursive: true });
		writeFileSync(join(this.options.directory, STATE_FILE), `${JSON.stringify(this.state, null, "\t")}\n`);
		if (record.status === "excluded" && record.replaces === undefined) this.queue.unshift(replacementOf(record.planned, this.planLength));
		this.failures = record.status === "included" ? 0 : this.failures + 1;
		if (this.failures >= BROKEN) this.stop ??= seriesBroken(`${BROKEN} runs in a row were excluded or failed; the last: ${record.reason ?? "no reason"}`);
	}

	async worker(): Promise<void> {
		const { perRunUsd, totalUsd } = this.state.spec.budget;
		while (this.stop === undefined) {
			const planned = this.queue.shift();
			if (planned === undefined) return;
			const reservedUsd = this.inFlight * perRunUsd;
			if (this.state.spentUsd + reservedUsd + perRunUsd > totalUsd + EPSILON) {
				this.stop = capReached(this.state.spentUsd, reservedUsd, perRunUsd, totalUsd);
				return;
			}
			this.inFlight++;
			const record = await this.one(planned);
			this.inFlight--;
			this.add(record);
		}
	}
}

/**
 * Runs the plan of a spec, resumable: a run that has a record in `experiment.json` is not played again.
 *
 * @remarks
 * Every cap is checked by code before a run starts. A run starts only when what is spent, plus the per-run cap of
 * every run in flight, plus its own per-run cap fits under `budget.totalUsd`; no run is stopped half way. A run
 * whose facts meet a rule of `exclusions` is replaced once (replicate plus 100). A player that fails, or reports a
 * cost that is no amount, counts with its whole cap. A run whose folder cannot be read keeps a record with its cost.
 * Of a state file only the records are trusted: the spec is the caller's and what is spent is the sum of the records.
 * The failures in a row at the end of an earlier call count on. When the experiment stops, the runs in flight end first and the state file holds them.
 *
 * @param spec - The experiment spec.
 * @param play - Plays one planned run.
 * @param options - The experiment's folder (for `experiment.json`) and the metric definitions by plugin id.
 * @returns The state after the last run of the plan.
 * @throws LabError `SWT-E010` a metric of the spec that no mechanic of `options.metrics` exports; `SWT-E003` the
 * estimate of the plan is above the cap; `SWT-E004` the cap was reached before a run; `SWT-E005` a run does not
 * compare with the first of its arm or of another arm; `SWT-E006` the state file is of another spec, or a run
 * folder names another experiment or another planned run; `SWT-E007` three runs in a row were excluded or failed,
 * or a run reported a leak; `SWT-E001` an unreadable state file.
 * @example
 * ```ts
 * const state = await runExperiment(spec, play, { directory: "runs/quarry-open-quarries", metrics });
 * console.log(state.runs.length, state.spentUsd);
 * ```
 *
 * @public
 */
export async function runExperiment(spec: ExperimentSpec, play: PlayRun, options: ExperimentOptions): Promise<ExperimentState> {
	const specHash = jsonHash(spec);
	checkMetrics(spec, Object.entries(options.metrics).flatMap(([plugin, metrics]) => metrics.map((metric) => `${plugin}.${metric.id}`)), true);
	const estimate = planRuns(spec).reduce((sum, run) => sum + (spec.budget.estimateUsdPerRun[run.arm] ?? spec.budget.perRunUsd), 0);
	if (estimate > spec.budget.totalUsd + EPSILON) throw estimateAboveCap(estimate, spec.budget.totalUsd);
	const saved = readExperimentState(options.directory);
	if (saved !== undefined && saved.specHash !== specHash) throw badRunFolder(options.directory, `${STATE_FILE} was written for another spec (hash ${saved.specHash}, not ${specHash})`);
	// Of a saved state only the records count: the spec is the caller's (its hash was just checked) and what is spent is their sum, so an edited file cannot raise a cap.
	const runs = saved?.runs ?? [];
	const series = new Series({ ...saved, spec, specHash, runs, spentUsd: runs.reduce((sum, record) => sum + record.costUsd, 0) }, play, options);
	await Promise.all(Array.from({ length: spec.concurrency ?? 1 }, () => series.worker()));
	if (series.stop !== undefined) throw series.stop;
	return series.state;
}
