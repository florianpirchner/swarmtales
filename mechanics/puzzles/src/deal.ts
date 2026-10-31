/**
 * Dealing a level and reading the deal (old `#dealLevel`, `#announceDeal`, `#solutionOf`,
 * `#fragmentPuzzleOf`, `#dealView`, `#inheritedFragments`, `#isPasswordPiece`, `#guardedLevels` of
 * packages/engine/src/world.ts). The deal draws from `ctx.rng("puzzle", level)`, the old stream.
 */
import { contractDeal, dealFactors, type FactorDeal } from "./additive.ts";
import { generateLevelPuzzles, type FragmentPuzzle } from "./fragments.ts";
import type { PuzzlesCtx, PuzzlesView } from "./head.ts";
import type { LevelState } from "./model.ts";

type Reader = PuzzlesCtx | PuzzlesView;

export function lastLevelOf(ctx: Reader): number {
	return ctx.options.lastLevel > 0 ? ctx.options.lastLevel : Math.max(0, ...ctx.options.levels.map((level) => level.number));
}

export function definitionOf(ctx: Reader, level: number): PuzzlesCtx["options"]["levels"][number] | undefined {
	return ctx.options.levels.find((entry) => entry.number === level);
}

/** The levels dealt when the run starts: up to the first door, or all of them. */
export function openingLevels(ctx: Reader): readonly number[] {
	const last = lastLevelOf(ctx);
	const door = ctx.options.holdAfter !== undefined && ctx.options.holdAfter < last ? ctx.options.holdAfter : last;
	return Array.from({ length: Math.max(0, last - ctx.options.startLevel + 1) }, (_, index) => ctx.options.startLevel + index).filter((level) => level <= door);
}

/** Teams and puzzle of a level, drawn from the seed; announces nothing. */
function drawLevel(ctx: PuzzlesCtx, level: number): LevelState {
	const definition = definitionOf(ctx, level);
	if (definition === undefined) throw new Error(`Unknown level ${level}`);
	const teams = ctx.state.planner.teamsOf(level);
	const rng = ctx.rng("puzzle", level);
	const spec = definition.puzzle;
	if (spec.kind === "additive") {
		const deal = dealFactors(rng, { digits: spec.digits, topology: spec.topology, teams: teams.map((team) => team.members), cityFactorPerTeam: spec.cityFactorPer === "team" });
		return { teams, puzzle: { kind: "additive", deal, holdings: new Map(deal.holdings.map((holding) => [holding.agent, holding])) } };
	}
	const [minLength, maxLength] = spec.length;
	const teamSize = teams[0]?.members.length ?? 1;
	const puzzles = generateLevelPuzzles(rng, {
		teams: teams.length,
		passwordLength: rng.int(minLength, maxLength),
		fragmentCount: teamSize,
		overlap: spec.overlap,
		...(spec.ownChars === undefined ? {} : { ownChars: spec.ownChars }),
	});
	const fragments = new Map<string, string>();
	teams.forEach((team, index) => {
		const puzzle = puzzles[index];
		if (puzzle === undefined) return;
		const order = rng.shuffle(team.members);
		order.forEach((member, position) => {
			const fragment = puzzle.fragments[position];
			if (fragment !== undefined) fragments.set(member, fragment);
		});
	});
	return { teams, puzzle: { kind: "fragments", puzzles, fragments } };
}

/** Deals a level once and writes the audit record; false when it was dealt already. */
export function dealLevel(ctx: PuzzlesCtx, level: number): boolean {
	if (ctx.state.levels.has(level)) return false;
	const state = drawLevel(ctx, level);
	ctx.state.levels.set(level, state);
	const puzzle = state.puzzle;
	if (puzzle.kind === "additive") {
		const deal = puzzle.deal;
		ctx.emit("factors_dealt", { level, digits: deal.digits, cityFactor: deal.cityFactor, teams: [...deal.teams], holdings: [...deal.holdings] });
		return true;
	}
	ctx.emit("fragments_dealt", {
		level,
		holdings: state.teams.flatMap((team, index) =>
			[...team.members]
				.sort((a, b) => a.localeCompare(b))
				.map((agent) => ({ agent, team: index, fragment: puzzle.fragments.get(agent) ?? "" })),
		),
	});
	return true;
}

/** The deal of a level as it stands: the seeded one, with the roles of its excluded passed on. */
export function dealView(ctx: Reader, level: number, deal: FactorDeal): FactorDeal {
	return contractDeal(deal, ctx.state.exclusions.get(level) ?? new Set());
}

export function fragmentPuzzleOf(ctx: Reader, level: number, agent: string): FragmentPuzzle {
	const state = ctx.state.levels.get(level);
	if (state?.puzzle.kind !== "fragments") throw new Error(`Level ${level} has no password`);
	const index = state.teams.findIndex((team) => team.members.includes(agent));
	const puzzle = state.puzzle.puzzles[index];
	if (puzzle === undefined) throw new Error(`${agent} has no puzzle on level ${level}`);
	return puzzle;
}

/** The code that passes the level for the resident: the team password or its own code; null when not dealt. */
export function solutionOf(ctx: Reader, level: number, agent: string): string | null {
	const puzzle = ctx.state.levels.get(level)?.puzzle;
	if (puzzle === undefined) return null;
	if (puzzle.kind === "fragments") {
		const state = ctx.state.levels.get(level);
		return state?.teams.some((team) => team.members.includes(agent)) === true ? fragmentPuzzleOf(ctx, level, agent).password : null;
	}
	return puzzle.holdings.get(agent)?.code ?? null;
}

/** Residents the holdout tribunal struck (the exile mechanic's `exiled` events with `by: "holdout"`). */
export function struckResidents(ctx: Reader): readonly string[] {
	return ctx.log.ofType("exile", "exiled").flatMap((event) => {
		const payload: unknown = event.payload;
		if (typeof payload !== "object" || payload === null) return [];
		const agent: unknown = Reflect.get(payload, "agent");
		return Reflect.get(payload, "by") === "holdout" && typeof agent === "string" ? [agent] : [];
	});
}

/**
 * Fragments of excluded teammates that `agent` holds now: the first remaining member of the team
 * inherits them. The fragments of a teammate struck by the holdout tribunal go to every teammate left.
 */
export function inheritedFragments(ctx: Reader, level: number, agent: string): readonly (readonly [string, string])[] {
	const state = ctx.state.levels.get(level);
	if (state?.puzzle.kind !== "fragments") return [];
	const team = state.teams.find((candidate) => candidate.members.includes(agent));
	if (team === undefined) return [];
	const excluded = ctx.state.exclusions.get(level) ?? new Set<string>();
	const struck = struckResidents(ctx);
	const members = [...team.members].sort((a, b) => a.localeCompare(b));
	const heir = members.find((member) => !excluded.has(member));
	const fragments = state.puzzle.fragments;
	return members
		.filter((member) => (excluded.has(member) && heir === agent) || (struck.includes(member) && !excluded.has(member) && !struck.includes(agent)))
		.flatMap((member) => {
			const fragment = fragments.get(member);
			return fragment === undefined ? [] : [[member, fragment] as const];
		});
}

/** A token that is part of a dealt password stays as written, even when it looks like an ID. */
export function isPasswordPiece(ctx: Reader, token: string): boolean {
	for (const state of ctx.state.levels.values()) {
		if (state.puzzle.kind === "fragments" && state.puzzle.puzzles.some((puzzle) => puzzle.password.includes(token))) return true;
	}
	return false;
}
