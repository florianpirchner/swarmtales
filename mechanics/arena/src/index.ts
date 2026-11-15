// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `arena` mechanic: the City's run frame reduced to its game rules (decision A57). It writes `run_start` and
 * `run_end`, the standings after every tick (`round_end`), stops the run when the game says it is over (every
 * resident finished, the seats decided, the tribunal's act over) and brakes an act that runs too long. It keeps the
 * points part of the old novelty: a resident whose points moved since its last turn has news. It asks `progression`
 * and `ledger`, and `exile` and the tribunal's `tribunal-view` when they are loaded; nobody asks it back.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { defineMechanic } from "@swarmtales/sdk";
import { runEnded, runStarted, tickEnded, tickStarted } from "./frame.ts";
import { runFrameHead } from "./head.ts";
import { seatsDecided, stopReason } from "./stop.ts";

export { RunFrameEvents, Standing, TribunalViewService } from "./contract.ts";
export { runFrameHead, RunFrameOptions, RunFrameSlice, type RunFrameCtx, type RunFrameState, type RunFrameView } from "./head.ts";

/**
 * The arena: the run's start and end lines, the standings per tick, the stop rules and the act brakes.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), puzzles(), progression({ levels }), runFrame({ story: "cityofkeys", stopWhenDone: true })], end: { ticks: 80 } });
 * ```
 *
 * @public
 */
export const runFrame = defineMechanic(runFrameHead, {
	hooks: {
		runStarted,
		tickStarted,
		// The first activation of a tick ends its stop check (old: the minute's first pass had started).
		activationOpened: (resident, ctx) => {
			ctx.state.stopDue = false;
			ctx.state.activated.add(resident);
		},
		// Old `#markSeen`: at block size 1 the resident saw its points as they stand at the end of its turn.
		activationClosed: (resident, ctx) => {
			ctx.state.seenPoints.set(resident, ctx.call(LedgerService, "balance", { account: resident }));
		},
		// The points part of the old novelty: a balance that moved since the resident last looked.
		news: (resident, ctx) => {
			const points = ctx.state.seenPoints.get(resident);
			return points !== undefined && points !== ctx.call(LedgerService, "balance", { account: resident });
		},
		tickEnded,
		// After the acts end, the open petitions fail and the treasuries settle (old `HOOK_ORDER.runEnded`).
		runEnded: { after: ["progression", "petitions", "channels"], run: runEnded },
	},
	limits: {
		stop: {
			summary: "The run stops where the old arena stopped it: every resident finished, the seats decided, or the tribunal's act over.",
			breached: (view) => (view.state.stopDue ? stopReason(view) : undefined),
		},
	},
	facts: {
		// Non-null once the run will stop: the gamemaker takes no look then (old `arena.stopping`).
		stopping: {
			output: Type.Union([Type.String({ description: "The reason" }), Type.Null({ description: "The run goes on" })], { description: "Why the run will stop, or null" }),
			compute: (view) => view.state.reason ?? stopReason(view) ?? null,
		},
		seatsDecided: { output: Type.Boolean({ description: "True once no open reward can change who survives" }), compute: (view) => seatsDecided(view) },
	},
});
