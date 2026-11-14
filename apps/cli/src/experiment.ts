// SPDX-License-Identifier: Apache-2.0
/**
 * `swt experiment run` and `swt experiment analyse`. The runner of the lab holds the caps and the state file; this
 * file gives it the player (one live run in process, with the spend ledger passed on) and the metric definitions
 * of the game's mechanics, and writes the files of a series that the lab only computes.
 */
import { existsSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { formatIssue, SwtError, type EventSink } from "@swarmtales/contracts";
import { analyse, parseExperimentSpec, parseNoiseFloor, planRuns, readExperimentState, readRun, renderSeriesReport, resolveRunFolder, runExperiment, RunRefused, type ExperimentSpec, type MetricTable, type PlannedRun, type PlayRun } from "@swarmtales/lab";
import { createKeyBroker, RESIDENT_RECORDS, type ModelSource } from "@swarmtales/models";
import { readEnv } from "./env.ts";
import { experimentNotFound } from "./errors.ts";
import { liveFlags } from "./flags.ts";
import { scanFolder } from "./leak-scan.ts";
import { runLive, type LiveResult } from "./live.ts";
import type { SourceTree } from "./tree.ts";
import type { CliIo } from "./main.ts";
import { jsonFile, metricTable } from "./report.ts";
import { resolveFile } from "./run.ts";

const LEAK = "SWT-X030";
// The spend ledger's refusal, and the words of the one that only a reservation gives: the run's cap did not fit, so
// nothing was started. An unreadable ledger may also show after a run (at its cost line), so it is charged as a failure.
const REFUSED = "SWT-C025";
const NO_ROOM = "has no room for a run";
// The codes with which the runner stops a series: at the experiment's cap, and after three failed runs or a leak.
const STOPS = ["SWT-E004", "SWT-E007"];

/**
 * What `swt experiment run` was asked for.
 *
 * @public
 */
export interface ExperimentInput {
	/** The spec file, absolute or relative to the current directory; its `game` is relative to the current directory too. */
	readonly spec: string;
	/** `--out`: the experiment's folder, which holds `experiment.json` and the run folders; `runs/<experiment id>` when absent. */
	readonly out: string | undefined;
	/** `--ledger`: the spend ledger every run's cap must fit under (`SWT-C025`). */
	readonly ledger?: string;
	/** The environment of the runs, as a plain record (`readEnv`). */
	readonly env: Readonly<Record<string, string | undefined>>;
	/** The model source of one run; the provider's when absent. A test passes the scripted one. */
	readonly source?: (run: PlannedRun) => ModelSource;
	/** Sinks beside the folder of every run. */
	readonly sinks?: readonly EventSink[];
	/** The commit and the state of the platform's source tree; asked from git by every run when absent. A test passes one. */
	readonly tree?: SourceTree;
}

// Every arm resolves before a run is paid for (`SWT-G041` for a param the family does not declare); the metrics are those of the mechanics of all arms.
async function metricsOf(spec: ExperimentSpec, io: CliIo): Promise<MetricTable> {
	const arms = await Promise.all(spec.arms.map((arm) => resolveFile({ file: spec.game, seed: spec.seeds[0], params: arm.params }, io, [RESIDENT_RECORDS])));
	return metricTable(arms.flatMap((arm) => arm.mechanics));
}

// Whether the ledger had no room for the run: it has no folder, and the refusal is the one of a reservation.
const neverStarted = (result: LiveResult): boolean => result.run === undefined && result.issues.some((issue) => issue.code === REFUSED && issue.summary.includes(NO_ROOM));

// The error the runner gets for a run that did not end in a readable folder. A leak comes first in it, so the runner
// reads its code and stops the series at once. A run that the ledger had no room for never started: the runner gets
// a `RunRefused` and charges nothing. Every other failure is charged the run's whole cap.
function failureOf(result: LiveResult): SwtError {
	const leaks = result.issues.filter((issue) => issue.code === LEAK);
	if (leaks.length === 0 && neverStarted(result)) return new RunRefused(result.issues);
	return new SwtError([...leaks, ...result.issues.filter((issue) => issue.code !== LEAK)]);
}

// The series' line of one run, and for a failed one the error the runner gets.
function outcomeOf(result: LiveResult): { readonly line: string; readonly failure?: SwtError } {
	if (result.code !== 4 && result.run !== undefined && result.spend !== undefined) return { line: `${result.run} ended with ${result.end?.limit ?? result.end?.reason ?? "no end"}, ${result.spend.costUsd.toFixed(4)} USD` };
	const codes = result.issues.map((issue) => issue.code).join(", ");
	return { line: `failed${result.run === undefined ? "" : ` in ${result.run}`} (${codes === "" ? "no issue" : codes})`, failure: failureOf(result) };
}

// One live run in process. Its own lines are not printed: the series prints one line per run.
function player(spec: ExperimentSpec, directory: string, input: ExperimentInput, io: CliIo, seen: { leak: boolean }): PlayRun {
	const flags = liveFlags({ provider: spec.model.provider, model: spec.model.id, purpose: spec.purpose, ...(spec.model.thinking === undefined ? {} : { thinking: spec.model.thinking }), ...(input.ledger === undefined ? {} : { ledger: input.ledger }) });
	const { redact } = createKeyBroker(input.env);
	return async (run, capUsd, experiment) => {
		const more = { ...(input.source === undefined ? {} : { source: input.source(run) }), ...(input.sinks === undefined ? {} : { sinks: input.sinks }), ...(input.tree === undefined ? {} : { tree: input.tree }) };
		const live = { ...flags, file: spec.game, seed: run.seed, params: run.params, out: directory, json: false, budget: capUsd, replicate: run.replicate, env: input.env, experiment: { ...experiment, arm: run.arm }, ...more };
		const result = await runLive(live, { ...io, out: () => undefined, err: () => undefined });
		const { line, failure } = outcomeOf(result);
		io.out(redact(`run ${String(run.index)} ${run.arm} seed ${String(run.seed)} replicate ${String(run.replicate)}: ${line}`));
		if (failure !== undefined) {
			seen.leak ||= failure.code === LEAK;
			throw failure;
		}
		return { directory: resolve(io.cwd, result.run ?? ""), costUsd: result.spend?.costUsd ?? capUsd };
	};
}

/**
 * Runs the plan of an experiment spec, resumable: prints the plan and its estimate, then plays every open run of
 * the plan as a live run in process (`runLive`) into the experiment's folder, one printed line per run. The caps
 * are the runner's (`runExperiment` of the lab): the per-run cap is the run's `--budget`, and with `ledger` every
 * run reserves it in the spend ledger. A run that leaks rejects with `SWT-X030`, which stops the series. A run the
 * ledger has no room for (`SWT-C025`, refused before any call) costs the experiment nothing and has no record: the series stops with
 * that error and plays the run with the next call, once the ledger has room.
 *
 * @param input - The spec file, the experiment's folder, the ledger, the environment, and for a test the model source.
 * @param io - The current directory, the clock and the two outputs.
 * @returns The exit code: 0 the plan is complete; 4 a run leaked a key value; 6 the series stopped at the
 * experiment's cap (`SWT-E004`) or after three failed runs (`SWT-E007`), and continues with the same command.
 * @throws SwtError `SWT-C024` no spec file; `SWT-E001` a spec that does not match its schema; what `resolveFile`
 * reports for the game and the params of an arm (`SWT-G041`); `SWT-C022` an unknown thinking level; `SWT-E003`,
 * `SWT-E002`, `SWT-E005`, `SWT-E006`, `SWT-E010` of the runner; `SWT-C025` the spend ledger refused a run. The command exits with 1 then.
 * @example
 * ```ts
 * const code = await experimentRun({ spec: "games/quarry/experiments/open-quarries.json", out: "../runs/quarry/quarry-open-quarries", ledger: "games/m2-ledger.jsonl", env: readEnv() }, io);
 * ```
 *
 * @public
 */
export async function experimentRun(input: ExperimentInput, io: CliIo): Promise<number> {
	const file = resolve(io.cwd, input.spec);
	if (!existsSync(file)) throw new SwtError(experimentNotFound({ path: file, what: "experiment spec" }));
	const spec = parseExperimentSpec(jsonFile(file), file);
	const directory = resolve(io.cwd, input.out ?? join("runs", spec.id));
	const metrics = await metricsOf(spec, io);
	const plan = planRuns(spec);
	const estimate = plan.reduce((sum, run) => sum + (spec.budget.estimateUsdPerRun[run.arm] ?? spec.budget.perRunUsd), 0);
	io.out(`${spec.id}: ${String(plan.length)} runs, in this order (arm/seed/replicate): ${plan.map((run) => `${run.arm}/${String(run.seed)}/${String(run.replicate)}`).join(" ")}`);
	io.out(`estimate: ${estimate.toFixed(2)} USD of the cap ${spec.budget.totalUsd.toFixed(2)} USD, at most ${spec.budget.perRunUsd.toFixed(2)} USD per run`);
	const seen = { leak: false };
	try {
		const state = await runExperiment(spec, player(spec, directory, input, io, seen), { directory, metrics });
		io.out(`complete: ${String(state.runs.length)} runs, ${String(state.runs.filter((run) => run.status === "included").length)} included, ${state.spentUsd.toFixed(4)} USD; analyse with \`swt experiment analyse ${relative(io.cwd, directory)}\``);
		return 0;
	} catch (error) {
		if (!(error instanceof SwtError) || !STOPS.includes(error.code)) throw error;
		for (const issue of error.issues) io.err(formatIssue(issue));
		return seen.leak ? 4 : 6;
	}
}

/**
 * Analyses a finished experiment: reads the state file and the facts of every run that was not stopped, computes
 * the results (`analyse` of the lab) and writes `results.json`, `values.csv` (the long table of the values) and the
 * series `README.md` into the experiment's folder, which is then scanned for a held key value.
 *
 * @param experiment - The experiment's folder, absolute or relative to the current directory.
 * @param io - The current directory and the two outputs.
 * @returns The exit code: 0 the pass rule is kept, or the spec has none; 3 not kept; 7 no verdict (too few runs);
 * 4 a file of the folder holds a key value.
 * @throws SwtError `SWT-C024` a folder without `experiment.json`; `SWT-E001` an unreadable state or baseline file;
 * `SWT-E006` a run folder that does not verify; `SWT-E010`, `SWT-E011` of the analysis. The command exits with 1 then.
 * @example
 * ```ts
 * const code = await experimentAnalyse("../runs/quarry/quarry-open-quarries", io);
 * ```
 *
 * @public
 */
export async function experimentAnalyse(experiment: string, io: CliIo): Promise<number> {
	const directory = resolve(io.cwd, experiment);
	const state = readExperimentState(directory);
	if (state === undefined) throw new SwtError(experimentNotFound({ path: directory, what: "experiment state `experiment.json`" }));
	const { spec } = state;
	const metrics = await metricsOf(spec, io);
	const facts = state.runs.filter((run) => run.status !== "stopped").map((run) => readRun(resolveRunFolder(directory, run.directory), metrics));
	const baseline = spec.baseline === undefined ? undefined : parseNoiseFloor(jsonFile(resolve(io.cwd, spec.baseline)), spec.baseline);
	const results = analyse(state, facts, baseline);
	writeFileSync(join(directory, "results.json"), `${JSON.stringify(results, null, "\t")}\n`);
	writeFileSync(join(directory, "values.csv"), ["run,metric,value", ...results.values.map((row) => `${row.run},${row.metric},${String(row.value)}`)].join("\n").concat("\n"));
	writeFileSync(join(directory, "README.md"), renderSeriesReport(results, spec));
	const broker = createKeyBroker(io.env ?? readEnv());
	const leak = scanFolder(directory, (text) => broker.leaks(text));
	for (const issue of leak) io.err(formatIssue(issue));
	const { pass } = results;
	io.out(pass === undefined ? `${spec.id}: no pass rule; ${String(results.estimates.length)} estimates in ${join(relative(io.cwd, directory), "results.json")}` : `${spec.id}: ${pass.verdict} (estimate ${String(pass.estimate)}, n ${String(pass.n)}): ${pass.rule}`);
	if (leak.length > 0) return 4;
	return pass === undefined || pass.verdict === "kept" ? 0 : pass.verdict === "not-kept" ? 3 : 7;
}
