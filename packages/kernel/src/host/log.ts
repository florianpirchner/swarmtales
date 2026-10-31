/**
 * The append-only event log and the synchronous bus. Dispatch order is fixed: events in log order;
 * for each event, the mechanics' listeners in load order (each in declaration order), then the
 * sinks. An event emitted while code runs is queued and dispatched once that code returns, so a
 * tool's events all land before anyone reacts to them, and the log order equals the dispatch order.
 */
import type { Actor, EventEnvelope, EventListener, EventLogView } from "@swarmtales/contracts";

/** Who is acting and which event caused the code that runs. */
export interface Frame {
	readonly actor: Actor;
	readonly cause?: number;
}

/** A cascade longer than this is a loop between listeners. */
const MAX_CASCADE = 100_000;

export class EventBus implements EventLogView {
	readonly #events: EventEnvelope[];
	readonly #queue: EventEnvelope[] = [];
	readonly #frames: Frame[] = [];
	readonly #listeners: EventListener[] = [];
	readonly #sinks: ((event: EventEnvelope) => void)[] = [];
	readonly #minute: () => number;
	#depth = 0;
	#draining = false;

	/** `prefix` is the log of a resumed run; it is not dispatched again. */
	constructor(minute: () => number, prefix: readonly EventEnvelope[] = []) {
		this.#minute = minute;
		this.#events = [...prefix];
		prefix.forEach((event, index) => {
			if (event.seq !== index + 1) throw new Error(`event log: seq ${String(event.seq)} at position ${String(index + 1)}`);
		});
	}

	get length(): number {
		return this.#events.length;
	}

	get lastSeq(): number {
		return this.#events.length;
	}

	all(): readonly EventEnvelope[] {
		return this.#events;
	}

	since(seq: number): readonly EventEnvelope[] {
		return this.#events.slice(Math.max(0, seq));
	}

	ofType(source: string, type: string): readonly EventEnvelope[] {
		return this.#events.filter((event) => event.source === source && event.type === type);
	}

	/** The frame code runs in now (`host` outside any). */
	frame(): Frame {
		return this.#frames.at(-1) ?? { actor: "host" };
	}

	listen(listeners: readonly EventListener[]): void {
		this.#listeners.push(...listeners);
	}

	subscribe(sink: (event: EventEnvelope) => void): void {
		this.#sinks.push(sink);
	}

	/** Appends an event in the current frame; dispatches at once when no code is running. */
	emit(source: string, type: string, payload: unknown): EventEnvelope {
		const frame = this.#frames.at(-1) ?? { actor: "host" };
		const base = { seq: this.#events.length + 1, minute: this.#minute(), type, source, actor: frame.actor, payload };
		const event: EventEnvelope = frame.cause === undefined ? base : { ...base, causedBy: frame.cause };
		this.#events.push(event);
		this.#queue.push(event);
		if (this.#depth === 0) this.#drain();
		return event;
	}

	/** Runs code in a frame; the events it emits are dispatched when the outermost frame returns. */
	run<T>(frame: Frame, code: () => T): T {
		this.#frames.push(frame);
		this.#depth += 1;
		try {
			return code();
		} finally {
			this.#depth -= 1;
			this.#frames.pop();
			if (this.#depth === 0) this.#drain();
		}
	}

	#drain(): void {
		if (this.#draining) return;
		this.#draining = true;
		let dispatched = 0;
		try {
			for (let event = this.#queue.shift(); event !== undefined; event = this.#queue.shift()) {
				dispatched += 1;
				if (dispatched > MAX_CASCADE) throw new Error(`event bus: more than ${String(MAX_CASCADE)} events in one cascade`);
				const current = event;
				for (const listener of this.#listeners) {
					if (listener.source !== current.source || listener.type !== current.type) continue;
					this.#frames.push({ actor: current.actor, cause: current.seq });
					this.#depth += 1;
					try {
						listener.handle(current);
					} finally {
						this.#depth -= 1;
						this.#frames.pop();
					}
				}
				for (const sink of this.#sinks) sink(current);
			}
		} finally {
			this.#draining = false;
		}
	}
}
