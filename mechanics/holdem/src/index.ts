// SPDX-License-Identifier: Apache-2.0
/**
 * The `holdem` mechanic: fixed-limit Texas Hold'em for solo seats, heads-up or at a full table. A match is several
 * games of several hands; the button moves one seat per hand. The deal is seeded; with `duplicate` on (the default)
 * every game replays the same deals with the seats moved one place, so over as many games as there are seats every
 * seat plays every position's cards once and the luck of the deal cancels out of the match totals. Hands have no
 * stacks (the raise cap bounds a hand), so there is no all-in and no side pot.
 *
 * A seat sees only its own cards (its turn lines and `viewTable`); `cards_dealt` with every hole card is for the
 * human only. Every decision is scored against a simple equity baseline (Monte Carlo equity against the opponents'
 * ranges as their actions narrow them, pot odds, one street; not a solver; the equity against random hands is
 * recorded beside it) in `decision_scored`, and each game ends with `game_scored` (net points, VPIP, PFR,
 * aggression, agreement with the baseline, EV loss), both for the human and the reporter only; the reasons a seat
 * gives for its actions stay there too, so a bluff stays a bluff. With `aid` the seat to act reads that range equity
 * and the pot odds it needs (only the `aidSeats` at a mixed table). A seat that does not act by the deadline checks,
 * or folds when it has a bet to face. A strategy brain plugs in through `BrainSourceService` and
 * `StrategyBrainService`, as in the econ lab.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/sdk";
import { actForLate, startNext } from "./flow.ts";
import { ACT, holdemHead, type HoldemView } from "./head.ts";
import { actNow, actRefusal, sampleAct, sampleView } from "./moves.ts";
import { inputLines, tableText } from "./texts.ts";

export { holdemHead, type HoldemCtx, type HoldemToolCtx, type HoldemView } from "./head.ts";
export { HoldemSlice, type HoldemState } from "./model.ts";

/**
 * Fixed-limit hold'em: seeded duplicate deals, private hole cards, checked actions, showdown and an equity baseline.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "holdem", residents: 4, mechanics: [holdem({ games: 4, hands: 8 })], locked: ["act"], end: { ticks: 400 }, win: { fact: "holdem.scores" } });
 * ```
 *
 * @public
 */
export const holdem = defineMechanic(holdemHead, {
	tools: {
		viewTable: { run: (_params, ctx) => reply(tableText(ctx, ctx.resident)), sample: (ctx, random) => sampleView(ctx, ctx.resident, random) },
		[ACT]: {
			check: (params, ctx) => actRefusal(ctx, ctx.resident, params.action),
			run: (params, ctx) => actNow(ctx, ctx.resident, params.action, params.reason),
			sample: (ctx, random) => sampleAct(ctx, ctx.resident, random),
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
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			after: ["strategy-brain"],
			run: (ctx) => {
				startNext(ctx);
			},
		},
		// After the strategy brain, as the old hook numbers had it (300 before 360).
		tickEnded: {
			after: ["strategy-brain"],
			run: (ctx) => {
				actForLate(ctx);
			},
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.hand?.toAct === resident,
		turnInputs: (resident, ctx) => inputLines(ctx, resident),
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: HoldemView) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
	},
});
