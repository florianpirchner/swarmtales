/**
 * The run log's event types moved to `@swarmtales/contracts` (step 18, item 7c); the old engine's
 * own bus stays here until the engine goes.
 */
import type { ArenaEvent, EventSink, RecordedEvent } from "@swarmtales/contracts";

export { FATE_TRIGGERS } from "@swarmtales/contracts";
export type { ArenaEvent, ArenaEventType, AuditTag, BoardPostKind, CoreMotiveDrive, CoreMotiveTrait, EventSink, FateShiftKind, FateTrigger, FragmentHolding, Goal, RecordedEvent, StandingRow, TribunalPlanner } from "@swarmtales/contracts";

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

	/**
	 * Hands the recorded prefix of a resumed run to the current sinks, before
	 * anything else is emitted; numbering continues after its last event.
	 */
	replay(events: readonly RecordedEvent[]): void {
		if (this.#seq !== 0) throw new Error("A prefix can only be replayed before the first event");
		for (const event of events) {
			if (event.seq !== this.#seq + 1) throw new Error(`Prefix event ${event.seq} does not follow ${this.#seq}`);
			this.#seq = event.seq;
			for (const sink of this.#sinks) {
				if (sink.replay === undefined) sink.record(event);
				else sink.replay(event);
			}
		}
	}

	emit(event: ArenaEvent): void {
		this.#seq += 1;
		const recorded: RecordedEvent = { ...event, seq: this.#seq, minute: this.#minute() };
		for (const sink of this.#sinks) sink.record(recorded);
	}
}
