// SPDX-License-Identifier: Apache-2.0
/**
 * The schemas of the kernel-facing values that are read from a file: actor ids, log envelopes, input notes and the
 * end of a run. Each interface is declared beside its meaning (`actor.ts`, `envelope.ts`, `../values.ts`); the
 * schema here follows it, and a type test holds the two together. Also the structural check of a parsed log.
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { ActorId } from "./actor.ts";

const text = (description: string): { readonly description: string } => ({ description });

const closed = (description: string): { readonly additionalProperties: false; readonly description: string } => ({ additionalProperties: false, description });

const ACTOR_ID_PATTERN = "^([a-z][a-z0-9-]*:[A-Za-z0-9_.-]+|human|script|kernel)$";

/**
 * The schema of an actor id: `<kind>:<name>` with an open kind, or one of the three reserved ids.
 *
 * @public
 */
export const ActorIdSchema = Type.Unsafe<ActorId>(
	Type.String({
		pattern: ACTOR_ID_PATTERN,
		description: "The id of an actor: `<kind>:<name>`, or one of the reserved ids `human`, `script` and `kernel`",
	}),
);

/**
 * The schema of `InputNote`: one line of an activation's inputs as shown.
 *
 * @public
 */
export const InputNoteSchema = Type.Object(
	{
		source: Type.String(text("The id of the plugin that gave the line")),
		kind: Type.Optional(Type.String(text("The kind of the line; the scheduler arranges the lines by it"))),
		text: Type.String(text("The text as shown")),
	},
	closed("One line of an activation's inputs as shown, tagged with the plugin that gave it"),
);

/**
 * The schema of `RunEnd`: how a run ended.
 *
 * @public
 */
export const RunEndSchema = Type.Object(
	{
		reason: Type.Union([Type.Literal("ticks"), Type.Literal("limit"), Type.Literal("error")], text("Why the run ended: the tick limit, a run limit of a plugin, or a failure")),
		tick: Type.Integer({ minimum: 0, description: "The tick the run ended in" }),
		limit: Type.Optional(Type.String(text("The id of the run limit that was reached, `<plugin id>.<limit id>`; set when `reason` is `limit`"))),
	},
	closed("How a run ended"),
);

// The fields of an envelope. A function, so the stored form gets schema objects of its own.
const envelopeFields = () => ({
	seq: Type.Integer({ minimum: 1, description: "The commit order: from 1, no gaps" }),
	tick: Type.Integer({ minimum: 0, description: "Logical time, from 0" }),
	source: Type.String(text("`kernel`, `driver`, or the canonical plugin name `<package>/<id>`")),
	type: Type.String(text("The event type: bare, unique within its source")),
	actor: Type.Unsafe<ActorId>(Type.String({ pattern: ACTOR_ID_PATTERN, description: "Who caused the chain this event belongs to" })),
	causedBy: Type.Optional(Type.Integer({ minimum: 1, description: "The seq this event is a consequence of; always smaller than `seq`" })),
	basis: Type.Optional(
		Type.Integer({ minimum: 0, description: "The highest seq the actor had seen when it decided; on `activation_opened` and `tool_called` only" }),
	),
	tool: Type.Optional(Type.String(text("The canonical tool name of the call this event was written in"))),
	audience: Type.Optional(Type.Array(Type.String(text("A grant name")), text("The grant names that may read the event; absent: everyone"))),
	payload: Type.Unknown(text("The event's data, as its declared schema describes it")),
});

/**
 * The schema of `Envelope`: one event of the log. The payload is open; the schema of its event type checks it.
 *
 * @public
 */
export const EnvelopeSchema = Type.Object(envelopeFields(), closed("One event of the log"));

/**
 * The schema of a line of `events.jsonl`: the envelope plus the sink's wall-clock stamp. The stamp is hashed and
 * never read by a plugin.
 *
 * @public
 */
export const StoredEnvelopeSchema = Type.Object(
	{ ...envelopeFields(), at: Type.String({ format: "date-time", description: "The wall-clock time the sink wrote the line at, as an ISO 8601 string" }) },
	closed("One line of `events.jsonl`: an event of the log with the wall-clock stamp of the sink"),
);

/** What the check of a log reads from a line. */
interface LogLine {
	readonly seq: number;
	readonly tick: number;
	readonly causedBy?: number;
	readonly basis?: number;
}

/**
 * Lists the faults of one line against its place and the ticks before it.
 *
 * @param entry - The line.
 * @param line - Its line number, from 1.
 * @param tickBefore - The highest tick of the lines before it.
 * @returns The reasons, empty when the line is sound.
 */
function lineFaults(entry: LogLine, line: number, tickBefore: number): readonly string[] {
	const faults: string[] = [];
	if (entry.seq !== line) faults.push(`seq is ${entry.seq}, the line number is ${line}`);
	if (entry.tick < tickBefore) faults.push(`tick falls from ${tickBefore} to ${entry.tick}`);
	if (entry.causedBy !== undefined && entry.causedBy >= entry.seq) faults.push(`causedBy ${entry.causedBy} is not smaller than seq ${entry.seq}`);
	if (entry.basis !== undefined && entry.basis >= entry.seq) faults.push(`basis ${entry.basis} is not smaller than seq ${entry.seq}`);
	return faults;
}

/**
 * Lists the structural faults of a parsed log: seq equals the line number, tick never falls, `causedBy` and `basis`
 * are smaller than seq. A line that is neither an envelope nor a stored envelope is a fault of its own and is left
 * out of the other checks.
 *
 * @param lines - The parsed lines of the log, in file order.
 * @returns One entry per fault with the line number (from 1) and the reason; empty when the log is sound.
 *
 * @example
 * ```ts
 * envelopeLogIssues(text.split("\n").filter(Boolean).map((line) => JSON.parse(line))); // [] when sound
 * ```
 *
 * @public
 */
export function envelopeLogIssues(lines: readonly unknown[]): readonly { readonly line: number; readonly reason: string }[] {
	const issues: { readonly line: number; readonly reason: string }[] = [];
	let tickBefore = 0;
	lines.forEach((entry, index) => {
		const line = index + 1;
		if (!Value.Check(StoredEnvelopeSchema, entry) && !Value.Check(EnvelopeSchema, entry)) {
			issues.push({ line, reason: "the line is not an envelope" });
			return;
		}
		for (const reason of lineFaults(entry, line, tickBefore)) issues.push({ line, reason });
		tickBefore = Math.max(tickBefore, entry.tick);
	});
	return issues;
}
