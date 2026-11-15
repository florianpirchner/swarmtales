// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** What a fake run samples for the tools of Salt Market: only calls the bank would take. */
import type { RandomSource } from "@swarmtales/contracts";
import { giveProblem } from "./give.ts";
import type { SaltMarketCtx } from "./head.ts";
import { ALL, closed, holdingOf, others } from "./market.ts";
import { bundleOf, GOODS, PERISHABLE, type Offer } from "./model.ts";
import { acceptProblem, offerProblem, type GoodsParams } from "./offers.ts";

type Ctx = SaltMarketCtx;

// The open offers of the game that `resident` did not make and may take.
const offersFor = (ctx: Ctx, resident: string): readonly Offer[] => ctx.state.offers.filter((offer) => offer.status === "open" && offer.from !== resident && (offer.to === resident || offer.to === ALL));

/**
 * The `sample` of `offer`: every other turn, one or two salt for a unit of a good another trader holds.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The offer, or undefined when the bank would refuse it or the resident makes none.
 *
 * @public
 */
export function sampleOffer(ctx: Ctx, resident: string | undefined, random: RandomSource): { to: string; give: GoodsParams; get: GoodsParams } | undefined {
	if (resident === undefined || closed(ctx, resident) !== undefined || random.int(1, 2) === 1) return undefined;
	const to = random.pick(others(ctx.state, resident));
	const goods = PERISHABLE.filter((good) => holdingOf(ctx.state, to)[good] > 0);
	if (goods.length === 0) return undefined;
	const get: GoodsParams = {};
	get[random.pick(goods)] = 1;
	const params = { to: random.int(1, 4) === 1 ? ALL : to, give: { salt: random.int(1, 2) }, get };
	return offerProblem(ctx, resident, params) === undefined ? params : undefined;
}

/**
 * The `sample` of `accept`: two times of three, an offer the bank can execute.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The offer's id, or undefined when there is none to take.
 *
 * @public
 */
export function sampleAccept(ctx: Ctx, resident: string | undefined, random: RandomSource): { offer: string } | undefined {
	if (resident === undefined) return undefined;
	const open = offersFor(ctx, resident).filter((offer) => acceptProblem(ctx, resident, offer.id) === undefined);
	if (open.length === 0 || random.int(1, 3) === 1) return undefined;
	return { offer: random.pick(open).id };
}

/**
 * The `sample` of `decline`: one time of three, an offer the resident may take.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The offer's id and a note, or undefined.
 *
 * @public
 */
export function sampleDecline(ctx: Ctx, resident: string | undefined, random: RandomSource): { offer: string; note: string } | undefined {
	if (resident === undefined || closed(ctx, resident) !== undefined) return undefined;
	const open = offersFor(ctx, resident);
	if (open.length === 0 || random.int(1, 3) !== 1) return undefined;
	return { offer: random.pick(open).id, note: "too dear" };
}

/**
 * The `sample` of `withdraw`: one time of four, one of the resident's own open offers.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The offer's id, or undefined.
 *
 * @public
 */
export function sampleWithdraw(ctx: Ctx, resident: string | undefined, random: RandomSource): { offer: string } | undefined {
	if (resident === undefined || closed(ctx, resident) !== undefined) return undefined;
	const own = ctx.state.offers.filter((offer) => offer.status === "open" && offer.from === resident);
	if (own.length === 0 || random.int(1, 4) !== 1) return undefined;
	return { offer: random.pick(own).id };
}

/**
 * The `sample` of `say`: one time of three while the resident has messages left, to everyone.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The message, or undefined.
 *
 * @public
 */
export function sampleSay(ctx: Ctx, resident: string | undefined, random: RandomSource): { text: string } | undefined {
	if (resident === undefined || closed(ctx, resident) !== undefined) return undefined;
	if ((ctx.state.says[resident] ?? 0) >= ctx.options.maxSays || random.int(1, 3) !== 1) return undefined;
	return { text: `${resident} ${random.pick(["buys", "sells"])} anything for salt.` };
}

/**
 * The `sample` of `viewMarket`: one time of four while a game runs.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The empty parameters, or undefined.
 *
 * @public
 */
export function sampleView(ctx: Ctx, resident: string | undefined, random: RandomSource): Record<string, never> | undefined {
	return resident !== undefined && closed(ctx, resident) === undefined && random.int(1, 4) === 1 ? {} : undefined;
}

// What `resident` still owes on its oldest open plain promise and holds now, with the receiver.
function owed(ctx: Ctx, resident: string): { to: string; goods: GoodsParams } | undefined {
	for (const pledge of ctx.state.pledges) {
		if (pledge.status !== "pending" || pledge.escrow || pledge.from !== resident) continue;
		const goods: GoodsParams = {};
		for (const good of GOODS) {
			const units = Math.min(pledge.goods[good] - pledge.delivered[good], holdingOf(ctx.state, resident)[good]);
			if (units > 0) goods[good] = units;
		}
		if (Object.keys(goods).length > 0) return { to: pledge.to, goods };
	}
	return undefined;
}

/**
 * The `sample` of `give`: what the resident owes on an open promise and holds, or one time of eight a unit of salt.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param random - The fake driver's random stream.
 * @returns The gift, or undefined when the bank would refuse it or the resident gives nothing.
 *
 * @public
 */
export function sampleGive(ctx: Ctx, resident: string | undefined, random: RandomSource): { to: string; goods: GoodsParams } | undefined {
	if (resident === undefined || closed(ctx, resident) !== undefined) return undefined;
	const params = owed(ctx, resident) ?? (random.int(1, 8) === 1 ? { to: random.pick(others(ctx.state, resident)), goods: { salt: 1 } } : undefined);
	if (params === undefined) return undefined;
	return "ok" in giveProblem(ctx, resident, params.to, bundleOf(params.goods)) ? undefined : params;
}
