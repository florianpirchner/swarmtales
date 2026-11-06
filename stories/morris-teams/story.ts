/**
 * MORRIS TEAMS (docs/ideas/game-roadmap.md §2.8): two teams of three residents play a match of nine
 * men's morris on one board, the tic-tac-toe teams setup on a bigger game. Before every move the team
 * talks in its private chat, the captain of the turn proposes a move, the two others vote and only
 * the agreed move can be played; a turn that closes a mill is followed by a second agreed move, the
 * piece to remove. Every game starts from a fresh context; the only memory across games is the
 * team's strategy brain (variant `brain: false`: the same briefings, no brain). A listener scores
 * every turn against an alpha-beta search for the report; residents never see it. A TypeScript
 * `CoreStory`, played by the generic runner (`swt run --story morris-teams`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { consensus } from "@swarmtales/mechanic-consensus";
import { millsText, morris, neighboursText, renderBoard, emptyBoard } from "@swarmtales/mechanic-morris";
import { morrisReferee } from "@swarmtales/mechanic-morris-referee";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import type { CoreStoryEntry } from "../index.ts";

export interface MorrisOptions {
	/** Games in the match; the run ends after the last one. */
	readonly games?: number;
	/** Teams keep a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	readonly seed?: number;
	/** Run length in virtual minutes; default scales with `games` and `maxTurns`. */
	readonly minutes?: number;
	/** Whole turns after which a game is a draw. */
	readonly maxTurns?: number;
	/** Turns without a mill (after the placing) after which a game is a draw. */
	readonly maxQuietTurns?: number;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** Rounds of proposal and vote a team gets per move before a random legal move is played for it. */
	readonly maxRounds?: number;
	/** Residents per team: 3 (default) or 1, a single agent per side that decides alone. */
	readonly teamSize?: 1 | 3;
	/** The first member of each team is captain for the whole match instead of rotating. */
	readonly fixedCaptain?: boolean;
	/** Whole turns the reference search looks ahead. */
	readonly refereeDepth?: number;
	/** Side O is a scripted opponent: the morris search plays it at this depth (whole turns); the residents all play X. */
	readonly engineDepth?: number;
}

const DEFAULT_GAMES = 3;
const DEFAULT_ROUNDS = 3;
const DEFAULT_TURNS = 120;
const DEFAULT_QUIET = 40;
/** Output cap per call (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16_000;
const TEAMS = { X: ["A01", "A02", "A03"], O: ["A04", "A05", "A06"] };
const SOLO_TEAMS = { X: ["A01"], O: ["A04"] };
const teamsOf = (teamSize: 1 | 3, engine = false): { X: string[]; O: string[] } => {
	const teams = teamSize === 1 ? SOLO_TEAMS : TEAMS;
	return engine ? { X: teams.X, O: [] } : teams;
};

function storyName(games: number, brain: boolean, maxRounds: number, teamSize: 1 | 3, fixedCaptain: boolean, maxTurns: number, engineDepth: number | undefined): string {
	const match = games === DEFAULT_GAMES ? "" : `-g${String(games)}`;
	const rounds = maxRounds === DEFAULT_ROUNDS ? "" : `-r${String(maxRounds)}`;
	const turns = maxTurns === DEFAULT_TURNS ? "" : `-t${String(maxTurns)}`;
	return `morris-teams${brain ? "" : "-nobrain"}${match}${rounds}${turns}${teamSize === 1 ? "-solo" : ""}${fixedCaptain ? "-fc" : ""}${engineDepth === undefined ? "" : `-vs-engine${String(engineDepth)}`}`;
}

/** The story with its variants as options. */
export function morrisStory(options: MorrisOptions = {}) {
	const { games = DEFAULT_GAMES, brain = true, seed = 13, maxWords = 300, maxRounds = DEFAULT_ROUNDS, teamSize = 3, fixedCaptain = false, maxTurns = DEFAULT_TURNS, maxQuietTurns = DEFAULT_QUIET, refereeDepth = 3, engineDepth } = options;
	const engine = engineDepth !== undefined;
	const teams = teamsOf(teamSize, engine);
	// The engine's side has no residents, so the gate, the chat and the brain know the residents' team only.
	const playing: Record<string, string[]> = engine ? { X: teams.X } : teams;
	return defineCoreStory({
		id: storyName(games, brain, maxRounds, teamSize, fixedCaptain, maxTurns, engineDepth),
		seed,
		// A turn takes a minute (propose, vote, play), a mill one more; the retros take a few.
		minutes: options.minutes ?? games * (Math.ceil(maxTurns * 1.3) + 6) + 8,
		residents: [...teams.X, ...teams.O],
		mechanics: [
			morris.with({ games, maxTurns, maxQuietTurns, alternateStart: true, teams, wakeTeam: true, fixedCaptain, ...(engineDepth === undefined ? {} : { engine: { side: "O" as const, depth: engineDepth, maxNodes: 200_000 } }) }),
			consensus.with({ tool: "playMove", param: "move", rule: "majority", maxRounds, onDeadlock: "forfeitRandomLegalMove", maxConsecutiveForfeits: 6, teams: playing }),
			teamChannel.with({ teams: playing, maxPostsPerMove: 3 }),
			strategyBrain.with({ enabled: brain, maxWords, teams: playing, retroMaxPosts: 8, retroMaxMinutes: 3, shared: false, brainAtStart: true }),
			morrisReferee.with({ depth: refereeDepth }),
		],
		grants: { resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["playMove", "writeBrain"] : ["playMove"],
		// Five passes a minute: propose, vote and play fit in one minute whatever the order; the reset line comes first.
		turns: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		// A mill doubles the work of a minute (the step, then the removal), so the captain gets more actions than in tic-tac-toe.
		limits: { maxStepsPerMinute: 12 },
	});
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

function briefing(brain: boolean, teamSize: 1 | 3, fixedCaptain: boolean, maxTurns: number, maxQuietTurns: number, engine: boolean) {
	const teams = teamsOf(teamSize, engine);
	return (resident: ResidentId): string => {
		const team = teams.X.includes(resident) ? "X" : "O";
		const foe = engine ? "a computer program (it plays side O and answers your move at once)" : teamSize === 1 ? "another single player" : "the other team";
		const members = teams[team];
		const mates = members.filter((id) => id !== resident).join(" and ");
		const captain = members[0] ?? resident;
		const match = "A match has several games in a row; the starting side alternates, and each game starts from a fresh mind: you are given a briefing at its start.";
		const lines =
			teamSize === 1
				? [
						`You are ${resident}, playing nine men's morris alone for side ${team} against ${foe}. ${match}`,
						rulesText(maxTurns, maxQuietTurns),
						"Each move: use viewBoard to see the board, propose your move with proposeMove (its cell argument is the move number, with a reason; with no one to vote it is agreed at once), then play exactly that number with playMove. After a mill you do the same for the piece to remove. If you do not move in time, a random legal move is played for you.",
						engine ? "The reply to your move tells what the program answered; viewBoard shows the board." : "Take a turn only when it is your turn; the other player's moves are not visible to you except on the board.",
					]
				: [
						`You are ${resident}, on team ${team} with ${mates}. Your team plays nine men's morris against ${foe}. ${match}`,
						rulesText(maxTurns, maxQuietTurns),
						`Each move: use viewBoard to see the board. Your team has a private chat (postTeam, readTeam). ${fixedCaptain ? `${captain} is the captain of your team for the whole match` : "The captain of the turn rotates among your team"}; only the captain proposes a move with proposeMove (its cell argument is the move number, with a reason), the two others answer with castVote (agree true or false, with a reason). A tie is no agreement. Once your team agreed, only the captain plays exactly that number with playMove. After a mill the team agrees the same way on the piece to remove. ${resident === captain && fixedCaptain ? "You are the captain: you propose and you play, you never vote. " : ""}If your team does not move in time, a random legal move is played for it.`,
						engine ? "The reply to the captain's move tells what the program answered; viewBoard shows the board." : "Take a turn only when it is your team's turn; the other team's moves and chat are not visible to you except on the board.",
					];
		if (brain) lines.push(`Your ${teamSize === 1 ? "own" : "team keeps a"} strategy brain: a short text (readBrain). After each game ${teamSize === 1 ? "you" : "your team discusses in the chat and the retro captain"} rewrite${teamSize === 1 ? "" : "s"} it with writeBrain. Write rules that help in the next game; do not copy a game's move list.`);
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, three games, brain on. */
export function morrisEntry(options: MorrisOptions = {}): CoreStoryEntry {
	const { brain = true, teamSize = 3, fixedCaptain = false, maxTurns = DEFAULT_TURNS, maxQuietTurns = DEFAULT_QUIET, engineDepth } = options;
	const engine = engineDepth !== undefined;
	return {
		title: `Nine men's morris ${teamSize === 1 ? "solo" : "teams"}${engine ? " against the engine" : ""}`,
		story: morrisStory(options),
		model: { provider: "anthropic", id: "claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
		briefing: briefing(brain, teamSize, fixedCaptain, maxTurns, maxQuietTurns, engine),
		fixedRoster: engine ? (teamSize === 1 ? "one resident (X: A01) against the engine (O)" : "three residents in one team (X: A01-A03) against the engine (O)") : teamSize === 1 ? "two residents, one per side (X: A01, O: A04)" : "the six residents are two fixed teams of three (X: A01-A03, O: A04-A06)",
	};
}

export default morrisEntry();
