// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";
import { Result, Side, Tally } from "./model.ts";

/**
 * The events of the grid game, declared apart so listeners (the optimal-referee, a consensus gate) need no value import of the mechanic.
 *
 * @public
 */
export const GridGameEvents = defineEvents("grid-game", {
	game_started: Type.Object({
		game: Type.Integer({ description: "The game's number in the match, from 1." }),
		startingSide: Side,
		xTeam: Type.Array(Type.String()),
		oTeam: Type.Array(Type.String()),
	}),
	move_played: Type.Object({
		game: Type.Integer(),
		side: Side,
		by: Type.String({ description: "The captain who played the move." }),
		cell: Type.Integer(),
		moveNo: Type.Integer({ description: "The move's number in its game, from 1." }),
		forfeit: Type.Boolean({ description: "True when the move was played for the team by the move timer (a random legal cell), not by its captain." }),
	}),
	game_ended: Type.Object({
		game: Type.Integer(),
		result: Result,
		winLine: Type.Optional(Type.Array(Type.Integer())),
		moves: Type.Array(Type.Integer(), { description: "Every cell of the game in the order played." }),
	}),
	match_ended: Type.Object({ tally: Tally, invalid: Type.Optional(Type.Boolean({ description: "True when the match was ended as invalid (only consensus forfeits were played); the tally is no result." })) }),
});
