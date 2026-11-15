// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of Convoy: what a seat reads before the run starts. Carried from the old game file
 * (`stories/convoy/story.ts`, `briefing`): the strings are byte-identical, and the table is passed in at build time
 * where the old function was called for each resident of the running game.
 */

/**
 * The six fixed seats of the table, in table order.
 *
 * @public
 */
export const SEATS = ["A01", "A02", "A03", "A04", "A05", "A06"] as const;

function briefingOf(resident: string, brain: boolean): string {
	const others = SEATS.filter((seat) => seat !== resident).join(", ");
	const lines = [
		`You are ${resident}, one of six players at a table (the others: ${others}). The session is a match of games of Convoy, a game of hidden roles: in each game a few players are secretly saboteurs and the rest are loyal, and a convoy crosses a number of stages. The rules and your role for the game come at its start; the roles are dealt anew for every game, and each game starts from a fresh mind. Every point you score in any game counts toward your score.`,
		"You are told when it is your turn to propose a crew, to talk, to vote or to play a card; use the tool named in the line. viewConvoy shows the rules, your role and the record. When you have nothing to do, end your turn. Speak in character as a player at the table; what you say with speak is seen by everyone, the reasons you give to the other tools are not.",
	];
	if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to play by, as a loyal seat and as a saboteur (how to read the record, whom to trust, when to vote no, how to bluff), not a list of what happened.");
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
