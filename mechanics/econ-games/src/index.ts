// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `econ-games` mechanic: a match of classic experimental-economics games for solo seats, one game
 * after another, each over several rounds (docs/ideas/game-roadmap.md §2.2):
 * - `public-goods`: everyone gets an endowment and secretly puts some into a fund that is multiplied
 *   and split equally;
 * - `ultimatum`: rotating pairs, the proposer offers a part of a sum, the responder accepts (the split
 *   holds) or rejects (both get nothing);
 * - `dilemma`: rotating pairs choose A or B at the same time from a payoff table (A is cooperation).
 * The framing is neutral (a shared fund, a split offer, an A-or-B choice): no game is named, so a
 * model has to play the numbers rather than recite a textbook answer. Decisions are sealed (event
 * audience `human`) until a round resolves; a decision not made by the deadline takes the default
 * (nothing put in, no offer, reject, B) and is marked missed. Whether a seat is told the number of
 * rounds is an option (`showHorizon`, off by default against end-game defection). Each game ends
 * with `block_scored`, the distance from Nash play and from the social optimum, for the human only.
 * A strategy brain plugs in through `BrainSourceService` (it may hold the next game for a retro) and
 * `StrategyBrainService` (game start and end); without one the match runs on its own.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic, reply, type ToolCtxOf } from "@swarmtales/sdk";
import { advance, decide, problemWith, refreshLocks, startNext } from "./flow.ts";
import { econGamesHead, type EconGamesView } from "./head.ts";
import type { Action } from "./model.ts";
import { inputLines, tableText } from "./texts.ts";

export { econGamesHead, type EconGamesCtx, type EconGamesView } from "./head.ts";
export type { Block } from "./model.ts";

/** The share of the times the fake driver (`--fake`) is asked in which it looks at the table. */
const FAKE_RATE = 0.125;

// Whether the caller owes the decision `action` now: what the `sample` of each decision tool asks first. 0 is in the range of every decision.
const owes = (ctx: ToolCtxOf<typeof econGamesHead>, action: Action): boolean => problemWith(ctx, ctx.resident, action, 0) === undefined;

/**
 * The econ games: public goods, ultimatum and an A-or-B dilemma in rounds for solo seats.
 *
 * @example
 * ```ts
 * const games = econGames({ blocks: [{ game: "ultimatum", rounds: 6 }, { game: "dilemma", rounds: 5 }], showHorizon: false });
 * ```
 *
 * @public
 */
export const econGames = defineMechanic(econGamesHead, {
	tools: {
		viewTable: { sample: (ctx, random) => (ctx.resident !== undefined && random.next() < FAKE_RATE ? {} : undefined), run: (_params, ctx) => reply(tableText(ctx, ctx.resident)) },
		contribute: {
			sample: (ctx, random) => (owes(ctx, "contribute") ? { amount: random.int(0, ctx.options.endowment) } : undefined),
			check: (params, ctx) => problemWith(ctx, ctx.resident, "contribute", params.amount),
			run: (params, ctx) => decide(ctx, ctx.resident, "contribute", params.amount, params.reason),
		},
		offer: {
			sample: (ctx, random) => (owes(ctx, "offer") ? { amount: random.int(0, ctx.options.pie) } : undefined),
			check: (params, ctx) => problemWith(ctx, ctx.resident, "offer", params.amount),
			run: (params, ctx) => decide(ctx, ctx.resident, "offer", params.amount, params.reason),
		},
		respond: {
			sample: (ctx, random) => (owes(ctx, "respond") ? { accept: random.next() < 0.5 } : undefined),
			check: (params, ctx) => problemWith(ctx, ctx.resident, "respond", params.accept ? 1 : 0),
			run: (params, ctx) => decide(ctx, ctx.resident, "respond", params.accept ? 1 : 0, params.reason),
		},
		choose: {
			sample: (ctx, random) => (owes(ctx, "choose") ? { option: random.pick(["A", "B"] as const) } : undefined),
			check: (params, ctx) => problemWith(ctx, ctx.resident, "choose", params.option === "A" ? 1 : 0),
			run: (params, ctx) => decide(ctx, ctx.resident, "choose", params.option === "A" ? 1 : 0, params.reason),
		},
	},
	services: {
		"brain-source": {
			game: (_input, ctx) => ctx.state.block,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.tick + 1, "nextBlock");
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
		tickEnded: (ctx) => {
			const state = ctx.state;
			if (!state.running || state.phase === "idle" || ctx.tick - state.opened + 1 < ctx.options.deadline) return;
			state.missed = [...state.missed, ...state.owing];
			state.owing = [];
			refreshLocks(ctx);
			advance(ctx, ctx.tick + 1);
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.phase !== "idle" && ctx.state.owing.includes(resident),
		turnInputs: (resident, ctx) => inputLines(ctx, resident),
	},
	jobs: {
		nextBlock: (ctx) => {
			startNext(ctx);
		},
	},
	limits: { match: { summary: "Breaches once the last game of the match is over.", breached: (view: EconGamesView) => (view.state.finished ? "the match is over" : undefined) } },
	facts: {
		scores: { output: Type.Record(Type.String(), Type.Number()), compute: (view) => ({ ...view.state.scores }) },
	},
});
