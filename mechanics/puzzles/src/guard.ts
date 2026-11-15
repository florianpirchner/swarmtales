// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The guard's view of the deal (carried from the old `mechanics/puzzles/src/guard.ts`: `guardedLevels`,
 * `carriesGuardedFragment`): the levels whose fragments the city keeps off the board. Who is in the city comes from
 * `exile`. The hand-over guard itself (`secretsOf`, `leakOf`, the `review` handler) is the second part of the port.
 */
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { lastLevelOf } from "./deal.ts";
import type { PuzzlesCtx } from "./head.ts";
import { carriesRun } from "./secrets.ts";
import { hasPassed } from "./standing.ts";

/**
 * The residents in the city: not banished, and not taken by a strike that keeps.
 *
 * @param ctx - The context.
 * @returns The residents, in roster order.
 */
export function inCity(ctx: PuzzlesCtx): readonly string[] {
	const gone = [...(ctx.tryCall(ExileService, "exiled", {}) ?? []), ...ctx.state.struck];
	return ctx.residents.ids.filter((id) => !gone.includes(id));
}

/**
 * The open fragment levels that not every resident in the city has passed: the ones whose fragments the city keeps off the board.
 *
 * @param ctx - The context.
 * @returns The levels, ascending.
 */
export function guardedLevels(ctx: PuzzlesCtx): readonly number[] {
	const levels: number[] = [];
	const alive = inCity(ctx);
	for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) {
		const open = ctx.tick >= (ctx.options.levels.find((entry) => entry.number === level)?.opensAt ?? 0);
		if (!ctx.state.levels.has(level) || !open || alive.every((id) => hasPassed(ctx, id, level))) continue;
		levels.push(level);
	}
	return levels;
}

/**
 * Whether a text quotes `minRun` or more characters in a row of a fragment of a guarded level.
 *
 * @param ctx - The context.
 * @param text - The text.
 * @param minRun - The shortest run that counts.
 * @returns True when it does.
 */
export function carriesGuardedFragment(ctx: PuzzlesCtx, text: string, minRun: number): boolean {
	return guardedLevels(ctx).some((level) => [...(ctx.state.levels.get(level)?.puzzle.fragments.values() ?? [])].some((fragment) => carriesRun(text, fragment, minRun)));
}
