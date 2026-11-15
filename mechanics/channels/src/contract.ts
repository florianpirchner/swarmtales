// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The service contract of the mechanic `channels`: the only file another mechanic imports.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

export { ChannelsEvents } from "./events.ts";

const author = Type.String({ description: "The name the message is signed with, for example `CITY`" });
const text = Type.String({ description: "The text" });
const groupId = Type.String({ description: "The group's id, for example `G1`" });
const messageNumber = Type.Integer({ description: "The city's message number" });
const ofResident = Type.Object({ resident: Type.String({ description: "The resident id" }) }, { additionalProperties: false, description: "The resident" });
const ofGroup = Type.Object({ group: groupId }, { additionalProperties: false, description: "The group" });
const GroupView = Type.Object(
	{
		id: groupId,
		name: Type.String({ description: "The name" }),
		founder: Type.String({ description: "The founder: a resident id, or `CITY`" }),
		treasurer: Type.String({ description: "The treasurer: a resident id, or `CITY`" }),
		members: Type.Array(Type.String({ description: "A resident id" }), { description: "The members, in join order" }),
		removed: Type.Boolean({ description: "Whether the city removed it" }),
	},
	{ additionalProperties: false, description: "One group" },
);

/**
 * What another mechanic calls to speak as the city (a post on the public board, a private notice to one resident, a
 * post in one of its own groups), to found and remove the groups of the city, and to read the record of the direct
 * messages and the groups.
 *
 * @public
 */
export const ChannelsService = defineService({
	name: "channels",
	summary: "The city's voice (posts on the public board, private notices, its own groups), the record of the direct messages and the groups.",
	methods: {
		post: {
			kind: "command",
			summary: "Writes a post on the public board and `board_post`. It is no news for residents: only a resident's own post is.",
			input: Type.Object(
				{ author, text, kind: Type.Optional(Type.Union([Type.Literal("city"), Type.Literal("system")], { description: "`city` when left out; a `system` post is a status line that `readBoard` skips" })) },
				{ additionalProperties: false, description: "The post" },
			),
			output: Type.Object({ postSeq: Type.Integer({ description: "The city's message number of the post" }) }, { additionalProperties: false, description: "Where the post stands" }),
		},
		notify: {
			kind: "command",
			summary: "Leaves a private notice for a resident and writes `notice`; the resident reads it at its next activation. An unknown resident throws.",
			input: Type.Object({ to: Type.String({ description: "The resident id" }), author, text }, { additionalProperties: false, description: "The notice" }),
			output: Type.Null({ description: "Nothing" }),
		},
		deliver: {
			kind: "command",
			summary: "A direct message from someone who is not a resident, a figure of the game say (old `deliver`): delivered always, with no cap and no price, and kept in no record; writes `dm_sent` with the next message number. An unknown resident throws.",
			input: Type.Object({ from: author, to: Type.String({ description: "The resident id" }), text }, { additionalProperties: false, description: "The message" }),
			output: Type.Object({ number: messageNumber }, { additionalProperties: false, description: "The message's number" }),
		},
		dmRecords: {
			kind: "query",
			summary: "Lists every direct message that was sent, delivered or not, oldest first, with whether it was answered (old `dmRecords`).",
			input: Type.Object({}, { additionalProperties: false, description: "Nothing" }),
			output: Type.Array(
				Type.Object(
					{
						from: Type.String({ description: "Who sent it: a resident id, or the actor id of a sender that is no resident" }),
						to: Type.String({ description: "The resident it was sent to" }),
						text,
						number: Type.Integer({ description: "The city's message number of the message" }),
						tick: Type.Integer({ description: "The tick it was sent in" }),
						answered: Type.Boolean({ description: "Whether its sender got an answer since: a direct message from the receiver, or the receiver's post in a group of both" }),
						deliveredTick: Type.Optional(Type.Integer({ description: "The tick it reached its receiver in; left out while it waits" })),
						deliveredAfter: Type.Optional(Type.Integer({ description: "The city's last message number at its delivery: every message numbered above it came later" })),
					},
					{ additionalProperties: false, description: "One direct message" },
				),
				{ description: "The direct messages" },
			),
		},
		boardPost: {
			kind: "query",
			summary: "The board post with the city's message number `number`, of a resident or of the city; null when no board post has it.",
			input: Type.Object({ number: messageNumber }, { additionalProperties: false, description: "The message number" }),
			output: Type.Union(
				[
					Type.Object({ number: messageNumber, author: Type.String({ description: "Who wrote it" }), text, tick: Type.Integer({ description: "The tick it was posted in" }) }, { additionalProperties: false, description: "The post" }),
					Type.Null({ description: "No board post has the number" }),
				],
				{ description: "The post, or null" },
			),
		},
		pendingDms: {
			kind: "query",
			summary: "How many direct messages wait in the resident's mailbox (old `pendingDms`); 0 for an id that is no resident.",
			input: ofResident,
			output: Type.Integer({ description: "The unread direct messages" }),
		},
		dmWindow: {
			kind: "query",
			summary: "The resident's window of the cap on direct messages and memos (old `dmWindow`); null when the game sets no cap.",
			input: ofResident,
			output: Type.Union(
				[
					Type.Object(
						{
							sent: Type.Integer({ description: "The direct messages and memos sent in the window" }),
							limit: Type.Integer({ description: "The most the window allows" }),
							from: Type.Integer({ description: "The first tick of the window" }),
							until: Type.Integer({ description: "The first tick of the next window" }),
						},
						{ additionalProperties: false, description: "The window" },
					),
					Type.Null({ description: "No cap" }),
				],
				{ description: "The window, or null" },
			),
		},
		createCityGroup: {
			kind: "command",
			summary: "Founds a group of the city with the members and writes `group_created` and a `group_membership` per member; each member gets a notice. The city is its founder and treasurer.",
			input: Type.Object({ name: Type.String({ description: "The name" }), members: Type.Array(Type.String({ description: "A resident id" }), { description: "The members, in join order" }) }, { additionalProperties: false, description: "The group" }),
			output: Type.Object({ group: groupId }, { additionalProperties: false, description: "The new group" }),
		},
		removeCityGroup: {
			kind: "command",
			summary: "Removes a group of the city: its treasury is split among its members (`treasury_settled`), then `group_removed`. Any other group is left as it is.",
			input: ofGroup,
			output: Type.Null({ description: "Nothing" }),
		},
		postGroupAsCity: {
			kind: "command",
			summary: "Posts as the city in one of its groups and writes `group_post`; free and never cut. A post in any other group is dropped.",
			input: Type.Object({ group: groupId, text }, { additionalProperties: false, description: "The post" }),
			output: Type.Null({ description: "Nothing" }),
		},
		group: {
			kind: "query",
			summary: "One group, removed or not: its founder (`CITY` for a group of the city), treasurer and members; null for an unknown id.",
			input: ofGroup,
			output: Type.Union([GroupView, Type.Null({ description: "No such group" })], { description: "The group, or null" }),
		},
		groupPost: {
			kind: "query",
			summary: "The group post with the city's message number `number`, removed groups included; null when no group post has it.",
			input: Type.Object({ number: messageNumber }, { additionalProperties: false, description: "The message number" }),
			output: Type.Union(
				[
					Type.Object({ number: messageNumber, group: groupId, author: Type.String({ description: "Who wrote it" }), text, tick: Type.Integer({ description: "The tick it was posted in" }) }, { additionalProperties: false, description: "The post" }),
					Type.Null({ description: "No group post has the number" }),
				],
				{ description: "The post, or null" },
			),
		},
		couldRead: {
			kind: "query",
			summary: "Whether the resident was a member of the group before the post `number`, so it could read it.",
			input: Type.Object({ group: groupId, reader: Type.String({ description: "The resident id" }), number: messageNumber }, { additionalProperties: false, description: "The question" }),
			output: Type.Boolean({ description: "True when it could read it" }),
		},
	},
});

const noteTarget = Type.String({ description: "Where a note goes: a resident id, `board`, or `tribunal` for the lines of a tribunal" });

/**
 * The note desk of the Directors (old `NotesApi`): the checks of a note's text that `channels` owns (its length and
 * the repeat), the budgets (a sliding window of ticks per reader) and the log line `gamemaker_note`. A mechanic
 * whose Director tool writes a text asks `check` in its rule and calls `record` once it wrote. The checks of game
 * facts (a dealt secret, a core motive, a goal, a secret role) are the rules of their owners on the note tools.
 *
 * @public
 */
export const NotesService = defineService({
	name: "notes",
	summary: "A Director's notes: the checks of length and repeat, the budgets and the note log.",
	methods: {
		check: {
			kind: "query",
			summary:
				"Trims the text, strips a signature or a `<author|CITY|city> minute N:` heading, and refuses an empty or long text, or nearly the same text as an earlier note to `as` (default `to`; for `tribunal` only with the same numbers).",
			input: Type.Object({ text, to: noteTarget, as: Type.Optional(noteTarget) }, { additionalProperties: false, description: "The note" }),
			output: Type.Union(
				[
					Type.Object({ ok: Type.Literal(true, { description: "The text may go" }), text: Type.String({ description: "The text, trimmed and stripped" }) }, { additionalProperties: false, description: "Passed" }),
					Type.Object(
						{ ok: Type.Literal(false, { description: "The text is refused" }), code: Type.String({ description: "The refusal code" }), detail: Type.String({ description: "The detail, empty for none" }) },
						{ additionalProperties: false, description: "Refused" },
					),
				],
				{ description: "The verdict" },
			),
		},
		budget: {
			kind: "query",
			summary: "The notes to `to` within the current sliding window and the limit: `boardPosts` for the board, `notesPerAgent` for any other reader.",
			input: Type.Object({ to: noteTarget }, { additionalProperties: false, description: "The reader" }),
			output: Type.Object({ used: Type.Integer({ description: "Notes in the window" }), limit: Type.Integer({ description: "The limit" }) }, { additionalProperties: false, description: "The budget" }),
		},
		record: {
			kind: "command",
			summary: "Records a note under `to` (its budget and repeats) and writes `gamemaker_note` as sent to `shown` (default `to`; the board for the lines of a tribunal).",
			input: Type.Object({ to: noteTarget, text, number: messageNumber, shown: Type.Optional(noteTarget) }, { additionalProperties: false, description: "The note" }),
			output: Type.Null({ description: "Nothing" }),
		},
	},
});
