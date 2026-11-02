/**
 * What the gamemaker overseer reads from the host's log (step 18, team C2): the events its report
 * shows "since your last look", the ones its resident tracks follow and its own notes. The log is
 * the host's (`ctx.log`, filtered by audience); each envelope is read in the flat shape the old
 * gamemaker got from the old bus (`{ type, ...payload, seq, minute }`, the legacy adapter's
 * `flatten`) and checked with Typebox, so a payload that is not what the report expects is left out
 * instead of trusted. The schemas are the old engine's (chronicle's `RecordedEventSchema`) for just
 * these types; a compile-time check keeps them assignable to `RecordedEvent`.
 */
import { Type, type Static } from "typebox";
import { Compile } from "typebox/compile";
import { type EventEnvelope, type EventLogView, FATE_TRIGGERS, STATEMENT_LABELS, STATEMENT_SOURCES, type RecordedEvent } from "@swarmtales/contracts";

const Id = Type.String();
const Ids = Type.Array(Type.String());
const Int = Type.Integer();
const Base = { seq: Type.Integer({ minimum: 1 }), minute: Type.Integer({ minimum: 0 }) };

function event<T extends string, P extends Parameters<typeof Type.Object>[0]>(type: T, properties: P) {
	return Type.Object({ ...Base, type: Type.Literal(type), ...properties });
}

/** The event types the old report (`recentLines`, `labelLines`) and the tracks (`record`) read; every other type showed nothing. */
const RecentEventSchema = Type.Union([
	event("text", { agent: Id, text: Type.String() }),
	event("tool_call", { agent: Id, tool: Type.String(), args: Type.Unknown() }),
	event("submission", { agent: Id, level: Int, outcome: Type.String(), deltaPoints: Type.Number() }),
	event("level_up", { agent: Id, from: Int, to: Int }),
	event("board_post", {
		postSeq: Int,
		author: Id,
		text: Type.String(),
		kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")]),
	}),
	event("dm_sent", { from: Id, to: Id, text: Type.String(), number: Type.Optional(Int) }),
	event("blame", {
		caller: Id,
		accused: Id,
		dm: Int,
		claim: Int,
		outcome: Type.Union([Type.Literal("upheld"), Type.Literal("rejected")]),
		payer: Id,
		penalty: Int,
		reason: Type.Optional(Type.String()),
		post: Int,
		judge: Type.Optional(Type.String()),
		whisper: Type.Optional(Type.String()),
	}),
	event("group_created", { group: Id, founder: Id, name: Type.String() }),
	event("group_membership", {
		group: Id,
		agent: Id,
		change: Type.Union([Type.Literal("added"), Type.Literal("removed"), Type.Literal("left")]),
		by: Id,
	}),
	event("group_post", { group: Id, author: Id, postSeq: Int, text: Type.String() }),
	event("treasury_deposit", { group: Id, agent: Id, amount: Type.Number(), receipt: Type.String() }),
	event("treasury_withdrawal", { group: Id, treasurer: Id, to: Id, amount: Type.Number(), receipt: Type.String() }),
	event("transfer", { from: Id, to: Id, amount: Type.Number(), memo: Type.String(), txId: Type.String() }),
	event("gamemaker_defied", { agent: Id, note: Type.Optional(Int), reason: Type.String() }),
	event("interpretation", {
		ref: Int,
		agent: Id,
		source: Type.Enum(STATEMENT_SOURCES),
		labels: Type.Array(Type.Enum(STATEMENT_LABELS)),
		targets: Ids,
		classifier: Type.String(),
	}),
	event("fate_shift", {
		agent: Id,
		kind: Type.Union([Type.Literal("soft"), Type.Literal("hard"), Type.Literal("act")]),
		text: Type.String(),
		reason: Type.String(),
		evidence: Type.Array(Int),
		triggers: Type.Array(Type.Enum(FATE_TRIGGERS)),
	}),
]);

export type RecentEvent = Static<typeof RecentEventSchema>;

/** Keeps the schema in step with the engine's event union: a field the report reads cannot drift. */
const isRecorded = (recent: RecentEvent): RecordedEvent => recent;

const recentCheck = Compile(RecentEventSchema);

/** The types `RecentEventSchema` knows, so other events are skipped without a schema check. */
const RECENT_TYPES: ReadonlySet<string> = new Set(RecentEventSchema.anyOf.map((member) => member.properties.type.const));

const NoteSchema = Type.Object({ to: Type.String(), author: Type.String(), text: Type.String(), number: Type.Optional(Int) });
const noteCheck = Compile(NoteSchema);

const ToolCalledSchema = Type.Object({ tool: Type.String() }, { additionalProperties: true });
const toolCalledCheck = Compile(ToolCalledSchema);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The envelope as the old bus carried it, if it is one of the report's types and has their fields. */
export function recentOf(envelope: EventEnvelope): RecordedEvent | undefined {
	if (!RECENT_TYPES.has(envelope.type) || !isRecord(envelope.payload)) return undefined;
	const flat: unknown = { type: envelope.type, ...envelope.payload, seq: envelope.seq, minute: envelope.minute };
	return recentCheck.Check(flat) ? isRecorded(flat) : undefined;
}

/** The fields of a `gamemaker_note` (channels' note desk), or `undefined` for any other event. */
export function noteOf(envelope: EventEnvelope): Static<typeof NoteSchema> | undefined {
	if (envelope.type !== "gamemaker_note") return undefined;
	return noteCheck.Check(envelope.payload) ? envelope.payload : undefined;
}

/**
 * The tool whose call wrote an event: the nearest core `tool_called` up its `causedBy` chain (a
 * note a holdout tool records through the note desk is caused by the desk's service call, which
 * the tool call caused).
 */
export function causingTool(envelope: EventEnvelope, bySeq: ReadonlyMap<number, EventEnvelope>): string | undefined {
	let cause = envelope.causedBy;
	for (let steps = 0; cause !== undefined && steps < 64; steps++) {
		const parent = bySeq.get(cause);
		if (parent === undefined) return undefined;
		if (parent.source === "core" && parent.type === "tool_called") return toolCalledCheck.Check(parent.payload) ? parent.payload.tool : undefined;
		cause = parent.causedBy;
	}
	return undefined;
}

const RunStarted = Compile(Type.Object({ minutes: Type.Number() }, { additionalProperties: true }));

/**
 * The run's length in minutes (the old `clock.durationMinutes`): from the last `run_resumed` (a
 * resumed run may play another length), else the core's `run_started`, else the old engine's
 * `run_start` of a converted legacy log; `undefined` without any.
 */
export function runMinutes(log: EventLogView): number | undefined {
	const candidates = [log.ofType("app", "run_resumed").at(-1), log.ofType("core", "run_started")[0], log.ofType("arena", "run_start")[0]];
	for (const started of candidates) if (started !== undefined && RunStarted.Check(started.payload)) return started.payload.minutes;
	return undefined;
}
