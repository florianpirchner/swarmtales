// SPDX-License-Identifier: Apache-2.0
/**
 * Chess: two solo seats play a match of chess games with alternating colours. chess.js is the legality filter and
 * the referee: a move is text, an illegal one is refused and the board stays, and chess.js ends the game (mate,
 * stalemate, repetition, fifty moves, insufficient material); a move cap scores long games on material. Every game
 * starts from a fresh context; the only memory across games is each seat's private strategy brain. The material
 * baseline scores every move for the report; the seats never see it. A port of the old `stories/chess/story.ts`:
 * the variants are options of the factory, the id is always `chess`. This issue carries the default, the fresh
 * context per move and the compact board; the lists, the threats, the coach, the teams, the control arm and the
 * settled cap come with the variants.
 */
import { chess } from "@swarmtales/mechanic-chess";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame } from "@swarmtales/sdk";
import { briefings, SEATS } from "./briefing.ts";

/**
 * The variants of chess.
 *
 * @public
 */
export interface ChessOptions {
	/** Games in the match (default 2); the colours swap from game to game (A01 is White in game 1). */
	readonly games?: number;
	/** Half-moves after which a game is scored on material (default 160). */
	readonly maxPlies?: number;
	/** Words a brain may have (default 150). */
	readonly maxWords?: number;
	/** The seed of the run; 29 when absent. */
	readonly seed?: number;
	/** Run length in ticks; default is an upper bound from the plies (the match ends the run earlier). */
	readonly ticks?: number;
	/** The seat on move starts every half-move from a fresh context (rules, brain, its last note, the position); default: once per game. */
	readonly fresh?: boolean;
	/** The compact board: a grid without spaces and only the last 12 half-moves. */
	readonly compact?: boolean;
}

const PASSES = 4;
const IDLE_TURNS = 3;
const RETRO_TICKS = 2;
/** Output cap per call, as for the other games of the old platform (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16000;
/** The defaults of the old game. */
const DEFAULTS = { games: 2, maxPlies: 160, maxWords: 150, seed: 29, fresh: false, compact: false } as const satisfies ChessOptions;
type Filled = ChessOptions & Required<Omit<ChessOptions, "ticks">>;

/**
 * An upper bound of the run length (the old `minutesFor`): every half-move takes all its idle turns, every retro its
 * timeout. The team variant doubles it.
 *
 * @param games - Games in the match.
 * @param maxPlies - The move cap of a game.
 * @returns The ticks.
 *
 * @public
 */
export function ticksFor(games: number, maxPlies: number): number {
	return games * Math.ceil((maxPlies * IDLE_TURNS) / PASSES) + (games + 1) * RETRO_TICKS + 4;
}

// The three mechanics with the options of the old game, in its order. Solo seats have no team chat: the channel has no teams and nobody is granted its tools.
function mechanicsOf({ games, maxPlies, maxWords, fresh, compact }: Filled) {
	const sides = Object.fromEntries(SEATS.map((seat) => [seat, [seat]]));
	return [
		chess({ games, maxPlies, showLegalMoves: false, showThreats: false, coach: false, maxIdleTurns: IDLE_TURNS, maxForfeits: 3, adjudicateMargin: 3, alternateColours: true, score: true, teams: sides, wakeTeam: false, freshContext: fresh, compactBoard: compact, settleCap: false }),
		teamChannel({ teams: {}, maxPostsPerMove: 2 }),
		strategyBrain({ enabled: true, solo: true, maxWords, teams: sides, retroMaxPosts: 6, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
	] as const;
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @example
 * ```ts
 * const played = await play(chessGame({ fresh: true, compact: true, games: 4, maxPlies: 80 }), { seed: 47 });
 * ```
 *
 * @public
 */
export function chessGame(options: ChessOptions = {}) {
	const filled: Filled = { ...DEFAULTS, ...options };
	return defineGame({
		id: "chess",
		title: "Chess",
		seed: filled.seed,
		residents: [...SEATS],
		mechanics: mechanicsOf(filled),
		grants: { resident: ["viewBoard", "playMove", "resign", "readBrain", "writeBrain"] },
		locked: ["playMove", "resign", "writeBrain"],
		// Only the seat on move has news, so a pass is one or two half-moves; the reset line comes first.
		scheduler: { id: "turns", options: { passes: PASSES, activation: "onNews", inputs: [{ kind: "context-reset" }] } },
		// A turn may look at the board and retry a refused move a few times.
		limits: { maxCallsPerTick: 16 },
		end: { ticks: filled.ticks ?? ticksFor(filled.games, filled.maxPlies) },
		win: { fact: "chess.scores" },
		briefing: briefings(),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
	});
}

export default chessGame();
