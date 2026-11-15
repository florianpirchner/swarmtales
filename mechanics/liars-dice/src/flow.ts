// SPDX-License-Identifier: Apache-2.0
/** The flow of a match: games and rounds with their seeded rolls, the locks of the two decision tools, the score of a decision, a bid, a call and the move of a seat that did not act in time. */
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import type { LiarsDiceCtx } from "./head.ts";
import { baselineOf, countFor, lowestFace, minimalRaise, nextLive, scoreLine, statsOf, totalDice, truthOf, type Bid, type DiceState, type Rules, type Scored } from "./model.ts";

type Ctx = LiarsDiceCtx;

const BID = "bid";
const LIAR = "liar";

/**
 * The rules of the table from the mechanic's options.
 *
 * @param ctx - The context of the mechanic.
 * @returns The rules.
 *
 * @public
 */
export const rulesOf = (ctx: Ctx): Rules => ({ faces: ctx.options.faces, wildOnes: ctx.options.wildOnes });

// Opens `bid` for the seat to act, and `liar` once a bid stands; closes both for everybody else.
function refreshLocks(ctx: Ctx): void {
	const state = ctx.state;
	for (const seat of state.seats) {
		const turn = state.running && state.toAct === seat;
		if (turn) ctx.access.unlock(seat, BID);
		else ctx.access.lock(seat, BID);
		if (turn && state.standing !== undefined) ctx.access.unlock(seat, LIAR);
		else ctx.access.lock(seat, LIAR);
	}
}

function startRound(ctx: Ctx, starter: string, tick: number): void {
	const state = ctx.state;
	state.round += 1;
	const rng = ctx.rng("liars-dice", "roll", state.game, state.round);
	state.dice = Object.fromEntries(state.seats.map((seat) => [seat, Array.from({ length: state.counts[seat] ?? 0 }, () => rng.int(1, ctx.options.faces))]));
	delete state.standing;
	state.bidder = "";
	state.toAct = starter;
	state.opened = tick;
	state.told = false;
	const counts = { ...state.counts };
	state.log.push({ kind: "round", round: state.round, starter, counts });
	ctx.emit("dice_rolled", { game: state.game, round: state.round, dice: Object.fromEntries(Object.entries(state.dice).map(([seat, dice]) => [seat, [...dice]])) });
	ctx.emit("dice_round_started", { game: state.game, round: state.round, starter, counts });
	refreshLocks(ctx);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.round = 0;
	state.counts = Object.fromEntries(state.seats.map((seat) => [seat, ctx.options.dice]));
	state.out = [];
	state.log = [];
	state.seenLog = {};
	state.briefed = [];
	state.decisions = [];
	state.gameScores = {};
	state.running = true;
	ctx.emit("dice_game_started", { game, seats: [...state.seats], dice: ctx.options.dice });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: "" });
	// The first round of each game opens one seat further round the table.
	startRound(ctx, state.seats[(game - 1) % state.seats.length] ?? "", ctx.tick);
}

/**
 * Starts the next game, or marks it due when the strategy brain holds it back.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

// Places of the finished game: the last seat with dice first, then the seats out, last out first.
function placesOf(state: DiceState): Record<string, number> {
	const order = [...state.seats.filter((seat) => !state.out.includes(seat)), ...[...state.out].reverse()];
	return Object.fromEntries(order.map((seat, index) => [seat, index + 1]));
}

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	state.running = false;
	state.toAct = "";
	refreshLocks(ctx);
	const places = placesOf(state);
	const points = Object.fromEntries(state.seats.map((seat) => [seat, ctx.options.placePoints[(places[seat] ?? 1) - 1] ?? 0]));
	state.gameScores = points;
	for (const seat of state.seats) state.scores[seat] = (state.scores[seat] ?? 0) + (points[seat] ?? 0);
	ctx.emit("dice_game_ended", { game: state.game, places, points: { ...points }, totals: { ...state.scores } });
	ctx.emit("dice_game_scored", { game: state.game, stats: statsOf(state.seats, state.decisions, state.log, places, points) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	const ranking = Object.entries(places)
		.sort((a, b) => a[1] - b[1])
		.map(([seat, place]) => `${String(place)}. ${seat}`)
		.join(", ");
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: `${String(state.round)} rounds; places ${ranking}; points ${scoreLine(points, state.seats)}` });
	if (last) ctx.emit("dice_match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.tick + 1, "nextGame");
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

// The chance that the decision is right from the seat's own dice, and the chance that the standing bid is true.
function chancesOf(ctx: Ctx, bid: Bid | undefined, own: readonly number[], unseen: number): { readonly truth: number; readonly standingTruth: number | undefined } {
	const standing = ctx.state.standing;
	const standingTruth = standing === undefined ? undefined : truthOf(standing, own, unseen, rulesOf(ctx));
	return { truth: bid === undefined ? 1 - (standingTruth ?? 1) : truthOf(bid, own, unseen, rulesOf(ctx)), standingTruth };
}

/**
 * Scores the decision of the seat to act against the baseline and records it.
 *
 * @param ctx - The context of the mechanic.
 * @param bid - The bid of a bid; undefined for a liar call.
 * @param missed - Whether the seat did not act in time.
 * @param reason - The reason the seat gave; it goes to the human only.
 *
 * @public
 */
export function score(ctx: Ctx, bid: Bid | undefined, missed: boolean, reason: string | undefined): void {
	const state = ctx.state;
	const seat = state.toAct;
	const kind = bid === undefined ? "liar" : "bid";
	const own = state.dice[seat] ?? [];
	const unseen = totalDice(state) - own.length;
	const base = baselineOf(state.standing, own, unseen, rulesOf(ctx));
	const { truth, standingTruth } = chancesOf(ctx, bid, own, unseen);
	const scored: Scored = {
		game: state.game,
		round: state.round,
		resident: seat,
		kind,
		...(bid === undefined ? {} : { bid: { ...bid } }),
		...(state.standing === undefined ? {} : { standing: { quantity: state.standing.quantity, face: state.standing.face } }),
		dice: [...own],
		unseen,
		truth: round3(truth),
		...(standingTruth === undefined ? {} : { standingTruth: round3(standingTruth) }),
		baseline: base.kind,
		...(base.bid === undefined ? {} : { baselineBid: { ...base.bid } }),
		agree: base.kind === kind,
		bluff: kind === "bid" && truth < 0.5,
		missed,
	};
	state.decisions.push(scored);
	const said = (reason ?? "").trim();
	ctx.emit("dice_decision_scored", { ...scored, ...(said === "" ? {} : { reason: said }) });
}

// The public remark of a bid or a call: trimmed, and none when table talk is off.
function tailOf(ctx: Ctx, say: string | undefined, missed: boolean): { say?: string; missed?: true } {
	const remark = ctx.options.talk ? (say ?? "").trim() : "";
	return { ...(remark === "" ? {} : { say: remark }), ...(missed ? { missed: true } : {}) };
}

/**
 * Places a bid (already checked) for the seat to act and passes the turn on.
 *
 * @param ctx - The context of the mechanic.
 * @param bid - The bid.
 * @param say - The public remark, if any.
 * @param missed - Whether the seat did not act in time.
 * @param tick - The tick the next seat's deadline counts from.
 *
 * @public
 */
export function placeBid(ctx: Ctx, bid: Bid, say: string | undefined, missed: boolean, tick: number): void {
	const state = ctx.state;
	const seat = state.toAct;
	const tail = tailOf(ctx, say, missed);
	state.standing = { ...bid };
	state.bidder = seat;
	state.log.push({ kind: "bid", round: state.round, seat, bid: { ...bid }, ...tail });
	ctx.emit("dice_bid", { game: state.game, round: state.round, seat, quantity: bid.quantity, face: bid.face, ...tail });
	state.toAct = nextLive(state.seats, state.counts, seat, false);
	state.opened = tick;
	state.told = false;
	// The seat knows its own bid: its next turn reports only what came after it.
	state.seenLog[seat] = state.log.length;
	refreshLocks(ctx);
}

/**
 * The call: every die is shown, the loser gives up one die, and the next round (or the game's end) follows.
 *
 * @param ctx - The context of the mechanic.
 * @param say - The public remark, if any.
 * @param missed - Whether the seat did not act in time.
 * @param tick - The tick the next round's deadline counts from.
 * @returns The loser, the count and the bid that was called, or undefined when no bid stands.
 *
 * @public
 */
export function callLiar(ctx: Ctx, say: string | undefined, missed: boolean, tick: number): { readonly loser: string; readonly count: number; readonly bid: Bid } | undefined {
	const state = ctx.state;
	const bid = state.standing;
	if (bid === undefined) return undefined;
	const seat = state.toAct;
	const tail = tailOf(ctx, say, missed);
	const all = Object.values(state.dice).flat();
	const count = countFor(all, bid.face, rulesOf(ctx));
	const loser = count >= bid.quantity ? seat : state.bidder;
	const dice = Object.fromEntries(Object.entries(state.dice).filter(([, own]) => own.length > 0).map(([owner, own]) => [owner, [...own].sort((a, b) => a - b)]));
	state.log.push({ kind: "liar", round: state.round, seat, bidder: state.bidder, bid: { ...bid }, count, dice, loser, ...tail });
	ctx.emit("dice_called", { game: state.game, round: state.round, seat, bidder: state.bidder, bid: { ...bid }, count, dice, loser, ...tail });
	state.counts[loser] = Math.max(0, (state.counts[loser] ?? 0) - 1);
	if ((state.counts[loser] ?? 0) === 0) {
		state.out.push(loser);
		const place = state.seats.length - state.out.length + 1;
		state.log.push({ kind: "out", seat: loser, place });
		ctx.emit("dice_seat_out", { game: state.game, seat: loser, place });
	}
	const live = state.seats.filter((other) => (state.counts[other] ?? 0) > 0);
	if (live.length <= 1) endGame(ctx);
	else startRound(ctx, nextLive(state.seats, state.counts, loser, true), tick);
	return { loser, count, bid };
}

/**
 * The end of a tick: a seat that did not act by its deadline opens with the lowest bid, or calls liar on the standing one.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function actForLate(ctx: Ctx): void {
	const state = ctx.state;
	if (!state.running || state.toAct === "" || ctx.tick - state.opened + 1 < ctx.options.deadline) return;
	if (state.standing === undefined) {
		const bid = minimalRaise(undefined, totalDice(state), rulesOf(ctx)) ?? { quantity: 1, face: lowestFace(rulesOf(ctx)) };
		score(ctx, bid, true, undefined);
		placeBid(ctx, bid, undefined, true, ctx.tick + 1);
	} else {
		score(ctx, undefined, true, undefined);
		callLiar(ctx, undefined, true, ctx.tick + 1);
	}
}
