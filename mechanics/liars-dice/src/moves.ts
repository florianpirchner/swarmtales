// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The two decision tools: why a seat may not act now, a bid, a liar call with their replies, and what a fake run samples. */
import type { RandomSource, Refusal, ToolSuccess } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { callLiar, placeBid, rulesOf, score } from "./flow.ts";
import type { LiarsDiceCtx } from "./head.ts";
import { bidProblem, bidText, legalBids, totalDice, type Bid } from "./model.ts";

type Ctx = LiarsDiceCtx;

const NO_SEAT = (): Refusal => refuse("NOT_A_SEAT", "You have no seat at this table.");

// Why `resident` may not act now, or undefined.
function turnProblem(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	if (resident === undefined || !state.seats.includes(resident)) return NO_SEAT();
	if ((state.counts[resident] ?? 0) === 0) return refuse("OUT", "You are out of this game: you have no dice left. End your turn; the next game starts soon.");
	if (state.toAct !== resident) return refuse("NOT_YOUR_TURN", `It is ${state.toAct}'s turn, not yours.`);
	return undefined;
}

/**
 * Why `resident` may not make `bid` now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param bid - The bid.
 * @returns The refusal, or undefined when the bid is legal.
 *
 * @public
 */
export function bidRefusal(ctx: Ctx, resident: string | undefined, bid: Bid): Refusal | undefined {
	const problem = turnProblem(ctx, resident);
	if (problem !== undefined) return problem;
	const issue = bidProblem(bid, ctx.state.standing, totalDice(ctx.state), rulesOf(ctx));
	return issue === undefined ? undefined : refuse("ILLEGAL_BID", issue);
}

/**
 * Why `resident` may not call liar now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @returns The refusal, or undefined when the call is legal.
 *
 * @public
 */
export function liarRefusal(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const problem = turnProblem(ctx, resident);
	if (problem !== undefined) return problem;
	return ctx.state.standing === undefined ? refuse("NO_BID", "Nobody has bid yet this round: you open it with a bid.") : undefined;
}

// Whether `resident` acts again right away (its call does not end its turn).
const onTurn = (ctx: Ctx, resident: string): boolean => ctx.state.running && ctx.state.toAct === resident;

const after = (ctx: Ctx, resident: string): string => {
	const state = ctx.state;
	if (!state.running) return "end your turn now.";
	return state.toAct === resident ? "It is your turn again." : `${state.toAct} is to act, not you: end your turn now; you will be told when it is yours.`;
};

/**
 * The tool `bid`: checks, scores and places the bid.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param bid - The bid.
 * @param say - The public remark, if any.
 * @param reason - The private reason, if any.
 * @returns The reply, which ends the caller's turn unless it is to act again, or the refusal.
 *
 * @public
 */
export function bidNow(ctx: Ctx, resident: string | undefined, bid: Bid, say: string | undefined, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = bidRefusal(ctx, resident, bid);
	if (refusal !== undefined || resident === undefined) return refusal ?? NO_SEAT();
	score(ctx, bid, false, reason);
	placeBid(ctx, bid, say, false, ctx.tick);
	return reply(`You bid ${bidText(bid)}. ${after(ctx, resident)}`, { endsTurn: !onTurn(ctx, resident) });
}

/**
 * The tool `liar`: checks and scores the call, shows the dice and takes a die from the loser.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param say - The public remark, if any.
 * @param reason - The private reason, if any.
 * @returns The reply, which ends the caller's turn unless it opens the next round, or the refusal.
 *
 * @public
 */
export function liarNow(ctx: Ctx, resident: string | undefined, say: string | undefined, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = liarRefusal(ctx, resident);
	if (refusal !== undefined || resident === undefined) return refusal ?? NO_SEAT();
	const bidder = ctx.state.bidder;
	score(ctx, undefined, false, reason);
	const result = callLiar(ctx, say, false, ctx.tick);
	if (result === undefined) return refuse("NO_BID", "Nobody has bid yet this round.");
	const verdict = result.loser === resident ? `The bid held (${String(result.count)} counted): you lose a die.` : `The bid was a lie (${String(result.count)} counted): ${bidder} loses a die.`;
	return reply(`You called ${bidder}'s ${bidText(result.bid)} a lie. ${verdict} The dice are shown in your next turn. ${onTurn(ctx, resident) ? "You open the next round: it is your turn." : "End your turn now; you will be told when it is yours."}`, { endsTurn: !onTurn(ctx, resident) });
}

/**
 * The `sample` of `viewTable` for the fake driver (`--fake`): a look at the table before one in four decisions.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The empty params, or undefined when the resident is not to act or does not look.
 *
 * @public
 */
export function sampleView(ctx: Ctx, resident: string | undefined, random: RandomSource): Record<string, never> | undefined {
	return turnProblem(ctx, resident) === undefined && random.int(1, 4) === 1 ? {} : undefined;
}

/**
 * The `sample` of `bid` for the fake driver: one of the six lowest legal bids for the seat to act. Once a bid stands
 * it bids only half of the times, so that the driver goes on to `liar` and a round ends.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The bid, or undefined when the resident is not to act, no bid fits on the table, or it leaves the turn to `liar`.
 *
 * @public
 */
export function sampleBid(ctx: Ctx, resident: string | undefined, random: RandomSource): Bid | undefined {
	if (turnProblem(ctx, resident) !== undefined) return undefined;
	const bids = legalBids(ctx.state.standing, totalDice(ctx.state), rulesOf(ctx)).slice(0, 6);
	if (bids.length === 0 || (ctx.state.standing !== undefined && random.int(1, 2) === 1)) return undefined;
	return { ...random.pick(bids) };
}
