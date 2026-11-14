// SPDX-License-Identifier: Apache-2.0
/** The `/contract` sub-path of this mechanic: what other mechanics may import. */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

/**
 * What a game other than the grid game calls to tell the strategy brain that a game started or ended.
 *
 * @public
 */
export const StrategyBrainService = defineService({
	name: "strategy-brain",
	summary: "Notices from a game to the strategy brain: a game started (context reset with the briefing), a game ended (results, retro window).",
	methods: {
		gameStarted: {
			kind: "command",
			summary: "A game started: every resident of a team gets a fresh context with the briefing at the next turn.",
			input: Type.Object({ game: Type.Integer({ minimum: 1 }), first: Type.String({ description: "The side that moves first, or '' when the game has no sides." }) }),
			output: Type.Null(),
		},
		briefing: {
			kind: "query",
			summary: "The briefing a resident gets with a fresh context (the game, the results so far, its team's brain), for a game that drops a context more often than once per game.",
			input: Type.Object({ resident: Type.String() }),
			output: Type.String(),
		},
		gameEnded: {
			kind: "command",
			summary: "A game ended: its summary goes into the next briefings, and the retro windows open (unless it was the last game).",
			input: Type.Object({
				game: Type.Integer({ minimum: 1 }),
				summary: Type.String({ minLength: 1, description: "The game's public result in one line, shown in later briefings as it stands." }),
				moves: Type.Optional(Type.Array(Type.Integer(), { description: "The game's moves, for the replay check of a brain; none skips it." })),
				line: Type.Optional(Type.Array(Type.Array(Type.String()), { description: "The game's moves as text, each with its accepted spellings (SAN, from-to), for the replay check of a brain in a game whose moves are text (chess)." })),
				review: Type.Optional(
					Type.Record(Type.String(), Type.String({ minLength: 1 }), { description: "A private review of the game per team (a coach's notes), shown only in that team's retro window after this game; none: no review." }),
				),
			}),
			output: Type.Null(),
		},
	},
});
