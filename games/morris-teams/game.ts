// SPDX-License-Identifier: Apache-2.0
/**
 * Nine men's morris teams: two teams of three residents play a match of nine men's morris on one board, the
 * tic-tac-toe teams setup on a bigger game. Before every move the team talks in its private chat, the captain of the
 * turn proposes a move, the two others vote and only the agreed move can be played; a turn that closes a mill is
 * followed by a second agreed move, the piece to remove. Every game starts from a fresh context; the only memory
 * across games is the team's strategy brain (`brain: false`: the same briefings, no brain). The Referee scores every
 * turn against an alpha-beta search for the report; residents never see it. With `engineDepth` side O is the built-in
 * search. A port of the old `stories/morris-teams/story.ts`: the variants are options of the factory, the id is always
 * `morris-teams`.
 */
import { consensus } from "@swarmtales/mechanic-consensus";
import { morris } from "@swarmtales/mechanic-morris";
import { morrisReferee } from "@swarmtales/mechanic-morris-referee";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame } from "@swarmtales/sdk";
import { briefings, type Teams } from "./briefing.ts";

/**
 * The variants of nine men's morris teams.
 *
 * @public
 */
export interface MorrisOptions {
	/** Games in the match (default 3); the run ends after the last one. */
	readonly games?: number;
	/** Teams keep a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** The seed of the run; 13 when absent. */
	readonly seed?: number;
	/** Run length in ticks; the default scales with `games` and `maxTurns`. */
	readonly ticks?: number;
	/** Whole turns after which a game is a draw (default 120). */
	readonly maxTurns?: number;
	/** Turns without a mill (after the placing) after which a game is a draw (default 40). */
	readonly maxQuietTurns?: number;
	/** Words a brain may have (default 300). */
	readonly maxWords?: number;
	/** Rounds of proposal and vote a team gets per move before a random legal move is played for it (default 3). */
	readonly maxRounds?: number;
	/** Residents per team: 3 (default) or 1, a single resident per side that decides alone. */
	readonly teamSize?: 1 | 3;
	/** The first member of each team is captain for the whole match instead of rotating. */
	readonly fixedCaptain?: boolean;
	/** Whole turns the Referee's search looks ahead (default 3). */
	readonly refereeDepth?: number;
	/** Side O is a scripted opponent: the morris search plays it at this depth (whole turns); the residents all play X. */
	readonly engineDepth?: number;
}

/** Output cap per call, as the old entry had it (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16000;
/** The defaults of the old game. */
const DEFAULTS = { games: 3, brain: true, seed: 13, maxTurns: 120, maxQuietTurns: 40, maxWords: 300, maxRounds: 3, teamSize: 3, fixedCaptain: false, refereeDepth: 3 } as const satisfies MorrisOptions;
type Filled = MorrisOptions & Required<Omit<MorrisOptions, "ticks" | "engineDepth">>;
const TEAMS: Teams = { X: ["A01", "A02", "A03"], O: ["A04", "A05", "A06"] };
const SOLO_TEAMS: Teams = { X: ["A01"], O: ["A04"] };
const teamsOf = (teamSize: 1 | 3, engine: boolean): Teams => {
	const teams = teamSize === 1 ? SOLO_TEAMS : TEAMS;
	return engine ? { X: teams.X, O: [] } : teams;
};

/**
 * The run length of the old game: a turn takes a tick (propose, vote, play), a mill one more; the retros take a few.
 *
 * @param games - Games in the match.
 * @param maxTurns - The turn limit of a game.
 * @returns The ticks.
 *
 * @public
 */
export function ticksFor(games: number, maxTurns: number): number {
	return games * (Math.ceil(maxTurns * 1.3) + 6) + 8;
}

// The five mechanics with the options of the old game, in its order.
function mechanicsOf(filled: Filled, teams: Teams) {
	const { games, brain, maxTurns, maxQuietTurns, maxWords, maxRounds, fixedCaptain, refereeDepth, engineDepth } = filled;
	// The engine's side has no residents, so the gate, the chat and the brain know the residents' team only.
	const playing = engineDepth === undefined ? { X: [...teams.X], O: [...teams.O] } : { X: [...teams.X] };
	return [
		morris({ games, maxTurns, maxQuietTurns, alternateStart: true, teams: { X: [...teams.X], O: [...teams.O] }, wakeTeam: true, fixedCaptain, ...(engineDepth === undefined ? {} : { engine: { side: "O" as const, depth: engineDepth, maxNodes: 200_000 } }) }),
		consensus({ tool: "playMove", param: "move", rule: "majority", maxRounds, onDeadlock: "forfeitRandomLegalMove", maxConsecutiveForfeits: 6, teams: playing }),
		teamChannel({ teams: playing, maxPostsPerMove: 3 }),
		strategyBrain({ enabled: brain, maxWords, teams: playing, retroMaxPosts: 8, retroMaxMinutes: 3, shared: false, brainAtStart: true }),
		morrisReferee({ depth: refereeDepth }),
	] as const;
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(morrisGame({ teamSize: 1, engineDepth: 3, brain: false }), { seed: 33 });
 * ```
 *
 * @public
 */
export function morrisGame(options: MorrisOptions = {}) {
	const filled: Filled = { ...DEFAULTS, ...options };
	const { brain, fixedCaptain, maxTurns, maxQuietTurns, engineDepth } = filled;
	const engine = engineDepth !== undefined;
	const teams = teamsOf(filled.teamSize, engine);
	return defineGame({
		id: "morris-teams",
		title: `Nine men's morris ${filled.teamSize === 1 ? "solo" : "teams"}${engine ? " against the engine" : ""}`,
		seed: filled.seed,
		residents: [...teams.X, ...teams.O],
		mechanics: mechanicsOf(filled, teams),
		grants: { resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: brain ? ["playMove", "writeBrain"] : ["playMove"],
		// Five passes a tick: propose, vote and play fit in one tick whatever the order; the reset line comes first, then the lines in the order of the old hook numbers.
		scheduler: { id: "turns", options: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "morris" }, { source: "team-channel" }, { source: "consensus" }] } },
		// A mill doubles the work of a tick (the step, then the removal), so the captain gets more calls than in tic-tac-toe.
		limits: { maxCallsPerTick: 12 },
		end: { ticks: filled.ticks ?? ticksFor(filled.games, maxTurns) },
		win: { fact: "morris.tally" },
		briefing: briefings({ teams, brain, fixedCaptain, maxTurns, maxQuietTurns, engine }),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
	});
}

export default morrisGame();
