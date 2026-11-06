/**
 * The `morris` mechanic: nine men's morris (rules in `rules.ts`) between two teams over a match of
 * `games` games. The mechanic owns the board, the pieces in hand, the side to move, mills and
 * removals, the end of a game (a side down to two pieces or blocked; a draw by repetition, by too many
 * turns without a mill, or by the turn limit), the game counter and the swap of the starting side.
 *
 * A move is one integer (`rules.ts`): a placement is the point, a move is `from * 100 + to`. A step
 * that closes a mill leaves the same side on move, with the same captain, for a second move that
 * names the opposing piece to remove; so the consensus gate decides each part on its own, and a
 * forfeit removal is a random removable piece. `playMove` is a locked tool, open for the captain of
 * the turn only (the captain rotates move by move unless `fixedCaptain`), and `consensus` gates it
 * further. A strategy brain plugs in through `BrainSourceApi` and `StrategyBrainApi`. The match ends
 * the run through the referee limit `morris.match` once the last game is over. With the `engine`
 * option one side has no residents: the search (`search.ts`) plays its whole turn, step and removal,
 * the moment it comes on move, so that side is never on move between two calls and the consensus
 * gate never sees it. Nothing here scores moves (that is the morris-referee) or knows about team chat
 * beyond opening its rounds.
 */
import { Type, type Static } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { ConsensusApi, ConsensusSourceApi } from "@swarmtales/mechanic-consensus";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import { TeamChannelApi } from "@swarmtales/mechanic-team-channel";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { MorrisEvents } from "./events.ts";
import {
	Cell,
	applyRemove,
	applyStep,
	decodeStep,
	emptyBoard,
	hasLost,
	legalSteps,
	onBoard,
	other,
	positionKey,
	removable,
	renderBoard,
	Result,
	Side,
	stageOf,
	stepCode,
	stepText,
	type Position,
	type Stage,
} from "./rules.ts";
import { bestTurns } from "./search.ts";

export { MorrisEvents } from "./events.ts";
export * from "./rules.ts";
export { classify, scoreTurn } from "./search.ts";

const PLAY_MOVE = "playMove";


const options = Type.Object({
	games: Type.Integer({ minimum: 1, default: 3, description: "How many games the match has; the run ends after the last one." }),
	pieces: Type.Integer({ minimum: 3, maximum: 12, default: 9, description: "Pieces per side (9 in nine men's morris)." }),
	flying: Type.Boolean({ default: true, description: "A side with three pieces left may move a piece to any free point." }),
	maxTurns: Type.Integer({ minimum: 1, default: 120, description: "Whole turns (both sides) after which a game is a draw." }),
	maxQuietTurns: Type.Integer({ minimum: 1, default: 40, description: "Whole turns without a mill, once both sides have placed every piece, after which a game is a draw." }),
	repetitions: Type.Integer({ minimum: 2, default: 3, description: "A game is a draw when the same position (with the same side to move) comes up this often." }),
	alternateStart: Type.Boolean({ default: true, description: "The starting side alternates from game to game (X starts game 1); false: X always starts." }),
	fixedCaptain: Type.Boolean({ default: false, description: "The first member of each team is its captain for the whole match; false: the captaincy rotates, one turn each." }),
	wakeTeam: Type.Boolean({ default: false, description: "With activation onNews, every member of the team on move has news (so the others can advise and vote), not only the captain." }),
	teams: Type.Optional(
		Type.Object(
			{
				X: Type.Array(Type.String(), { description: "Resident ids of the X team, in the order their captaincy rotates (empty when the engine plays X)." }),
				O: Type.Array(Type.String(), { description: "Resident ids of the O team, in the order their captaincy rotates (empty when the engine plays O)." }),
			},
			{ description: "The two teams; without it the residents are split in half, the first half playing X (all of them play X when the engine plays O, and the other way round)." },
		),
	),
	engine: Type.Optional(
		Type.Object(
			{
				side: Type.Union([Type.Literal("X"), Type.Literal("O")], { description: "The side the engine plays; its team has no residents." }),
				depth: Type.Integer({ minimum: 1, maximum: 6, default: 3, description: "Whole turns the engine's search looks ahead at most." }),
				maxNodes: Type.Integer({ minimum: 1000, default: 200_000, description: "Positions one search depth may visit; a deeper search that exceeds it is dropped and the last finished depth counts." }),
			},
			{ description: "A scripted opponent: this side has no residents and plays the best turn of an alpha-beta search (ties broken by the seeded random), the moment it comes on move." },
		),
	),
});

/** The name the engine plays under in `move_played.by` and in the teams line of viewBoard. */
export const ENGINE = "engine";

const Count = Type.Object({ X: Type.Integer(), O: Type.Integer() });
const Reason = MorrisEvents.events.game_ended.properties.reason;
type EndReason = Static<typeof Reason>;

const GameRecord = Type.Object({ game: Type.Integer(), result: Result, reason: Reason, turns: Type.Integer(), moves: Type.Array(Type.Integer()) });
type GameRecord = Static<typeof GameRecord>;

interface MorrisState {
	teams: { X: string[]; O: string[] };
	board: Cell[];
	side: Side;
	inHand: { X: number; O: number };
	game: number;
	startingSide: Side;
	/** Every move number of the current game, removals included. */
	moves: number[];
	/** Whole turns started in the current game. */
	turnNo: number;
	/** The side to move closed a mill and must name the piece to remove. */
	removing: boolean;
	/** Whole turns without a mill since both sides placed every piece. */
	quiet: number;
	/** How often each position (after the placing) came up in this game. */
	seen: Record<string, number>;
	/** Turns each side has finished in the match: the captain rotates with them. */
	taken: { X: number; O: number };
	results: GameRecord[];
	running: boolean;
	finished: boolean;
	held: boolean;
	due: boolean;
	invalid?: boolean;
	/** The last turn the captain on move was told about ("game:turn:removing:minute"), so it is told once per turn and minute. */
	told?: string;
}

const MorrisSlice = Type.Object({
	teams: Type.Object({ X: Type.Array(Type.String()), O: Type.Array(Type.String()) }),
	board: Type.Array(Cell),
	side: Side,
	inHand: Count,
	game: Type.Integer(),
	startingSide: Side,
	moves: Type.Array(Type.Integer()),
	turnNo: Type.Integer(),
	removing: Type.Boolean(),
	quiet: Type.Integer(),
	seen: Type.Record(Type.String(), Type.Integer()),
	taken: Count,
	results: Type.Array(GameRecord),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
	invalid: Type.Optional(Type.Boolean()),
	told: Type.Optional(Type.String()),
});

const head = defineHead({
	id: "morris",
	summary: "Nine men's morris between two teams: placing, moving and flying, mills and removals, the captain of the turn and a match of several games.",
	options,
	state: (setup): MorrisState => {
		const { teams, pieces, engine } = setup.options;
		const half = Math.ceil(setup.residents.length / 2);
		const split = engine === undefined ? { X: setup.residents.slice(0, half), O: setup.residents.slice(half) } : engine.side === "X" ? { X: [], O: [...setup.residents] } : { X: [...setup.residents], O: [] };
		const chosen = teams ?? split;
		const members = [...chosen.X, ...chosen.O];
		for (const side of ["X", "O"] as const) {
			const empty = chosen[side].length === 0;
			if (engine?.side === side && !empty) throw new Error(`morris: the engine plays ${side}, so team ${side} must have no residents`);
			if (engine?.side !== side && empty) throw new Error("morris: each team needs at least one resident");
		}
		if (new Set(members).size !== members.length) throw new Error("morris: a resident may play in one team only");
		const unknown = members.find((id) => !setup.residents.includes(id));
		if (unknown !== undefined) throw new Error(`morris: ${unknown} is not a resident of the run`);
		return {
			teams: { X: [...chosen.X], O: [...chosen.O] },
			board: emptyBoard(),
			side: "X",
			inHand: { X: pieces, O: pieces },
			game: 0,
			startingSide: "X",
			moves: [],
			turnNo: 0,
			removing: false,
			quiet: 0,
			seen: {},
			taken: { X: 0, O: 0 },
			results: [],
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	events: MorrisEvents.events,
	provides: [ConsensusSourceApi, BrainSourceApi],
	uses: [ConsensusApi, TeamChannelApi, StrategyBrainApi],
	prompts: {
		"morris/tools/viewBoard": [],
		"morris/tools/playMove": [],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const positionOf = (state: Readonly<MorrisState>): Position => ({ board: state.board, side: state.side, inHand: state.inHand });

function tallyOf(results: readonly GameRecord[]): { X: number; O: number; draw: number } {
	const tally = { X: 0, O: 0, draw: 0 };
	for (const { result } of results) tally[result] += 1;
	return tally;
}

/** The captain of the turn: the team's members take turns, one whole turn each. */
function captainOf(state: Readonly<MorrisState>): string | null {
	if (!state.running) return null;
	const team = state.teams[state.side];
	return team[state.taken[state.side] % team.length] ?? null;
}

/** The move numbers the side to move may play now: the removable points while removing, else its steps. */
function legalCodes(state: Readonly<MorrisState>, flying: boolean): readonly number[] {
	if (!state.running) return [];
	if (state.removing) return removable(state.board, other(state.side)).map((point) => point + 1);
	return legalSteps(positionOf(state), flying).map(stepCode);
}

/** Opens `playMove` for the captain and closes it for everybody else. */
function refreshLocks(ctx: Ctx): void {
	const captain = captainOf(ctx.state);
	for (const resident of ctx.residents.ids) {
		if (resident === captain) ctx.access.unlock(resident, PLAY_MOVE);
		else ctx.access.lock(resident, PLAY_MOVE);
	}
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.board = emptyBoard();
	state.inHand = { X: ctx.options.pieces, O: ctx.options.pieces };
	state.moves = [];
	state.turnNo = 0;
	state.removing = false;
	state.quiet = 0;
	state.seen = {};
	state.startingSide = ctx.options.alternateStart && game % 2 === 0 ? "O" : "X";
	state.side = state.startingSide;
	state.running = true;
	ctx.emit("game_started", { game, startingSide: state.startingSide, xTeam: [...state.teams.X], oTeam: [...state.teams.O], pieces: ctx.options.pieces, flying: ctx.options.flying });
	refreshLocks(ctx);
	ctx.tryCall(ConsensusApi, "reset", {});
	// A new game, a new chat: the teams' channels show nothing of the games before.
	ctx.tryCall(TeamChannelApi, "newEpoch", { team: "X" });
	ctx.tryCall(TeamChannelApi, "newEpoch", { team: "O" });
	ctx.tryCall(TeamChannelApi, "resetCap", { team: state.side });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: state.startingSide });
	engineTurn(ctx);
}

/** Starts the next game, or marks it due when the strategy brain holds it back. */
function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

const REASON_TEXT: Readonly<Record<EndReason, string>> = {
	pieces: "down to two pieces",
	blocked: "blocked, no legal move",
	repetition: "the same position came up again and again",
	quiet: "too many turns without a mill",
	turn_limit: "the turn limit",
};

function summaryOf(record: GameRecord): string {
	if (record.result === "draw") return `draw (${REASON_TEXT[record.reason]}) after ${String(record.turns)} turns`;
	return `${record.result} won (${other(record.result)} ${REASON_TEXT[record.reason]}) after ${String(record.turns)} turns`;
}

function endGame(ctx: Ctx, result: Result, reason: EndReason): string {
	const state = ctx.state;
	const moves = [...state.moves];
	const record: GameRecord = { game: state.game, result, reason, turns: state.turnNo, moves };
	state.running = false;
	state.removing = false;
	state.results.push(record);
	const pieces = { X: onBoard(state.board, "X") + state.inHand.X, O: onBoard(state.board, "O") + state.inHand.O };
	ctx.emit("game_ended", { game: state.game, result, reason, turns: state.turnNo, pieces, moves });
	refreshLocks(ctx);
	const summary = summaryOf(record);
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary, moves });
	if (state.game < ctx.options.games) ctx.schedule.at(ctx.minute + 1, "nextGame");
	else {
		state.finished = true;
		ctx.emit("match_ended", { tally: tallyOf(state.results) });
	}
	return `Game ${String(state.game)} is over: ${summary}.`;
}

/** Why `code` may not be played by `resident` now, or undefined. */
function problemWith(state: Readonly<MorrisState>, resident: string | undefined, code: number, flying: boolean): Refusal | undefined {
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	const captain = captainOf(state);
	if (resident === undefined || resident !== captain) return refuse("NOT_CAPTAIN", `Only the captain of the turn (${captain ?? "nobody"}, side ${state.side}) may play a move.`);
	if (legalCodes(state, flying).includes(code)) return undefined;
	if (state.removing) return refuse("ILLEGAL_REMOVAL", `Your side closed a mill: name the point of an opposing piece to remove, one of ${removable(state.board, other(state.side)).map((point) => String(point + 1)).join(", ")}.`);
	const stage = stageOf(positionOf(state), state.side, flying);
	const step = decodeStep(code);
	const hint: Readonly<Record<Stage, string>> = {
		place: "you are placing: the move number is a free point (1-24)",
		move: "you are moving: the move number is from * 100 + to, from your piece to a free neighbouring point",
		fly: "you have three pieces and fly: the move number is from * 100 + to, from your piece to any free point",
	};
	return refuse("ILLEGAL_MOVE", `${step === undefined ? `${String(code)} is no move` : `${stepText(step)} is not legal now`}; ${hint[stage]}. viewBoard lists the legal moves.`);
}

/** The engine's whole turn when it is on move (the step, then the removal of a mill): the text of what it played, or undefined. */
function engineTurn(ctx: Ctx): string | undefined {
	const state = ctx.state;
	const engine = ctx.options.engine;
	if (engine === undefined || !state.running || state.side !== engine.side) return undefined;
	const choices = bestTurns(positionOf(state), ctx.options.flying, engine.depth, engine.maxNodes);
	const turn = choices.length === 0 ? undefined : ctx.rng("morris", "engine", state.game, state.turnNo).pick(choices);
	if (turn === undefined) return undefined;
	const side = state.side;
	const stepped = applyMove(ctx, stepCode(turn), false).reply;
	if (!state.removing || turn.remove === undefined) return `The ${ENGINE} (${side}): ${stepped}`;
	return `The ${ENGINE} (${side}): played ${stepText(turn)} and closed a mill. ${applyMove(ctx, turn.remove + 1, false).reply}`;
}

/** Ends a whole turn: the other side moves next, unless the game is over. */
function finishTurn(ctx: Ctx, removed: boolean): string {
	const state = ctx.state;
	const flying = ctx.options.flying;
	const mover = state.side;
	if (!ctx.options.fixedCaptain) state.taken[mover] += 1;
	const placing = state.inHand.X > 0 || state.inHand.O > 0;
	if (removed) state.quiet = 0;
	else if (!placing) state.quiet += 1;
	state.side = other(mover);
	const position = positionOf(state);
	if (hasLost(position, state.side, flying)) return endGame(ctx, mover, onBoard(state.board, state.side) + state.inHand[state.side] < 3 ? "pieces" : "blocked");
	if (!placing) {
		const key = positionKey(position);
		const seen = (state.seen[key] ?? 0) + 1;
		state.seen[key] = seen;
		if (seen >= ctx.options.repetitions) return endGame(ctx, "draw", "repetition");
		if (state.quiet >= ctx.options.maxQuietTurns) return endGame(ctx, "draw", "quiet");
	}
	if (state.turnNo >= ctx.options.maxTurns) return endGame(ctx, "draw", "turn_limit");
	refreshLocks(ctx);
	ctx.tryCall(TeamChannelApi, "resetCap", { team: state.side });
	return engineTurn(ctx) ?? `${state.side} to move; captain ${captainOf(state) ?? "nobody"}.`;
}

/** Plays `code` for the side to move (already checked); the reply tells the outcome. */
function applyMove(ctx: Ctx, code: number, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	const side = state.side;
	const by = ctx.options.engine?.side === side ? ENGINE : (captainOf(state) ?? "");
	if (state.removing) {
		const point = code - 1;
		state.board = [...applyRemove(positionOf(state), point).board];
		state.removing = false;
		state.moves.push(code);
		ctx.emit("move_played", { game: state.game, side, by, kind: "remove", code, to: code, mill: false, turnNo: state.turnNo, forfeit });
		return reply(`Removed the ${other(side)} piece on ${String(code)}. ${finishTurn(ctx, true)}`);
	}
	const step = decodeStep(code);
	if (step === undefined) return reply("No move played.");
	const kind = stageOf(positionOf(state), side, ctx.options.flying);
	const after = applyStep(positionOf(state), step);
	state.board = [...after.position.board];
	state.inHand = { ...after.position.inHand };
	state.turnNo += 1;
	state.moves.push(code);
	const targets = after.mill ? removable(state.board, other(side)) : [];
	const mill = targets.length > 0;
	ctx.emit("move_played", { game: state.game, side, by, kind, code, ...(step.from === undefined ? {} : { from: step.from + 1 }), to: step.to + 1, mill, turnNo: state.turnNo, forfeit });
	if (mill) {
		state.removing = true;
		return reply(`Played ${stepText(step)}. Mill! Your team now removes one ${other(side)} piece: agree on its point (one of ${targets.map((point) => String(point + 1)).join(", ")}) and play it as the next move.`);
	}
	return reply(`Played ${stepText(step)}. ${finishTurn(ctx, false)}`);
}

function sideText(state: Readonly<MorrisState>, side: Side, flying: boolean): string {
	const stage = stageOf(positionOf(state), side, flying);
	const word: Readonly<Record<Stage, string>> = { place: "placing", move: "moving", fly: "flying" };
	return `${side}: ${String(onBoard(state.board, side))} on the board, ${String(state.inHand[side])} in hand (${word[stage]}).`;
}

function piecesOf(board: readonly Cell[], cell: Cell): string {
	const points = board.flatMap((value, point) => (value === cell ? [String(point + 1)] : []));
	return points.length === 0 ? "none" : points.join(", ");
}

function legalText(state: Readonly<MorrisState>, flying: boolean): string {
	if (state.removing) return `${state.side} closed a mill and removes an ${other(state.side)} piece.\nLegal moves (the point of the piece to remove): ${legalCodes(state, flying).join(", ")}.`;
	const steps = legalSteps(positionOf(state), flying);
	if (stageOf(positionOf(state), state.side, flying) === "place") return `Legal moves (place on a free point; the move number is the point): ${steps.map(stepCode).join(", ")}.`;
	return `Legal moves (move number = from * 100 + to): ${steps.map((step) => `${String(stepCode(step))} (${stepText(step)})`).join(", ")}.`;
}

function boardText(ctx: ToolCtx): string {
	const state = ctx.state;
	const { flying, maxTurns, maxQuietTurns } = ctx.options;
	const lines = [renderBoard(state.board)];
	if (state.finished) lines.push("The match is over.");
	else if (!state.running) lines.push(`Game ${String(state.game)} is over; the next one starts soon.`);
	else {
		lines.push(`Game ${String(state.game)}. Turn ${String(state.turnNo)} of at most ${String(maxTurns)}. Side to move: ${state.side}. Captain of the turn: ${captainOf(state) ?? "nobody"}.`);
		lines.push(`${sideText(state, "X", flying)} ${sideText(state, "O", flying)}`);
		// The picture alone was misread in the first live run (P101): the points of each side as a list.
		lines.push(`X pieces on: ${piecesOf(state.board, "X")}. O pieces on: ${piecesOf(state.board, "O")}. Free: ${piecesOf(state.board, ".")}.`);
		if (state.inHand.X === 0 && state.inHand.O === 0) lines.push(`Turns without a mill: ${String(state.quiet)} (a draw at ${String(maxQuietTurns)}).`);
		lines.push(legalText(state, flying));
	}
	const members = (side: Side): string => (ctx.options.engine?.side === side ? `the ${ENGINE} (a computer program)` : state.teams[side].join(", "));
	lines.push(`X team: ${members("X")}. O team: ${members("O")}.`);
	return lines.join("\n");
}

export const morris = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewBoard",
			description: "morris/tools/viewBoard",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(boardText(ctx)),
		}),
		kit.tool({
			name: PLAY_MOVE,
			description: "morris/tools/playMove",
			parameters: Type.Object({ move: Type.Integer({ minimum: 1, description: "The move number: a point 1-24 to place on or to remove, or from * 100 + to to move a piece." }) }),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx.state, ctx.resident, params.move, ctx.options.flying),
			execute: (params, ctx) => {
				const refusal = problemWith(ctx.state, ctx.resident, params.move, ctx.options.flying);
				if (refusal !== undefined) return refusal;
				return applyMove(ctx, params.move, false);
			},
		}),
	],
	services: [
		kit.provide(ConsensusSourceApi, {
			team: (_input, ctx) => (ctx.state.running ? ctx.state.side : ""),
			captain: (_input, ctx) => captainOf(ctx.state) ?? "",
			legalCells: (_input, ctx) => [...legalCodes(ctx.state, ctx.options.flying)],
			playForfeit: ({ cell }, ctx) => {
				if (problemWith(ctx.state, captainOf(ctx.state) ?? undefined, cell, ctx.options.flying) !== undefined) return false;
				applyMove(ctx, cell, true);
				return true;
			},
			invalidate: (_input, ctx) => {
				const state = ctx.state;
				if (state.finished) return false;
				state.running = false;
				state.finished = true;
				state.invalid = true;
				refreshLocks(ctx);
				ctx.emit("match_ended", { tally: tallyOf(state.results), invalid: true });
				return true;
			},
		}),
		kit.provide(BrainSourceApi, {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished || ctx.state.game >= ctx.options.games) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.minute + 1, "nextGame");
				return null;
			},
		}),
	],
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.morris,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		// The captain on move is told so once per turn and minute: a resident that ended its turn on a stale board ("still X's turn") gets no new input otherwise, so the runner never asks its model again and the move forfeits (P104).
		turnInputs: {
			order: HOOK_ORDER.turnInputs.morris,
			run: (resident, ctx) => {
				const state = ctx.state;
				if (!state.running || captainOf(state) !== resident) return [];
				const key = `${String(state.game)}:${String(state.turnNo)}:${String(state.removing)}:${String(ctx.minute)}`;
				if (state.told === key) return [];
				state.told = key;
				const task = state.removing ? "your side closed a mill and must name the opposing piece to remove" : `turn ${String(state.turnNo + 1)}`;
				return [`Side ${state.side} is on move (${task}); you are its captain. viewBoard shows the board and the legal moves.`];
			},
		},
		news: (resident, ctx) => (ctx.options.wakeTeam && ctx.state.running ? ctx.state.teams[ctx.state.side].includes(resident) : captainOf(ctx.state) === resident),
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: [kit.limit("match", "Breaches once the last game of the match is over.", (view: View) => (view.state.invalid === true ? "the match is invalid" : view.state.finished ? "the match is over" : undefined))],
	facts: {
		tally: kit.fact(Type.Object({ X: Type.Integer(), O: Type.Integer(), draw: Type.Integer() }), (view) => tallyOf(view.state.results)),
		captain: kit.fact(Type.Union([Type.String(), Type.Null()]), (view) => captainOf(view.state)),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: MorrisSlice,
		save: (state) => ({
			teams: { X: [...state.teams.X], O: [...state.teams.O] },
			board: [...state.board],
			side: state.side,
			inHand: { ...state.inHand },
			game: state.game,
			startingSide: state.startingSide,
			moves: [...state.moves],
			turnNo: state.turnNo,
			removing: state.removing,
			quiet: state.quiet,
			seen: { ...state.seen },
			taken: { ...state.taken },
			results: state.results.map((record) => ({ ...record, moves: [...record.moves] })),
			running: state.running,
			finished: state.finished,
			held: state.held,
			due: state.due,
			...(state.invalid === true ? { invalid: true } : {}),
			...(state.told === undefined ? {} : { told: state.told }),
		}),
		load: (data) => ({
			teams: { X: [...data.teams.X], O: [...data.teams.O] },
			board: [...data.board],
			side: data.side,
			inHand: { ...data.inHand },
			game: data.game,
			startingSide: data.startingSide,
			moves: [...data.moves],
			turnNo: data.turnNo,
			removing: data.removing,
			quiet: data.quiet,
			seen: { ...data.seen },
			taken: { ...data.taken },
			results: data.results.map((record) => ({ ...record, moves: [...record.moves] })),
			running: data.running,
			finished: data.finished,
			held: data.held,
			due: data.due,
			...(data.invalid === true ? { invalid: true } : {}),
			...(data.told === undefined ? {} : { told: data.told }),
		}),
	}),
}));
