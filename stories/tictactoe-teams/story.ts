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
	/** Reserved for the biased gamemaker twist (paper §7); not built yet, `true` throws. */
	readonly gamemaker?: boolean;
	readonly seed?: number;
	/** Run length in virtual minutes; default scales with `games`. */
	readonly minutes?: number;
	/** Words a brain may have. */
	readonly maxWords?: number;
}

const TEAMS = { X: ["A01", "A02", "A03"], O: ["A04", "A05", "A06"] };
const MINUTES_PER_GAME = 16;

/** The story with its variants as options. */
export function tictactoeStory(options: TicTacToeOptions = {}) {
	const { games = 3, brain = true, gamemaker = false, seed = 11, maxWords = 300 } = options;
	if (gamemaker) throw new Error("tictactoe-teams: the gamemaker variant is not built yet");
	return defineCoreStory({
		id: "tictactoe-teams",
		seed,
		minutes: options.minutes ?? games * MINUTES_PER_GAME + 8,
		residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
		mechanics: [
			gridGame.with({ size: 3, line: 3, games, alternateStart: true, teams: TEAMS, wakeTeam: true }),
			consensus.with({ tool: "playMove", param: "cell", rule: "majority", maxRounds: 3, onDeadlock: "forfeitRandomLegalMove", teams: TEAMS }),
			teamChannel.with({ teams: TEAMS, maxPostsPerMove: 3 }),
			strategyBrain.with({ enabled: brain, maxWords, teams: TEAMS, retroMaxPosts: 8, retroMaxMinutes: 3, shared: false, brainAtStart: true }),
			optimalReferee.with({}),
		],
		grants: { resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["playMove", "writeBrain"] : ["playMove"],
		// Five passes a minute: propose, vote and play fit in one minute whatever the order; the reset line comes first.
		turns: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 8 },
	});
}

function briefing(brain: boolean) {
	return (resident: ResidentId, host: Host): string => {
		const team = TEAMS.X.includes(resident) ? "X" : "O";
		const mates = TEAMS[team].filter((id) => id !== resident).join(" and ");
		const lines = [
			`You are ${resident}, on team ${team} with ${mates}. Your team plays tic-tac-toe on a 3x3 board against the other team (${host.residents.length} residents in all). Cells are numbered 0-8, row by row. Marks in a row, column or diagonal win; a full board is a draw. A match has several games in a row; the starting side alternates, and each game starts from a fresh mind: you are given a briefing at its start.`,
			"Each move: use viewBoard to see the board. Your team has a private chat (postTeam, readTeam). The captain of the turn rotates among your team; only the captain proposes a cell with proposeMove (cell and reason), the two others answer with castVote (agree true or false, with a reason). A tie is no agreement. Once your team agreed, only the captain can play exactly that cell with playMove. If your team does not move in time, a random legal cell is played for it.",
			"Take a turn only when it is your team's turn; the other team's moves and chat are not visible to you except on the board.",
		];
		if (brain) lines.push("Your team keeps a strategy brain: a short text (readBrain). After each game your team discusses in the chat and the retro captain rewrites it with writeBrain. Write rules that help in the next game; do not copy a game's move list.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, three games, brain on. */
export function tictactoeEntry(options: TicTacToeOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	return { title: "Tic-tac-toe teams", story: tictactoeStory(options), model: { provider: "anthropic", id: "claude-haiku-5-5" }, briefing: briefing(brain), fixedRoster: "the six residents are two fixed teams of three (X: A01-A03, O: A04-A06)" };
}

export default tictactoeEntry();
