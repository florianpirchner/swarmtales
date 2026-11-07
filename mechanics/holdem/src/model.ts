/**
 * Fixed-limit hold'em betting as pure functions over one hand, and the mechanic's state. A hand has no
 * stacks: every seat can always cover the betting (the raise cap bounds what a seat can put into one hand: 48
 * points with the default limits), so there is no all-in and no side pot, and a seat's points from a
 * hand are what it won minus what it put in.
 */
import { Type, type Static } from "typebox";
import { describe, evaluate, type Range } from "./cards.ts";

export const Street = Type.Union([Type.Literal("preflop"), Type.Literal("flop"), Type.Literal("turn"), Type.Literal("river")]);
export type Street = Static<typeof Street>;

const STREETS: readonly Street[] = ["preflop", "flop", "turn", "river"];

/** What a seat asks for; `bet` and `raise` both mean "put in one more bet", `call` with nothing to call is a check. */
export const Move = Type.Union([Type.Literal("fold"), Type.Literal("check"), Type.Literal("call"), Type.Literal("bet"), Type.Literal("raise")]);
export type Move = Static<typeof Move>;

/** What a seat did, as logged: the move after normalisation, plus the blinds. */
export const Done = Type.Union([Type.Literal("small blind"), Type.Literal("big blind"), Type.Literal("fold"), Type.Literal("check"), Type.Literal("call"), Type.Literal("bet"), Type.Literal("raise")]);
export type Done = Static<typeof Done>;

export interface Limits {
	readonly smallBlind: number;
	readonly bigBlind: number;
	/** The bet size on the preflop and the flop. */
	readonly smallBet: number;
	/** The bet size on the turn and the river. */
	readonly bigBet: number;
	/** Bets per street, the opening bet included (preflop: the big blind is the first). */
	readonly cap: number;
}

/** One line of a hand's public record: a seat's action (`to`: its street total after it) or cards on the board. */
export const Entry = Type.Union([
	Type.Object({ kind: Type.Literal("action"), seat: Type.String(), done: Done, to: Type.Number(), street: Street, missed: Type.Optional(Type.Boolean()) }),
	Type.Object({ kind: Type.Literal("board"), street: Street, cards: Type.Array(Type.String()) }),
]);
export type Entry = Static<typeof Entry>;

export const HandSlice = Type.Object({
	number: Type.Integer({ description: "The hand's number in the game, from 1." }),
	/** The seats in table order. */
	seats: Type.Array(Type.String()),
	/** Index of the button in `seats`. */
	button: Type.Integer(),
	holes: Type.Record(Type.String(), Type.Array(Type.String())),
	/** The five board cards of the deal, revealed street by street (secret until dealt). */
	runout: Type.Array(Type.String()),
	board: Type.Array(Type.String()),
	street: Street,
	folded: Type.Array(Type.String()),
	invested: Type.Record(Type.String(), Type.Number()),
	/** Each seat's chips in on this street. */
	streetIn: Type.Record(Type.String(), Type.Number()),
	/** The street total every seat must match. */
	bet: Type.Number(),
	/** Bets so far on this street (the big blind counts preflop). */
	bets: Type.Integer(),
	/** Seats that acted since the last bet or raise. */
	acted: Type.Array(Type.String()),
	/** The seat to act, or '' when the hand is over. */
	toAct: Type.String(),
	log: Type.Array(Entry),
	over: Type.Boolean(),
});
export type Hand = Static<typeof HandSlice>;

/** Where a seat sits relative to the button. */
export function positionOf(hand: Hand, seat: string): string {
	const n = hand.seats.length;
	const offset = (hand.seats.indexOf(seat) - hand.button + n) % n;
	if (n === 2) return offset === 0 ? "the button and small blind" : "the big blind";
	if (offset === 0) return "the button";
	if (offset === 1) return "the small blind";
	if (offset === 2) return "the big blind";
	return offset === n - 1 ? "the cutoff (last before the button)" : "early position";
}

const active = (hand: Hand): string[] => hand.seats.filter((seat) => !hand.folded.includes(seat));

const betSize = (street: Street, limits: Limits): number => (street === "preflop" || street === "flop" ? limits.smallBet : limits.bigBet);

/** The seat after `from` (an index) in table order that has not folded. */
function nextActive(hand: Hand, from: number, needsAction: boolean): string {
	const n = hand.seats.length;
	for (let step = 1; step <= n; step++) {
		const seat = hand.seats[(from + step) % n];
		if (seat === undefined || hand.folded.includes(seat)) continue;
		if (!needsAction || !hand.acted.includes(seat) || (hand.streetIn[seat] ?? 0) < hand.bet) return seat;
	}
	return "";
}

function put(hand: Hand, seat: string, to: number): void {
	const before = hand.streetIn[seat] ?? 0;
	hand.streetIn[seat] = to;
	hand.invested[seat] = (hand.invested[seat] ?? 0) + (to - before);
}

/**
 * A new hand: hole cards by position (`holes[0]` for the button, then clockwise), the five board cards,
 * the blinds posted. The button sits at `button` in `seats`; heads-up the button posts the small blind
 * and acts first before the flop, last after it.
 */
export function newHand(number: number, seats: readonly string[], button: number, holesByPosition: readonly (readonly string[])[], runout: readonly string[], limits: Limits): Hand {
	const n = seats.length;
	if (n < 2) throw new Error("holdem: a hand needs two seats");
	const at = (offset: number): string => seats[(button + offset) % n] ?? "";
	const holes = Object.fromEntries(Array.from({ length: n }, (_, offset) => [at(offset), [...(holesByPosition[offset] ?? [])]]));
	const hand: Hand = {
		number,
		seats: [...seats],
		button,
		holes,
		runout: [...runout],
		board: [],
		street: "preflop",
		folded: [],
		invested: Object.fromEntries(seats.map((seat) => [seat, 0])),
		streetIn: Object.fromEntries(seats.map((seat) => [seat, 0])),
		bet: limits.bigBlind,
		bets: 1,
		acted: [],
		toAct: "",
		log: [],
		over: false,
	};
	const small = n === 2 ? at(0) : at(1);
	const big = n === 2 ? at(1) : at(2);
	put(hand, small, limits.smallBlind);
	hand.log.push({ kind: "action", seat: small, done: "small blind", to: limits.smallBlind, street: "preflop" });
	put(hand, big, limits.bigBlind);
	hand.log.push({ kind: "action", seat: big, done: "big blind", to: limits.bigBlind, street: "preflop" });
	hand.toAct = n === 2 ? at(0) : at(3);
	return hand;
}

/** What the seat to act may do: the chips to call, whether it may check, and whether (and to what) it may raise. */
export function options(hand: Hand, limits: Limits): { readonly toCall: number; readonly canRaise: boolean; readonly raiseTo: number; readonly pot: number } {
	const seat = hand.toAct;
	const toCall = Math.max(0, hand.bet - (hand.streetIn[seat] ?? 0));
	const pot = Object.values(hand.invested).reduce((sum, value) => sum + value, 0);
	return { toCall, canRaise: hand.bets < limits.cap, raiseTo: hand.bet + betSize(hand.street, limits), pot };
}

/** What a requested move means now (`call` with nothing to call is a check, `bet` and `raise` are one), or why it is not allowed. */
export function normalise(hand: Hand, move: Move, limits: Limits): { readonly done: "fold" | "check" | "call" | "bet" | "raise" } | { readonly problem: string } {
	const { toCall, canRaise } = options(hand, limits);
	if (move === "fold") return { done: "fold" };
	if (move === "check" || move === "call") {
		if (toCall === 0) return { done: "check" };
		if (move === "check") return { problem: `You cannot check: ${String(toCall)} to call. Fold, call or raise.` };
		return { done: "call" };
	}
	if (!canRaise) return { problem: `The betting on this street is capped at ${String(limits.cap)} bets. ${toCall === 0 ? "Check" : "Call or fold"}.` };
	return { done: hand.bet === 0 ? "bet" : "raise" };
}

/** The street is over: deal the next one, or end the hand at the showdown. */
function nextStreet(hand: Hand): void {
	const index = STREETS.indexOf(hand.street);
	const street = STREETS[index + 1];
	if (street === undefined) {
		hand.over = true;
		hand.toAct = "";
		return;
	}
	const cards = street === "flop" ? hand.runout.slice(0, 3) : street === "turn" ? hand.runout.slice(3, 4) : hand.runout.slice(4, 5);
	hand.street = street;
	hand.board = [...hand.board, ...cards];
	hand.log.push({ kind: "board", street, cards });
	hand.bet = 0;
	hand.bets = 0;
	hand.acted = [];
	hand.streetIn = Object.fromEntries(hand.seats.map((seat) => [seat, 0]));
	hand.toAct = nextActive(hand, hand.button, true);
}

/** Plays `done` (already normalised) for the seat to act and moves the hand on. */
export function play(hand: Hand, done: "fold" | "check" | "call" | "bet" | "raise", limits: Limits, missed = false): void {
	const seat = hand.toAct;
	if (seat === "" || hand.over) throw new Error("holdem: nobody is to act");
	if (done === "fold") hand.folded.push(seat);
	else if (done === "call") put(hand, seat, hand.bet);
	else if (done === "bet" || done === "raise") {
		hand.bet += betSize(hand.street, limits);
		hand.bets += 1;
		put(hand, seat, hand.bet);
		hand.acted = [];
	}
	if (done !== "fold") hand.acted.push(seat);
	hand.log.push({ kind: "action", seat, done, to: hand.streetIn[seat] ?? 0, street: hand.street, ...(missed ? { missed: true } : {}) });
	if (active(hand).length === 1) {
		hand.over = true;
		hand.toAct = "";
		return;
	}
	const next = nextActive(hand, hand.seats.indexOf(seat), true);
	if (next === "") nextStreet(hand);
	else hand.toAct = next;
}

export const Result = Type.Object({
	hand: Type.Integer(),
	button: Type.String(),
	pot: Type.Number(),
	board: Type.Array(Type.String()),
	/** The seats that showed their cards (a showdown), with their best hand in words. */
	shown: Type.Array(Type.Object({ seat: Type.String(), cards: Type.Array(Type.String()), best: Type.String() })),
	winners: Type.Array(Type.String()),
	/** Points per seat: won minus put in. */
	net: Type.Record(Type.String(), Type.Number()),
	/** The street the hand ended on. */
	street: Street,
	showdown: Type.Boolean(),
});
export type Result = Static<typeof Result>;

/** The pot of an ended hand, shared: the last seat standing takes it, else the best hands at the showdown split it (odd chips go to the first winners after the button). */
export function settle(hand: Hand): Result {
	const standing = active(hand);
	const pot = Object.values(hand.invested).reduce((sum, value) => sum + value, 0);
	const showdown = standing.length > 1;
	const values = new Map(standing.map((seat) => [seat, showdown ? evaluate([...(hand.holes[seat] ?? []), ...hand.board]) : 0]));
	const best = Math.max(...values.values());
	const n = hand.seats.length;
	const order = Array.from({ length: n }, (_, step) => hand.seats[(hand.button + 1 + step) % n] ?? "");
	const winners = order.filter((seat) => standing.includes(seat) && values.get(seat) === best);
	const share = Math.floor(pot / winners.length);
	const odd = pot - share * winners.length;
	const won = new Map(winners.map((seat, index) => [seat, share + (index < odd ? 1 : 0)]));
	return {
		hand: hand.number,
		button: hand.seats[hand.button] ?? "",
		pot,
		board: [...hand.board],
		shown: showdown ? order.filter((seat) => standing.includes(seat)).map((seat) => ({ seat, cards: [...(hand.holes[seat] ?? [])], best: describe([...(hand.holes[seat] ?? []), ...hand.board]) })) : [],
		winners,
		net: Object.fromEntries(hand.seats.map((seat) => [seat, (won.get(seat) ?? 0) - (hand.invested[seat] ?? 0)])),
		street: hand.street,
		showdown,
	};
}

/** A decision scored against the equity baseline, for the human and the report. */
export const Scored = Type.Object({
	game: Type.Integer(),
	hand: Type.Integer(),
	street: Street,
	resident: Type.String(),
	done: Type.Union([Type.Literal("fold"), Type.Literal("check"), Type.Literal("call"), Type.Literal("bet"), Type.Literal("raise")]),
	toCall: Type.Number(),
	pot: Type.Number({ description: "The pot before the decision." }),
	opponents: Type.Integer(),
	equity: Type.Number({ description: "Monte Carlo share of the pot against random hands of the opponents still in." }),
	rangeEquity: Type.Number({ description: "The same against hands drawn from each opponent's range as its actions narrow it (`rangesOf`); the baseline and the EV loss use it (P134)." }),
	potOdds: Type.Number({ description: "toCall / (pot + toCall): the equity a call needs to break even on this street." }),
	baseline: Type.Union([Type.Literal("fold"), Type.Literal("check"), Type.Literal("call"), Type.Literal("bet"), Type.Literal("raise")]),
	evLoss: Type.Number({ description: "One-street EV the decision gave up against the baseline's (folding equity, or calling without odds); 0 when it agrees in kind." }),
	missed: Type.Boolean(),
});
export type Scored = Static<typeof Scored>;

/** Preflop ranges by action: the share of starting hands a seat holds after one raise, after two or more, and after a call. */
const PREFLOP_TOP = { raise: 0.2, reraise: 0.08, call: 0.55 } as const;
const BOARD_SIZE: Readonly<Record<Street, number>> = { preflop: 0, flop: 3, turn: 4, river: 5 };

/** What the public actions of the hand so far say about the cards of each opponent of `seat` still in (P134), in table order. */
export function rangesOf(hand: Hand, seat: string): Range[] {
	return hand.seats
		.filter((other) => other !== seat && !hand.folded.includes(other))
		.map((other) => {
			const actions = hand.log.flatMap((entry) => (entry.kind === "action" && entry.seat === other ? [entry] : []));
			const preflop = actions.filter((entry) => entry.street === "preflop");
			const raises = preflop.filter((entry) => entry.done === "raise" || entry.done === "bet").length;
			const top = raises >= 2 ? PREFLOP_TOP.reraise : raises === 1 ? PREFLOP_TOP.raise : preflop.some((entry) => entry.done === "call") ? PREFLOP_TOP.call : 1;
			const streets = [...new Set(actions.filter((entry) => entry.street !== "preflop" && (entry.done === "bet" || entry.done === "raise")).map((entry) => entry.street))];
			return { top, strongOn: streets.map((street) => hand.runout.slice(0, BOARD_SIZE[street])) };
		});
}

/**
 * The equity baseline: fold when the equity is below the pot odds, bet or raise when it is well above a
 * fair share (1.5 times one over the players still in, at most 0.85), call or check otherwise. It is a
 * one-street pot-odds policy, not a solver: implied odds, position and bluffs are outside it.
 */
export function baselineOf(equityValue: number, toCall: number, pot: number, players: number, canRaise: boolean): { readonly baseline: Scored["baseline"]; readonly potOdds: number } {
	const potOdds = toCall === 0 ? 0 : toCall / (pot + toCall);
	const strong = equityValue >= Math.min(0.85, 1.5 / players);
	if (toCall > 0 && equityValue < potOdds) return { baseline: "fold", potOdds };
	if (strong && canRaise) return { baseline: toCall === 0 ? "bet" : "raise", potOdds };
	return { baseline: toCall === 0 ? "check" : "call", potOdds };
}

/** The one-street EV loss of `done` against the baseline: a fold gives up equity x pot - toCall when that is positive, a call without odds loses toCall - equity x (pot + toCall). */
export function evLossOf(done: Scored["done"], equityValue: number, toCall: number, pot: number): number {
	const continueEv = equityValue * (pot + toCall) - toCall;
	const ev = done === "fold" ? 0 : continueEv;
	return Math.round(Math.max(0, Math.max(0, continueEv) - ev) * 100) / 100;
}

export const SeatStats = Type.Object({
	net: Type.Number({ description: "Points in the game." }),
	hands: Type.Integer(),
	decisions: Type.Integer(),
	vpip: Type.Number({ description: "Share of hands where the seat put chips in voluntarily before the flop (a call or raise, blinds not counted)." }),
	pfr: Type.Number({ description: "Share of hands where the seat raised before the flop." }),
	aggression: Type.Number({ description: "(bets + raises) / calls over the game; calls 0 gives the bet count." }),
	showdowns: Type.Integer(),
	showdownsWon: Type.Integer(),
	agreement: Type.Number({ description: "Share of decisions of the same kind as the baseline (fold / check-call / bet-raise)." }),
	evLoss: Type.Number({ description: "Sum of the one-street EV losses against the baseline." }),
	missed: Type.Integer(),
});
export type SeatStats = Static<typeof SeatStats>;

const kindOf = (done: Scored["done"]): string => (done === "check" || done === "call" ? "passive" : done === "fold" ? "fold" : "aggressive");

const ratio = (value: number): number => Math.round(value * 1000) / 1000;

/** The seat statistics of a game from its decisions and results. */
export function statsOf(seats: readonly string[], decisions: readonly Scored[], results: readonly Result[]): Record<string, SeatStats> {
	return Object.fromEntries(
		seats.map((seat) => {
			const own = decisions.filter((decision) => decision.resident === seat);
			const preflop = own.filter((decision) => decision.street === "preflop");
			const handsWith = (test: (decision: Scored) => boolean): number => new Set(preflop.filter(test).map((decision) => decision.hand)).size;
			const hands = results.length;
			const raises = own.filter((decision) => decision.done === "bet" || decision.done === "raise").length;
			const calls = own.filter((decision) => decision.done === "call").length;
			const shown = results.filter((result) => result.shown.some((entry) => entry.seat === seat));
			const stats: SeatStats = {
				net: results.reduce((sum, result) => sum + (result.net[seat] ?? 0), 0),
				hands,
				decisions: own.length,
				vpip: ratio(hands === 0 ? 0 : handsWith((decision) => decision.done === "call" || decision.done === "raise" || decision.done === "bet") / hands),
				pfr: ratio(hands === 0 ? 0 : handsWith((decision) => decision.done === "raise" || decision.done === "bet") / hands),
				aggression: ratio(calls === 0 ? raises : raises / calls),
				showdowns: shown.length,
				showdownsWon: shown.filter((result) => result.winners.includes(seat)).length,
				agreement: ratio(own.length === 0 ? 0 : own.filter((decision) => kindOf(decision.done) === kindOf(decision.baseline)).length / own.length),
				evLoss: Math.round(own.reduce((sum, decision) => sum + decision.evLoss, 0) * 100) / 100,
				missed: own.filter((decision) => decision.missed).length,
			};
			return [seat, stats];
		}),
	);
}

export const HoldemSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	hand: Type.Optional(HandSlice),
	/** Minute the seat to act was asked. */
	opened: Type.Integer(),
	/** Seats told the rules of the running game. */
	briefed: Type.Array(Type.String()),
	/** Per seat: the hand number it was last told about (its cards), and how much of that hand's record it has seen. */
	seenHand: Type.Record(Type.String(), Type.Integer()),
	seenLog: Type.Record(Type.String(), Type.Integer()),
	/** Per seat: results of the game it has been told, as a count. */
	seenResults: Type.Record(Type.String(), Type.Integer()),
	/** Whether the seat to act has had its turn line. */
	told: Type.Boolean(),
	results: Type.Array(Result),
	decisions: Type.Array(Scored),
	scores: Type.Record(Type.String(), Type.Number()),
	gameScores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
});
export type HoldemState = Static<typeof HoldemSlice>;
