import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";

const None = Type.Object({});

/**
 * What a game other than the grid game provides so the strategy brain can hold its next game back
 * for a retro window. The grid game needs none of this: the brain reads it through `GridGameApi`.
 */
export const BrainSourceApi = defineApi({
	name: "brain-source",
	summary: "A match of games the strategy brain can pause between games: the game's number, hold and release.",
	methods: {
		game: { kind: "query", summary: "The running (or last) game's number, from 1; 0 before the first game.", input: None, output: Type.Integer() },
		hold: { kind: "command", summary: "Holds the next game back until `release`. True when a game is still to come and is now held; false after the match's last game.", input: None, output: Type.Boolean() },
		release: { kind: "command", summary: "Lets a held game start. A no-op when nothing is held.", input: None, output: Type.Null() },
	},
});

/** What a game other than the grid game calls to tell the strategy brain that a game started or ended. */
export const StrategyBrainApi = defineApi({
	name: "strategy-brain",
	summary: "Notices from a game to the strategy brain: a game started (context reset with the briefing), a game ended (results, retro window).",
	methods: {
		gameStarted: {
			kind: "command",
			summary: "A game started: every resident of a team gets a fresh context with the briefing at the next turn.",
			input: Type.Object({ game: Type.Integer({ minimum: 1 }), first: Type.String({ description: "The side that moves first, or '' when the game has no sides." }) }),
			output: Type.Null(),
		},
		gameEnded: {
			kind: "command",
			summary: "A game ended: its summary goes into the next briefings, and the retro windows open (unless it was the last game).",
			input: Type.Object({
				game: Type.Integer({ minimum: 1 }),
				summary: Type.String({ minLength: 1, description: "The game's public result in one line, shown in later briefings as it stands." }),
				moves: Type.Optional(Type.Array(Type.Integer(), { description: "The game's moves, for the replay check of a brain; none skips it." })),
				line: Type.Optional(Type.Array(Type.Array(Type.String()), { description: "The game's moves as text, each with its accepted spellings (SAN, from-to), for the replay check of a brain in a game whose moves are text (chess)." })),
			}),
			output: Type.Null(),
		},
	},
});
