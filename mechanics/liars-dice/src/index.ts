// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `liars-dice` mechanic: the traditional bluffing game with hidden dice for solo seats. A match is several
 * games. In a game every seat starts with the same number of dice; each round every seat still in rolls its dice in
 * secret (seeded), and the seats take turns in table order: each either bids higher ("at least 4 x 5 on the whole
 * table") or calls the last bid a lie (`liar`). A call reveals every die: if the table holds at least the bid's
 * quantity of its face, the caller loses a die, else the bidder does; ones are wild (they count for every face and
 * cannot be bid on) unless the game turns that off. The loser opens the next round (or the next seat still in, if it
 * is out). A seat without dice is out; the last seat with dice wins the game. Places score points (default 3, 2, 1, 0).
 *
 * Every die is kept by the mechanic: the rolls (`dice_rolled`) and the reasons a seat gives are for the human only,
 * so a bluff stays a bluff; a seat sees only its own dice, the dice counts and the public record of bids, calls and
 * reveals. A bid may carry a short public remark (`say`, table talk; off with `talk: false`). Every bid is checked
 * (it must beat the standing bid and fit on the table). A seat that does not act by the deadline calls liar, or
 * opens with the lowest bid. Every decision is scored against a simple probability baseline (the seat's own dice,
 * every other die fair and unknown; it reads nothing into the bids) in `dice_decision_scored`, and every game ends
 * with `dice_game_scored` (bluffs, calls won, agreement), both for the human and the reporter only. A strategy brain
 * plugs in through `BrainSourceService` and `StrategyBrainService`, as in the econ lab.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic, reply } from "@swarmtales/sdk";
import { actForLate, startNext } from "./flow.ts";
import { liarsDiceHead, type LiarsDiceView } from "./head.ts";
import { bidNow, bidRefusal, liarNow, liarRefusal, sampleBid, sampleView } from "./moves.ts";
import { inputLines, tableText } from "./texts.ts";

export { liarsDiceHead, type LiarsDiceCtx, type LiarsDiceView } from "./head.ts";
export { DiceSlice, type DiceState } from "./model.ts";

/**
 * Liar's dice: secret seeded rolls, bids that must beat the standing bid, liar calls that show every die.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "dice", residents: 4, mechanics: [liarsDice({ games: 1 })], locked: ["bid", "liar"], end: { ticks: 80 }, win: { fact: "liars-dice.scores" } });
 * ```
 *
 * @public
 */
export const liarsDice = defineMechanic(liarsDiceHead, {
	tools: {
		viewTable: { run: (_params, ctx) => reply(tableText(ctx, ctx.resident)), sample: (ctx, random) => sampleView(ctx, ctx.resident, random) },
		bid: {
			check: (params, ctx) => bidRefusal(ctx, ctx.resident, { quantity: params.quantity, face: params.face }),
			run: (params, ctx) => bidNow(ctx, ctx.resident, { quantity: params.quantity, face: params.face }, params.say, params.reason),
			sample: (ctx, random) => sampleBid(ctx, ctx.resident, random),
		},
		liar: {
			check: (_params, ctx) => liarRefusal(ctx, ctx.resident),
			run: (params, ctx) => liarNow(ctx, ctx.resident, params.say, params.reason),
			// A call for the seat to act once a bid stands.
			sample: (ctx) => (liarRefusal(ctx, ctx.resident) === undefined ? {} : undefined),
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
		news: (resident, ctx) => ctx.state.running && ctx.state.toAct === resident,
		turnInputs: (resident, ctx) => inputLines(ctx, resident),
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: LiarsDiceView) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
	},
});
