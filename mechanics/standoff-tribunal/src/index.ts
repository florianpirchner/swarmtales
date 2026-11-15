// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `standoff-tribunal` mechanic: the holdout tribunal of Whispers over a resident who keeps a fragment back. Every
 * tick it reports the blockers (`blocker_found`, `blocker_cleared` and the fact `blockers`), the Director calls a
 * tribunal with `callTribunal` through the note desk of `channels`, the accused has its grace, the tribunal is dropped
 * once nobody lacks the fragment, and after the grace the others vote in secret with `tribunalVote`, up to
 * `maxVotes` times. After a unanimous vote the Director strikes the accused with `permaDeath`; after the last failed
 * vote it draws the lot with `drawLot` and strikes the one drawn; it announces each outcome with
 * `announceTribunal`, and the city does each itself after the fallback. The struck resident is banished through
 * `exile` (by `holdout`, keeping its points) and its fragments go to everyone left. The residents read the tribunal in
 * their status line and its rule under every new task. It provides the service `cap-exemption` of `mechanics/contracts`:
 * the accused's direct messages to those who still lack its fragment pass the cap of `channels`. Ported from the old `mechanics/standoff-tribunal/src`.
 *
 * @packageDocumentation
 */
import { Type } from "typebox";
import { ProgressionService, TaskLinesService } from "@swarmtales/mechanic-progression/contract";
import { defineMechanic, refuse } from "@swarmtales/sdk";
import { standoffTribunalHead } from "./head.ts";
import { courtFor, holdoutLines, TASK_ORDER } from "./ports.ts";
import { sampleAnnounce, sampleCall, sampleLot, sampleStrike, sampleVote } from "./samples.ts";
import { BlockersFact, blockersOf, computeHoldoutSection, HoldoutSectionFact, PendingFact, pendingOf, SessionFact, sessionOf } from "./section.ts";
import { checkLine, runAnnounce, runCallTribunal, runDrawLot, runPermaDeath, runVote } from "./tools.ts";

export { HoldoutPiecesService, StandoffTribunalEvents } from "./contract.ts";
export { HoldoutCourt, type AnnounceError, type CallError, type Called, type LotError, type StrikeError, type TribunalVoteError } from "./court.ts";
export { StandoffTribunalOptions, standoffTribunalHead, type Ctx, type ToolCtx, type View } from "./head.ts";
export { BlockersFact, HoldoutSectionFact, PendingFact, SessionFact, type HoldoutSection } from "./section.ts";
export { HoldoutSlice, type HoldoutState } from "./slice.ts";
export type { Blocker, BlockerFact, HoldoutData, HoldoutOutcome, HoldoutPending, HoldoutPorts, HoldoutRule, HoldoutStage, HoldoutTexts, Presence, Session, VoteResult } from "./types.ts";

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
	services: {
		// The accused's messages to those who still lack its fragment pass the cap of `channels` (old `exemptFromCap`).
		"cap-exemption": { exempt: ({ from, to }, ctx) => courtFor(ctx).exemptFromCap(from, to) },
	},
	tools: {
		tribunalVote: { run: ({ yes }, ctx) => runVote(ctx, yes), sample: sampleVote },
		callTribunal: {
			check: ({ reason }, ctx) => checkLine(ctx, reason),
			run: ({ accused, reason }, ctx) => runCallTribunal(ctx, accused, reason),
			sample: sampleCall,
		},
		drawLot: { run: ({ candidates }, ctx) => runDrawLot(ctx, candidates), sample: sampleLot },
		announceTribunal: { check: ({ text }, ctx) => checkLine(ctx, text), run: ({ text }, ctx) => runAnnounce(ctx, text), sample: sampleAnnounce },
		permaDeath: { check: ({ reason }, ctx) => checkLine(ctx, reason), run: ({ agent, reason }, ctx) => runPermaDeath(ctx, agent, reason), sample: sampleStrike },
	},
	pipeline: {
		// The old `enabledTools`: `tribunalVote` while the resident may cast a ballot.
		lock: (call, ctx) => {
			if (call.owner !== ctx.mechanic || call.tool !== "tribunalVote" || call.resident === undefined) return undefined;
			return courtFor(ctx).canVote(call.resident) ? undefined : refuse("TOOL_LOCKED", ctx.prompt("standoff-tribunal/replies/locked", {}));
		},
	},
	hooks: {
		// The rule goes under the task of every door-open notice too (old `withAddenda`, erratum J211).
		runStarted: (ctx) => {
			ctx.tryCall(TaskLinesService, "add", { order: TASK_ORDER, text: ctx.options.texts.rule });
		},
		// After the door clock of `progression`, which it requires and so loads after (old minuteStarted 800 after 700),
		// and after the standoff (old 500; erratum J146).
		tickStarted: {
			after: ["standoff"],
			run: (ctx) => {
				courtFor(ctx).tick(ctx.tick);
			},
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
