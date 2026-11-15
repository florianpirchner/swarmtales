// SPDX-License-Identifier: Apache-2.0
/**
 * The Monte Carlo worth of a hand at bidding time: how many tricks it takes on average when the other
 * seats' cards and the trump are unknown. Pure and seeded by the caller (the mechanic passes a stream
 * of the run's random source, an offline script its own generator). The play policy is deliberately
 * simple (see `chooseCard`), so the number is a calibration reference and not a ceiling of skill. The
 * veto is ignored. Used by the mechanic's `reference` option.
 */
import { deckOf, rankOf, suitOf } from "@swarmtales/mechanic-card-table/contract";
import { legalCards, trickWinner, type Play } from "./model.ts";

function shuffle<T>(items: readonly T[], random: () => number): T[] {
	const result = [...items];
	for (let index = result.length - 1; index > 0; index--) {
		const other = Math.floor(random() * (index + 1));
		const held = result[index];
		const swap = result[other];
		if (held === undefined || swap === undefined) continue;
		result[index] = swap;
		result[other] = held;
	}
	return result;
}

// Card strength for the policy: a trump beats any other suit, then the rank decides.
function strength(card: string, trump: string): number {
	return (suitOf(card) === trump ? 100 : 0) + rankOf(card);
}

// The simple policy: the leader leads its strongest card; a follower plays its strongest legal
// card when that wins the trick as it stands, and its weakest legal card otherwise.
function chooseCard(hand: readonly string[], plays: readonly Play[], trump: string, seat: string): string {
	const led = plays[0] === undefined ? undefined : suitOf(plays[0].card);
	const legal = legalCards(hand, led, undefined);
	const ranked = [...legal].sort((a, b) => strength(a, trump) - strength(b, trump));
	const weakest = ranked[0] ?? "";
	const strongest = ranked[ranked.length - 1] ?? "";
	if (plays.length === 0) return strongest;
	return trickWinner([...plays, { seat, card: strongest }], trump) === seat ? strongest : weakest;
}

// One played-out round; returns the tricks taken by seat 0..3 (index = bid order).
function playRound(hands: readonly (readonly string[])[], trump: string): number[] {
	const held = hands.map((hand) => [...hand]);
	const taken = held.map(() => 0);
	let leader = 0;
	const tricks = held[0]?.length ?? 0;
	for (let trick = 0; trick < tricks; trick++) {
		const plays: Play[] = [];
		for (let offset = 0; offset < held.length; offset++) {
			const seat = (leader + offset) % held.length;
			const hand = held[seat] ?? [];
			const card = chooseCard(hand, plays, trump, String(seat));
			held[seat] = hand.filter((candidate) => candidate !== card);
			plays.push({ seat: String(seat), card });
		}
		leader = Number(trickWinner(plays, trump));
		taken[leader] = (taken[leader] ?? 0) + 1;
	}
	return taken;
}

/**
 * The mean number of tricks the hand takes, over `samples` random deals of the unseen cards to the
 * other seats and a uniformly drawn trump suit. `seatIndexInBidOrder` (0 = first bidder, who
 * leads) fixes where the hand sits at the table.
 *
 * @param hand - The hand.
 * @param seatIndexInBidOrder - The hand's place in the bidding order, from 0.
 * @param cardsPerSeat - Cards dealt to each seat.
 * @param suits - The deck's suits.
 * @param random - Uniform in [0, 1), seeded by the caller.
 * @param samples - Random deals.
 * @param seats - Seats at the table.
 * @returns The mean tricks taken; 0 for no samples.
 *
 * @public
 */
export function expectedTricks(hand: readonly string[], seatIndexInBidOrder: number, cardsPerSeat: number, suits: readonly { readonly name: string; readonly ranks: number }[], random: () => number, samples: number, seats = 4): number {
	const unseen = deckOf(suits).filter((card) => !hand.includes(card));
	let total = 0;
	for (let sample = 0; sample < samples; sample++) {
		const deal = shuffle(unseen, random);
		const trump = suits[Math.floor(random() * suits.length)]?.name ?? "";
		let next = 0;
		const hands = Array.from({ length: seats }, (_, seat) => {
			if (seat === seatIndexInBidOrder) return hand;
			const cards = deal.slice(next, next + cardsPerSeat);
			next += cardsPerSeat;
			return cards;
		});
		total += playRound(hands, trump)[seatIndexInBidOrder] ?? 0;
	}
	return samples === 0 ? 0 : total / samples;
}
