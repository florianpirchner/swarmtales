// SPDX-License-Identifier: Apache-2.0
/** The checks of the tools: who may act in which phase, and what a bid, a suit, a card or a veto must be. */
import type { Refusal } from "@swarmtales/contracts";
import { refuse } from "@swarmtales/sdk";
import { CardTableService, parseCard, renderHand, suitOf } from "@swarmtales/mechanic-card-table/contract";
import { cardsOf, currentTrick, handOf, ledSuit, suitNames } from "./flow.ts";
import type { TrickPlayCtx } from "./head.ts";
import { legalCards, type TrickState } from "./model.ts";

type Ctx = TrickPlayCtx;

// Why `seat` may not act in `phase` now, or undefined.
function turnProblem(state: Readonly<TrickState>, seat: string | undefined, phase: "bid" | "trump" | "play"): Refusal | undefined {
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (state.phase === "idle") return refuse("NO_ROUND", "No round is running right now; wait for the next one.");
	if (state.phase !== phase) {
		const now = state.phase === "bid" ? "bidding (placeBid)" : state.phase === "trump" ? "naming the trump (nameTrump)" : "playing tricks (playCard)";
		return refuse("WRONG_PHASE", `The round is ${now} now.`);
	}
	if (seat === undefined || seat !== state.actor) return refuse("NOT_YOUR_TURN", `It is ${state.actor ?? "nobody"}'s turn.`);
	return undefined;
}

/**
 * Checks a bid.
 *
 * @param ctx - The context.
 * @param seat - The caller.
 * @param bid - The tricks bid.
 * @returns The refusal, or undefined.
 *
 * @public
 */
export function bidProblem(ctx: Ctx, seat: string | undefined, bid: number): Refusal | undefined {
	const problem = turnProblem(ctx.state, seat, "bid");
	if (problem !== undefined) return problem;
	const cards = cardsOf(ctx);
	if (bid > cards) return refuse("BID_TOO_HIGH", `This round has ${String(cards)} card(s) each; bid 0 to ${String(cards)}.`);
	return undefined;
}

/**
 * Checks the naming of the trump.
 *
 * @param ctx - The context.
 * @param seat - The caller.
 * @param suit - The suit as the caller wrote it.
 * @returns The refusal, or the suit as the deck spells it.
 *
 * @public
 */
export function trumpProblem(ctx: Ctx, seat: string | undefined, suit: string): { readonly refusal: Refusal } | { readonly suit: string } {
	const problem = turnProblem(ctx.state, seat, "trump");
	if (problem !== undefined) return { refusal: problem };
	const suits = suitNames(ctx);
	const found = suits.find((name) => name.toLowerCase() === suit.trim().toLowerCase());
	return found === undefined ? { refusal: refuse("UNKNOWN_SUIT", `Name one of: ${suits.join(", ")}.`) } : { suit: found };
}

/**
 * Checks a card to play.
 *
 * @param ctx - The context.
 * @param seat - The caller.
 * @param text - The card as the caller wrote it.
 * @returns The refusal, or the card.
 *
 * @public
 */
export function playProblem(ctx: Ctx, seat: string | undefined, text: string): { readonly refusal: Refusal } | { readonly card: string } {
	const problem = turnProblem(ctx.state, seat, "play");
	if (problem !== undefined || seat === undefined) return { refusal: problem ?? refuse("NOT_YOUR_TURN") };
	const card = parseCard(text, ctx.call(CardTableService, "suits", {}));
	if (card === undefined) return { refusal: refuse("UNKNOWN_CARD", `"${text}" is no card of this deck; write it like "Ember 7".`) };
	const hand = handOf(ctx, seat);
	if (!hand.includes(card)) return { refusal: refuse("NOT_IN_HAND", `You do not hold ${card}. Your hand: ${renderHand(hand, ctx.call(CardTableService, "suits", {}))}.`) };
	const refusal = followProblem(ctx.state, hand, card);
	return refusal === undefined ? { card } : { refusal };
}

// Why a card of the hand may not be played to the trick on the table: a vetoed lead suit, or a suit not followed.
function followProblem(state: Readonly<TrickState>, hand: readonly string[], card: string): Refusal | undefined {
	const trick = currentTrick(state);
	const led = ledSuit(state);
	const legal = legalCards(hand, led, trick?.vetoed);
	if (legal.includes(card)) return undefined;
	return led === undefined ? refuse("VETOED_SUIT", `${trick?.vetoed ?? ""} was vetoed as lead for this trick; lead another suit: ${legal.join(", ")}.`) : refuse("MUST_FOLLOW", `You hold ${led}, so you must follow suit: ${legal.join(", ")}.`);
}

/**
 * Checks a veto of the lead.
 *
 * @param ctx - The context.
 * @param seat - The caller.
 * @returns The refusal, or undefined.
 *
 * @public
 */
export function vetoProblem(ctx: Ctx, seat: string | undefined): Refusal | undefined {
	const problem = turnProblem(ctx.state, seat, "play");
	if (problem !== undefined || seat === undefined) return problem ?? refuse("NOT_YOUR_TURN");
	if (ctx.options.vetoTokens === 0) return refuse("NO_VETO", "This game has no veto.");
	const trick = currentTrick(ctx.state);
	const lead = trick?.plays[0];
	if (trick === undefined || lead === undefined || trick.plays.length !== 1) return refuse("NOT_AFTER_LEAD", "A veto is only possible right after the lead card, by the next seat.");
	if (trick.vetoed !== undefined) return refuse("ALREADY_VETOED", "This trick's lead was vetoed once already.");
	return tokenProblem(ctx, seat, lead.seat, suitOf(lead.card));
}

// Why a veto right after the lead may not be spent: no token left, or a leader that holds only the suit it led.
function tokenProblem(ctx: Ctx, seat: string, leader: string, suit: string): Refusal | undefined {
	if ((ctx.state.vetoes[seat] ?? 0) <= 0) return refuse("NO_TOKEN", "You have no veto token left in this game.");
	if (handOf(ctx, leader).every((card) => suitOf(card) === suit)) return refuse("LEADER_HAS_NO_OTHER_SUIT", `${leader} holds no other suit to lead; the veto would change nothing.`);
	return undefined;
}
