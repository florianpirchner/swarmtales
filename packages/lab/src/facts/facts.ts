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
/** The record sources of the model driver and of a Director's asker (`RESIDENT_RECORDS.id` and `DIRECTOR_MODEL_RECORDS.id` of `models`, which the lab may not import). */
const DRIVERS: readonly string[] = ["@swarmtales/models/resident", "@swarmtales/models/director"];
/** The actor of the Human Hand, whose tool calls make a run human-influenced. */
const HUMAN = "human";
/**
 * The prefixes of the keys per actor: `models.requests.<actor id>`, `models.costUsd.<actor id>` and
 * `run.noCallActivations.<actor id>`.
 *
 * @public
 */
export const ACTOR_KEYS = { requests: "models.requests.", costUsd: "models.costUsd.", noCalls: "run.noCallActivations." } as const;

const Closed = Type.Object({ outcome: Type.String({ description: "How the activation went: `acted`, `no-call` or `error`" }) }, { description: "What the lab reads of an `activation_closed` payload" });
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

// The activations that closed without a call (A44), in the run and for every actor that had an activation closed,
// and the tool calls of the Human Hand.
function turnValues(kernel: readonly Envelope[]): [string, FactValue][] {
	const closed = kernel.filter((event) => event.type === "activation_closed");
	const idle = closed.filter((event) => Check(Closed, event.payload) && event.payload.outcome === "no-call");
	const actors = [...new Set(closed.map((event) => event.actor))];
	return [
		["run.noCallActivations", idle.length],
		["run.humanToolCalls", kernel.filter((event) => event.type === "tool_called" && event.actor === HUMAN).length],
		...actors.map((actor): [string, FactValue] => [`${ACTOR_KEYS.noCalls}${actor}`, idle.filter((event) => event.actor === actor).length]),
	];
}

// The kernel's counts, and one row per refusal code that occurred. A code with no refusal has no row.
function runValues(events: readonly Envelope[]): Record<string, FactValue> {
	const kernel = events.filter((event) => event.source === KERNEL);
	const values: Record<string, FactValue> = Object.fromEntries(COUNTS.map(([key, type]) => [key, count(kernel, type)]));
	for (const event of kernel) {
		if (event.type !== "tool_refused" || !Check(Refusal, event.payload)) continue;
		const key = `run.refusals.${event.payload.code}`;
		values[key] = (typeof values[key] === "number" ? values[key] : 0) + 1;
	}
	return { ...values, ...Object.fromEntries(turnValues(kernel)) };
}

// The sum of one field over the `response` records, or "absent" when one of them is not what the driver writes: a
// sum over the rest would be a number nobody measured.
function summed(responses: readonly Envelope[], field: (typeof SUMS)[number][1]): FactValue {
	let sum = 0;
	for (const { payload } of responses) {
		if (!Check(Usage, payload)) return "absent";
		sum += payload[field];
	}
	return sum;
}

// The requests and the cost of every actor that has a model or wrote a record: an actor that asked nothing reads 0.
function actorValues(manifest: RunManifest, records: readonly Envelope[]): [string, FactValue][] {
	const actors = new Set<string>([...manifest.actors.filter((actor) => actor.model !== undefined).map((actor) => actor.id), ...records.map((event) => event.actor)]);
	return [...actors].flatMap((actor): [string, FactValue][] => {
		const own = records.filter((event) => event.actor === actor);
		return [[`${ACTOR_KEYS.requests}${actor}`, count(own, "request")], [`${ACTOR_KEYS.costUsd}${actor}`, summed(own.filter((event) => event.type === "response"), "costUsd")]];
	});
}

// The counts and sums of the model driver and of the Directors' asker, for the run and per actor. A run without a
// model driver has every key of the run "absent" and no key per actor.
function modelValues(manifest: RunManifest, events: readonly Envelope[]): Record<string, FactValue> {
	const records = events.filter((event) => DRIVERS.includes(event.source));
	const driven = records.length > 0 || manifest.actors.some((actor) => actor.model !== undefined);
	const responses = records.filter((event) => event.type === "response");
	return Object.fromEntries([
		...DRIVER_COUNTS.map(([key, type]): [string, FactValue] => [key, driven ? count(records, type) : "absent"]),
		...SUMS.map(([key, field]): [string, FactValue] => [key, driven ? summed(responses, field) : "absent"]),
		...(driven ? actorValues(manifest, records) : []),
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
 * driver: no actor of the manifest has a model and the log holds no record of the driver. A run with one has two
 * more keys for every actor that has a model or wrote a record, `models.requests.<actor id>` and
 * `models.costUsd.<actor id>` ({@link ACTOR_KEYS}): an actor that made no request reads `0`. The records of a
 * Director's asker count like those of the model driver, in the keys of the run too.
 *
 * Two keys of the run come from the kernel's events whatever drives the actors: `run.noCallActivations` counts the
 * `activation_closed` events with the outcome `no-call` (turns that ended without a call), with one more key
 * `run.noCallActivations.<actor id>` for every actor that had an activation closed (`0` when each of its turns had
 * a call); `run.humanToolCalls` counts the `tool_called` events of the actor `human` (a run with one is
 * human-influenced).
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
