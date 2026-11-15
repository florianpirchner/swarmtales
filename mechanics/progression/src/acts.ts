// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The acts and the tool locks of the levels (carried from the old `mechanics/progression/src/levels.ts`:
 * `currentAct`, `actStart`, `endAct`, `noteActStarts`, `managedTools`, `openTools`, `syncLocks`, `unlockFor`). The
 * locks close and open the tools of other mechanics by their bare names through `ctx.access`, each change a
 * `tool_locked` or `tool_unlocked` of the kernel, as the old platform logged them.
 */
import type { ProgressionCtx } from "./head.ts";
import { aliveResidents, definitionOf, lastLevelOf, standingOf } from "./levels.ts";

/**
 * The first level of the latest act that has begun (the run's start level before any).
 * @param ctx - The context of the progression.
 * @returns The level.
 */
export function currentAct(ctx: ProgressionCtx): number {
	return Math.max(ctx.options.startLevel, ...ctx.state.actStarts.keys());
}

/**
 * The tick the act starting at `fromLevel` began, once some resident has reached that level.
 * @param ctx - The context of the progression.
 * @param fromLevel - The first level of the act.
 * @returns The tick, or undefined.
 */
export function actStart(ctx: ProgressionCtx, fromLevel: number): number | undefined {
	// A run started beyond the act's first level began inside it.
	if (fromLevel <= ctx.options.startLevel) return ctx.state.actStarts.get(fromLevel) ?? ctx.state.actStarts.get(ctx.options.startLevel);
	return ctx.state.actStarts.get(fromLevel);
}

/**
 * An act is over: recorded once; the listeners of `act_ended` close what the act held.
 * @param ctx - The context of the progression.
 * @param fromLevel - The first level of the act.
 * @returns True when this call ended it.
 */
export function endAct(ctx: ProgressionCtx, fromLevel: number): boolean {
	if (ctx.state.endedActs.has(fromLevel)) return false;
	ctx.state.endedActs.add(fromLevel);
	ctx.emit("act_ended", { fromLevel });
	return true;
}

/**
 * Records the start of every act that begins at or below `level` and has not begun yet. A new act ends every earlier
 * one and restarts the penalty counts.
 * @param ctx - The context of the progression.
 * @param level - The level a resident reached.
 */
export function noteActStarts(ctx: ProgressionCtx, level: number): void {
	const firsts = [ctx.options.startLevel, ...ctx.options.acts].sort((a, b) => a - b);
	for (const fromLevel of firsts) {
		if (fromLevel > level || ctx.state.actStarts.has(fromLevel)) continue;
		for (const begun of [...ctx.state.actStarts.keys()]) if (begun < fromLevel) endAct(ctx, begun);
		ctx.state.actStarts.set(fromLevel, ctx.tick);
		ctx.state.offences.clear();
		ctx.emit("act_started", { fromLevel, residents: [...aliveResidents(ctx)] });
	}
}

/**
 * Every tool some level offers (old `#finalTools`), in level order.
 * @param ctx - The context of the progression.
 * @returns The tool names.
 */
function levelTools(ctx: ProgressionCtx): readonly string[] {
	return [...new Set(ctx.options.levels.flatMap((entry) => entry.tools))];
}

/**
 * The tools the progression opens and closes: every tool some level offers, then the game's other closed tools.
 * @param ctx - The context of the progression.
 * @returns The tool names.
 */
export function managedTools(ctx: ProgressionCtx): readonly string[] {
	return [...new Set([...levelTools(ctx), ...ctx.options.managed])];
}

/**
 * The managed tools the resident may use now: its level's set and what was unlocked for it; every level's once it
 * is finished.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns The tool names.
 */
export function levelOpen(ctx: ProgressionCtx, resident: string): ReadonlySet<string> {
	const entry = standingOf(ctx, resident);
	if (entry.level > lastLevelOf(ctx)) return new Set([...levelTools(ctx), ...entry.extraTools]);
	return new Set([...(definitionOf(ctx, entry.level)?.tools ?? []), ...entry.extraTools]);
}

function setLock(ctx: ProgressionCtx, resident: string, tool: string, locked: boolean): void {
	try {
		if (locked) ctx.access.lock(resident, tool);
		else ctx.access.unlock(resident, tool);
	} catch (error) {
		// A tool no loaded mechanic defines cannot be locked; the game grants it to nobody either.
		if (!(error instanceof RangeError) || !/no tool ".*" to lock or unlock/.test(error.message)) throw error;
	}
}

/**
 * Opens the tools of the resident's level and closes the other managed ones.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 */
export function syncLocks(ctx: ProgressionCtx, resident: string): void {
	const open = levelOpen(ctx, resident);
	for (const tool of managedTools(ctx)) setLock(ctx, resident, tool, !open.has(tool));
}

/**
 * Opens tools for the resident beyond its level's set; writes `tools_unlocked` with the ones that are new.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @param tools - The tool names.
 */
export function unlockFor(ctx: ProgressionCtx, resident: string, tools: readonly string[]): void {
	const entry = standingOf(ctx, resident);
	const added = tools.filter((tool) => !entry.extraTools.has(tool));
	for (const tool of added) {
		entry.extraTools.add(tool);
		setLock(ctx, resident, tool, false);
	}
	if (added.length > 0) ctx.emit("tools_unlocked", { agent: resident, tools: added });
}
