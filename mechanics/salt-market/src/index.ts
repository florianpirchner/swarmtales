/**
 * The `salt-market` mechanic: the negotiation game Salt Market (docs/ideas/game-roadmap.md §2.7) for
 * solo seats. A match is several games; a game is a few rounds of open trading among the traders.
 * Each trader holds a bundle of five goods (salt, cloth, copper, spice, wax), values each perishable good
 * privately (1 to 4 points a unit; salt is 1 for everyone) and has a secret contract: a bundle of three
 * goods that pays a bonus if it holds at least that much when the game ends. The goods each trader needs
 * sit mostly with the others, so nobody fills a contract without trading.
 *
 * The bank is the only way goods move:
 * - `offer` (to one trader or to all): what the proposer gives now, what it wants now, and optionally
 *   goods it delivers later, at the end of a named round. Later goods are either a plain promise (the
 *   proposer must deliver them with `give`; the bank records whether it did) or held in **escrow** for a
 *   fee (the bank takes them at the trade and delivers them itself).
 * - `accept` executes an offer only if both sides hold what it moves at that moment; `decline` and
 *   `withdraw` close it. An offer lives until the end of the round after the one it was made in.
 * - A trade that moves more than `taxFree` units costs each side `tax` salt.
 * - `give` hands goods over without anything back (to keep a promise, or as a side payment).
 * - `say` sends a short message, to everyone or to one trader; it moves nothing.
 *
 * Part of each trader's goods arrives as one **shipment** at the end of a later round; until then the
 * trader can sell those goods only on credit (a plain promise, or escrow the bank reserves from the
 * shipment). Deals **rotate** by default: one deal per cycle of as many games as traders, passed on one
 * seat each game, so every trader plays every position once. Salt is worth 2 points to everyone.
 *
 * Goods **spoil**: at the end of every round but the last, the good announced at the round's start
 * spoils: every stock of 2 or more loses one unit (a quarter of a stock of 8 or more). Holdings are public (the
 * bank's book is open); values and contracts are secret until the game's end, so a trader may lie about
 * them. Every game is scored against the optimum (the best joint score of the start supply, an exact
 * search over which contracts to fill) in `market_game_scored`, for the human only: efficiency (the share
 * of the possible gains from trade realised), fairness (Gini of the surpluses) and the promises kept. A
 * strategy brain plugs in through `BrainSourceApi` and `StrategyBrainApi`, as in Quarry.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import {
	Bundle,
	bundleLine,
	goodsOf,
	idleHolding,
	rotated,
	bundleOf,
	copyBundle,
	covers,
	dealOf,
	empty,
	gini,
	GOODS,
	Later,
	MarketSlice,
	minus,
	Offer,
	optimumOf,
	PERISHABLE,
	Pledge,
	plus,
	Profile,
	Reference,
	scoreOf,
	size,
	spoilLoss,
	type Good,
	type MarketState,
	type Rules,
} from "./model.ts";


const ALL = "all";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 4, description: "Games in the match; the run ends after the last." }),
	rotate: Type.Boolean({ default: true, description: "Deals rotate: one deal per cycle of as many games as traders, passed on one seat each game, so every trader plays every position once (P141)." }),
	saltValue: Type.Integer({ minimum: 0, default: 2, description: "What a unit of salt is worth to every trader (P142)." }),
	shipShare: Type.Number({ minimum: 0, maximum: 1, default: 0.35, description: "The chance that a dealt unit of a perishable good comes in the trader's shipment at the end of a later round instead of at the start (P143)." }),
	rounds: Type.Integer({ minimum: 2, maximum: 20, default: 6, description: "Trading rounds per game." }),
	roundMinutes: Type.Integer({ minimum: 1, default: 1, description: "Minutes a round lasts." }),
	salt: Type.Integer({ minimum: 0, default: 6, description: "Salt every trader starts a game with." }),
	slack: Type.Integer({ minimum: 0, default: 2, description: "Units of each perishable good beyond the joint demand of the contracts." }),
	contractBonus: Type.Integer({ minimum: 0, default: 20, description: "Points for holding at least the contract bundle at the game's end." }),
	taxFree: Type.Integer({ minimum: 0, default: 6, description: "Units a trade may move now without tax." }),
	tax: Type.Integer({ minimum: 0, default: 1, description: "Salt each side pays for a trade that moves more than taxFree units." }),
	escrowFee: Type.Integer({ minimum: 0, default: 1, description: "Salt the proposer pays when the bank holds later goods in escrow." }),
	maxOpenOffers: Type.Integer({ minimum: 1, default: 3, description: "Open offers a trader may have at once." }),
	maxSays: Type.Integer({ minimum: 0, default: 3, description: "Messages a trader may send per round." }),
	spoil: Type.Boolean({ default: true, description: "Goods spoil at the end of each round but the last." }),
});

const head = defineHead({
	id: "salt-market",
	summary: "The negotiation game Salt Market for solo seats: five goods, secret values and contracts, offers through a bank, escrowed or plain promises, spoilage and a trade tax.",
	options,
	state: (setup): MarketState => ({
		seats: [...setup.residents],
		game: 0,
		round: 0,
		opened: 0,
		running: false,
		finished: false,
		held: false,
		due: false,
		profiles: {},
		holdings: {},
		offers: [],
		pledges: [],
		reserved: {},
		arrived: [],
		counter: 0,
		spoils: "",
		spoilLog: [],
		spoiled: {},
		says: {},
		inbox: {},
		briefed: [],
		told: {},
		stats: {},
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		gameScores: {},
		lastResult: "",
	}),
	events: {
		market_game_started: Type.Object({ game: Type.Integer(), seats: Type.Array(Type.String()), profiles: Type.Record(Type.String(), Profile, { description: "Values, contracts and start bundles (sealed: audience human)." }) }),
		market_round_started: Type.Object({ game: Type.Integer(), round: Type.Integer(), spoils: Type.String() }),
		market_offer_made: Offer,
		market_offer_closed: Type.Object({ game: Type.Integer(), id: Type.String(), status: Type.String(), by: Type.String(), note: Type.String() }),
		market_offer_passed: Type.Object({ game: Type.Integer(), id: Type.String(), by: Type.String(), note: Type.String() }),
		market_trade: Type.Object({
			game: Type.Integer(),
			round: Type.Integer(),
			offer: Type.String(),
			from: Type.String(),
			to: Type.String(),
			give: Bundle,
			get: Bundle,
			later: Type.Optional(Later),
			tax: Type.Integer(),
			fee: Type.Integer(),
		}),
		market_gift: Type.Object({ game: Type.Integer(), round: Type.Integer(), from: Type.String(), to: Type.String(), goods: Bundle, note: Type.String() }),
		market_said: Type.Object({ game: Type.Integer(), round: Type.Integer(), from: Type.String(), to: Type.String(), text: Type.String() }),
		market_promise_settled: Pledge,
		market_shipment_arrived: Type.Object({ game: Type.Integer(), round: Type.Integer(), trader: Type.String(), shipment: Bundle, escrow: Bundle }),
		market_spoiled: Type.Object({ game: Type.Integer(), round: Type.Integer(), good: Type.String(), losses: Type.Record(Type.String(), Type.Integer()) }),
		market_game_ended: Type.Object({
			game: Type.Integer(),
			holdings: Type.Record(Type.String(), Bundle),
			profiles: Type.Record(Type.String(), Profile),
			scores: Type.Record(Type.String(), Type.Number()),
			met: Type.Array(Type.String()),
			totals: Type.Record(Type.String(), Type.Number()),
		}),
		market_game_scored: Type.Object({ game: Type.Integer(), reference: Reference }),
		market_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// Sealed: the deal; private messages; the reference score is for the human and the reporter only.
	audiences: { market_game_started: ["human"], market_said: ["human"], market_game_scored: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi],
	prompts: {
		"salt-market/tools/viewMarket": [],
		"salt-market/tools/offer": [],
		"salt-market/tools/accept": [],
		"salt-market/tools/decline": [],
		"salt-market/tools/withdraw": [],
		"salt-market/tools/give": [],
		"salt-market/tools/say": [],
		"salt-market/rules": ["seats", "games", "rounds", "salt", "saltValue", "contractBonus", "taxFree", "tax", "escrowFee", "maxOpenOffers", "maxSays", "spoil", "rotation"],
		"salt-market/game-head": ["game", "games"],
		"salt-market/round": ["round", "rounds", "spoils", "goods", "book", "shipments", "offers", "pledges"],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const rulesOf = (ctx: Ctx): Rules => ({ contractBonus: ctx.options.contractBonus });
const holdingOf = (state: MarketState, seat: string): Bundle => state.holdings[seat] ?? empty();
const statsOf = (state: MarketState, seat: string) => {
	const stats = state.stats[seat] ?? { trades: 0, offers: 0, says: 0, taxPaid: 0, feesPaid: 0 };
	state.stats[seat] = stats;
	return stats;
};

/** Queues a line for the next turn of each of `seats`. */
function tell(ctx: Ctx, seats: readonly string[], line: string): void {
	for (const seat of seats) {
		const inbox = ctx.state.inbox[seat] ?? [];
		inbox.push(line);
		ctx.state.inbox[seat] = inbox;
	}
}

const others = (state: MarketState, seat: string): string[] => state.seats.filter((other) => other !== seat);

/** `A02 (you)` for the reader, the bare id otherwise. */
const who = (seat: string, reader: string | undefined): string => (seat === reader ? `${seat} (you)` : seat);

function offerLine(offer: Offer, reader: string | undefined): string {
	const to = offer.to === ALL ? "anyone" : who(offer.to, reader);
	const later = offer.later === undefined ? "" : `; later, by the end of round ${String(offer.later.round)}, ${who(offer.from, reader)} delivers ${bundleLine(offer.later.goods)} (${offer.later.escrow ? "held in escrow by the bank" : "a promise, not escrowed"})`;
	const note = offer.note === "" ? "" : ` Note: "${offer.note}"`;
	return `${offer.id} from ${who(offer.from, reader)} to ${to}: ${who(offer.from, reader)} gives ${bundleLine(offer.give)} and wants ${bundleLine(offer.get)}${later}.${note}`;
}

function bookLine(state: MarketState, reader: string | undefined): string {
	return state.seats.map((seat) => `${who(seat, reader)}: ${bundleLine(holdingOf(state, seat))}`).join("; ");
}

/** The shipments still to come, public: `A02 (you) 3 spice at the end of round 3 (1 spice held for escrow)`. */
function shipmentsLine(state: MarketState, reader: string | undefined): string {
	const coming = state.seats.filter((seat) => !state.arrived.includes(seat) && size(state.profiles[seat]?.shipment ?? empty()) > 0);
	if (coming.length === 0) return "none";
	return coming
		.map((seat) => {
			const profile = state.profiles[seat];
			const reserved = state.reserved[seat] ?? empty();
			return `${who(seat, reader)} ${bundleLine(profile?.shipment ?? empty())} at the end of round ${String(profile?.arrives ?? 0)}${size(reserved) > 0 ? ` (${bundleLine(reserved)} held for escrow)` : ""}`;
		})
		.join("; ");
}

/** What of `seat`'s shipment is still free for escrow due by the end of `round` (none once it arrived, or if it comes later). */
function freeShipment(state: MarketState, seat: string, round: number): Bundle {
	const profile = state.profiles[seat];
	if (profile === undefined || state.arrived.includes(seat) || profile.arrives === 0 || profile.arrives > round) return empty();
	return minus(profile.shipment, state.reserved[seat] ?? empty());
}

/** How escrowed later goods are covered: from the free shipment first, the rest from holdings. */
function escrowSplit(state: MarketState, seat: string, later: Later | undefined): { readonly fromShipment: Bundle; readonly fromHoldings: Bundle } {
	if (later?.escrow !== true) return { fromShipment: empty(), fromHoldings: empty() };
	const free = freeShipment(state, seat, later.round);
	const fromShipment = empty();
	for (const good of GOODS) fromShipment[good] = Math.min(free[good], later.goods[good]);
	return { fromShipment, fromHoldings: minus(later.goods, fromShipment) };
}

/** The offers `reader` can act on or made itself. */
function openOffersFor(state: MarketState, reader: string): Offer[] {
	return state.offers.filter((offer) => offer.status === "open" && (offer.from === reader || offer.to === reader || offer.to === ALL));
}

function pledgesLine(state: MarketState, reader: string): string {
	const mine = state.pledges.filter((pledge) => pledge.status === "pending" && (pledge.from === reader || pledge.to === reader));
	if (mine.length === 0) return "none";
	return mine
		.map((pledge) => {
			const left = pledge.escrow ? pledge.goods : minus(pledge.goods, pledge.delivered);
			return `${pledge.id}: ${who(pledge.from, reader)} owes ${who(pledge.to, reader)} ${bundleLine(left)} by the end of round ${String(pledge.due)} (${pledge.escrow ? "escrow" : "promise"})`;
		})
		.join("; ");
}

function privateLine(state: MarketState, seat: string): string {
	const profile = state.profiles[seat];
	if (profile === undefined) return "";
	const values = GOODS.map((good) => `${good} ${String(profile.values[good])}`).join(", ");
	return `Secret, only you know this: each unit is worth to you ${values} points. Your contract: hold at least ${bundleLine(profile.contract)} when the game ends.`;
}

function rulesText(ctx: Ctx): string {
	const { games, rounds, salt, contractBonus, taxFree, tax, escrowFee, maxOpenOffers, maxSays } = ctx.options;
	const spoil = ctx.options.spoil ? "At the end of every round but the last, one perishable good (announced when the round starts) spoils: every trader holding 2 or more units of it loses one, and a quarter (rounded down) of a stock of 8 or more; a single unit keeps." : "Goods do not spoil in this match.";
	const rotation = ctx.options.rotate ? ` The deals rotate: every ${String(ctx.state.seats.length)} games use the same ${String(ctx.state.seats.length)} positions (goods, values, contract, shipment), passed on one seat each game, so every trader plays every position once.` : "";
	return ctx.prompt("salt-market/rules", { seats: ctx.state.seats.length, games, rounds, salt, saltValue: ctx.options.saltValue, contractBonus, taxFree, tax, escrowFee, maxOpenOffers, maxSays, spoil, rotation });
}

function roundText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	const offers = openOffersFor(state, seat);
	return ctx.prompt("salt-market/round", {
		round: state.round,
		rounds: ctx.options.rounds,
		spoils: state.spoils === "" ? "nothing spoils at the end of this round" : `${state.spoils} spoils at the end of this round`,
		goods: `${bundleLine(holdingOf(state, seat))}. ${privateLine(state, seat)}`,
		book: bookLine(state, seat),
		shipments: shipmentsLine(state, seat),
		offers: offers.length === 0 ? "none" : offers.map((offer) => offerLine(offer, seat)).join(" | "),
		pledges: pledgesLine(state, seat),
	});
}

function startRound(ctx: Ctx, round: number, minute: number): void {
	const state = ctx.state;
	state.round = round;
	state.opened = minute;
	state.says = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.spoils = ctx.options.spoil && round < ctx.options.rounds ? ctx.rng("salt-market", "spoil", state.game, round).pick(PERISHABLE) : "";
	ctx.emit("market_round_started", { game: state.game, round, spoils: state.spoils });
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	const n = state.seats.length;
	const cycle = ctx.options.rotate ? Math.floor((game - 1) / n) + 1 : game;
	const base = dealOf(state.seats, ctx.rng("salt-market", "deal", cycle), { salt: ctx.options.salt, saltValue: ctx.options.saltValue, slack: ctx.options.slack, rounds: ctx.options.rounds, shipShare: ctx.options.shipShare });
	state.profiles = ctx.options.rotate ? rotated(base, state.seats, (game - 1) % n) : base;
	state.reserved = Object.fromEntries(state.seats.map((seat) => [seat, empty()]));
	state.arrived = [];
	state.spoilLog = [];
	state.holdings = Object.fromEntries(state.seats.map((seat) => [seat, copyBundle(state.profiles[seat]?.start ?? empty())]));
	state.offers = [];
	state.pledges = [];
	state.counter = 0;
	state.spoiled = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.stats = Object.fromEntries(state.seats.map((seat) => [seat, { trades: 0, offers: 0, says: 0, taxPaid: 0, feesPaid: 0 }]));
	state.inbox = {};
	state.briefed = [];
	state.told = {};
	state.gameScores = {};
	state.running = true;
	ctx.emit("market_game_started", { game, seats: [...state.seats], profiles: structuredClone(state.profiles) });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: "" });
	startRound(ctx, 1, ctx.minute);
}

function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

/** The shipments due this round arrive; what the bank holds for escrow stays with it. */
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

/** The pledges due this round: escrow is delivered by the bank; a plain promise is kept when the proposer gave the goods. */
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

function expireOffers(ctx: Ctx, round: number, last: boolean): void {
	for (const offer of ctx.state.offers) {
		if (offer.status !== "open" || (!last && offer.round >= round)) continue;
		offer.status = "expired";
		ctx.emit("market_offer_closed", { game: offer.game, id: offer.id, status: "expired", by: "", note: "" });
		tell(ctx, [offer.from], `Your offer ${offer.id} expired.`);
	}
}

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

function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${String(scores[seat] ?? 0)}`).join(", ");
}

function referenceOf(ctx: Ctx): Reference {
	const state = ctx.state;
	const rules = rulesOf(ctx);
	const startSupply = state.seats.reduce((sum, seat) => plus(sum, goodsOf(state.profiles[seat] ?? { values: empty(), contract: empty(), start: empty(), shipment: empty(), arrives: 0 })), empty());
	// Goods held in escrow at the end were delivered before scoring; nothing is still in the bank.
	const endSupply = state.seats.reduce((sum, seat) => plus(sum, holdingOf(state, seat)), empty());
	const optimum = optimumOf(state.profiles, startSupply, rules);
	const endOptimum = optimumOf(state.profiles, endSupply, rules);
	const seats: Record<string, Reference["seats"][string]> = {};
	let startTotal = 0;
	let total = 0;
	for (const seat of state.seats) {
		const profile = state.profiles[seat];
		if (profile === undefined) continue;
		const start = scoreOf(profile, goodsOf(profile), rules).total;
		const end = scoreOf(profile, holdingOf(state, seat), rules);
		const stats = statsOf(state, seat);
		const promises = state.pledges.filter((pledge) => pledge.from === seat && !pledge.escrow);
		startTotal += start;
		total += end.total;
		seats[seat] = {
			start,
			score: end.total,
			surplus: end.total - start,
			met: end.met,
			trades: stats.trades,
			offers: stats.offers,
			says: stats.says,
			taxPaid: stats.taxPaid,
			feesPaid: stats.feesPaid,
			spoiled: state.spoiled[seat] ?? 0,
			promises: promises.length,
			escrows: state.pledges.filter((pledge) => pledge.from === seat && pledge.escrow).length,
			kept: promises.filter((pledge) => pledge.status === "kept").length,
			broken: promises.filter((pledge) => pledge.status === "broken").length,
		};
	}
	const gains = optimum.total - startTotal;
	const idleTotal = state.seats.reduce((sum, seat) => {
		const profile = state.profiles[seat];
		return profile === undefined ? sum : sum + scoreOf(profile, idleHolding(profile, state.spoilLog), rules).total;
	}, 0);
	const round3 = (value: number): number => Math.round(value * 1000) / 1000;
	return {
		seats,
		startTotal,
		total,
		optimum: optimum.total,
		optimumContracts: [...optimum.contracts],
		endOptimum: endOptimum.total,
		efficiency: gains <= 0 ? 0 : round3((total - startTotal) / gains),
		idleTotal,
		gainOverIdle: optimum.total - idleTotal <= 0 ? 0 : round3((total - idleTotal) / (optimum.total - idleTotal)),
		allocative: endOptimum.total <= 0 ? 0 : round3(total / endOptimum.total),
		gini: gini(Object.values(seats).map((seat) => seat.surplus)),
		contractsMet: Object.values(seats).filter((seat) => seat.met).length,
		trades: state.offers.filter((offer) => offer.status === "accepted").length,
	};
}

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	state.running = false;
	const rules = rulesOf(ctx);
	const met: string[] = [];
	for (const seat of state.seats) {
		const profile = state.profiles[seat];
		const result = profile === undefined ? { total: 0, met: false } : scoreOf(profile, holdingOf(state, seat), rules);
		state.gameScores[seat] = result.total;
		if (result.met) met.push(seat);
		state.scores[seat] = (state.scores[seat] ?? 0) + result.total;
	}
	ctx.emit("market_game_ended", { game: state.game, holdings: structuredClone(state.holdings), profiles: structuredClone(state.profiles), scores: { ...state.gameScores }, met, totals: { ...state.scores } });
	ctx.emit("market_game_scored", { game: state.game, reference: referenceOf(ctx) });
	const contracts = state.seats.map((seat) => `${seat} wanted ${bundleLine(state.profiles[seat]?.contract ?? empty())} (${met.includes(seat) ? "filled" : "not filled"})`).join("; ");
	const broken = state.pledges.filter((pledge) => pledge.status === "broken").map((pledge) => `${pledge.from} to ${pledge.to}`);
	state.lastResult = `points ${scoreLine(state.gameScores, state.seats)}; contracts: ${contracts}; trades ${String(state.offers.filter((offer) => offer.status === "accepted").length)}; broken promises: ${broken.length === 0 ? "none" : broken.join(", ")}`;
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: state.lastResult });
	if (last) ctx.emit("market_match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.minute + 1, "nextGame");
}

function endRound(ctx: Ctx): void {
	const state = ctx.state;
	const round = state.round;
	const last = round >= ctx.options.rounds;
	arriveShipments(ctx, round);
	settlePledges(ctx, round);
	expireOffers(ctx, round, last);
	spoilRound(ctx, round);
	if (last) endGame(ctx);
	else startRound(ctx, round + 1, ctx.minute + 1);
}

const normalize = (id: string): string => id.trim().toUpperCase();
const seatOf = (state: MarketState, id: string): string | undefined => state.seats.find((seat) => seat === normalize(id));

/** Why `resident` may not trade at all right now, or undefined. */
function closed(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("MARKET_CLOSED", "The market is closed between games; wait for the next game.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_TRADER", "You have no seat at this market.");
	return undefined;
}

type GoodsParams = Partial<Record<Good, number>>;
interface OfferParams {
	readonly to: string;
	readonly give?: GoodsParams;
	readonly get?: GoodsParams;
	readonly later?: GoodsParams & { readonly round: number; readonly escrow?: boolean };
	readonly note?: string;
}

function laterOf(params: OfferParams): Later | undefined {
	if (params.later === undefined) return undefined;
	const goods = bundleOf(params.later);
	return size(goods) === 0 ? undefined : { goods, round: params.later.round, escrow: params.later.escrow ?? false };
}

/** What a trade costs each side in salt: the tax when it moves more than `taxFree` units now. */
const taxOf = (ctx: Ctx, give: Bundle, get: Bundle): number => (size(give) + size(get) > ctx.options.taxFree ? ctx.options.tax : 0);

/** What the proposer needs to hold for a trade: the goods it gives now, escrowed later goods its shipment does not cover, the tax and the fee, in salt. */
function proposerNeeds(ctx: Ctx, from: string, offer: { readonly give: Bundle; readonly get: Bundle; readonly later?: Later | undefined }): Bundle {
	const escrow = escrowSplit(ctx.state, from, offer.later).fromHoldings;
	const salt = taxOf(ctx, offer.give, offer.get) + (offer.later?.escrow === true ? ctx.options.escrowFee : 0);
	return plus(plus(offer.give, escrow), { ...empty(), salt });
}

function accepterNeeds(ctx: Ctx, offer: { readonly give: Bundle; readonly get: Bundle }): Bundle {
	return plus(offer.get, { ...empty(), salt: taxOf(ctx, offer.give, offer.get) });
}

function offerProblem(ctx: Ctx, resident: string | undefined, params: OfferParams): Refusal | undefined {
	const shut = closed(ctx, resident);
	if (shut !== undefined || resident === undefined) return shut ?? refuse("NOT_A_TRADER", "You have no seat at this market.");
	const state = ctx.state;
	const to = params.to.trim().toLowerCase() === ALL ? ALL : seatOf(state, params.to);
	if (to === undefined) return refuse("UNKNOWN_TRADER", `${params.to} is not a trader here. Traders: ${others(state, resident).join(", ")}, or all.`);
	if (to === resident) return refuse("SELF_OFFER", "You cannot trade with yourself.");
	const give = bundleOf(params.give);
	const get = bundleOf(params.get);
	const later = laterOf(params);
	if (size(give) + size(get) + (later === undefined ? 0 : size(later.goods)) === 0) return refuse("EMPTY_OFFER", "An offer must move at least one unit.");
	if (size(get) === 0 && later === undefined) return refuse("USE_GIVE", "An offer that asks for nothing is a gift; use give.");
	if (later !== undefined && (later.round <= state.round || later.round > ctx.options.rounds)) return refuse("BAD_ROUND", `Later goods must be due in a later round of this game (${String(state.round + 1)} to ${String(ctx.options.rounds)}).`);
	const own = state.profiles[resident];
	if (later !== undefined && !later.escrow && own !== undefined && !state.arrived.includes(resident) && own.arrives >= later.round && !covers(holdingOf(state, resident), later.goods)) {
		// A plain promise of goods still to come: the shipment lands at the end of its round, after the last turn of that round (P148).
		return refuse("TOO_EARLY_FOR_SHIPMENT", `Your shipment arrives at the end of round ${String(own.arrives)}, after your last turn of that round, so you could not hand those goods over by round ${String(later.round)}. Make the promise due in round ${String(own.arrives + 1)} or later, or use escrow (the bank delivers from the shipment).`);
	}
	if (state.offers.filter((offer) => offer.status === "open" && offer.from === resident).length >= ctx.options.maxOpenOffers) return refuse("TOO_MANY_OFFERS", `You have ${String(ctx.options.maxOpenOffers)} open offers; withdraw one first.`);
	const needs = proposerNeeds(ctx, resident, { give, get, later });
	if (!covers(holdingOf(state, resident), needs)) return refuse("CANNOT_COVER", `You do not hold ${bundleLine(needs)} (goods, escrow, tax and fee). You hold ${bundleLine(holdingOf(state, resident))}.`);
	return undefined;
}

function offerNow(ctx: Ctx, resident: string | undefined, params: OfferParams): ToolSuccess | Refusal {
	const refusal = offerProblem(ctx, resident, params);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_TRADER", "You have no seat at this market.");
	const state = ctx.state;
	state.counter += 1;
	const later = laterOf(params);
	const offer: Offer = {
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
	state.offers.push(offer);
	statsOf(state, resident).offers += 1;
	ctx.emit("market_offer_made", structuredClone(offer));
	const audience = offer.to === ALL ? others(state, resident) : [offer.to];
	for (const seat of audience) tell(ctx, [seat], `New offer ${offerLine(offer, seat)} (accept or decline it by id; it lasts until the end of round ${String(state.round + 1)}).`);
	const tax = taxOf(ctx, offer.give, offer.get);
	return reply(`Offer ${offer.id} is open: ${offerLine(offer, resident)}${tax > 0 ? ` Tax if taken: ${String(tax)} salt each side.` : ""} When you are done, end your turn.`);
}

function acceptProblem(ctx: Ctx, resident: string | undefined, id: string): Refusal | undefined {
	const shut = closed(ctx, resident);
	if (shut !== undefined || resident === undefined) return shut ?? refuse("NOT_A_TRADER", "You have no seat at this market.");
	const state = ctx.state;
	const offer = state.offers.find((other) => other.id === normalize(id));
	if (offer === undefined) return refuse("NO_SUCH_OFFER", `There is no offer ${id} in this game.`);
	if (offer.status !== "open") return refuse("OFFER_CLOSED", `Offer ${offer.id} is ${offer.status}.`);
	if (offer.from === resident) return refuse("OWN_OFFER", "You cannot accept your own offer; withdraw it instead.");
	if (offer.to !== ALL && offer.to !== resident) return refuse("NOT_FOR_YOU", `Offer ${offer.id} is for ${offer.to}.`);
	const proposer = proposerNeeds(ctx, offer.from, offer);
	if (!covers(holdingOf(state, offer.from), proposer)) return refuse("PROPOSER_CANNOT_COVER", `${offer.from} no longer holds ${bundleLine(proposer)}; the bank cannot execute ${offer.id}.`);
	const accepter = accepterNeeds(ctx, offer);
	if (!covers(holdingOf(state, resident), accepter)) return refuse("CANNOT_COVER", `You do not hold ${bundleLine(accepter)} (goods and tax). You hold ${bundleLine(holdingOf(state, resident))}.`);
	return undefined;
}

function acceptNow(ctx: Ctx, resident: string | undefined, id: string): ToolSuccess | Refusal {
	const refusal = acceptProblem(ctx, resident, id);
	const state = ctx.state;
	const offer = state.offers.find((other) => other.id === normalize(id));
	if (refusal !== undefined || resident === undefined || offer === undefined) return refusal ?? refuse("NO_SUCH_OFFER", `There is no offer ${id}.`);
	const tax = taxOf(ctx, offer.give, offer.get);
	const fee = offer.later?.escrow === true ? ctx.options.escrowFee : 0;
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
	ctx.emit("market_trade", { game: state.game, round: state.round, offer: offer.id, from: offer.from, to: resident, give: copyBundle(offer.give), get: copyBundle(offer.get), ...(offer.later === undefined ? {} : { later: structuredClone(offer.later) }), tax, fee });
	ctx.emit("market_offer_closed", { game: state.game, id: offer.id, status: "accepted", by: resident, note: "" });
	const pledge = state.pledges.find((other) => other.offer === offer.id);
	const promise = pledge === undefined ? "" : ` ${pledge.id}: ${offer.from} owes ${resident} ${bundleLine(pledge.goods)} by the end of round ${String(pledge.due)} (${pledge.escrow ? "escrow, the bank delivers" : "a promise; the bank only records whether it is kept"}).`;
	const costs = tax + fee > 0 ? ` Tax ${String(tax)} salt each side${fee > 0 ? `, escrow fee ${String(fee)} salt` : ""}.` : "";
	tell(ctx, others(state, resident), `Trade ${offer.id}: ${offer.from} gave ${bundleLine(offer.give)} to ${resident} for ${bundleLine(offer.get)}.${costs}${promise}`);
	return reply(`Trade ${offer.id} done: you got ${bundleLine(offer.give)} and gave ${bundleLine(offer.get)}.${costs}${promise} You now hold ${bundleLine(holdingOf(state, resident))}. When you are done, end your turn.`);
}

function closeOffer(ctx: Ctx, resident: string | undefined, id: string, status: "declined" | "withdrawn", note: string): ToolSuccess | Refusal {
	const shut = closed(ctx, resident);
	if (shut !== undefined || resident === undefined) return shut ?? refuse("NOT_A_TRADER", "You have no seat at this market.");
	const state = ctx.state;
	const offer = state.offers.find((other) => other.id === normalize(id));
	if (offer === undefined) return refuse("NO_SUCH_OFFER", `There is no offer ${id} in this game.`);
	if (offer.status !== "open") return refuse("OFFER_CLOSED", `Offer ${offer.id} is ${offer.status}.`);
	if (status === "withdrawn" && offer.from !== resident) return refuse("NOT_YOURS", `Offer ${offer.id} is not yours.`);
	const text = note.trim();
	if (status === "declined" && offer.to === ALL && offer.from !== resident) {
		// An offer to all stays open for the others; the proposer only learns that this trader passed (P140).
		ctx.emit("market_offer_passed", { game: state.game, id: offer.id, by: resident, note: text });
		tell(ctx, [offer.from], `${resident} passed on your open offer ${offer.id}.${text === "" ? "" : ` Note: "${text}"`}`);
		return reply(`You passed on ${offer.id}; it stays open for the others. When you are done, end your turn.`);
	}
	if (status === "declined" && offer.to !== resident) return refuse("NOT_FOR_YOU", `Offer ${offer.id} is for ${offer.to}.`);
	offer.status = status;
	ctx.emit("market_offer_closed", { game: state.game, id: offer.id, status, by: resident, note: text });
	if (status === "declined") tell(ctx, [offer.from], `${resident} declined your offer ${offer.id}.${text === "" ? "" : ` Note: "${text}"`}`);
	return reply(`Offer ${offer.id} ${status}. When you are done, end your turn.`);
}

function giveNow(ctx: Ctx, resident: string | undefined, toId: string, goodsParams: GoodsParams | undefined, note: string): ToolSuccess | Refusal {
	const shut = closed(ctx, resident);
	if (shut !== undefined || resident === undefined) return shut ?? refuse("NOT_A_TRADER", "You have no seat at this market.");
	const state = ctx.state;
	const to = seatOf(state, toId);
	if (to === undefined || to === resident) return refuse("UNKNOWN_TRADER", `${toId} is not another trader. Traders: ${others(state, resident).join(", ")}.`);
	const goods = bundleOf(goodsParams);
	if (size(goods) === 0) return refuse("EMPTY_GIFT", "Name at least one unit to give.");
	if (!covers(holdingOf(state, resident), goods)) return refuse("CANNOT_COVER", `You do not hold ${bundleLine(goods)}. You hold ${bundleLine(holdingOf(state, resident))}.`);
	state.holdings[resident] = minus(holdingOf(state, resident), goods);
	state.holdings[to] = plus(holdingOf(state, to), goods);
	// The goods count toward the giver's open promises to the receiver, oldest first.
	const rest = copyBundle(goods);
	for (const pledge of state.pledges) {
		if (pledge.status !== "pending" || pledge.escrow || pledge.from !== resident || pledge.to !== to) continue;
		for (const good of GOODS) {
			const owed = Math.max(0, pledge.goods[good] - pledge.delivered[good]);
			const paid = Math.min(owed, rest[good]);
			pledge.delivered[good] += paid;
			rest[good] -= paid;
		}
	}
	const text = note.trim();
	ctx.emit("market_gift", { game: state.game, round: state.round, from: resident, to, goods: copyBundle(goods), note: text });
	tell(ctx, others(state, resident), `${resident} gave ${bundleLine(goods)} to ${to}.${text === "" ? "" : ` Note: "${text}"`}`);
	return reply(`Gave ${bundleLine(goods)} to ${to}. You now hold ${bundleLine(holdingOf(state, resident))}. When you are done, end your turn.`);
}

function sayNow(ctx: Ctx, resident: string | undefined, text: string, toId: string | undefined): ToolSuccess | Refusal {
	const shut = closed(ctx, resident);
	if (shut !== undefined || resident === undefined) return shut ?? refuse("NOT_A_TRADER", "You have no seat at this market.");
	const state = ctx.state;
	const to = toId === undefined || toId.trim() === "" || toId.trim().toLowerCase() === ALL ? ALL : seatOf(state, toId);
	if (to === undefined || to === resident) return refuse("UNKNOWN_TRADER", `${toId ?? ""} is not another trader. Traders: ${others(state, resident).join(", ")}, or all.`);
	if ((state.says[resident] ?? 0) >= ctx.options.maxSays) return refuse("TOO_MANY_MESSAGES", `You sent ${String(ctx.options.maxSays)} messages this round; wait for the next round.`);
	const message = text.trim();
	if (message === "") return refuse("EMPTY_MESSAGE", "Say something.");
	state.says[resident] = (state.says[resident] ?? 0) + 1;
	statsOf(state, resident).says += 1;
	ctx.emit("market_said", { game: state.game, round: state.round, from: resident, to, text: message });
	if (to === ALL) tell(ctx, others(state, resident), `${resident} to everyone: "${message}"`);
	else tell(ctx, [to], `${resident} to you (private): "${message}"`);
	return reply(`Sent${to === ALL ? " to everyone" : ` to ${to}`}. When you are done, end your turn.`);
}

function marketText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over: ${state.lastResult}. The next game starts soon.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) {
		lines.push(roundText(ctx, resident));
		lines.push(`Messages left this round: ${String(Math.max(0, ctx.options.maxSays - (state.says[resident] ?? 0)))}. Your points from earlier games: ${String(state.scores[resident] ?? 0)}.`);
	} else lines.push(`Holdings: ${bookLine(state, undefined)}.`);
	return lines.join("\n");
}

const goodsShape = (what: string) =>
	Type.Object(
		{
			salt: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
			cloth: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
			copper: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
			spice: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
			wax: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
		},
		{ description: what },
	);

const offerParams = Type.Object({
	to: Type.String({ minLength: 1, maxLength: 8, description: "The trader the offer is for (for example A02), or all: the first trader to accept takes it." }),
	give: Type.Optional(goodsShape("What you give now, by good (for example {\"cloth\": 2})." )),
	get: Type.Optional(goodsShape("What you want now in return, by good.")),
	later: Type.Optional(
		Type.Object(
			{
				salt: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				cloth: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				copper: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				spice: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				wax: Type.Optional(Type.Integer({ minimum: 0, maximum: 60 })),
				round: Type.Integer({ minimum: 1, maximum: 20, description: "The round at whose end you deliver." }),
				escrow: Type.Optional(Type.Boolean({ description: "true: the bank holds these goods from the trade on and delivers them (you pay the escrow fee); false or left out: a plain promise you keep with give." })),
			},
			{ description: "Optional: goods you deliver later, at the end of a later round of this game." },
		),
	),
	note: Type.Optional(Type.String({ maxLength: 300, description: "A short note the other side reads with the offer." })),
});

export const saltMarket = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewMarket",
			description: "salt-market/tools/viewMarket",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(marketText(ctx, ctx.resident)),
		}),
		kit.tool({
			name: "offer",
			description: "salt-market/tools/offer",
			parameters: offerParams,
			suggest: ["resident"],
			rule: (params, ctx) => offerProblem(ctx, ctx.resident, params),
			execute: (params, ctx) => offerNow(ctx, ctx.resident, params),
		}),
		kit.tool({
			name: "accept",
			description: "salt-market/tools/accept",
			parameters: Type.Object({ offer: Type.String({ minLength: 1, maxLength: 8, description: "The offer's id (for example O3)." }) }),
			suggest: ["resident"],
			rule: (params, ctx) => acceptProblem(ctx, ctx.resident, params.offer),
			execute: (params, ctx) => acceptNow(ctx, ctx.resident, params.offer),
		}),
		kit.tool({
			name: "decline",
			description: "salt-market/tools/decline",
			parameters: Type.Object({ offer: Type.String({ minLength: 1, maxLength: 8, description: "The offer's id." }), note: Type.Optional(Type.String({ maxLength: 300, description: "A short note to the proposer." })) }),
			suggest: ["resident"],
			execute: (params, ctx) => closeOffer(ctx, ctx.resident, params.offer, "declined", params.note ?? ""),
		}),
		kit.tool({
			name: "withdraw",
			description: "salt-market/tools/withdraw",
			parameters: Type.Object({ offer: Type.String({ minLength: 1, maxLength: 8, description: "The id of your own open offer." }) }),
			suggest: ["resident"],
			execute: (params, ctx) => closeOffer(ctx, ctx.resident, params.offer, "withdrawn", ""),
		}),
		kit.tool({
			name: "give",
			description: "salt-market/tools/give",
			parameters: Type.Object({
				to: Type.String({ minLength: 1, maxLength: 8, description: "The trader who gets the goods." }),
				goods: goodsShape("What you hand over, by good."),
				note: Type.Optional(Type.String({ maxLength: 300, description: "A short note, for example which promise this keeps." })),
			}),
			suggest: ["resident"],
			execute: (params, ctx) => giveNow(ctx, ctx.resident, params.to, params.goods, params.note ?? ""),
		}),
		kit.tool({
			name: "say",
			description: "salt-market/tools/say",
			parameters: Type.Object({
				text: Type.String({ minLength: 1, maxLength: 300, description: "The message." }),
				to: Type.Optional(Type.String({ maxLength: 8, description: "One trader for a private message; left out or all: everyone." })),
			}),
			suggest: ["resident"],
			execute: (params, ctx) => sayNow(ctx, ctx.resident, params.text, params.to),
		}),
	],
	services: [
		kit.provide(BrainSourceApi, {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.minute + 1, "nextGame");
				return null;
			},
		}),
	],
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.saltMarket,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.saltMarket,
			run: (ctx) => {
				const state = ctx.state;
				if (!state.running || ctx.minute - state.opened + 1 < ctx.options.roundMinutes) return;
				endRound(ctx);
			},
		},
		news: (resident, ctx) => ctx.state.running && ((ctx.state.inbox[resident]?.length ?? 0) > 0 || ctx.state.told[resident] !== ctx.state.round),
		turnInputs: {
			order: HOOK_ORDER.turnInputs.saltMarket,
			run: (resident, ctx) => {
				const state = ctx.state;
				if (!state.running || !state.seats.includes(resident)) return [];
				const lines: string[] = [];
				if (!state.briefed.includes(resident)) {
					state.briefed.push(resident);
					lines.push(`${ctx.prompt("salt-market/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`);
				}
				const inbox = state.inbox[resident] ?? [];
				if (inbox.length > 0) lines.push(`Since your last turn: ${inbox.join(" ")}`);
				state.inbox[resident] = [];
				if (state.told[resident] !== state.round) {
					state.told[resident] = state.round;
					lines.push(roundText(ctx, resident));
				} else {
					const offers = openOffersFor(state, resident);
					lines.push(`Round ${String(state.round)} of ${String(ctx.options.rounds)}. You hold ${bundleLine(holdingOf(state, resident))}. Open offers: ${offers.length === 0 ? "none" : offers.map((offer) => offer.id).join(", ")}.`);
				}
				return lines;
			},
		},
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: [kit.limit("match", "Breaches once the last game of the match is over.", (view: View) => (view.state.finished ? "the match is over" : undefined))],
	facts: {
		scores: kit.fact(Type.Record(Type.String(), Type.Number()), (view) => ({ ...view.state.scores })),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: MarketSlice,
		save: (state) => structuredClone(state),
		load: (data) => structuredClone(data),
	}),
}));
