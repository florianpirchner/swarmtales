/**
 * Several runs side by side (brain against no brain on seeds 41/43/47, say): one row per run and
 * the spread of every number across the runs.
 */
import { numberField, stringField } from "./events.ts";
import type { RunModel } from "./load.ts";
import { usageTotals } from "./series.ts";

/** The log's line type of a run's end (`reason`, and whatever the story adds). */
export const RUN_END_EVENT = "run_end";

export interface CompareRow {
	readonly dir: string;
	readonly name: string;
	readonly story?: string;
	readonly seed?: number;
	/** Model per role and resident, from the genesis (else `000-run.json`). */
	readonly models: Readonly<Record<string, string>>;
	/** The run end's `reason`, when the log has a run end. */
	readonly result?: string;
	readonly ended: boolean;
	/** The sum of the log's usage lines (covered by the chain on a signed run), else the `usage.json` total. */
	readonly costUsd?: number;
	/** Where `costUsd` came from: `log` (the usage lines of `events.jsonl`) or `usage.json`. */
	readonly costSource?: "log" | "usage.json";
	/** The last minute of the log. */
	readonly minutes: number;
	readonly events: number;
	/** The caller's metrics (a score, a move quality from `analysis.json`), by name. */
	readonly metrics: Readonly<Record<string, number | undefined>>;
}

export interface Spread {
	readonly n: number;
	readonly mean: number;
	readonly min: number;
	readonly max: number;
	/** The sample standard deviation (0 for one run). */
	readonly stdev: number;
}

export interface Comparison {
	readonly rows: readonly CompareRow[];
	/** Per column (`costUsd`, `minutes`, `events` and each metric): the spread over the runs that have a value. */
	readonly spread: Readonly<Record<string, Spread | undefined>>;
}

/** A metric of a run; undefined when the run does not have it. */
export type RunMetric = (model: RunModel) => number | undefined;

function modelsOf(model: RunModel): Readonly<Record<string, string>> {
	if (model.genesis !== undefined) return model.genesis.models;
	return Object.fromEntries((model.meta?.agents ?? []).map((agent) => [agent.agent, [agent.provider, agent.model].filter((part) => part !== undefined).join("/")]));
}

/** The spread of a list of numbers, or undefined for an empty one. */
export function spreadOf(values: readonly number[]): Spread | undefined {
	if (values.length === 0) return undefined;
	const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
	const variance = values.length < 2 ? 0 : values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
	return { n: values.length, mean, min: Math.min(...values), max: Math.max(...values), stdev: Math.sqrt(variance) };
}

function rowOf(model: RunModel, metrics: Readonly<Record<string, RunMetric>>): CompareRow {
	const end = model.events.findLast((event) => event.type === RUN_END_EVENT);
	const start = model.events.find((event) => numberField(event, "seed") !== undefined);
	const seed = model.genesis?.seed ?? model.meta?.effective?.seed ?? (start === undefined ? undefined : numberField(start, "seed"));
	const story = model.genesis?.story ?? model.meta?.storyId;
	const result = end === undefined ? undefined : stringField(end, "reason");
	const logged = usageTotals(model.events).get("total");
	const fromFile = model.usage?.totals.costUsd;
	const cost = logged !== undefined && logged.requests > 0 ? { costUsd: logged.costUsd, costSource: "log" as const } : fromFile === undefined ? undefined : { costUsd: fromFile, costSource: "usage.json" as const };
	return {
		dir: model.dir,
		name: model.name,
		...(story === undefined ? {} : { story }),
		...(seed === undefined ? {} : { seed }),
		models: modelsOf(model),
		...(result === undefined ? {} : { result }),
		ended: end !== undefined,
		...cost,
		minutes: model.events.reduce((last, event) => Math.max(last, event.minute), 0),
		events: model.events.length,
		metrics: Object.fromEntries(Object.entries(metrics).map(([name, metric]) => [name, metric(model)])),
	};
}

/** One row per run and the spread of `costUsd`, `minutes`, `events` and every metric. */
export function compareRuns(models: readonly RunModel[], metrics: Readonly<Record<string, RunMetric>> = {}): Comparison {
	const rows = models.map((model) => rowOf(model, metrics));
	const column = (pick: (row: CompareRow) => number | undefined) => spreadOf(rows.map(pick).filter((value): value is number => value !== undefined));
	return {
		rows,
		spread: {
			costUsd: column((row) => row.costUsd),
			minutes: column((row) => row.minutes),
			events: column((row) => row.events),
			...Object.fromEntries(Object.keys(metrics).map((name) => [name, column((row) => row.metrics[name])])),
		},
	};
}
