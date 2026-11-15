// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Levels, the door clock, the ranking and the penalty ladder (carried from the old `mechanics/progression/src/levels.ts`
 * and `rules.ts`: `levelOf`, `isFinished`, `hasPassed`, `ranking`, `penaltyAt`, `renderTemplate`). The acts and the
 * tool locks of the old file come with the second half of the port (M5-20).
 */
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import type { ProgressionCtx } from "./head.ts";
import { lastLevelIn, type Standing, type Options } from "./model.ts";

/**
 * The last playable level.
 * @param ctx - The context of the progression.
 * @returns The level number.
 */
export function lastLevelOf(ctx: ProgressionCtx): number {
	return lastLevelIn(ctx.options);
}

/**
 * Where the resident stands; an id that is no resident throws.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns Its entry in the state.
 * @throws RangeError for an id that is no resident.
 */
export function standingOf(ctx: ProgressionCtx, resident: string): Standing {
	const found = ctx.state.standings.get(resident);
	if (found === undefined) throw new RangeError(`progression: ${resident} is not a resident`);
	return found;
}

/**
 * The game's definition of a level.
 * @param ctx - The context of the progression.
 * @param level - The level.
 * @returns The level's definition, or undefined.
 */
export function definitionOf(ctx: ProgressionCtx, level: number): Options["levels"][number] | undefined {
	return ctx.options.levels.find((entry) => entry.number === level);
}

/**
 * The level the resident stands on.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns The level number.
 */
export function levelOf(ctx: ProgressionCtx, resident: string): number {
	return standingOf(ctx, resident).level;
}

/**
 * Whether `level` is played in this run (between start and last level).
 * @param ctx - The context of the progression.
 * @param level - The level.
 * @returns True for a level between the start and the last level.
 */
export function isPlayable(ctx: ProgressionCtx, level: number): boolean {
	return level >= ctx.options.startLevel && level <= lastLevelOf(ctx);
}

/**
 * Whether the resident has passed the last level.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns True once finished.
 */
export function isFinished(ctx: ProgressionCtx, resident: string): boolean {
	return levelOf(ctx, resident) > lastLevelOf(ctx);
}

/**
 * Whether the resident has passed `level`: beyond it, or waiting at its door.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @param level - The level.
 * @returns True once passed.
 */
export function hasPassed(ctx: ProgressionCtx, resident: string, level: number): boolean {
	const entry = standingOf(ctx, resident);
	return entry.level > level || entry.solved.includes(level);
}

/**
 * The minute the door of `level` opens; 0 when it is open from the start.
 * @param ctx - The context of the progression.
 * @param level - The level.
 * @returns The minute.
 */
export function opensAt(ctx: ProgressionCtx, level: number): number {
	return definitionOf(ctx, level)?.opensAt ?? 0;
}

/**
 * Whether `level`'s door is open on the door clock now.
 * @param ctx - The context of the progression.
 * @param level - The level.
 * @returns True while the door is open.
 */
export function isOpenOnClock(ctx: ProgressionCtx, level: number): boolean {
	return ctx.tick >= opensAt(ctx, level);
}

/**
 * Whether the resident is banished; nobody is without a loaded `exile`.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns True for a banished resident.
 */
export function isExiled(ctx: ProgressionCtx, resident: string): boolean {
	return ctx.tryCall(ExileService, "isExiled", { resident }) === true;
}

/**
 * Residents still in the city: not banished.
 * @param ctx - The context of the progression.
 * @returns The residents, in roster order.
 */
export function aliveResidents(ctx: ProgressionCtx): readonly string[] {
	return ctx.residents.ids.filter((id) => !isExiled(ctx, id));
}

/** One place in the ranking. */
export interface Ranked {
	readonly agent: string;
	readonly rank: number;
	readonly points: number;
	readonly level: number;
}

/**
 * The ranking: the banished last, then by points, by level and by id.
 * @param ctx - The context of the progression.
 * @returns Every resident with its rank, best first.
 */
export function ranking(ctx: ProgressionCtx): readonly Ranked[] {
	const exiled = (agent: string): number => (isExiled(ctx, agent) ? 1 : 0);
	return [...ctx.state.standings.keys()]
		.map((agent) => ({ agent, points: ctx.call(LedgerService, "balance", { account: agent }), level: levelOf(ctx, agent) }))
		.sort((a, b) => exiled(a.agent) - exiled(b.agent) || b.points - a.points || b.level - a.level || a.agent.localeCompare(b.agent))
		.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * The resident's rank; the last place when it is not ranked.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns The rank, from 1.
 */
export function rankOf(ctx: ProgressionCtx, resident: string): number {
	return ranking(ctx).find((candidate) => candidate.agent === resident)?.rank ?? ctx.residents.ids.length;
}

type Ladder = NonNullable<Options["penalty"]>;

/**
 * The price of the `offence`-th offence (from 1): its step, or the last step beyond the ladder.
 * @param ladder - The penalty ladder.
 * @param offence - The number of the offence, from 1.
 * @returns The points.
 */
export function penaltyAt(ladder: Ladder, offence: number): number {
	const steps = typeof ladder === "number" ? [ladder] : ladder;
	return steps[Math.min(Math.max(1, offence), steps.length) - 1] ?? 0;
}

/**
 * What the resident's next wrong code costs.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns The points.
 */
export function nextPenalty(ctx: ProgressionCtx, resident: string): number {
	return ctx.options.penalty === undefined ? 0 : penaltyAt(ctx.options.penalty, (ctx.state.offences.get(resident)?.wrong ?? 0) + 1);
}

/**
 * What the resident pays for its next lost blame.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns The points.
 */
export function nextBlamePenalty(ctx: ProgressionCtx, resident: string): number {
	return ctx.options.blamePenalty === undefined ? 0 : penaltyAt(ctx.options.blamePenalty, (ctx.state.offences.get(resident)?.blames ?? 0) + 1);
}

/**
 * The resident's offences, counted from 0.
 * @param ctx - The context of the progression.
 * @param resident - The resident.
 * @returns The counts, which the caller may change.
 */
export function offencesOf(ctx: ProgressionCtx, resident: string): { wrong: number; blames: number } {
	const found = ctx.state.offences.get(resident);
	if (found !== undefined) return found;
	const created = { wrong: 0, blames: 0 };
	ctx.state.offences.set(resident, created);
	return created;
}

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * Replaces `{name}` with `values[name]`; an unknown placeholder throws.
 * @param template - The template with `{name}` placeholders.
 * @param values - The value of each placeholder.
 * @returns The filled text.
 * @throws RangeError for an unknown placeholder.
 */
export function renderTemplate(template: string, values: Readonly<Partial<Record<string, string>>>): string {
	return template.replace(PLACEHOLDER, (_match: string, name: string) => {
		const value = values[name];
		if (value === undefined) throw new RangeError(`progression: unknown placeholder {${name}} in a task`);
		return value;
	});
}
