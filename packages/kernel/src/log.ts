// SPDX-License-Identifier: Apache-2.0
/**
 * Part 1: the append-only log with its frames, listeners and sinks. One delivery mode: an event is queued when it
 * is appended and delivered when the outermost frame returns, or at once when no frame is open; in log order of
 * the events, per event to its listeners in the order they were added, then to the sinks. What a listener emits
 * queues behind, so the log order equals the delivery order.
 */
import { SwtError, type Envelope, type EventSink } from "@swarmtales/contracts";
import { kernelFailed, misfit, sinkThrew } from "./errors.ts";
import type { Frame, Log, PartFactories } from "./parts.ts";

/** A cascade longer than this is a loop between listeners. */
const MAX_CASCADE = 100_000;

interface Heard {
	readonly source: string;
	readonly type: string;
	readonly run: (event: Envelope) => void;
}

/** What the functions of the log share. */
interface LogState {
	readonly events: Envelope[];
	readonly queue: Envelope[];
	readonly frames: Frame[];
	readonly listeners: Heard[];
	readonly sinks: EventSink[];
	draining: boolean;
	/** After a failure: listeners are off, and once the closing event is written nothing more is taken. */
	failed: "listeners-off" | "closed" | undefined;
}

function checkedPrefix(prefix: readonly Envelope[]): Envelope[] {
	prefix.forEach((event, index) => {
		if (event.seq === index + 1) return;
		throw new SwtError(misfit(`the log to resume from has seq ${String(event.seq)} at place ${String(index + 1)}`, "Resume from a log whose seq counts from 1 without a gap."));
	});
	return [...prefix];
}

// Each listener of the event, in a frame of the event it reacts to.
function tell(state: LogState, event: Envelope): void {
	for (const listener of [...state.listeners]) {
		if (listener.source !== event.source || listener.type !== event.type) continue;
		state.frames.push({ actor: event.actor, causedBy: event.seq });
		try {
			listener.run(event);
		} finally {
			state.frames.pop();
		}
	}
}

// Every sink gets the event; one that throws gets no later event, and the first throw leaves as `SWT-R020`.
function write(state: LogState, event: Envelope): void {
	const thrown: unknown[] = [];
	for (const sink of [...state.sinks]) {
		try {
			sink.write(event);
		} catch (error) {
			state.sinks.splice(state.sinks.indexOf(sink), 1);
			thrown.push(error);
		}
	}
	if (thrown.length > 0) throw new SwtError(sinkThrew(thrown[0]), { cause: thrown[0] });
}

function drain(state: LogState): void {
	if (state.draining) return;
	state.draining = true;
	let delivered = 0;
	try {
		for (let event = state.queue.shift(); event !== undefined; event = state.queue.shift()) {
			delivered += 1;
			if (delivered > MAX_CASCADE) throw new RangeError(`the log: more than ${String(MAX_CASCADE)} events in one cascade of listeners`);
			try {
				if (state.failed === undefined) tell(state, event);
			} finally {
				write(state, event);
			}
		}
	} finally {
		state.draining = false;
	}
}

function envelope(state: LogState, tick: number, source: string, type: string, payload: unknown, basis: number | undefined, audience: readonly string[] | undefined): Envelope {
	const frame = state.frames.at(-1);
	return {
		seq: state.events.length + 1,
		tick,
		source,
		type,
		actor: frame?.actor ?? "kernel",
		...(frame?.causedBy === undefined ? {} : { causedBy: frame.causedBy }),
		...(basis === undefined ? {} : { basis }),
		...(frame?.tool === undefined ? {} : { tool: frame.tool }),
		...(audience === undefined ? {} : { audience: [...audience] }),
		payload,
	};
}

function fail(state: LogState, last: () => void): void {
	if (state.failed !== undefined) return;
	state.failed = "listeners-off";
	state.draining = false;
	try {
		drain(state);
		last();
	} finally {
		state.failed = "closed";
	}
}

/**
 * Creates the log of a run.
 *
 * @param tick - Gives the tick an event is stamped with.
 * @param audienceOf - The audience an event of a source and type gets when its emitter names none.
 * @param prefix - The log of a resumed run; it is not delivered again.
 * @returns The log.
 * @throws SwtError `SWT-R002` when the seq of `prefix` does not count from 1 without a gap. In use: `SWT-R001`
 * from `emit` after `fail`, `SWT-R020` when a sink throws.
 */
export const createLog = ((tick, audienceOf, prefix = []) => {
	const state: LogState = { events: checkedPrefix(prefix), queue: [], frames: [], listeners: [], sinks: [], draining: false, failed: undefined };
	const log: Log = {
		get length() {
			return state.events.length;
		},
		all: () => state.events,
		since: (seq) => state.events.slice(Math.max(0, seq)),
		ofType: (source, type) => state.events.filter((event) => event.source === source && event.type === type),
		frame: () => state.frames.at(-1) ?? { actor: "kernel" },
		listen: (source, type, run) => {
			state.listeners.push({ source, type, run });
		},
		addSink: (sink) => {
			state.sinks.push(sink);
		},
		emit: (source, type, payload, extra = {}) => {
			if (state.failed === "closed") throw new SwtError(kernelFailed());
			const event = envelope(state, tick(), source, type, payload, extra.basis, extra.audience ?? audienceOf(source, type));
			state.events.push(event);
			state.queue.push(event);
			if (state.frames.length === 0 || state.failed !== undefined) drain(state);
			return event;
		},
		run: (frame, code) => {
			state.frames.push(frame);
			try {
				return code();
			} finally {
				state.frames.pop();
				if (state.frames.length === 0) drain(state);
			}
		},
		fail: (last) => {
			fail(state, last);
		},
	};
	return log;
}) satisfies PartFactories["createLog"];
