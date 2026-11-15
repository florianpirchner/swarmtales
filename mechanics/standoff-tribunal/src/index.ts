// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `standoff-tribunal` mechanic: the holdout tribunal of Whispers over a resident who keeps a fragment back,
 * part 1 (issue M5-29). Every tick it reports the blockers (`blocker_found`, `blocker_cleared` and the fact
 * `blockers`), the Director calls a tribunal with `callTribunal` through the note desk of `channels`, the accused has
 * its grace, the tribunal is dropped once nobody lacks the fragment, and after the grace the first vote opens and the
 * city announces it when the Director does not. The residents read the tribunal in their status line and its rule
 * under every new task. The votes, the lot and the strike follow with issue M5-30. Ported from the old
 * `mechanics/standoff-tribunal/src`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import type { RandomSource } from "@swarmtales/contracts";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { defineMechanic } from "@swarmtales/sdk";
import { standoffTribunalHead, type ToolCtx } from "./head.ts";
import { courtFor, holdoutLines } from "./ports.ts";
import { BlockersFact, blockersOf, computeHoldoutSection, HoldoutSectionFact, PendingFact, pendingOf, SessionFact, sessionOf } from "./section.ts";
import { checkLine, runCallTribunal } from "./tools.ts";

export { HoldoutPiecesService, StandoffTribunalEvents } from "./contract.ts";
export { HoldoutCourt, type CallError, type Called } from "./court.ts";
export { StandoffTribunalOptions, standoffTribunalHead, type Ctx, type ToolCtx, type View } from "./head.ts";
export { BlockersFact, HoldoutSectionFact, PendingFact, SessionFact, type HoldoutSection } from "./section.ts";
export { HoldoutSlice, type HoldoutState } from "./slice.ts";
export type { Blocker, BlockerFact, HoldoutData, HoldoutOutcome, HoldoutPending, HoldoutPorts, HoldoutRule, HoldoutStage, HoldoutTexts, Presence, Session, VoteResult } from "./types.ts";

/** The share of the times a sample is asked in which it gives a call. */
const RATE = 0.25;

// A call on the first blocker while none runs and the pause is over, for the fake driver.
function sampleCall(ctx: ToolCtx, random: RandomSource): { accused: string[]; reason: string } | undefined {
	const data = ctx.state.data;
	const blocker = [...data.blockers.values()][0];
	if (random.next() >= RATE || blocker === undefined || data.session !== undefined || ctx.tick < data.cooldownUntil) return undefined;
	return { accused: [blocker.blocker], reason: `Tribunal ${String(data.tribunals + 1)}: ${blocker.blocker} holds back a fragment of door ${String(blocker.door)}.` };
}

/**
 * The holdout tribunal.
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "whispers", residents: 6, mechanics: [ledger(), channels(), puzzles(), progression(), exile(), standoffTribunal(holdout)], end: { ticks: 26 } });
 * ```
 *
 * @public
 */
export const standoffTribunal = defineMechanic(standoffTribunalHead, {
	tools: {
		callTribunal: {
			check: ({ reason }, ctx) => checkLine(ctx, reason),
			run: ({ accused, reason }, ctx) => runCallTribunal(ctx, accused, reason),
			sample: sampleCall,
		},
	},
	hooks: {
		// After the door clock of `progression`, which it requires and so loads after (old minuteStarted 800 after 700).
		tickStarted: (ctx) => {
			courtFor(ctx).tick(ctx.tick);
		},
		turnInputs: (resident, ctx) => holdoutLines(ctx, resident),
		// The rule goes under a task once per level, as the task itself.
		activationOpened: (resident, ctx) => {
			ctx.state.data.shown.set(resident, ctx.call(ProgressionService, "levelOf", { resident }));
		},
	},
	facts: {
		/** The old `holdoutLines` of the gamemaker's situation read these. */
		blockers: { output: BlockersFact, compute: blockersOf },
		session: { output: SessionFact, compute: sessionOf },
		pending: { output: PendingFact, compute: pendingOf },
		cooldownUntil: { output: Type.Integer({ description: "No tribunal is called before this tick; 0 when none ended" }), compute: (view) => view.state.data.cooldownUntil },
		struck: { output: Type.Array(Type.String({ description: "A resident id" }), { description: "The struck, in order" }), compute: (view) => [...view.state.data.struck] },
		/** All of them with the tick, the stall and the city: what the gamemaker's report reads (M5-34). */
		section: { output: HoldoutSectionFact, compute: computeHoldoutSection },
	},
});
