/**
 * The `sealed-auction` mechanic: solo seats bid on a series of lots, one lot at a time, with sealed
 * bids and a purse per game. Three kinds of lot measure three classic auction skills against closed-form
 * single-lot references:
 * - `first-price` (pay your bid, private values): how far a bidder shades below its value, against the
 *   symmetric equilibrium bid min + (n-1)/n (v - min);
 * - `second-price` (pay the runner-up, private values): bidding the own value is the dominant strategy;
 * - `common` (one hidden worth, a noisy estimate each, pay your bid): the winner's curse; a bid above the
 *   estimate - noise (n-1)/(n+1) expects a loss whenever it wins.
 * The framing is neutral (no textbook names). Values and estimates are dealt from the seed and told only
 * to their owner (event audience `human`); bids are sealed until the lot resolves, then every bid, the
 * winner, the price and a common lot's worth are public. A bid not made by the deadline is a pass.
 * Each game ends with `game_scored` (the reference metrics), for the human and the reporter only.
 * A strategy brain plugs in through `BrainSourceApi` and `StrategyBrainApi`, as in the econ lab.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import { AuctionSlice, dealLots, Lot, LotKind, LotResult, Reference, referenceOf, resolveLot, type AuctionState, type Rules } from "./model.ts";

export type { LotKind } from "./model.ts";

const LABEL: Readonly<Record<LotKind, string>> = { "first-price": "pay-your-bid", "second-price": "pay-the-runner-up", common: "shared-worth" };

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games of the match; every game deals fresh lots and a full purse." }),
	lots: Type.Array(LotKind, {
		minItems: 1,
		maxItems: 20,
		default: ["first-price", "second-price", "common", "first-price", "common", "second-price"],
		description: "The kinds of the lots of each game, in order.",
	}),
	purse: Type.Integer({ minimum: 1, default: 100, description: "Coins per seat and game." }),
	valueMin: Type.Integer({ minimum: 0, default: 10 }),
	valueMax: Type.Integer({ minimum: 1, default: 60 }),
	worthMin: Type.Integer({ minimum: 0, default: 20 }),
	worthMax: Type.Integer({ minimum: 1, default: 80 }),
	noise: Type.Integer({ minimum: 0, default: 15, description: "The largest error of an estimate of a common lot." }),
	reserve: Type.Integer({ minimum: 1, default: 1, description: "The least bid that counts, and the least price." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a lot stays open before missing bids count as a pass." }),
});

const head = defineHead({
	id: "sealed-auction",
	summary: "Sealed bids on a series of lots (pay-your-bid, pay-the-runner-up, shared worth) with a purse per game, private values and a winner's-curse reference.",
	options,
	state: (setup): AuctionState => ({
		seats: [...setup.residents],
		game: 0,
		lots: [],
		lot: 0,
		open: false,
		opened: 0,
		owing: [],
		told: [],
		briefed: [],
		bids: {},
		reasons: {},
		results: [],
		coins: {},
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		gameScores: {},
		running: false,
		finished: false,
		held: false,
		due: false,
	}),
	events: {
		game_started: Type.Object({ game: Type.Integer(), lots: Type.Array(LotKind), purse: Type.Integer(), seats: Type.Array(Type.String()) }),
		lots_dealt: Type.Object({ game: Type.Integer(), lots: Type.Array(Lot) }),
		lot_opened: Type.Object({ game: Type.Integer(), lot: Type.Integer(), kind: LotKind }),
		bid_placed: Type.Object({ game: Type.Integer(), lot: Type.Integer(), resident: Type.String(), amount: Type.Integer(), reason: Type.Optional(Type.String()) }),
		lot_resolved: Type.Object({ game: Type.Integer(), ...LotResult.properties, worth: Type.Optional(Type.Integer()) }),
		game_ended: Type.Object({ game: Type.Integer(), scores: Type.Record(Type.String(), Type.Number()), totals: Type.Record(Type.String(), Type.Number()), coins: Type.Record(Type.String(), Type.Number()) }),
		game_scored: Type.Object({ game: Type.Integer(), reference: Reference }),
		match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// The deal and the bids are sealed; the reference is for the human and the reporter only.
	audiences: { lots_dealt: ["human"], bid_placed: ["human"], game_scored: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi],
	prompts: {
		"sealed-auction/tools/viewAuction": [],
		"sealed-auction/tools/bid": [],
		"sealed-auction/game-head": ["game", "games", "lots"],
		"sealed-auction/rules": ["purse", "lots", "reserve", "valueMin", "valueMax", "worthMin", "worthMax", "noise"],
		"sealed-auction/task-first-price": ["lot", "lots", "value", "coins"],
		"sealed-auction/task-second-price": ["lot", "lots", "value", "coins"],
		"sealed-auction/task-common": ["lot", "lots", "estimate", "coins", "noise"],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const rulesOf = (ctx: Ctx | View): Rules => ({
	purse: ctx.options.purse,
	valueMin: ctx.options.valueMin,
	valueMax: ctx.options.valueMax,
	worthMin: ctx.options.worthMin,
	worthMax: ctx.options.worthMax,
	noise: ctx.options.noise,
	reserve: ctx.options.reserve,
});

function lotNow(ctx: Ctx): Lot | undefined {
	return ctx.state.open ? ctx.state.lots[ctx.state.lot - 1] : undefined;
}

function refreshLocks(ctx: Ctx): void {
	for (const resident of ctx.residents.ids) {
		if (ctx.state.open && ctx.state.owing.includes(resident)) ctx.access.unlock(resident, "bid");
		else ctx.access.lock(resident, "bid");
	}
}

function openLot(ctx: Ctx, minute: number): void {
	const state = ctx.state;
	state.lot += 1;
	const lot = state.lots[state.lot - 1];
	if (lot === undefined) return;
	state.open = true;
	state.opened = minute;
	state.bids = {};
	state.reasons = {};
	state.owing = [...state.seats];
	state.told = [];
	ctx.emit("lot_opened", { game: state.game, lot: lot.number, kind: lot.kind });
	refreshLocks(ctx);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.lot = 0;
	state.results = [];
	state.briefed = [];
	state.lots = dealLots(ctx.options.lots, state.seats, rulesOf(ctx), ctx.rng("sealed-auction", "deal", game));
	state.coins = Object.fromEntries(state.seats.map((seat) => [seat, ctx.options.purse]));
	state.gameScores = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.running = true;
	ctx.emit("game_started", { game, lots: [...ctx.options.lots], purse: ctx.options.purse, seats: [...state.seats] });
	ctx.emit("lots_dealt", { game, lots: state.lots.map((lot) => ({ ...lot, values: { ...lot.values } })) });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: "" });
	openLot(ctx, ctx.minute);
}

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

function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${String(scores[seat] ?? 0)}`).join(", ");
}

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	state.running = false;
	state.open = false;
	state.owing = [];
	refreshLocks(ctx);
	ctx.emit("game_ended", { game: state.game, scores: { ...state.gameScores }, totals: { ...state.scores }, coins: { ...state.coins } });
	ctx.emit("game_scored", { game: state.game, reference: referenceOf(state.lots, state.results, state.seats, rulesOf(ctx), state.coins) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: `points ${scoreLine(state.gameScores, state.seats)}` });
	if (last) ctx.emit("match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.minute + 1, "nextGame");
}

function resolve(ctx: Ctx, minute: number, missed: readonly string[]): void {
	const state = ctx.state;
	const lot = lotNow(ctx);
	if (lot === undefined) return;
	const draw = ctx.rng("sealed-auction", "tie", state.game, lot.number);
	const result = resolveLot(lot, state.bids, state.seats, rulesOf(ctx), missed, (tied) => draw.pick(tied));
	state.results.push(result);
	if (result.winner !== undefined) {
		state.coins[result.winner] = (state.coins[result.winner] ?? 0) - result.price;
		state.scores[result.winner] = (state.scores[result.winner] ?? 0) + result.profit;
		state.gameScores[result.winner] = (state.gameScores[result.winner] ?? 0) + result.profit;
	}
	ctx.emit("lot_resolved", { game: state.game, ...result, ...(lot.kind === "common" && result.winner !== undefined && lot.worth !== undefined ? { worth: lot.worth } : {}) });
	state.open = false;
	state.owing = [];
	if (state.lot < state.lots.length) openLot(ctx, minute);
	else endGame(ctx);
}

function problemWith(ctx: Ctx, resident: string | undefined, amount: number): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running || !state.open) return refuse("NO_LOT", "No lot is open right now; wait for the next one.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this auction.");
	if (!state.owing.includes(resident)) return refuse("ALREADY_BID", "You already bid on this lot.");
	const coins = state.coins[resident] ?? 0;
	if (!Number.isInteger(amount) || amount < 0) return refuse("OUT_OF_RANGE", "A bid is a whole number of coins, 0 to pass.");
	if (amount > coins) return refuse("OVER_PURSE", `You have ${String(coins)} coins left; a bid may not be more.`);
	return undefined;
}

function placeBid(ctx: Ctx, resident: string | undefined, amount: number, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, resident, amount);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this auction.");
	const state = ctx.state;
	const lot = state.lot;
	const text = reason?.trim() ?? "";
	state.bids[resident] = amount;
	if (text !== "") state.reasons[resident] = text;
	state.owing = state.owing.filter((id) => id !== resident);
	ctx.emit("bid_placed", { game: state.game, lot, resident, amount, ...(text === "" ? {} : { reason: text }) });
	ctx.access.lock(resident, "bid");
	if (state.owing.length === 0) resolve(ctx, ctx.minute, []);
	return reply(state.open && state.lot === lot ? `Bid sealed on lot ${String(lot)}. Wait for the others.` : `Bid sealed. Lot ${String(lot)} is resolved; use viewAuction for the result.`);
}

/** One public line of a resolved lot, from the view of `resident`. */
function resultLine(result: LotResult, resident: string, worth: number | undefined): string {
	const bids = Object.entries(result.bids).map(([seat, bid]) => `${seat} ${String(bid)}`).join(", ");
	const head = `lot ${String(result.number)} (${LABEL[result.kind]}): bids ${bids}`;
	if (result.winner === undefined) return `${head}; no bid counted, unsold`;
	const won = result.winner === resident ? `you won and paid ${String(result.price)}, gaining ${String(result.profit)}` : `${result.winner} won and paid ${String(result.price)}`;
	const shown = result.kind === "common" && worth !== undefined ? `; the true worth was ${String(worth)}` : "";
	const tie = result.tie ? " (a tie, drawn by lot)" : "";
	const missed = result.missed.includes(resident) ? "; you did not bid in time (a pass)" : "";
	return `${head}; ${won}${tie}${shown}${missed}`;
}

function rulesText(ctx: Ctx): string {
	const { purse, reserve, valueMin, valueMax, worthMin, worthMax, noise } = ctx.options;
	return ctx.prompt("sealed-auction/rules", { purse, lots: ctx.options.lots.length, reserve, valueMin, valueMax, worthMin, worthMax, noise });
}

function taskText(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	const lot = lotNow(ctx);
	if (lot === undefined || !state.owing.includes(resident)) return undefined;
	const own = lot.values[resident] ?? 0;
	const base = { lot: lot.number, lots: state.lots.length, coins: state.coins[resident] ?? 0 };
	if (lot.kind === "common") return ctx.prompt("sealed-auction/task-common", { ...base, estimate: own, noise: ctx.options.noise });
	return ctx.prompt(lot.kind === "first-price" ? "sealed-auction/task-first-price" : "sealed-auction/task-second-price", { ...base, value: own });
}

function auctionText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon. Points: ${scoreLine(state.scores, state.seats)}.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, lot ${String(state.lot)} of ${String(state.lots.length)}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) {
		lines.push(taskText(ctx, resident) ?? "Nothing to bid for you right now.");
		lines.push(`Your coins: ${String(state.coins[resident] ?? 0)}. Your points: ${String(state.gameScores[resident] ?? 0)} in this game, ${String(state.scores[resident] ?? 0)} in all.`);
		const past = state.results.map((result) => resultLine(result, resident, state.lots[result.number - 1]?.worth));
		lines.push(past.length === 0 ? "No lot of this game is sold yet." : `This game so far: ${past.join("; ")}.`);
	}
	return lines.join("\n");
}

export const sealedAuction = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewAuction",
			description: "sealed-auction/tools/viewAuction",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(auctionText(ctx, ctx.resident)),
		}),
		kit.tool({
			name: "bid",
			description: "sealed-auction/tools/bid",
			parameters: Type.Object({
				amount: Type.Integer({ minimum: 0, description: "Coins bid on the open lot; 0 passes." }),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." })),
			}),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx, ctx.resident, params.amount),
			execute: (params, ctx) => placeBid(ctx, ctx.resident, params.amount, params.reason),
		}),
	],
	services: [
		kit.provide(BrainSourceApi, {
			game: (_input, ctx) => ctx.state.game,
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
	],
	hooks: {
		runStarted: {
			order: HOOK_ORDER.runStarted.sealedAuction,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.sealedAuction,
			run: (ctx) => {
				const state = ctx.state;
				if (!state.running || !state.open || ctx.minute - state.opened + 1 < ctx.options.deadline) return;
				const missed = [...state.owing];
				state.owing = [];
				refreshLocks(ctx);
				resolve(ctx, ctx.minute + 1, missed);
			},
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.open && ctx.state.owing.includes(resident),
		turnInputs: {
			order: HOOK_ORDER.turnInputs.sealedAuction,
			run: (resident, ctx) => {
				const state = ctx.state;
				if (!state.running || !state.seats.includes(resident)) return [];
				const lines: string[] = [];
				if (!state.briefed.includes(resident)) {
					state.briefed.push(resident);
					lines.push(`${ctx.prompt("sealed-auction/game-head", { game: state.game, games: ctx.options.games, lots: state.lots.length })} ${rulesText(ctx)}`);
				}
				if (state.open && !state.told.includes(resident)) {
					state.told.push(resident);
					const last = state.results[state.results.length - 1];
					if (last?.number === state.lot - 1) lines.push(`Last ${resultLine(last, resident, state.lots[last.number - 1]?.worth)}.`);
					const task = taskText(ctx, resident);
					if (task !== undefined) lines.push(task);
				}
				return lines;
			},
		},
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: [kit.limit("match", "Breaches once the last game of the match is over.", (view: View) => (view.state.finished ? "the match is over" : undefined))],
	facts: {
		scores: kit.fact(Type.Record(Type.String(), Type.Number()), (view) => ({ ...view.state.scores })),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: AuctionSlice,
		save: (state) => ({
			...state,
			seats: [...state.seats],
			lots: state.lots.map((lot) => ({ ...lot, values: { ...lot.values } })),
			owing: [...state.owing],
			told: [...state.told],
			briefed: [...state.briefed],
			bids: { ...state.bids },
			reasons: { ...state.reasons },
			results: state.results.map((result) => ({ ...result, bids: { ...result.bids }, missed: [...result.missed] })),
			coins: { ...state.coins },
			scores: { ...state.scores },
			gameScores: { ...state.gameScores },
		}),
		load: (data) => ({
			...data,
			seats: [...data.seats],
			lots: data.lots.map((lot) => ({ ...lot, values: { ...lot.values } })),
			owing: [...data.owing],
			told: [...data.told],
			briefed: [...data.briefed],
			bids: { ...data.bids },
			reasons: { ...data.reasons },
			results: data.results.map((result) => ({ ...result, bids: { ...result.bids }, missed: [...result.missed] })),
			coins: { ...data.coins },
			scores: { ...data.scores },
			gameScores: { ...data.gameScores },
		}),
	}),
}));
