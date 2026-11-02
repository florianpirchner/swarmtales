/**
 * The old run log's bus (moved from packages/engine/src/events.ts, step 18, team P2): numbers the
 * legacy events and fans them out to sinks. The old roles (agent runner, interpreter, weaver,
 * gamemaker) and the tests of the chronicle's sinks write through it until the run log is read from
 * the host's own lines.
 */
import type { ArenaEvent, EventSink, RecordedEvent } from "./events.ts";

/** Numbers events and fans them out to sinks. */
export class EventBus {
	readonly #sinks: EventSink[];
	readonly #minute: () => number;
	#seq = 0;

	constructor(sinks: readonly EventSink[], minute: () => number) {
		this.#sinks = [...sinks];
		this.#minute = minute;
	}

	/** Adds a sink that is built after the bus (e.g. the gamemaker). */
	subscribe(sink: EventSink): void {
		this.#sinks.push(sink);
	}

	/** Sequence number of the last event. */
	get seq(): number {
		return this.#seq;
	}

	emit(event: ArenaEvent): void {
		this.#seq += 1;
		const recorded: RecordedEvent = { ...event, seq: this.#seq, minute: this.#minute() };
		for (const sink of this.#sinks) sink.record(recorded);
	}
}
