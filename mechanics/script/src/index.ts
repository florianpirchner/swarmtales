// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `script` mechanic: the game's rules that fire on time and on events, without a model (the old `Director` of
 * the story). Its time triggers (`at`, `every`, `onAllPast`, `onUnansweredDm`, `onTeamSplit`, `onCollectionEnd`) run
 * in one staged call per tick, `directorMinute` of the actor `script`, staged at the tick start after every mechanic
 * whose tick start came first on `legacy` (old `HOOK_ORDER.minuteStarted.script`, the last): the petitions that
 * expired are resolved before it. Its event triggers are listeners: `level_entered` of `progression` runs the
 * `onEnter`, `onFirstEnter`, `onAllPast` and `onHolderBehind` rules, `petition_resolved` the opening rule's `onPass`
 * or `onFail` and the `onPetitionResolved` rules, `cast_collected` of `cast` the `onCollect` rules. An action is a
 * command of the mechanic that owns it, run in the frame of the firing. A refused `directorMinute` ends the run.
 *
 * @packageDocumentation
 */
import { CastEvents } from "@swarmtales/mechanic-cast/contract";
import { PetitionsEvents } from "@swarmtales/mechanic-petitions/contract";
import { ProgressionEvents } from "@swarmtales/mechanic-progression/contract";
import { defineMechanic, onStaged, reply } from "@swarmtales/sdk";
import { scriptHead, TimeTriggers, type ScriptCtx } from "./head.ts";
import { onCollect, onEnter, onPetitionResolved, runTimeTriggers } from "./triggers.ts";

export { resolveCount, type Occasion } from "./actions.ts";
export { standingBands, type StandingBands } from "./standings.ts";
export { scriptHead, ScriptOptions, TimeTriggers, type ScriptCtx } from "./head.ts";
export { Action, Condition, CooldownScope, NoticeTarget, Rule, Trigger, type PetitionSpec } from "./rules.ts";
export { DirectorSlice, FiringState, type OpenedPetition, type Origin } from "./state.ts";
export { type CollectionView } from "./reads.ts";

// The mechanics whose tick start ran before the script's on `legacy` (old `HOOK_ORDER.minuteStarted`), and those of
// the City that had none there (order 0, so first); an id that is not loaded is ignored.
const BEFORE_SCRIPT = ["consensus", "motives", "progression", "names", "tribunal", "seal", "standoff", "whispers", "standoff-tribunal", "exile", "petitions", "cast", "ledger", "channels", "marks", "receipts", "puzzles", "goals"];

/**
 * The game's rules on time and on events: one staged call of `directorMinute` per tick and the listeners of the
 * event triggers. A game grants `directorMinute` to `script` (the default grant).
 *
 * @example
 * ```ts
 * const game = defineGame({ id: "city", residents: 6, mechanics: [ledger(), channels(), petitions(), script({ rules })], end: { ticks: 20 } });
 * ```
 *
 * @public
 */
export const script = defineMechanic(scriptHead, {
	tools: {
		directorMinute: {
			run: (_params, ctx) => {
				runTimeTriggers(ctx);
				return reply("");
			},
		},
	},
	jobs: {
		// The tick's time triggers did not run: the game did not grant `directorMinute` to `script` (old `minuteRan`).
		minuteRan: onStaged((_ctx: ScriptCtx, outcome) => {
			if (!outcome.ok) throw new RangeError(`script: directorMinute was refused (${outcome.code}); grant it to script`);
		}),
	},
	listeners: (kit) => [
		// State that follows a level first (the cast), the script's rules last (old `LISTENER_ORDER.level_entered`).
		kit.listen(ProgressionEvents, "level_entered", (payload, ctx) => {
			onEnter(ctx, payload.agent, payload.level);
		}, { after: ["cast"] }),
		// A new sender in collections (old D-2, `immediate`): here after the step that collected it.
		kit.listen(CastEvents, "cast_collected", (payload, ctx) => {
			for (const into of payload.into) onCollect(ctx, into, payload.from);
		}),
		kit.listen(PetitionsEvents, "petition_opened", (payload, ctx) => {
			ctx.state.statuses.set(payload.petition, "open");
		}),
		kit.listen(PetitionsEvents, "petition_resolved", (payload, ctx) => {
			onPetitionResolved(ctx, payload.petition, payload.outcome);
		}),
	],
	hooks: {
		tickStarted: {
			after: BEFORE_SCRIPT,
			run: (ctx) => {
				ctx.stage(TimeTriggers, {}, { then: "minuteRan" });
			},
		},
	},
});
