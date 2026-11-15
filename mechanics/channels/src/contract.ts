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
					},
					{ additionalProperties: false, description: "One direct message" },
				),
				{ description: "The direct messages" },
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
