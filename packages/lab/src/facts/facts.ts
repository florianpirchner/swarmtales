// SPDX-License-Identifier: Apache-2.0
/**
 * The facts of a run: every number is computed from the envelopes of its log. The metrics of the loaded mechanics
 * are computed by their own definitions; the generic keys (`run.*`, `models.*`) come from kernel events and the
 * records of the model driver. A thing that was not measured is `"absent"`, never zero.
 */
import type { Envelope, MetricDefinition, RunManifest } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Check } from "typebox/value";

/**
 * One value of a run: a number, or `"absent"` when the run has no value for the key.
 *
 * @public
 */
export type FactValue = number | "absent";

/**
 * The facts of one finished and verified run.
 *
 * @public
 */
export interface RunFacts {
	/** The id of the run (`manifest.run.id`). */
	readonly run: string;
	/** The sha256 of the canonical JSON of the manifest, as the genesis of the chain names it. */
	readonly manifestHash: string;
	/** The last signed head of the chain: the hash of the last line of the log. */
	readonly head: string;
	/** The id of the game. */
	readonly game: string;
	/** The seed of the world. */
	readonly seed: number;
	/** The index of the repetition. */
	readonly replicate: number;
	/** The arm of the experiment, when the run belongs to one. */
	readonly arm?: string;
	/** How the run ended: the reason of `run_ended`, its tick, and the limit when a limit ended it. */
	readonly end: { readonly reason: string; readonly limit?: string; readonly tick: number };
	/** The values by key: `<plugin id>.<metric id>` and the generic keys `run.*` and `models.*`. */
	readonly values: Readonly<Record<string, FactValue>>;
}

const KERNEL = "kernel";
/** The record source of the model driver (`RESIDENT_RECORDS.id` of `models`, which the lab may not import). */
const DRIVER = "@swarmtales/models/resident";

const Refusal = Type.Object({ code: Type.String({ description: "The refusal code" }) }, { description: "What the lab reads of a `tool_refused` payload" });
const tokens = (description: string) => Type.Integer({ minimum: 0, description });
const Usage = Type.Object(
	{ input: tokens("Input tokens"), output: tokens("Output tokens"), cacheRead: tokens("Tokens read from the cache"), cacheWrite: tokens("Tokens written to the cache"), costUsd: Type.Number({ minimum: 0, description: "The cost of the request in USD" }) },
	{ description: "What the lab reads of a `response` record of the model driver" },
);

const COUNTS = [["run.ticks", "tick_started"], ["run.activations", "activation_opened"], ["run.toolCalls", "tool_called"], ["run.toolRefusals", "tool_refused"]] as const;
const DRIVER_COUNTS = [["models.requests", "request"], ["models.failedRequests", "request_failed"], ["models.contextResets", "context_reset"]] as const;
const SUMS = [["models.inputTokens", "input"], ["models.outputTokens", "output"], ["models.cacheReadTokens", "cacheRead"], ["models.cacheWriteTokens", "cacheWrite"], ["models.costUsd", "costUsd"]] as const;

const count = (events: readonly Envelope[], type: string): number => events.filter((event) => event.type === type).length;

// The kernel's counts, and one row per refusal code that occurred. A code with no refusal has no row.
function runValues(events: readonly Envelope[]): Record<string, FactValue> {
	const kernel = events.filter((event) => event.source === KERNEL);
	const values: Record<string, FactValue> = Object.fromEntries(COUNTS.map(([key, type]) => [key, count(kernel, type)]));
	for (const event of kernel) {
		if (event.type !== "tool_refused" || !Check(Refusal, event.payload)) continue;
		const key = `run.refusals.${event.payload.code}`;
		values[key] = (typeof values[key] === "number" ? values[key] : 0) + 1;
	}
	return values;
}

// The counts and sums of the model driver. A run without a model driver has every key "absent"; a `response` the
// lab cannot read makes the sums "absent", because a sum over the rest would be a number nobody measured.
function modelValues(manifest: RunManifest, events: readonly Envelope[]): Record<string, FactValue> {
	const records = events.filter((event) => event.source === DRIVER);
	const driven = records.length > 0 || manifest.actors.some((actor) => actor.model !== undefined);
	const usages = records.filter((event) => event.type === "response").map((event) => (Check(Usage, event.payload) ? event.payload : undefined));
	const read = usages.filter((usage) => usage !== undefined);
	const whole = driven && read.length === usages.length;
	return Object.fromEntries([
		...DRIVER_COUNTS.map(([key, type]): [string, FactValue] => [key, driven ? count(records, type) : "absent"]),
		...SUMS.map(([key, field]): [string, FactValue] => [key, whole ? read.reduce((sum, usage) => sum + usage[field], 0) : "absent"]),
	]);
}

// The metrics of the mechanics the run loaded, each over the events of its own plugin that it reads.
function metricValues(manifest: RunManifest, events: readonly Envelope[], metrics: Readonly<Record<string, readonly MetricDefinition[]>>): Record<string, FactValue> {
	const values: Record<string, FactValue> = {};
	for (const plugin of manifest.plugins) {
		const source = `${plugin.package}/${plugin.id}`;
		const own = events.filter((event) => event.source === source);
		for (const metric of metrics[plugin.id] ?? []) {
			const value = metric.compute(own.filter((event) => metric.reads.includes(event.type)));
			values[`${plugin.id}.${metric.id}`] = value !== undefined && Number.isFinite(value) ? value : "absent";
		}
	}
	return values;
}

/**
 * Computes the values of a run from its parsed envelopes; no file access.
 *
 * @remarks
 * The rule of "absent". A metric whose mechanic the run did not load (its plugin id is not in `manifest.plugins`)
 * has no row. A metric whose mechanic is loaded and whose `compute` returns `undefined` (or no finite number) is
 * `"absent"`. A count that is truly zero is `0`. The `models.*` keys are `"absent"` when the run has no model
 * driver: no actor of the manifest has a model and the log holds no record of the driver.
 *
 * @param manifest - The manifest of the run.
 * @param events - The envelopes of the log, in log order.
 * @param metrics - The metric definitions by plugin id, as the heads of the installed mechanics declare them.
 * @returns The values by key; a generic key of the lab wins over a metric of the same key.
 * @example
 * ```ts
 * const values = factsOf(manifest, events, { "grid-game": gridGame.definition.head.metrics });
 * values["run.ticks"]; // 12
 * values["models.costUsd"]; // "absent" for a run of the fake driver
 * ```
 *
 * @public
 */
export function factsOf(manifest: RunManifest, events: readonly Envelope[], metrics: Readonly<Record<string, readonly MetricDefinition[]>>): RunFacts["values"] {
	const generic = { ...runValues(events), ...modelValues(manifest, events) };
	// The generic keys come first in the table and are written last, so no plugin named `run` or `models` replaces one.
	return { ...generic, ...metricValues(manifest, events, metrics), ...generic };
}
