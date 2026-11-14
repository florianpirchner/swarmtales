// SPDX-License-Identifier: Apache-2.0
/**
 * Several runs side by side (brain against no brain on seeds 41/43/47, say): one row per run and
 * the spread of every number across the runs.
 */
import { numberField, stringField } from "./events.ts";
import type { RunModel } from "./load.ts";
import { usageTotals } from "./series.ts";

/** The log's line type of a run's end (`reason`, and whatever the story adds). */
export const RUN_END_EVENT = "run_end";

/**
 * One run of a comparison.
 *
 * @public
 */
export interface CompareRow {
	/** The folder of the run. */
	readonly dir: string;
	/** The name of the run. */
	readonly name: string;
	/** The name of the game the run played. */
	readonly story?: string;
	/** The seed of the run. */
	readonly seed?: number;
	/** Model per role and resident, from the genesis (else `000-run.json`). */
	readonly models: Readonly<Record<string, string>>;
	/** The run end's `reason`, when the log has a run end. */
	readonly result?: string;
	/** Whether the log has a run end. */
	readonly ended: boolean;
	/** The sum of the log's usage lines (covered by the chain on a signed run), else the `usage.json` total. */
	readonly costUsd?: number;
	/** Where `costUsd` came from: `log` (the usage lines of `events.jsonl`) or `usage.json`. */
	readonly costSource?: "log" | "usage.json";
	/** The last minute of the log. */
	readonly minutes: number;
	/** The number of events. */
	readonly events: number;
	/** The caller's metrics (a score, a move quality from `analysis.json`), by name. */
	readonly metrics: Readonly<Record<string, number | undefined>>;
}

/**
 * How a number spreads over the runs that have it.
 *
 * @public
 */
export interface Spread {
	/** The number of runs that have a value. */
	readonly n: number;
	/** The mean. */
	readonly mean: number;
	/** The least value. */
	readonly min: number;
	/** The largest value. */
	readonly max: number;
	/** The sample standard deviation (0 for one run). */
	readonly stdev: number;
}

/**
 * Several runs side by side.
 *
 * @public
 */
export interface Comparison {
	/** One row per run. */
	readonly rows: readonly CompareRow[];
	/** Per column (`costUsd`, `minutes`, `events` and each metric): the spread over the runs that have a value. */
	readonly spread: Readonly<Record<string, Spread | undefined>>;
}

/**
 * A metric of a run; undefined when the run does not have it.
 *
 * @public
 */
export type RunMetric = (model: RunModel) => number | undefined;

function modelsOf(model: RunModel): Readonly<Record<string, string>> {
	// Only the genesis of an old run (version 1) names the models; a run of the new platform has them in its header.
	if (model.genesis?.version === 1) return model.genesis.models;
	return Object.fromEntries((model.meta?.agents ?? []).map((agent) => [agent.agent, [agent.provider, agent.model].filter((part) => part !== undefined).join("/")]));
}

/**
 * The spread of a list of numbers, or undefined for an empty one.
 *
 * @param values - The numbers.
 * @returns The count, mean, least, most and sample standard deviation; `undefined` for no number.
 */
export function spreadOf(values: readonly number[]): Spread | undefined {
	if (values.length === 0) return undefined;
	const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
	const variance = values.length < 2 ? 0 : values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
	return { n: values.length, mean, min: Math.min(...values), max: Math.max(...values), stdev: Math.sqrt(variance) };
}

function seedOf(model: RunModel): number | undefined {
	const start = model.events.find((event) => numberField(event, "seed") !== undefined);
	const stated = model.genesis?.version === 1 ? model.genesis.seed : undefined;
	return stated ?? model.meta?.effective?.seed ?? (start === undefined ? undefined : numberField(start, "seed"));
}

function gameOf(model: RunModel): string | undefined {
	return (model.genesis?.version === 1 ? model.genesis.story : undefined) ?? model.meta?.storyId;
}

// The cost of a run: the sum of the log's usage lines, else the total of `usage.json`.
function costOf(model: RunModel): Pick<CompareRow, "costUsd" | "costSource"> {
	const logged = usageTotals(model.events).get("total");
	if (logged !== undefined && logged.requests > 0) return { costUsd: logged.costUsd, costSource: "log" };
	const fromFile = model.usage?.totals.costUsd;
	return fromFile === undefined ? {} : { costUsd: fromFile, costSource: "usage.json" };
}

function rowOf(model: RunModel, metrics: Readonly<Record<string, RunMetric>>): CompareRow {
	const end = model.events.findLast((event) => event.type === RUN_END_EVENT);
	const seed = seedOf(model);
	const story = gameOf(model);
	const result = end === undefined ? undefined : stringField(end, "reason");
	return {
		dir: model.dir,
		name: model.name,
		...(story === undefined ? {} : { story }),
		...(seed === undefined ? {} : { seed }),
		models: modelsOf(model),
		...(result === undefined ? {} : { result }),
		ended: end !== undefined,
		...costOf(model),
		minutes: model.events.reduce((last, event) => Math.max(last, event.minute), 0),
		events: model.events.length,
		metrics: Object.fromEntries(Object.entries(metrics).map(([name, metric]) => [name, metric(model)])),
	};
}

/**
 * One row per run and the spread of `costUsd`, `minutes`, `events` and every metric.
 *
 * @param models - The loaded runs.
 * @param metrics - The caller's metrics, by name.
 * @returns The rows and the spread of every number column.
 * @public
 */
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
