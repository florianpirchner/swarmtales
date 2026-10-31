/**
 * Levels, acts, the ranking and the tool locks (old `levelOf`, `isFinished`, `hasPassed`, `ranking`,
 * `actStartOf`, `#noteActStarts`, `enabledTools` of packages/engine/src/world.ts). Tools open and close
 * with `ctx.access` instead of `enabledTools`.
 */
import { ExileApi, LedgerApi } from "@swarmtales/mechanic-shared";
import { GoalsExtrasApi } from "./goals-extras.ts";
import type { ProgressionCtx } from "./head.ts";
import { lastLevelIn, type Competitor } from "./model.ts";
import { penaltyAt } from "./rules.ts";

export function lastLevelOf(ctx: ProgressionCtx): number {
	return lastLevelIn(ctx.options);
}

export function competitorOf(ctx: ProgressionCtx, resident: string): Competitor {
	const found = ctx.state.competitors.get(resident);
	if (found === undefined) throw new Error(`${resident} is not a resident`);
	return found;
}

export function definitionOf(ctx: ProgressionCtx, level: number): ProgressionCtx["options"]["levels"][number] | undefined {
	return ctx.options.levels.find((entry) => entry.number === level);
}

export function levelOf(ctx: ProgressionCtx, resident: string): number {
	return competitorOf(ctx, resident).level;
}

/** Whether `level` is played in this run (between start and last level). */
export function isPlayable(ctx: ProgressionCtx, level: number): boolean {
	return level >= ctx.options.startLevel && level <= lastLevelOf(ctx);
}

export function isFinished(ctx: ProgressionCtx, resident: string): boolean {
	return levelOf(ctx, resident) > lastLevelOf(ctx);
}

/** Whether the resident has passed `level`: beyond it, or waiting at its door. */
export function hasPassed(ctx: ProgressionCtx, resident: string, level: number): boolean {
	const entry = competitorOf(ctx, resident);
	return entry.level > level || entry.solved.includes(level);
}

export function opensAt(ctx: ProgressionCtx, level: number): number {
	return definitionOf(ctx, level)?.opensAt ?? 0;
}

/** Whether `level`'s door is open on the door clock now. */
export function isOpenOnClock(ctx: ProgressionCtx, level: number): boolean {
	return ctx.minute >= opensAt(ctx, level);
}

export function isExiled(ctx: ProgressionCtx, resident: string): boolean {
	return ctx.tryCall(ExileApi, "isExiled", { resident }) === true;
}

/** Residents still in the city: not exiled for good (those at the gate count). */
export function aliveResidents(ctx: ProgressionCtx): readonly string[] {
	return ctx.tryCall(ExileApi, "alive", {}) ?? ctx.residents.ids;
}

export function pointsOf(ctx: ProgressionCtx, resident: string): number {
	return ctx.call(LedgerApi, "balance", { account: resident });
}

export interface Ranked {
	readonly agent: string;
	readonly rank: number;
	readonly points: number;
	readonly level: number;
}

export function ranking(ctx: ProgressionCtx): readonly Ranked[] {
	const exiled = (agent: string): number => (isExiled(ctx, agent) ? 1 : 0);
	return [...ctx.state.competitors.keys()]
		.map((agent) => ({ agent, points: pointsOf(ctx, agent), level: levelOf(ctx, agent) }))
		.sort((a, b) => exiled(a.agent) - exiled(b.agent) || b.points - a.points || b.level - a.level || a.agent.localeCompare(b.agent))
		.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** What the resident's next wrong code in this act costs. */
export function nextPenalty(ctx: ProgressionCtx, resident: string): number {
	return ctx.options.penalty === undefined ? 0 : penaltyAt(ctx.options.penalty, (ctx.state.offences.get(resident)?.wrong ?? 0) + 1);
}

/** What the resident pays for its next lost blame in this act. */
export function nextBlamePenalty(ctx: ProgressionCtx, resident: string): number {
	return ctx.options.blamePenalty === undefined ? 0 : penaltyAt(ctx.options.blamePenalty, (ctx.state.offences.get(resident)?.blames ?? 0) + 1);
}

export function offencesOf(ctx: ProgressionCtx, resident: string): { wrong: number; blames: number } {
	const found = ctx.state.offences.get(resident);
	if (found !== undefined) return found;
	const created = { wrong: 0, blames: 0 };
	ctx.state.offences.set(resident, created);
	return created;
}

/** The first level of the latest act that has begun (the run's start level before any). */
export function currentAct(ctx: ProgressionCtx): number {
	return Math.max(ctx.options.startLevel, ...ctx.state.actStarts.keys());
}

/** The minute the act starting at `fromLevel` began, once some resident has reached that level. */
export function actStart(ctx: ProgressionCtx, fromLevel: number): number | undefined {
	// A run started beyond the act's first level began inside it.
	if (fromLevel <= ctx.options.startLevel) return ctx.state.actStarts.get(fromLevel) ?? ctx.state.actStarts.get(ctx.options.startLevel);
	return ctx.state.actStarts.get(fromLevel);
}

/** An act is over: recorded once. */
export function endAct(ctx: ProgressionCtx, fromLevel: number): boolean {
	if (ctx.state.endedActs.has(fromLevel)) return false;
	ctx.state.endedActs.add(fromLevel);
	ctx.tryCall(GoalsExtrasApi, "actEnded", { act: fromLevel });
	return true;
}

/**
 * Records the start of every act that begins at or below `level` and has not begun yet. A new act
 * ends every earlier one and restarts the penalty counts.
 */
export function noteActStarts(ctx: ProgressionCtx, level: number): void {
	const firsts = [ctx.options.startLevel, ...ctx.options.acts].sort((a, b) => a - b);
	for (const fromLevel of firsts) {
		if (fromLevel > level || ctx.state.actStarts.has(fromLevel)) continue;
		for (const begun of [...ctx.state.actStarts.keys()]) if (begun < fromLevel) endAct(ctx, begun);
		ctx.state.actStarts.set(fromLevel, ctx.minute);
		ctx.state.offences.clear();
		ctx.tryCall(GoalsExtrasApi, "actStarted", { act: fromLevel, residents: [...aliveResidents(ctx)] });
	}
}

/** Every tool some level offers: the tools progression opens and closes. */
export function managedTools(ctx: ProgressionCtx): readonly string[] {
	return [...new Set(ctx.options.levels.flatMap((entry) => entry.tools))];
}

/** The managed tools the resident may use now: its level's set and what was unlocked for it; every one once it is finished. */
export function openTools(ctx: ProgressionCtx, resident: string): ReadonlySet<string> {
	const entry = competitorOf(ctx, resident);
	if (entry.level > lastLevelOf(ctx)) return new Set(managedTools(ctx));
	return new Set([...(definitionOf(ctx, entry.level)?.tools ?? []), ...entry.extraTools]);
}

function setLock(ctx: ProgressionCtx, resident: string, tool: string, locked: boolean): void {
	try {
		if (locked) ctx.access.lock(resident, tool);
		else ctx.access.unlock(resident, tool);
	} catch {
		// A tool no loaded mechanic defines cannot be locked; the story does not grant it either.
	}
}

/** Opens the tools of the resident's level and closes the other managed ones. */
export function syncLocks(ctx: ProgressionCtx, resident: string): void {
	const open = openTools(ctx, resident);
	for (const tool of managedTools(ctx)) setLock(ctx, resident, tool, !open.has(tool));
}

export function unlockFor(ctx: ProgressionCtx, resident: string, tools: readonly string[]): void {
	const entry = competitorOf(ctx, resident);
	const added = tools.filter((tool) => !entry.extraTools.has(tool));
	for (const tool of added) {
		entry.extraTools.add(tool);
		setLock(ctx, resident, tool, false);
	}
	if (added.length > 0) ctx.emit("tools_unlocked", { agent: resident, tools: added });
}
