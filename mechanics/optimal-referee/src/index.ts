// SPDX-License-Identifier: Apache-2.0
/**
 * The `optimal-referee` mechanic: a read-only listener that scores every move of the grid game
 * against exact minimax play and writes the score as `move_scored`. It has no tools, writes no
 * notice and no tool reply, and its events are for the human and the reporter only (audience
 * `human`), so no resident and no gamemaker ever learns how a move was rated. Only positions where an
 * error was possible are scored: where every free cell is worth the same, nothing is written.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineHead, defineMechanic } from "@swarmtales/sdk";
import { GridGameEvents, GridGameService } from "@swarmtales/mechanic-grid-game/contract";
import { emptyBoard, type Side } from "@swarmtales/mechanic-grid-game/rules";
import { scoreMove } from "./minimax.ts";

const Value = Type.Integer({ minimum: -1, maximum: 1 });

// The payload of `move_scored`: values are from the point of view of the side that moved (1 win, 0 draw, -1 loss with best play).
const MOVE_SCORED = Type.Object({
	game: Type.Integer(),
	moveNo: Type.Integer({ description: "The scored move's number in its game, as in move_played." }),
	side: Type.Union([Type.Literal("X"), Type.Literal("O")]),
	value_before: Value,
	value_after: Value,
	class: Type.Union([Type.Literal("optimal"), Type.Literal("blunder"), Type.Literal("missed_win"), Type.Literal("missed_block")]),
});

const head = defineHead({
	id: "optimal-referee",
	package: "@swarmtales/mechanic-optimal-referee",
	summary: "Scores every grid-game move against minimax (value before and after, class); read-only, for the human and the reporter.",
	options: Type.Object({
		maxEmptyCells: Type.Integer({ minimum: 2, maximum: 16, default: 9, description: "Positions with more free cells than this are not scored (minimax on a big board is slow)." }),
	}),
	state: Type.Object({
		game: Type.Integer(),
		size: Type.Integer(),
		line: Type.Integer(),
		board: Type.Array(Type.Union([Type.Literal("X"), Type.Literal("O"), Type.Literal(".")])),
	}),
	start: () => ({ game: 0, size: 3, line: 3, board: emptyBoard(3) }),
	events: { move_scored: MOVE_SCORED },
	audiences: { move_scored: ["human"] },
	requires: [GridGameService],
});

/**
 * The optimal referee: scores every move of the grid game against minimax, for the human and the reporter.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "scored", residents: 2, mechanics: [gridGame(), optimalReferee()], end: { ticks: 30 } });
 * ```
 *
 * @public
 */
export const optimalReferee = defineMechanic(head, {
	listeners: (kit) => [
		kit.listen(GridGameEvents, "game_started", (payload, ctx) => {
			const rules = ctx.call(GridGameService, "rules", {});
			ctx.state.game = payload.game;
			ctx.state.size = rules.size;
			ctx.state.line = rules.line;
			ctx.state.board = emptyBoard(rules.size);
		}),
		kit.listen(GridGameEvents, "move_played", (payload, ctx) => {
			const state = ctx.state;
			if (payload.game !== state.game || state.board[payload.cell] !== ".") return;
			const side: Side = payload.side;
			const scored = scoreMove(state.board, state.size, state.line, side, payload.cell, ctx.options.maxEmptyCells);
			state.board[payload.cell] = side;
			if (scored === undefined) return;
			ctx.emit("move_scored", { game: payload.game, moveNo: payload.moveNo, side, value_before: scored.valueBefore, value_after: scored.valueAfter, class: scored.class });
		}),
	],
});
