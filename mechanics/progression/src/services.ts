// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The service `progression` (carried from the old `mechanics/progression/src/services.ts`). The old `lastProgress`
 * and `passed` read the level receipts and the log; here they read the solves the progression keeps. The old
 * `firstSolveMinute` is not offered: `cast` asks it and `progression` asks `cast-extras`, so `cast` reads the first
 * solve from `submission` (pattern 5 of 12-m5-spec.md 2.2).
 */
import { LevelPiecesService } from "./contract.ts";
import { actStart, currentAct, endAct, unlockFor } from "./acts.ts";
import type { ProgressionCtx } from "./head.ts";
import { hasPassed, isFinished, isOpenOnClock, lastLevelOf, levelOf, nextBlamePenalty, nextPenalty, offencesOf, opensAt, ranking, standingOf } from "./levels.ts";
import type { TaskLine } from "./model.ts";
import { openDoor } from "./submit.ts";
import { addTaskLine } from "./task.ts";

interface OfResident {
	readonly resident: string;
}
interface OnLevel {
	readonly resident: string;
	readonly level: number;
}

function passed(ctx: ProgressionCtx, level: number): string[] {
	const inOrder = ctx.state.solves.filter((solve) => solve.level === level).map((solve) => solve.agent);
	const rest = [...ctx.state.standings.keys()].filter((id) => !inOrder.includes(id) && hasPassed(ctx, id, level));
	return [...new Set(inOrder), ...rest];
}

function holdersBehind(ctx: ProgressionCtx, { resident, level }: OnLevel) {
	return ctx
		.call(LevelPiecesService, "holders", { resident, level })
		.filter((entry) => levelOf(ctx, entry.holder) < level && !standingOf(ctx, entry.holder).held)
		.map((entry) => ({ holder: entry.holder, level: levelOf(ctx, entry.holder), piece: entry.piece }));
}

/** The methods of the service `task-lines`. */
export const taskLinesService = {
	add: (line: TaskLine, ctx: ProgressionCtx) => {
		addTaskLine(ctx, line);
		return null;
	},
};

/** The methods of the service `progression`. */
export const progressionService = {
	levelOf: ({ resident }: OfResident, ctx: ProgressionCtx) => levelOf(ctx, resident),
	isFinished: ({ resident }: OfResident, ctx: ProgressionCtx) => isFinished(ctx, resident),
	hasPassed: ({ resident, level }: OnLevel, ctx: ProgressionCtx) => hasPassed(ctx, resident, level),
	hasSolved: ({ resident, level }: OnLevel, ctx: ProgressionCtx) => standingOf(ctx, resident).solved.includes(level),
	passed: ({ level }: { readonly level: number }, ctx: ProgressionCtx) => passed(ctx, level),
	lastProgress: ({ resident }: OfResident, ctx: ProgressionCtx) => ctx.state.solves.reduce((latest, solve) => (solve.agent === resident ? Math.max(latest, solve.tick) : latest), -1),
	currentAct: (_input: object, ctx: ProgressionCtx) => currentAct(ctx),
	actStart: ({ fromLevel }: { readonly fromLevel: number }, ctx: ProgressionCtx) => actStart(ctx, fromLevel) ?? null,
	door: (_input: object, ctx: ProgressionCtx) => ctx.state.door ?? null,
	doorShut: (_input: object, ctx: ProgressionCtx) => ctx.state.door !== undefined,
	openDoor: (_input: object, ctx: ProgressionCtx) => openDoor(ctx),
	releaseDoor: (_input: object, ctx: ProgressionCtx) => {
		if (ctx.state.door !== undefined) ctx.state.doorReleased = true;
		return null;
	},
	unlock: ({ resident, tools }: { readonly resident: string; readonly tools: readonly string[] }, ctx: ProgressionCtx) => {
		unlockFor(ctx, resident, tools);
		return null;
	},
	ranking: (_input: object, ctx: ProgressionCtx) => ranking(ctx).map((entry) => ({ ...entry })),
	holdersBehind: (input: OnLevel, ctx: ProgressionCtx) => holdersBehind(ctx, input),
	nextPenalty: ({ resident }: OfResident, ctx: ProgressionCtx) => nextPenalty(ctx, resident),
	nextBlamePenalty: ({ resident }: OfResident, ctx: ProgressionCtx) => nextBlamePenalty(ctx, resident),
	chargeBlame: ({ resident }: OfResident, ctx: ProgressionCtx) => {
		const price = nextBlamePenalty(ctx, resident);
		offencesOf(ctx, resident).blames += 1;
		return price;
	},
	endAct: ({ fromLevel }: { readonly fromLevel: number }, ctx: ProgressionCtx) => endAct(ctx, fromLevel),
	isOpenOnClock: ({ level }: { readonly level: number }, ctx: ProgressionCtx) => isOpenOnClock(ctx, level),
	opensAt: ({ level }: { readonly level: number }, ctx: ProgressionCtx) => opensAt(ctx, level),
	bounds: (_input: object, ctx: ProgressionCtx) => ({ startLevel: ctx.options.startLevel, lastLevel: lastLevelOf(ctx), survivors: ctx.options.survivors }),
};
