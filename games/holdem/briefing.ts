// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The briefings of hold'em: what a seat reads before the run starts. Carried from the old game file
 * (`stories/holdem/story.ts`, `briefing`): the template strings are byte-identical, and the table is passed in at
 * build time where the old function was called for each resident of the running game.
 */

/**
 * The seats of a table of `count` players, in table order: `A01`, `A02`, ...
 *
 * @param count - Players at the table.
 * @returns The seat ids.
 *
 * @public
 */
export function seatsOf(count: number): string[] {
	return Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(2, "0")}`);
}

function briefingOf(resident: string, brain: boolean, seats: number, brainSeats: readonly string[] | undefined): string {
	const keeps = brain && (brainSeats === undefined || brainSeats.includes(resident));
	const others = seatsOf(seats)
		.filter((seat) => seat !== resident)
		.join(", ");
	const lines = [
		`You are ${resident}, a player at a poker table (the others: ${others}). The session is a match of several games of fixed-limit Texas Hold'em, each game a number of hands. Every point you win in any hand counts toward your score; the aim is the most points over the whole match. At the start of each game you are given the rules, and each game starts from a fresh mind.`,
		"When it is your turn you are told your cards, the board, the pot and what you may do; act with the act tool (fold, check, call, bet or raise) and a short reason, which the other players never see. viewTable shows the table at any time. When it is not your turn, end your turn. There is no table talk.",
	];
	if (keeps) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to play by (which hands to play from which position, when to bet, raise, call or fold, what you noticed about the other players), not a list of what happened.");
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every seat.
 *
 * @param brain - Whether the table keeps strategy brains.
 * @param seats - Players at the table.
 * @param brainSeats - At a mixed table, the seats that keep a brain; the others read the briefing without it.
 * @returns Seat to briefing, in table order.
 * @example
 * ```ts
 * const briefing = briefings(true, 2);
 * ```
 *
 * @public
 */
export function briefings(brain: boolean, seats: number, brainSeats?: readonly string[]): Record<string, string> {
	return Object.fromEntries(seatsOf(seats).map((seat) => [seat, briefingOf(seat, brain, seats, brainSeats)]));
}
