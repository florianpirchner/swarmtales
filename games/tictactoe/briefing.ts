// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The briefings of tic-tac-toe teams: what a resident reads before the run starts. Carried from the old game file
 * (`stories/tictactoe-teams/story.ts`, `briefing`): the template strings are byte-identical, and the resident count
 * is passed in at build time where the old function read it from the running game.
 */

/**
 * The two teams of a game, by side.
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
	/** The two teams. */
	readonly teams: Teams;
	/** The teams that keep a strategy brain. */
	readonly brainTeams: readonly string[];
	/** The board is size x size cells. */
	readonly size: number;
	/** Marks in a row that win. */
	readonly line: number;
	/** The first member of each team is captain for the whole match. */
	readonly fixedCaptain: boolean;
}

interface Seat {
	readonly resident: string;
	readonly team: "X" | "O";
	readonly members: readonly string[];
	readonly opponent: "a single player" | "a team of three";
	readonly count: number;
}

const rulesOf = (size: number, line: number): string =>
	`Cells are numbered 0-${String(size * size - 1)}, row by row. ${size === 3 && line === 3 ? "Marks" : `${String(line)} marks`} in a row, column or diagonal win; a full board is a draw. A match has several games in a row; the starting side alternates, and each game starts from a fresh mind: you are given a briefing at its start.`;

const lastLine = (opponent: Seat["opponent"], whose: string): string => `Take a turn only when it is your ${whose}turn; the other ${opponent === "a team of three" ? "team's moves and chat are" : "player's moves are"} not visible to you except on the board.`;

function aloneLines({ resident, team, opponent, count }: Seat, size: number, rules: string): string[] {
	return [
		`You are ${resident}, playing tic-tac-toe alone for side ${team} on a ${String(size)}x${String(size)} board against ${opponent === "a single player" ? "another single player" : opponent} (${count} residents in all). ${rules}`,
		"Each move: use viewBoard to see the board, propose your cell with proposeMove (cell and reason; with no one to vote it is agreed at once), then play exactly that cell with playMove. If you do not move in time, a random legal cell is played for you.",
		lastLine(opponent, ""),
	];
}

function teamLines({ resident, team, members, opponent, count }: Seat, size: number, rules: string, fixedCaptain: boolean): string[] {
	const mates = members.filter((id) => id !== resident).join(" and ");
	const captain = members[0] ?? resident;
	return [
		`You are ${resident}, on team ${team} with ${mates}. Your team plays tic-tac-toe on a ${String(size)}x${String(size)} board against ${opponent === "a team of three" ? "the other team" : opponent} (${count} residents in all). ${rules}`,
		`Each move: use viewBoard to see the board. Your team has a private chat (postTeam, readTeam). ${fixedCaptain ? `${captain} is the captain of your team for the whole match` : "The captain of the turn rotates among your team"}; only the captain proposes a cell with proposeMove (cell and reason), the two others answer with castVote (agree true or false, with a reason). A tie is no agreement. Once your team agreed, only the captain can play exactly that cell with playMove. ${resident === captain && fixedCaptain ? "You are the captain: you propose and you play, you never vote. " : ""}If your team does not move in time, a random legal cell is played for it.`,
		lastLine(opponent, "team's "),
	];
}

function briefingOf(seat: Seat, { brainTeams, size, line, fixedCaptain }: BriefingInput): string {
	const alone = seat.members.length === 1;
	const rules = rulesOf(size, line);
	const lines = alone ? aloneLines(seat, size, rules) : teamLines(seat, size, rules, fixedCaptain);
	if (brainTeams.includes(seat.team)) lines.push(`Your ${alone ? "own" : "team keeps a"} strategy brain: a short text (readBrain). After each game ${alone ? "you" : "your team discusses in the chat and the retro captain"} rewrite${alone ? "" : "s"} it with writeBrain. Write rules that help in the next game; do not copy a game's move list.`);
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every resident of a game.
 *
 * @param input - The teams, the teams with a brain, the board and the captain rule.
 * @returns Resident id to briefing, in roster order (side X first).
 * @example
 * ```ts
 * const briefing = briefings({ teams: { X: ["A01"], O: ["A04"] }, brainTeams: [], size: 3, line: 3, fixedCaptain: false });
 * ```
 *
 * @public
 */
export function briefings(input: BriefingInput): Record<string, string> {
	const { teams } = input;
	const count = teams.X.length + teams.O.length;
	const seats = (["X", "O"] as const).flatMap((team) => {
		const opponent = teams[team === "X" ? "O" : "X"].length === 1 ? "a single player" : "a team of three";
		return teams[team].map((resident): Seat => ({ resident, team, members: teams[team], opponent, count }));
	});
	return Object.fromEntries(seats.map((seat) => [seat.resident, briefingOf(seat, input)]));
}
