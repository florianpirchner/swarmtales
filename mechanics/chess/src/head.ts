// SPDX-License-Identifier: Apache-2.0
/** The head of the `chess` mechanic: its options, its state with the snapshot, its events, services, prompts and tools. */
import { Type, type Static } from "typebox";
import { defineHead, type CtxOf, type ToolCtxOf, type ViewOf } from "@swarmtales/sdk";
import { BrainSourceService } from "@swarmtales/mechanic-contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { TeamChannelService } from "@swarmtales/mechanic-team-channel/contract";
import { chessMetrics } from "./metrics.ts";
import { EndReason, MoveClass, Result } from "./model.ts";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, default: 2, description: "How many games the match has; the run ends after the last." }),
	alternateColours: Type.Boolean({ default: true, description: "The colours swap from game to game (the first seat is White in game 1); false: the first seat is always White." }),
	maxPlies: Type.Integer({ minimum: 2, default: 160, description: "Half-moves after which a game is stopped and scored on material." }),
	adjudicateMargin: Type.Integer({ minimum: 1, default: 3, description: "At the move cap, the side ahead by at least this much material (pawn 1, queen 9) wins; else a draw." }),
	maxIdleTurns: Type.Integer({ minimum: 1, default: 3, description: "Turns in a row on move without a legal move before a random legal move is played for the seat." }),
	maxForfeits: Type.Integer({ minimum: 0, default: 3, description: "Forfeit moves in one game that lose it; 0: never." }),
	showLegalMoves: Type.Boolean({ default: false, description: "The position shown to the seat on move lists every legal move (off: the list comes only with a refused move)." }),
	showThreats: Type.Boolean({ default: false, description: "The position shown to every seat lists each side's loose pieces: attacked and undefended, or attacked by a cheaper piece (a static check, no pins)." }),
	score: Type.Boolean({ default: true, description: "Score every move against the material baseline (`move_scored`, for the human)." }),
	teams: Type.Optional(
		Type.Record(Type.String(), Type.Array(Type.String(), { minItems: 1 }), {
			description: "The two sides by name, each with its members in the order the captaincy rotates (one move each). Default: each of the two residents is a side of its own, named by its id.",
		}),
	),
	coach: Type.Boolean({ default: false, description: "After each game, every side gets a private review of its own worst moves by the material baseline, shown in its next brain retro (needs a strategy brain)." }),
	coachMoves: Type.Integer({ minimum: 1, default: 3, description: "How many of a side's worst moves the coach's review names." }),
	wakeTeam: Type.Boolean({ default: false, description: "Every member of the side on move gets one turn per half-move to advise its captain in the team chat; false: only the captain has news." }),
	freshContext: Type.Boolean({
		default: false,
		description: "The seat on move starts every half-move from a fresh context: the rules, its strategy brain, the note it gave with its last move, and the position (false: the context is dropped only between games).",
	}),
	compactBoard: Type.Boolean({ default: false, description: "The position is shown as a compact grid without spaces and only the last moves (false: the spaced grid and the whole move list)." }),
	compactMoves: Type.Integer({ minimum: 1, default: 12, description: "Half-moves the compact board lists." }),
	settleCap: Type.Boolean({
		default: false,
		description: "At the move cap, the side to move is credited with the most it can win with one capture before the material is counted, so a grab on the last half-move into a recapture does not count (LH17).",
	}),
});

/**
 * The schema of one finished game of the match.
 *
 * @public
 */
export const GameRecord = Type.Object({
	game: Type.Integer(),
	white: Type.String(),
	black: Type.String(),
	result: Result,
	reason: EndReason,
	plies: Type.Integer(),
	moves: Type.Array(Type.String()),
	illegal: Type.Record(Type.String(), Type.Integer()),
	forfeits: Type.Record(Type.String(), Type.Integer()),
	resigned: Type.Optional(Type.String()),
});
/**
 * One finished game of the match.
 *
 * @public
 */
export type GameRecord = Static<typeof GameRecord>;

/**
 * The schema of the state of the match, which is its snapshot slice.
 *
 * @public
 */
export const ChessSlice = Type.Object({
	/** The two sides by name (a solo side is named by its resident). */
	seats: Type.Array(Type.String()),
	members: Type.Record(Type.String(), Type.Array(Type.String())),
	/** Moves each side has played in the running game; the captaincy rotates by it. */
	taken: Type.Record(Type.String(), Type.Integer()),
	game: Type.Integer(),
	white: Type.String(),
	black: Type.String(),
	moves: Type.Array(Type.String()),
	idle: Type.Integer(),
	turnPly: Type.Integer(),
	told: Type.Array(Type.String()),
	briefed: Type.Array(Type.String()),
	illegal: Type.Record(Type.String(), Type.Integer()),
	forfeits: Type.Record(Type.String(), Type.Integer()),
	results: Type.Array(GameRecord),
	scores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
	/** The reason each resident gave with its last move in the running game (shown after a fresh context). */
	notes: Type.Optional(Type.Record(Type.String(), Type.Object({ moveNo: Type.Integer(), san: Type.String(), text: Type.String() }))),
});
/**
 * The state of the match.
 *
 * @public
 */
export type ChessState = Static<typeof ChessSlice>;

const ColourSchema = Type.Union([Type.Literal("white"), Type.Literal("black")]);

const Reason = Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." }));

const events = {
	game_started: Type.Object({ game: Type.Integer(), white: Type.String(), black: Type.String() }),
	move_played: Type.Object({
		game: Type.Integer(),
		ply: Type.Integer({ description: "The half-move's number in its game, from 1." }),
		colour: ColourSchema,
		by: Type.String(),
		san: Type.String(),
		written: Type.String({ description: "The move as the seat wrote it ('' for a forfeit move)." }),
		fen: Type.String({ description: "The position after the move." }),
		forfeit: Type.Boolean(),
	}),
	move_refused: Type.Object({ game: Type.Integer(), ply: Type.Integer(), colour: ColourSchema, by: Type.String(), written: Type.String(), count: Type.Integer({ description: "The seat's refused moves in this game so far, this one included." }) }),
	move_scored: Type.Object({
		game: Type.Integer(),
		ply: Type.Integer(),
		colour: ColourSchema,
		by: Type.String(),
		san: Type.String(),
		best: Type.String(),
		bestValue: Type.Number(),
		playedValue: Type.Number(),
		loss: Type.Number(),
		class: MoveClass,
	}),
	game_ended: Type.Object({ ...GameRecord.properties, pgn: Type.String() }),
	match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	coach_review: Type.Object({ game: Type.Integer(), side: Type.String(), losses: Type.Integer({ description: "The side's moves that lost material by the baseline (loss 1 or more)." }), text: Type.String() }),
};

/**
 * The event schemas of chess, by event type: what its metrics are typed by.
 *
 * @internal
 */
export type ChessEvents = typeof events;

/**
 * The head of chess: everything that can be read without running a handler.
 *
 * @public
 */
export const chessHead = defineHead({
	id: "chess",
	package: "@swarmtales/mechanic-chess",
	summary: "A match of chess games between two solo seats; chess.js checks every move and ends the games.",
	options,
	state: ChessSlice,
	start: (setup): ChessState => {
		const teams = setup.options.teams ?? Object.fromEntries(setup.residents.map((id) => [id, [id]]));
		const names = Object.keys(teams);
		if (names.length !== 2) throw new RangeError(`chess: the match needs exactly two sides, not ${String(names.length)}`);
		const members = Object.values(teams).flat();
		if (new Set(members).size !== members.length) throw new RangeError("chess: a resident may play on one side only");
		const unknown = members.find((id) => !setup.residents.includes(id));
		if (unknown !== undefined) throw new RangeError(`chess: ${unknown} is not a resident of the run`);
		return {
			seats: names,
			members: Object.fromEntries(Object.entries(teams).map(([name, list]) => [name, [...list]])),
			taken: Object.fromEntries(names.map((name) => [name, 0])),
			game: 0,
			white: "",
			black: "",
			moves: [],
			idle: 0,
			turnPly: -1,
			told: [],
			briefed: [],
			illegal: {},
			forfeits: {},
			results: [],
			scores: Object.fromEntries(names.map((name) => [name, 0])),
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	snapshot: {
		save: (state: ChessState) => structuredClone(state),
		load: (data): ChessState => structuredClone(data),
	},
	events,
	metrics: chessMetrics(events),
	// The baseline's verdict and the refused attempts are for the human and the reporter only.
	audiences: { move_scored: ["human"], move_refused: ["human"], coach_review: ["human"] },
	provides: [BrainSourceService],
	uses: [StrategyBrainService, TeamChannelService],
	prompts: {
		"chess/tools/viewBoard": [],
		"chess/tools/playMove": [],
		"chess/tools/resign": [],
		"chess/rules": ["game", "games", "colour", "opponent", "maxMoves"],
		"chess/your-move": ["game", "moveNo", "colour"],
		"chess/last-move": ["san"],
		"chess/check": [],
		"chess/legal-moves": ["moves"],
		"chess/threats": ["white", "black"],
		"chess/how-to-move": [],
		"chess/still-your-move": ["game", "moveNo"],
		"chess/forfeit-warning": ["left"],
		"chess/advise": ["colour", "captain"],
		"chess/coach-review": ["count", "total", "moves"],
		"chess/coach-clean": ["total"],
		"chess/coach-move": ["moveNo", "san", "loss", "best"],
		"chess/fresh-context": [],
		"chess/last-note": ["moveNo", "san", "text"],
		"chess/cap-settled": [],
	},
	tools: {
		viewBoard: { description: "chess/tools/viewBoard", params: Type.Object({}), for: ["resident"] },
		playMove: {
			description: "chess/tools/playMove",
			params: Type.Object({ move: Type.String({ minLength: 1, maxLength: 40, description: "The move: SAN (Nf3, exd5, O-O, e8=Q) or from and to squares (g1f3, e7e8q)." }), reason: Reason }),
			for: ["resident"],
		},
		resign: { description: "chess/tools/resign", params: Type.Object({ reason: Reason }), for: ["resident"] },
	},
});

/**
 * The context of the hooks, jobs and services of chess.
 *
 * @public
 */
export type ChessCtx = CtxOf<typeof chessHead>;

/**
 * The context of the tools of chess.
 *
 * @public
 */
export type ChessToolCtx = ToolCtxOf<typeof chessHead>;

/**
 * The read-only view of the fact and the run limit of chess.
 *
 * @public
 */
export type ChessView = ViewOf<typeof chessHead>;
