// SPDX-License-Identifier: Apache-2.0
/**
 * The card table's rules as pure functions (shared with the games that use it and their reference
 * listeners) and the mechanic's state. A card is its id `"<Suit> <rank>"`, for example `"Ember 7"`:
 * readable for a model and stable in logs.
 */
import { Type, type Static } from "typebox";

/**
 * The schema of one suit of the deck.
 *
 * @public
 */
export const SuitSpec = Type.Object({
	name: Type.String({ minLength: 1, description: "The suit's name; its first letter must differ from the other suits' (the short form `E7`)." }),
	ranks: Type.Integer({ minimum: 1, maximum: 20, description: "The suit has the ranks 1 to this number." }),
});
/**
 * One suit of the deck: its name and how many ranks it has.
 *
 * @public
 */
export type SuitSpec = Static<typeof SuitSpec>;

/**
 * A card, taken apart.
 *
 * @public
 */
export interface Card {
	/** The suit's name. */
	readonly suit: string;
	/** The rank, from 1. */
	readonly rank: number;
}

/**
 * The id of a card.
 *
 * @param card - The card.
 * @returns `<Suit> <rank>`.
 *
 * @public
 */
export const cardId = (card: Card): string => `${card.suit} ${String(card.rank)}`;

/**
 * Every card of the deck, suit by suit in the given order, ranks ascending.
 *
 * @param suits - The deck's suits.
 * @returns The card ids.
 *
 * @public
 */
export function deckOf(suits: readonly SuitSpec[]): readonly string[] {
	return suits.flatMap((suit) => Array.from({ length: suit.ranks }, (_, index) => cardId({ suit: suit.name, rank: index + 1 })));
}

/**
 * Why a deck specification is unusable, or undefined.
 *
 * @param suits - The deck's suits.
 * @returns The problem as a phrase, or undefined for a usable deck.
 *
 * @public
 */
export function deckProblem(suits: readonly SuitSpec[]): string | undefined {
	if (suits.length === 0) return "the deck needs at least one suit";
	const names = suits.map((suit) => suit.name.toLowerCase());
	if (new Set(names).size !== names.length) return "two suits share a name";
	const initials = names.map((name) => name[0]);
	if (new Set(initials).size !== initials.length) return "two suits share a first letter";
	if (suits.some((suit) => /\s|\d/.test(suit.name))) return "a suit name may hold no space or digit";
	return undefined;
}

/**
 * The card an id names, or undefined for a malformed id.
 *
 * @param id - A card id.
 * @returns The card, or undefined.
 *
 * @public
 */
export function cardOf(id: string): Card | undefined {
	const match = /^(\S+) (\d+)$/.exec(id);
	if (match === null) return undefined;
	const [, suit, rank] = match;
	return suit === undefined || rank === undefined ? undefined : { suit, rank: Number(rank) };
}

/**
 * The suit of a card id.
 *
 * @param id - A card id.
 * @returns The suit's name; an empty string for a malformed id.
 *
 * @public
 */
export const suitOf = (id: string): string => cardOf(id)?.suit ?? "";

/**
 * The rank of a card id.
 *
 * @param id - A card id.
 * @returns The rank; 0 for a malformed id.
 *
 * @public
 */
export const rankOf = (id: string): number => cardOf(id)?.rank ?? 0;

/**
 * The canonical id of a card a model wrote, or undefined: "Ember 7", "ember7", "E7", "e 7",
 * "7 Ember", "7 of Ember" and "Ember-7" all name `Ember 7`. Only cards of the deck are found.
 *
 * @param text - What the model wrote.
 * @param suits - The deck's suits.
 * @returns The card id, or undefined when the text names no card of the deck.
 *
 * @public
 */
export function parseCard(text: string, suits: readonly SuitSpec[]): string | undefined {
	const clean = text.trim().toLowerCase().replace(/\bof\b/g, " ").replace(/[-_,.:]/g, " ").replace(/\s+/g, " ").trim();
	const letters = /[a-z]+/.exec(clean)?.[0];
	const digits = /\d+/.exec(clean)?.[0];
	if (letters === undefined || digits === undefined || clean.replace(letters, "").replace(digits, "").trim() !== "") return undefined;
	const suit = suits.find((spec) => spec.name.toLowerCase() === letters || (letters.length === 1 && spec.name.toLowerCase().startsWith(letters)));
	const rank = Number(digits);
	if (suit === undefined || rank < 1 || rank > suit.ranks) return undefined;
	return cardId({ suit: suit.name, rank });
}

/**
 * A hand sorted the deck's way: suit in deck order, then rank ascending.
 *
 * @param cards - The card ids.
 * @param suits - The deck's suits.
 * @returns A sorted copy.
 *
 * @public
 */
export function sortHand(cards: readonly string[], suits: readonly SuitSpec[]): string[] {
	const order = (id: string): number => {
		const card = cardOf(id);
		const index = suits.findIndex((suit) => suit.name === card?.suit);
		return index * 100 + (card?.rank ?? 0);
	};
	return [...cards].sort((a, b) => order(a) - order(b));
}

/**
 * A hand as text, one group per suit: `Ash: 2 7 9 · Ember: 4`; "(no cards)" when empty.
 *
 * @param cards - The card ids.
 * @param suits - The deck's suits.
 * @returns The text.
 *
 * @public
 */
export function renderHand(cards: readonly string[], suits: readonly SuitSpec[]): string {
	const groups = suits.flatMap((suit) => {
		const ranks = sortHand(cards, suits)
			.filter((id) => suitOf(id) === suit.name)
			.map((id) => String(rankOf(id)));
		return ranks.length === 0 ? [] : [`${suit.name}: ${ranks.join(" ")}`];
	});
	return groups.length === 0 ? "(no cards)" : groups.join(" · ");
}

/**
 * The state of the card table.
 *
 * @public
 */
export interface TableState {
	/** Each seat's hand, sorted the deck's way. */
	hands: Record<string, string[]>;
	/** The cards not dealt in the last deal, top card first. */
	stock: string[];
	/** Deals so far; part of each deal's random label. */
	deals: number;
}

/**
 * The schema of the card table's snapshot slice.
 *
 * @public
 */
export const TableSlice = Type.Object(
	{
		hands: Type.Record(Type.String(), Type.Array(Type.String()), { description: "Each seat's hand, as card ids." }),
		stock: Type.Array(Type.String(), { description: "The draw pile, top card first." }),
		deals: Type.Integer({ description: "Deals so far." }),
	},
	{ description: "The state of the card table." },
);
