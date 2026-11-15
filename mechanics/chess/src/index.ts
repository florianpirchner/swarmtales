// SPDX-License-Identifier: Apache-2.0
/**
 * The `chess` mechanic: a match of chess games between two solo seats (docs/ideas/game-roadmap.md
 * §2.8), with chess.js as the legality filter and the referee. The model never changes the board
 * itself: `playMove` takes the move as text (SAN such as `Nf3`, or `g1f3`), chess.js reads it, and an
 * illegal or unreadable move is refused (event `move_refused`, for the human) while the board stays as
 * it was. chess.js also ends a game: checkmate, stalemate, threefold repetition, the fifty-move rule,
 * insufficient material. On top of that:
 * - a move cap (`maxPlies`): the game is stopped and scored on material (`adjudicateMargin`);
 * - a forfeit clock: a seat that ends `maxIdleTurns` turns in a row on move without a legal move gets a
 *   seeded random legal move played for it; `maxForfeits` such moves in one game lose that game;
 * - `resign`, on one's own move;
 * - the colours swap from game to game (`alternateColours`), A01 is White in game 1.
 * Every move is scored for the human against a material baseline (`move_scored`, a one-ply check with
 * a static exchange, not an engine). A strategy brain plugs in through `BrainSourceService` (it may hold the
 * next game back for a retro) and `StrategyBrainService` (game start and end); without one the match runs
 * on its own. The opponent waits while one seat thinks: only the seat on move has news.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/sdk";
import { play, problemWith, resign, startNext, TOOLS, turnEnded, turnLines, turnOpened } from "./flow.ts";
import { chessHead, type ChessToolCtx, type ChessView } from "./head.ts";
import { adjudicate } from "./model.ts";
import { boardNow, moverOf, sideOnMove, teamOf } from "./seats.ts";
import { boardText } from "./texts.ts";

// How often the fake driver looks at the board between games, per call.
const BETWEEN_GAMES = 0.5;

// The position when `ctx.resident` is the one who plays the next move, else undefined: nobody else has a legal call of `playMove` or `resign`.
function positionOfMover(ctx: ChessToolCtx) {
	if (ctx.resident === undefined || !ctx.state.running) return undefined;
	const chess = boardNow(ctx.state);
	return moverOf(ctx.state, chess) === ctx.resident ? chess : undefined;
}

// True when the caller is on move and its side would lose now by the measure of the move cap: the fake driver resigns then, and only then.
function lost(ctx: ChessToolCtx): boolean {
	const chess = positionOfMover(ctx);
	if (chess === undefined) return false;
	return adjudicate(chess, ctx.options.adjudicateMargin) === (teamOf(ctx.state, ctx.resident) === ctx.state.white ? "0-1" : "1-0");
}

/**
 * Chess: a match of games between two sides, with chess.js as the referee, a move cap and a forfeit clock.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "chess", residents: 2, mechanics: [chess({ games: 1 })], locked: ["playMove", "resign"], scheduler: { id: "turns", options: { passes: 4, activation: "onNews" } }, end: { ticks: 130 }, win: { fact: "chess.scores" } });
 * ```
 *
 * @public
 */
export const chess = defineMechanic(chessHead, {
	tools: {
		// The fake driver calls the first tool that gives a sample, in grant order: it looks at the board in a game only when it
		// has no move to play, and between games only now and then, so the tools granted after this one (the brain's) are reached.
		viewBoard: { run: (_params, ctx) => reply(boardText(ctx, ctx.resident)), sample: (ctx, random) => (ctx.state.running ? positionOfMover(ctx) === undefined : !ctx.state.finished && random.next() < BETWEEN_GAMES) ? {} : undefined },
		[TOOLS.play]: {
			check: (_params, ctx) => problemWith(ctx, ctx.resident),
			run: (params, ctx) => play(ctx, params.move, params.reason),
			// A random legal move for the seat on move, unless its game is lost: then it resigns.
			sample: (ctx, random) => {
				const position = positionOfMover(ctx);
				return position === undefined || lost(ctx) ? undefined : { move: random.pick(position.moves()) };
			},
		},
		[TOOLS.resign]: {
			check: (_params, ctx) => problemWith(ctx, ctx.resident),
			run: (_params, ctx) => resign(ctx),
			sample: (ctx) => (lost(ctx) ? {} : undefined),
		},
	},
	services: {
		"brain-source": {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.tick + 1, "nextGame");
				return null;
			},
		},
	},
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			after: ["strategy-brain"],
			run: (ctx) => {
				startNext(ctx);
			},
		},
		news: (resident, ctx) => {
			const state = ctx.state;
			if (!state.running) return false;
			const position = boardNow(state);
			if (moverOf(state, position) === resident) return true;
			return ctx.options.wakeTeam && teamOf(state, resident) === sideOnMove(state, position) && !state.told.includes(resident);
		},
		// After the strategy brain's context reset, as the old hook order had it.
		turnInputs: { after: ["strategy-brain"], run: turnLines },
		activationOpened: turnOpened,
		// A turn on move that ended without a move counts toward the forfeit clock.
		activationClosed: turnEnded,
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: ChessView) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
	},
});
