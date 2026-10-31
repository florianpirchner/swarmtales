/**
 * The `progression` mechanic (carve step 8, team T3, docs/design/carve-team-T3.md): levels,
 * submissions, doors, acts, the ranking, the tools that open with the levels, and the task and
 * status frame of a turn. The old code is `World#submit` and its neighbours.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { defineMechanic } from "@swarmtales/kernel";
import { ProgressionApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { ProgressionExtrasApi, progressionWorkHead } from "./head.ts";
import { isFinished, levelOf, noteActStarts, syncLocks } from "./levels.ts";
import { loadState, migrateV0, ProgressionSlice, ProgressionSliceV0, saveState } from "./model.ts";
import { extrasImplementation, progressionImplementation } from "./services.ts";
import { openDoor, openOnClock } from "./submit.ts";
import { statusParts, taskLines } from "./task.ts";
import { progressionTools } from "./tools.ts";

export { progressionHead, ProgressionExtrasApi } from "./head.ts";

export const progression = defineMechanic(progressionWorkHead, (kit) => ({
	tools: progressionTools(kit),
	services: [kit.provide(ProgressionApi, progressionImplementation), kit.provide(ProgressionExtrasApi, extrasImplementation)],
	hooks: {
		runStarted: (ctx) => {
			noteActStarts(ctx, ctx.options.startLevel);
			for (const id of ctx.residents.ids) syncLocks(ctx, id);
			ctx.state.locksStale = false;
		},
		minuteStarted: (ctx) => {
			openDoor(ctx);
			openOnClock(ctx, ctx.minute);
			if (ctx.state.locksStale) {
				for (const id of ctx.residents.ids) syncLocks(ctx, id);
				ctx.state.locksStale = false;
			}
		},
		turnInputs: (resident, ctx) => [...statusParts(ctx, resident, STATUS_ORDER), ...taskLines(ctx, resident)],
		news: (resident, ctx) => {
			const shown = ctx.state.delivered.get(resident);
			return shown?.level !== levelOf(ctx, resident) || shown.finished !== isFinished(ctx, resident);
		},
		runEnded: (reason, ctx) => {
			if (reason === "stopped") return;
			for (const fromLevel of ctx.state.actStarts.keys()) ctx.state.endedActs.add(fromLevel);
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
		load: (data) => loadState(data),
		migrations: { 0: (old) => migrateV0(Parse(ProgressionSliceV0, old)) },
	}),
}));
