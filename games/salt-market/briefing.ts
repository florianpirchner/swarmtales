// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The briefings of Salt Market: what a trader reads before the run starts. Carried from the old game file
 * (`stories/salt-market/story.ts`, `briefing`): the strings are byte-identical, and the table is passed in at build
 * time where the old function was called for each resident of the running game.
 */

/**
 * The four fixed traders of the market, in table order.
 *
 * @public
 */
export const SEATS = ["A01", "A02", "A03", "A04"] as const;

function briefingOf(resident: string, brain: boolean): string {
	const others = SEATS.filter((seat) => seat !== resident).join(", ");
	const lines = [
		`You are ${resident}, one of four traders at the salt market (the others: ${others}). The session is a match of trading games played one after another. In each game you hold goods, value them in secret and have a secret contract to fill; the rules come at the start of each game. Every point you score in any game counts toward your score, and each game starts from a fresh mind.`,
		"Each round you get a few turns. In a turn, read what is new, then trade: offer, accept, decline, withdraw, give or say; viewMarket shows everything you may see. When you are done for now, end your turn. What other traders tell you may be true or not; only the bank's book and its trades are certain.",
	];
	if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to trade by, not a list of what happened.");
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every trader.
 *
 * @param brain - Whether every trader keeps a strategy brain.
 * @returns Trader to briefing, in table order.
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
