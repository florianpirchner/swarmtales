/**
 * The `card-table` mechanic: a deck of suited cards (`suits`, each with ranks 1..n), the seats that
 * play, a seeded shuffle and deal, and one private hand per seat. A resident sees only its own hand
 * (`viewHand`, and whatever the game mechanic shows it); the event `cards_dealt` with every hand is
 * for humans only. It knows no game: who plays which card, follow rules, tricks and scores belong to
 * the game mechanic, which changes the hands through `CardTableApi` (`take`, `give`).
 * The draw pile (`stock`, `draw`) is the shuffled rest of the deck after a deal, top card first.
 * Reused by every card game of docs/ideas/game-roadmap.md (trick-taking, hint towers, convoy).
 */
import { Type } from "typebox";
import type { ContextOf, ToolContextOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { CardTableApi } from "./api.ts";
import { CardTableEvents } from "./events.ts";
import { deckOf, deckProblem, renderHand, sortHand, SuitSpec, TableSlice, type TableState } from "./model.ts";

export { CardTableApi } from "./api.ts";
export { deckOf, parseCard, rankOf, renderHand, suitOf } from "./model.ts";

/** The default deck: five suits of different lengths (40 cards), so counting a suit is a skill. */
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

const head = defineHead({
	id: "card-table",
	summary: "A deck of suited cards, a seeded deal and a private hand per seat.",
	options,
	state: (setup): TableState => {
		const problem = deckProblem(setup.options.suits);
		if (problem !== undefined) throw new Error(`card-table: ${problem}`);
		const seats = setup.options.seats ?? [...setup.residents];
		const unknown = seats.find((seat) => !setup.residents.includes(seat));
		if (unknown !== undefined) throw new Error(`card-table: ${unknown} is not a resident of the run`);
		if (new Set(seats).size !== seats.length) throw new Error("card-table: a resident may hold one seat only");
		return { hands: Object.fromEntries(seats.map((seat) => [seat, []])), stock: [...deckOf(setup.options.suits)], deals: 0 };
	},
	events: CardTableEvents.events,
	audiences: { cards_dealt: ["human"] },
	provides: [CardTableApi],
	prompts: { "card-table/tools/viewHand": [] },
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;

const seatsOf = (ctx: Ctx): string[] => Object.keys(ctx.state.hands);

function deal(ctx: Ctx, cards: number): number {
	const state = ctx.state;
	const seats = seatsOf(ctx);
	const deck = deckOf(ctx.options.suits);
	if (cards * seats.length > deck.length) throw new Error(`card-table: ${String(cards)} cards for ${String(seats.length)} seats need more than the deck's ${String(deck.length)}`);
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
	ctx.emit("cards_dealt", { deal: state.deals, cards, hands: Object.fromEntries(seats.map((seat) => [seat, [...(state.hands[seat] ?? [])]])) });
	return state.deals;
}

export const cardTable = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewHand",
			description: "card-table/tools/viewHand",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => {
				const hand = ctx.resident === undefined ? undefined : ctx.state.hands[ctx.resident];
				if (hand === undefined) return refuse("NO_SEAT", "You have no seat at the card table.");
				return reply(`Your hand: ${renderHand(hand, ctx.options.suits)}`);
			},
		}),
	],
	services: [
		kit.provide(CardTableApi, {
			seats: (_input, ctx) => seatsOf(ctx),
			suits: (_input, ctx) => ctx.options.suits.map((suit) => ({ ...suit })),
			hand: ({ resident }, ctx) => [...(ctx.state.hands[resident] ?? [])],
			holds: ({ resident, card }, ctx) => ctx.state.hands[resident]?.includes(card) ?? false,
			deal: ({ cards }, ctx) => deal(ctx, cards),
			stock: (_input, ctx) => [...ctx.state.stock],
			draw: ({ resident }, ctx) => {
				const hand = ctx.state.hands[resident];
				if (hand === undefined) throw new Error(`card-table: ${resident} has no seat`);
				const card = ctx.state.stock.shift();
				if (card === undefined) return null;
				ctx.state.hands[resident] = sortHand([...hand, card], ctx.options.suits);
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
				const hand = ctx.state.hands[resident];
				if (hand === undefined) throw new Error(`card-table: ${resident} has no seat`);
				ctx.state.hands[resident] = sortHand([...hand, card], ctx.options.suits);
				return null;
			},
		}),
	],
	facts: {
		handSizes: kit.fact(Type.Record(Type.String(), Type.Integer()), (view) => Object.fromEntries(Object.entries(view.state.hands).map(([seat, hand]) => [seat, hand.length]))),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: TableSlice,
		save: (state) => ({ hands: Object.fromEntries(Object.entries(state.hands).map(([seat, hand]) => [seat, [...hand]])), stock: [...state.stock], deals: state.deals }),
		load: (data) => ({ hands: Object.fromEntries(Object.entries(data.hands).map(([seat, hand]) => [seat, [...hand]])), stock: [...data.stock], deals: data.deals }),
	}),
}));
