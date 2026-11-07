/**
 * The rules of the liar's dice game as pure functions (bid order, counting, the probability a bid is
 * true for a seat that knows only its own dice, the baseline decision) and the mechanic's state.
 */
import { Type, type Static } from "typebox";

export interface Rules {
	/** Faces of a die (6). */
	readonly faces: number;
	/** Ones count toward every other face, and nobody may bid on ones. */
	readonly wildOnes: boolean;
}

/** A bid: at least `quantity` dice on the whole table show `face`. */
export const Bid = Type.Object({ quantity: Type.Integer({ minimum: 1 }), face: Type.Integer({ minimum: 1 }) });
export type Bid = Static<typeof Bid>;

/** The lowest face a seat may bid on: 2 with wild ones, else 1. */
export const lowestFace = (rules: Rules): number => (rules.wildOnes ? 2 : 1);

/** Whether `next` beats `prev`: more dice, or as many dice on a higher face. */
export function beats(next: Bid, prev: Bid | undefined): boolean {
	if (prev === undefined) return true;
	return next.quantity > prev.quantity || (next.quantity === prev.quantity && next.face > prev.face);
}

/** Why `bid` is not a legal bid now (after `prev`, with `total` dice on the table), or undefined. */
export function bidProblem(bid: Bid, prev: Bid | undefined, total: number, rules: Rules): string | undefined {
	if (!Number.isInteger(bid.quantity) || !Number.isInteger(bid.face)) return "quantity and face are whole numbers.";
	if (bid.face < lowestFace(rules) || bid.face > rules.faces) return rules.wildOnes ? `Bid on a face from 2 to ${String(rules.faces)}: ones are wild and cannot be bid on.` : `Bid on a face from 1 to ${String(rules.faces)}.`;
	if (bid.quantity < 1) return "A bid names at least one die.";
	if (bid.quantity > total) return `There are only ${String(total)} dice on the table; a bid cannot name more.`;
	if (!beats(bid, prev)) return prev === undefined ? "Not a legal bid." : `A bid must beat ${bidText(prev)}: more dice, or as many dice on a higher face.`;
	return undefined;
}

/** The smallest bid that beats `prev` (or opens the round), or undefined if none fits on the table. */
export function minimalRaise(prev: Bid | undefined, total: number, rules: Rules): Bid | undefined {
	if (prev === undefined) return { quantity: 1, face: lowestFace(rules) };
	if (prev.face < rules.faces) return { quantity: prev.quantity, face: prev.face + 1 };
	return prev.quantity < total ? { quantity: prev.quantity + 1, face: lowestFace(rules) } : undefined;
}

/** Every legal bid after `prev`, in bid order. */
export function legalBids(prev: Bid | undefined, total: number, rules: Rules): Bid[] {
	const bids: Bid[] = [];
	for (let quantity = 1; quantity <= total; quantity++) {
		for (let face = lowestFace(rules); face <= rules.faces; face++) {
			const bid = { quantity, face };
			if (beats(bid, prev)) bids.push(bid);
		}
	}
	return bids;
}

/** How many of `dice` count for `face` (ones too when they are wild). */
export function countFor(dice: readonly number[], face: number, rules: Rules): number {
	return dice.filter((die) => die === face || (rules.wildOnes && die === 1 && face !== 1)).length;
}

/** The chance that one unseen die counts for `face`. */
export function chanceOf(face: number, rules: Rules): number {
	return rules.wildOnes && face !== 1 ? 2 / rules.faces : 1 / rules.faces;
}

/** P(X >= k) for X ~ Binomial(n, p). */
export function atLeast(k: number, n: number, p: number): number {
	if (k <= 0) return 1;
	if (k > n) return 0;
	let sum = 0;
	let term = (1 - p) ** n;
	for (let i = 0; i <= n; i++) {
		if (i >= k) sum += term;
		term = i < n ? (term * (n - i) * p) / ((i + 1) * (1 - p)) : 0;
	}
	return Math.min(1, Math.max(0, sum));
}

/** The chance that `bid` is true for a seat that sees `own` and not the other `unseen` dice. */
export function truthOf(bid: Bid, own: readonly number[], unseen: number, rules: Rules): number {
	return atLeast(bid.quantity - countFor(own, bid.face, rules), unseen, chanceOf(bid.face, rules));
}

export const Kind = Type.Union([Type.Literal("bid"), Type.Literal("liar")]);
export type Kind = Static<typeof Kind>;

/**
 * The baseline for a seat to act: call liar when the standing bid is less likely true than the best
 * raise (from the seat's own dice alone, every other die fair and independent), else make the most
 * likely raise (the lowest of equals). Not a solver: it reads nothing into the others' bids.
 */
export function baselineOf(prev: Bid | undefined, own: readonly number[], unseen: number, rules: Rules): { readonly kind: Kind; readonly bid?: Bid; readonly truth: number } {
	let best: Bid | undefined;
	let bestTruth = -1;
	for (const bid of legalBids(prev, own.length + unseen, rules)) {
		const truth = truthOf(bid, own, unseen, rules);
		if (truth > bestTruth + 1e-9) {
			best = bid;
			bestTruth = truth;
		}
	}
	if (prev === undefined) return best === undefined ? { kind: "bid", bid: { quantity: 1, face: lowestFace(rules) }, truth: 1 } : { kind: "bid", bid: best, truth: bestTruth };
	const standing = truthOf(prev, own, unseen, rules);
	// Calling wins when the standing bid is false; a raise is safe at least when it is true.
	if (best === undefined || 1 - standing > bestTruth) return { kind: "liar", truth: 1 - standing };
	return { kind: "bid", bid: best, truth: bestTruth };
}

/** A bid in the record: `3 x 5` (at least three dice show a 5). */
export function bidText(bid: Bid): string {
	return `${String(bid.quantity)} x ${String(bid.face)}`;
}

export const diceText = (dice: readonly number[]): string => (dice.length === 0 ? "none" : [...dice].sort((a, b) => a - b).join(" "));

/** One line of a game's public record. */
export const Entry = Type.Union([
	Type.Object({ kind: Type.Literal("round"), round: Type.Integer(), starter: Type.String(), counts: Type.Record(Type.String(), Type.Integer()) }),
	Type.Object({ kind: Type.Literal("bid"), round: Type.Integer(), seat: Type.String(), bid: Bid, say: Type.Optional(Type.String()), missed: Type.Optional(Type.Boolean()) }),
	Type.Object({
		kind: Type.Literal("liar"),
		round: Type.Integer(),
		seat: Type.String(),
		bidder: Type.String(),
		bid: Bid,
		count: Type.Integer(),
		dice: Type.Record(Type.String(), Type.Array(Type.Integer())),
		loser: Type.String(),
		say: Type.Optional(Type.String()),
		missed: Type.Optional(Type.Boolean()),
	}),
	Type.Object({ kind: Type.Literal("out"), seat: Type.String(), place: Type.Integer() }),
]);
export type Entry = Static<typeof Entry>;

/** One decision with its reference values, for the human only. */
export const Scored = Type.Object({
	game: Type.Integer(),
	round: Type.Integer(),
	resident: Type.String(),
	kind: Kind,
	bid: Type.Optional(Bid),
	standing: Type.Optional(Bid),
	dice: Type.Array(Type.Integer(), { description: "The seat's own dice." }),
	unseen: Type.Integer({ description: "Dice on the table the seat cannot see." }),
	truth: Type.Number({ description: "For a bid: the chance it is true from the seat's own dice. For liar: the chance the standing bid is false." }),
	standingTruth: Type.Optional(Type.Number({ description: "The chance the standing bid was true from the seat's own dice." })),
	baseline: Kind,
	baselineBid: Type.Optional(Bid),
	agree: Type.Boolean({ description: "Same kind of decision as the baseline (bid or liar)." }),
	bluff: Type.Boolean({ description: "A bid the seat's own dice make less likely true than not." }),
	missed: Type.Boolean(),
});
export type Scored = Static<typeof Scored>;

export const SeatStats = Type.Object({
	place: Type.Integer(),
	points: Type.Number(),
	decisions: Type.Integer(),
	bids: Type.Integer(),
	bluffs: Type.Integer({ description: "Bids under 0.5 from the seat's own dice." }),
	liars: Type.Integer({ description: "Liar calls made." }),
	liarsWon: Type.Integer(),
	called: Type.Integer({ description: "The seat's bids that were called." }),
	calledHeld: Type.Integer({ description: "Called bids that were true." }),
	meanTruth: Type.Number({ description: "Mean chance of the seat's bids being true, from its own dice." }),
	agreement: Type.Number({ description: "Share of decisions of the baseline's kind." }),
	missed: Type.Integer(),
	diceLost: Type.Integer(),
});
export type SeatStats = Static<typeof SeatStats>;

export const DiceSlice = Type.Object({
	seats: Type.Array(Type.String()),
	game: Type.Integer(),
	round: Type.Integer(),
	/** Dice per seat in the running game (0: out). */
	counts: Type.Record(Type.String(), Type.Integer()),
	/** The current roll (secret). */
	dice: Type.Record(Type.String(), Type.Array(Type.Integer())),
	standing: Type.Optional(Bid),
	bidder: Type.String(),
	toAct: Type.String(),
	/** Seats out of the running game, first out first. */
	out: Type.Array(Type.String()),
	log: Type.Array(Entry),
	seenLog: Type.Record(Type.String(), Type.Integer()),
	briefed: Type.Array(Type.String()),
	told: Type.Boolean(),
	opened: Type.Integer(),
	decisions: Type.Array(Scored),
	scores: Type.Record(Type.String(), Type.Number()),
	gameScores: Type.Record(Type.String(), Type.Number()),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
});
export type DiceState = Static<typeof DiceSlice>;

/** The live seats after `seat` in table order, starting with `seat` itself when it is live. */
export function nextLive(seats: readonly string[], counts: Readonly<Record<string, number>>, seat: string, includeSelf: boolean): string {
	const start = seats.indexOf(seat);
	for (let step = includeSelf ? 0 : 1; step <= seats.length; step++) {
		const candidate = seats[(start + step + seats.length) % seats.length] ?? "";
		if ((counts[candidate] ?? 0) > 0) return candidate;
	}
	return "";
}

/** The seat statistics of one game from its decisions and its public record. */
export function statsOf(seats: readonly string[], decisions: readonly Scored[], log: readonly Entry[], places: Readonly<Record<string, number>>, points: Readonly<Record<string, number>>): Record<string, SeatStats> {
	const round3 = (value: number): number => Math.round(value * 1000) / 1000;
	return Object.fromEntries(
		seats.map((seat) => {
			const own = decisions.filter((decision) => decision.resident === seat);
			const bids = own.filter((decision) => decision.kind === "bid");
			const calls = log.filter((entry): entry is Extract<Entry, { kind: "liar" }> => entry.kind === "liar");
			const made = calls.filter((entry) => entry.seat === seat);
			const against = calls.filter((entry) => entry.bidder === seat);
			const stats: SeatStats = {
				place: places[seat] ?? 0,
				points: points[seat] ?? 0,
				decisions: own.length,
				bids: bids.length,
				bluffs: bids.filter((decision) => decision.bluff).length,
				liars: made.length,
				liarsWon: made.filter((entry) => entry.loser !== seat).length,
				called: against.length,
				calledHeld: against.filter((entry) => entry.loser !== seat).length,
				meanTruth: bids.length === 0 ? 0 : round3(bids.reduce((sum, decision) => sum + decision.truth, 0) / bids.length),
				agreement: own.length === 0 ? 0 : round3(own.filter((decision) => decision.agree).length / own.length),
				missed: own.filter((decision) => decision.missed).length,
				diceLost: calls.filter((entry) => entry.loser === seat).length,
			};
			return [seat, stats];
		}),
	);
}
