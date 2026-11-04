/**
 * TIC-TAC-TOE TEAMS (docs/ideas/tictactoe-teams.md): two teams of three residents play a match of
 * tic-tac-toe on one board. Before every move the team talks in its private chat, the captain of the
 * turn proposes a cell, the two others vote and only the agreed cell can be played. Every game starts
 * from a fresh context; the only memory across games is the team's "strategy brain", a short text the
 * team rewrites after each game (variant `brain: false`: the same briefings, no brain). A listener scores
 * every move against minimax for the report; residents never see it. A TypeScript `CoreStory`,
 * played by the generic runner (`swt run --story tictactoe-teams`).
 */
import type { Host, ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { consensus } from "@swarmtales/mechanic-consensus";
import { gridGame } from "@swarmtales/mechanic-grid-game";
import { optimalReferee } from "@swarmtales/mechanic-optimal-referee";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import type { CoreStoryEntry } from "../index.ts";

export interface TicTacToeOptions {
	/** Games in the match; the run ends after the last one. */
	readonly games?: number;
	/** Teams keep a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Teams that keep a brain (default: both, when `brain` is on): `["O"]` gives X the result-only briefing and no retro. */
	readonly brainTeams?: readonly string[];
	/** Reserved for the biased gamemaker twist (paper §7); not built yet, `true` throws. */
	readonly gamemaker?: boolean;
	readonly seed?: number;
	/** Run length in virtual minutes; default scales with `games`. */
	readonly minutes?: number;
	/** The board is size x size cells (3, or 4 for the 4x4 variant). */
	readonly size?: number;
	/** Marks in a row that win (3 on the 3x3 board, 4 on the 4x4 board). */
	readonly line?: number;
	/** Words a brain may have. */
	readonly maxWords?: number;
}

const TEAMS = { X: ["A01", "A02", "A03"], O: ["A04", "A05", "A06"] };
/** Virtual minutes a game takes, scaled with the cells of the board: 16 for 9 cells, 28 for 16. */
const minutesPerGame = (size: number): number => Math.round((size * size * 16) / 9 / 4) * 4;

/** The registered name: the 3x3 game keeps the original id, a bigger board is named after its size. */
function storyName(size: number, line: number, brainTeams: readonly string[] | undefined): string {
	const board = size === 3 && line === 3 ? "tictactoe-teams" : `tictactoe-teams-${String(size)}x${String(size)}`;
	return brainTeams === undefined || brainTeams.length === 0 || brainTeams.length === Object.keys(TEAMS).length ? board : `${board}-brain-${brainTeams.join("").toLowerCase()}`;
}

/** The story with its variants as options. */
export function tictactoeStory(options: TicTacToeOptions = {}) {
	const { games = 3, brain: brainOn = true, brainTeams, gamemaker = false, seed = 11, maxWords = 300, size = 3, line = 3 } = options;
	const brain = brainOn && (brainTeams === undefined || brainTeams.length > 0);
	if (brainTeams?.some((team) => !(team in TEAMS))) throw new Error(`tictactoe-teams: brainTeams must name teams of ${Object.keys(TEAMS).join(", ")}`);
	if (gamemaker) throw new Error("tictactoe-teams: the gamemaker variant is not built yet");
	return defineCoreStory({
		id: storyName(size, line, brainTeams),
		seed,
		minutes: options.minutes ?? games * minutesPerGame(size) + 8,
		residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
		mechanics: [
			gridGame.with({ size, line, games, alternateStart: true, teams: TEAMS, wakeTeam: true }),
			consensus.with({ tool: "playMove", param: "cell", rule: "majority", maxRounds: 3, onDeadlock: "forfeitRandomLegalMove", maxConsecutiveForfeits: 4, teams: TEAMS }),
			teamChannel.with({ teams: TEAMS, maxPostsPerMove: 3 }),
			strategyBrain.with({ enabled: brain, ...(brainTeams === undefined ? {} : { brainTeams: [...brainTeams] }), maxWords, teams: TEAMS, retroMaxPosts: 8, retroMaxMinutes: 3, shared: false, brainAtStart: true }),
			optimalReferee.with({ maxEmptyCells: Math.min(16, size * size) }),
		],
		grants: { resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["playMove", "writeBrain"] : ["playMove"],
		// Five passes a minute: propose, vote and play fit in one minute whatever the order; the reset line comes first.
		turns: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 8 },
	});
}

function briefing(brainTeams: readonly string[], size: number, line: number) {
	return (resident: ResidentId, host: Host): string => {
		const team = TEAMS.X.includes(resident) ? "X" : "O";
		const mates = TEAMS[team].filter((id) => id !== resident).join(" and ");
		const lines = [
			`You are ${resident}, on team ${team} with ${mates}. Your team plays tic-tac-toe on a ${String(size)}x${String(size)} board against the other team (${host.residents.length} residents in all). Cells are numbered 0-${String(size * size - 1)}, row by row. ${size === 3 && line === 3 ? "Marks" : `${String(line)} marks`} in a row, column or diagonal win; a full board is a draw. A match has several games in a row; the starting side alternates, and each game starts from a fresh mind: you are given a briefing at its start.`,
			"Each move: use viewBoard to see the board. Your team has a private chat (postTeam, readTeam). The captain of the turn rotates among your team; only the captain proposes a cell with proposeMove (cell and reason), the two others answer with castVote (agree true or false, with a reason). A tie is no agreement. Once your team agreed, only the captain can play exactly that cell with playMove. If your team does not move in time, a random legal cell is played for it.",
			"Take a turn only when it is your team's turn; the other team's moves and chat are not visible to you except on the board.",
		];
		if (brainTeams.includes(team)) lines.push("Your team keeps a strategy brain: a short text (readBrain). After each game your team discusses in the chat and the retro captain rewrites it with writeBrain. Write rules that help in the next game; do not copy a game's move list.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, three games, brain on. */
export function tictactoeEntry(options: TicTacToeOptions = {}): CoreStoryEntry {
	const brainTeams = (options.brain ?? true) ? (options.brainTeams ?? Object.keys(TEAMS)) : [];
	const { size = 3, line = 3 } = options;
	const board = size === 3 && line === 3 ? "" : ` ${String(size)}x${String(size)}`;
	return { title: `Tic-tac-toe teams${board}`, story: tictactoeStory(options), model: { provider: "anthropic", id: "claude-haiku-5-5" }, briefing: briefing(brainTeams, size, line), fixedRoster: "the six residents are two fixed teams of three (X: A01-A03, O: A04-A06)" };
}

export default tictactoeEntry();
