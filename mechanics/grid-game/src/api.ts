import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";
import { Cell, Side } from "./model.ts";

const None = Type.Object({});

/** What other mechanics may read of the grid game (all queries). */
export const GridGameApi = defineApi({
	name: "grid-game",
	summary: "The board of the grid game: the side to move, the captain of the turn, the cells and the game's number.",
	methods: {
		side: { kind: "query", summary: "The side to move, or null when no game is running.", input: None, output: Type.Union([Side, Type.Null()]) },
		captain: { kind: "query", summary: "The resident who may play the next move, or null when no game is running.", input: None, output: Type.Union([Type.String(), Type.Null()]) },
		board: { kind: "query", summary: "The cells, row by row: X, O or '.' for a free cell.", input: None, output: Type.Array(Cell) },
		game: { kind: "query", summary: "The running (or last) game's number, from 1; 0 before the first game.", input: None, output: Type.Integer() },
		hold: { kind: "command", summary: "Holds the next game back (also the first, before the run starts) until `release`. True when a game is still to come and is now held; false after the match's last game.", input: None, output: Type.Boolean() },
		release: { kind: "command", summary: "Lets a held game start in the next minute. A no-op when nothing is held.", input: None, output: Type.Null() },
		rules: { kind: "query", summary: "The board's size and the line length that wins.", input: None, output: Type.Object({ size: Type.Integer(), line: Type.Integer() }) },
	},
});
