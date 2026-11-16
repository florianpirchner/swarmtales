// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The tool `bid`: why a seat may not bid now, a sealed bid with its reply, and what a fake run samples for the two tools. */
import type { RandomSource, Refusal, ToolSuccess } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { lotNow, resolve } from "./flow.ts";
import type { SealedAuctionCtx } from "./head.ts";

type Ctx = SealedAuctionCtx;

const NO_SEAT = (): Refusal => refuse("NOT_A_SEAT", "You have no seat at this auction.");

// Why `resident` may not bid on anything now, before the amount is read.
function seatProblem(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running || !state.open) return refuse("NO_LOT", "No lot is open right now; wait for the next one.");
	if (resident === undefined || !state.seats.includes(resident)) return NO_SEAT();
	if (!state.owing.includes(resident)) return refuse("ALREADY_BID", "You already bid on this lot.");
	return undefined;
}

// Seals the checked bid of `resident` on the open lot.
function seal(ctx: Ctx, resident: string, amount: number, reason: string | undefined): void {
	const state = ctx.state;
	const text = reason?.trim() ?? "";
	state.bids[resident] = amount;
	if (text !== "") state.reasons[resident] = text;
	state.owing = state.owing.filter((id) => id !== resident);
	ctx.emit("bid_placed", { game: state.game, lot: state.lot, resident, amount, ...(text === "" ? {} : { reason: text }) });
	ctx.access.lock(resident, "bid");
}

/**
 * Why `resident` may not bid `amount` now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param amount - The bid.
 * @returns The refusal, or undefined when the bid may be placed.
 *
 * @public
 */
export function problemWith(ctx: Ctx, resident: string | undefined, amount: number): Refusal | undefined {
	const refusal = seatProblem(ctx, resident);
	if (refusal !== undefined || resident === undefined) return refusal ?? NO_SEAT();
	const coins = ctx.state.coins[resident] ?? 0;
	if (!Number.isInteger(amount) || amount < 0) return refuse("OUT_OF_RANGE", "A bid is a whole number of coins, 0 to pass.");
	if (amount > coins) return refuse("OVER_PURSE", `You have ${String(coins)} coins left; a bid may not be more.`);
	return undefined;
}

/**
 * The tool `bid`: seals the bid, and resolves the lot once every seat has bid.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param amount - The bid; 0 passes.
 * @param reason - The reason, for the record.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function placeBid(ctx: Ctx, resident: string | undefined, amount: number, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, resident, amount);
	if (refusal !== undefined || resident === undefined) return refusal ?? NO_SEAT();
	const state = ctx.state;
	const lot = state.lot;
	seal(ctx, resident, amount, reason);
	if (state.owing.length === 0) resolve(ctx, ctx.tick, []);
	return reply(state.open && state.lot === lot ? `Bid sealed on lot ${String(lot)}. Wait for the others.` : `Bid sealed. Lot ${String(lot)} is resolved; use viewAuction for the result.`);
}

/**
 * The `sample` of `viewAuction` for the fake driver (`--fake`): a look at the auction before one in four bids.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The empty params, or undefined when the resident owes no bid or does not look.
 *
 * @public
 */
export function sampleView(ctx: Ctx, resident: string | undefined, random: RandomSource): Record<string, never> | undefined {
	return problemWith(ctx, resident, 0) === undefined && random.int(1, 4) === 1 ? {} : undefined;
}

/**
 * The `sample` of `bid` for the fake driver: a bid from 0 to the own value or estimate, never above the coins left.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The bid, or undefined when the resident owes no bid on the open lot.
 *
 * @public
 */
export function sampleBid(ctx: Ctx, resident: string | undefined, random: RandomSource): { amount: number; reason: string } | undefined {
	const lot = lotNow(ctx);
	if (lot === undefined || resident === undefined || problemWith(ctx, resident, 0) !== undefined) return undefined;
	const top = Math.max(0, Math.min(ctx.state.coins[resident] ?? 0, lot.values[resident] ?? 0));
	return { amount: random.int(0, top), reason: "sampled" };
}
