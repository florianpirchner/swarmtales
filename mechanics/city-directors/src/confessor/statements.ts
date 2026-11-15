// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Statements as the Confessor reads them, carried from old `packages/roles/src/overseer/statements.ts`: what a
 * resident said in one event, kept with the number of its firing as the reference the model labels (the old log
 * `seq`; a firing has no place on the log, decision A34). The old role also read a resident's thoughts and asides
 * (`thinking`, `text`); no mechanic writes them as events, so no statement of those sources reaches the Confessor.
 */
import type { Firing } from "@swarmtales/sdk";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";

/**
 * The events a statement can come from, `<mechanic>.<event>`: direct messages, board posts, group posts and direct
 * messages to a member of the cast.
 *
 * @public
 */
export const STATEMENT_EVENTS = ["channels.dm_sent", "channels.board_post", "channels.group_post", "cast.cast_dm"] as const;

/**
 * One event a statement can come from.
 *
 * @public
 */
export type StatementEvent = (typeof STATEMENT_EVENTS)[number];

/**
 * One statement of a round.
 *
 * @public
 */
export const StatementSchema = Type.Object(
	{
		ref: Type.Integer({ minimum: 1, description: "The number of the firing that brought it: the reference the model labels" }),
		agent: Type.String({ description: "The resident who made it" }),
		source: Type.Union([Type.Literal("dm"), Type.Literal("board"), Type.Literal("group"), Type.Literal("cast")], { description: "Where it was made" }),
		to: Type.Array(Type.String({ description: "A resident id or a member of the cast" }), { description: "The receiver of a direct message; empty for the board and a group" }),
		group: Type.Optional(Type.String({ description: "The group of a group post" })),
		text: Type.String({ description: "The text" }),
	},
	{ additionalProperties: false, description: "One statement of a resident" },
);

/**
 * One statement of a round.
 *
 * @public
 */
export type Statement = Static<typeof StatementSchema>;

const Text = Type.String({ description: "The text" });
const Who = Type.String({ description: "Who wrote it" });
const Dm = Type.Object({ from: Who, to: Who, text: Text }, { description: "The part of `dm_sent` read" });
const Board = Type.Object({ author: Who, text: Text, kind: Type.String({ description: "`player` for a resident's post" }) }, { description: "The part of `board_post` read" });
const Group = Type.Object({ group: Type.String({ description: "The group" }), author: Who, text: Text }, { description: "The part of `group_post` read" });
const Cast = Type.Object({ from: Who, cast: Who, text: Text }, { description: "The part of `cast_dm` read" });

/**
 * The statement a firing carries, if any (old `statementOf`); `isResident` leaves out the city's own voices.
 *
 * @param firing - A firing of the Confessor.
 * @param isResident - Whether an id is a resident of the run.
 * @returns The statement, or undefined for a firing of another event, of no resident, or with an empty text.
 *
 * @public
 */
export function statementOf(firing: Firing, isResident: (id: string) => boolean): Statement | undefined {
	const { payload } = firing;
	const make = (agent: string, source: Statement["source"], text: string, to: readonly string[] = [], group?: string): Statement | undefined => {
		if (!isResident(agent) || text.trim().length === 0) return undefined;
		return { ref: firing.n, agent, source, to: [...to], ...(group === undefined ? {} : { group }), text };
	};
	if (firing.event === "channels.dm_sent" && Check(Dm, payload)) return make(payload.from, "dm", payload.text, [payload.to]);
	if (firing.event === "channels.board_post" && Check(Board, payload)) return payload.kind === "player" ? make(payload.author, "board", payload.text) : undefined;
	if (firing.event === "channels.group_post" && Check(Group, payload)) return make(payload.author, "group", payload.text, [], payload.group);
	if (firing.event === "cast.cast_dm" && Check(Cast, payload)) return make(payload.from, "cast", payload.text, [payload.cast]);
	return undefined;
}

/**
 * `dm:A01|A03` for a pair of a direct message, `group:G1` for a group; the board has none (old `conversationKey`).
 *
 * @param statement - The statement.
 * @returns The key of its conversation, or undefined.
 *
 * @public
 */
export function conversationKey(statement: Statement): string | undefined {
	if (statement.source === "group") return statement.group === undefined ? undefined : `group:${statement.group}`;
	const other = statement.to[0];
	if (statement.source === "board" || other === undefined) return undefined;
	return `dm:${[statement.agent, other].sort().join("|")}`;
}
