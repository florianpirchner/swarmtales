// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { Type } from "typebox";
import { defineEvents } from "@swarmtales/sdk";
import { Result, Side } from "./rules.ts";

const Point = Type.Integer({ minimum: 1, maximum: 24, description: "A point of the board, 1-24." });

/**
 * The events of the morris game, declared apart so listeners (the morris-referee) need no value import of the mechanic.
 *
 * @public
 */
export const MorrisEvents = defineEvents("morris", {
	game_started: Type.Object({
		game: Type.Integer({ description: "The game's number in the match, from 1." }),
		startingSide: Side,
		xTeam: Type.Array(Type.String()),
		oTeam: Type.Array(Type.String()),
		pieces: Type.Integer({ description: "Pieces per side at the start." }),
		flying: Type.Boolean({ description: "Whether a side with three pieces may fly." }),
	}),
	move_played: Type.Object({
		game: Type.Integer(),
		side: Side,
		by: Type.String({ description: "The captain who played the move (also for a forfeit)." }),
		kind: Type.Union([Type.Literal("place"), Type.Literal("move"), Type.Literal("fly"), Type.Literal("remove")]),
		code: Type.Integer({ description: "The move number as played (p, p*100+q, or the removed point)." }),
		from: Type.Optional(Point),
		to: Point,
		mill: Type.Boolean({ description: "True when the step closed a mill, so a removal of the same side follows." }),
		turnNo: Type.Integer({ description: "The turn's number in its game, from 1; a removal shares the number of the step that closed the mill." }),
		forfeit: Type.Boolean({ description: "True when the move was played for the team by the move timer (a random legal move), not by its captain." }),
	}),
	game_ended: Type.Object({
		game: Type.Integer(),
		result: Result,
		reason: Type.Union([Type.Literal("pieces"), Type.Literal("blocked"), Type.Literal("repetition"), Type.Literal("quiet"), Type.Literal("turn_limit")]),
		turns: Type.Integer({ description: "Whole turns played (a step with its removal is one)." }),
		pieces: Type.Object({ X: Type.Integer(), O: Type.Integer() }, { description: "Pieces left on the board and in hand." }),
		moves: Type.Array(Type.Integer(), { description: "Every move number of the game in the order played, removals included." }),
	}),
	match_ended: Type.Object({
		tally: Type.Object({ X: Type.Integer(), O: Type.Integer(), draw: Type.Integer() }),
		invalid: Type.Optional(Type.Boolean({ description: "True when the match was ended as invalid (only consensus forfeits were played); the tally is no result." })),
	}),
});
