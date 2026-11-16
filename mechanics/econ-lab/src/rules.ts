// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `/rules` sub-path of this mechanic: the rules of the three games as pure functions (pairings, payoffs, reference
 * metrics) with their schemas. `model.ts` re-exports them beside the mechanic's state.
 */
import { Type, type Static } from "typebox";

/**
 * The schema of a game kind.
 *
 * @public
 */
export const GameKind = Type.Union([Type.Literal("public-goods"), Type.Literal("ultimatum"), Type.Literal("dilemma")]);
/**
 * One of the three games: the shared fund, the split offer, the A-or-B choice.
 *
 * @public
 */
export type GameKind = Static<typeof GameKind>;

/**
 * The schema of the decision a resident owes: one tool per kind.
 *
 * @public
 */
export const Action = Type.Union([Type.Literal("contribute"), Type.Literal("offer"), Type.Literal("respond"), Type.Literal("choose")]);
/**
 * The decision a resident owes: one tool per kind.
 *
 * @public
 */
export type Action = Static<typeof Action>;

/**
 * The schema of an option of the two-option game.
 *
 * @public
 */
export const Option = Type.Union([Type.Literal("A"), Type.Literal("B")]);
/**
 * An option of the two-option game: A (cooperation) or B.
 *
 * @public
 */
export type Option = Static<typeof Option>;

/**
 * The schema of the payoff table of the two-option game: A with A, B with B, B against A, A against B.
 *
 * @public
 */
export const DilemmaPayoffs = Type.Object({
	bothA: Type.Number({ description: "Each player's points when both choose A (the reward for cooperation)." }),
	bothB: Type.Number({ description: "Each player's points when both choose B (the punishment)." }),
	temptation: Type.Number({ description: "The B player's points against an A player." }),
	sucker: Type.Number({ description: "The A player's points against a B player." }),
});
/**
 * The payoff table of the two-option game.
 *
 * @public
 */
export type DilemmaPayoffs = Static<typeof DilemmaPayoffs>;

/**
 * The numbers of the three games, from the options.
 *
 * @public
 */
export interface Rules {
	readonly endowment: number;
	readonly multiplier: number;
	readonly pie: number;
	readonly dilemma: DilemmaPayoffs;
}

/**
 * The schema of one resident's part of a resolved round. `value`: the amount put in or offered, 1/0 for accept/reject, 1/0 for A/B.
 *
 * @public
 */
export const Outcome = Type.Object({
	resident: Type.String(),
	partner: Type.Optional(Type.String()),
	role: Type.Optional(Type.Union([Type.Literal("proposer"), Type.Literal("responder")])),
	action: Type.Optional(Action),
	value: Type.Optional(Type.Number()),
	/** For the ultimatum game: the offer on the table and whether it was accepted (both seats). */
	offer: Type.Optional(Type.Number()),
	accepted: Type.Optional(Type.Boolean()),
	/** For the two-option game: the partner's choice. */
	partnerOption: Type.Optional(Option),
	payoff: Type.Number(),
	/** No decision in time: the default was used (nothing put in, no offer, reject, B). */
	missed: Type.Boolean(),
	/** No partner this round (odd number of seats). */
	sitsOut: Type.Optional(Type.Boolean()),
});
/**
 * One resident's part of a resolved round.
 *
 * @public
 */
export type Outcome = Static<typeof Outcome>;

/**
 * The schema of a resolved round.
 *
 * @public
 */
export const RoundRecord = Type.Object({
	round: Type.Integer(),
	game: GameKind,
	/** The public-goods pool before the multiplier. */
	pool: Type.Optional(Type.Number()),
	outcomes: Type.Array(Outcome),
});
/**
 * A resolved round: its game, its pool and what each resident did and got.
 *
 * @public
 */
export type RoundRecord = Static<typeof RoundRecord>;

/**
 * A pairing of one round: [first, second]; in the ultimatum game the first proposes. `null` is the bye of an odd table.
 *
 * @public
 */
export type Pair = readonly [string | null, string | null];

/**
 * Rounds to two decimals, so points stay readable and deterministic.
 *
 * @param value - The number.
 * @returns The number with two decimals.
 *
 * @public
 */
export function points(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * The round-robin pairing of `round` (from 1) by the circle method: every seat meets every other once
 * per cycle of n-1 rounds (n even; an odd table adds a bye). The order in a pair (the ultimatum's
 * proposer first) swaps from round to round, so roles stay balanced and a pair meeting again swaps them
 * whenever the cycle length is odd (four seats: every third round).
 *
 * @param seats - The seats of the table, in order.
 * @param round - The round, from 1.
 * @returns The pairs of the round.
 *
 * @public
 */
export function pairsOf(seats: readonly string[], round: number): readonly Pair[] {
	const table: (string | null)[] = seats.length % 2 === 0 ? [...seats] : [...seats, null];
	const n = table.length;
	if (n < 2) return [];
	const index = (round - 1) % (n - 1);
	// Seat 0 stays, the others rotate by `index`.
	const rotated = [table[0] ?? null, ...table.slice(1).map((_, k) => table[1 + ((k + index) % (n - 1))] ?? null)];
	const pairs: Pair[] = [];
	for (let k = 0; k < n / 2; k++) {
		const first = rotated[k] ?? null;
		const second = rotated[n - 1 - k] ?? null;
		pairs.push(round % 2 === 1 ? [first, second] : [second, first]);
	}
	return pairs;
}

/**
 * The public-goods round: everyone keeps what they did not put in, plus an equal share of the multiplied pool.
 *
 * @param contributions - What each seat put in.
 * @param seats - The seats of the table.
 * @param rules - The numbers of the games.
 * @param missed - The seats whose decision did not come in time.
 * @returns The outcome of each seat.
 *
 * @public
 */
export function publicGoods(contributions: ReadonlyMap<string, number>, seats: readonly string[], rules: Rules, missed: ReadonlySet<string>): RoundRecord["outcomes"] {
	const pool = seats.reduce((sum, seat) => sum + (contributions.get(seat) ?? 0), 0);
	const share = (pool * rules.multiplier) / seats.length;
	return seats.map((seat) => {
		const value = contributions.get(seat) ?? 0;
		return { resident: seat, action: "contribute" as const, value, payoff: points(rules.endowment - value + share), missed: missed.has(seat) };
	});
}

/**
 * The points of one player of the two-option game.
 *
 * @param own - The player's option.
 * @param partner - The partner's option.
 * @param table - The payoff table.
 * @returns The player's points.
 *
 * @public
 */
export function dilemmaPayoff(own: Option, partner: Option, table: DilemmaPayoffs): number {
	if (own === "A") return partner === "A" ? table.bothA : table.sucker;
	return partner === "A" ? table.temptation : table.bothB;
}

// Mean of a list, 0 for none.
function mean(values: readonly number[]): number {
	return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

const ratio = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * The block's distance from the two closed-form references, for the human and the report: `cooperation`
 * is 0 at Nash play (put in nothing, offer the least, choose B) and 1 at the social optimum (put in
 * everything, an even split, choose A); `efficiency` is the points earned over the most the table could earn.
 *
 * @param game - The game of the block.
 * @param records - The resolved rounds of the block.
 * @param seats - The seats of the table.
 * @param rules - The numbers of the games.
 * @returns The reference numbers of the block.
 *
 * @public
 */
export function referenceOf(game: GameKind, records: readonly RoundRecord[], seats: readonly string[], rules: Rules) {
	const outcomes = records.flatMap((record) => record.outcomes.filter((outcome) => outcome.sitsOut !== true));
	const earned = outcomes.reduce((sum, outcome) => sum + outcome.payoff, 0);
	const missed = outcomes.filter((outcome) => outcome.missed).length;
	if (game === "public-goods") {
		const shares = outcomes.map((outcome) => (outcome.value ?? 0) / rules.endowment);
		const best = records.length * seats.length * rules.endowment * Math.max(1, rules.multiplier);
		const perRound = records.map((record) => ratio(mean(record.outcomes.map((outcome) => (outcome.value ?? 0) / rules.endowment))));
		return { cooperation: ratio(mean(shares)), efficiency: ratio(best === 0 ? 0 : earned / best), perRound, missed };
	}
	if (game === "ultimatum") {
		const proposals = outcomes.filter((outcome) => outcome.role === "proposer" && outcome.offer !== undefined);
		// A missed offer counts as nothing offered.
		const offers = outcomes.filter((outcome) => outcome.role === "proposer").map((outcome) => (outcome.offer ?? 0) / rules.pie);
		const rejected = proposals.filter((outcome) => outcome.accepted === false).length;
		const pairs = records.reduce((sum, record) => sum + record.outcomes.filter((outcome) => outcome.role === "proposer").length, 0);
		const best = pairs * rules.pie;
		const perRound = records.map((record) => ratio(mean(record.outcomes.filter((outcome) => outcome.role === "proposer").map((outcome) => (outcome.offer ?? 0) / rules.pie))));
		// The fair split (half) is cooperation 1; offering nothing is 0.
		return { cooperation: ratio(Math.min(1, mean(offers) * 2)), efficiency: ratio(best === 0 ? 0 : earned / best), perRound, missed, meanOffer: ratio(mean(offers)), rejectionRate: ratio(proposals.length === 0 ? 0 : rejected / proposals.length) };
	}
	const choices = outcomes.filter((outcome) => outcome.action === "choose");
	const playedPairs = choices.length / 2;
	const best = playedPairs * 2 * Math.max(rules.dilemma.bothA, (rules.dilemma.temptation + rules.dilemma.sucker) / 2);
	const perRound = records.map((record) => ratio(mean(record.outcomes.filter((outcome) => outcome.action === "choose").map((outcome) => outcome.value ?? 0))));
	const mutual = records.reduce((sum, record) => sum + record.outcomes.filter((outcome) => outcome.value === 1 && outcome.partnerOption === "A").length, 0);
	return { cooperation: ratio(mean(choices.map((outcome) => outcome.value ?? 0))), efficiency: ratio(best === 0 ? 0 : earned / best), perRound, missed, mutualCooperation: ratio(choices.length === 0 ? 0 : mutual / choices.length) };
}

/**
 * The schema of a block's reference numbers, as `block_scored` carries them.
 *
 * @public
 */
export const Reference = Type.Object({
	cooperation: Type.Number({ description: "0 at Nash play, 1 at the social optimum (mean over the block's decisions)." }),
	efficiency: Type.Number({ description: "Points earned over the most the table could have earned in the block." }),
	perRound: Type.Array(Type.Number(), { description: "The cooperation measure per round: the curve of the block." }),
	missed: Type.Integer({ description: "Decisions not made in time." }),
	meanOffer: Type.Optional(Type.Number({ description: "Ultimatum: the mean offer as a share of the sum." })),
	rejectionRate: Type.Optional(Type.Number({ description: "Ultimatum: the share of offers rejected." })),
	mutualCooperation: Type.Optional(Type.Number({ description: "Two-option game: the share of choices that met an A with an A." })),
});

/**
 * The schema of a block: one game with its rounds.
 *
 * @public
 */
export const Block = Type.Object({
	game: GameKind,
	rounds: Type.Integer({ minimum: 1, maximum: 50, description: "Rounds of the block." }),
});
/**
 * A block of the match: one game with its rounds.
 *
 * @public
 */
export type Block = Static<typeof Block>;
