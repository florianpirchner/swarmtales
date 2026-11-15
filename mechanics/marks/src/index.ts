// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `marks` mechanic: the message allowance. A resident has a budget of marks per level (or one for the whole run),
 * each channel has a price, and the allowance resets whenever the resident changes level; the level is `levelOf` of
 * `progression` every time (the mechanic keeps no copy; `startLevel` answers where no progression runs). It prices
 * the tools of other mechanics in its own stage handlers, by bare name (`NO_MARKS` in `rule`, the charge and
 * `marks_spent` in `after`), shows what is left in the status line and the terms under a new task, and provides
 * `allowance`, through which the message tools name the marks left in their replies. Carried from the old
 * `mechanics/marks/src/index.ts`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/sdk";
import { statusOf } from "./book.ts";
import { marksHead } from "./head.ts";
import { bookOf, chargePrice, checkPrice, marksLines, priceNow } from "./prices.ts";

export { activeOn, canAfford, DEFAULT_RECEIPT_PRICE, priceOf, runWide, spend, statusOf, termsOn } from "./book.ts";
export type { Allowance, Book, Channel, MarksState, Prices, Range, Refill, Rules, Status, Terms } from "./book.ts";
export { MarksOptions, marksHead, type MarksCtx } from "./head.ts";

/**
 * The marks: the allowance, the prices on the message tools, the status part and the terms under a task.
 *
 * @example
 * ```ts
 * const rules = { fromLevel: 1, perRun: 5, prices: { board: 0, group: 0, dm: 0, receipt: 1 } };
 * const game = defineGame({ id: "whispers", residents: 6, mechanics: [ledger(), channels(), receipts(), marks({ rules })], end: { ticks: 20 } });
 * ```
 *
 * @public
 */
export const marks = defineMechanic(marksHead, {
	services: {
		allowance: {
			left: ({ resident }, ctx) => statusOf(ctx.state, bookOf(ctx), resident) ?? null,
			priceOf: ({ resident, channel }, ctx) => priceNow(ctx, resident, channel),
		},
	},
	pipeline: {
		rule: (call, ctx) => checkPrice(call, ctx),
		after: (call, outcome, ctx) => {
			chargePrice(call, outcome, ctx);
		},
	},
	hooks: {
		turnInputs: (resident, ctx) => marksLines(ctx, resident),
		// The terms go under a task once per level, as the task itself.
		activationOpened: (resident, ctx) => {
			ctx.state.shown.set(resident, bookOf(ctx).levelOf(resident));
		},
	},
	facts: {
		remaining: {
			output: Type.Record(Type.String(), Type.Number({ description: "The marks left" }), { description: "The marks left per resident that has an allowance" }),
			compute: (view) => Object.fromEntries([...view.state.allowances].map(([agent, allowance]) => [agent, allowance.remaining])),
		},
	},
});
