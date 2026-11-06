/** The rules of Quarry as pure functions (deck, pass order, tableau score, the greedy reference) and the mechanic's state. */
import { Type, type Static } from "typebox";

/** The four resources and the wild ore. */
export const RESOURCES = ["amber", "basalt", "cobalt", "jade"] as const;
export const Kind = Type.Union([Type.Literal("amber"), Type.Literal("basalt"), Type.Literal("cobalt"), Type.Literal("jade"), Type.Literal("lodestone")]);
export type Kind = Static<typeof Kind>;
export type Resource = (typeof RESOURCES)[number];

const LETTER: Readonly<Record<Kind, string>> = { amber: "A", basalt: "B", cobalt: "C", jade: "J", lodestone: "L" };

export const Card = Type.Object({ id: Type.String(), kind: Kind });
export type Card = Static<typeof Card>;

export interface Rules {
	/** Points for the single seat with the most cards of a resource (wilds do not count; a tie scores nothing). */
	readonly majorityBonus: number;
	/** Points a burn costs. */
	readonly burnCost: number;
	/** Points for the places of a game by the score before this bonus: first, second, ...; a tie gets the better place's bonus. Empty: none. */
	readonly placeBonus: readonly number[];
}

/**
 * The deck of one game: `size` cards, `wilds` of them lodestone, the rest split as evenly as possible
 * over the four resources (the first resources get the remainder, so the counts differ and counting
 * cards pays). Ids are the kind's letter and a number within the kind (`A1`, `L2`).
 */
export function deckOf(size: number, wilds: number): Card[] {
	const wild = Math.min(wilds, size);
	const rest = size - wild;
	const cards: Card[] = [];
	RESOURCES.forEach((kind, index) => {
		const count = Math.floor(rest / RESOURCES.length) + (index < rest % RESOURCES.length ? 1 : 0);
		for (let n = 1; n <= count; n++) cards.push({ id: `${LETTER[kind]}${String(n)}`, kind });
	});
	for (let n = 1; n <= wild; n++) cards.push({ id: `L${String(n)}`, kind: "lodestone" });
	return cards;
}

/** How many cards of each resource a quarry holds, and its wilds. */
export function countsOf(hand: readonly Card[]): { readonly counts: Record<Resource, number>; readonly wilds: number } {
	const counts: Record<Resource, number> = { amber: 0, basalt: 0, cobalt: 0, jade: 0 };
	let wilds = 0;
	for (const card of hand) {
		if (card.kind === "lodestone") wilds += 1;
		else counts[card.kind] += 1;
	}
	return { counts, wilds };
}

/**
 * The set score of a quarry: each resource scores the square of its cards; a set may take at most one
 * lodestone, and the lodestones go to the biggest sets (where one more card is worth most). A fifth
 * lodestone is worth nothing.
 */
export function setScore(hand: readonly Card[]): number {
	const { counts, wilds } = countsOf(hand);
	const sizes = RESOURCES.map((kind) => counts[kind]).sort((a, b) => b - a);
	return sizes.reduce((sum, size, index) => sum + (index < wilds ? (size + 1) ** 2 : size ** 2), 0);
}

/** The seat with strictly the most cards of `kind`, or undefined (nobody holds one, or a tie). */
export function majorityOf(hands: Readonly<Record<string, readonly Card[]>>, kind: Resource): string | undefined {
	let best: string | undefined;
	let most = 0;
	let tied = false;
	for (const [seat, hand] of Object.entries(hands)) {
		const count = countsOf(hand).counts[kind];
		if (count > most) {
			best = seat;
			most = count;
			tied = false;
		} else if (count === most && count > 0) tied = true;
	}
	return tied ? undefined : best;
}

export const Breakdown = Type.Object({
	sets: Type.Number({ description: "The set score (squares, lodestones on the biggest sets)." }),
	majorities: Type.Array(Kind, { description: "The resources this seat holds strictly the most of." }),
	bonus: Type.Number(),
	burns: Type.Integer(),
	place: Type.Integer({ description: "The place by the score before the place bonus, from 1; tied seats share the better place." }),
	placeBonus: Type.Number(),
	total: Type.Number(),
});
export type Breakdown = Static<typeof Breakdown>;

/**
 * The final score of every seat: sets, plus the majority bonuses, minus the burns, plus the place bonus
 * of the seat's place by that score (the place bonus is what makes denial pay: a burn costs the burner
 * nothing it would have kept only when the pack cannot come back to it, and it pays only against rivals).
 */
export function scoreTable(hands: Readonly<Record<string, readonly Card[]>>, burns: Readonly<Record<string, number>>, rules: Rules): Record<string, Breakdown> {
	const leaders = new Map(RESOURCES.map((kind) => [kind, majorityOf(hands, kind)]));
	const base = Object.entries(hands).map(([seat, hand]) => {
		const sets = setScore(hand);
		const majorities = RESOURCES.filter((kind) => leaders.get(kind) === seat);
		const bonus = majorities.length * rules.majorityBonus;
		const burned = burns[seat] ?? 0;
		return { seat, sets, majorities, bonus, burns: burned, subtotal: sets + bonus - burned * rules.burnCost };
	});
	return Object.fromEntries(
		base.map(({ seat, subtotal, ...rest }) => {
			const place = 1 + base.filter((other) => other.subtotal > subtotal).length;
			const placeBonus = rules.placeBonus[place - 1] ?? 0;
			return [seat, { ...rest, place, placeBonus, total: subtotal + placeBonus }];
		}),
	);
}

/** What one more card adds to the set score of `hand`. */
export function gainOf(hand: readonly Card[], card: Card): number {
	return setScore([...hand, card]) - setScore(hand);
}

/** The seat a pack goes to after a pick: to the next seat in odd pack rounds, to the previous one in even rounds. */
export function receiverOf(seats: readonly string[], seat: string, packRound: number): string {
	const index = seats.indexOf(seat);
	const step = packRound % 2 === 1 ? 1 : -1;
	return seats[(index + step + seats.length) % seats.length] ?? seat;
}

/** The greedy pick: the card that adds most to the own set score; ties go to the first card of the pack. */
export function greedyPick(hand: readonly Card[], pack: readonly Card[]): Card | undefined {
	let best: Card | undefined;
	let most = -Infinity;
	for (const card of pack) {
		const gain = gainOf(hand, card);
		if (gain > most) {
			best = card;
			most = gain;
		}
	}
	return best;
}

/** Splits a game's deck into its packs: `packs[round - 1][seat index]`. */
export function packsOf(deck: readonly Card[], seats: number, packRounds: number, packSize: number): Card[][][] {
	const packs: Card[][][] = [];
	for (let round = 0; round < packRounds; round++) {
		const row: Card[][] = [];
		for (let seat = 0; seat < seats; seat++) {
			const start = (round * seats + seat) * packSize;
			row.push(deck.slice(start, start + packSize).map((card) => ({ ...card })));
		}
		packs.push(row);
	}
	return packs;
}

/**
 * The greedy table: the same deal played by four greedy seats (no burns), the baseline a seat's score is
 * compared with. A seat that drafts better than greedy beats it; reading signals and staying out of a
 * neighbour's lane is how.
 */
export function greedyTable(deck: readonly Card[], seats: readonly string[], packRounds: number, packSize: number, rules: Rules): Record<string, number> {
	const hands: Record<string, Card[]> = Object.fromEntries(seats.map((seat) => [seat, []]));
	for (const [index, row] of packsOf(deck, seats.length, packRounds, packSize).entries()) {
		const round = index + 1;
		let held: Record<string, Card[]> = Object.fromEntries(seats.map((seat, k) => [seat, row[k] ?? []]));
		while (Object.values(held).some((pack) => pack.length > 0)) {
			const next: Record<string, Card[]> = {};
			for (const seat of seats) {
				const pack = held[seat] ?? [];
				const hand = hands[seat] ?? [];
				const card = greedyPick(hand, pack);
				const left = card === undefined ? pack : pack.filter((other) => other.id !== card.id);
				if (card !== undefined) hand.push(card);
				next[receiverOf(seats, seat, round)] = left;
			}
			held = next;
		}
	}
	const table = scoreTable(hands, {}, rules);
	return Object.fromEntries(seats.map((seat) => [seat, table[seat]?.total ?? 0]));
}

/**
 * The top resources of a quarry (several on a tie, so a lane is never picked by the order of the list)
 * and the top count's share of the quarry's resource cards (1 = a single lane).
 */
export function laneOf(hand: readonly Card[]): { readonly lanes: readonly Resource[]; readonly focus: number } {
	const { counts } = countsOf(hand);
	const total = RESOURCES.reduce((sum, kind) => sum + counts[kind], 0);
	if (total === 0) return { lanes: [], focus: 0 };
	const most = Math.max(...RESOURCES.map((kind) => counts[kind]));
	return { lanes: RESOURCES.filter((kind) => counts[kind] === most), focus: Math.round((most / total) * 1000) / 1000 };
}

/** One pick, with its reference values for the human: what it added, what the best card would have added, and whether it took the receiver's best card. */
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
});
export type PickRecord = Static<typeof PickRecord>;

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

export const Reference = Type.Object({
	seats: Type.Record(Type.String(), SeatReference),
	/** How many seats share a top resource with another seat, ties counting (0: four different lanes). */
	sharedLanes: Type.Integer(),
	/** The table's total score over the greedy table's total. */
	efficiency: Type.Number(),
});
export type Reference = Static<typeof Reference>;

export interface DraftState {
	seats: string[];
	/** The running (or last) game, from 1; 0 before the first. */
	game: number;
	/** The pack round of the running game, from 1. */
	packRound: number;
	/** The pick of the running pack round, from 1. */
	step: number;
	/** The minute the pick opened (its deadline counts from it). */
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

/** A deep copy of the state, for the snapshot both ways. */
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

/** A line of cards: `A3 amber, L1 lodestone`. */
export function cardsLine(cards: readonly Card[]): string {
	return cards.length === 0 ? "nothing" : cards.map((card) => `${card.id} ${card.kind}`).join(", ");
}

/** A quarry by kind: `amber 3, basalt 0, cobalt 1, jade 0, lodestone 1`. */
export function quarryLine(hand: readonly Card[]): string {
	const { counts, wilds } = countsOf(hand);
	return [...RESOURCES.map((kind) => `${kind} ${String(counts[kind])}`), `lodestone ${String(wilds)}`].join(", ");
}
