// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The rules of trick play as pure functions (shared with the reference worth and the tests) and the mechanic's state. */
import { Type, type Static } from "typebox";
import { rankOf, suitOf } from "@swarmtales/mechanic-card-table/contract";

/**
 * One card played to a trick.
 *
 * @public
 */
export interface Play {
	/** The seat that played it. */
	readonly seat: string;
	/** The card, `<Suit> <rank>`. */
	readonly card: string;
}

/**
 * The schema of one card played to a trick.
 *
 * @public
 */
export const PlaySchema = Type.Object({ seat: Type.String(), card: Type.String() });

/**
 * The seat that wins a full trick: the highest trump, or else the highest card of the suit led.
 *
 * @param plays - The plays of the trick, the lead first.
 * @param trump - The trump suit, or null.
 * @returns The winning seat; empty for no plays.
 *
 * @public
 */
export function trickWinner(plays: readonly Play[], trump: string | null): string {
	const led = suitOf(plays[0]?.card ?? "");
	let best: Play | undefined;
	const beats = (play: Play, other: Play): boolean => {
		const suit = suitOf(play.card);
		const otherSuit = suitOf(other.card);
		if (suit === otherSuit) return rankOf(play.card) > rankOf(other.card);
		if (trump !== null && suit === trump) return true;
		if (trump !== null && otherSuit === trump) return false;
		return suit === led && otherSuit !== led;
	};
	for (const play of plays) if (best === undefined || beats(play, best)) best = play;
	return best?.seat ?? "";
}

/**
 * The cards a seat may play now: a follower holding the suit led must follow it; a leader may lead
 * anything except a suit vetoed for this trick, unless the hand holds nothing else.
 *
 * @param hand - The seat's hand.
 * @param led - The suit led, undefined for the leader.
 * @param vetoed - The suit vetoed as lead for this trick.
 * @returns The legal cards, in hand order.
 *
 * @public
 */
export function legalCards(hand: readonly string[], led: string | undefined, vetoed: string | undefined): readonly string[] {
	if (led !== undefined) {
		const follow = hand.filter((card) => suitOf(card) === led);
		return follow.length > 0 ? follow : hand;
	}
	if (vetoed === undefined) return hand;
	const others = hand.filter((card) => suitOf(card) !== vetoed);
	return others.length > 0 ? others : hand;
}

/**
 * The schema of the points of a round.
 *
 * @public
 */
export const Scoring = Type.Object({
	hit: Type.Integer({ default: 10, description: "Points for taking exactly the tricks bid." }),
	perTrick: Type.Integer({ default: 3, description: "Points per trick taken, on a hit only." }),
	miss: Type.Union([Type.Literal("square"), Type.Literal("linear")], { default: "square", description: "A miss costs the square of the error (square) or 10 per trick off (linear), plus missBase." }),
	missBase: Type.Optional(Type.Integer({ minimum: 0, description: "A fixed cost of every miss on top of the error term (default 0)." })),
});

/**
 * The points of a round.
 *
 * @public
 */
export type Scoring = Static<typeof Scoring>;

/**
 * The points of one round: a hit is `hit + perTrick * taken`, a miss costs `missBase` plus the error squared (or 10 per trick off).
 *
 * @param bid - The tricks bid.
 * @param taken - The tricks taken.
 * @param scoring - The points of a round.
 * @returns The points, negative for a miss.
 *
 * @public
 */
export function roundPoints(bid: number, taken: number, scoring: Scoring): number {
	if (bid === taken) return scoring.hit + scoring.perTrick * taken;
	const error = Math.abs(bid - taken);
	const base = scoring.missBase ?? 0;
	return -(base + (scoring.miss === "square" ? error * error : 10 * error));
}

/**
 * Who names trump: the lowest bid, the earliest in bidding order on a tie.
 *
 * @param order - The bidding order.
 * @param bids - The bids.
 * @returns The seat that names the trump.
 *
 * @public
 */
export function trumpNamer(order: readonly string[], bids: Readonly<Record<string, number>>): string {
	let namer = order[0] ?? "";
	for (const seat of order) if ((bids[seat] ?? Infinity) < (bids[namer] ?? Infinity)) namer = seat;
	return namer;
}

/**
 * The table order rotated so that it starts with the seat after `dealer`.
 *
 * @param seats - The seats in table order.
 * @param dealer - The dealer.
 * @returns The bidding order.
 *
 * @public
 */
export function orderAfter(seats: readonly string[], dealer: string): string[] {
	const index = seats.indexOf(dealer);
	return seats.map((_, offset) => seats[(index + 1 + offset) % seats.length] ?? "");
}

/**
 * The schema of the phase of a round.
 *
 * @public
 */
export const Phase = Type.Union([Type.Literal("idle"), Type.Literal("bid"), Type.Literal("trump"), Type.Literal("play")]);

/**
 * The phase of a round: idle between rounds or games, then bid, trump and play.
 *
 * @public
 */
export type Phase = Static<typeof Phase>;

/**
 * The schema of a scored round.
 *
 * @public
 */
export const RoundRecord = Type.Object({
	round: Type.Integer(),
	cards: Type.Integer(),
	dealer: Type.String(),
	trump: Type.Union([Type.String(), Type.Null()]),
	namer: Type.Union([Type.String(), Type.Null()]),
	bids: Type.Record(Type.String(), Type.Integer()),
	tricks: Type.Record(Type.String(), Type.Integer()),
	points: Type.Record(Type.String(), Type.Integer()),
	worth: Type.Optional(Type.Record(Type.String(), Type.Number({ description: "The Monte Carlo worth of each seat's hand at bidding time, in tricks (option `reference`)." }))),
});

/**
 * A scored round.
 *
 * @public
 */
export type RoundRecord = Static<typeof RoundRecord>;

/**
 * The schema of a finished game.
 *
 * @public
 */
export const GameRecord = Type.Object({
	game: Type.Integer(),
	result: Type.String({ description: "The seat with the most points, several joined by '+' on a tie." }),
	totals: Type.Record(Type.String(), Type.Integer()),
	rounds: Type.Array(RoundRecord),
});

/**
 * A finished game.
 *
 * @public
 */
export type GameRecord = Static<typeof GameRecord>;

/**
 * The schema of a trick.
 *
 * @public
 */
export const TrickSchema = Type.Object({
	leader: Type.String(),
	plays: Type.Array(PlaySchema),
	vetoed: Type.Optional(Type.String({ description: "The suit vetoed as lead for this trick." })),
	winner: Type.Optional(Type.String()),
});

/**
 * A trick: its leader, its plays, a vetoed lead suit and its winner once full.
 *
 * @public
 */
export type Trick = Static<typeof TrickSchema>;

/**
 * The schema of the mechanic's state.
 *
 * @public
 */
export const TrickSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	round: Type.Integer(),
	phase: Phase,
	dealer: Type.String(),
	order: Type.Array(Type.String()),
	actor: Type.Union([Type.String(), Type.Null()]),
	bids: Type.Record(Type.String(), Type.Integer()),
	trump: Type.Union([Type.String(), Type.Null()]),
	namer: Type.Union([Type.String(), Type.Null()]),
	tricks: Type.Array(TrickSchema),
	won: Type.Record(Type.String(), Type.Integer()),
	worth: Type.Optional(Type.Record(Type.String(), Type.Number())),
	totals: Type.Record(Type.String(), Type.Integer()),
	vetoes: Type.Record(Type.String(), Type.Integer()),
	rounds: Type.Array(RoundRecord),
	results: Type.Array(GameRecord),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
	invalid: Type.Optional(Type.Boolean()),
	watch: Type.String(),
	idle: Type.Integer(),
	forfeits: Type.Integer({ description: "Timer actions in a row, since the last action of a seat itself." }),
	debrief: Type.Array(Type.String({ description: "Seats still to be told the record of the game that just ended." })),
});

/**
 * The state of trick play: the running round, the scores of the game, the results of the match and the move timer.
 *
 * @public
 */
export type TrickState = Static<typeof TrickSlice>;
