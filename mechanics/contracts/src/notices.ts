// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a base mechanic below `channels` (`exile`) asks to speak to the residents: a post on the public board and a
 * private notice to one resident. The mechanic `channels` provides it next to its own service; when no provider is
 * loaded, the caller's `tryCall` comes back empty and nothing is said. It lives here, not in the contract of
 * `channels`, because `channels` asks the ledger and the ledger listens to `exile`: an import of `channels` by
 * `exile` would close a cycle of packages (erratum J36).
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

const author = Type.String({ description: "The name the message is signed with, for example `CITY`" });
const text = Type.String({ description: "The text" });

/**
 * A post on the public board and a private notice: the service `notices`.
 *
 * @public
 */
export const NoticesService = defineService({
	name: "notices",
	summary: "A post on the public board and a private notice to one resident, for the mechanics that cannot import `channels`.",
	methods: {
		post: {
			kind: "command",
			summary: "Writes a post of the city on the public board, as `channels.post` does.",
			input: Type.Object({ author, text }, { additionalProperties: false, description: "The post" }),
			output: Type.Object({ postSeq: Type.Integer({ description: "The city's message number of the post" }) }, { additionalProperties: false, description: "Where the post stands" }),
		},
		notify: {
			kind: "command",
			summary: "Leaves a private notice for a resident, as `channels.notify` does; the resident reads it at its next activation.",
			input: Type.Object({ to: Type.String({ description: "The resident id" }), author, text }, { additionalProperties: false, description: "The notice" }),
			output: Type.Null({ description: "Nothing" }),
		},
	},
});
