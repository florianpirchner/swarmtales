// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of Quarry: what a seat reads before the run starts. Carried from the old game file
 * (`stories/quarry/story.ts`, `briefing`): the template strings are byte-identical.
 */

/**
 * The four seats of the table, in table order.
 *
 * @public
 */
export const SEATS = ["A01", "A02", "A03", "A04"] as const;

function briefingOf(resident: string, brain: boolean): string {
	const others = SEATS.filter((seat) => seat !== resident).join(", ");
	const lines = [
		`You are ${resident}, one of four players at a table (seated in the order A01, A02, A03, A04, then back to A01; the others: ${others}). The session is a match of drafting games played one after another. In each game you build a quarry by keeping one card from each pack that comes to you; the rules come at the start of each game. Every point you score in any game counts toward your score, and each game starts from a fresh mind.`,
		"When you are asked to pick, keep one card with pick and a short reason; viewTable shows the rules, your pack and your quarry. When you have nothing to pick, end your turn. There is no table talk: the only thing you learn about the others is what they pass you.",
	];
	if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to draft by, not a list of what happened.");
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every seat.
 *
 * @param brain - Whether the seats keep a strategy brain.
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
