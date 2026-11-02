/**
 * The `script` mechanic (carve step 16, docs/design/carve-plan.md): the old `Director`
 * (packages/engine/src/director.ts) on the new core. Its triggers are listeners and one staged call
 * per minute; its actions are commands of the mechanics that own them.
 *
 * - `level_entered` (progression, after `level_up` and the holder notices) runs the `onEnter`,
 *   `onFirstEnter`, `onAllPast` and `onHolderBehind` rules at once (`immediate`,
 *   `LISTENER_ORDER.level_entered.script`), so their lines land before the `submission`.
 * - `cast_collected` runs the `onCollect` rules at once (D-2).
 * - `petition_resolved` runs the opening rule's `onPass`/`onFail` and the `onPetitionResolved` rules
 *   after the resolution's own lines (the board post), as the old listener did.
 * - The time triggers (`at`, `every`, `onAllPast`, `onUnansweredDm`, `onTeamSplit`,
 *   `onCollectionEnd`) run in the staged call `directorMinute`, staged in the script's
 *   `minuteStarted` phase. Staged calls run in order after the minute's phases: the petitions that
 *   expired this minute (`resolvePetition`, staged at `HOOK_ORDER.minuteStarted.petitions`) are
 *   resolved first, with their actions, as the old `startMinute` began with `expirePetitions`.
 *   Stories grant `directorMinute` (and `resolvePetition`) to `script`; a refused call ends the run.
 */
import { Type } from "typebox";
import { Check } from "typebox/value";
import { defineMechanic, defineTool, reply } from "@swarmtales/kernel";
import { CastEvents, HOOK_ORDER, LISTENER_ORDER, PetitionsEvents, ProgressionEvents } from "@swarmtales/mechanic-shared";
import { scriptHead } from "./head.ts";
import { DirectorSlice, FiringState, migrateV0 } from "./state.ts";
import { onCollect, onEnter, onPetitionResolved, startMinute } from "./triggers.ts";

export { scriptHead, ScriptOptions } from "./head.ts";
export { scriptOptionsFromStory } from "./from-story.ts";

/** The time triggers of a minute, as a call of the script (see above). */
export const DirectorMinute = defineTool("directorMinute", Type.Object({}));

const Refused = Type.Object({ ok: Type.Literal(false), code: Type.String() });

export const script = defineMechanic(scriptHead, (kit) => ({
	tools: [
		kit.tool({
			...DirectorMinute,
			description: "tools/directorMinute",
			suggest: ["script"],
			serves: ["script"],
			execute: (_params, ctx) => {
				startMinute(ctx);
				return reply("");
			},
		}),
	],
	jobs: {
		/** The minute's time triggers did not run: the story did not grant `directorMinute` to `script`. */
		minuteRan: (_ctx, outcome) => {
			if (Check(Refused, outcome)) throw new Error(`script: directorMinute was refused (${outcome.code}); grant it to script`);
		},
	},
	listeners: [
		kit.listen(
			ProgressionEvents,
			"level_entered",
			(payload, ctx) => {
				onEnter(ctx, payload.agent, payload.level);
			},
			{ immediate: true, order: LISTENER_ORDER.level_entered.script },
		),
		kit.listen(
			CastEvents,
			"cast_collected",
			(payload, ctx) => {
				for (const into of payload.into) onCollect(ctx, into, payload.from);
			},
			{ immediate: true },
		),
		kit.listen(PetitionsEvents, "petition_resolved", (payload, ctx) => {
			onPetitionResolved(ctx, payload.petition, payload.outcome);
		}),
	],
	hooks: {
		minuteStarted: {
			order: HOOK_ORDER.minuteStarted.script,
			run: (ctx) => {
				ctx.stage(DirectorMinute, {}, { then: "minuteRan" });
			},
		},
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: DirectorSlice,
		save: (state) => state.save(),
		load: (data, setup) => {
			const state = new FiringState(setup.options.rules);
			state.restore(data);
			return state;
		},
		// Version 0 is the old file's `director` field (`DirectorSnapshot`), the same shape.
		migrations: { 0: migrateV0 },
	}),
}));
