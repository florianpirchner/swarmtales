// SPDX-License-Identifier: Apache-2.0
/**
 * `defineMetric`: a metric whose `compute` is typed by the event schemas of its mechanic. Each payload is parsed
 * with its schema before `compute` sees it; a payload that does not parse makes the metric absent.
 */
import type { Envelope, EventSchemas, MetricDefinition } from "@swarmtales/contracts";
import type { Static } from "typebox";
import { Value } from "typebox/value";

/**
 * One event a typed metric reads: the envelope with its type and its payload as the mechanic's schemas state them.
 *
 * @public
 */
export type MetricEvent<E extends EventSchemas, K extends keyof E & string> = { readonly [T in K]: Envelope<T, Static<E[T]>> }[K];

/**
 * What `defineMetric` takes: a metric definition whose `compute` gets typed events.
 *
 * @public
 */
export interface MetricSpec<E extends EventSchemas, K extends keyof E & string> extends Omit<MetricDefinition, "reads" | "compute"> {
	/** The event types of the declaring mechanic that `compute` needs. */
	readonly reads: readonly K[];
	/**
	 * Computes the number of one run. A pure function: no clock, no random number, no state between two calls.
	 *
	 * @param events - The events of the types in `reads`, in log order, each payload parsed with its schema.
	 * @returns The number, or `undefined` for "absent": the run has no value, which is never the same as zero.
	 */
	compute(events: readonly MetricEvent<E, K>[]): number | undefined;
}

/**
 * Declares a metric of a mechanic, for the `metrics` of its head. `compute` is typed by the event schemas, and
 * every payload is parsed with its schema first.
 *
 * @param events - The event schemas of the mechanic, by event type (the `events` of its head).
 * @param metric - The id, the title, the unit, the event types it reads and the typed `compute`.
 * @returns The metric definition. Its `compute` drops an envelope of a type that is not in `reads`, and returns
 * `undefined` (absent) when a payload does not match its schema or the result is no finite number.
 * @example
 * ```ts
 * const events = { move_played: Type.Object({ cell: Type.Integer() }) };
 * const moves = defineMetric(events, { id: "moves", title: "Moves played", reads: ["move_played"], compute: (played) => (played.length === 0 ? undefined : played.length) });
 * ```
 *
 * @public
 */
export function defineMetric<E extends EventSchemas, const K extends keyof E & string>(events: E, metric: MetricSpec<E, K>): MetricDefinition {
	const reads: readonly string[] = metric.reads;
	const typed = (envelope: Envelope): envelope is MetricEvent<E, K> => {
		const schema = Object.hasOwn(events, envelope.type) ? events[envelope.type] : undefined;
		return schema !== undefined && Value.Check(schema, envelope.payload);
	};
	return {
		id: metric.id,
		title: metric.title,
		...(metric.unit === undefined ? {} : { unit: metric.unit }),
		reads,
		compute(envelopes) {
			const read = envelopes.filter((envelope) => reads.includes(envelope.type));
			const parsed = read.filter(typed);
			if (parsed.length < read.length) return undefined;
			const value = metric.compute(parsed);
			return value !== undefined && Number.isFinite(value) ? value : undefined;
		},
	};
}
