// SPDX-License-Identifier: Apache-2.0
/** The tool `act`: why a seat may not act now, the action with its reply, and what a fake run samples. */
import type { RandomSource, Refusal, ToolSuccess } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { limitsOf, proceed, score } from "./flow.ts";
import type { HoldemCtx } from "./head.ts";
import { normalise, options as optionsOf, type Move, type Scored } from "./model.ts";

type Ctx = HoldemCtx;

/**
 * Why `resident` may not act with `move` now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param move - The requested move.
 * @returns The refusal, or undefined when the move is legal.
 *
 * @public
 */
export function actRefusal(ctx: Ctx, resident: string | undefined, move: Move): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	const hand = state.hand;
	if (!state.running || hand === undefined || hand.over) return refuse("NO_HAND", "No hand is being played right now; wait for the next one.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this table.");
	if (hand.toAct !== resident) return refuse("NOT_YOUR_TURN", hand.folded.includes(resident) ? "You folded this hand." : `It is ${hand.toAct}'s turn, not yours.`);
	const normal = normalise(hand, move, limitsOf(ctx));
	return "problem" in normal ? refuse("ILLEGAL_ACTION", normal.problem) : undefined;
}

function verb(done: Scored["done"]): string {
	return done === "fold" ? "folded" : done === "check" ? "checked" : done === "call" ? "called" : done === "bet" ? "bet" : "raised";
}

/**
 * The tool `act`: checks and scores the move, plays it and moves on.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param move - The requested move.
 * @param reason - The private reason, if any.
 * @returns The reply, which ends the caller's turn unless it is to act again, or the refusal.
 *
 * @public
 */
export function actNow(ctx: Ctx, resident: string | undefined, move: Move, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = actRefusal(ctx, resident, move);
	const hand = ctx.state.hand;
	if (refusal !== undefined || hand === undefined) return refusal ?? refuse("NO_HAND", "No hand is being played right now.");
	const normal = normalise(hand, move, limitsOf(ctx));
	if ("problem" in normal) return refuse("ILLEGAL_ACTION", normal.problem);
	const number = hand.number;
	const street = hand.street;
	score(ctx, hand, normal.done, false, reason);
	proceed(ctx, hand, normal.done, false, ctx.tick);
	const now = ctx.state.hand;
	// Say plainly that the turn is over: a model that answers the tool result otherwise tries to act again (P131).
	if (now?.number === number && !now.over) return reply(`You ${verb(normal.done)} (${street}). ${now.toAct === resident ? "It is your turn again." : `${now.toAct} is to act, not you: end your turn now; you will be told when it is yours.`}`, { endsTurn: now.toAct !== resident });
	return reply(`You ${verb(normal.done)}. Hand ${String(number)} is over: end your turn now; you will be told the result when you next play.`, { endsTurn: true });
}

// Whether `resident` is the seat to act now.
const onTurn = (ctx: Ctx, resident: string | undefined): boolean => {
	const hand = ctx.state.hand;
	return ctx.state.running && !ctx.state.finished && hand !== undefined && !hand.over && resident !== undefined && hand.toAct === resident;
};

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
	return onTurn(ctx, resident) && random.int(1, 4) === 1 ? {} : undefined;
}

/**
 * The `sample` of `act` for the fake driver: one of the legal moves of the seat to act (fold only when it faces a bet).
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined when the resident is not to act.
 *
 * @public
 */
export function sampleAct(ctx: Ctx, resident: string | undefined, random: RandomSource): { action: Move } | undefined {
	const hand = ctx.state.hand;
	if (hand === undefined || !onTurn(ctx, resident)) return undefined;
	const { toCall, canRaise } = optionsOf(hand, limitsOf(ctx));
	const moves: Move[] = toCall === 0 ? ["check"] : ["fold", "call"];
	if (canRaise) moves.push(toCall === 0 ? "bet" : "raise");
	return { action: random.pick(moves) };
}
