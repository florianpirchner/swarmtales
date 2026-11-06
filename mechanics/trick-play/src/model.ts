/** The rules of trick play as pure functions (shared with the reference listener and the tests) and the mechanic's state. */
import { Type, type Static } from "typebox";
import { rankOf, suitOf } from "@swarmtales/mechanic-card-table";

export interface Play {
	readonly seat: string;
	readonly card: string;
}

export const PlaySchema = Type.Object({ seat: Type.String(), card: Type.String() });

/** The seat that wins a full trick: the highest trump, or else the highest card of the suit led. */
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

export const Scoring = Type.Object({
	hit: Type.Integer({ default: 10, description: "Points for taking exactly the tricks bid." }),
	perTrick: Type.Integer({ default: 3, description: "Points per trick taken, on a hit only." }),
	miss: Type.Union([Type.Literal("square"), Type.Literal("linear")], { default: "square", description: "A miss costs the square of the error (square) or 10 per trick off (linear)." }),
});
export type Scoring = Static<typeof Scoring>;

/** The points of one round: a hit is `hit + perTrick * taken`, a miss costs the error squared (or 10 per trick off). */
export function roundPoints(bid: number, taken: number, scoring: Scoring): number {
	if (bid === taken) return scoring.hit + scoring.perTrick * taken;
	const error = Math.abs(bid - taken);
	return scoring.miss === "square" ? -(error * error) : -10 * error;
}

/** Who names trump: the lowest bid, the earliest in bidding order on a tie. */
export function trumpNamer(order: readonly string[], bids: Readonly<Record<string, number>>): string {
	let namer = order[0] ?? "";
	for (const seat of order) if ((bids[seat] ?? Infinity) < (bids[namer] ?? Infinity)) namer = seat;
	return namer;
}

/** The table order rotated so that it starts with the seat after `dealer`. */
export function orderAfter(seats: readonly string[], dealer: string): string[] {
	const index = seats.indexOf(dealer);
	return seats.map((_, offset) => seats[(index + 1 + offset) % seats.length] ?? "");
}

export const Phase = Type.Union([Type.Literal("idle"), Type.Literal("bid"), Type.Literal("trump"), Type.Literal("play")]);
export type Phase = Static<typeof Phase>;

export const RoundRecord = Type.Object({
	round: Type.Integer(),
	cards: Type.Integer(),
	dealer: Type.String(),
	trump: Type.Union([Type.String(), Type.Null()]),
	namer: Type.Union([Type.String(), Type.Null()]),
	bids: Type.Record(Type.String(), Type.Integer()),
	tricks: Type.Record(Type.String(), Type.Integer()),
	points: Type.Record(Type.String(), Type.Integer()),
});
export type RoundRecord = Static<typeof RoundRecord>;

export const GameRecord = Type.Object({
	game: Type.Integer(),
	result: Type.String({ description: "The seat with the most points, several joined by '+' on a tie." }),
	totals: Type.Record(Type.String(), Type.Integer()),
	rounds: Type.Array(RoundRecord),
});
export type GameRecord = Static<typeof GameRecord>;

export const TrickSchema = Type.Object({
	leader: Type.String(),
	plays: Type.Array(PlaySchema),
	vetoed: Type.Optional(Type.String({ description: "The suit vetoed as lead for this trick." })),
	winner: Type.Optional(Type.String()),
});
export type Trick = Static<typeof TrickSchema>;

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
export type TrickState = Static<typeof TrickSlice>;
