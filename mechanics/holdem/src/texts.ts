// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The texts a seat reads: a line of the hand's record, a hand's result, the rules, its task on its turn with the decision aid, the table, and the input lines of an activation. */
import { describeWith, rangeEquity } from "./cards.ts";
import { limitsOf, scoreLine, signed } from "./flow.ts";
import type { HoldemCtx } from "./head.ts";
import { options as optionsOf, positionOf, rangesOf, type Entry, type Hand, type Limits, type Result } from "./model.ts";

type Ctx = HoldemCtx;

const cardsText = (cards: readonly string[]): string => (cards.length === 0 ? "none yet" : cards.join(" "));

function potOf(hand: Hand): number {
	return Object.values(hand.invested).reduce((sum, value) => sum + value, 0);
}

// A seat's name as `viewer` reads it: its own seat is marked, so a model does not lose track of which seat it is (P133).
const nameFor = (seat: string, viewer: string | undefined): string => (seat === viewer ? `${seat} (you)` : seat);

function entryLine(entry: Entry, limits: Limits, viewer: string | undefined): string {
	return entry.kind === "board" ? `${entry.street === "flop" ? "Flop" : entry.street === "turn" ? "Turn" : "River"}: ${entry.cards.join(" ")}` : actionLine(entry, limits, viewer);
}

function actionLine(entry: Extract<Entry, { kind: "action" }>, limits: Limits, viewer: string | undefined): string {
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

// Before the flop the best hand in words is the shape of the two hole cards.
function bestText(hand: Hand, seat: string): string | undefined {
	if (hand.board.length >= 3) return describeWith(hand.holes[seat] ?? [], hand.board);
	const [a, b] = hand.holes[seat] ?? [];
	if (a === undefined || b === undefined) return undefined;
	return a.slice(0, 1) === b.slice(0, 1) ? "a pocket pair" : a.slice(1) === b.slice(1) ? "two suited cards" : "two unpaired cards";
}

function taskText(ctx: Ctx, hand: Hand, seat: string): string {
	const { toCall, pot } = optionsOf(hand, limitsOf(ctx));
	const lines = [ctx.prompt("holdem/task", { street: hand.street, board: cardsText(hand.board), pot, toCall, choices: choicesOf(ctx, hand) })];
	const best = ctx.options.showBest ? bestText(hand, seat) : undefined;
	if (best !== undefined) lines.push(ctx.prompt("holdem/best", { best }));
	if (aidFor(ctx, seat)) lines.push(aidText(ctx, hand, seat));
	return lines.join(" ");
}

// Whether `seat` reads the decision aid: `aid` is on and the seat is one of `aidSeats` (a mixed table), or no list is given.
const aidFor = (ctx: Ctx, seat: string): boolean => ctx.options.aid && (ctx.options.aidSeats === undefined || ctx.options.aidSeats.includes(seat));

const percent = (value: number): string => `${String(Math.round(value * 100))} %`;

// The decision-time aid (P430): the same range equity the baseline scores the decision with, drawn from
// its own stream (keyed by the decision's index, so viewTable and the turn line show the same number).
function aidText(ctx: Ctx, hand: Hand, seat: string): string {
	const { toCall, pot } = optionsOf(hand, limitsOf(ctx));
	const players = hand.seats.filter((other) => !hand.folded.includes(other)).length;
	const value = rangeEquity(hand.holes[seat] ?? [], hand.board, rangesOf(hand, seat), ctx.options.equitySamples, ctx.rng("holdem", "aid", ctx.state.game, hand.number, ctx.state.decisions.length));
	const need = toCall === 0 ? "nothing (no bet to call)" : percent(toCall / (pot + toCall));
	return ctx.prompt("holdem/aid", { equity: percent(value), need, share: percent(1 / Math.max(1, players)) });
}

// The lines of the table that only a seat reads: its cards, this hand's record, its task, the earlier hands and the points.
function seatLines(ctx: Ctx, hand: Hand, resident: string): string[] {
	const state = ctx.state;
	const lines = [handHead(ctx, hand, resident), `This hand so far: ${hand.log.map((entry) => entryLine(entry, limitsOf(ctx), resident)).join("; ")}. Pot ${String(potOf(hand))}.`];
	if (hand.folded.includes(resident)) lines.push("You folded this hand.");
	else if (hand.toAct === resident) lines.push(taskText(ctx, hand, resident));
	else lines.push(`${hand.toAct} is to act; wait for your turn.`);
	const past = state.results.slice(-6).map((result) => resultLine(result, resident));
	if (past.length > 0) lines.push(`Earlier hands of this game: ${past.join(" ")}`);
	lines.push(`Points in this game: ${scoreLine(state.gameScores, state.seats)}. In the match: ${scoreLine(state.scores, state.seats)}.`);
	return lines;
}

/**
 * The table as `viewTable` shows it.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller; a caller without a seat reads the public part only.
 * @returns The text.
 *
 * @public
 */
export function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	const hand = state.hand;
	if (!state.running || hand === undefined) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon. Points: ${scoreLine(state.scores, state.seats)}.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, hand ${String(hand.number)} of ${String(ctx.options.hands)}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) lines.push(...seatLines(ctx, hand, resident));
	return lines.join("\n");
}

// The record lines a seat has not read yet: the rules once per game, the results, its cards once per hand, the record since its last look.
function newsLines(ctx: Ctx, hand: Hand, resident: string): string[] {
	const state = ctx.state;
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
	return lines;
}

/**
 * The input lines of a seat's activation: the news since its last look, and its task once per turn or the notice
 * that it is not on turn.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident that is activated.
 * @returns The lines; none outside a hand and for a resident without a seat.
 *
 * @public
 */
export function inputLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	const hand = state.hand;
	if (!state.running || hand === undefined || !state.seats.includes(resident)) return [];
	const lines = newsLines(ctx, hand, resident);
	if (hand.toAct === resident && !state.told) {
		state.told = true;
		lines.push(taskText(ctx, hand, resident));
	} else if (hand.toAct !== resident && lines.length > 0 && !hand.over) {
		// A seat woken to answer its last tool result reads the record as its cue and acts out of turn (P131).
		lines.push(hand.folded.includes(resident) ? "You folded this hand: nothing to do; end your turn." : `Not your turn: ${hand.toAct} is to act. End your turn; you will be told when it is yours.`);
	}
	return lines;
}
