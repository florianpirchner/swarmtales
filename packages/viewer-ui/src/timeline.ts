// SPDX-License-Identifier: Apache-2.0
/**
 * The rows of the replay's event list. A line that belongs to an activation (a call, its answer, a record of the
 * driver, the closing) is not a row of its own: the activation is one row and its card lists those lines. A row
 * carries the marks of the Human Hand, of a resumed run and of a suspension.
 */
import type { Activation, Call, Pause, ResumeMarker, RunEvent, RunProjection, Suspension } from "@swarmtales/viewer-core";
import { positionOf } from "./replay-math.ts";

/** One row of the event list: a plain event, or an activation with everything attached to it. */
export interface TimelineRow {
	/** The seq of the row's event. */
	readonly seq: number;
	/** The event of the row; `activation_opened` for an activation. */
	readonly event: RunEvent;
	/** The activation the row stands for; a row of kind `director` is drawn as a Director's row. */
	readonly activation?: Activation;
	/** The call of the human the row stands for; the answer of the call is on the same row. */
	readonly human?: Call;
	/** The pause the row lies in: from `paused` to `resumed`, or to the end of a log that ends paused. */
	readonly pause?: Pause;
	/** The resume marker the row is. */
	readonly resume?: ResumeMarker;
	/** The suspension that greys the row: the row of `actor_suspended`, and each later row of that actor while it holds. */
	readonly suspended?: Suspension;
}

type Marks = Pick<TimelineRow, "human" | "pause" | "resume" | "suspended">;

const within = (span: { readonly seq: number; readonly endSeq?: number }, seq: number): boolean => span.seq <= seq && seq <= (span.endSeq ?? Infinity);

// The marks of one event; a mark that does not hold is left out.
function marksOf(event: RunEvent, projection: RunProjection): Marks {
	const human = projection.humanCalls.find((call) => call.seq === event.seq);
	const pause = projection.pauses.find((entry) => within(entry, event.seq));
	const resume = projection.resumes.find((entry) => entry.seq === event.seq);
	const suspended = projection.suspensions.find((entry) => entry.seq === event.seq || (entry.actor === event.actorId && within(entry, event.seq)));
	return { ...(human === undefined ? {} : { human }), ...(pause === undefined ? {} : { pause }), ...(resume === undefined ? {} : { resume }), ...(suspended === undefined ? {} : { suspended }) };
}

// The seq of the call of the human that `seq` answers.
function answered(projection: RunProjection, seq: number): number | undefined {
	return projection.humanCalls.find((call) => call.answer?.seq === seq)?.seq;
}

/**
 * Builds the rows of the event list.
 *
 * @param events - The events of the run, in the order of the log.
 * @param projection - The projection of those events.
 * @returns One row per event that is not attached to an activation and is not the answer to a call of the human; the same events as rows for a run without either.
 */
export function timelineOf(events: readonly RunEvent[], projection: RunProjection): readonly TimelineRow[] {
	const activations = new Map(projection.activations.map((activation) => [activation.seq, activation]));
	return events.filter((event) => !projection.attached.has(event.seq) && answered(projection, event.seq) === undefined).map((event) => {
		const activation = activations.get(event.seq);
		return { seq: event.seq, event, ...(activation === undefined ? {} : { activation }), ...marksOf(event, projection) };
	});
}

/**
 * Finds the row that shows a seq: the row of its activation for an attached line, the row of the call for an answer
 * to the human, else the last row at or before it.
 *
 * @param rows - The rows, in seq order.
 * @param projection - The projection the rows were built from.
 * @param seq - The seq to find.
 * @returns The position of the row in `rows`.
 */
export function rowAt(rows: readonly TimelineRow[], projection: RunProjection, seq: number): number {
	return positionOf(rows, projection.attached.get(seq) ?? answered(projection, seq) ?? seq);
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
 * The class names of a row's marks: `human`, `paused`, `resume`, `suspension` (the row of the event) or `suspended` (a row after it).
 *
 * @param row - The row.
 * @returns The names, each with a space before it.
 */
export function markClasses(row: TimelineRow): string {
	const marks = { human: row.human, paused: row.pause, resume: row.resume, [row.suspended?.seq === row.seq ? "suspension" : "suspended"]: row.suspended };
	return Object.entries(marks).filter(([, mark]) => mark !== undefined).map(([name]) => ` ${name}`).join("");
}

/**
 * One line for a call: its arguments and, once it is answered, the reply or the code and the detail of a refusal.
 *
 * @param call - The call.
 * @returns The line.
 */
export function callLine(call: Call): string {
	const { answer } = call;
	const reply = answer === undefined ? "" : ` → ${answer.ok ? answer.text : `${answer.code ?? "refused"}: ${answer.text}`}`;
	return `${brief(call.params)}${reply}`;
}

/**
 * One line for a pause: the tick it lies before, why, and where it ends.
 *
 * @param pause - The pause.
 * @returns The line.
 */
export function pauseLine(pause: Pause): string {
	return `before tick ${String(pause.tick)}${pause.reason === undefined ? "" : ` · “${pause.reason}”`} · ${pause.endSeq === undefined ? "the log ends paused" : `until #${String(pause.endSeq)}`}`;
}

/**
 * One line for a resume marker: the run the snapshot came from, the tick it went on from, the start of the snapshot's hash.
 *
 * @param marker - The marker.
 * @returns The line.
 */
export function resumeLine(marker: ResumeMarker): string {
	return `from ${marker.from} at tick ${String(marker.tick)} · snapshot ${marker.snapshotHash.slice(0, 12)}…`;
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
