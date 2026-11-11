/**
 * The `grid-game` mechanic: a small board game (tic-tac-toe by default, any `size` x `size` board
 * with a `line` to win) between two teams over a match of `games` games. The mechanic owns the
 * board, the side to move, win and draw detection, the game counter and the swap of the starting
 * side. `playMove` is a locked tool, open for the captain of the turn only (the captain rotates
 * through the team's members move by move), so another mechanic can gate it further with a `rule`
 * handler. The match ends the run through the referee limit `grid-game.match` once the last game is over.
 * Nothing here knows about team chat, memory or scoring of moves.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolSuccess, ToolContextOf, ViewOf } from "@swarmtales/contracts";
import { ConsensusApi, ConsensusSourceApi } from "@swarmtales/mechanic-consensus";
import { TeamChannelApi } from "@swarmtales/mechanic-team-channel";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { GridGameApi } from "./api.ts";
import { GridGameEvents } from "./events.ts";
import { emptyBoard, freeCells, GridSlice, linesOf, other, renderBoard, tallyOf, winnerOf, type GridState, type Side } from "./model.ts";

export { GridGameApi } from "./api.ts";
export { GridGameEvents } from "./events.ts";
export { emptyBoard, freeCells, linesOf, other, winnerOf, type Cell, type Side } from "./model.ts";

const PLAY_MOVE = "playMove";

const options = Type.Object({
	size: Type.Integer({ minimum: 2, maximum: 10, default: 3, description: "The board is size x size cells." }),
	line: Type.Integer({ minimum: 2, maximum: 10, default: 3, description: "How many marks in a row (line, column or diagonal) win a game; at most the board size." }),
	games: Type.Integer({ minimum: 1, default: 3, description: "How many games the match has; the run ends after the last one." }),
	alternateStart: Type.Boolean({ default: true, description: "The starting side alternates from game to game (X starts game 1); false: X always starts." }),
	fixedCaptain: Type.Boolean({ default: false, description: "The first member of each team is its captain for the whole match; false: the captaincy rotates, one move each." }),
	wakeTeam: Type.Boolean({ default: false, description: "With activation onNews, every member of the team on move has news (so the others can advise and vote), not only the captain." }),
	teams: Type.Optional(
		Type.Object(
			{
				X: Type.Array(Type.String(), { minItems: 1, description: "Resident ids of the X team, in the order their captaincy rotates." }),
				O: Type.Array(Type.String(), { minItems: 1, description: "Resident ids of the O team, in the order their captaincy rotates." }),
			},
			{ description: "The two teams; without it the residents are split in half, the first half playing X." },
		),
	),
});

function startingSideOf(game: number, alternate: boolean): Side {
	return alternate && game % 2 === 0 ? "O" : "X";
}

const head = defineHead({
	id: "grid-game",
	summary: "A board game between two teams: the board, the captain of the turn, win detection and a match of several games.",
	options,
	state: (setup): GridState => {
		const { size, line, teams } = setup.options;
		if (line > size) throw new Error(`grid-game: line ${String(line)} does not fit a board of ${String(size)}`);
		const half = Math.ceil(setup.residents.length / 2);
		const chosen = teams ?? { X: setup.residents.slice(0, half), O: setup.residents.slice(half) };
		const members = [...chosen.X, ...chosen.O];
		if (chosen.X.length === 0 || chosen.O.length === 0) throw new Error("grid-game: each team needs at least one resident");
		if (new Set(members).size !== members.length) throw new Error("grid-game: a resident may play in one team only");
		const unknown = members.find((id) => !setup.residents.includes(id));
		if (unknown !== undefined) throw new Error(`grid-game: ${unknown} is not a resident of the run`);
		return {
			teams: { X: [...chosen.X], O: [...chosen.O] },
			board: emptyBoard(size),
			side: "X",
			game: 0,
			startingSide: "X",
			moves: [],
			taken: { X: 0, O: 0 },
			results: [],
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	events: GridGameEvents.events,
	provides: [GridGameApi, ConsensusSourceApi],
	uses: [ConsensusApi, TeamChannelApi],
	prompts: {
		"grid-game/tools/viewBoard": [],
		"grid-game/tools/playMove": [],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

/** The captain of the turn: the team's members take turns, one move each. */
function captainOf(state: Readonly<GridState>): string | null {
	if (!state.running) return null;
	const team = state.teams[state.side];
	return team[state.taken[state.side] % team.length] ?? null;
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
	state.board = emptyBoard(ctx.options.size);
	state.moves = [];
	state.startingSide = startingSideOf(game, ctx.options.alternateStart);
	state.side = state.startingSide;
	state.running = true;
	ctx.emit("game_started", { game, startingSide: state.startingSide, xTeam: [...state.teams.X], oTeam: [...state.teams.O] });
	refreshLocks(ctx);
	ctx.tryCall(ConsensusApi, "reset", {});
	// A new game, a new chat: the teams' channels show nothing of the games before.
	ctx.tryCall(TeamChannelApi, "newEpoch", { team: "X" });
	ctx.tryCall(TeamChannelApi, "newEpoch", { team: "O" });
	ctx.tryCall(TeamChannelApi, "resetCap", { team: state.side });
}

/** Starts the next game, or marks it due when another mechanic holds it back. */
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

function endGame(ctx: Ctx, winLine: readonly number[] | undefined, winner: Side | undefined): void {
	const state = ctx.state;
	const result = winner ?? "draw";
	const moves = [...state.moves];
	state.running = false;
	state.results.push({ game: state.game, result, ...(winLine === undefined ? {} : { winLine: [...winLine] }), moves });
	ctx.emit("game_ended", { game: state.game, result, ...(winLine === undefined ? {} : { winLine: [...winLine] }), moves });
	refreshLocks(ctx);
	if (state.game < ctx.options.games) {
		ctx.schedule.at(ctx.minute + 1, "nextGame");
		return;
	}
	state.finished = true;
	ctx.emit("match_ended", { tally: tallyOf(state.results) });
}

/** Why `cell` may not be played by `resident` now, or undefined. */
function problemWith(state: Readonly<GridState>, resident: string | undefined, cell: number): Refusal | undefined {
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	const captain = captainOf(state);
	if (resident === undefined || resident !== captain) return refuse("NOT_CAPTAIN", `Only the captain of the turn (${captain ?? "nobody"}, side ${state.side}) may play a move.`);
	if (cell >= state.board.length) return refuse("OUT_OF_RANGE", `Cell ${String(cell)} is not on the board (0..${String(state.board.length - 1)}).`);
	if (state.board[cell] !== ".") return refuse("CELL_TAKEN", `Cell ${String(cell)} is already taken.`);
	return undefined;
}

/** Plays `cell` for the side to move (already checked) and moves the turn on; the reply tells the outcome. */
function applyMove(ctx: Ctx, cell: number, forfeit: boolean): ToolSuccess {
	const state = ctx.state;
	const side = state.side;
	const by = captainOf(state) ?? "";
	state.board[cell] = side;
	state.moves.push(cell);
	// The rotation of the captaincy counts the moves taken; a fixed captain never rotates.
	if (!ctx.options.fixedCaptain) state.taken[side] += 1;
	ctx.emit("move_played", { game: state.game, side, by, cell, moveNo: state.moves.length, forfeit });
	const win = winnerOf(state.board, linesOf(ctx.options.size, ctx.options.line));
	if (win !== undefined) {
		endGame(ctx, win.cells, win.side);
		return reply(`Move played. ${side} wins game ${String(state.game)}.`);
	}
	if (freeCells(state.board).length === 0) {
		endGame(ctx, undefined, undefined);
		return reply(`Move played. Game ${String(state.game)} is a draw.`);
	}
	state.side = other(side);
	refreshLocks(ctx);
	ctx.tryCall(TeamChannelApi, "resetCap", { team: state.side });
	return reply(`Move played. ${state.side} to move; captain ${captainOf(state) ?? "nobody"}.`);
}

function boardText(state: Readonly<GridState>, size: number): string {
	const status = state.finished
		? "The match is over."
		: state.running
			? `Game ${String(state.game)}. Side to move: ${state.side}. Captain of the turn: ${captainOf(state) ?? "nobody"}.`
			: `Game ${String(state.game)} is over; the next one starts soon.`;
	return `${renderBoard(state.board, size)}\n${status} X team: ${state.teams.X.join(", ")}. O team: ${state.teams.O.join(", ")}.`;
}

export const gridGame = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewBoard",
			description: "grid-game/tools/viewBoard",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(boardText(ctx.state, ctx.options.size)),
		}),
		kit.tool({
			name: PLAY_MOVE,
			description: "grid-game/tools/playMove",
			parameters: Type.Object({ cell: Type.Integer({ minimum: 0, description: "The cell to mark, from 0, row by row." }) }),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx.state, ctx.resident, params.cell),
			execute: (params, ctx) => {
				const refusal = problemWith(ctx.state, ctx.resident, params.cell);
				if (refusal !== undefined) return refusal;
				return applyMove(ctx, params.cell, false);
			},
		}),
	],
	services: [
		kit.provide(GridGameApi, {
			side: (_input, ctx) => (ctx.state.running ? ctx.state.side : null),
			captain: (_input, ctx) => captainOf(ctx.state),
			board: (_input, ctx) => [...ctx.state.board],
			game: (_input, ctx) => ctx.state.game,
			rules: (_input, ctx) => ({ size: ctx.options.size, line: ctx.options.line }),
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
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
		kit.provide(ConsensusSourceApi, {
			team: (_input, ctx) => (ctx.state.running ? ctx.state.side : ""),
			captain: (_input, ctx) => captainOf(ctx.state) ?? "",
			legalCells: (_input, ctx) => (ctx.state.running ? [...freeCells(ctx.state.board)] : []),
			playForfeit: ({ cell }, ctx) => {
				if (problemWith(ctx.state, captainOf(ctx.state) ?? undefined, cell) !== undefined) return false;
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
	],
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.gridGame,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		// The captain of the turn is told so once per turn and minute: a resident that ended its turn on a stale board ("X's move now") gets no new input otherwise, so the runner never asks its model again and the move forfeits (P410, as P104 in morris).
		turnInputs: {
			order: HOOK_ORDER.turnInputs.gridGame,
			run: (resident, ctx) => {
				const state = ctx.state;
				if (!state.running || captainOf(state) !== resident) return [];
				const key = `${String(state.game)}:${String(state.moves.length)}:${String(ctx.minute)}`;
				if (state.told === key) return [];
				state.told = key;
				return [`Side ${state.side} is on move (move ${String(state.moves.length + 1)} of game ${String(state.game)}); you are its captain. viewBoard shows the board.`];
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
		schema: GridSlice,
		save: (state) => ({
			teams: { X: [...state.teams.X], O: [...state.teams.O] },
			board: [...state.board],
			side: state.side,
			game: state.game,
			startingSide: state.startingSide,
			moves: [...state.moves],
			taken: { ...state.taken },
			results: state.results.map((result) => ({ ...result, moves: [...result.moves], ...(result.winLine === undefined ? {} : { winLine: [...result.winLine] }) })),
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
			game: data.game,
			startingSide: data.startingSide,
			moves: [...data.moves],
			taken: { ...data.taken },
			results: data.results.map((result) => ({ ...result })),
			running: data.running,
			finished: data.finished,
			held: data.held ?? false,
			due: data.due ?? false,
			...(data.invalid === true ? { invalid: true } : {}),
			...(data.told === undefined ? {} : { told: data.told }),
		}),
	}),
}));
