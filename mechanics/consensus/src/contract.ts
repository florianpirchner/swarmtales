// SPDX-License-Identifier: LicenseRef-SUL-1.0
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

/**
 * What a game asks about the agreement of a team. It is a service of its own, so that `ConsensusService` stays the
 * contract of the old platform byte for byte.
 *
 * @public
 */
export const ConsensusAgreedService = defineService({
	name: "consensus-agreed",
	summary: "Tells the value a team agreed on.",
	methods: {
		agreed: {
			kind: "query",
			summary: "The value a team agreed on and has not played yet; null before the team agreed and for an unknown team. The `sample` of the gated tool reads it, so that the fake driver plays the agreed value.",
			input: Type.Object({ team: Type.String() }),
			output: Type.Union([Type.Null(), Type.Integer()]),
		},
	},
});
