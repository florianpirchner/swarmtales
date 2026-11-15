// SPDX-License-Identifier: Apache-2.0
/**
 * The task of a level and the progression's parts of the status line (carried from the old
 * `mechanics/progression/src/task.ts`: `problemFor`, `taskLines`, `statusParts`, `awaitsCode`). The task is the
 * game's template filled with the puzzle's values. The old task asked three other mechanics for a line under it (the
 * names, the holdout rule, the marks terms); on this platform each of them writes its own line (erratum J31).
 */
import type { InputLine } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { LevelPiecesService } from "./contract.ts";
import type { ProgressionCtx } from "./head.ts";
import { standingOf, definitionOf, isFinished, isOpenOnClock, isPlayable, levelOf, nextBlamePenalty, nextPenalty, opensAt, rankOf, renderTemplate } from "./levels.ts";

const CITY = "CITY";

/** The old order of the parts of the status line (`STATUS_ORDER` of the old `mechanics/shared/src/turn-input.ts`). */
export const STATUS_ORDER = { minute: 100, level: 200, rank: 400, awaitsCode: 800 } as const;

/** One level's task as a resident reads it. */
export interface Problem {
	readonly level: number;
	readonly text: string;
	readonly solved: boolean;
}

/** The task of a level, or why there is none. */
export type ProblemResult = { readonly ok: true; readonly value: Problem } | { readonly ok: false; readonly error: "UNKNOWN_LEVEL" | "LEVEL_NOT_REACHED" };

/**
 * A text as the resident reads it: every id replaced by its name when a provider of `identity` is loaded.
 * @param ctx - The context of the progression.
 * @param text - The text.
 * @returns The text as the resident reads it.
 */
export function shown(ctx: ProgressionCtx, text: string): string {
	return ctx.tryCall(IdentityService, "display", { text }) ?? text;
}

function renderTask(ctx: ProgressionCtx, agent: string, level: number, definition: NonNullable<ReturnType<typeof definitionOf>>): string {
	const team = ctx.call(LevelPiecesService, "teamOf", { resident: agent, level });
	const members = [...team.members].sort((a, b) => a.localeCompare(b));
	return renderTemplate(definition.task, {
		...ctx.call(LevelPiecesService, "taskValues", { resident: agent, level }),
		level: String(level),
		title: definition.title,
		reward: String(definition.reward),
		partner: members.find((member) => member !== agent) ?? agent,
		members: members.join(", "),
		leader: team.leader,
		teamSize: String(team.members.length),
		survivors: String(ctx.options.survivors),
		agents: String(ctx.residents.ids.length),
		penalty: String(nextPenalty(ctx, agent)),
		blamePenalty: String(nextBlamePenalty(ctx, agent)),
	});
}

/**
 * The task of `level` for the resident; before the level's door opens, the closed-door text.
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 * @param level - The level.
 * @returns The task, or why there is none.
 */
export function problemFor(ctx: ProgressionCtx, agent: string, level: number): ProblemResult {
	const definition = definitionOf(ctx, level);
	if (definition === undefined || !isPlayable(ctx, level)) return { ok: false, error: "UNKNOWN_LEVEL" };
	const entry = standingOf(ctx, agent);
	if (level > entry.level) return { ok: false, error: "LEVEL_NOT_REACHED" };
	// The door clock: nothing of the level before its door opens.
	if (!isOpenOnClock(ctx, level)) return { ok: true, value: { level, text: ctx.prompt("progression/door-closed", { level, title: definition.title, opensAt: opensAt(ctx, level) }), solved: false } };
	return { ok: true, value: { level, text: renderTask(ctx, agent, level, definition), solved: entry.solved.includes(level) } };
}

/**
 * The task once per level, or the game's finished notice (kind `task`); it only reads, `markTaskShown` records it.
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 * @returns The task line, or nothing.
 */
export function taskLines(ctx: ProgressionCtx, agent: string): readonly InputLine[] {
	const level = levelOf(ctx, agent);
	if (!hasNewTask(ctx, agent)) return [];
	const problem = isFinished(ctx, agent) ? undefined : problemFor(ctx, agent, level);
	// As the old `currentProblem`: a level without a task shows the finished notice too.
	const text = problem?.ok === true ? problem.value.text : ctx.prompt("progression/input/notice", { author: CITY, text: ctx.options.finishedNotice });
	return [{ kind: "task", text: shown(ctx, text) }];
}

/**
 * The activation opened: the task it carried counts as shown (the old arena marked it once the inputs were built).
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 */
export function markTaskShown(ctx: ProgressionCtx, agent: string): void {
	ctx.state.delivered.set(agent, { level: levelOf(ctx, agent), finished: isFinished(ctx, agent) });
}

/**
 * Whether the resident has a task it has not read yet.
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 * @returns True while a task is unread.
 */
export function hasNewTask(ctx: ProgressionCtx, agent: string): boolean {
	const shownBefore = ctx.state.delivered.get(agent);
	return shownBefore?.level !== levelOf(ctx, agent) || shownBefore.finished !== isFinished(ctx, agent);
}

function levelText(ctx: ProgressionCtx, agent: string): string {
	const entry = standingOf(ctx, agent);
	const level = entry.level;
	if (isFinished(ctx, agent)) return ctx.prompt("progression/status/level-finished", { level });
	if (entry.held) return ctx.prompt("progression/status/level-waiting", { level });
	return isOpenOnClock(ctx, level) ? ctx.prompt("progression/status/level-open", { level }) : ctx.prompt("progression/status/level-closed", { level, opensAt: opensAt(ctx, level) });
}

/**
 * The parts of the status line this mechanic owns: minute, level, rank and the code that awaits confirmation.
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 * @returns The parts, each with its old order.
 */
export function statusParts(ctx: ProgressionCtx, agent: string): readonly InputLine[] {
	const parts: InputLine[] = [
		{ kind: "status", text: ctx.prompt("progression/status/minute", { minute: ctx.tick }), order: STATUS_ORDER.minute },
		{ kind: "status", text: levelText(ctx, agent), order: STATUS_ORDER.level },
		{ kind: "status", text: ctx.prompt("progression/status/rank", { rank: rankOf(ctx, agent), residents: ctx.residents.ids.length }), order: STATUS_ORDER.rank },
	];
	if (awaitsCode(ctx, agent)) {
		const penalty = nextPenalty(ctx, agent);
		const cost = penalty > 0 ? ` ${ctx.prompt("progression/status/no-confirmation-cost", { price: `${String(penalty)} ${penalty === 1 ? "point" : "points"}` })}` : "";
		parts.push({ kind: "status", text: ctx.prompt("progression/status/no-confirmation", { cost }), order: STATUS_ORDER.awaitsCode });
	}
	return parts;
}

/**
 * Whether the resident stands before a door of personal codes it has not passed (additive level, not waiting).
 * @param ctx - The context of the progression.
 * @param agent - The resident.
 * @returns True before such a door.
 */
export function awaitsCode(ctx: ProgressionCtx, agent: string): boolean {
	const entry = standingOf(ctx, agent);
	return !isFinished(ctx, agent) && !entry.held && ctx.call(LevelPiecesService, "kindOf", { level: entry.level }) === "additive";
}
