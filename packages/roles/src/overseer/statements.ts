/**
 * Statements as the classifier overseer reads them: what a resident said or thought in one event of
 * the log. The old role read the flat legacy events; the overseer reads envelopes (an event's
 * payload holds the same fields), checks them with Typebox, and keeps the event's `seq` as the
 * reference the model labels. Like the old role it goes by the event type alone, whoever owns it.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import type { EventEnvelope } from "@swarmtales/contracts";

/** Where a statement was made; `thought` and `aside` reach no other resident. */
export const SOURCES = ["thought", "aside", "dm", "board", "group", "cast"] as const;
export type Source = (typeof SOURCES)[number];

export const StatementSchema = Type.Object({
	seq: Type.Integer(),
	minute: Type.Integer(),
	agent: Type.String(),
	source: Type.Enum(SOURCES),
	/** DM recipient or cast member; empty for the board, groups and private text. */
	to: Type.Array(Type.String()),
	/** Group id of a group post. */
	group: Type.Optional(Type.String()),
	text: Type.String(),
});
export type Statement = Static<typeof StatementSchema>;

const Voice = Type.Object({ agent: Type.String(), text: Type.String() });
const Dm = Type.Object({ from: Type.String(), to: Type.String(), text: Type.String() });
const Board = Type.Object({ kind: Type.String(), author: Type.String(), text: Type.String() });
const Group = Type.Object({ group: Type.String(), author: Type.String(), text: Type.String() });
const Cast = Type.Object({ from: Type.String(), cast: Type.String(), text: Type.String() });

/** The statement an event carries, if any; `isCompetitor` filters out the city's own voices. */
export function statementOf(event: EventEnvelope, isCompetitor: (id: string) => boolean): Statement | undefined {
	const payload = event.payload;
	const make = (agent: string, source: Source, text: string, to: readonly string[] = [], group?: string): Statement | undefined => {
		if (!isCompetitor(agent) || text.trim().length === 0) return undefined;
		return { seq: event.seq, minute: event.minute, agent, source, to: [...to], text, ...(group === undefined ? {} : { group }) };
	};
	if (event.type === "thinking" && Check(Voice, payload)) return make(payload.agent, "thought", payload.text);
	if (event.type === "text" && Check(Voice, payload)) return make(payload.agent, "aside", payload.text);
	if (event.type === "dm_sent" && Check(Dm, payload)) return make(payload.from, "dm", payload.text, [payload.to]);
	if (event.type === "board_post" && Check(Board, payload)) return payload.kind === "player" ? make(payload.author, "board", payload.text) : undefined;
	if (event.type === "group_post" && Check(Group, payload)) return make(payload.author, "group", payload.text, [], payload.group);
	if (event.type === "cast_dm" && Check(Cast, payload)) return make(payload.from, "cast", payload.text, [payload.cast]);
	return undefined;
}

/** `dm:A01|A03` for a DM pair, `group:G1` for a group; private text and the board have none. */
export function conversationKey(statement: Statement): string | undefined {
	if (statement.source === "group") return statement.group === undefined ? undefined : `group:${statement.group}`;
	if (statement.source !== "dm" && statement.source !== "cast") return undefined;
	const other = statement.to[0];
	if (other === undefined) return undefined;
	return `dm:${[statement.agent, other].sort().join("|")}`;
}
