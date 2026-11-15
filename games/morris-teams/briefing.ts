// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of nine men's morris: what a resident reads before the run starts. Carried from the old game file
 * (`stories/morris-teams/story.ts`, `rulesText` and `briefing`): the template strings are byte-identical, and the
 * record is built at build time where the old function was called for each resident of the running game.
 */
import { emptyBoard, millsText, neighboursText, renderBoard } from "@swarmtales/mechanic-morris";

/**
 * The two sides of a game, by side; the side of the search has no residents.
 *
 * @public
 */
export interface Teams {
	/** The residents of side X, in the order their captaincy rotates. */
	readonly X: readonly string[];
	/** The residents of side O, in the order their captaincy rotates. */
	readonly O: readonly string[];
}

/**
 * What the briefings depend on.
 *
 * @public
 */
export interface BriefingInput {
	/** The two sides. */
	readonly teams: Teams;
	/** The residents keep a strategy brain. */
	readonly brain: boolean;
	/** The first member of each team is captain for the whole match. */
	readonly fixedCaptain: boolean;
	/** Whole turns after which a game is a draw. */
	readonly maxTurns: number;
	/** Turns without a mill (after the placing) after which a game is a draw. */
	readonly maxQuietTurns: number;
	/** Side O is the built-in search. */
	readonly engine: boolean;
}

/** The rules every resident reads, whatever the team size. */
function rulesText(maxTurns: number, maxQuietTurns: number): string {
	return [
		"The board has 24 points on three nested squares joined in the middle of each side, numbered 1-24 row by row:",
		renderBoard(emptyBoard()),
		`Lines of three (mills): ${millsText()}.`,
		`Neighbours (joined by a line): ${neighboursText()}.`,
		`Each side has 9 pieces. While your side has pieces in hand, a turn places one on a free point. After all are placed, a turn moves one of your pieces to a free neighbouring point; with only 3 pieces left your side may jump to any free point. Three of your pieces on one line form a mill: the turn that closes a mill also removes one opposing piece that is not in a mill (any piece when all of them are in mills). A side with fewer than 3 pieces, or with no legal move, loses. A game is a draw when the same position comes up three times, after ${String(maxQuietTurns)} turns without a mill once all pieces are placed, or after ${String(maxTurns)} turns.`,
		"Every move is one number: placing on a point is the point (for example 5); moving a piece is from * 100 + to (for example 1011 moves the piece on 10 to 11); right after closing a mill the next move is the point of the opposing piece to remove. viewBoard shows the board and lists every legal move with its number.",
	].join("\n");
}

// The lines of a resident who plays a side alone.
function aloneLines(resident: string, team: string, foe: string, match: string, rules: string, engine: boolean): string[] {
	return [
		`You are ${resident}, playing nine men's morris alone for side ${team} against ${foe}. ${match}`,
		rules,
		"Each move: use viewBoard to see the board, propose your move with proposeMove (its cell argument is the move number, with a reason; with no one to vote it is agreed at once), then play exactly that number with playMove. After a mill you do the same for the piece to remove. If you do not move in time, a random legal move is played for you.",
		engine ? "The reply to your move tells what the program answered; viewBoard shows the board." : "Take a turn only when it is your turn; the other player's moves are not visible to you except on the board.",
	];
}

// The lines of a resident in a team of three.
function teamLines(resident: string, team: string, members: readonly string[], foe: string, match: string, rules: string, { fixedCaptain, engine }: BriefingInput): string[] {
	const mates = members.filter((id) => id !== resident).join(" and ");
	const captain = members[0] ?? resident;
	return [
		`You are ${resident}, on team ${team} with ${mates}. Your team plays nine men's morris against ${foe}. ${match}`,
		rules,
		`Each move: use viewBoard to see the board. Your team has a private chat (postTeam, readTeam). ${fixedCaptain ? `${captain} is the captain of your team for the whole match` : "The captain of the turn rotates among your team"}; only the captain proposes a move with proposeMove (its cell argument is the move number, with a reason), the two others answer with castVote (agree true or false, with a reason). A tie is no agreement. Once your team agreed, only the captain plays exactly that number with playMove. After a mill the team agrees the same way on the piece to remove. ${resident === captain && fixedCaptain ? "You are the captain: you propose and you play, you never vote. " : ""}If your team does not move in time, a random legal move is played for it.`,
		engine ? "The reply to the captain's move tells what the program answered; viewBoard shows the board." : "Take a turn only when it is your team's turn; the other team's moves and chat are not visible to you except on the board.",
	];
}

// The briefing of one resident.
function briefingOf(resident: string, input: BriefingInput): string {
	const { teams, brain, maxTurns, maxQuietTurns, engine } = input;
	const team = teams.X.includes(resident) ? "X" : "O";
	const members = teams[team];
	const alone = members.length === 1;
	const foe = engine ? "a computer program (it plays side O and answers your move at once)" : alone ? "another single player" : "the other team";
	const match = "A match has several games in a row; the starting side alternates, and each game starts from a fresh mind: you are given a briefing at its start.";
	const rules = rulesText(maxTurns, maxQuietTurns);
	const lines = alone ? aloneLines(resident, team, foe, match, rules, engine) : teamLines(resident, team, members, foe, match, rules, input);
	if (brain) lines.push(`Your ${alone ? "own" : "team keeps a"} strategy brain: a short text (readBrain). After each game ${alone ? "you" : "your team discusses in the chat and the retro captain"} rewrite${alone ? "" : "s"} it with writeBrain. Write rules that help in the next game; do not copy a game's move list.`);
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every resident of a game.
 *
 * @param input - The sides, the brain, the captain rule, the draw limits and the search.
 * @returns Resident to briefing, in roster order (X, then O).
 * @example
 * ```ts
 * const briefing = briefings({ teams: { X: ["A01"], O: [] }, brain: false, fixedCaptain: false, maxTurns: 120, maxQuietTurns: 40, engine: true });
 * ```
 *
 * @public
 */
export function briefings(input: BriefingInput): Record<string, string> {
	return Object.fromEntries([...input.teams.X, ...input.teams.O].map((resident) => [resident, briefingOf(resident, input)]));
}
