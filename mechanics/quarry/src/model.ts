// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of Quarry as pure functions (in `rules.ts`: deck, pass order, tableau score, the greedy reference) and the mechanic's state. */
import { Type, type Static } from "typebox";
import { Card, countsOf, RESOURCES } from "./rules.ts";

export { Breakdown, Card, countsOf, deckOf, gainOf, greedyPick, greedyTable, Kind, laneOf, majorityOf, packsOf, receiverOf, RESOURCES, scoreTable, setScore, type Resource, type Rules } from "./rules.ts";

/**
 * The schema of one pick, with its reference values for the human: what it added, what the best card would have added, and whether it took the receiver's best card.
 *
 * @public
 */
export const PickRecord = Type.Object({
	game: Type.Integer(),
	pack: Type.Integer(),
	step: Type.Integer(),
	resident: Type.String(),
	card: Card,
	burned: Type.Optional(Card),
	packSize: Type.Integer({ description: "Cards in the pack before the pick." }),
	gain: Type.Number({ description: "What the card added to the own set score." }),
	best: Type.Number({ description: "The most any card of the pack would have added." }),
	regret: Type.Number({ description: "best - gain: set points left on the table by this pick (0 = greedy)." }),
	denied: Type.Boolean({ description: "The card was the receiver's best and not the picker's: a hate pick." }),
	missed: Type.Boolean({ description: "No pick in time: the first card of the pack was taken." }),
	returnable: Type.Optional(Type.Boolean({ description: "With a burn: the pack still had enough cards to come back to the burner, so the burned card could have come back to it (P126)." })),
});
/**
 * One pick, with its reference values for the human.
 *
 * @public
 */
export type PickRecord = Static<typeof PickRecord>;

/**
 * The schema of one seat's game against the greedy reference.
 *
 * @public
 */
export const SeatReference = Type.Object({
	score: Type.Number(),
	greedy: Type.Number({ description: "The seat's score when all four seats draft greedily on the same deal." }),
	regret: Type.Number({ description: "Sum of the picks' regret." }),
	hatePicks: Type.Integer(),
	burns: Type.Integer(),
	missed: Type.Integer(),
	lane: Type.String({ description: "The seat's top resource; tied top resources joined with +." }),
	focus: Type.Number({ description: "The top resource's share of the seat's resource cards." }),
});

/**
 * The schema of a game against the greedy reference: every seat, the shared lanes and the table's efficiency.
 *
 * @public
 */
export const Reference = Type.Object({
	seats: Type.Record(Type.String(), SeatReference),
	/** How many seats share a top resource with another seat, ties counting (0: four different lanes). */
	sharedLanes: Type.Integer(),
	/** The table's total score over the greedy table's total. */
	efficiency: Type.Number(),
});
/**
 * A game against the greedy reference.
 *
 * @public
 */
export type Reference = Static<typeof Reference>;

/**
 * The state of the draft.
 *
 * @public
 */
export interface DraftState {
	seats: string[];
	/** The running (or last) game, from 1; 0 before the first. */
	game: number;
	/** The pack round of the running game, from 1. */
	packRound: number;
	/** The pick of the running pack round, from 1. */
	step: number;
	/** The tick the pick opened (its deadline counts from it). */
	opened: number;
	/** The game's deck in deal order (the greedy reference replays it). */
	deck: Card[];
	/** The pack in front of each seat. */
	packs: Record<string, Card[]>;
	/** Who passed each seat its pack (empty in the first pick of a pack round). */
	from: Record<string, string>;
	hands: Record<string, Card[]>;
	burned: Card[];
	burns: Record<string, number>;
	owing: string[];
	told: string[];
	briefed: string[];
	picks: PickRecord[];
	scores: Record<string, number>;
	gameScores: Record<string, number>;
	running: boolean;
	finished: boolean;
	held: boolean;
	due: boolean;
}

const Cards = Type.Array(Card);

/**
 * The schema of the draft's snapshot slice.
 *
 * @public
 */
export const DraftSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	packRound: Type.Integer(),
	step: Type.Integer(),
	opened: Type.Integer(),
	deck: Cards,
	packs: Type.Record(Type.String(), Cards),
	from: Type.Record(Type.String(), Type.String()),
	hands: Type.Record(Type.String(), Cards),
	burned: Cards,
	burns: Type.Record(Type.String(), Type.Integer()),
	owing: Type.Array(Type.String()),
	told: Type.Array(Type.String()),
	briefed: Type.Array(Type.String()),
	picks: Type.Array(PickRecord),
	scores: Type.Record(Type.String(), Type.Number()),
	gameScores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
});

const copyCards = (cards: readonly Card[]): Card[] => cards.map((card) => ({ ...card }));
const copyRecord = (record: Readonly<Record<string, readonly Card[]>>): Record<string, Card[]> => Object.fromEntries(Object.entries(record).map(([key, cards]) => [key, copyCards(cards)]));

/**
 * A deep copy of the state, for the snapshot both ways.
 *
 * @param state - The state, or a saved slice.
 * @returns The copy.
 *
 * @public
 */
export function copyState(state: Static<typeof DraftSlice>): DraftState {
	return {
		...state,
		seats: [...state.seats],
		deck: copyCards(state.deck),
		packs: copyRecord(state.packs),
		from: { ...state.from },
		hands: copyRecord(state.hands),
		burned: copyCards(state.burned),
		burns: { ...state.burns },
		owing: [...state.owing],
		told: [...state.told],
		briefed: [...state.briefed],
		picks: state.picks.map((pick) => ({ ...pick, card: { ...pick.card }, ...(pick.burned === undefined ? {} : { burned: { ...pick.burned } }) })),
		scores: { ...state.scores },
		gameScores: { ...state.gameScores },
	};
}

/**
 * A line of cards: `A3 amber, L1 lodestone`.
 *
 * @param cards - The cards.
 * @returns The line, or `nothing`.
 *
 * @public
 */
export function cardsLine(cards: readonly Card[]): string {
	return cards.length === 0 ? "nothing" : cards.map((card) => `${card.id} ${card.kind}`).join(", ");
}

/**
 * A quarry by kind: `amber 3, basalt 0, cobalt 1, jade 0, lodestone 1`.
 *
 * @param hand - The quarry's cards.
 * @returns The line.
 *
 * @public
 */
export function quarryLine(hand: readonly Card[]): string {
	const { counts, wilds } = countsOf(hand);
	return [...RESOURCES.map((kind) => `${kind} ${String(counts[kind])}`), `lodestone ${String(wilds)}`].join(", ");
}
