// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Dealing a level and reading the deal. Ported from the old platform; the deal draws from `ctx.rng("puzzle", level)`, the old stream. */
import { contractDeal, dealFactors, type FactorDeal } from "./additive.ts";
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
 * The levels dealt when the run starts: up to the door after `holdAfter`, or all of them.
 *
 * @param reader - The context or view.
 * @returns The levels, ascending.
 */
export function openingLevels(reader: PuzzlesReader): readonly number[] {
	const last = lastLevelOf(reader);
	const door = reader.options.holdAfter !== undefined && reader.options.holdAfter < last ? reader.options.holdAfter : last;
	return Array.from({ length: Math.max(0, door - reader.options.startLevel + 1) }, (_, index) => reader.options.startLevel + index);
}

/**
 * The factors of an additive level as they stand: the seeded deal, with the roles of its excluded passed on.
 *
 * @param reader - The context or view.
 * @param level - The level.
 * @param deal - Its seeded deal.
 * @returns The deal now.
 */
export function dealView(reader: PuzzlesReader, level: number, deal: FactorDeal): FactorDeal {
	return contractDeal(deal, reader.state.exclusions.get(level) ?? new Set());
}

/**
 * Draws the teams and the puzzle of a level from the seed; announces nothing.
 *
 * @param ctx - The context.
 * @param level - The level.
 * @returns The level's state.
 * @throws RangeError when the game has no such level, or no valid puzzle is found.
 * @throws TeamLayoutError when the level's teams cannot be drawn.
 * @throws FactorDealError when an additive level's factors cannot be drawn.
 */
export function drawLevel(ctx: PuzzlesCtx, level: number): LevelState {
	const definition = ctx.options.levels.find((entry) => entry.number === level);
	if (definition === undefined) throw new RangeError(`puzzles: unknown level ${String(level)}`);
	const teams = ctx.state.planner.teamsOf(level);
	const rng = ctx.rng("puzzle", level);
	const spec = definition.puzzle;
	if (spec.kind === "additive") {
		const deal = dealFactors(rng, { digits: spec.digits, topology: spec.topology, teams: teams.map((team) => team.members), cityFactorPerTeam: spec.cityFactorPer === "team" });
		return { teams, puzzle: { kind: "additive", deal, holdings: new Map(deal.holdings.map((holding) => [holding.agent, holding])) } };
	}
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
 * Writes the audit record of a level's deal, `fragments_dealt` or `factors_dealt`.
 *
 * @param ctx - The context.
 * @param level - The level.
 * @param state - Its state.
 */
export function announceDeal(ctx: PuzzlesCtx, level: number, state: LevelState): void {
	const { puzzle } = state;
	if (puzzle.kind === "additive") {
		const { digits, cityFactor, teams, holdings } = puzzle.deal;
		ctx.emit("factors_dealt", { level, digits, cityFactor, teams: [...teams], holdings: [...holdings] });
		return;
	}
	const holdings = state.teams.flatMap((team, index) =>
		[...team.members].sort((a, b) => a.localeCompare(b)).map((agent) => ({ agent, team: index, fragment: puzzle.fragments.get(agent) ?? "" })),
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
 * Fragments of excluded teammates that `agent` holds now: the first remaining member of the team inherits them. The
 * fragments of a teammate a strike that keeps took (the holdout tribunal) go to every teammate left (old `inheritedFragments`).
 *
 * @param reader - The context or view.
 * @param level - The level.
 * @param agent - The resident.
 * @param struck - Who a strike that keeps took; the ones the listener of `exile.exiled` noted when left out.
 * @returns Pairs of the excluded or struck teammate and its fragment.
 */
export function inheritedFragments(reader: PuzzlesReader, level: number, agent: string, struck: readonly string[] = reader.state.struck): readonly (readonly [string, string])[] {
	const state = reader.state.levels.get(level);
	const team = state?.teams.find((candidate) => candidate.members.includes(agent));
	if (state?.puzzle.kind !== "fragments" || team === undefined) return [];
	const { fragments } = state.puzzle;
	const excluded = reader.state.exclusions.get(level) ?? new Set<string>();
	const members = [...team.members].sort((a, b) => a.localeCompare(b));
	const heir = members.find((member) => !excluded.has(member));
	return members
		.filter((member) => (excluded.has(member) && heir === agent) || (struck.includes(member) && !excluded.has(member) && !struck.includes(agent)))
		.flatMap((member) => {
			const fragment = fragments.get(member);
			return fragment === undefined ? [] : [[member, fragment] as const];
		});
}
