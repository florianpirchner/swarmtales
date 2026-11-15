// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of chess: what a seat reads before the run starts. Carried from the old game file
 * (`stories/chess/story.ts`, `briefing`), the branch of two solo seats with a strategy brain: the template strings
 * are byte-identical, and the record is built at build time where the old function was called for each resident of
 * the running game. The team and no-brain branches come with the variants.
 */

/**
 * The two seats, in the order of the old game: A01 is White in game 1.
 *
 * @public
 */
export const SEATS = ["A01", "A02"] as const;

function briefingOf(resident: string): string {
	const opponent = SEATS.find((seat) => seat !== resident) ?? "";
	return [
		`You are ${resident}. You play a match of chess games against ${opponent}; the colours swap from game to game. A win counts 1 point, a draw half a point. Each game starts from a fresh mind.`,
		"When it is your move you are shown the position: play one legal move with playMove and end your turn. viewBoard shows the position again. An illegal move is refused and the board does not change; try another. Resign only in a lost position.",
		"You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the principles you want to play by, not a list of the moves.",
	].join("\n\n");
}

/**
 * Writes the briefing of each of the two seats.
 *
 * @returns Seat to briefing, in seat order.
 * @example
 * ```ts
 * const briefing = briefings();
 * ```
 *
 * @public
 */
export function briefings(): Record<string, string> {
	return Object.fromEntries(SEATS.map((seat) => [seat, briefingOf(seat)]));
}
