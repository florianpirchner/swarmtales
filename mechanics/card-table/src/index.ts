// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `card-table` mechanic: a deck of suited cards (`suits`, each with ranks 1..n), the seats that
 * play, a seeded shuffle and deal, and one private hand per seat. A resident sees only its own hand
 * (`viewHand`, and whatever the game mechanic shows it); the event `cards_dealt` with every hand is
 * for humans only. It knows no game: who plays which card, follow rules, tricks and scores belong to
 * the game mechanic, which changes the hands through `CardTableService` (`take`, `give`).
 * The draw pile (`stock`, `draw`) is the shuffled rest of the deck after a deal, top card first.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineHead, defineMechanic, refuse, reply, type CtxOf } from "@swarmtales/sdk";
import { CardTableEvents } from "./events.ts";
import { deckOf, deckProblem, renderHand, sortHand, SuitSpec, TableSlice, type TableState } from "./model.ts";
import { CardTableService } from "./service.ts";

export { CardTableEvents } from "./events.ts";
export { cardId, cardOf, deckOf, deckProblem, parseCard, rankOf, renderHand, sortHand, suitOf, SuitSpec, TableSlice, type Card, type TableState } from "./model.ts";
export { CardTableService } from "./service.ts";

// The default deck: five suits of different lengths (40 cards), so counting a suit is a skill.
const DEFAULT_SUITS = [
	{ name: "Ash", ranks: 10 },
	{ name: "Brine", ranks: 9 },
	{ name: "Cinder", ranks: 8 },
	{ name: "Dust", ranks: 7 },
	{ name: "Ember", ranks: 6 },
];

const options = Type.Object({
	suits: Type.Array(SuitSpec, { minItems: 1, default: DEFAULT_SUITS, description: "The deck: each suit has the ranks 1 to `ranks`. Suit names need distinct first letters." }),
	seats: Type.Optional(Type.Array(Type.String(), { minItems: 1, description: "The residents who get cards, in table order (default: every resident in roster order)." })),
});

const copyHands = (hands: Readonly<Record<string, readonly string[]>>): Record<string, string[]> => Object.fromEntries(Object.entries(hands).map(([seat, hand]) => [seat, [...hand]]));
const copyState = (state: Readonly<TableState>): TableState => ({ hands: copyHands(state.hands), stock: [...state.stock], deals: state.deals });

/**
 * The head of the card table: everything that can be read without running a handler.
 *
 * @public
 */
export const cardTableHead = defineHead({
	id: "card-table",
	package: "@swarmtales/mechanic-card-table",
	summary: "A deck of suited cards, a seeded deal and a private hand per seat.",
	options,
	state: TableSlice,
	start: (setup): TableState => {
		const problem = deckProblem(setup.options.suits);
		if (problem !== undefined) throw new RangeError(`card-table: ${problem}`);
		const seats = setup.options.seats ?? [...setup.residents];
		const unknown = seats.find((seat) => !setup.residents.includes(seat));
		if (unknown !== undefined) throw new RangeError(`card-table: ${unknown} is not a resident of the run`);
		if (new Set(seats).size !== seats.length) throw new RangeError("card-table: a resident may hold one seat only");
		return { hands: Object.fromEntries(seats.map((seat) => [seat, []])), stock: [...deckOf(setup.options.suits)], deals: 0 };
	},
	// A snapshot file sorts the keys of `hands`; the seats come back in table order, the order the deal and `seats` read (M6-32).
	snapshot: { save: (state: TableState) => copyState(state), load: (data, setup): TableState => copyState({ ...data, hands: Object.fromEntries((setup.options.seats ?? setup.residents).map((seat) => [seat, data.hands[seat] ?? []])) }) },
	events: CardTableEvents.events,
	audiences: { cards_dealt: ["human"] },
	provides: [CardTableService],
	prompts: { "card-table/tools/viewHand": [] },
	tools: { viewHand: { description: "card-table/tools/viewHand", params: Type.Object({}), for: ["resident"] } },
});

type Ctx = CtxOf<typeof cardTableHead>;

const seatsOf = (ctx: Ctx): string[] => Object.keys(ctx.state.hands);

function deal(ctx: Ctx, cards: number): number {
	const state = ctx.state;
	const seats = seatsOf(ctx);
	const deck = deckOf(ctx.options.suits);
	if (cards * seats.length > deck.length) throw new RangeError(`card-table: ${String(cards)} cards for ${String(seats.length)} seats need more than the deck's ${String(deck.length)}`);
	state.deals += 1;
	const shuffled = ctx.rng("card-table", "deal", state.deals).shuffle(deck);
	const hands: Record<string, string[]> = Object.fromEntries(seats.map((seat) => [seat, []]));
	for (let index = 0; index < cards * seats.length; index++) {
		const seat = seats[index % seats.length];
		const card = shuffled[index];
		if (seat !== undefined && card !== undefined) hands[seat]?.push(card);
	}
	state.hands = Object.fromEntries(seats.map((seat) => [seat, sortHand(hands[seat] ?? [], ctx.options.suits)]));
	state.stock = shuffled.slice(cards * seats.length);
	ctx.emit("cards_dealt", { deal: state.deals, cards, hands: copyHands(state.hands) });
	return state.deals;
}

// Puts a card into a seat's hand, sorted; a resident without a seat is a mistake of the calling mechanic.
function put(ctx: Ctx, resident: string, card: string): void {
	const hand = ctx.state.hands[resident];
	if (hand === undefined) throw new RangeError(`card-table: ${resident} has no seat`);
	ctx.state.hands[resident] = sortHand([...hand, card], ctx.options.suits);
}

/**
 * The card table: a deck, a seeded deal and a private hand per seat, for a game mechanic to play on.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "cards", residents: 4, mechanics: [cardTable({ suits: [{ name: "Ash", ranks: 10 }] })], end: { ticks: 20 } });
 * ```
 *
 * @public
 */
export const cardTable = defineMechanic(cardTableHead, {
	tools: {
		viewHand: {
			run: (_params, ctx) => {
				const hand = ctx.resident === undefined ? undefined : ctx.state.hands[ctx.resident];
				if (hand === undefined) return refuse("NO_SEAT", "You have no seat at the card table.");
				return reply(`Your hand: ${renderHand(hand, ctx.options.suits)}`);
			},
			// Any seat may look at its hand at any time.
			sample: (ctx) => (ctx.resident !== undefined && ctx.state.hands[ctx.resident] !== undefined ? {} : undefined),
		},
	},
	services: {
		"card-table": {
			seats: (_input, ctx) => seatsOf(ctx),
			suits: (_input, ctx) => ctx.options.suits.map((suit) => ({ ...suit })),
			hand: ({ resident }, ctx) => [...(ctx.state.hands[resident] ?? [])],
			holds: ({ resident, card }, ctx) => ctx.state.hands[resident]?.includes(card) ?? false,
			deal: ({ cards }, ctx) => deal(ctx, cards),
			stock: (_input, ctx) => [...ctx.state.stock],
			draw: ({ resident }, ctx) => {
				if (ctx.state.hands[resident] === undefined) throw new RangeError(`card-table: ${resident} has no seat`);
				const card = ctx.state.stock.shift();
				if (card === undefined) return null;
				put(ctx, resident, card);
				return card;
			},
			take: ({ resident, card }, ctx) => {
				const hand = ctx.state.hands[resident];
				const index = hand?.indexOf(card) ?? -1;
				if (hand === undefined || index < 0) return false;
				hand.splice(index, 1);
				return true;
			},
			give: ({ resident, card }, ctx) => {
				put(ctx, resident, card);
				return null;
			},
		},
	},
	facts: {
		handSizes: { output: Type.Record(Type.String(), Type.Integer()), compute: (view) => Object.fromEntries(Object.entries(view.state.hands).map(([seat, hand]) => [seat, hand.length])) },
	},
});
