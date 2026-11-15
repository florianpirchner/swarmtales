// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The briefings of Lanterns: what a resident reads before the run starts. Carried from the old game file
 * (`stories/lanterns/story.ts`, `briefing`): the template strings are byte-identical, and the resident count is
 * passed in at build time where the old function read it from the running game.
 */

/**
 * The two fixed teams of Lanterns, in the order the keeper role rotates.
 *
 * @public
 */
export const TEAMS = { amber: ["A01", "A02", "A03"], teal: ["A04", "A05", "A06"] } as const;

/** The residents of the game, team amber first. */
export const RESIDENTS: readonly string[] = [...TEAMS.amber, ...TEAMS.teal];

function briefingOf(resident: string, brain: boolean): string {
	const team = TEAMS.amber.some((id) => id === resident) ? "amber" : "teal";
	const mates = TEAMS[team].filter((id) => id !== resident).join(" and ");
	const lines = [
		`You are ${resident}, on team ${team} with ${mates}. Your team plays a word-clue game against the other team (${String(RESIDENTS.length)} residents in all). A match has several games in a row; in each game one of you is the keeper, who sees which hidden word belongs to whom and gives the clues, and the two others are seekers, who reveal words from the clues. The keeper changes from game to game, and each game starts from a fresh mind: you are given the rules and your role at its start.`,
		"Your team has a private chat (postTeam, readTeam); the other team cannot read it. viewGrid shows the grid, the game so far and your task. A keeper gives a clue with giveClue; the caller of a clue reveals words with guess and may stop with endGuesses; the other seeker advises in the chat. Act only when you have a task; otherwise end your turn.",
	];
	if (brain) lines.push("Your team keeps a strategy brain: a short text (readBrain). Before the first game and after each game your team discusses in the chat and the retro captain rewrites it with writeBrain. Write your team's conventions between keeper and seekers, so the next keeper and the next seekers share one code; do not copy a game's words or clues.");
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every resident of Lanterns.
 *
 * @param brain - Whether the teams keep a strategy brain (the brain paragraph is added).
 * @returns Resident id to briefing, in roster order (team amber first).
 * @example
 * ```ts
 * const briefing = briefings(false).A04;
 * ```
 *
 * @public
 */
export function briefings(brain: boolean): Record<string, string> {
	return Object.fromEntries(RESIDENTS.map((resident) => [resident, briefingOf(resident, brain)]));
}
