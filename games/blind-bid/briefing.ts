// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of Blind Bid: what a seat reads before the run starts. Carried from the old game file
 * (`stories/blind-bid/story.ts`, `briefing`): the strings are byte-identical, and the table is passed in at build
 * time where the old function was called for each resident of the running game.
 */

/**
 * The four fixed seats of the auction house, in table order.
 *
 * @public
 */
export const SEATS = ["A01", "A02", "A03", "A04"] as const;

function briefingOf(resident: string, brain: boolean): string {
	const others = SEATS.filter((seat) => seat !== resident).join(", ");
	const lines = [
		`You are ${resident}, one of four bidders at an auction house (the others: ${others}). The session is a match of several games; in each game a series of lots is sold one by one with sealed bids, and you hold a purse of coins for that game. Every point you earn in any game counts toward your score. At the start of each game you are given its rules, and each game starts from a fresh mind.`,
		"When a lot is open, bid with the bid tool (0 passes) and a short reason; viewAuction shows the rules, your value or estimate, your coins and the results so far. When you have nothing to bid on, end your turn.",
	];
	if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to bid by, not a list of what happened.");
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every seat.
 *
 * @param brain - Whether every seat keeps a strategy brain.
 * @returns Seat to briefing, in table order.
 * @example
 * ```ts
 * const briefing = briefings(false);
 * ```
 *
 * @public
 */
export function briefings(brain: boolean): Record<string, string> {
	return Object.fromEntries(SEATS.map((seat) => [seat, briefingOf(seat, brain)]));
}
