// SPDX-License-Identifier: Apache-2.0
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
import { deckOf, rankOf, suitOf, type SuitSpec } from "@swarmtales/mechanic-card-table/contract";

type Suit = SuitSpec;

/**
 * The schema of what a seat knows about one of its own cards.
 *
 * @public
 */
export const Knowledge = Type.Object({
	suit: Type.Union([Type.String(), Type.Null()], { description: "The suit a signal named for this card, or null." }),
	rank: Type.Union([Type.Integer(), Type.Null()], { description: "The rank a signal named for this card, or null." }),
	notSuits: Type.Array(Type.String(), { description: "Suits a signal ruled out (it named the suit and did not touch this card)." }),
	notRanks: Type.Array(Type.Integer()),
});
/**
 * What a seat knows about one of its own cards, from the signals it got.
 *
 * @public
 */
export type Knowledge = Static<typeof Knowledge>;

/**
 * The schema of one slot of a hand.
 *
 * @public
 */
export const SlotSchema = Type.Object({
	card: Type.String(),
	know: Knowledge,
	/** The turn of the last signal that touched the card (0: never). */
	touched: Type.Integer(),
	/** The turn of the last signal in which this card was the newest card touched (0: never). */
	focus: Type.Integer(),
});
/**
 * One slot of a hand: the card, what its holder knows of it and the signals that touched it.
 *
 * @public
 */
export type Slot = Static<typeof SlotSchema>;

/**
 * The schema of one line of the game record.
 *
 * @public
 */
export const LogLine = Type.Object({ turn: Type.Integer(), seat: Type.String(), text: Type.String() });
/**
 * One action of the game as the status shows it.
 *
 * @public
 */
export type LogLine = Static<typeof LogLine>;

/**
 * The schema of why a game ended.
 *
 * @public
 */
export const EndReason = Type.Union([Type.Literal("complete"), Type.Literal("strikes"), Type.Literal("dark")]);
/**
 * Why a game ended: every card lit or lost, the strikes ran out, or the harbour went dark.
 *
 * @public
 */
export type EndReason = Static<typeof EndReason>;

/**
 * The schema of one game.
 *
 * @public
 */
export const TowerGameSlice = Type.Object({
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
/**
 * One game: the hands, the towers, the counters and the record.
 *
 * @public
 */
export type TowerGame = Static<typeof TowerGameSlice>;

/**
 * The rules of a game that the options set.
 *
 * @public
 */
export interface Rules {
	/** Cards each seat holds. */
	readonly handSize: number;
	/** Signals the crew starts with and never holds more than. */
	readonly maxSignals: number;
	/** Misfires that end a game, or the misfire from which each one costs points. */
	readonly maxStrikes: number;
	/** A completed tower gives a signal back. */
	readonly refillOnTower: boolean;
	/** 0: the last strike ends the game; above 0: strikes never end it, and each misfire from the last strike on costs this many points. */
	readonly strikePenalty: number;
}

/**
 * Misfires that cost points: those from the last strike on, with soft strikes only.
 *
 * @param core - The game.
 * @param rules - The rules.
 * @returns The number of misfires that cost points.
 *
 * @public
 */
export const penaltyStrikes = (core: Readonly<TowerGame>, rules: Rules): number => (rules.strikePenalty > 0 ? Math.max(0, core.strikes - rules.maxStrikes + 1) : 0);

/**
 * The game's score: the cards lit, less the soft-strike penalty.
 *
 * @param core - The game.
 * @param rules - The rules.
 * @returns The score.
 *
 * @public
 */
export const scoreOf = (core: Readonly<TowerGame>, rules: Rules): number => core.lit.length - rules.strikePenalty * penaltyStrikes(core, rules);

/**
 * Draws the top card of the pile for `seat`, or undefined when it is empty.
 *
 * @public
 */
export type Draw = (seat: string) => string | undefined;

const blank = (): Knowledge => ({ suit: null, rank: null, notSuits: [], notRanks: [] });
const slotOf = (card: string): Slot => ({ card, know: blank(), touched: 0, focus: 0 });

/**
 * A new game: every seat draws `handSize` cards in seat order, one at a time.
 *
 * @param seats - The seats in turn order.
 * @param suits - The deck's suits.
 * @param rules - The rules.
 * @param first - The seat that acts first.
 * @param pile - Cards in the draw pile before the deal.
 * @param draw - Draws a card for a seat.
 * @returns The game.
 * @throws RangeError when the pile runs out during the deal.
 *
 * @public
 */
export function newGame(seats: readonly string[], suits: readonly Suit[], rules: Rules, first: string, pile: number, draw: Draw): TowerGame {
	const hands: Record<string, Slot[]> = Object.fromEntries(seats.map((seat) => [seat, []]));
	let left = pile;
	for (let round = 0; round < rules.handSize; round++) {
		for (const seat of seats) {
			const card = draw(seat);
			if (card === undefined) throw new RangeError("hint-towers: the deck is too small for the hands");
			left -= 1;
			hands[seat]?.push(slotOf(card));
		}
	}
	return { seats: [...seats], suits: suits.map((suit) => ({ ...suit })), hands, lit: [], lost: [], signals: rules.maxSignals, strikes: 0, turn: 0, actor: first, pile: left, dark: null, over: null, log: [] };
}

/**
 * The top lit rank of a suit.
 *
 * @param core - The game.
 * @param suit - The suit's name.
 * @returns The rank; 0 when nothing is lit.
 *
 * @public
 */
export function topOf(core: Readonly<TowerGame>, suit: string): number {
	return Math.max(0, ...core.lit.filter((card) => suitOf(card) === suit).map(rankOf));
}

/**
 * The next rank a suit's tower takes: the lowest rank above the top that is not lost.
 *
 * @param core - The game.
 * @param suit - The suit's name.
 * @returns The rank; null once nothing is left to light.
 *
 * @public
 */
export function nextRank(core: Readonly<TowerGame>, suit: string): number | null {
	const spec = core.suits.find((entry) => entry.name === suit);
	if (spec === undefined) return null;
	for (let rank = topOf(core, suit) + 1; rank <= spec.ranks; rank++) if (!core.lost.includes(`${suit} ${String(rank)}`)) return rank;
	return null;
}

/**
 * Whether a card would be lit if it were played now.
 *
 * @param core - The game.
 * @param card - The card id.
 * @returns True when the card is the next rank of its tower.
 *
 * @public
 */
export const isPlayable = (core: Readonly<TowerGame>, card: string): boolean => nextRank(core, suitOf(card)) === rankOf(card);

// The cards a seat cannot see: its own hand and the draw pile.
function unseenBy(core: Readonly<TowerGame>, seat: string): string[] {
	const seen = new Set([...core.lit, ...core.lost, ...core.seats.filter((other) => other !== seat).flatMap((other) => (core.hands[other] ?? []).map((slot) => slot.card))]);
	return deckOf(core.suits).filter((card) => !seen.has(card));
}

/**
 * The cards a slot of `seat` may be, from what the seat can see and what signals told it.
 *
 * @param core - The game.
 * @param seat - The seat.
 * @param index - The slot, from 0.
 * @returns The card ids; empty for a slot the seat does not hold.
 *
 * @public
 */
export function candidates(core: Readonly<TowerGame>, seat: string, index: number): string[] {
	const slot = core.hands[seat]?.[index];
	if (slot === undefined) return [];
	const know = slot.know;
	return unseenBy(core, seat).filter((card) => {
		const suit = suitOf(card);
		const rank = rankOf(card);
		return (know.suit === null || know.suit === suit) && (know.rank === null || know.rank === rank) && !know.notSuits.includes(suit) && !know.notRanks.includes(rank);
	});
}

/**
 * Whether the seat can tell for sure that its slot is playable now.
 *
 * @param core - The game.
 * @param seat - The seat.
 * @param index - The slot, from 0.
 * @returns True when every card the slot may be is playable.
 *
 * @public
 */
export function surePlayable(core: Readonly<TowerGame>, seat: string, index: number): boolean {
	const options = candidates(core, seat, index);
	return options.length > 0 && options.every((card) => isPlayable(core, card));
}

/**
 * What a signal names: a suit or a rank.
 *
 * @public
 */
export type About = { readonly suit: string } | { readonly rank: number };

/**
 * What a signal names: a suit (by name, any case) or a rank.
 *
 * @param core - The game.
 * @param text - What the caller wrote.
 * @returns The subject; undefined when the text is neither.
 *
 * @public
 */
export function parseAbout(core: Readonly<TowerGame>, text: string): About | undefined {
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

/**
 * The subject of a signal as text.
 *
 * @param about - The subject.
 * @returns The suit's name or the rank.
 *
 * @public
 */
export const aboutText = (about: About): string => ("suit" in about ? about.suit : String(about.rank));

const matches = (card: string, about: About): boolean => ("suit" in about ? suitOf(card) === about.suit : rankOf(card) === about.rank);

/**
 * The slots of `hand` a signal touches.
 *
 * @param hand - The hand.
 * @param about - The subject of the signal.
 * @returns The slot indexes, from 0.
 *
 * @public
 */
export const touchedBy = (hand: readonly Slot[], about: About): number[] => hand.flatMap((slot, index) => (matches(slot.card, about) ? [index] : []));

const nextSeat = (core: Readonly<TowerGame>, seat: string): string => core.seats[(core.seats.indexOf(seat) + 1) % core.seats.length] ?? seat;

const complete = (core: Readonly<TowerGame>): boolean => core.suits.every((suit) => nextRank(core, suit.name) === null);

// Why the game is over after an action, or null.
function endOf(core: Readonly<TowerGame>, rules: Rules): EndReason | null {
	if (rules.strikePenalty === 0 && core.strikes >= rules.maxStrikes) return "strikes";
	if (complete(core)) return "complete";
	if (core.seats.every((seat) => (core.hands[seat] ?? []).length === 0)) return "dark";
	if (core.dark !== null && core.dark >= core.seats.length) return "dark";
	return null;
}

// After an action: the end checks, the dark count (`bright`: the action lit a card or gave a signal) and the next seat (a seat without cards is skipped).
function advance(core: TowerGame, bright: boolean, rules: Rules): void {
	if (core.dark !== null) core.dark = bright ? 0 : core.dark + 1;
	core.over = endOf(core, rules);
	if (core.over !== null) return;
	let next = nextSeat(core, core.actor);
	while ((core.hands[next] ?? []).length === 0) next = nextSeat(core, next);
	core.actor = next;
}

function refill(core: TowerGame, seat: string, draw: Draw): void {
	if (core.pile <= 0) return;
	const card = draw(seat);
	if (card === undefined) return;
	core.pile -= 1;
	core.hands[seat]?.push(slotOf(card));
	// The dark count starts with the turn after the last draw.
	if (core.pile === 0) core.dark = -1;
}

/**
 * What a play or a discard did.
 *
 * @public
 */
export interface Outcome {
	/** The card that left the hand. */
	readonly card: string;
	/** Its slot, from 0. */
	readonly slot: number;
	/** True when the card was lit. */
	readonly lit: boolean;
	/** The card drawn after it, or null. */
	readonly drawn: string | null;
	/** True when the play completed a tower and a signal came back. */
	readonly refilled: boolean;
}

// The record line of a play.
function playLine(core: Readonly<TowerGame>, rules: Rules, { card, slot, lit, refilled }: Pick<Outcome, "card" | "slot" | "lit" | "refilled">): string {
	if (lit) return `played slot ${String(slot + 1)}: ${card}, lit${refilled ? " (tower complete, a signal back)" : ""}`;
	return `played slot ${String(slot + 1)}: ${card}, a misfire (lost, strike ${String(core.strikes)}${rules.strikePenalty > 0 ? "" : ` of ${String(rules.maxStrikes)}`})`;
}

/**
 * The actor plays its slot `index`: lit when it is the next rank of its tower, else lost with a strike.
 *
 * @param core - The game; it is changed.
 * @param index - The slot, from 0.
 * @param rules - The rules.
 * @param draw - Draws a card for a seat.
 * @returns What happened.
 * @throws RangeError when the actor has no such slot.
 *
 * @public
 */
export function play(core: TowerGame, index: number, rules: Rules, draw: Draw): Outcome {
	const seat = core.actor;
	const hand = core.hands[seat] ?? [];
	const [slot] = hand.splice(index, 1);
	if (slot === undefined) throw new RangeError(`hint-towers: ${seat} has no slot ${String(index + 1)}`);
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
	core.log.push({ turn: core.turn, seat, text: playLine(core, rules, { card: slot.card, slot: index, lit, refilled }) });
	advance(core, lit, rules);
	return { card: slot.card, slot: index, lit, drawn, refilled };
}

/**
 * The actor discards its slot `index`: the card is lost and a signal comes back.
 *
 * @param core - The game; it is changed.
 * @param index - The slot, from 0.
 * @param rules - The rules.
 * @param draw - Draws a card for a seat.
 * @returns What happened.
 * @throws RangeError when the actor has no such slot.
 *
 * @public
 */
export function discard(core: TowerGame, index: number, rules: Rules, draw: Draw): Outcome {
	const seat = core.actor;
	const hand = core.hands[seat] ?? [];
	const [slot] = hand.splice(index, 1);
	if (slot === undefined) throw new RangeError(`hint-towers: ${seat} has no slot ${String(index + 1)}`);
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

/**
 * The actor signals `to` about a suit or rank: every matching card learns it, every other card learns "not".
 *
 * @param core - The game; it is changed.
 * @param to - The seat that is told.
 * @param about - The subject.
 * @param rules - The rules.
 * @returns The slots touched, from 0.
 *
 * @public
 */
export function signal(core: TowerGame, to: string, about: About, rules: Rules): number[] {
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

/**
 * Why the actor may not signal `to` about `about` now.
 *
 * @param core - The game.
 * @param to - The seat that would be told.
 * @param about - The subject.
 * @returns The refusal code, or undefined.
 *
 * @public
 */
export function signalProblem(core: Readonly<TowerGame>, to: string, about: About): string | undefined {
	if (core.signals <= 0) return "NO_SIGNALS";
	if (to === core.actor) return "SELF_SIGNAL";
	const hand = core.hands[to];
	if (hand === undefined) return "UNKNOWN_SEAT";
	if (touchedBy(hand, about).length === 0) return "TOUCHES_NOTHING";
	return undefined;
}

/**
 * One action of a seat.
 *
 * @public
 */
export type Action = { readonly kind: "play" | "discard"; readonly slot: number } | { readonly kind: "signal"; readonly to: string; readonly about: About };

/**
 * Applies an action for the actor.
 *
 * @param core - The game; it is changed.
 * @param action - The action.
 * @param rules - The rules.
 * @param draw - Draws a card for a seat.
 *
 * @public
 */
export function apply(core: TowerGame, action: Action, rules: Rules, draw: Draw): void {
	if (action.kind === "signal") signal(core, action.to, action.about, rules);
	else if (action.kind === "play") play(core, action.slot, rules, draw);
	else discard(core, action.slot, rules, draw);
}
