// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Offers and trades through the bank: what an offer may ask, what each side must hold (goods, tax, the escrow fee and
 * the escrowed goods its shipment does not cover), the trade that `accept` executes with the delivery it leaves owed,
 * `decline` and `withdraw`, and the offers that expire at the end of a round. Keeping and settling a delivery, the
 * shipments and the spoils build on it.
 */
import type { Refusal, ToolSuccess } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import type { SaltMarketCtx } from "./head.ts";
import { ALL, holdingOf, normalize, noSeat, offerLine, others, seatOf, statsOf, tell, traderOf } from "./market.ts";
import { bundleLine, bundleOf, copyBundle, covers, empty, GOODS, minus, plus, size, type Bundle, type Good, type Later, type MarketState, type Offer, type Pledge } from "./model.ts";

type Ctx = SaltMarketCtx;

/**
 * Counts by good, as a tool's parameters name them.
 *
 * @public
 */
export type GoodsParams = Partial<Record<Good, number>>;

/**
 * The parameters of the tool `offer`.
 *
 * @public
 */
export interface OfferParams {
	/** The trader the offer is for, or `all`. */
	readonly to: string;
	/** What the proposer gives now. */
	readonly give?: GoodsParams;
	/** What the proposer wants now. */
	readonly get?: GoodsParams;
	/** Goods the proposer delivers later, by the end of `round`, in escrow or as a plain promise. */
	readonly later?: GoodsParams & { readonly round: number; readonly escrow?: boolean };
	/** A short note the other side reads. */
	readonly note?: string;
}

/**
 * What of `seat`'s shipment is still free for escrow due by the end of `round` (none once it arrived, or if it comes later).
 *
 * @param state - The state of the mechanic.
 * @param seat - The trader.
 * @param round - The round the escrow is due.
 * @returns The free part of the shipment.
 *
 * @public
 */
export function freeShipment(state: MarketState, seat: string, round: number): Bundle {
	const profile = state.profiles[seat];
	if (profile === undefined || state.arrived.includes(seat) || profile.arrives === 0 || profile.arrives > round) return empty();
	return minus(profile.shipment, state.reserved[seat] ?? empty());
}

/**
 * How escrowed later goods are covered: from the free shipment first, the rest from holdings.
 *
 * @param state - The state of the mechanic.
 * @param seat - The proposer.
 * @param later - The later goods of the offer, or undefined.
 * @returns The part the shipment covers and the part the proposer must hold now; both empty for a plain promise.
 *
 * @public
 */
export function escrowSplit(state: MarketState, seat: string, later: Later | undefined): { readonly fromShipment: Bundle; readonly fromHoldings: Bundle } {
	if (later?.escrow !== true) return { fromShipment: empty(), fromHoldings: empty() };
	const free = freeShipment(state, seat, later.round);
	const fromShipment = empty();
	for (const good of GOODS) fromShipment[good] = Math.min(free[good], later.goods[good]);
	return { fromShipment, fromHoldings: minus(later.goods, fromShipment) };
}

function laterOf(params: OfferParams): Later | undefined {
	if (params.later === undefined) return undefined;
	const goods = bundleOf(params.later);
	return size(goods) === 0 ? undefined : { goods, round: params.later.round, escrow: params.later.escrow ?? false };
}

// What a trade costs each side in salt: the tax when it moves more than `taxFree` units now.
const taxOf = (ctx: Ctx, give: Bundle, get: Bundle): number => (size(give) + size(get) > ctx.options.taxFree ? ctx.options.tax : 0);

// What the proposer needs to hold for a trade: the goods it gives now, escrowed later goods its shipment does not cover, the tax and the fee, in salt.
function proposerNeeds(ctx: Ctx, from: string, offer: { readonly give: Bundle; readonly get: Bundle; readonly later?: Later | undefined }): Bundle {
	const escrow = escrowSplit(ctx.state, from, offer.later).fromHoldings;
	const salt = taxOf(ctx, offer.give, offer.get) + (offer.later?.escrow === true ? ctx.options.escrowFee : 0);
	return plus(plus(offer.give, escrow), { ...empty(), salt });
}

function accepterNeeds(ctx: Ctx, offer: { readonly give: Bundle; readonly get: Bundle }): Bundle {
	return plus(offer.get, { ...empty(), salt: taxOf(ctx, offer.give, offer.get) });
}

// The addressee: a trader other than the proposer, or all.
function addresseeOf(ctx: Ctx, resident: string, to: string): string | Refusal {
	const target = to.trim().toLowerCase() === ALL ? ALL : seatOf(ctx.state, to);
	if (target === undefined) return refuse("UNKNOWN_TRADER", `${to} is not a trader here. Traders: ${others(ctx.state, resident).join(", ")}, or all.`);
	if (target === resident) return refuse("SELF_OFFER", "You cannot trade with yourself.");
	return target;
}

// A plain promise of goods still to come: the shipment lands at the end of its round, after the last turn of that round (P148).
function laterProblem(ctx: Ctx, resident: string, later: Later | undefined): Refusal | undefined {
	const state = ctx.state;
	if (later === undefined) return undefined;
	if (later.round <= state.round || later.round > ctx.options.rounds) return refuse("BAD_ROUND", `Later goods must be due in a later round of this game (${String(state.round + 1)} to ${String(ctx.options.rounds)}).`);
	const own = state.profiles[resident];
	if (later.escrow || own === undefined || state.arrived.includes(resident) || own.arrives < later.round || covers(holdingOf(state, resident), later.goods)) return undefined;
	return refuse("TOO_EARLY_FOR_SHIPMENT", `Your shipment arrives at the end of round ${String(own.arrives)}, after your last turn of that round, so you could not hand those goods over by round ${String(later.round)}. Make the promise due in round ${String(own.arrives + 1)} or later, or use escrow (the bank delivers from the shipment).`);
}

/**
 * Why `resident` may not make this offer.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param params - The offer as the caller wrote it.
 * @returns The refusal, or undefined when the bank takes the offer.
 *
 * @public
 */
export function offerProblem(ctx: Ctx, resident: string | undefined, params: OfferParams): Refusal | undefined {
	const seat = traderOf(ctx, resident);
	if (typeof seat !== "string") return seat;
	const to = addresseeOf(ctx, seat, params.to);
	if (typeof to !== "string") return to;
	const give = bundleOf(params.give);
	const get = bundleOf(params.get);
	const later = laterOf(params);
	const problem = shapeProblem(give, get, later) ?? laterProblem(ctx, seat, later);
	return problem ?? coverProblem(ctx, seat, { give, get, later });
}

// An offer moves something and asks for something (now or later).
function shapeProblem(give: Bundle, get: Bundle, later: Later | undefined): Refusal | undefined {
	if (size(give) + size(get) + (later === undefined ? 0 : size(later.goods)) === 0) return refuse("EMPTY_OFFER", "An offer must move at least one unit.");
	if (size(get) === 0 && later === undefined) return refuse("USE_GIVE", "An offer that asks for nothing is a gift; use give.");
	return undefined;
}

// The proposer has an offer left and holds what the trade needs from it.
function coverProblem(ctx: Ctx, resident: string, offer: { readonly give: Bundle; readonly get: Bundle; readonly later: Later | undefined }): Refusal | undefined {
	const state = ctx.state;
	if (state.offers.filter((offer) => offer.status === "open" && offer.from === resident).length >= ctx.options.maxOpenOffers) return refuse("TOO_MANY_OFFERS", `You have ${String(ctx.options.maxOpenOffers)} open offers; withdraw one first.`);
	const needs = proposerNeeds(ctx, resident, offer);
	if (!covers(holdingOf(state, resident), needs)) return refuse("CANNOT_COVER", `You do not hold ${bundleLine(needs)} (goods, escrow, tax and fee). You hold ${bundleLine(holdingOf(state, resident))}.`);
	return undefined;
}

// The offer as the bank books it, with the next id.
function newOffer(state: MarketState, resident: string, params: OfferParams): Offer {
	state.counter += 1;
	const later = laterOf(params);
	return {
		id: `O${String(state.counter)}`,
		game: state.game,
		round: state.round,
		from: resident,
		to: params.to.trim().toLowerCase() === ALL ? ALL : (seatOf(state, params.to) ?? ALL),
		give: bundleOf(params.give),
		get: bundleOf(params.get),
		...(later === undefined ? {} : { later }),
		note: (params.note ?? "").trim(),
		status: "open",
	};
}

/**
 * The tool `offer`: the bank opens the offer and tells its addressees.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param params - The offer as the caller wrote it.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function offerNow(ctx: Ctx, resident: string | undefined, params: OfferParams): ToolSuccess | Refusal {
	const refusal = offerProblem(ctx, resident, params);
	if (refusal !== undefined || resident === undefined) return refusal ?? noSeat();
	const state = ctx.state;
	const offer = newOffer(state, resident, params);
	state.offers.push(offer);
	statsOf(state, resident).offers += 1;
	ctx.emit("market_offer_made", structuredClone(offer));
	const audience = offer.to === ALL ? others(state, resident) : [offer.to];
	for (const seat of audience) tell(ctx, [seat], `New offer ${offerLine(offer, seat)} (accept or decline it by id; it lasts until the end of round ${String(state.round + 1)}).`);
	const tax = taxOf(ctx, offer.give, offer.get);
	return reply(`Offer ${offer.id} is open: ${offerLine(offer, resident)}${tax > 0 ? ` Tax if taken: ${String(tax)} salt each side.` : ""} When you are done, end your turn.`);
}

const findOffer = (state: MarketState, id: string): Offer | undefined => state.offers.find((other) => other.id === normalize(id));

// The open offer of that id.
function openOffer(state: MarketState, id: string): Offer | Refusal {
	const offer = findOffer(state, id);
	if (offer === undefined) return refuse("NO_SUCH_OFFER", `There is no offer ${id} in this game.`);
	if (offer.status !== "open") return refuse("OFFER_CLOSED", `Offer ${offer.id} is ${offer.status}.`);
	return offer;
}

const isOffer = (found: Offer | Refusal): found is Offer => !("ok" in found);

/**
 * Why `resident` may not accept offer `id` now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param id - The offer's id as the caller wrote it.
 * @returns The refusal, or undefined when the bank can execute the trade.
 *
 * @public
 */
export function acceptProblem(ctx: Ctx, resident: string | undefined, id: string): Refusal | undefined {
	const seat = traderOf(ctx, resident);
	if (typeof seat !== "string") return seat;
	const state = ctx.state;
	const offer = openOffer(state, id);
	if (!isOffer(offer)) return offer;
	if (offer.from === seat) return refuse("OWN_OFFER", "You cannot accept your own offer; withdraw it instead.");
	if (offer.to !== ALL && offer.to !== seat) return refuse("NOT_FOR_YOU", `Offer ${offer.id} is for ${offer.to}.`);
	const proposer = proposerNeeds(ctx, offer.from, offer);
	if (!covers(holdingOf(state, offer.from), proposer)) return refuse("PROPOSER_CANNOT_COVER", `${offer.from} no longer holds ${bundleLine(proposer)}; the bank cannot execute ${offer.id}.`);
	const accepter = accepterNeeds(ctx, offer);
	if (!covers(holdingOf(state, seat), accepter)) return refuse("CANNOT_COVER", `You do not hold ${bundleLine(accepter)} (goods and tax). You hold ${bundleLine(holdingOf(state, seat))}.`);
	return undefined;
}

// The goods change hands, the counters count the trade, and later goods become a pending delivery.
function execute(ctx: Ctx, offer: Offer, resident: string, tax: number, fee: number): void {
	const state = ctx.state;
	const split = escrowSplit(state, offer.from, offer.later);
	state.holdings[offer.from] = minus(plus(holdingOf(state, offer.from), offer.get), proposerNeeds(ctx, offer.from, offer));
	state.reserved[offer.from] = plus(state.reserved[offer.from] ?? empty(), split.fromShipment);
	state.holdings[resident] = minus(plus(holdingOf(state, resident), offer.give), accepterNeeds(ctx, offer));
	offer.status = "accepted";
	offer.by = resident;
	const proposerStats = statsOf(state, offer.from);
	const accepterStats = statsOf(state, resident);
	proposerStats.trades += 1;
	accepterStats.trades += 1;
	proposerStats.taxPaid += tax;
	accepterStats.taxPaid += tax;
	proposerStats.feesPaid += fee;
	if (offer.later !== undefined) {
		state.counter += 1;
		state.pledges.push({ id: `P${String(state.counter)}`, offer: offer.id, game: state.game, from: offer.from, to: resident, goods: copyBundle(offer.later.goods), due: offer.later.round, escrow: offer.later.escrow, delivered: empty(), fromShipment: split.fromShipment, status: "pending" });
	}
}

// The sentence of the delivery a trade left owed, or "".
const promiseLine = (pledge: Pledge | undefined, offer: Offer, resident: string): string =>
	pledge === undefined ? "" : ` ${pledge.id}: ${offer.from} owes ${resident} ${bundleLine(pledge.goods)} by the end of round ${String(pledge.due)} (${pledge.escrow ? "escrow, the bank delivers" : "a promise; the bank only records whether it is kept"}).`;

/**
 * The tool `accept`: the bank executes the trade and tells the table.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param id - The offer's id as the caller wrote it.
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function acceptNow(ctx: Ctx, resident: string | undefined, id: string): ToolSuccess | Refusal {
	const refusal = acceptProblem(ctx, resident, id);
	const state = ctx.state;
	const offer = findOffer(state, id);
	if (refusal !== undefined || resident === undefined || offer === undefined) return refusal ?? refuse("NO_SUCH_OFFER", `There is no offer ${id}.`);
	const tax = taxOf(ctx, offer.give, offer.get);
	const fee = offer.later?.escrow === true ? ctx.options.escrowFee : 0;
	execute(ctx, offer, resident, tax, fee);
	ctx.emit("market_trade", { game: state.game, round: state.round, offer: offer.id, from: offer.from, to: resident, give: copyBundle(offer.give), get: copyBundle(offer.get), ...(offer.later === undefined ? {} : { later: structuredClone(offer.later) }), tax, fee });
	ctx.emit("market_offer_closed", { game: state.game, id: offer.id, status: "accepted", by: resident, note: "" });
	const promise = promiseLine(state.pledges.find((other) => other.offer === offer.id), offer, resident);
	const costs = tax + fee > 0 ? ` Tax ${String(tax)} salt each side${fee > 0 ? `, escrow fee ${String(fee)} salt` : ""}.` : "";
	tell(ctx, others(state, resident), `Trade ${offer.id}: ${offer.from} gave ${bundleLine(offer.give)} to ${resident} for ${bundleLine(offer.get)}.${costs}${promise}`);
	return reply(`Trade ${offer.id} done: you got ${bundleLine(offer.give)} and gave ${bundleLine(offer.get)}.${costs}${promise} You now hold ${bundleLine(holdingOf(state, resident))}. When you are done, end your turn.`);
}

const noteOf = (text: string): string => (text === "" ? "" : ` Note: "${text}"`);

// The offer closes as declined or withdrawn.
function close(ctx: Ctx, offer: Offer, resident: string, status: "declined" | "withdrawn", text: string): ToolSuccess {
	offer.status = status;
	ctx.emit("market_offer_closed", { game: ctx.state.game, id: offer.id, status, by: resident, note: text });
	return reply(`Offer ${offer.id} ${status}. When you are done, end your turn.`);
}

// An offer to all stays open for the others; the proposer only learns that this trader passed (P140).
function pass(ctx: Ctx, offer: Offer, resident: string, text: string): ToolSuccess {
	ctx.emit("market_offer_passed", { game: ctx.state.game, id: offer.id, by: resident, note: text });
	tell(ctx, [offer.from], `${resident} passed on your open offer ${offer.id}.${noteOf(text)}`);
	return reply(`You passed on ${offer.id}; it stays open for the others. When you are done, end your turn.`);
}

/**
 * The tools `decline` and `withdraw`: the offer closes (a decline of an offer to all is a pass).
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @param id - The offer's id as the caller wrote it.
 * @param status - `declined` or `withdrawn`.
 * @param note - A note to the proposer ("" for none).
 * @returns The reply, or the refusal.
 *
 * @public
 */
export function closeOffer(ctx: Ctx, resident: string | undefined, id: string, status: "declined" | "withdrawn", note: string): ToolSuccess | Refusal {
	const seat = traderOf(ctx, resident);
	if (typeof seat !== "string") return seat;
	const offer = openOffer(ctx.state, id);
	if (!isOffer(offer)) return offer;
	if (status === "withdrawn" && offer.from !== seat) return refuse("NOT_YOURS", `Offer ${offer.id} is not yours.`);
	const text = note.trim();
	if (status === "withdrawn") return close(ctx, offer, seat, status, text);
	if (offer.to === ALL && offer.from !== seat) return pass(ctx, offer, seat, text);
	if (offer.to !== seat) return refuse("NOT_FOR_YOU", `Offer ${offer.id} is for ${offer.to}.`);
	tell(ctx, [offer.from], `${seat} declined your offer ${offer.id}.${noteOf(text)}`);
	return close(ctx, offer, seat, status, text);
}

/**
 * Closes the offers whose time ran out: an offer lives until the end of the round after the one it was made in, and
 * every open offer ends with the game's last round.
 *
 * @param ctx - The context of the mechanic.
 * @param round - The round that ends.
 * @param last - True when it is the last round of the game.
 *
 * @public
 */
export function expireOffers(ctx: Ctx, round: number, last: boolean): void {
	for (const offer of ctx.state.offers) {
		if (offer.status !== "open" || (!last && offer.round >= round)) continue;
		offer.status = "expired";
		ctx.emit("market_offer_closed", { game: offer.game, id: offer.id, status: "expired", by: "", note: "" });
		tell(ctx, [offer.from], `Your offer ${offer.id} expired.`);
	}
}
