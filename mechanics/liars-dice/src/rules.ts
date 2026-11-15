// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `/rules` sub-path of this mechanic: the rules of liar's dice as pure functions (bid order, counting, the
 * probability a bid is true for a seat that knows only its own dice, the baseline decision, the seat statistics).
 * `model.ts` re-exports them beside the mechanic's state.
 */
import { Type, type Static } from "typebox";

/**
 * The rules of a table.
 *
 * @public
 */
export interface Rules {
	/** Faces of a die (6). */
	readonly faces: number;
	/** Ones count toward every other face, and nobody may bid on ones. */
	readonly wildOnes: boolean;
}

/**
 * The schema of a bid: at least `quantity` dice on the whole table show `face`.
 *
 * @public
 */
export const Bid = Type.Object({ quantity: Type.Integer({ minimum: 1 }), face: Type.Integer({ minimum: 1 }) });
/**
 * A bid: at least `quantity` dice on the whole table show `face`.
 *
 * @public
 */
export type Bid = Static<typeof Bid>;

/**
 * The lowest face a seat may bid on: 2 with wild ones, else 1.
 *
 * @param rules - The rules of the table.
 * @returns The face.
 *
 * @public
 */
export const lowestFace = (rules: Rules): number => (rules.wildOnes ? 2 : 1);

/**
 * Whether `next` beats `prev`: more dice, or as many dice on a higher face.
 *
 * @param next - The new bid.
 * @param prev - The standing bid, or undefined when none stands.
 * @returns True when `next` is higher.
 *
 * @public
 */
export function beats(next: Bid, prev: Bid | undefined): boolean {
	if (prev === undefined) return true;
	return next.quantity > prev.quantity || (next.quantity === prev.quantity && next.face > prev.face);
}

/**
 * A bid in the record: `3 x 5` (at least three dice show a 5).
 *
 * @param bid - The bid.
 * @returns The text.
 *
 * @public
 */
export function bidText(bid: Bid): string {
	return `${String(bid.quantity)} x ${String(bid.face)}`;
}

/**
 * Why `bid` is not a legal bid now (after `prev`, with `total` dice on the table), or undefined.
 *
 * @param bid - The bid to check.
 * @param prev - The standing bid, or undefined when none stands.
 * @param total - The dice on the table.
 * @param rules - The rules of the table.
 * @returns The sentence the caller reads, or undefined for a legal bid.
 *
 * @public
 */
export function bidProblem(bid: Bid, prev: Bid | undefined, total: number, rules: Rules): string | undefined {
	if (!Number.isInteger(bid.quantity) || !Number.isInteger(bid.face)) return "quantity and face are whole numbers.";
	if (bid.face < lowestFace(rules) || bid.face > rules.faces) return rules.wildOnes ? `Bid on a face from 2 to ${String(rules.faces)}: ones are wild and cannot be bid on.` : `Bid on a face from 1 to ${String(rules.faces)}.`;
	if (bid.quantity < 1) return "A bid names at least one die.";
	if (bid.quantity > total) return `There are only ${String(total)} dice on the table; a bid cannot name more.`;
	if (!beats(bid, prev)) return prev === undefined ? "Not a legal bid." : `A bid must beat ${bidText(prev)}: more dice, or as many dice on a higher face.`;
	return undefined;
}

/**
 * The lowest bid that beats `prev` (the opening bid when `prev` is undefined), or undefined when none fits on the table.
 *
 * @param prev - The standing bid, or undefined when none stands.
 * @param total - The dice on the table.
 * @param rules - The rules of the table.
 * @returns The bid, or undefined.
 *
 * @public
 */
export function minimalRaise(prev: Bid | undefined, total: number, rules: Rules): Bid | undefined {
	if (prev === undefined) return { quantity: 1, face: lowestFace(rules) };
	if (prev.face < rules.faces) return { quantity: prev.quantity, face: prev.face + 1 };
	return prev.quantity < total ? { quantity: prev.quantity + 1, face: lowestFace(rules) } : undefined;
}

/**
 * Every legal bid after `prev`, in bid order.
 *
 * @param prev - The standing bid, or undefined when none stands.
 * @param total - The dice on the table.
 * @param rules - The rules of the table.
 * @returns The bids, the lowest first.
 *
 * @public
 */
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

/**
 * How many of `dice` count for `face` (ones too when they are wild).
 *
 * @param dice - The dice.
 * @param face - The face.
 * @param rules - The rules of the table.
 * @returns The count.
 *
 * @public
 */
export function countFor(dice: readonly number[], face: number, rules: Rules): number {
	return dice.filter((die) => die === face || (rules.wildOnes && die === 1 && face !== 1)).length;
}

/**
 * The chance that one unseen die counts for `face`.
 *
 * @param face - The face.
 * @param rules - The rules of the table.
 * @returns The chance, from 0 to 1.
 *
 * @public
 */
export function chanceOf(face: number, rules: Rules): number {
	return rules.wildOnes && face !== 1 ? 2 / rules.faces : 1 / rules.faces;
}

/**
 * P(X \>= k) for X ~ Binomial(n, p).
 *
 * @param k - The successes needed.
 * @param n - The trials.
 * @param p - The chance of one success.
 * @returns The chance, from 0 to 1.
 *
 * @public
 */
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

/**
 * The chance that `bid` is true for a seat that sees `own` and not the other `unseen` dice.
 *
 * @param bid - The bid.
 * @param own - The seat's own dice.
 * @param unseen - The number of dice the seat cannot see.
 * @param rules - The rules of the table.
 * @returns The chance, from 0 to 1.
 *
 * @public
 */
export function truthOf(bid: Bid, own: readonly number[], unseen: number, rules: Rules): number {
	return atLeast(bid.quantity - countFor(own, bid.face, rules), unseen, chanceOf(bid.face, rules));
}

/**
 * The schema of a decision's kind: a bid or a liar call.
 *
 * @public
 */
export const Kind = Type.Union([Type.Literal("bid"), Type.Literal("liar")]);
/**
 * A decision's kind: a bid or a liar call.
 *
 * @public
 */
export type Kind = Static<typeof Kind>;

/**
 * The baseline for a seat to act: call liar when the standing bid is less likely true than the best
 * raise (from the seat's own dice alone, every other die fair and independent), else make the most
 * likely raise (the lowest of equals). Not a solver: it reads nothing into the others' bids.
 *
 * @param prev - The standing bid, or undefined when none stands.
 * @param own - The seat's own dice.
 * @param unseen - The number of dice the seat cannot see.
 * @param rules - The rules of the table.
 * @returns The kind of the decision, the bid of a raise, and the chance that the decision is right.
 *
 * @public
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

/**
 * A seat's dice as text, sorted: `1 4 4 6`, or `none`.
 *
 * @param dice - The dice.
 * @returns The text.
 *
 * @public
 */
export const diceText = (dice: readonly number[]): string => (dice.length === 0 ? "none" : [...dice].sort((a, b) => a - b).join(" "));

/**
 * The schema of one line of a game's public record.
 *
 * @public
 */
export const Entry = Type.Union(
	[
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
	],
	{ description: "One line of a game's public record: a new round, a bid, a liar call with the dice shown, or a seat going out." },
);
/**
 * One line of a game's public record.
 *
 * @public
 */
export type Entry = Static<typeof Entry>;

/**
 * The schema of one decision with its reference values, for the human only.
 *
 * @public
 */
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
/**
 * One decision with its reference values, for the human only.
 *
 * @public
 */
export type Scored = Static<typeof Scored>;

/**
 * The schema of a seat's statistics of one game.
 *
 * @public
 */
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
/**
 * A seat's statistics of one game.
 *
 * @public
 */
export type SeatStats = Static<typeof SeatStats>;

/**
 * The next live seat after `seat` in table order, starting with `seat` itself when `includeSelf` is set and it is live.
 *
 * @param seats - The seats in table order.
 * @param counts - The dice per seat (0: out).
 * @param seat - The seat to start from.
 * @param includeSelf - Whether `seat` itself may be the answer.
 * @returns The seat, or "" when no seat has dice.
 *
 * @public
 */
export function nextLive(seats: readonly string[], counts: Readonly<Record<string, number>>, seat: string, includeSelf: boolean): string {
	const start = seats.indexOf(seat);
	for (let step = includeSelf ? 0 : 1; step <= seats.length; step++) {
		const candidate = seats[(start + step + seats.length) % seats.length] ?? "";
		if ((counts[candidate] ?? 0) > 0) return candidate;
	}
	return "";
}

/**
 * The seat statistics of one game from its decisions and its public record.
 *
 * @param seats - The seats in table order.
 * @param decisions - The scored decisions of the game.
 * @param log - The public record of the game.
 * @param places - The place of each seat.
 * @param points - The points of each seat.
 * @returns The statistics, by seat.
 *
 * @public
 */
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
