// SPDX-License-Identifier: Apache-2.0
/** The `/contract` sub-path of this mechanic: what other mechanics may import. */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

/**
 * What the game calls between games to reset the consensus gate.
 *
 * @public
 */
export const ConsensusService = defineService({
	name: "consensus",
	summary: "Resets the gate between games.",
	methods: {
		reset: {
			kind: "command",
			summary: "Forgets every proposal, vote, agreement and timer (a new game begins); the forfeit counters stay.",
			input: Type.Object({}),
			output: Type.Null(),
		},
	},
});
