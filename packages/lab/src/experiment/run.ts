// SPDX-License-Identifier: Apache-2.0
/**
 * The runner of an experiment: plays the plan with an injected player, holds every cap by code before a run
 * starts, and rewrites the state file after every run, so a stopped experiment continues without replaying.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { type MetricDefinition, type RunManifest, SwtError } from "@swarmtales/contracts";
import { badRunFolder, capReached, estimateAboveCap, notComparable, RunRefused, seriesBroken } from "../errors.ts";
import type { RunFacts } from "../facts/facts.ts";
import { readRun } from "../facts/read.ts";
import { difference, planMismatch } from "./compare.ts";
import { bindingHash, checkMetrics, openRuns, type PlannedRun, planRuns, replacementOf } from "./plan.ts";
import type { ExperimentSpec } from "./spec.ts";
import { type ExperimentState, manifestOf, readExperimentState, resolveRunFolder, type RunRecord, STATE_FILE } from "./state.ts";

/** The code of a leak (`apps/cli`); a player that throws it stops the experiment at once. */
const LEAK = "SWT-X030";
/** The id of the cost meter's limit (`models`, which the lab may not import). */
const COST_LIMIT = "models.budget";
const BROKEN = 3;
const EPSILON = 1e-9;

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
 * by the command line; the lab does not know how a run is played. A rejection is a failed run, charged with its
 * whole cap; a rejection with an `SwtError` of the code `SWT-X030` (a leak) stops the experiment at once. A rejection
 * with a {@link RunRefused} says that the run was refused before any model call (the spend ledger has no room): it is
 * no run, costs nothing, leaves no record, and the experiment stops with that error.
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
	stop: SwtError | undefined;
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
		for (const record of state.runs) if (record.status !== "stopped") this.first(manifestOf(resolveRunFolder(options.directory, record.directory)));
		// The failures in a row at the end of an earlier call still count: a continue of a broken series pays one run, not three.
		this.failures = state.runs.length - 1 - state.runs.findLastIndex((record) => record.status === "included");
	}

	private first(manifest: RunManifest): void {
		const arm = manifest.experiment?.arm ?? "";
		if (!this.firsts.has(arm)) this.firsts.set(arm, manifest);
	}

	// Why a finished run cannot belong to this series: another experiment, another planned run, not played as the spec plans it, or not comparable.
	private mismatch(planned: PlannedRun, manifest: RunManifest, directory: string): SwtError | undefined {
		const { spec, specHash } = this.state;
		if (manifest.experiment?.id !== spec.id || manifest.experiment.specHash !== specHash) return badRunFolder(directory, `the run belongs to another experiment: its manifest does not name "${spec.id}" with the spec hash ${specHash}`);
		if (manifest.experiment.arm !== planned.arm || manifest.seed !== planned.seed || manifest.replicate !== planned.replicate)
			return badRunFolder(directory, `the run is not the planned one (arm "${planned.arm}", seed ${planned.seed}, replicate ${planned.replicate})`);
		for (const other of this.firsts.values()) {
			const field = difference(manifest, other);
			if (field !== undefined) return notComparable(manifest.run.id, other.run.id, field);
		}
		return planMismatch(spec, planned, manifest);
	}

	private judge(base: Omit<RunRecord, "status" | "reason">): RunRecord {
		const folder = resolveRunFolder(this.options.directory, base.directory);
		let facts: RunFacts;
		try {
			facts = readRun(folder, this.options.metrics);
		} catch (error) {
			// Any failure is a record: a run that was paid for never leaves the state file, whatever broke while reading it.
			return { ...base, status: "stopped", reason: error instanceof Error ? error.message : String(error) };
		}
		const manifest = manifestOf(folder);
		const fatal = this.mismatch(base.planned, manifest, folder);
		if (fatal !== undefined) {
			this.stop ??= fatal;
			return { ...base, status: "stopped", reason: fatal.message };
		}
		this.first(manifest);
		this.state = { ...this.state, code: this.state.code ?? { commit: manifest.kernel.commit ?? "unknown", kernelRevision: manifest.kernel.revision } };
		const rule = exclusion(this.state.spec, facts);
		return rule === undefined ? { ...base, status: "included" } : { ...base, status: "excluded", reason: rule };
	}

	// A player that rejected: no record when the run was refused before any call, a leak stops the series, and any failure is charged the whole cap.
	private failed(base: Omit<RunRecord, "status" | "reason">, error: unknown): RunRecord | undefined {
		if (error instanceof RunRefused) {
			this.stop ??= error;
			return undefined;
		}
		if (error instanceof SwtError && error.code === LEAK) this.stop ??= seriesBroken(`the run of arm "${base.planned.arm}" at seed ${base.planned.seed} reported a leak`);
		return { ...base, status: "stopped", reason: error instanceof Error ? error.message : String(error) };
	}

	// The record of one run; none when the spend ledger refused the run before any call (it cost nothing and stays open).
	private async one(planned: PlannedRun): Promise<RunRecord | undefined> {
		const { spec, specHash } = this.state;
		const replaces = planned.index >= this.planLength ? { replaces: planned.index - this.planLength } : {};
		let outcome: RunOutcome;
		try {
			outcome = await this.play(planned, spec.budget.perRunUsd, { id: spec.id, specHash });
		} catch (error) {
			return this.failed({ planned, directory: "", costUsd: spec.budget.perRunUsd, ...replaces }, error);
		}
		// A cost that is no amount would make every later sum pass the cap check: the run counts with its whole cap.
		const directory = relative(resolve(this.options.directory), resolve(outcome.directory));
		if (!Number.isFinite(outcome.costUsd) || outcome.costUsd < 0) return { planned, directory, status: "stopped", reason: `the player reported the cost ${String(outcome.costUsd)}, which is no amount`, costUsd: spec.budget.perRunUsd, ...replaces };
		return this.judge({ planned, directory, costUsd: outcome.costUsd, ...replaces });
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
			// A run may report more than its cap (the meter stops before the next request, not inside one): once one did, every run reserves the largest cost seen.
			const needUsd = Math.max(perRunUsd, ...this.state.runs.map((record) => record.costUsd));
			const reservedUsd = this.inFlight * needUsd;
			if (this.state.spentUsd + reservedUsd + needUsd > totalUsd + EPSILON) {
				this.stop = capReached(this.state.spentUsd, reservedUsd, needUsd, totalUsd);
				return;
			}
			this.inFlight++;
			const record = await this.one(planned);
			this.inFlight--;
			if (record !== undefined) this.add(record);
		}
	}
}

/**
 * Runs the plan of a spec, resumable: a run that has a record in `experiment.json` is not played again.
 *
 * @remarks
 * Every cap is checked by code before a run starts. A run starts only when what is spent, plus the per-run cap of
 * every run in flight, plus its own per-run cap fits under `budget.totalUsd`; no run is stopped half way. The runner
 * cannot stop a player inside a run: when a run reported more than its cap, every later run (and every run in flight)
 * reserves the largest cost a record holds in place of the per-run cap, so one overrun is not repeated into the total. A run
 * whose facts meet a rule of `exclusions` is replaced once (replicate plus 100). A player that fails, or reports a
 * cost that is no amount, counts with its whole cap; a run that was refused before any call (the player rejects
 * with a `RunRefused`) costs nothing, has no record and stops the experiment with that error, so it is played by the next call.
 * A run whose folder cannot be read keeps a record with its cost. A record names its run folder relative to
 * `options.directory` (an absolute path of an earlier state file still reads), so a moved folder is continued.
 * A finished run is checked against the spec: its game has the params of its arm, its actors the model of the spec, its budget is `budget.perRunUsd`.
 * Of a state file only the records are trusted: the spec is the caller's and what is spent is the sum of the records. The file
 * is bound to the spec without `budget` and `concurrency` (decision A18), so a series continues under a changed cap or pace.
 * The failures in a row at the end of an earlier call count on. When the experiment stops, the runs in flight end first and the state file holds them.
 *
 * @param spec - The experiment spec.
 * @param play - Plays one planned run.
 * @param options - The experiment's folder (for `experiment.json`) and the metric definitions by plugin id.
 * @returns The state after the last run of the plan.
 * @throws LabError `SWT-E010` a metric of the spec that no mechanic of `options.metrics` exports; `SWT-E003` the
 * estimate of the plan is above the cap; `SWT-E004` the cap was reached before a run; `SWT-E005` a run does not
 * compare with the first of its arm or of another arm, or was not played with the model, the params of its arm and
 * the per-run cap of the spec; `SWT-E002` the game of a run declares no param its arm overrides; `SWT-E001` a spec
 * that lists a seed twice; `SWT-E006` the state file is of another spec, or a run
 * folder names another experiment or another planned run; `SWT-E007` three runs in a row were excluded or failed,
 * or a run reported a leak; `SWT-E001` an unreadable state file.
 * @throws RunRefused the player's, when a run was refused before any model call (`SWT-C025` of the spend ledger).
 * @example
 * ```ts
 * const state = await runExperiment(spec, play, { directory: "runs/quarry-open-quarries", metrics });
 * console.log(state.runs.length, state.spentUsd);
 * ```
 *
 * @public
 */
export async function runExperiment(spec: ExperimentSpec, play: PlayRun, options: ExperimentOptions): Promise<ExperimentState> {
	const specHash = bindingHash(spec);
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
