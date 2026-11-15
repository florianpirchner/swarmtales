// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `sealed-auction` mechanic: solo seats bid on a series of lots, one lot at a time, with sealed
 * bids and a purse per game. Three kinds of lot measure three classic auction skills against closed-form
 * single-lot references:
 * - `first-price` (pay your bid, private values): how far a bidder shades below its value, against the
 *   symmetric equilibrium bid min + (n-1)/n (v - min);
 * - `second-price` (pay the runner-up, private values): bidding the own value is the dominant strategy;
 * - `common` (one hidden worth, a noisy estimate each, pay your bid): the winner's curse; a bid above the
 *   estimate - noise (n-1)/(n+1) expects a loss whenever it wins.
 * The framing is neutral (no textbook names). Values and estimates are dealt from the seed and told only
 * to their owner (event audience `human`); bids are sealed until the lot resolves, then every bid, the
 * winner, the price and a common lot's worth are public. A bid not made by the deadline is a pass.
 * Each game ends with `game_scored` (the reference metrics), for the human and the reporter only.
 * A strategy brain plugs in through `BrainSourceService` and `StrategyBrainService`, as in the econ lab.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/sdk";
import { closeLate, startNext } from "./flow.ts";
import { sealedAuctionHead, type SealedAuctionView } from "./head.ts";
import { placeBid, problemWith, sampleBid, sampleView } from "./moves.ts";
import { auctionText, inputLines } from "./texts.ts";

export { sealedAuctionHead, type SealedAuctionCtx, type SealedAuctionView } from "./head.ts";
export { AuctionSlice, type AuctionState } from "./model.ts";
export { Reference, referenceOf } from "./reference.ts";
export { curseFreeCeiling, dealLots, equilibriumBid, Lot, LotKind, LotResult, resolveLot, type DrawSource, type Rules } from "./rules.ts";

/**
 * The sealed auction: sealed bids on a series of lots with a purse per game, and a reference score per game.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "auction", residents: 4, mechanics: [sealedAuction({ games: 1 })], locked: ["bid"], end: { ticks: 20 }, win: { fact: "sealed-auction.scores" } });
 * ```
 *
 * @public
 */
export const sealedAuction = defineMechanic(sealedAuctionHead, {
	tools: {
		viewAuction: { run: (_params, ctx) => reply(auctionText(ctx, ctx.resident)), sample: (ctx, random) => sampleView(ctx, ctx.resident, random) },
		bid: {
			check: (params, ctx) => problemWith(ctx, ctx.resident, params.amount),
			run: (params, ctx) => placeBid(ctx, ctx.resident, params.amount, params.reason),
			sample: (ctx, random) => sampleBid(ctx, ctx.resident, random),
		},
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
		// After the strategy brain's runStarted phase, which may hold the first game back (old hook numbers -100 before 0).
		runStarted: {
			after: ["strategy-brain"],
			run: (ctx) => {
				startNext(ctx);
			},
		},
		// After the strategy brain, as the old hook numbers had it (300 before 350).
		tickEnded: {
			after: ["strategy-brain"],
			run: (ctx) => {
				closeLate(ctx);
			},
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.open && ctx.state.owing.includes(resident),
		turnInputs: (resident, ctx) => inputLines(ctx, resident),
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: SealedAuctionView) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
	},
});
