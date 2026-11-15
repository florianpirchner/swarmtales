// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Number = Type.Integer({ description: "The city's message number of the direct message" });
const Group = Type.String({ description: "The group's id, for example `G1`" });
const Who = Type.String({ description: "A resident id, or `CITY` for the city" });
const Points = Type.Number({ description: "The points booked" });
const Receipt = Type.String({ description: "The id of the receipt of the booking; empty when none was issued" });

/**
 * The events of `channels`, declared apart so a listener needs no value import of the mechanic. The payloads keep
 * the key order of the old platform.
 *
 * @public
 */
export const ChannelsEvents = defineEvents("channels", {
	board_post: Type.Object(
		{
			postSeq: Type.Integer({ description: "The city's message number of the post" }),
			author: Type.String({ description: "Who wrote it: a resident id, an actor id, or a name of the city such as `CITY`" }),
			text: Type.String({ description: "The text, trimmed" }),
			kind: Type.Union([Type.Literal("player"), Type.Literal("city"), Type.Literal("system")], { description: "`player` for a resident's post, `city` for a post of a mechanic or a Director, `system` for a status line" }),
		},
		{ description: "A post was written on the public board" },
	),
	dm_sent: Type.Object(
		{ from: Type.String({ description: "Who sent it: a resident id, or the actor id of a sender that is no resident" }), to: Id, text: Type.String({ description: "The text, trimmed" }), number: Number },
		{ description: "A direct message was sent; it waits in the receiver's mailbox" },
	),
	dm_delivered: Type.Object({ number: Number, from: Id, to: Id }, { description: "A resident's direct message reached its receiver: it is among the input lines of the receiver's activation" }),
	notice: Type.Object(
		{ to: Id, author: Type.String({ description: "The name the notice is signed with" }), text: Type.String({ description: "The text" }) },
		{ description: "A private notice was left for a resident; it is shown at the resident's next activation" },
	),
	group_created: Type.Object({ group: Group, founder: Who, name: Type.String({ description: "The group's name, trimmed" }) }, { description: "A group was founded, by a resident or by the city" }),
	group_removed: Type.Object({ group: Group, members: Type.Array(Id, { description: "The members, in join order" }) }, { description: "The city removed one of its groups; nobody sees it any more" }),
	group_membership: Type.Object(
		{ group: Group, agent: Id, change: Type.Union([Type.Literal("added"), Type.Literal("removed"), Type.Literal("left")], { description: "How the membership changed" }), by: Who },
		{ description: "A resident joined or left a group" },
	),
	group_post: Type.Object({ group: Group, author: Who, postSeq: Type.Integer({ description: "The city's message number of the post" }), text: Type.String({ description: "The text, trimmed" }) }, { description: "A post was written in a group" }),
	treasury_deposit: Type.Object({ group: Group, agent: Id, amount: Points, receipt: Receipt }, { description: "A member paid points into the group's treasury" }),
	treasury_withdrawal: Type.Object({ group: Group, treasurer: Who, to: Id, amount: Points, receipt: Receipt }, { description: "The treasurer paid points out of the treasury to a member" }),
	treasurer_set: Type.Object({ group: Group, treasurer: Id, by: Id }, { description: "The treasurer handed the treasury to another member" }),
	treasury_settled: Type.Object(
		{ group: Group, payouts: Type.Record(Type.String({ description: "A member" }), Type.Number({ description: "The points paid out" }), { description: "Member to points" }) },
		{ description: "A treasury was split among the members: at the run's end, or when the city removed the group" },
	),
});
