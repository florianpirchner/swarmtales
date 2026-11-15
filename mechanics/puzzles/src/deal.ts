// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Dealing a level and reading the deal. Ported from the old platform; the deal draws from `ctx.rng("puzzle", level)`, the old stream. */
import { generateLevelPuzzles } from "./fragments.ts";
import type { PuzzlesCtx, PuzzlesReader } from "./head.ts";
import type { LevelState } from "./model.ts";

/**
 * The highest level that is dealt.
 *
 * @param reader - The context or view.
 * @returns The option `lastLevel`, or the highest level of the game when it is 0.
 */
export function lastLevelOf(reader: PuzzlesReader): number {
	return reader.options.lastLevel > 0 ? reader.options.lastLevel : Math.max(0, ...reader.options.levels.map((level) => level.number));
}

/**
 * Draws the teams and the puzzle of a level from the seed; announces nothing.
 *
 * @param ctx - The context.
 * @param level - The level.
 * @returns The level's state.
 * @throws RangeError when the game has no such level, or no valid puzzle is found.
 * @throws TeamLayoutError when the level's teams cannot be drawn.
 */
function drawLevel(ctx: PuzzlesCtx, level: number): LevelState {
	const definition = ctx.options.levels.find((entry) => entry.number === level);
	if (definition === undefined) throw new RangeError(`puzzles: unknown level ${String(level)}`);
	const teams = ctx.state.planner.teamsOf(level);
	const rng = ctx.rng("puzzle", level);
	const spec = definition.puzzle;
	const [minLength, maxLength] = spec.length;
	const puzzles = generateLevelPuzzles(rng, {
		teams: teams.length,
		passwordLength: rng.int(minLength, maxLength),
		fragmentCount: teams[0]?.members.length ?? 1,
		overlap: spec.overlap,
		...(spec.ownChars === undefined ? {} : { ownChars: spec.ownChars }),
	});
	const fragments = new Map<string, string>();
	teams.forEach((team, index) => {
		const puzzle = puzzles[index];
		if (puzzle === undefined) return;
		rng.shuffle(team.members).forEach((member, position) => {
			const fragment = puzzle.fragments[position];
			if (fragment !== undefined) fragments.set(member, fragment);
		});
	});
	return { teams, puzzle: { kind: "fragments", puzzles, fragments } };
}

/**
 * Writes the audit record of a level's deal, `fragments_dealt`.
 *
 * @param ctx - The context.
 * @param level - The level.
 * @param state - Its state.
 */
function announceDeal(ctx: PuzzlesCtx, level: number, state: LevelState): void {
	const holdings = state.teams.flatMap((team, index) =>
		[...team.members].sort((a, b) => a.localeCompare(b)).map((agent) => ({ agent, team: index, fragment: state.puzzle.fragments.get(agent) ?? "" })),
	);
	ctx.emit("fragments_dealt", { level, holdings });
}

/**
 * Deals a level once and writes the audit record.
 *
 * @param ctx - The context.
 * @param level - The level.
 * @returns False when it was dealt already.
 * @throws RangeError as {@link drawLevel}.
 */
export function dealLevel(ctx: PuzzlesCtx, level: number): boolean {
	if (ctx.state.levels.has(level)) return false;
	const state = drawLevel(ctx, level);
	ctx.state.levels.set(level, state);
	announceDeal(ctx, level, state);
	return true;
}

/**
 * Fragments of excluded teammates that `agent` holds now: the first remaining member of the team inherits them.
 *
 * @param reader - The context or view.
 * @param level - The level.
 * @param agent - The resident.
 * @returns Pairs of the excluded teammate and its fragment.
 */
export function inheritedFragments(reader: PuzzlesReader, level: number, agent: string): readonly (readonly [string, string])[] {
	const state = reader.state.levels.get(level);
	const team = state?.teams.find((candidate) => candidate.members.includes(agent));
	if (state === undefined || team === undefined) return [];
	const excluded = reader.state.exclusions.get(level) ?? new Set<string>();
	const members = [...team.members].sort((a, b) => a.localeCompare(b));
	if (members.find((member) => !excluded.has(member)) !== agent) return [];
	return members.flatMap((member) => {
		const fragment = state.puzzle.fragments.get(member);
		return excluded.has(member) && fragment !== undefined ? [[member, fragment] as const] : [];
	});
}
