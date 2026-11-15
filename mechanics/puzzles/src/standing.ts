// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Where a resident stands. `puzzles` reads it from the events of `progression` (`level_up` marks the level passed,
 * also at a shut door; `level_entered` moves the resident), not through its service, which asks `puzzles` for the
 * pieces (no service cycle, erratum J34). A game without `progression` gives the option `standings`.
 */
import type { PuzzlesCtx, PuzzlesReader } from "./head.ts";

/**
 * The level a resident stands on.
 *
 * @param reader - The context or view.
 * @param resident - The resident.
 * @returns Its level from the events, else from the option `standings`, else `startLevel`.
 */
export function levelOf(reader: PuzzlesReader, resident: string): number {
	return reader.state.standings.get(resident)?.level ?? reader.options.standings?.[resident]?.level ?? reader.options.startLevel;
}

/**
 * Whether a resident has passed a level: beyond it, or waiting at its door (old `hasPassed`).
 *
 * @param reader - The context or view.
 * @param resident - The resident.
 * @param level - The level.
 * @returns True once passed.
 */
export function hasPassed(reader: PuzzlesReader, resident: string, level: number): boolean {
	const moved = reader.state.standings.get(resident);
	if (moved !== undefined) return moved.level > level || moved.passed.includes(level);
	return reader.options.standings?.[resident]?.passed?.includes(level) === true;
}

// The entry of a resident the events move, created from where it stood before.
function moved(ctx: PuzzlesCtx, resident: string): { level: number; readonly passed: number[] } {
	const found = ctx.state.standings.get(resident);
	if (found !== undefined) return found;
	const created = { level: levelOf(ctx, resident), passed: [...(ctx.options.standings?.[resident]?.passed ?? [])] };
	ctx.state.standings.set(resident, created);
	return created;
}

/**
 * Hears `progression.level_up`: the level is passed.
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @param from - The level passed.
 */
export function onLevelUp(ctx: PuzzlesCtx, resident: string, from: number): void {
	const entry = moved(ctx, resident);
	if (!entry.passed.includes(from)) entry.passed.push(from);
}

/**
 * Hears `progression.level_entered`: the resident stands on the level.
 *
 * @param ctx - The context.
 * @param resident - The resident.
 * @param level - The level entered.
 */
export function onLevelEntered(ctx: PuzzlesCtx, resident: string, level: number): void {
	moved(ctx, resident).level = level;
}
