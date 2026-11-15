// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What `consensus` needs from the mechanic that owns the gated tool (a game, a vote, a council).
 * That mechanic `provides` this service; `consensus` requires it, so it loads after it. Every method is
 * about the team that is on move right now, and team names are the keys of consensus's `teams` option.
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

/**
 * The service a game provides for the consensus gate: the team on move, its captain, its legal cells and a forfeit move.
 *
 * @public
 */
export const ConsensusSourceService = defineService({
	name: "consensus-source",
	summary: "The team on move, its captain, its legal cells and a forfeit move, for the consensus gate.",
	methods: {
		team: {
			kind: "query",
			summary: "The team on move now; an empty string when no team may act.",
			input: Type.Object({}),
			output: Type.String(),
		},
		captain: {
			kind: "query",
			summary: "The resident who proposes for the team on move; an empty string when there is none.",
			input: Type.Object({}),
			output: Type.String(),
		},
		legalCells: {
			kind: "query",
			summary: "The values the gated parameter may take for the team on move (empty when none or no team is on move).",
			input: Type.Object({}),
			output: Type.Array(Type.Integer()),
		},
		playForfeit: {
			kind: "command",
			summary: "Plays `cell` for the team on move as a forfeit (the move timer ran out). False when it could not be played.",
			input: Type.Object({ cell: Type.Integer() }),
			output: Type.Boolean(),
		},
		invalidate: {
			kind: "command",
			summary: "Ends the match as invalid (nobody played it; forfeits only) so the run ends. False when the match is already over.",
			input: Type.Object({ reason: Type.String() }),
			output: Type.Boolean(),
		},
	},
});
