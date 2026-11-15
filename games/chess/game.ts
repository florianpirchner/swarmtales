// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Chess: two solo seats play a match of chess games with alternating colours. chess.js is the legality filter and
 * the referee: a move is text, an illegal one is refused and the board stays, and chess.js ends the game (mate,
 * stalemate, repetition, fifty moves, insufficient material); a move cap scores long games on material. Every game
 * starts from a fresh context; the only memory across games is each seat's private strategy brain. The material
 * baseline scores every move for the report; the seats never see it. A port of the old `stories/chess/story.ts`:
 * the variants are options of the factory, the id is always `chess`. This issue carries the default, the fresh
 * context per move and the compact board, the legal-move lists, the loose pieces, the coach, two teams of two, the
 * control arm without a brain and the settled cap. The file exports the game family: the variants that an experiment
 * or `--set` may choose are its params, and its defaults give the game of the old platform.
 */
import { SwtError } from "@swarmtales/contracts";
import { chess } from "@swarmtales/mechanic-chess";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { teamChannel } from "@swarmtales/mechanic-team-channel";
import { defineGame, defineGameFamily, paramOverride } from "@swarmtales/sdk";
import { Type } from "typebox";
import { briefings, residentsOf, SEATS, TEAMS } from "./briefing.ts";

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
	/** Each seat keeps a strategy brain (default true); false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** The position shown to the seat on move lists every legal move (default off: the list comes only with a refused move). */
	readonly showLegalMoves?: boolean;
	/** The position lists each side's loose pieces (attacked and undefended, or attacked by a cheaper piece). */
	readonly showThreats?: boolean;
	/** After each game a coach reviews each seat's worst moves by the material baseline, in private, for its next retro (needs the brain). */
	readonly coach?: boolean;
	/** Two teams of two (A: A01, A02; B: A03, A04) with a private chat; the captaincy rotates move by move, the other member advises. */
	readonly teams?: boolean;
	/** At the cap, settle the capture still open on the board before counting material (LH17). */
	readonly settleCap?: boolean;
}

const PASSES = 4;
const IDLE_TURNS = 3;
const RETRO_TICKS = 2;
/** Output cap per call, as for the other games of the old platform (P94: a 4000-token cap made thinking models end turns without a tool call). */
const OUTPUT_TOKENS = 16000;
/** The defaults of the old game. */
const DEFAULTS = { games: 2, maxPlies: 160, maxWords: 150, seed: 29, fresh: false, compact: false, brain: true, showLegalMoves: false, showThreats: false, coach: false, teams: false, settleCap: false } as const satisfies ChessOptions;
type Filled = ChessOptions & Required<Omit<ChessOptions, "ticks">>;

/**
 * An upper bound of the run length (the old `minutesFor`): every half-move takes all its idle turns, every retro its
 * timeout. The team variant doubles it (`chessGame`): a team half-move takes one more pass, the advisor posts, then
 * the captain plays.
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
function mechanicsOf({ games, maxPlies, maxWords, fresh, compact, brain, showLegalMoves, showThreats, coach, teams, settleCap }: Filled) {
	const sides = teams ? Object.fromEntries(Object.entries(TEAMS).map(([name, members]) => [name, [...members]])) : Object.fromEntries(SEATS.map((seat) => [seat, [seat]]));
	return [
		chess({ games, maxPlies, showLegalMoves, showThreats, coach, maxIdleTurns: IDLE_TURNS, maxForfeits: 3, adjudicateMargin: 3, alternateColours: true, score: true, teams: sides, wakeTeam: teams, freshContext: fresh, compactBoard: compact, settleCap }),
		teamChannel({ teams: teams ? sides : {}, maxPostsPerMove: 2 }),
		strategyBrain({ enabled: brain, solo: !teams, maxWords, teams: sides, retroMaxPosts: 6, retroMaxMinutes: RETRO_TICKS, shared: false, brainAtStart: true }),
	] as const;
}

// The reset line first. Two solo seats need no more; a team needs every source in the order of the old hook numbers (the brain, chess, the team's new posts), else the advisor's lines come in load order.
const SOLO_INPUTS = [{ kind: "context-reset" }] as const;
const TEAM_INPUTS = [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "chess" }, { source: "team-channel" }] as const;

// The options with every default filled in; the coach reviews into the brain retro, which a match without a brain does not have.
function filledOf(options: ChessOptions): Filled {
	const filled: Filled = { ...DEFAULTS, ...options };
	if (filled.coach && !filled.brain) throw new SwtError(paramOverride({ name: "coach", problem: "mismatch", message: "needs the brain: the coach reviews into the brain retro, and a match without a brain (brain: false) has none" }));
	return filled;
}

/**
 * The game with its variants as options.
 *
 * @param options - The variant; every option has the default of the old game.
 * @returns The game in its builder form.
 * @throws SwtError `SWT-G041` when `coach` is set without the brain (`brain: false`).
 * @example
 * ```ts
 * const played = await play(chessGame({ fresh: true, compact: true, games: 4, maxPlies: 80 }), { seed: 47 });
 * ```
 *
 * @public
 */
export function chessGame(options: ChessOptions = {}) {
	const filled = filledOf(options);
	const { brain, teams } = filled;
	return defineGame({
		id: "chess",
		title: teams ? "Chess teams" : "Chess",
		seed: filled.seed,
		residents: [...residentsOf(teams)],
		mechanics: mechanicsOf(filled),
		grants: { resident: ["viewBoard", "playMove", "resign", ...(teams ? (["postTeam", "readTeam"] as const) : []), ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["playMove", "resign", ...(brain ? (["writeBrain"] as const) : [])],
		// Only the seat on move (and, in a team, its advisor) has news, so a pass is one or two half-moves.
		scheduler: { id: "turns", options: { passes: PASSES, activation: "onNews", inputs: teams ? TEAM_INPUTS : SOLO_INPUTS } },
		// A turn may look at the board and retry a refused move a few times.
		limits: { maxCallsPerTick: 16 },
		end: { ticks: filled.ticks ?? ticksFor(filled.games, filled.maxPlies) * (teams ? 2 : 1) },
		win: { fact: "chess.scores" },
		briefing: briefings(brain, teams),
		model: { id: "anthropic/claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS },
	});
}

const flag = (name: keyof typeof DEFAULTS, description: string) => Type.Boolean({ default: DEFAULTS[name] === true, description });

/**
 * The params of the family: the variants an arm of an experiment or `--set` may choose, with the bounds of the old
 * variant-name parser. The seed and the tick count are no params: the seed is the run's, and the tick count follows
 * from the games, the plies and the teams.
 */
const Params = Type.Object(
	{
		games: Type.Integer({ minimum: 1, maximum: 20, default: DEFAULTS.games, description: "Games in the match; the colours swap from game to game." }),
		maxPlies: Type.Integer({ minimum: 2, maximum: 400, default: DEFAULTS.maxPlies, description: "Half-moves after which a game is scored on material." }),
		maxWords: Type.Integer({ minimum: 1, default: DEFAULTS.maxWords, description: "Words a brain may have." }),
		fresh: flag("fresh", "The seat on move starts every half-move from a fresh context (rules, brain, its last note, the position)."),
		compact: flag("compact", "The compact board: a grid without spaces and only the last 12 half-moves."),
		brain: flag("brain", "Each seat keeps a strategy brain; false: the same briefings, no brain, no retro (the control arm)."),
		showLegalMoves: flag("showLegalMoves", "The position shown to the seat on move lists every legal move."),
		showThreats: flag("showThreats", "The position lists each side's loose pieces."),
		coach: flag("coach", "After each game a coach reviews each seat's worst moves for its next retro; needs the brain."),
		teams: flag("teams", "Two teams of two with a private chat; the captaincy rotates move by move."),
		settleCap: flag("settleCap", "At the cap, settle the capture still open on the board before counting material (LH17)."),
	},
	{ description: "The variants of chess." },
);

/**
 * Chess as a game family: the default params give the registry default of the old platform (two games of at most 160
 * half-moves, a brain per seat); `{ games: 4, maxPlies: 80, fresh: true, compact: true }` is the arm of the requests
 * series. Its `build` refuses the coach without the brain with `SWT-G041`, as {@link chessGame} does.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game: chessFamily, params: { games: 4, maxPlies: 80, fresh: true, compact: true }, schedulers: { turns }, prompts });
 * ```
 *
 * @public
 */
export const chessFamily = defineGameFamily(Params, (params) => chessGame(params));

export default chessFamily;
