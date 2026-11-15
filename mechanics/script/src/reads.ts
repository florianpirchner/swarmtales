// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the script reads of the city (old `city.ts` and the old `World` getters), each through a query of the mechanic
 * that owns it: who is in the city (`exile`), levels and bounds (`progression`), a level's teams (`level-pieces`,
 * provided by `puzzles`), the direct messages (`channels`). The old script read the teams, the collections and the
 * petitions from the log; on this platform the teams come from `level-pieces`, the petitions from the script's own
 * listeners (`state.statuses`), and the cast from no source yet: the cast has no contract before issue M5-24, so a
 * game reads as one without `cast` (no collection, and a rule that asks whether a cast member is active ends the run).
 */
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LevelPiecesService, ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { need, type ScriptCtx } from "./head.ts";

/**
 * Every resident still in the city, in the game's order (old `alive`); every resident when `exile` is not loaded.
 *
 * @param ctx - The script's context.
 * @returns The ids.
 */
export function alive(ctx: ScriptCtx): readonly string[] {
	return ctx.tryCall(ExileService, "alive", {}) ?? ctx.residents.ids;
}

/**
 * Whether the resident is banished; false when `exile` is not loaded.
 *
 * @param ctx - The script's context.
 * @param resident - The id.
 * @returns True for a banished resident.
 */
export function isExiled(ctx: ScriptCtx, resident: string): boolean {
	return ctx.tryCall(ExileService, "isExiled", { resident }) ?? false;
}

/**
 * The resident's level.
 *
 * @param ctx - The script's context.
 * @param resident - The id.
 * @returns The level.
 * @throws RangeError when `progression` is not loaded.
 */
export function levelOf(ctx: ScriptCtx, resident: string): number {
	return need(ctx, ProgressionService, "levelOf", { resident });
}

/**
 * Whether the level is played in this run (old `isPlayable`).
 *
 * @param ctx - The script's context.
 * @param level - The level.
 * @returns True between the start and the last playable level.
 * @throws RangeError when `progression` is not loaded.
 */
export function isPlayable(ctx: ScriptCtx, level: number): boolean {
	const bounds = need(ctx, ProgressionService, "bounds", {});
	return level >= bounds.startLevel && level <= bounds.lastLevel;
}

/**
 * A level's teams, each with its members (old `teamsOf`); empty while the level is not dealt. The old order was the
 * deal's team index, which `level-pieces` does not name: the teams come in the order of their first member in the
 * game's order of residents.
 *
 * @param ctx - The script's context.
 * @param level - The level.
 * @returns The teams.
 * @throws RangeError when `puzzles` is not loaded.
 */
export function teamsOf(ctx: ScriptCtx, level: number): readonly (readonly string[])[] {
	if (need(ctx, LevelPiecesService, "kindOf", { level }) === "none") return [];
	const teams = new Map<string, readonly string[]>();
	for (const resident of ctx.residents.ids) {
		const members = need(ctx, LevelPiecesService, "teamOf", { resident, level }).members;
		const key = [...members].sort((a, b) => a.localeCompare(b)).join(",");
		if (members.length > 0 && !teams.has(key)) teams.set(key, members);
	}
	return [...teams.values()];
}

/**
 * A collection as the old `cast.collection` showed it to the Director: its end, its size and how many messages it holds.
 *
 * @public
 */
export interface CollectionView {
	/** How many senders it takes. */
	readonly first: number;
	/** The tick it ends. */
	readonly untilMinute: number;
	/** The messages it holds. */
	readonly entries: number;
}

/**
 * What the script reads of the cast: a collection by name, and whether a cast member is active.
 *
 * @public
 */
export interface CastReads {
	/** The collection `into`, or undefined when none was started. */
	collection(into: string): CollectionView | undefined;
	/** Whether the cast member is active (old `CastApi.isActive`). */
	isActive(member: string): boolean;
}

/**
 * The cast as a game without `cast` shows it, until the cast has a contract (issue M5-24): no collection was started,
 * and a rule that asks whether a cast member is active ends the run (old `need`).
 *
 * @public
 */
export const cast: CastReads = {
	collection: () => undefined,
	isActive: (member) => {
		throw new RangeError(`script: a rule needs cast.isActive for ${member}, but no loaded mechanic provides cast`);
	},
};
