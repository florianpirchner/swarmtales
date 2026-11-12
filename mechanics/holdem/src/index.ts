/**
 * The `holdem` mechanic: fixed-limit Texas Hold'em for solo seats, heads-up or at a full table
 * (docs/ideas/game-roadmap.md §2.5). A match is several games of several hands; the button moves one
 * seat per hand. The deal is seeded; with `duplicate` on (the default) every game replays the same
 * deals with the seats moved one place, so over as many games as there are seats every seat plays
 * every position's cards once and the luck of the deal cancels out of the match totals. Hands have no
 * stacks (the raise cap bounds a hand), so there is no all-in and no side pot.
 *
 * A seat sees only its own cards (its turn lines and `viewTable`); `cards_dealt` with every hole card
 * is for the human only. Every decision is scored against a simple equity baseline (Monte Carlo equity
 * against the opponents' ranges as their actions narrow them, pot odds, one street; not a solver; the
 * equity against random hands is recorded beside it) in `decision_scored`, and each game ends
 * with `game_scored` (net points, VPIP, PFR, aggression, agreement with the baseline, EV loss), both
 * for the human and the reporter only; the reasons a seat gives for its actions stay there too, so a
 * bluff stays a bluff. A seat that does not act by the deadline checks, or folds when it has a bet to
 * face. A strategy brain plugs in through `BrainSourceApi` and `StrategyBrainApi`, as in the econ lab.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import { DECK, describeWith, equity, rangeEquity } from "./cards.ts";
import {
	baselineOf,
	Done,
	type Entry,
	evLossOf,
	HoldemSlice,
	Move,
	newHand,
	normalise,
	options as optionsOf,
	play,
	positionOf,
	rangesOf,
	Result,
	Scored,
	SeatStats,
	settle,
	statsOf,
	Street,
	type Hand,
	type HoldemState,
	type Limits,
} from "./model.ts";

const ACT = "act";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 4, description: "Games in the match; a strategy brain is rewritten between games, and every game starts from a fresh context." }),
	hands: Type.Integer({ minimum: 1, maximum: 100, default: 8, description: "Hands per game; the button moves one seat per hand." }),
	smallBlind: Type.Integer({ minimum: 0, default: 1 }),
	bigBlind: Type.Integer({ minimum: 1, default: 2 }),
	smallBet: Type.Integer({ minimum: 1, default: 2, description: "The bet size before the flop and on the flop." }),
	bigBet: Type.Integer({ minimum: 1, default: 4, description: "The bet size on the turn and the river." }),
	cap: Type.Integer({ minimum: 1, maximum: 10, default: 4, description: "Bets per betting round, the opening bet (preflop: the big blind) included." }),
	duplicate: Type.Boolean({ default: true, description: "Every game replays the same deals with the seats moved one place (luck cancels over as many games as seats); false deals fresh cards in every game." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes the seat to act has before it checks, or folds when facing a bet." }),
	equitySamples: Type.Integer({ minimum: 1, maximum: 5000, default: 400, description: "Monte Carlo draws per scored decision." }),
	showBest: Type.Boolean({ default: true, description: "Tell a seat on its turn the best hand it holds now, in words (reading the board is not what the game measures)." }),
	aid: Type.Boolean({ default: false, description: "Decision-time aid: tell the seat to act its equity against the opponents' action-narrowed ranges and the pot odds it needs to call, the referee's own reference (P430)." }),
	aidSeats: Type.Optional(Type.Array(Type.String(), { description: "With `aid`: only these seats get the aid line (a mixed table); default every seat." })),
});

const head = defineHead({
	id: "holdem",
	summary: "Fixed-limit Texas Hold'em for solo seats: seeded and duplicate deals, private hole cards, betting, showdown, an equity baseline for the report.",
	options,
	state: (setup): HoldemState => {
		if (setup.residents.length < 2 || setup.residents.length > 10) throw new Error("holdem: a table seats 2 to 10 players");
		return {
			seats: [...setup.residents],
			game: 0,
			opened: 0,
			briefed: [],
			seenHand: {},
			seenLog: {},
			seenResults: {},
			told: false,
			results: [],
			decisions: [],
			scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
			gameScores: {},
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	events: {
		game_started: Type.Object({ game: Type.Integer(), hands: Type.Integer(), seats: Type.Array(Type.String()) }),
		hand_started: Type.Object({ game: Type.Integer(), hand: Type.Integer(), button: Type.String(), seats: Type.Array(Type.String()) }),
		cards_dealt: Type.Object({ game: Type.Integer(), hand: Type.Integer(), holes: Type.Record(Type.String(), Type.Array(Type.String())), runout: Type.Array(Type.String()) }),
		action_taken: Type.Object({ game: Type.Integer(), hand: Type.Integer(), seat: Type.String(), done: Done, to: Type.Number(), street: Street, pot: Type.Number(), missed: Type.Optional(Type.Boolean()) }),
		board_dealt: Type.Object({ game: Type.Integer(), hand: Type.Integer(), street: Street, cards: Type.Array(Type.String()) }),
		decision_scored: Type.Object({ ...Scored.properties, reason: Type.Optional(Type.String()) }),
		hand_ended: Type.Object({ game: Type.Integer(), ...Result.properties }),
		game_ended: Type.Object({ game: Type.Integer(), scores: Type.Record(Type.String(), Type.Number()), totals: Type.Record(Type.String(), Type.Number()) }),
		game_scored: Type.Object({ game: Type.Integer(), stats: Type.Record(Type.String(), SeatStats) }),
		match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// Every hole card and every reason (a bluff's motive) is for the human and the reporter only.
	audiences: { cards_dealt: ["human"], decision_scored: ["human"], game_scored: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi],
	prompts: {
		"holdem/tools/viewTable": [],
		"holdem/tools/act": [],
		"holdem/rules": ["seats", "smallBlind", "bigBlind", "smallBet", "bigBet", "cap", "hands"],
		"holdem/game-head": ["game", "games"],
		"holdem/hand-head": ["hand", "hands", "seat", "position", "button", "cards"],
		"holdem/task": ["street", "board", "pot", "toCall", "choices"],
		"holdem/best": ["best"],
		"holdem/aid": ["equity", "need", "share"],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const limitsOf = (ctx: Ctx): Limits => ({ smallBlind: ctx.options.smallBlind, bigBlind: ctx.options.bigBlind, smallBet: ctx.options.smallBet, bigBet: ctx.options.bigBet, cap: ctx.options.cap });

const signed = (value: number): string => (value > 0 ? `+${String(value)}` : String(value));

function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${signed(scores[seat] ?? 0)}`).join(", ");
}

const cardsText = (cards: readonly string[]): string => (cards.length === 0 ? "none yet" : cards.join(" "));

function potOf(hand: Hand): number {
	return Object.values(hand.invested).reduce((sum, value) => sum + value, 0);
}

function refreshLocks(ctx: Ctx): void {
	const hand = ctx.state.hand;
	for (const seat of ctx.state.seats) {
		if (ctx.state.running && hand !== undefined && !hand.over && hand.toAct === seat) ctx.access.unlock(seat, ACT);
		else ctx.access.lock(seat, ACT);
	}
}

/**
 * The deal of hand `number` of game `game`: hole cards by position (button first, one card at a time
 * as at a table) and the five board cards. With `duplicate` the deal does not depend on the game.
 */
function dealOf(ctx: Ctx, game: number, number: number): { readonly holes: string[][]; readonly runout: string[] } {
	const n = ctx.state.seats.length;
	const shuffled = ctx.rng("holdem", "deal", ctx.options.duplicate ? 0 : game, number).shuffle(DECK);
	const holes = Array.from({ length: n }, (_, position) => [shuffled[position] ?? "", shuffled[position + n] ?? ""]);
	return { holes, runout: shuffled.slice(2 * n, 2 * n + 5) };
}

/** Emits the hand's record from `from` on: actions and board cards. */
function publish(ctx: Ctx, hand: Hand, from: number): void {
	// The pot after each entry: replay the record (an action's `to` is the seat's street total).
	let pot = 0;
	let street: Street = "preflop";
	let streetIn = new Map<string, number>();
	hand.log.forEach((entry, index) => {
		if (entry.kind === "board") {
			street = entry.street;
			streetIn = new Map();
			if (index >= from) ctx.emit("board_dealt", { game: ctx.state.game, hand: hand.number, street: entry.street, cards: [...entry.cards] });
			return;
		}
		if (entry.street !== street) {
			street = entry.street;
			streetIn = new Map();
		}
		const before = streetIn.get(entry.seat) ?? 0;
		streetIn.set(entry.seat, entry.to);
		pot += entry.to - before;
		if (index >= from) ctx.emit("action_taken", { game: ctx.state.game, hand: hand.number, seat: entry.seat, done: entry.done, to: entry.to, street: entry.street, pot, ...(entry.missed === true ? { missed: true } : {}) });
	});
}

function startHand(ctx: Ctx, number: number): void {
	const state = ctx.state;
	const n = state.seats.length;
	const { holes, runout } = dealOf(ctx, state.game, number);
	const button = (number - 1 + state.game - 1) % n;
	const hand = newHand(number, state.seats, button, holes, runout, limitsOf(ctx));
	state.hand = hand;
	state.opened = ctx.minute;
	state.told = false;
	ctx.emit("hand_started", { game: state.game, hand: number, button: state.seats[button] ?? "", seats: [...state.seats] });
	ctx.emit("cards_dealt", { game: state.game, hand: number, holes: Object.fromEntries(Object.entries(hand.holes).map(([seat, cards]) => [seat, [...cards]])), runout: [...runout] });
	publish(ctx, hand, 0);
	refreshLocks(ctx);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.results = [];
	state.decisions = [];
	state.briefed = [];
	state.seenHand = {};
	state.seenLog = {};
	state.seenResults = {};
	state.gameScores = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.running = true;
	ctx.emit("game_started", { game, hands: ctx.options.hands, seats: [...state.seats] });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: "" });
	startHand(ctx, 1);
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

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	state.running = false;
	delete state.hand;
	refreshLocks(ctx);
	ctx.emit("game_ended", { game: state.game, scores: { ...state.gameScores }, totals: { ...state.scores } });
	ctx.emit("game_scored", { game: state.game, stats: statsOf(state.seats, state.decisions, state.results) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: `${String(state.results.length)} hands, points ${scoreLine(state.gameScores, state.seats)}` });
	if (last) ctx.emit("match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.minute + 1, "nextGame");
}

function endHand(ctx: Ctx, hand: Hand): void {
	const state = ctx.state;
	const result = settle(hand);
	for (const [seat, net] of Object.entries(result.net)) {
		state.scores[seat] = (state.scores[seat] ?? 0) + net;
		state.gameScores[seat] = (state.gameScores[seat] ?? 0) + net;
	}
	state.results.push(result);
	ctx.emit("hand_ended", { game: state.game, ...result });
	if (hand.number < ctx.options.hands) startHand(ctx, hand.number + 1);
	else endGame(ctx);
}

/** Scores the decision of the seat to act against the equity baseline and records it. */
function score(ctx: Ctx, hand: Hand, done: Scored["done"], missed: boolean, reason: string | undefined): void {
	const state = ctx.state;
	const seat = hand.toAct;
	const { toCall, canRaise, pot } = optionsOf(hand, limitsOf(ctx));
	const opponents = hand.seats.filter((other) => other !== seat && !hand.folded.includes(other)).length;
	const round = (value: number): number => Math.round(value * 1000) / 1000;
	const hole = hand.holes[seat] ?? [];
	const value = round(equity(hole, hand.board, opponents, ctx.options.equitySamples, ctx.rng("holdem", "equity", state.game, hand.number, state.decisions.length)));
	const ranged = round(rangeEquity(hole, hand.board, rangesOf(hand, seat), ctx.options.equitySamples, ctx.rng("holdem", "range-equity", state.game, hand.number, state.decisions.length)));
	const { baseline, potOdds } = baselineOf(ranged, toCall, pot, opponents + 1, canRaise);
	const scored: Scored = { game: state.game, hand: hand.number, street: hand.street, resident: seat, done, toCall, pot, opponents, equity: value, rangeEquity: ranged, potOdds: round(potOdds), baseline, evLoss: evLossOf(done, ranged, toCall, pot), missed };
	state.decisions.push(scored);
	ctx.emit("decision_scored", { ...scored, ...(reason === undefined || reason.trim() === "" ? {} : { reason: reason.trim() }) });
}

/** Plays `done` for the seat to act, publishes the record and moves on (the next seat, street, hand or game). */
function proceed(ctx: Ctx, hand: Hand, done: Scored["done"], missed: boolean, minute: number): void {
	const from = hand.log.length;
	const seat = hand.toAct;
	play(hand, done, limitsOf(ctx), missed);
	publish(ctx, hand, from);
	// The seat knows its own action: its next turn reports only what came after it.
	if (ctx.state.seenHand[seat] === hand.number) ctx.state.seenLog[seat] = from + 1;
	ctx.state.opened = minute;
	ctx.state.told = false;
	if (hand.over) endHand(ctx, hand);
	refreshLocks(ctx);
}

function act(ctx: Ctx, resident: string | undefined, move: Move, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, resident, move);
	const hand = ctx.state.hand;
	if (refusal !== undefined || hand === undefined) return refusal ?? refuse("NO_HAND", "No hand is being played right now.");
	const normal = normalise(hand, move, limitsOf(ctx));
	if ("problem" in normal) return refuse("ILLEGAL_ACTION", normal.problem);
	const number = hand.number;
	const street = hand.street;
	score(ctx, hand, normal.done, false, reason);
	proceed(ctx, hand, normal.done, false, ctx.minute);
	const now = ctx.state.hand;
	// Say plainly that the turn is over: a model that answers the tool result otherwise tries to act again (P131).
	if (now?.number === number && !now.over) return reply(`You ${verb(normal.done)} (${street}). ${now.toAct === resident ? "It is your turn again." : `${now.toAct} is to act, not you: end your turn now; you will be told when it is yours.`}`, { endsTurn: now.toAct !== resident });
	return reply(`You ${verb(normal.done)}. Hand ${String(number)} is over: end your turn now; you will be told the result when you next play.`, { endsTurn: true });
}

function verb(done: Scored["done"]): string {
	return done === "fold" ? "folded" : done === "check" ? "checked" : done === "call" ? "called" : done === "bet" ? "bet" : "raised";
}

/** Why `resident` may not act with `move` now, or undefined. */
function problemWith(ctx: Ctx, resident: string | undefined, move: Move): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	const hand = state.hand;
	if (!state.running || hand === undefined || hand.over) return refuse("NO_HAND", "No hand is being played right now; wait for the next one.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this table.");
	if (hand.toAct !== resident) return refuse("NOT_YOUR_TURN", hand.folded.includes(resident) ? "You folded this hand." : `It is ${hand.toAct}'s turn, not yours.`);
	const normal = normalise(hand, move, limitsOf(ctx));
	return "problem" in normal ? refuse("ILLEGAL_ACTION", normal.problem) : undefined;
}

/** A seat's name as `viewer` reads it: its own seat is marked, so a model does not lose track of which seat it is (P133). */
const nameFor = (seat: string, viewer: string | undefined): string => (seat === viewer ? `${seat} (you)` : seat);

function entryLine(entry: Entry, limits: Limits, viewer: string | undefined): string {
	if (entry.kind === "board") return `${entry.street === "flop" ? "Flop" : entry.street === "turn" ? "Turn" : "River"}: ${entry.cards.join(" ")}`;
	const late = entry.missed === true ? " (no action in time)" : "";
	const seat = nameFor(entry.seat, viewer);
	switch (entry.done) {
		case "small blind":
			return `${seat} posts the small blind (${String(limits.smallBlind)})`;
		case "big blind":
			return `${seat} posts the big blind (${String(limits.bigBlind)})`;
		case "fold":
			return `${seat} folds${late}`;
		case "check":
			return `${seat} checks${late}`;
		case "call":
			return `${seat} calls (${String(entry.to)} in on the ${entry.street})`;
		case "bet":
			return `${seat} bets ${String(entry.to)}`;
		case "raise":
			return `${seat} raises to ${String(entry.to)}`;
	}
}

function resultLine(result: Result, seat: string): string {
	const own = result.net[seat] ?? 0;
	const head = `Hand ${String(result.hand)} result`;
	const winners = result.winners.map((winner) => nameFor(winner, seat));
	if (!result.showdown) return `${head}: everyone else folded on the ${result.street}, ${winners.join(", ")} won the pot of ${String(result.pot)}; your points ${signed(own)}.`;
	const shown = result.shown.map((entry) => `${nameFor(entry.seat, seat)} ${entry.cards.join(" ")} (${entry.best})`).join(", ");
	return `${head}: showdown, board ${result.board.join(" ")}; ${shown}; ${winners.join(" and ")} won the pot of ${String(result.pot)}; your points ${signed(own)}.`;
}

function choicesOf(ctx: Ctx, hand: Hand): string {
	const { toCall, canRaise, raiseTo } = optionsOf(hand, limitsOf(ctx));
	const raise = canRaise ? (hand.bet === 0 ? `bet ${String(raiseTo)}` : `raise to ${String(raiseTo)}`) : "";
	const parts = toCall === 0 ? ["check", raise, "fold"] : ["fold", `call ${String(toCall)}`, raise];
	return parts.filter((part) => part !== "").join(", ");
}

function rulesText(ctx: Ctx): string {
	const { smallBlind, bigBlind, smallBet, bigBet, cap, hands } = ctx.options;
	return ctx.prompt("holdem/rules", { seats: ctx.state.seats.length, smallBlind, bigBlind, smallBet, bigBet, cap, hands });
}

function handHead(ctx: Ctx, hand: Hand, seat: string): string {
	return ctx.prompt("holdem/hand-head", { hand: hand.number, hands: ctx.options.hands, seat, position: positionOf(hand, seat), button: hand.seats[hand.button] ?? "", cards: (hand.holes[seat] ?? []).join(" ") });
}

function taskText(ctx: Ctx, hand: Hand, seat: string): string {
	const { toCall, pot } = optionsOf(hand, limitsOf(ctx));
	const lines = [ctx.prompt("holdem/task", { street: hand.street, board: cardsText(hand.board), pot, toCall, choices: choicesOf(ctx, hand) })];
	if (ctx.options.showBest && hand.board.length >= 3) lines.push(ctx.prompt("holdem/best", { best: describeWith(hand.holes[seat] ?? [], hand.board) }));
	else if (ctx.options.showBest) {
		const [a, b] = hand.holes[seat] ?? [];
		if (a !== undefined && b !== undefined) lines.push(ctx.prompt("holdem/best", { best: a.slice(0, 1) === b.slice(0, 1) ? "a pocket pair" : a.slice(1) === b.slice(1) ? "two suited cards" : "two unpaired cards" }));
	}
	if (aidFor(ctx, seat)) lines.push(aidText(ctx, hand, seat));
	return lines.join(" ");
}

const aidFor = (ctx: Ctx, seat: string): boolean => ctx.options.aid && (ctx.options.aidSeats === undefined || ctx.options.aidSeats.includes(seat));

const percent = (value: number): string => `${String(Math.round(value * 100))} %`;

/**
 * The decision-time aid (P430): the same range equity the baseline scores the decision with, drawn from
 * its own stream (keyed by the decision's index, so viewTable and the turn line show the same number).
 */
function aidText(ctx: Ctx, hand: Hand, seat: string): string {
	const { toCall, pot } = optionsOf(hand, limitsOf(ctx));
	const players = hand.seats.filter((other) => !hand.folded.includes(other)).length;
	const value = rangeEquity(hand.holes[seat] ?? [], hand.board, rangesOf(hand, seat), ctx.options.equitySamples, ctx.rng("holdem", "aid", ctx.state.game, hand.number, ctx.state.decisions.length));
	const need = toCall === 0 ? "nothing (no bet to call)" : percent(toCall / (pot + toCall));
	return ctx.prompt("holdem/aid", { equity: percent(value), need, share: percent(1 / Math.max(1, players)) });
}

function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	const hand = state.hand;
	if (!state.running || hand === undefined) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon. Points: ${scoreLine(state.scores, state.seats)}.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, hand ${String(hand.number)} of ${String(ctx.options.hands)}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) {
		lines.push(handHead(ctx, hand, resident));
		lines.push(`This hand so far: ${hand.log.map((entry) => entryLine(entry, limitsOf(ctx), resident)).join("; ")}. Pot ${String(potOf(hand))}.`);
		if (hand.folded.includes(resident)) lines.push("You folded this hand.");
		else if (hand.toAct === resident) lines.push(taskText(ctx, hand, resident));
		else lines.push(`${hand.toAct} is to act; wait for your turn.`);
		const past = state.results.slice(-6).map((result) => resultLine(result, resident));
		if (past.length > 0) lines.push(`Earlier hands of this game: ${past.join(" ")}`);
		lines.push(`Points in this game: ${scoreLine(state.gameScores, state.seats)}. In the match: ${scoreLine(state.scores, state.seats)}.`);
	}
	return lines.join("\n");
}

export const holdem = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewTable",
			description: "holdem/tools/viewTable",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(tableText(ctx, ctx.resident)),
		}),
		kit.tool({
			name: ACT,
			description: "holdem/tools/act",
			parameters: Type.Object({ action: Move, reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (never shown to the other players)." })) }),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx, ctx.resident, params.action),
			execute: (params, ctx) => act(ctx, ctx.resident, params.action, params.reason),
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
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.holdem,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.holdem,
			run: (ctx) => {
				const state = ctx.state;
				const hand = state.hand;
				if (!state.running || hand === undefined || hand.over || ctx.minute - state.opened + 1 < ctx.options.deadline) return;
				const done = optionsOf(hand, limitsOf(ctx)).toCall === 0 ? "check" : "fold";
				score(ctx, hand, done, true, undefined);
				proceed(ctx, hand, done, true, ctx.minute + 1);
			},
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.hand?.toAct === resident,
		turnInputs: {
			order: HOOK_ORDER.turnInputs.holdem,
			run: (resident, ctx) => {
				const state = ctx.state;
				const hand = state.hand;
				if (!state.running || hand === undefined || !state.seats.includes(resident)) return [];
				const lines: string[] = [];
				if (!state.briefed.includes(resident)) {
					state.briefed.push(resident);
					lines.push(`${ctx.prompt("holdem/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`);
				}
				const seen = state.seenResults[resident] ?? 0;
				if (seen < state.results.length) {
					lines.push(...state.results.slice(seen).map((result) => resultLine(result, resident)));
					state.seenResults[resident] = state.results.length;
				}
				if (state.seenHand[resident] !== hand.number) {
					state.seenHand[resident] = hand.number;
					state.seenLog[resident] = 0;
					lines.push(handHead(ctx, hand, resident));
				}
				const from = state.seenLog[resident] ?? 0;
				if (from < hand.log.length) {
					lines.push(`${hand.log.slice(from).map((entry) => entryLine(entry, limitsOf(ctx), resident)).join("; ")}.`);
					state.seenLog[resident] = hand.log.length;
				}
				if (hand.toAct === resident && !state.told) {
					state.told = true;
					lines.push(taskText(ctx, hand, resident));
				} else if (hand.toAct !== resident && lines.length > 0 && !hand.over) {
					// A seat woken to answer its last tool result reads the record as its cue and acts out of turn (P131).
					lines.push(hand.folded.includes(resident) ? "You folded this hand: nothing to do; end your turn." : `Not your turn: ${hand.toAct} is to act. End your turn; you will be told when it is yours.`);
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
		schema: HoldemSlice,
		save: (state) => structuredClone(state),
		load: (data) => structuredClone(data),
	}),
}));
