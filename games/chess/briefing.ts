// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of chess: what a seat reads before the run starts. Carried from the old game file
 * (`stories/chess/story.ts`, `briefing(brain, teams)`), all four branches (solo or teams, with or without a brain):
 * the template strings are byte-identical, and the record is built at build time where the old function was called
 * for each resident of the running game.
 */

/**
 * The two seats, in the order of the old game: A01 is White in game 1.
 *
 * @public
 */
export const SEATS = ["A01", "A02"] as const;

/**
 * The two teams of the team variant, as the old game had them: team A is White in game 1.
 *
 * @public
 */
export const TEAMS: Readonly<Record<string, readonly string[]>> = { A: ["A01", "A02"], B: ["A03", "A04"] };

const SOLO_BRAIN = "You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the principles you want to play by, not a list of the moves.";
const TEAM_BRAIN = "Your team keeps a strategy brain: a short private text (readBrain) that only your team reads. Before the first game and after each game the retro captain rewrites it with writeBrain, after a short talk in the team chat; it is the only thing your team carries from one game to the next. Write the principles you want to play by, not a list of the moves.";

function soloLines(resident: string): string[] {
	const opponent = SEATS.find((seat) => seat !== resident) ?? "";
	return [
		`You are ${resident}. You play a match of chess games against ${opponent}; the colours swap from game to game. A win counts 1 point, a draw half a point. Each game starts from a fresh mind.`,
		"When it is your move you are shown the position: play one legal move with playMove and end your turn. viewBoard shows the position again. An illegal move is refused and the board does not change; try another. Resign only in a lost position.",
	];
}

function teamLines(resident: string): string[] {
	const team = Object.entries(TEAMS).find(([, members]) => members.includes(resident));
	const mate = team?.[1].find((member) => member !== resident) ?? "";
	const opponent = `team ${Object.keys(TEAMS).find((name) => name !== team?.[0]) ?? ""}`;
	return [
		`You are ${resident}. With ${mate} you are team ${team?.[0] ?? ""}; you play a match of chess games against ${opponent}. The colours swap from game to game. A win counts 1 point, a draw half a point. Each game starts from a fresh mind.`,
		`Your team plays one board. The captaincy rotates move by move between you and ${mate}: the captain of a move plays it with playMove, the other advises first in your private team chat (postTeam; readTeam shows it). The captain decides; advice is advice. An illegal move is refused and the board does not change; try another. Resign only in a lost position.`,
	];
}

/**
 * The residents of a variant: the two seats, or the four members of the two teams.
 *
 * @param teams - Two teams of two in place of two solo seats.
 * @returns The residents, in the order of the old game.
 *
 * @public
 */
export function residentsOf(teams: boolean): readonly string[] {
	return teams ? Object.values(TEAMS).flat() : [...SEATS];
}

/**
 * Writes the briefing of each resident.
 *
 * @param brain - Each seat (or team) keeps a strategy brain; default true.
 * @param teams - Two teams of two; default false.
 * @returns Resident to briefing, in resident order.
 * @example
 * ```ts
 * const briefing = briefings(false, true);
 * ```
 *
 * @public
 */
export function briefings(brain = true, teams = false): Record<string, string> {
	const extra = brain ? [teams ? TEAM_BRAIN : SOLO_BRAIN] : [];
	return Object.fromEntries(residentsOf(teams).map((resident) => [resident, [...(teams ? teamLines(resident) : soloLines(resident)), ...extra].join("\n\n")]));
}
