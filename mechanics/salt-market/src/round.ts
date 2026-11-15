// SPDX-License-Identifier: Apache-2.0
/**
 * The end of a round, in the old order: the shipments due arrive (what the bank holds for escrow stays with it), the
 * deliveries due settle, the offers whose time ran out expire, the announced good spoils; then the next round opens,
 * or the game ends.
 */
import type { SaltMarketCtx } from "./head.ts";
import { holdingOf, tell } from "./market.ts";
import { bundleLine, copyBundle, covers, empty, GOODS, minus, plus, size, spoilLoss } from "./model.ts";
import { expireOffers } from "./offers.ts";
import { startRound } from "./flow.ts";
import { endGame } from "./score.ts";

type Ctx = SaltMarketCtx;

// The shipments due this round arrive; what the bank holds for escrow stays with it.
function arriveShipments(ctx: Ctx, round: number): void {
	const state = ctx.state;
	for (const seat of state.seats) {
		const profile = state.profiles[seat];
		if (profile?.arrives !== round || state.arrived.includes(seat)) continue;
		const reserved = state.reserved[seat] ?? empty();
		const goods = minus(profile.shipment, reserved);
		state.holdings[seat] = plus(holdingOf(state, seat), goods);
		state.arrived.push(seat);
		ctx.emit("market_shipment_arrived", { game: state.game, round, trader: seat, shipment: copyBundle(profile.shipment), escrow: copyBundle(reserved) });
		tell(ctx, state.seats, `${seat}'s shipment arrived: ${bundleLine(profile.shipment)}${size(reserved) > 0 ? ` (${bundleLine(reserved)} of it went to the bank's escrow)` : ""}.`);
	}
}

// The pledges due this round: escrow is delivered by the bank; a plain promise is kept when the proposer gave the goods.
function settlePledges(ctx: Ctx, round: number): void {
	const state = ctx.state;
	for (const pledge of state.pledges) {
		if (pledge.status !== "pending" || pledge.due > round) continue;
		if (pledge.escrow) {
			state.holdings[pledge.to] = plus(holdingOf(state, pledge.to), pledge.goods);
			pledge.delivered = copyBundle(pledge.goods);
			pledge.status = "kept";
			tell(ctx, state.seats, `The bank delivered escrow ${pledge.id}: ${bundleLine(pledge.goods)} from ${pledge.from} to ${pledge.to}.`);
		} else {
			pledge.status = covers(pledge.delivered, pledge.goods) ? "kept" : "broken";
			tell(ctx, state.seats, pledge.status === "kept" ? `${pledge.from} kept promise ${pledge.id} to ${pledge.to} (${bundleLine(pledge.goods)}).` : `${pledge.from} broke promise ${pledge.id} to ${pledge.to}: owed ${bundleLine(pledge.goods)} by the end of round ${String(pledge.due)}, delivered ${bundleLine(pledge.delivered)}.`);
		}
		ctx.emit("market_promise_settled", structuredClone(pledge));
	}
}

// The good announced at the round's start spoils in every stock of 2 or more.
function spoilRound(ctx: Ctx, round: number): void {
	const state = ctx.state;
	state.spoilLog.push(state.spoils);
	const good = GOODS.find((name) => name === state.spoils);
	if (good === undefined) return;
	const losses: Record<string, number> = {};
	for (const seat of state.seats) {
		const loss = spoilLoss(holdingOf(state, seat), good);
		if (loss === 0) continue;
		losses[seat] = loss;
		const holding = holdingOf(state, seat);
		holding[good] -= loss;
		state.spoiled[seat] = (state.spoiled[seat] ?? 0) + loss;
	}
	ctx.emit("market_spoiled", { game: state.game, round, good, losses });
	const lost = Object.entries(losses).map(([seat, loss]) => `${seat} lost ${String(loss)}`);
	tell(ctx, state.seats, `${good} spoiled at the end of round ${String(round)}: ${lost.length === 0 ? "nobody held 4 or more, nothing was lost" : lost.join(", ")}.`);
}

/**
 * Ends the round once it has lasted `roundMinutes` ticks: shipments, deliveries, expiries and spoils, then the next
 * round or the end of the game.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function roundClock(ctx: Ctx): void {
	const state = ctx.state;
	if (!state.running || ctx.tick - state.opened + 1 < ctx.options.roundMinutes) return;
	const round = state.round;
	const last = round >= ctx.options.rounds;
	arriveShipments(ctx, round);
	settlePledges(ctx, round);
	expireOffers(ctx, round, last);
	spoilRound(ctx, round);
	if (last) endGame(ctx);
	else startRound(ctx, round + 1, ctx.tick + 1);
}
