/**
 * The `progression` mechanic (carve step 8, team T3, docs/design/carve-team-T3.md): levels,
 * submissions, doors, acts, the ranking, the tools that open with the levels, and the task and
 * status frame of a turn. The old code is `World#submit` and its neighbours.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineMechanic } from "@swarmtales/kernel";
import { HOOK_ORDER, ProgressionApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { progressionWorkHead } from "./head.ts";
import { endAct, isFinished, levelOf, noteActStarts, syncLocks } from "./levels.ts";
import { loadState, migrateV0, ProgressionSlice, ProgressionSliceV0, saveState } from "./model.ts";
import { progressionImplementation } from "./services.ts";
import { openDoor, openOnClock } from "./submit.ts";
import { markTaskShown, statusParts, taskLines } from "./task.ts";
import { progressionTools } from "./tools.ts";

export { progressionHead } from "./head.ts";

export const progression = defineMechanic(progressionWorkHead, (kit) => ({
	tools: progressionTools(kit),
	services: [kit.provide(ProgressionApi, progressionImplementation)],
	hooks: {
		runStarted: {
			order: HOOK_ORDER.runStarted.progression,
			run: (ctx) => {
				noteActStarts(ctx, ctx.options.startLevel);
				for (const id of ctx.residents.ids) syncLocks(ctx, id);
				ctx.state.locksStale = false;
			},
		},
		minuteStarted: [
			{
				// A resumed run rebuilds the locks before anything else of the minute.
				order: HOOK_ORDER.minuteStarted.progressionDoor - 10,
				run: (ctx) => {
					if (!ctx.state.locksStale) return;
					for (const id of ctx.residents.ids) syncLocks(ctx, id);
					ctx.state.locksStale = false;
					// The acts the residents reached since the snapshot begin now (old `#restore`).
					noteActStarts(ctx, Math.max(0, ...ctx.residents.ids.map((id) => levelOf(ctx, id))));
				},
			},
			// The old arena opened the door only from the second minute on (`Arena#nextMinute`).
			{
				order: HOOK_ORDER.minuteStarted.progressionDoor,
				run: (ctx) => {
					if (ctx.minute > 0) openDoor(ctx);
				},
			},
			{
				order: HOOK_ORDER.minuteStarted.progressionClock,
				run: (ctx) => {
					openOnClock(ctx, ctx.minute);
				},
			},
			// A door may open once the last laggard was exiled by the tribunal's tick.
			{
				order: HOOK_ORDER.minuteStarted.progressionDoorAgain,
				run: (ctx) => {
					if (ctx.minute > 0) openDoor(ctx);
				},
			},
		],
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => [...statusParts(ctx, resident, STATUS_ORDER), ...taskLines(ctx, resident)],
		},
		turnOpened: (resident, ctx) => {
			markTaskShown(ctx, resident);
		},
		news: (resident, ctx) => {
			const shown = ctx.state.delivered.get(resident);
			return shown?.level !== levelOf(ctx, resident) || shown.finished !== isFinished(ctx, resident);
		},
		runEnded: {
			order: HOOK_ORDER.runEnded.progression,
			run: (reason, ctx) => {
				if (reason === "stopped") return;
				for (const fromLevel of [...ctx.state.actStarts.keys()].sort((a, b) => a - b)) endAct(ctx, fromLevel);
			},
		},
	},
	facts: {
		levels: kit.fact(Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), held: Type.Boolean() })), (view) =>
			[...view.state.competitors].map(([agent, entry]) => ({ agent, level: entry.level, held: entry.held })),
		),
		door: kit.fact(Type.Union([Type.Integer(), Type.Null()]), (view) => view.state.door ?? null),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: ProgressionSlice,
		save: saveState,
		load: (data, setup) => loadState(data, setup.options),
		migrations: { 0: (old) => migrateV0(Parse(ProgressionSliceV0, old)) },
	}),
}));
