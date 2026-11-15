// SPDX-License-Identifier: Apache-2.0
/**
 * The briefings of Ember Tricks: what a seat reads before the run starts. Carried from the old game file
 * (`stories/ember-tricks/story.ts`, `briefing`): the template strings are byte-identical. The old briefing read the
 * number of residents from its host; here it is an argument.
 */

/**
 * The four seats of the card table, in seat order.
 *
 * @public
 */
export const SEATS = ["A01", "A02", "A03", "A04"] as const;

const RULES = [
	"The deck has 40 cards in five suits of different lengths: Ash 1-10, Brine 1-9, Cinder 1-8, Dust 1-7, Ember 1-6. A game has eight rounds; in round n everyone gets n cards. The dealer moves one seat on every round.",
	"Each round: 1) Bidding, starting left of the dealer: each player bids how many tricks they will take, exactly (placeBid). Bids are public. 2) The player with the lowest bid (the earliest on a tie) names the trump suit (nameTrump). 3) Tricks: the first bidder leads; everyone must follow the suit led if they can, otherwise any card (playCard). The highest trump wins the trick, otherwise the highest card of the suit led. The winner leads the next trick.",
	"Veto: once per game, right after a lead card and before you play, the player after the leader may spend the veto token (vetoLead): the lead card goes back and the leader must lead a different suit.",
	"Scoring per round: taking exactly your bid scores 10 + 3 per trick taken; a miss costs 5 plus the square of the difference (bid 3, took 5: -9; bid 0, took 1: -6). The match has several games; the most points in a game wins it.",
	"When it is your turn the table status in your input is current and complete: your hand, the bids, the trump, the trick and what you may do. Act at once with one tool call (placeBid, nameTrump, playCard or vetoLead); do not call viewTable first. When it is not your turn, do nothing: viewTable then only says whose turn it is.",
];

const NOTES = "You keep short notes across games (readBrain). After each game you rewrite them with writeBrain: rules that help you bid and play better next time, not a list of one game's cards.";

function briefingOf(resident: string, brain: boolean, residents: number): string {
	const others = SEATS.filter((seat) => seat !== resident).join(", ");
	const lines = [`You are ${resident}, one of four players (${others} are the others; ${String(residents)} residents in all) at a card table playing Ember Tricks, a trick-taking game with exact bidding. Every player plays for themselves. There is no chat: the only signals are bids, the named trump and the cards.`, ...RULES];
	if (brain) lines.push(NOTES);
	return lines.join("\n\n");
}

/**
 * Writes the briefing of every seat.
 *
 * @param brain - Whether the seats keep notes across games (false: the control arm).
 * @param residents - The number of residents of the run, which the first line names.
 * @returns Seat to briefing, in seat order.
 * @example
 * ```ts
 * const briefing = briefings(true, 4);
 * ```
 *
 * @public
 */
export function briefings(brain: boolean, residents: number = SEATS.length): Record<string, string> {
	return Object.fromEntries(SEATS.map((seat) => [seat, briefingOf(seat, brain, residents)]));
}
