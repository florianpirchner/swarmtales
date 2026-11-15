// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the holdout tribunal reads of the deal (the service `holdout-pieces` of `standoff-tribunal`; old
 * `openFragmentDoors`, `lackingFragment` and `inherited` of the old `PuzzlesApi`). The court asks right after
 * `exile.banish` in the same call, before the listener of `exile.exiled` runs, so who is gone and who was struck is
 * read from `exile` at once (`alive`, `exiled`), not from the state that listener keeps (erratum J168).
 */
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { inheritedFragments, lastLevelOf } from "./deal.ts";
import type { PuzzlesCtx } from "./head.ts";
import { lackingFragment, type City } from "./held.ts";

/**
 * Every level of fragments whose door is open on the clock now, ascending (old `openFragmentDoors`).
 *
 * @param ctx - The context.
 * @returns The doors.
 */
export function openFragmentDoors(ctx: PuzzlesCtx): number[] {
	const doors: number[] = [];
	for (let level = ctx.options.startLevel; level <= lastLevelOf(ctx); level++) {
		const opensAt = ctx.options.levels.find((entry) => entry.number === level)?.opensAt ?? 0;
		if (ctx.state.levels.get(level)?.puzzle.kind === "fragments" && ctx.tick >= opensAt) doors.push(level);
	}
	return doors;
}

// The city as `exile` holds it now: the banished (a strike that keeps included), those at the gate, and the struck.
function cityNow(ctx: PuzzlesCtx): City {
	const alive = ctx.tryCall(ExileService, "alive", {}) ?? ctx.residents.ids;
	const registered = ctx.tryCall(ExileService, "exiled", {}) ?? [];
	const gone = ctx.residents.ids.filter((id) => !alive.includes(id) || ctx.state.struck.includes(id));
	const away = alive.filter((id) => (ctx.tryCall(ExileService, "standing", { resident: id })?.kind ?? "alive") !== "alive");
	return { exiled: gone, away, struck: gone.filter((id) => !registered.includes(id)), dms: ctx.tryCall(ChannelsService, "dmRecords", {}) ?? [] };
}

/**
 * Who stands before the door in the holder's team without a copy of its fragment, sorted (old `lackingFragment`): a
 * banished holder lacks nobody, a teammate out of the city is not counted, a struck teammate's fragment is held.
 *
 * @param ctx - The context.
 * @param level - The door.
 * @param holder - The holder.
 * @returns The residents.
 */
export function holdoutLacking(ctx: PuzzlesCtx, level: number, holder: string): string[] {
	return [...lackingFragment(ctx, cityNow(ctx), level, holder)];
}

/**
 * The fragments of struck or excluded teammates the resident holds on the level, in order (old `inherited`).
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @param level - The level.
 * @returns The fragments with whom they came from.
 */
export function holdoutInherited(ctx: PuzzlesCtx, resident: string, level: number): { from: string; fragment: string }[] {
	return inheritedFragments(ctx, level, resident, cityNow(ctx).struck).map(([from, fragment]) => ({ from, fragment }));
}
