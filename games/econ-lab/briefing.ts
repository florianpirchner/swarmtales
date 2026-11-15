// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The briefings of Econ Lab: what a seat reads before the run starts. Carried from the old game file
 * (`stories/econ-lab/story.ts`, `briefing`): the template strings are byte-identical.
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
		`You are ${resident}, one of four participants at a table (the others: ${others}). The session is a match of games played one after another. Each game is a decision task with its own rules and several rounds; in every round you make one decision with the tool the round names. Every point you earn in any game counts toward your score. At the start of each game you are given its rules, and each game starts from a fresh mind.`,
		"When you are asked for a decision, make it with the named tool and a short reason; viewTable shows the rules, your task and your past rounds. When you have nothing to decide, end your turn.",
	];
	if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to play by, not a list of what happened.");
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
