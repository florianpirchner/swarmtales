// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of liar's dice: what a seat reads before the run starts. Carried from the old game file
 * (`stories/liars-dice/story.ts`, `briefing`): the template strings are byte-identical, and the table is passed in
 * at build time where the old function was called for each resident of the running game.
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

function briefingOf(resident: string, brain: boolean, seats: number, talk: boolean): string {
	const others = seatsOf(seats)
		.filter((seat) => seat !== resident)
		.join(", ");
	const lines = [
		`You are ${resident}, a player at a dice table (the others: ${others}, seated in that order round the table). The session is a match of several games of liar's dice. Every point you win in any game counts toward your score; the aim is the most points over the whole match. At the start of each game you are given the rules, and each game starts from a fresh mind.`,
		`When it is your turn you are told your dice, the standing bid and what you may do; act with bid or liar and a short reason, which the other players never see. ${talk ? "You may add a short public remark (say); the others read it, and it need not be true." : "There is no table talk."} viewTable shows the table at any time. When it is not your turn, end your turn.`,
	];
	if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to play by (when to raise, when to call, how to bluff, what you noticed about the other players), not a list of what happened.");
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every seat.
 *
 * @param brain - Whether the seats keep a strategy brain.
 * @param seats - Players at the table.
 * @param talk - Whether a bid may carry a public remark.
 * @returns Seat to briefing, in table order.
 * @example
 * ```ts
 * const briefing = briefings(true, 2, false);
 * ```
 *
 * @public
 */
export function briefings(brain: boolean, seats: number, talk: boolean): Record<string, string> {
	return Object.fromEntries(seatsOf(seats).map((seat) => [seat, briefingOf(seat, brain, seats, talk)]));
}
