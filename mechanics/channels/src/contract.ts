// SPDX-License-Identifier: Apache-2.0
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

/**
 * What another mechanic calls to speak as the city: a post on the public board, or a private notice to one resident.
 *
 * @public
 */
export const ChannelsService = defineService({
	name: "channels",
	summary: "The city's voice: posts on the public board and private notices.",
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
	},
});
