// SPDX-License-Identifier: Apache-2.0
/**
 * An index over a run's events, built once per run (a 96-agent log has well over 100,000 lines):
 * by seq, by minute, by actor and by type, plus "the state at seq n" lookups for the scrubber.
 */
import type { RunEvent } from "./events.ts";

/**
 * The lookups over the events of one run.
 *
 * @public
 */
export interface RunIndex {
	/** The events in seq order. */
	readonly events: readonly RunEvent[];
	/** The highest minute any event carries (0 for an empty log). */
	readonly lastMinute: number;
	/** The first and last seq (0 for an empty log). */
	readonly firstSeq: number;
	/** The last seq (0 for an empty log). */
	readonly lastSeq: number;
	/** The event with a seq. */
	bySeq(seq: number): RunEvent | undefined;
	/** The events of one minute, in seq order. */
	atMinute(minute: number): readonly RunEvent[];
	/** The events of one actor, in seq order. */
	byActor(actor: string): readonly RunEvent[];
	/** The events of one type, in seq order. */
	byType(type: string): readonly RunEvent[];
	/** Every actor, in the order they first act. */
	actors(): readonly string[];
	/** Every event type, in the order they first occur. */
	types(): readonly string[];
	/** The first seq at or after the start of `minute`, or undefined past the end. */
	seqAtMinute(minute: number): number | undefined;
	/** The events up to and including `seq`. */
	upTo(seq: number): readonly RunEvent[];
	/** The last event of a type at or before `seq` (a standings line, a board state): the state the scrubber shows. */
	latest(type: string, seq: number): RunEvent | undefined;
}

function grouped<K>(events: readonly RunEvent[], key: (event: RunEvent) => K | undefined): ReadonlyMap<K, readonly RunEvent[]> {
	const groups = new Map<K, RunEvent[]>();
	for (const event of events) {
		const value = key(event);
		if (value === undefined) continue;
		const group = groups.get(value);
		if (group === undefined) groups.set(value, [event]);
		else group.push(event);
	}
	return groups;
}

// The number of events with `seq <= limit` in a list sorted by seq.
function countUpTo(events: readonly RunEvent[], limit: number): number {
	let low = 0;
	let high = events.length;
	while (low < high) {
		const middle = (low + high) >> 1;
		if ((events[middle]?.seq ?? Infinity) <= limit) low = middle + 1;
		else high = middle;
	}
	return low;
}

/**
 * Builds the index; the events are sorted by seq (a stable sort, so equal seqs keep their line order).
 *
 * @param input - The events of the run.
 * @returns The index.
 * @public
 */
export function indexRun(input: readonly RunEvent[]): RunIndex {
	const events = [...input].sort((left, right) => left.seq - right.seq);
	const bySeq = new Map(events.map((event) => [event.seq, event]));
	const byMinute = grouped(events, (event) => event.minute);
	const byActor = grouped(events, (event) => event.actor);
	const byType = grouped(events, (event) => event.type);
	const minutes = [...byMinute.keys()].sort((left, right) => left - right);
	return {
		events,
		lastMinute: minutes.at(-1) ?? 0,
		firstSeq: events[0]?.seq ?? 0,
		lastSeq: events.at(-1)?.seq ?? 0,
		bySeq: (seq) => bySeq.get(seq),
		atMinute: (minute) => byMinute.get(minute) ?? [],
		byActor: (actor) => byActor.get(actor) ?? [],
		byType: (type) => byType.get(type) ?? [],
		actors: () => [...byActor.keys()],
		types: () => [...byType.keys()],
		seqAtMinute: (minute) => {
			const first = minutes.find((value) => value >= minute);
			return first === undefined ? undefined : byMinute.get(first)?.[0]?.seq;
		},
		upTo: (seq) => events.slice(0, countUpTo(events, seq)),
		latest: (type, seq) => {
			const ofType = byType.get(type) ?? [];
			const count = countUpTo(ofType, seq);
			return count === 0 ? undefined : ofType[count - 1];
		},
	};
}
