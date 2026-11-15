// SPDX-License-Identifier: Apache-2.0
/** The tool `give`: goods handed over for nothing back, which count toward the giver's open promises to the receiver. */
import type { Refusal, ToolSuccess } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import type { SaltMarketCtx } from "./head.ts";
import { holdingOf, others, seatOf, tell, traderOf } from "./market.ts";
import { bundleLine, bundleOf, copyBundle, covers, GOODS, minus, plus, size, type Bundle, type MarketState } from "./model.ts";
import type { GoodsParams } from "./offers.ts";

/**
 * Why `resident` may not give these goods to `toId`.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param toId - The receiver as the caller wrote it.
 * @param goods - What the caller hands over.
 * @returns The refusal, or the receiver when the bank takes the gift.
 *
 * @public
 */
export function giveProblem(ctx: SaltMarketCtx, resident: string | undefined, toId: string, goods: Bundle): Refusal | { readonly from: string; readonly to: string } {
	const seat = traderOf(ctx, resident);
	if (typeof seat !== "string") return seat;
	const state = ctx.state;
	const to = seatOf(state, toId);
	if (to === undefined || to === seat) return refuse("UNKNOWN_TRADER", `${toId} is not another trader. Traders: ${others(state, seat).join(", ")}.`);
	if (size(goods) === 0) return refuse("EMPTY_GIFT", "Name at least one unit to give.");
	if (!covers(holdingOf(state, seat), goods)) return refuse("CANNOT_COVER", `You do not hold ${bundleLine(goods)}. You hold ${bundleLine(holdingOf(state, seat))}.`);
	return { from: seat, to };
}

// The goods count toward the giver's open promises to the receiver, oldest first.
function payPromises(state: MarketState, from: string, to: string, goods: Bundle): void {
	const rest = copyBundle(goods);
	for (const pledge of state.pledges) {
		if (pledge.status !== "pending" || pledge.escrow || pledge.from !== from || pledge.to !== to) continue;
		for (const good of GOODS) {
			const owed = Math.max(0, pledge.goods[good] - pledge.delivered[good]);
			const paid = Math.min(owed, rest[good]);
			pledge.delivered[good] += paid;
			rest[good] -= paid;
		}
	}
}

/**
 * The tool `give`.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param toId - The receiver as the caller wrote it.
 * @param goodsParams - What the caller hands over, by good.
 * @param note - A short note ("" for none).
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function giveNow(ctx: SaltMarketCtx, resident: string | undefined, toId: string, goodsParams: GoodsParams | undefined, note: string): ToolSuccess | Refusal {
	const goods = bundleOf(goodsParams);
	const sides = giveProblem(ctx, resident, toId, goods);
	if ("ok" in sides) return sides;
	const { from, to } = sides;
	const state = ctx.state;
	state.holdings[from] = minus(holdingOf(state, from), goods);
	state.holdings[to] = plus(holdingOf(state, to), goods);
	payPromises(state, from, to, goods);
	const text = note.trim();
	ctx.emit("market_gift", { game: state.game, round: state.round, from, to, goods: copyBundle(goods), note: text });
	tell(ctx, others(state, from), `${from} gave ${bundleLine(goods)} to ${to}.${text === "" ? "" : ` Note: "${text}"`}`);
	return reply(`Gave ${bundleLine(goods)} to ${to}. You now hold ${bundleLine(holdingOf(state, from))}. When you are done, end your turn.`);
}
