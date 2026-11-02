/**
 * The `standoff-tribunal` mechanic (carve step 15, team T4b, docs/design/carve-round2-T4.md): the
 * holdout tribunal over a resident who keeps a fragment back. The logic is the old
 * `HoldoutTribunal` (court.ts) over the state this mechanic holds; the old `World` wiring is here
 * (world.ts `#lackingFacts`, `#presentAtDoors`, `#onStruck`, `#withHoldoutRule`, `holdoutParts`
 * of turn-input.ts and the gamemaker's four tools of gamemaker.ts).
 */
import { Type } from "typebox";
import { defineMechanic, refuse } from "@swarmtales/kernel";
import { HOOK_ORDER, StandoffTribunalApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { standoffTribunalHead } from "./head.ts";
import { courtFor, holdoutParts } from "./ports.ts";
import { holdoutSnapshot } from "./slice.ts";
import { gamemakerTools, residentTools } from "./tools.ts";
import { BlockersFact, blockersOf, computeHoldoutSection, HoldoutSectionFact, PendingFact, pendingOf, SessionFact, sessionOf } from "./section.ts";

export { standoffTribunalHead } from "./head.ts";
export { HoldoutSectionFact, holdoutSectionOf, renderHoldoutSection, type HoldoutSection } from "./section.ts";

export const standoffTribunal = defineMechanic(standoffTribunalHead, (kit) => ({
	tools: [...residentTools(kit), ...gamemakerTools(kit)],
	services: [
		kit.provide(StandoffTribunalApi, {
			exemptFromCap: ({ from, to }, ctx) => courtFor(ctx).exemptFromCap(from, to),
			// The old `#withHoldoutRule`: the rule under every door's task (the mechanic plays only in a run with the gamemaker).
			taskLine: (_input, ctx) => ctx.options.texts.rule,
		}),
	],
	pipeline: {
		/** The old `enabledTools`: `tribunalVote` while the resident may cast a ballot. */
		lock: (call, ctx) => {
			if (call.owner !== "standoff-tribunal" || call.tool !== "tribunalVote" || call.resident === undefined) return undefined;
			return courtFor(ctx).canVote(call.resident) ? undefined : refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {}));
		},
	},
	hooks: {
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.standoffTribunal,
			run: (ctx) => {
				courtFor(ctx).tick(ctx.minute);
			},
		},
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => holdoutParts(ctx, resident).map((text) => ({ kind: "status", text, order: STATUS_ORDER.holdout })),
		},
	},
	facts: {
		/** The old `holdoutLines` of the gamemaker's situation read these (the lacking of the accused: `PuzzlesApi.lacking` of its door). */
		blockers: kit.fact(BlockersFact, (view) => blockersOf(view)),
		session: kit.fact(SessionFact, (view) => sessionOf(view)),
		pending: kit.fact(PendingFact, (view) => pendingOf(view)),
		cooldownUntil: kit.fact(Type.Integer(), (view) => view.state.data.cooldownUntil),
		struck: kit.fact(Type.Array(Type.String()), (view) => [...view.state.data.struck]),
		/** All of them with the minute, the stall rule and the city, the gamemaker's holdout lines (`renderHoldoutSection`; step 18, item 2). */
		section: kit.fact(HoldoutSectionFact, (view) => computeHoldoutSection(view)),
	},
	snapshot: kit.snapshot(holdoutSnapshot),
}));
