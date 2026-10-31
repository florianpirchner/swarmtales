/**
 * The `standoff-tribunal` mechanic (carve step 15, team T4b, docs/design/carve-round2-T4.md): the
 * holdout tribunal over a resident who keeps a fragment back. The logic is the old
 * `HoldoutTribunal` (court.ts) over the state this mechanic holds; the old `World` wiring is here
 * (world.ts `#lackingFacts`, `#presentAtDoors`, `#onStruck`, `#withHoldoutRule`, `holdoutParts`
 * of turn-input.ts and the gamemaker's four tools of gamemaker.ts).
 */
import { Type } from "typebox";
import { defineMechanic, refuse } from "@swarmtales/kernel";
import { HOOK_ORDER, PuzzlesApi, StandoffTribunalApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { standoffTribunalHead } from "./head.ts";
import { courtFor, holdoutParts } from "./ports.ts";
import { holdoutSnapshot } from "./slice.ts";
import { gamemakerTools, residentTools } from "./tools.ts";

export { standoffTribunalHead } from "./head.ts";

const Id = Type.String();
const Int = Type.Integer();

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
		blockers: kit.fact(Type.Array(Type.Object({ door: Int, blocker: Id, lacking: Type.Array(Id), passed: Type.Boolean(), since: Int })), (view) =>
			[...view.state.data.blockers.values()]
				.sort((a, b) => a.door - b.door || a.blocker.localeCompare(b.blocker))
				.map((blocker) => ({ door: blocker.door, blocker: blocker.blocker, lacking: [...blocker.lacking], passed: blocker.passed, since: blocker.since })),
		),
		session: kit.fact(
			Type.Union([
				Type.Object({
					number: Int,
					accused: Id,
					door: Int,
					stage: Type.String(),
					until: Int,
					vote: Int,
					maxVotes: Int,
					/** Who still lacks the accused's fragment of its door (old `lackingNow`), read when the fact is. */
					lacking: Type.Array(Id),
					lastResult: Type.Optional(Type.Object({ vote: Int, yes: Int, no: Int })),
					drawn: Type.Optional(Id),
				}),
				Type.Null(),
			]),
			(view) => {
				const session = view.state.data.session;
				if (session === undefined) return null;
				return {
					number: session.number,
					accused: session.accused,
					door: session.door,
					stage: session.stage,
					until: session.until,
					vote: session.vote,
					maxVotes: view.options.maxVotes,
					lacking: [...view.call(PuzzlesApi, "lacking", { level: session.door, holder: session.accused })],
					...(session.lastResult === undefined ? {} : { lastResult: { ...session.lastResult } }),
					...(session.drawn === undefined ? {} : { drawn: session.drawn }),
				};
			},
		),
		pending: kit.fact(Type.Union([Type.Object({ tribunal: Int, kind: Type.String(), facts: Type.String(), text: Type.String(), due: Int }), Type.Null()]), (view) =>
			view.state.data.pending === undefined ? null : { ...view.state.data.pending },
		),
		cooldownUntil: kit.fact(Int, (view) => view.state.data.cooldownUntil),
		struck: kit.fact(Type.Array(Id), (view) => [...view.state.data.struck]),
	},
	snapshot: kit.snapshot(holdoutSnapshot),
}));
