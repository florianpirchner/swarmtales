// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";
import { SuitSpec } from "./model.ts";

const Seat = Type.Object({ resident: Type.String() });
const SeatCard = Type.Object({ resident: Type.String(), card: Type.String({ description: "A card id, `<Suit> <rank>`." }) });

/**
 * What a game mechanic does with the card table: deal, read and change the private hands.
 *
 * @example
 * ```ts
 * const deal = ctx.call(CardTableService, "deal", { cards: 5 });
 * ```
 *
 * @public
 */
export const CardTableService = defineService({
	name: "card-table",
	summary: "The deck, the seats and their private hands: a seeded deal, and taking a card from or giving one back to a hand.",
	methods: {
		seats: { kind: "query", summary: "The seats in table order (the residents who get cards).", input: Type.Object({}), output: Type.Array(Type.String()) },
		suits: { kind: "query", summary: "The deck's suits in order, with their rank counts.", input: Type.Object({}), output: Type.Array(SuitSpec) },
		hand: { kind: "query", summary: "A seat's hand, sorted by suit and rank; empty for a resident without a seat.", input: Seat, output: Type.Array(Type.String()) },
		holds: { kind: "query", summary: "Whether the seat holds the card.", input: SeatCard, output: Type.Boolean() },
		deal: {
			kind: "command",
			summary: "Collects every card, shuffles the whole deck with the run's seeded stream (label: the deal's number) and deals `cards` to each seat, one at a time in seat order. Returns the deal's number, from 1; writes `cards_dealt` (audience human).",
			input: Type.Object({ cards: Type.Integer({ minimum: 0 }) }),
			output: Type.Integer(),
		},
		stock: { kind: "query", summary: "The draw pile: the cards not in any hand, top card first (never shown to a resident; a reference listener may read it).", input: Type.Object({}), output: Type.Array(Type.String()) },
		draw: {
			kind: "command",
			summary: "Moves the top card of the draw pile into the seat's hand and returns it; null (nothing changes) when the pile is empty.",
			input: Seat,
			output: Type.Union([Type.String(), Type.Null()]),
		},
		take: { kind: "command", summary: "Removes the card from the seat's hand; false (nothing changes) when the seat does not hold it.", input: SeatCard, output: Type.Boolean() },
		give: { kind: "command", summary: "Puts a card (back) into the seat's hand.", input: SeatCard, output: Type.Null() },
	},
});
