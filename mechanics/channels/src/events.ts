// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";

const Id = Type.String({ description: "A resident id, for example `A01`" });
const Number = Type.Integer({ description: "The city's message number of the direct message" });

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
});
