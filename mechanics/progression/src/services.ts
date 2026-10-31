/**
 * The services of the progression mechanic: every method of the shared `ProgressionApi`.
 */
import type { EventEnvelope } from "@swarmtales/contracts";
import { ReceiptsApi } from "@swarmtales/mechanic-shared";
import { actStart, competitorOf, currentAct, endAct, hasPassed, isFinished, isOpenOnClock, lastLevelOf, levelOf, nextBlamePenalty, nextPenalty, offencesOf, opensAt, ranking, unlockFor } from "./levels.ts";
import type { ProgressionCtx } from "./head.ts";
import { PuzzlesExtrasApi } from "./puzzles-extras.ts";
import { openDoor } from "./submit.ts";

interface Solve {
	readonly agent: string;
	readonly level: number;
	readonly minute: number;
}

/** The correct submissions, in log order: who passed which level when (the old level receipts). */
function solves(ctx: ProgressionCtx): readonly Solve[] {
	return ctx.log.ofType("progression", "submission").flatMap((event: EventEnvelope) => {
		const payload: unknown = event.payload;
		if (typeof payload !== "object" || payload === null) return [];
		const agent: unknown = Reflect.get(payload, "agent");
		const level: unknown = Reflect.get(payload, "level");
		return Reflect.get(payload, "outcome") === "correct" && typeof agent === "string" && typeof level === "number" ? [{ agent, level, minute: event.minute }] : [];
	});
}

export const progressionImplementation = {
	levelOf: (input: { readonly resident: string }, ctx: ProgressionCtx): number => levelOf(ctx, input.resident),
	isFinished: (input: { readonly resident: string }, ctx: ProgressionCtx): boolean => isFinished(ctx, input.resident),
	hasPassed: (input: { readonly resident: string; readonly level: number }, ctx: ProgressionCtx): boolean => hasPassed(ctx, input.resident, input.level),
	passed: (input: { readonly level: number }, ctx: ProgressionCtx): string[] => {
		const inOrder = solves(ctx).filter((solve) => solve.level === input.level).map((solve) => solve.agent);
		const rest = [...ctx.state.competitors.keys()].filter((id) => !inOrder.includes(id) && hasPassed(ctx, id, input.level));
		return [...new Set(inOrder), ...rest];
	},
	lastProgress: (input: { readonly resident: string }, ctx: ProgressionCtx): number =>
		ctx
			.call(ReceiptsApi, "list", { resident: input.resident })
			.reduce((latest, receipt) => (receipt.body.kind === "levelUp" ? Math.max(latest, receipt.minute) : latest), -1),
	currentAct: (_input: object, ctx: ProgressionCtx): number => currentAct(ctx),
	actStart: (input: { readonly fromLevel: number }, ctx: ProgressionCtx): number | null => actStart(ctx, input.fromLevel) ?? null,
	door: (_input: object, ctx: ProgressionCtx): number | null => ctx.state.door ?? null,
	doorShut: (_input: object, ctx: ProgressionCtx): boolean => ctx.state.door !== undefined,
	openDoor: (_input: object, ctx: ProgressionCtx): boolean => openDoor(ctx),
	releaseDoor: (_input: object, ctx: ProgressionCtx): null => {
		if (ctx.state.door !== undefined) ctx.state.doorReleased = true;
		return null;
	},
	unlock: (input: { readonly resident: string; readonly tools: readonly string[] }, ctx: ProgressionCtx): null => {
		unlockFor(ctx, input.resident, input.tools);
		return null;
	},
	ranking: (_input: object, ctx: ProgressionCtx) => ranking(ctx).map((entry) => ({ ...entry })),
	holdersBehind: (input: { readonly resident: string; readonly level: number }, ctx: ProgressionCtx) =>
		ctx
			.call(PuzzlesExtrasApi, "holders", { resident: input.resident, level: input.level })
			.filter((entry) => levelOf(ctx, entry.holder) < input.level && !competitorOf(ctx, entry.holder).held)
			.map((entry) => ({ holder: entry.holder, level: levelOf(ctx, entry.holder), piece: entry.piece })),
	firstSolveMinute: (input: { readonly level: number }, ctx: ProgressionCtx): number | null => {
		const minutes = [...ctx.state.competitors.keys()].flatMap((resident) =>
			ctx.call(ReceiptsApi, "list", { resident }).flatMap((receipt) => (receipt.body.kind === "levelUp" && receipt.body.level === input.level ? [receipt.minute] : [])),
		);
		return minutes.length === 0 ? null : Math.min(...minutes);
	},
	nextPenalty: (input: { readonly resident: string }, ctx: ProgressionCtx): number => nextPenalty(ctx, input.resident),
	nextBlamePenalty: (input: { readonly resident: string }, ctx: ProgressionCtx): number => nextBlamePenalty(ctx, input.resident),
	chargeBlame: (input: { readonly resident: string }, ctx: ProgressionCtx): number => {
		const price = nextBlamePenalty(ctx, input.resident);
		offencesOf(ctx, input.resident).blames += 1;
		return price;
	},
	endAct: (input: { readonly fromLevel: number }, ctx: ProgressionCtx): boolean => endAct(ctx, input.fromLevel),
	isOpenOnClock: (input: { readonly level: number }, ctx: ProgressionCtx): boolean => isOpenOnClock(ctx, input.level),
	opensAt: (input: { readonly level: number }, ctx: ProgressionCtx): number => opensAt(ctx, input.level),
	bounds: (_input: object, ctx: ProgressionCtx) => ({ startLevel: ctx.options.startLevel, lastLevel: lastLevelOf(ctx), survivors: ctx.options.survivors }),
};
