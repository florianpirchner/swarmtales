/**
 * The `arena` mechanic (carve step 18, docs/design/carve-plan.md): the old `Arena`
 * (packages/engine/src/arena.ts) on the new core. The host plays the minutes, passes and blocks;
 * the arena supplies the old order of a pass (`legacyTurnOrder`) and the old input kinds, and
 * keeps what the old arena decided around the turns (see run.ts):
 *
 * - `run_start` after every other mechanic's start (`HOOK_ORDER.runStarted.arena`);
 * - `round_end` with the standings, after the minute's turns;
 * - the points part of the old novelty (`#hasNovelty`, `#markSeen`): its `news` hook and the
 *   points views of a block (`turnInputs`, `turnOpened`, `turnEnded`); the rest of the old novelty
 *   is progression's (level) and channels' (mail, board, groups);
 * - the stop reasons and the budget as referee limits (`arena.stop`, `arena.budget`), so the host
 *   ends the run where the old arena did; the act brakes and the snapshot cut after the minute;
 * - `run_end` with its reason and, when a mechanic provides `EndingApi`, the run's ending.
 *
 * The facts tell the app what the old arena did itself: `arena.snapshot` (take `host.snapshot()`
 * after this minute; stop the host when it says so) and `arena.stopping` (the old guard that skipped
 * the weaver and the gamemaker once the run would stop).
 */
import { Type } from "typebox";
import { defineMechanic } from "@swarmtales/kernel";
import { HOOK_ORDER, INPUT_KINDS, LedgerApi, legacyTurnOrder } from "@swarmtales/mechanic-shared";
import { arenaHead } from "./head.ts";
import { budgetReason, stopReason } from "./rules.ts";
import { minuteClosed, minuteEnded, runEnded, runResumed, runStarted } from "./run.ts";
import { ArenaSlice, migrateV0, restored, SnapshotCut } from "./state.ts";

export { arenaHead, ArenaOptions } from "./head.ts";
export { arenaFromStory, type ArenaRun } from "./from-story.ts";

export const arena = defineMechanic(arenaHead, (kit) => ({
	turns: { order: legacyTurnOrder, inputs: INPUT_KINDS },
	listeners: [
		// A new minute: the old `#nextMinute` checked whether the run stops once the minute's start had run (not before the first minute).
		kit.core(
			"minute_started",
			(_payload, ctx) => {
				const state = ctx.state;
				state.stopDue = ctx.minute > 0;
				state.passed = false;
				state.activated.clear();
				state.views.clear();
				state.cut = undefined;
			},
			{ immediate: true },
		),
		kit.core(
			"pass_started",
			(_payload, ctx) => {
				ctx.state.stopDue = false;
				ctx.state.passed = true;
			},
			{ immediate: true },
		),
		kit.core("minute_ended", (_payload, ctx) => {
			minuteClosed(ctx);
		}),
	],
	hooks: {
		runStarted: { order: HOOK_ORDER.runStarted.arena, run: runStarted },
		runResumed,
		// Read before anything is emptied: the points the block starts from (old `#playBlock`'s `start`).
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => {
				ctx.state.views.set(resident, { start: ctx.call(LedgerApi, "balance", { account: resident }) });
				return [];
			},
		},
		turnOpened: (resident, ctx) => {
			ctx.state.activated.add(resident);
			const view = ctx.state.views.get(resident) ?? {};
			view.turn = ctx.call(LedgerApi, "balance", { account: resident });
			ctx.state.views.set(resident, view);
		},
		// Old `#markSeen`: the resident saw the block's start plus its own doing; what earlier members did meanwhile stays new.
		turnEnded: (resident, ctx) => {
			const end = ctx.call(LedgerApi, "balance", { account: resident });
			const view = ctx.state.views.get(resident);
			const start = view?.start ?? end;
			const turn = view?.turn ?? start;
			ctx.state.seenPoints.set(resident, start + (end - turn));
		},
		// The points part of the old novelty: a balance that moved since the resident last looked.
		news: (resident, ctx) => {
			const points = ctx.state.seenPoints.get(resident);
			return points !== undefined && points !== ctx.call(LedgerApi, "balance", { account: resident });
		},
		minuteEnded: { order: HOOK_ORDER.minuteEnded.arena, run: minuteEnded },
		runEnded: { order: HOOK_ORDER.runEnded.arena, run: (_reason, ctx, detail) => { runEnded(ctx, detail); } },
	},
	limits: [
		kit.limit("stop", "The run stops where the old arena stopped it: every resident finished, seats decided, or the tribunal's act over.", (view) =>
			view.state.stopDue ? stopReason(view) : undefined,
		),
		kit.limit("budget", "The run's own model spend stays within `budgetUsd`.", (view) => budgetReason(view)),
	],
	facts: {
		snapshot: kit.fact(Type.Union([SnapshotCut, Type.Null()]), (view) => view.state.cut ?? null),
		stopping: kit.fact(Type.Union([Type.String(), Type.Null()]), (view) => view.state.reason ?? budgetReason(view) ?? stopReason(view) ?? null),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: ArenaSlice,
		save: (state) => state.save(),
		load: (data, setup) => restored(data, setup.residents),
		migrations: { 0: migrateV0 },
	}),
}));
