// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rules of Salt Market, the negotiation game for solo seats. A match is several games; a game is a few rounds of
 * open trading among the traders. Each trader holds a bundle of five goods (salt, cloth, copper, spice, wax), values
 * each perishable good privately (1 to 4 points a unit; salt is worth `saltValue` to everyone) and has a secret
 * contract: a bundle of three goods that pays a bonus if it holds at least that much when the game ends. The goods
 * each trader needs sit mostly with the others, so nobody fills a contract without trading.
 *
 * The bank is the only way goods move:
 * - `offer` (to one trader or to all): what the proposer gives now, what it wants now, and optionally goods it
 *   delivers later, at the end of a named round. Later goods are either a plain promise (the proposer must deliver
 *   them with `give`; the bank records whether it did) or held in **escrow** for a fee (the bank takes them at the
 *   trade and delivers them itself).
 * - `accept` executes an offer only if both sides hold what it moves at that moment; `decline` and `withdraw` close
 *   it. An offer lives until the end of the round after the one it was made in.
 * - A trade that moves more than `taxFree` units costs each side `tax` salt.
 * - `give` hands goods over without anything back (to keep a promise, or as a side payment).
 * - `say` sends a short message, to everyone or to one trader; it moves nothing.
 *
 * Part of each trader's goods arrives as one **shipment** at the end of a later round; until then the trader can sell
 * those goods only on credit (a plain promise, or escrow the bank reserves from the shipment). Deals **rotate** by
 * default, so every trader plays every position once. Goods **spoil**: at the end of every round but the last, the
 * good announced at the round's start spoils in every stock of 2 or more. Holdings are public; values and contracts
 * are secret until the game's end. Every game is scored against the optimum in `market_game_scored`, for the human
 * only. A strategy brain plugs in through `BrainSourceService` and `StrategyBrainService`, as in the econ lab.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/sdk";
import { startNext } from "./flow.ts";
import { giveNow } from "./give.ts";
import { saltMarketHead, type SaltMarketView } from "./head.ts";
import { acceptNow, acceptProblem, closeOffer, offerNow, offerProblem } from "./offers.ts";
import { roundClock } from "./round.ts";
import { sampleAccept, sampleDecline, sampleGive, sampleOffer, sampleSay, sampleView, sampleWithdraw } from "./samples.ts";
import { sayNow } from "./say.ts";
import { hasNews, inputLines, marketText } from "./texts.ts";

export { saltMarketHead, type SaltMarketCtx, type SaltMarketView } from "./head.ts";
export { MarketSlice, type MarketState } from "./model.ts";

/**
 * Salt Market: offers through a bank, trades with a tax, escrowed or plain promises, shipments and spoilage.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "salt-market", residents: 4, mechanics: [saltMarket({ games: 4 })], grants: { resident: ["viewMarket", "offer", "accept", "decline", "withdraw", "give", "say"] }, end: { ticks: 40 }, win: { fact: "salt-market.scores" } });
 * ```
 *
 * @public
 */
export const saltMarket = defineMechanic(saltMarketHead, {
	tools: {
		viewMarket: { run: (_params, ctx) => reply(marketText(ctx, ctx.resident)), sample: (ctx, random) => sampleView(ctx, ctx.resident, random) },
		offer: { check: (params, ctx) => offerProblem(ctx, ctx.resident, params), run: (params, ctx) => offerNow(ctx, ctx.resident, params), sample: (ctx, random) => sampleOffer(ctx, ctx.resident, random) },
		accept: { check: (params, ctx) => acceptProblem(ctx, ctx.resident, params.offer), run: (params, ctx) => acceptNow(ctx, ctx.resident, params.offer), sample: (ctx, random) => sampleAccept(ctx, ctx.resident, random) },
		decline: { run: (params, ctx) => closeOffer(ctx, ctx.resident, params.offer, "declined", params.note ?? ""), sample: (ctx, random) => sampleDecline(ctx, ctx.resident, random) },
		withdraw: { run: (params, ctx) => closeOffer(ctx, ctx.resident, params.offer, "withdrawn", ""), sample: (ctx, random) => sampleWithdraw(ctx, ctx.resident, random) },
		give: { run: (params, ctx) => giveNow(ctx, ctx.resident, params.to, params.goods, params.note ?? ""), sample: (ctx, random) => sampleGive(ctx, ctx.resident, random) },
		say: { run: (params, ctx) => sayNow(ctx, ctx.resident, params.text, params.to), sample: (ctx, random) => sampleSay(ctx, ctx.resident, random) },
	},
	services: {
		"brain-source": {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.tick + 1, "nextGame");
				return null;
			},
		},
	},
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			after: ["strategy-brain"],
			run: (ctx) => {
				startNext(ctx);
			},
		},
		// Before the strategy brain, as the old hook numbers had it (150 before 200): a game lists Salt Market first.
		tickEnded: (ctx) => {
			roundClock(ctx);
		},
		news: (resident, ctx) => hasNews(ctx, resident),
		// After the strategy brain's lines, as the old hook numbers had it (350 after 300).
		turnInputs: { after: ["strategy-brain"], run: (resident, ctx) => inputLines(ctx, resident) },
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: SaltMarketView) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
	},
});
