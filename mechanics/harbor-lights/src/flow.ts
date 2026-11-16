// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The flow of the hint towers: a game starts and ends, a seat acts, the checks of the tools and the move timer. */
import type { Refusal } from "@swarmtales/contracts";
import { refuse } from "@swarmtales/sdk";
import { CardTableService, deckOf } from "@swarmtales/mechanic-card-table/contract";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { botAction, botScore } from "./bot.ts";
import type { GameRecord, HintState, HintTowersCtx } from "./head.ts";
import { aboutText, discard, newGame, parseAbout, play, scoreOf, signal, signalProblem, type Action, type TowerGame, type Draw, type Outcome } from "./model.ts";
import { plural, reasonText, rulesOf, stillNeeded, strikeText } from "./texts.ts";

type Ctx = HintTowersCtx;

/**
 * What the move timer watches: the same key at a tick's start and end means nothing happened in it.
 *
 * @param state - The state.
 * @returns The key of the open action; empty while no game runs.
 *
 * @public
 */
export function actionKey(state: Readonly<HintState>): string {
	const core = state.core;
	return core?.over !== null ? "" : `${String(state.game)}:${String(core.turn)}:${core.actor}`;
}

// The mechanic's draw: the card table moves its top card into the seat's hand.
const drawFrom =
	(ctx: Ctx): Draw =>
	(seat) =>
		ctx.call(CardTableService, "draw", { resident: seat }) ?? undefined;

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.signalsGiven = 0;
	state.misfires = 0;
	state.debrief = [];
	state.discarded = [];
	const first = state.seats[(game - 1) % state.seats.length] ?? "";
	const suits = ctx.call(CardTableService, "suits", {});
	ctx.call(CardTableService, "deal", { cards: 0 });
	const pile = ctx.call(CardTableService, "stock", {});
	state.baseline = botScore(state.seats, suits, rulesOf(ctx), first, pile);
	state.core = newGame(state.seats, suits, rulesOf(ctx), first, pile.length, drawFrom(ctx));
	for (const resident of state.seats) for (const tool of ctx.options.quietTools) ctx.access.lock(resident, tool);
	const hands = Object.fromEntries(state.seats.map((seat) => [seat, (state.core?.hands[seat] ?? []).map((slot) => slot.card)]));
	ctx.emit("game_started", { game, seats: [...state.seats], first, deck: deckOf(suits).length });
	ctx.emit("deal_revealed", { game, hands, pile: ctx.call(CardTableService, "stock", {}), baseline: state.baseline });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: ctx.options.side ?? first });
}

/**
 * Starts the next game, or marks it due when another mechanic holds it back.
 *
 * @param ctx - The context.
 *
 * @public
 */
export function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || (state.core !== null && state.core.over === null)) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

function endGame(ctx: Ctx, core: TowerGame): void {
	const state = ctx.state;
	const reason = core.over ?? "dark";
	const deck = deckOf(core.suits).length;
	const record: GameRecord = { game: state.game, reason, score: scoreOf(core, rulesOf(ctx)), baseline: state.baseline, lost: core.lost.length, misfires: state.misfires, signals: state.signalsGiven };
	state.results.push(record);
	state.debrief = [...state.seats];
	for (const resident of state.seats) for (const tool of ctx.options.quietTools) ctx.access.unlock(resident, tool);
	ctx.emit("game_ended", { game: state.game, reason, score: record.score, deck, lost: record.lost, misfires: record.misfires, signals: record.signals });
	ctx.emit("game_scored", { game: state.game, score: record.score, baseline: record.baseline });
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: `the crew lit ${String(core.lit.length)} of ${String(deck)} cards${record.score === core.lit.length ? "" : `, score ${String(record.score)} after the strike penalty`} (${reasonText(reason)}; ${plural(record.misfires, "misfire")}, ${String(record.lost - record.misfires)} discarded)` });
	if (state.game < ctx.options.games) {
		ctx.schedule.at(ctx.tick + 1, "nextGame");
		return;
	}
	state.finished = true;
	ctx.emit("match_ended", { scores: state.results.map((entry) => entry.score), baselines: state.results.map((entry) => entry.baseline) });
}

// A signal of the actor: the event and the first sentence of the reply.
function signalNow(ctx: Ctx, core: TowerGame, action: Extract<Action, { kind: "signal" }>, forfeit: boolean): string {
	const seat = core.actor;
	const slots = signal(core, action.to, action.about, rulesOf(ctx)).map((index) => index + 1);
	ctx.state.signalsGiven += 1;
	ctx.emit("signal_given", { game: ctx.state.game, turn: core.turn, seat, to: action.to, about: aboutText(action.about), slots, forfeit });
	return `You signalled ${action.to} "${aboutText(action.about)}": slot${slots.length === 1 ? "" : "s"} ${slots.join(", ")}.`;
}

// The card leaves the seat's hand at the card table, which holds every hand too.
function takeFromTable(ctx: Ctx, seat: string, card: string): void {
	if (!ctx.call(CardTableService, "take", { resident: seat, card })) throw new RangeError(`harbor-lights: ${seat} does not hold ${card}`);
}

// A play or a discard of the actor: the card leaves the card table's hand too, a new one is drawn while the pile lasts.
function slotNow(ctx: Ctx, core: TowerGame, action: Extract<Action, { kind: "play" | "discard" }>, forfeit: boolean): string {
	const seat = core.actor;
	const card = core.hands[seat]?.[action.slot]?.card ?? "";
	if (action.kind === "discard") ctx.state.discarded.push(stillNeeded(core, card));
	takeFromTable(ctx, seat, card);
	const outcome = action.kind === "play" ? play(core, action.slot, rulesOf(ctx), drawFrom(ctx)) : discard(core, action.slot, rulesOf(ctx), drawFrom(ctx));
	const at = { game: ctx.state.game, turn: core.turn, seat };
	const text = action.kind === "play" ? played(ctx, core, at, outcome, forfeit) : discarded(ctx, core, at, outcome, forfeit);
	if (outcome.drawn === null) return text;
	ctx.emit("card_drawn", { ...at, card: outcome.drawn });
	return `${text} You drew a new card into slot ${String(core.hands[seat]?.length ?? 0)}.`;
}

interface At {
	readonly game: number;
	readonly turn: number;
	readonly seat: string;
}

// The event of a play and what the seat reads about it.
function played(ctx: Ctx, core: Readonly<TowerGame>, at: At, outcome: Outcome, forfeit: boolean): string {
	if (!outcome.lit) ctx.state.misfires += 1;
	ctx.emit("card_played", { ...at, slot: outcome.slot + 1, card: outcome.card, lit: outcome.lit, forfeit });
	if (outcome.lit) return `Slot ${String(outcome.slot + 1)} was ${outcome.card}: lit.${outcome.refilled ? " The tower is complete; a signal comes back." : ""}`;
	return `Slot ${String(outcome.slot + 1)} was ${outcome.card}: a misfire. The card is lost; ${strikeText(ctx, core)}.`;
}

// The event of a discard and what the seat reads about it.
function discarded(ctx: Ctx, core: Readonly<TowerGame>, at: At, outcome: Outcome, forfeit: boolean): string {
	ctx.emit("card_discarded", { ...at, slot: outcome.slot + 1, card: outcome.card, forfeit });
	return `Slot ${String(outcome.slot + 1)} was ${outcome.card}: discarded (lost). Signals: ${String(core.signals)}.`;
}

/**
 * Runs one action for the actor.
 *
 * @param ctx - The context.
 * @param action - The action; the caller has checked it.
 * @param forfeit - True for an action of the move timer.
 * @returns The reply for the seat that acted.
 * @throws RangeError when no game is set up, or the card table does not hold the card of the slot.
 *
 * @public
 */
export function act(ctx: Ctx, action: Action, forfeit: boolean): string {
	const core = ctx.state.core;
	if (core === null) throw new RangeError("harbor-lights: no game");
	const text = action.kind === "signal" ? signalNow(ctx, core, action, forfeit) : slotNow(ctx, core, action, forfeit);
	if (core.over !== null) {
		endGame(ctx, core);
		return `${text} The game is over: ${reasonText(core.over)}; the crew lit ${String(core.lit.length)} cards (score ${String(scoreOf(core, rulesOf(ctx)))}). End your turn.`;
	}
	return `${text} ${core.actor} is next. End your turn.`;
}

// Why `seat` may not act now, or undefined.
function turnProblem(state: Readonly<HintState>, seat: string | undefined): Refusal | undefined {
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	const core = state.core;
	if (core?.over !== null) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	if (seat === undefined || seat !== core.actor) return refuse("NOT_YOUR_TURN", `It is ${core.actor}'s turn.`);
	return undefined;
}

/**
 * Checks a play or a discard of a slot.
 *
 * @param state - The state.
 * @param seat - The caller.
 * @param slot - The slot as the caller wrote it, from 1.
 * @returns The refusal, or the slot's index from 0.
 *
 * @public
 */
export function slotProblem(state: Readonly<HintState>, seat: string | undefined, slot: number): { readonly refusal: Refusal } | { readonly index: number } {
	const problem = turnProblem(state, seat);
	if (problem !== undefined || seat === undefined) return { refusal: problem ?? refuse("NOT_YOUR_TURN") };
	const size = state.core?.hands[seat]?.length ?? 0;
	if (!Number.isInteger(slot) || slot < 1 || slot > size) return { refusal: refuse("NO_SUCH_SLOT", `You hold slots 1 to ${String(size)}.`) };
	return { index: slot - 1 };
}

const SIGNAL_REFUSALS: Readonly<Record<string, string>> = {
	NO_SIGNALS: "No signal is left; play or discard a slot instead.",
	SELF_SIGNAL: "You cannot signal yourself; you cannot see your own cards.",
	UNKNOWN_SEAT: "Signal one of the other seats.",
	TOUCHES_NOTHING: "A signal must touch at least one card of that seat.",
};

/**
 * Checks a signal.
 *
 * @param ctx - The context.
 * @param seat - The caller.
 * @param to - The seat to tell, as the caller wrote it.
 * @param text - The subject, as the caller wrote it.
 * @returns The refusal, or the signal as an action.
 *
 * @public
 */
export function signalCheck(ctx: Ctx, seat: string | undefined, to: string, text: string): { readonly refusal: Refusal } | { readonly action: Action } {
	const problem = turnProblem(ctx.state, seat);
	const core = ctx.state.core;
	if (problem !== undefined || core === null) return { refusal: problem ?? refuse("NO_GAME") };
	const about = parseAbout(core, text);
	if (about === undefined) return { refusal: refuse("UNKNOWN_SIGNAL", `Name one suit (${core.suits.map((suit) => suit.name).join(", ")}) or one rank (1 to ${String(Math.max(...core.suits.map((suit) => suit.ranks)))}).`) };
	const target = core.seats.find((name) => name.toLowerCase() === to.trim().toLowerCase()) ?? to.trim();
	const code = signalProblem(core, target, about);
	if (code !== undefined) return { refusal: refuse(code, SIGNAL_REFUSALS[code] ?? code) };
	return { action: { kind: "signal", to: target, about } };
}

/**
 * The move timer acts for the seat on turn with the reference bot's action; too many in a row end the match as invalid.
 *
 * @param ctx - The context.
 *
 * @public
 */
export function forfeit(ctx: Ctx): void {
	const state = ctx.state;
	const core = state.core;
	if (core?.over !== null) return;
	state.forfeits += 1;
	act(ctx, botAction(core, rulesOf(ctx)), true);
	const limit = ctx.options.maxConsecutiveForfeits;
	if (limit > 0 && state.forfeits >= limit && !state.finished) {
		state.finished = true;
		state.invalid = true;
		ctx.emit("match_ended", { scores: state.results.map((entry) => entry.score), baselines: state.results.map((entry) => entry.baseline), invalid: true });
	}
}
