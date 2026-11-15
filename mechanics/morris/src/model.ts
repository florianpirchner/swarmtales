// SPDX-License-Identifier: Apache-2.0
/** The state of the `morris` mechanic with its snapshot schema, and what is read off it: the tally, the captain of the turn and the legal move numbers. */
import { Type, type Static } from "typebox";
import { MorrisEvents } from "./events.ts";
import { Cell, legalSteps, other, removable, Result, Side, stepCode, type Position } from "./rules.ts";

/**
 * The name the engine plays under in `move_played.by` and in the teams line of viewBoard.
 *
 * @public
 */
export const ENGINE = "engine";

const Count = Type.Object({ X: Type.Integer(), O: Type.Integer() });
const Reason = MorrisEvents.events.game_ended.properties.reason;
/**
 * Why a game ended.
 *
 * @public
 */
export type EndReason = Static<typeof Reason>;

/**
 * The schema of one finished game of the match.
 *
 * @public
 */
export const GameRecord = Type.Object({ game: Type.Integer(), result: Result, reason: Reason, turns: Type.Integer(), moves: Type.Array(Type.Integer()) });
/**
 * One finished game of the match.
 *
 * @public
 */
export type GameRecord = Static<typeof GameRecord>;

/**
 * The state of the morris match.
 *
 * @public
 */
export interface MorrisState {
	/** The members of each team, in the order their captaincy rotates; empty for the engine's side. */
	teams: { X: string[]; O: string[] };
	/** The cells of the 24 points. */
	board: Cell[];
	/** The side to move; meaningful while a game is running. */
	side: Side;
	/** Pieces each side has not placed yet. */
	inHand: { X: number; O: number };
	/** The running (or last) game, from 1; 0 before the first starts. */
	game: number;
	/** The side that started the running (or last) game. */
	startingSide: Side;
	/** Every move number of the current game, removals included. */
	moves: number[];
	/** Whole turns started in the current game. */
	turnNo: number;
	/** The side to move closed a mill and must name the piece to remove. */
	removing: boolean;
	/** Whole turns without a mill since both sides placed every piece. */
	quiet: number;
	/** How often each position (after the placing) came up in this game. */
	seen: Record<string, number>;
	/** Turns each side has finished in the match: the captain rotates with them. */
	taken: { X: number; O: number };
	/** The finished games. */
	results: GameRecord[];
	/** A game is on and a move is expected. */
	running: boolean;
	/** The match is over. */
	finished: boolean;
	/** The strategy brain holds the next game back. */
	held: boolean;
	/** A game is due but waits for `release`. */
	due: boolean;
	/** The match was ended as invalid (consensus forfeits only). */
	invalid?: boolean;
	/** The last turn the captain on move was told about ("game:turn:removing:minute"), so it is told once per turn and minute. */
	told?: string;
}

/**
 * The schema of the morris match's state in a snapshot.
 *
 * @public
 */
export const MorrisSlice = Type.Object({
	teams: Type.Object({ X: Type.Array(Type.String()), O: Type.Array(Type.String()) }),
	board: Type.Array(Cell),
	side: Side,
	inHand: Count,
	game: Type.Integer(),
	startingSide: Side,
	moves: Type.Array(Type.Integer()),
	turnNo: Type.Integer(),
	removing: Type.Boolean(),
	quiet: Type.Integer(),
	seen: Type.Record(Type.String(), Type.Integer()),
	taken: Count,
	results: Type.Array(GameRecord),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
	invalid: Type.Optional(Type.Boolean()),
	told: Type.Optional(Type.String()),
});

/**
 * A copy of the state for a snapshot, and of a snapshot for the state: the two have the same fields.
 *
 * @param state - The state, or the data of a snapshot.
 * @returns The copy, sharing nothing with `state`.
 *
 * @public
 */
export function copyOf(state: Readonly<MorrisState>): MorrisState {
	return {
		teams: { X: [...state.teams.X], O: [...state.teams.O] },
		board: [...state.board],
		side: state.side,
		inHand: { ...state.inHand },
		game: state.game,
		startingSide: state.startingSide,
		moves: [...state.moves],
		turnNo: state.turnNo,
		removing: state.removing,
		quiet: state.quiet,
		seen: { ...state.seen },
		taken: { ...state.taken },
		results: state.results.map((record) => ({ ...record, moves: [...record.moves] })),
		running: state.running,
		finished: state.finished,
		held: state.held,
		due: state.due,
		...(state.invalid === true ? { invalid: true } : {}),
		...(state.told === undefined ? {} : { told: state.told }),
	};
}

/**
 * The position of the running game, as the rules read it.
 *
 * @param state - The state.
 * @returns The board, the side to move and the pieces in hand.
 *
 * @public
 */
export const positionOf = (state: Readonly<MorrisState>): Position => ({ board: state.board, side: state.side, inHand: state.inHand });

/**
 * Counts the results of a match.
 *
 * @param results - The finished games.
 * @returns The games each side won, and the draws.
 *
 * @public
 */
export function tallyOf(results: readonly GameRecord[]): { X: number; O: number; draw: number } {
	const tally = { X: 0, O: 0, draw: 0 };
	for (const { result } of results) tally[result] += 1;
	return tally;
}

/**
 * The captain of the turn: the team's members take turns, one whole turn each.
 *
 * @param state - The state.
 * @returns The resident, or null when no game is running or the engine is on move.
 *
 * @public
 */
export function captainOf(state: Readonly<MorrisState>): string | null {
	if (!state.running) return null;
	const team = state.teams[state.side];
	return team[state.taken[state.side] % team.length] ?? null;
}

/**
 * The move numbers the side to move may play now: the removable points while removing, else its steps.
 *
 * @param state - The state.
 * @param flying - Whether a side with three pieces may fly.
 * @returns The move numbers; none when no game is running.
 *
 * @public
 */
export function legalCodes(state: Readonly<MorrisState>, flying: boolean): readonly number[] {
	if (!state.running) return [];
	if (state.removing) return removable(state.board, other(state.side)).map((point) => point + 1);
	return legalSteps(positionOf(state), flying).map(stepCode);
}
