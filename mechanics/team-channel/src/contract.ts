// SPDX-License-Identifier: Apache-2.0
/** The `/contract` sub-path of this mechanic: what other mechanics may import. */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

/**
 * What another mechanic calls to start a new epoch or a new round of a team's private channel.
 *
 * @public
 */
export const TeamChannelService = defineService({
	name: "team-channel",
	summary: "Private team channels with a post cap per round.",
	methods: {
		newEpoch: {
			kind: "command",
			summary: "Starts a new epoch for a team: readTeam shows only the posts from now on, and posts not yet shown are not announced. False when the team is unknown.",
			input: Type.Object({ team: Type.String() }),
			output: Type.Boolean(),
		},
		resetCap: {
			kind: "command",
			summary: "Opens a new round for a team: every member may post again. False when the team is unknown.",
			input: Type.Object({ team: Type.String() }),
			output: Type.Boolean(),
		},
	},
});
