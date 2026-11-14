// SPDX-License-Identifier: Apache-2.0
/**
 * Tic-tac-toe teams: two teams of three residents play a match of tic-tac-toe on one board. Before every move the
 * team talks in its private chat, the captain of the turn proposes a cell, the two others vote and only the agreed
 * cell can be played. Every game starts from a fresh context; the only memory across games is the team's "strategy
 * brain", a short text the team rewrites after each game (`brain: false`: the same briefings, no brain). A listener
 * scores every move against minimax for the report; residents never see it. A port of the old
 * `stories/tictactoe-teams/story.ts`: the variants are options of the factory, the id is always `tictactoe-teams`.
 */
import { consensus } from "@swarmtales/mechanic-consensus";
import { gridGame } from "@swarmtales/mechanic-grid-game";
import { optimalReferee } from "@swarmtales/mechanic-optimal-referee";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame } from "@swarmtales/sdk";
import { briefings } from "./briefing.ts";

/**
 * The variants of tic-tac-toe teams.
 *
 * @public
 */
export interface TicTacToeOptions {
	/** Games in the match; the run ends after the last one. */
	readonly games?: number;
	/** Teams keep a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Teams that keep a brain (default: both, when `brain` is on): `["O"]` gives X the result-only briefing and no retro. */
	readonly brainTeams?: readonly string[];
	/** Reserved for the biased gamemaker twist; not built yet, `true` throws. */
	readonly gamemaker?: boolean;
	/** The seed of the run; 11 when absent. */
	readonly seed?: number;
	/** Run length in ticks; the default scales with `games`. */
	readonly minutes?: number;
	/** The board is size x size cells (3, or 4 for the 4x4 variant). */
	readonly size?: number;
	/** Marks in a row that win (3 on the 3x3 board, 4 on the 4x4 board). */
	readonly line?: number;
	/** Posts of a retro window before the brain is due. */
	readonly retroMaxPosts?: number;
	/** Ticks of a retro window before the brain is due. */
	readonly retroMaxMinutes?: number;
	/** More than 0: the brain is a list of at most this many rules (P210). */
	readonly maxRules?: number;
	/** Words a brain may have. */
	readonly maxWords?: number;
	/** Rounds of proposal and vote a team gets per move before a random cell is played for it (default 3; slow models need more, P81). */
	readonly maxRounds?: number;
	/** Residents per team: 3 (default) or 1, a single resident per side that decides alone (the baseline that shows what teamwork adds). */
	readonly teamSize?: 1 | 3;
	/** One side plays alone against a team of three (`teamSize` 3): the head-to-head test of what a team adds over one resident of the same model. */
	readonly soloSide?: "X" | "O";
	/** The first member of each team is captain for the whole match instead of rotating (P86). */
	readonly fixedCaptain?: boolean;
}

/** Words a brain may have: 300 filled up by game 2 with interface rules (P147). */
const DEFAULT_MAX_WORDS = 500;
/** Words of a list of at most 8 one-line rules. */
const RULES_MAX_WORDS = 240;
/**
 * The defaults of the old game. Three rounds of proposal and vote; the retro ends when the brain is written or after
 * 4 posts and 2 ticks, shorter than before (8 posts, 3 ticks) because the longer retro cost time and forfeits (P146).
 */
const DEFAULTS = { games: 3, brain: true, gamemaker: false, seed: 11, maxRules: 0, size: 3, line: 3, maxRounds: 3, teamSize: 3, fixedCaptain: false, retroMaxPosts: 4, retroMaxMinutes: 2 } as const satisfies TicTacToeOptions;
type Filled = TicTacToeOptions & Required<Omit<TicTacToeOptions, "brainTeams" | "minutes" | "maxWords" | "soloSide">>;
type Teams = Record<"X" | "O", string[]>;
const TEAMS: Teams = { X: ["A01", "A02", "A03"], O: ["A04", "A05", "A06"] };
const SOLO_TEAMS: Teams = { X: ["A01"], O: ["A04"] };
const teamsOf = (teamSize: 1 | 3, soloSide?: "X" | "O"): Teams => (teamSize === 1 ? SOLO_TEAMS : { X: soloSide === "X" ? SOLO_TEAMS.X : TEAMS.X, O: soloSide === "O" ? SOLO_TEAMS.O : TEAMS.O });
/** Ticks a game takes, scaled with the cells of the board: 16 for 9 cells, 28 for 16. */
const minutesPerGame = (size: number): number => Math.round((size * size * 16) / 9 / 4) * 4;

// The five mechanics with the options of the old game, in its order.
function mechanicsOf(filled: Filled, teams: Teams, brain: boolean) {
	const { games, brainTeams, maxRules, maxWords = maxRules > 0 ? RULES_MAX_WORDS : DEFAULT_MAX_WORDS, size, line, maxRounds, fixedCaptain, retroMaxPosts, retroMaxMinutes } = filled;
	return [
		gridGame({ size, line, games, alternateStart: true, teams, wakeTeam: true, fixedCaptain }),
		consensus({ tool: "playMove", param: "cell", rule: "majority", maxRounds, onDeadlock: "forfeitRandomLegalMove", maxConsecutiveForfeits: 4, teams }),
		teamChannel({ teams, maxPostsPerMove: 3 }),
		strategyBrain({ enabled: brain, ...(brainTeams === undefined ? {} : { brainTeams: [...brainTeams] }), maxWords, maxRules, teams, retroMaxPosts, retroMaxMinutes, shared: false, brainAtStart: true }),
		optimalReferee({ maxEmptyCells: Math.min(16, size * size) }),
	] as const;
}

// Whether any team keeps a brain; refuses what the old game refused.
function brainOf({ brain, brainTeams, gamemaker }: Filled): boolean {
	if (brainTeams?.some((team) => !(team in TEAMS))) throw new Error(`tictactoe-teams: brainTeams must name teams of ${Object.keys(TEAMS).join(", ")}`);
	if (gamemaker) throw new Error("tictactoe-teams: the gamemaker variant is not built yet");
	return brain && (brainTeams === undefined || brainTeams.length > 0);
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @throws Error for a name in `brainTeams` that is no team, and for `gamemaker: true`.
 * @example
 * ```ts
 * const played = await play(tictactoeGame({ size: 4, line: 4 }), { seed: 7 });
 * ```
 *
 * @public
 */
export function tictactoeGame(options: TicTacToeOptions = {}) {
	const filled: Filled = { ...DEFAULTS, ...options };
	const { games, brainTeams, size, line, fixedCaptain } = filled;
	const teams = teamsOf(filled.teamSize, filled.soloSide);
	const brain = brainOf(filled);
	return defineGame({
		id: "tictactoe-teams",
		title: "Tic-tac-toe teams",
		seed: filled.seed,
		residents: [...teams.X, ...teams.O],
		mechanics: mechanicsOf(filled, teams, brain),
		grants: { resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["playMove", "writeBrain"] : ["playMove"],
		// Five passes a tick: propose, vote and play fit in one tick whatever the order; the reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "grid-game" }, { source: "team-channel" }, { source: "consensus" }] } },
		limits: { maxCallsPerTick: 8 },
		end: { ticks: filled.minutes ?? games * minutesPerGame(size) + 8 },
		win: { fact: "grid-game.tally" },
		briefing: briefings({ teams, brainTeams: filled.brain ? (brainTeams ?? Object.keys(TEAMS)) : [], size, line, fixedCaptain }),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: 16000 },
	});
}

export default tictactoeGame();
