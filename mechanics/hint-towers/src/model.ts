/**
 * The hint-towers rules as pure functions over a plain game state, shared by the mechanic, its
 * reference bot and the tests. The deck is the card table's: every card is unique (`"<Suit> <rank>"`).
 * A seat holds slots it cannot see; the others see them and give signals that name a suit or a rank.
 * A tower per suit is lit in rank order; a rank that is lost (discarded or misfired) is bridged, so
 * the next rank above it becomes playable and the loss costs exactly that one card's point. Once the
 * pile is empty no card is drawn any more; the game goes on until a whole round of seats lights no
 * card and gives no signal (the harbour goes dark), every hand is empty, every tower is done, or the strikes run out.
 * With soft strikes (`strikePenalty` > 0) the strikes never end a game; every misfire from the last strike on costs
 * that many points instead.
 */
import { Type, type Static } from "typebox";

export interface Suit {
	readonly name: string;
	readonly ranks: number;
}

const cardRe = /^(\S+) (\d+)$/;
export const suitOf = (card: string): string => cardRe.exec(card)?.[1] ?? "";
export const rankOf = (card: string): number => Number(cardRe.exec(card)?.[2] ?? 0);
export const deckOf = (suits: readonly Suit[]): string[] => suits.flatMap((suit) => Array.from({ length: suit.ranks }, (_, index) => `${suit.name} ${String(index + 1)}`));

export const Knowledge = Type.Object({
	suit: Type.Union([Type.String(), Type.Null()], { description: "The suit a signal named for this card, or null." }),
	rank: Type.Union([Type.Integer(), Type.Null()], { description: "The rank a signal named for this card, or null." }),
	notSuits: Type.Array(Type.String(), { description: "Suits a signal ruled out (it named the suit and did not touch this card)." }),
	notRanks: Type.Array(Type.Integer()),
});
export type Knowledge = Static<typeof Knowledge>;

export const SlotSchema = Type.Object({
	card: Type.String(),
	know: Knowledge,
	/** The turn of the last signal that touched the card (0: never). */
	touched: Type.Integer(),
	/** The turn of the last signal in which this card was the newest card touched (0: never). */
	focus: Type.Integer(),
});
export type Slot = Static<typeof SlotSchema>;

export const LogLine = Type.Object({ turn: Type.Integer(), seat: Type.String(), text: Type.String() });
export type LogLine = Static<typeof LogLine>;

export const EndReason = Type.Union([Type.Literal("complete"), Type.Literal("strikes"), Type.Literal("dark")]);
export type EndReason = Static<typeof EndReason>;

export const CoreSlice = Type.Object({
	seats: Type.Array(Type.String()),
	suits: Type.Array(Type.Object({ name: Type.String(), ranks: Type.Integer() })),
	/** Each seat's slots, oldest first (slot 1); a new card goes to the end. */
	hands: Type.Record(Type.String(), Type.Array(SlotSchema)),
	lit: Type.Array(Type.String()),
	lost: Type.Array(Type.String()),
	signals: Type.Integer(),
	strikes: Type.Integer(),
	/** Actions so far in the game; the next action is turn `turn + 1`. */
	turn: Type.Integer(),
	actor: Type.String(),
	pile: Type.Integer({ description: "Cards left in the draw pile." }),
	/** Turns in a row that lit no card and gave no signal since the pile ran out; null while it has cards. */
	dark: Type.Union([Type.Integer(), Type.Null()]),
	over: Type.Union([EndReason, Type.Null()]),
	log: Type.Array(LogLine),
});
export type Core = Static<typeof CoreSlice>;

export interface Rules {
	readonly handSize: number;
	readonly maxSignals: number;
	readonly maxStrikes: number;
	/** A completed tower gives a signal back. */
	readonly refillOnTower: boolean;
	/** 0: the last strike ends the game; above 0: strikes never end it, and each misfire from the last strike on costs this many points. */
	readonly strikePenalty: number;
}

/** Misfires that cost points: those from the last strike on, with soft strikes only. */
export const penaltyStrikes = (core: Readonly<Core>, rules: Rules): number => (rules.strikePenalty > 0 ? Math.max(0, core.strikes - rules.maxStrikes + 1) : 0);

/** The game's score: the cards lit, less the soft-strike penalty. */
export const scoreOf = (core: Readonly<Core>, rules: Rules): number => core.lit.length - rules.strikePenalty * penaltyStrikes(core, rules);

/** Draws the top card of the pile for `seat`, or undefined when it is empty. */
export type Draw = (seat: string) => string | undefined;

const blank = (): Knowledge => ({ suit: null, rank: null, notSuits: [], notRanks: [] });
const slotOf = (card: string): Slot => ({ card, know: blank(), touched: 0, focus: 0 });

/** A new game: every seat draws `handSize` cards in seat order, one at a time. */
export function newGame(seats: readonly string[], suits: readonly Suit[], rules: Rules, first: string, pile: number, draw: Draw): Core {
	const hands: Record<string, Slot[]> = Object.fromEntries(seats.map((seat) => [seat, []]));
	let left = pile;
	for (let round = 0; round < rules.handSize; round++) {
		for (const seat of seats) {
			const card = draw(seat);
			if (card === undefined) throw new Error("hint-towers: the deck is too small for the hands");
			left -= 1;
			hands[seat]?.push(slotOf(card));
		}
	}
	return { seats: [...seats], suits: suits.map((suit) => ({ ...suit })), hands, lit: [], lost: [], signals: rules.maxSignals, strikes: 0, turn: 0, actor: first, pile: left, dark: null, over: null, log: [] };
}

/** The top lit rank of a suit (0: nothing lit). */
export function topOf(core: Readonly<Core>, suit: string): number {
	return Math.max(0, ...core.lit.filter((card) => suitOf(card) === suit).map(rankOf));
}

/** The next rank a suit's tower takes: the lowest rank above the top that is not lost; null once nothing is left to light. */
export function nextRank(core: Readonly<Core>, suit: string): number | null {
	const spec = core.suits.find((entry) => entry.name === suit);
	if (spec === undefined) return null;
	for (let rank = topOf(core, suit) + 1; rank <= spec.ranks; rank++) if (!core.lost.includes(`${suit} ${String(rank)}`)) return rank;
	return null;
}

export const isPlayable = (core: Readonly<Core>, card: string): boolean => nextRank(core, suitOf(card)) === rankOf(card);

/** The cards a seat cannot see: its own hand and the draw pile. */
function unseenBy(core: Readonly<Core>, seat: string): string[] {
	const seen = new Set([...core.lit, ...core.lost, ...core.seats.filter((other) => other !== seat).flatMap((other) => (core.hands[other] ?? []).map((slot) => slot.card))]);
	return deckOf(core.suits).filter((card) => !seen.has(card));
}

/** The cards a slot of `seat` may be, from what the seat can see and what signals told it. */
export function candidates(core: Readonly<Core>, seat: string, index: number): string[] {
	const slot = core.hands[seat]?.[index];
	if (slot === undefined) return [];
	const know = slot.know;
	return unseenBy(core, seat).filter((card) => {
		const suit = suitOf(card);
		const rank = rankOf(card);
		return (know.suit === null || know.suit === suit) && (know.rank === null || know.rank === rank) && !know.notSuits.includes(suit) && !know.notRanks.includes(rank);
	});
}

/** Whether the seat can tell for sure that its slot is playable now. */
export function surePlayable(core: Readonly<Core>, seat: string, index: number): boolean {
	const options = candidates(core, seat, index);
	return options.length > 0 && options.every((card) => isPlayable(core, card));
}

/** What a signal names: a suit (by name, any case) or a rank; undefined when it is neither. */
export function parseAbout(core: Readonly<Core>, text: string): { readonly suit: string } | { readonly rank: number } | undefined {
	const clean = text.trim().toLowerCase();
	const suit = core.suits.find((entry) => entry.name.toLowerCase() === clean);
	if (suit !== undefined) return { suit: suit.name };
	if (/^\d+$/.test(clean)) {
		const rank = Number(clean);
		const most = Math.max(...core.suits.map((entry) => entry.ranks));
		if (rank >= 1 && rank <= most) return { rank };
	}
	return undefined;
}

export const aboutText = (about: { readonly suit: string } | { readonly rank: number }): string => ("suit" in about ? about.suit : String(about.rank));

const matches = (card: string, about: { readonly suit: string } | { readonly rank: number }): boolean => ("suit" in about ? suitOf(card) === about.suit : rankOf(card) === about.rank);

/** The slot indexes (from 0) of `hand` a signal touches. */
export const touchedBy = (hand: readonly Slot[], about: { readonly suit: string } | { readonly rank: number }): number[] => hand.flatMap((slot, index) => (matches(slot.card, about) ? [index] : []));

const nextSeat = (core: Readonly<Core>, seat: string): string => core.seats[(core.seats.indexOf(seat) + 1) % core.seats.length] ?? seat;

const complete = (core: Readonly<Core>): boolean => core.suits.every((suit) => nextRank(core, suit.name) === null);

/** After an action: the end checks, the dark count (`bright`: the action lit a card or gave a signal) and the next seat (a seat without cards is skipped). */
function advance(core: Core, bright: boolean, rules: Rules): void {
	if (core.dark !== null) core.dark = bright ? 0 : core.dark + 1;
	if (rules.strikePenalty === 0 && core.strikes >= rules.maxStrikes) core.over = "strikes";
	else if (complete(core)) core.over = "complete";
	else if (core.seats.every((seat) => (core.hands[seat] ?? []).length === 0)) core.over = "dark";
	else if (core.dark !== null && core.dark >= core.seats.length) core.over = "dark";
	if (core.over !== null) return;
	let next = nextSeat(core, core.actor);
	while ((core.hands[next] ?? []).length === 0) next = nextSeat(core, next);
	core.actor = next;
}

function refill(core: Core, seat: string, draw: Draw): void {
	if (core.pile <= 0) return;
	const card = draw(seat);
	if (card === undefined) return;
	core.pile -= 1;
	core.hands[seat]?.push(slotOf(card));
	// The dark count starts with the turn after the last draw.
	if (core.pile === 0) core.dark = -1;
}

export interface Outcome {
	readonly card: string;
	readonly slot: number;
	readonly lit: boolean;
	readonly drawn: string | null;
	readonly refilled: boolean;
}

/** The actor plays its slot `index` (from 0): lit when it is the next rank of its tower, else lost with a strike. */
export function play(core: Core, index: number, rules: Rules, draw: Draw): Outcome {
	const seat = core.actor;
	const hand = core.hands[seat] ?? [];
	const [slot] = hand.splice(index, 1);
	if (slot === undefined) throw new Error(`hint-towers: ${seat} has no slot ${String(index + 1)}`);
	const lit = isPlayable(core, slot.card);
	let refilled = false;
	if (lit) {
		core.lit.push(slot.card);
		if (rules.refillOnTower && nextRank(core, suitOf(slot.card)) === null && core.signals < rules.maxSignals) {
			core.signals += 1;
			refilled = true;
		}
	} else {
		core.lost.push(slot.card);
		core.strikes += 1;
	}
	core.turn += 1;
	const before = core.pile;
	refill(core, seat, draw);
	const drawn = core.pile < before ? (hand.at(-1)?.card ?? null) : null;
	core.log.push({ turn: core.turn, seat, text: lit ? `played slot ${String(index + 1)}: ${slot.card}, lit${refilled ? " (tower complete, a signal back)" : ""}` : `played slot ${String(index + 1)}: ${slot.card}, a misfire (lost, strike ${String(core.strikes)}${rules.strikePenalty > 0 ? "" : ` of ${String(rules.maxStrikes)}`})` });
	advance(core, lit, rules);
	return { card: slot.card, slot: index, lit, drawn, refilled };
}

/** The actor discards its slot `index`: the card is lost and a signal comes back. */
export function discard(core: Core, index: number, rules: Rules, draw: Draw): Outcome {
	const seat = core.actor;
	const hand = core.hands[seat] ?? [];
	const [slot] = hand.splice(index, 1);
	if (slot === undefined) throw new Error(`hint-towers: ${seat} has no slot ${String(index + 1)}`);
	core.lost.push(slot.card);
	core.signals = Math.min(rules.maxSignals, core.signals + 1);
	core.turn += 1;
	const before = core.pile;
	refill(core, seat, draw);
	const drawn = core.pile < before ? (hand.at(-1)?.card ?? null) : null;
	core.log.push({ turn: core.turn, seat, text: `discarded slot ${String(index + 1)}: ${slot.card} (lost, a signal back)` });
	advance(core, false, rules);
	return { card: slot.card, slot: index, lit: false, drawn, refilled: false };
}

/** The actor signals `to` about a suit or rank: every matching card learns it, every other card learns "not". */
export function signal(core: Core, to: string, about: { readonly suit: string } | { readonly rank: number }, rules: Rules): number[] {
	const hand = core.hands[to] ?? [];
	const touched = touchedBy(hand, about);
	core.turn += 1;
	hand.forEach((slot, index) => {
		const hit = touched.includes(index);
		if ("suit" in about) {
			if (hit) slot.know.suit = about.suit;
			else if (!slot.know.notSuits.includes(about.suit)) slot.know.notSuits.push(about.suit);
		} else if (hit) slot.know.rank = about.rank;
		else if (!slot.know.notRanks.includes(about.rank)) slot.know.notRanks.push(about.rank);
		if (hit) slot.touched = core.turn;
	});
	const newest = touched.at(-1);
	const focused = newest === undefined ? undefined : hand[newest];
	if (focused !== undefined) focused.focus = core.turn;
	core.signals -= 1;
	core.log.push({ turn: core.turn, seat: core.actor, text: `signalled ${to} "${aboutText(about)}": slot${touched.length === 1 ? "" : "s"} ${touched.map((index) => String(index + 1)).join(", ")}` });
	advance(core, true, rules);
	return touched;
}

/** Why the actor may not signal `to` about `about` now, or undefined. */
export function signalProblem(core: Readonly<Core>, to: string, about: { readonly suit: string } | { readonly rank: number }): string | undefined {
	if (core.signals <= 0) return "NO_SIGNALS";
	if (to === core.actor) return "SELF_SIGNAL";
	const hand = core.hands[to];
	if (hand === undefined) return "UNKNOWN_SEAT";
	if (touchedBy(hand, about).length === 0) return "TOUCHES_NOTHING";
	return undefined;
}

export type Action = { readonly kind: "play" | "discard"; readonly slot: number } | { readonly kind: "signal"; readonly to: string; readonly about: { readonly suit: string } | { readonly rank: number } };

/**
 * The reference bot's action for the actor, from the actor's knowledge only (it sees the others'
 * cards, never its own). Its one convention: the newest card a signal touches is meant to be played.
 * 1. play a slot it knows is playable, else the focus of a signal that may be playable;
 * 2. with a signal left, point at a teammate's playable card no one has pointed at, as the newest card touched;
 * 3. below the signal cap, discard the oldest untouched slot (else slot 1);
 * 4. at the cap, signal the next seat the rank of its oldest card.
 */
export function botAction(core: Readonly<Core>, rules: Rules): Action {
	const seat = core.actor;
	const hand = core.hands[seat] ?? [];
	const sure = hand.findIndex((_, index) => surePlayable(core, seat, index));
	if (sure >= 0) return { kind: "play", slot: sure };
	const focused = hand
		.map((slot, index) => ({ slot, index }))
		.filter(({ slot, index }) => slot.focus > 0 && candidates(core, seat, index).some((card) => isPlayable(core, card)))
		.sort((a, b) => b.slot.focus - a.slot.focus)[0];
	if (focused !== undefined) return { kind: "play", slot: focused.index };
	if (core.signals > 0) {
		const others = core.seats.map((_, offset) => core.seats[(core.seats.indexOf(seat) + 1 + offset) % core.seats.length] ?? seat).filter((other) => other !== seat);
		for (const other of others) {
			const theirs = core.hands[other] ?? [];
			for (const [index, slot] of theirs.entries()) {
				if (!isPlayable(core, slot.card) || slot.focus > 0 || surePlayable(core, other, index)) continue;
				const options: ({ readonly suit: string } | { readonly rank: number })[] = [{ rank: rankOf(slot.card) }, { suit: suitOf(slot.card) }];
				const fit = options.find((about) => touchedBy(theirs, about).at(-1) === index);
				if (fit !== undefined) return { kind: "signal", to: other, about: fit };
			}
		}
	}
	if (core.signals < rules.maxSignals) {
		const chop = hand.findIndex((slot) => slot.touched === 0);
		return { kind: "discard", slot: Math.max(0, chop) };
	}
	const next = core.seats.map((_, offset) => core.seats[(core.seats.indexOf(seat) + 1 + offset) % core.seats.length] ?? seat).find((other) => other !== seat && (core.hands[other] ?? []).length > 0);
	const oldest = next === undefined ? undefined : core.hands[next]?.[0];
	if (next === undefined || oldest === undefined) return { kind: "play", slot: 0 };
	return { kind: "signal", to: next, about: { rank: rankOf(oldest.card) } };
}

/** Applies an action for the actor. */
export function apply(core: Core, action: Action, rules: Rules, draw: Draw): void {
	if (action.kind === "signal") signal(core, action.to, action.about, rules);
	else if (action.kind === "play") play(core, action.slot, rules, draw);
	else discard(core, action.slot, rules, draw);
}

/** The bot crew's score on a deal: four bots play the whole game from the same shuffled deck. */
export function botScore(seats: readonly string[], suits: readonly Suit[], rules: Rules, first: string, deck: readonly string[]): number {
	const pile = [...deck];
	const draw: Draw = () => pile.shift();
	const core = newGame(seats, suits, rules, first, pile.length, draw);
	for (let step = 0; core.over === null && step < 1000; step++) apply(core, botAction(core, rules), rules, draw);
	return scoreOf(core, rules);
}
