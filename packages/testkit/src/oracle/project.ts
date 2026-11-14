// SPDX-License-Identifier: Apache-2.0
/**
 * Projections of an oracle file and of a run's log: the events of named sources and types, with named fields, in
 * order. An oracle that cannot be replayed whole (its setup has mechanics this platform does not have yet) still
 * proves a ported rule this way: the same selectors are laid over the oracle's timeline and over the log of a run
 * that reaches the same situation, and the two lists are compared byte for byte.
 */
import type { Envelope } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { OracleEntry } from "./format.ts";

/**
 * Which events a projection keeps.
 *
 * @public
 */
export interface ProjectionSelector {
	/** The mechanic id as the oracle names it (`puzzles`); in a log it is the last part of the canonical source. */
	readonly source: string;
	/** The event type. */
	readonly type: string;
	/** The payload fields that are kept, in this order; the whole payload when left out. */
	readonly fields?: readonly string[];
}

/**
 * One event of a projection.
 *
 * @public
 */
export interface ProjectedEvent {
	/** The mechanic id. */
	readonly source: string;
	/** The event type. */
	readonly type: string;
	/** The payload, cut to the selector's fields. */
	readonly payload: unknown;
}

/**
 * Where two projections first differ.
 *
 * @public
 */
export interface ProjectionDifference {
	/** The position in both lists, from 0. */
	readonly index: number;
	/** The event of the oracle at that position; absent when the oracle's list is shorter. */
	readonly expected?: ProjectedEvent;
	/** The event of the run at that position; absent when the run's list is shorter. */
	readonly actual?: ProjectedEvent;
}

const Fields = Type.Record(Type.String(), Type.Unknown(), { description: "A payload that is an object." });

function project(source: string, type: string, payload: unknown, selectors: readonly ProjectionSelector[]): readonly ProjectedEvent[] {
	const selector = selectors.find((candidate) => candidate.source === source && candidate.type === type);
	if (selector === undefined) return [];
	if (selector.fields === undefined || !Value.Check(Fields, payload)) return [{ source, type, payload }];
	return [{ source, type, payload: Object.fromEntries(selector.fields.filter((field) => field in payload).map((field) => [field, payload[field]])) }];
}

/**
 * Projects the timeline of an oracle file.
 *
 * @param timeline - The entries, or a part of them.
 * @param selectors - The events to keep.
 * @returns The kept events, in timeline order.
 * @example
 * ```ts
 * const deals = projectOracle(readOracle(path).timeline, [{ source: "puzzles", type: "fragments_dealt" }]);
 * ```
 *
 * @public
 */
export function projectOracle(timeline: readonly OracleEntry[], selectors: readonly ProjectionSelector[]): readonly ProjectedEvent[] {
	return timeline.flatMap((entry) => (entry.k === "event" ? project(entry.source, entry.type, entry.payload, selectors) : []));
}

/**
 * Projects the log of a run on this platform. The source of an event is read as its mechanic id, the last part of
 * the canonical name (`@swarmtales/mechanic-puzzles/puzzles` reads `puzzles`).
 *
 * @param events - The log, or a part of it.
 * @param selectors - The events to keep.
 * @returns The kept events, in log order.
 *
 * @public
 */
export function projectLog(events: readonly Envelope[], selectors: readonly ProjectionSelector[]): readonly ProjectedEvent[] {
	return events.flatMap((event) => project(event.source.slice(event.source.lastIndexOf("/") + 1), event.type, event.payload, selectors));
}

/**
 * The events an oracle wrote in one go: from the given event up to the next entry that is no event (a minute, a
 * turn, a call). It is how the consequences of one cause are cut out of a timeline.
 *
 * @param timeline - The entries.
 * @param source - The mechanic id of the first event.
 * @param type - The type of the first event.
 * @param occurrence - Which such event, from 0; the first when left out.
 * @returns The index of the first event in the timeline and the entries of the burst; index -1 and no entries when there is no such event.
 *
 * @public
 */
export function eventBurst(timeline: readonly OracleEntry[], source: string, type: string, occurrence = 0): { readonly index: number; readonly entries: readonly OracleEntry[] } {
	const starts = timeline.flatMap((entry, index) => (entry.k === "event" && entry.source === source && entry.type === type ? [index] : []));
	const index = starts[occurrence];
	if (index === undefined) return { index: -1, entries: [] };
	const end = timeline.findIndex((entry, at) => at > index && entry.k !== "event");
	return { index, entries: timeline.slice(index, end === -1 ? timeline.length : end) };
}

/**
 * Compares two projections in order, each event as its JSON text: the key order of a payload counts.
 *
 * @param expected - The projection of the oracle.
 * @param actual - The projection of the run.
 * @returns The first position where they differ; `undefined` when they are equal.
 *
 * @public
 */
export function projectionDifference(expected: readonly ProjectedEvent[], actual: readonly ProjectedEvent[]): ProjectionDifference | undefined {
	for (let index = 0; index < Math.max(expected.length, actual.length); index++) {
		const [left, right] = [expected[index], actual[index]];
		if (left !== undefined && right !== undefined && JSON.stringify(left) === JSON.stringify(right)) continue;
		return { index, ...(left === undefined ? {} : { expected: left }), ...(right === undefined ? {} : { actual: right }) };
	}
	return undefined;
}
