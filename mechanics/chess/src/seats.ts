// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Who sits where in the `chess` mechanic: the side of a resident, the side on move and its captain, read from the state. */
import type { Chess } from "chess.js";
import type { ChessState } from "./head.ts";
import { colourOf, replay, type Colour } from "./model.ts";

/**
 * A colour with a capital letter, as the texts name it.
 *
 * @param colour - The colour.
 * @returns `White` or `Black`.
 */
export const capital = (colour: Colour): string => (colour === "white" ? "White" : "Black");

/**
 * The side `resident` plays on, or undefined.
 *
 * @param state - The state of the match.
 * @param resident - The resident, or undefined for a caller that is none.
 * @returns The name of the side.
 */
export function teamOf(state: Readonly<ChessState>, resident: string | undefined): string | undefined {
	if (resident === undefined) return undefined;
	return state.seats.find((team) => state.members[team]?.includes(resident) === true);
}

/**
 * The side on move, or undefined when no game runs.
 *
 * @param state - The state of the match.
 * @param chess - The position of the running game.
 * @returns The name of the side.
 */
export function sideOnMove(state: Readonly<ChessState>, chess: Chess): string | undefined {
	if (!state.running) return undefined;
	return colourOf(chess) === "white" ? state.white : state.black;
}

// The member of `team` who plays its next move: the captaincy rotates, one move each.
function captainOf(state: Readonly<ChessState>, team: string): string | undefined {
	const members = state.members[team] ?? [];
	return members[(state.taken[team] ?? 0) % Math.max(1, members.length)];
}

/**
 * The resident who plays the next move (the captain of the side on move), or undefined when no game runs.
 *
 * @param state - The state of the match.
 * @param chess - The position of the running game.
 * @returns The id of the resident.
 */
export function moverOf(state: Readonly<ChessState>, chess: Chess): string | undefined {
	const team = sideOnMove(state, chess);
	return team === undefined ? undefined : captainOf(state, team);
}

/**
 * How a side is named in texts: a solo side by its resident, a team as `team A (A01, A02)`.
 *
 * @param state - The state of the match.
 * @param team - The name of the side.
 * @returns The label.
 */
export function labelOf(state: Readonly<ChessState>, team: string): string {
	const members = state.members[team] ?? [];
	return members.length === 1 && members[0] === team ? team : `team ${team} (${members.join(", ")})`;
}

/**
 * The position of the running game.
 *
 * @param state - The state of the match.
 * @returns The board of chess.js after the game's moves.
 */
export const boardNow = (state: Readonly<ChessState>): Chess => replay(state.moves);

/**
 * The number of the full move that the half-move after `plies` half-moves belongs to.
 *
 * @param plies - The half-moves played so far.
 * @returns The move number, from 1.
 */
export const moveNoOf = (plies: number): number => Math.floor(plies / 2) + 1;
