// SPDX-License-Identifier: Apache-2.0
/**
 * The rows of the replay's event list. A line that belongs to an activation (a call, its answer, a record of the
 * driver, the closing) is not a row of its own: the activation is one row and its card lists those lines.
 */
import type { Activation, Call, RunEvent, RunProjection } from "@swarmtales/viewer-core";
import { positionOf } from "./replay-math.ts";

/** One row of the event list: a plain event, or an activation with everything attached to it. */
export interface TimelineRow {
	/** The seq of the row's event. */
	readonly seq: number;
	/** The event of the row; `activation_opened` for an activation. */
	readonly event: RunEvent;
	/** The activation the row stands for; a row of kind `director` is drawn as a Director's row. */
	readonly activation?: Activation;
}

/**
 * Builds the rows of the event list.
 *
 * @param events - The events of the run, in the order of the log.
 * @param projection - The projection of those events.
 * @returns One row per event that is not attached to an activation; the same events as rows for a run without activations.
 */
export function timelineOf(events: readonly RunEvent[], projection: RunProjection): readonly TimelineRow[] {
	const activations = new Map(projection.activations.map((activation) => [activation.seq, activation]));
	return events.filter((event) => !projection.attached.has(event.seq)).map((event) => {
		const activation = activations.get(event.seq);
		return { seq: event.seq, event, ...(activation === undefined ? {} : { activation }) };
	});
}

/**
 * Finds the row that shows a seq: the row of its activation for an attached line, else the last row at or before it.
 *
 * @param rows - The rows, in seq order.
 * @param projection - The projection the rows were built from.
 * @param seq - The seq to find.
 * @returns The position of the row in `rows`.
 */
export function rowAt(rows: readonly TimelineRow[], projection: RunProjection, seq: number): number {
	return positionOf(rows, projection.attached.get(seq) ?? seq);
}

/**
 * The calls a card and a row list for an activation: every call but a Director's `take`, whose answer is the firings.
 *
 * @param activation - The activation.
 * @returns Its acts, in order.
 */
export function actsOf(activation: Activation): readonly Call[] {
	return activation.calls.filter((call) => !call.take);
}

/**
 * One line for the row of an activation: what a Director was woken for, what the actor called, how it went.
 *
 * @param activation - The activation.
 * @returns The line.
 */
export function activationLine(activation: Activation): string {
	const acts = actsOf(activation).map((call) => call.as);
	const parts = [
		...(activation.firings.length === 0 ? [] : [`woken by ${activation.firings.map((firing) => `${firing.event} #${String(firing.seq)}`).join(", ")}`]),
		acts.length === 0 ? "no call" : `${activation.kind === "director" ? "acts" : "calls"}: ${acts.join(", ")}`,
		...(activation.outcome === "error" ? ["error"] : []),
	];
	return parts.join(" · ");
}

/**
 * Writes a value of the log (a payload, the arguments of a call) as one short line.
 *
 * @param value - The value.
 * @param limit - The longest text returned.
 * @returns The value as JSON, cut with an ellipsis when it is longer than `limit`.
 */
export function brief(value: unknown, limit = 200): string {
	const text = value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
	return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}
