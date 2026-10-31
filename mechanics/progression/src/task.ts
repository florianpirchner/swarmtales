/**
 * The task of a level and the status line's frame (old `problemFor`, `#renderTask`, `statusLine` and
 * `Arena#inputsFor` of packages/engine). The task text is the story's template filled with the
 * puzzle's values; names, marks and the holdout rule are not appended here (docs/design/
 * carve-requests-T3.md, request 9).
 */
import { MarksApi, NamesApi, PuzzlesApi } from "@swarmtales/mechanic-shared";
import type { ProgressionCtx } from "./head.ts";
import { competitorOf, definitionOf, isFinished, isOpenOnClock, isPlayable, levelOf, nextBlamePenalty, nextPenalty, opensAt, ranking } from "./levels.ts";
import { renderTemplate } from "./rules.ts";

const CITY = "CITY";

export interface Problem {
	readonly level: number;
	readonly title: string;
	readonly reward: number;
	readonly text: string;
	readonly solved: boolean;
}

export type ProblemResult = { readonly ok: true; readonly value: Problem } | { readonly ok: false; readonly error: "UNKNOWN_LEVEL" | "LEVEL_NOT_REACHED" };

function renderTask(ctx: ProgressionCtx, agent: string, level: number): string {
	const definition = definitionOf(ctx, level);
	if (definition === undefined) throw new Error(`Unknown level ${level}`);
	const team = ctx.call(PuzzlesApi, "teamOf", { resident: agent, level });
	const members = [...team.members].sort((a, b) => a.localeCompare(b));
	const text = renderTemplate(definition.task, {
		...ctx.call(PuzzlesApi, "taskValues", { resident: agent, level }),
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
	return withAddenda(text, [nameLine(ctx, agent), marksLine(ctx, level)]);
}

/** The line a mechanic of the run appends under a task, or null. */
function nameLine(ctx: ProgressionCtx, agent: string): string | null {
	return ctx.tryCall(NamesApi, "taskLine", { resident: agent }) ?? null;
}

function marksLine(ctx: ProgressionCtx, level: number): string | null {
	return ctx.tryCall(MarksApi, "taskLine", { level }) ?? null;
}

/** Appends each line under the text, each after a `trimEnd` (D-3; the holdout rule is request 1 of round 2). */
function withAddenda(text: string, lines: readonly (string | null)[]): string {
	return lines.reduce<string>((joined, line) => (line === null ? joined : `${joined.trimEnd()}\n${line}`), text);
}

export function problemFor(ctx: ProgressionCtx, agent: string, level: number): ProblemResult {
	const definition = definitionOf(ctx, level);
	if (definition === undefined || !isPlayable(ctx, level)) return { ok: false, error: "UNKNOWN_LEVEL" };
	const entry = competitorOf(ctx, agent);
	if (level > entry.level) return { ok: false, error: "LEVEL_NOT_REACHED" };
	if (!isOpenOnClock(ctx, level)) {
		// The door clock: nothing of the level before its door opens.
		const text = withAddenda(ctx.prompt("progression/door-closed", { level, title: definition.title, opensAt: opensAt(ctx, level) }), [nameLine(ctx, agent)]);
		return { ok: true, value: { level, title: definition.title, reward: definition.reward, text, solved: false } };
	}
	return { ok: true, value: { level, title: definition.title, reward: definition.reward, text: renderTask(ctx, agent, level), solved: entry.solved.includes(level) } };
}

/** The task of the resident's current level, or undefined once it is finished. */
export function currentProblem(ctx: ProgressionCtx, agent: string): Problem | undefined {
	if (isFinished(ctx, agent)) return undefined;
	const problem = problemFor(ctx, agent, levelOf(ctx, agent));
	return problem.ok ? problem.value : undefined;
}

export interface InputLine {
	readonly kind: string;
	readonly text: string;
	readonly order?: number;
}

/** The task once per level, or the story's finished notice (kind `task`, so it stays before the DMs). */
export function taskLines(ctx: ProgressionCtx, agent: string): readonly InputLine[] {
	const level = levelOf(ctx, agent);
	const finished = isFinished(ctx, agent);
	const shown = ctx.state.delivered.get(agent);
	if (shown?.level === level && shown.finished === finished) return [];
	ctx.state.delivered.set(agent, { level, finished });
	const problem = currentProblem(ctx, agent);
	return [{ kind: "task", text: problem === undefined ? ctx.prompt("competitor/input/notice", { author: CITY, text: ctx.options.finishedNotice }) : problem.text }];
}

function plural(count: number, singular: string, pluralForm: string): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** The parts of the status line this mechanic owns: minute, level, rank and the code that awaits confirmation. */
export function statusParts(ctx: ProgressionCtx, agent: string, order: { readonly minute: number; readonly level: number; readonly rank: number; readonly awaitsCode: number }): readonly InputLine[] {
	const entry = competitorOf(ctx, agent);
	const level = entry.level;
	const levelText = isFinished(ctx, agent)
		? ctx.prompt("competitor/status/level-finished", { level })
		: entry.held
			? ctx.prompt("competitor/status/level-waiting", { level })
			: isOpenOnClock(ctx, level)
				? ctx.prompt("competitor/status/level-open", { level })
				: ctx.prompt("competitor/status/level-closed", { level, opensAt: opensAt(ctx, level) });
	const rank = ranking(ctx).find((candidate) => candidate.agent === agent)?.rank ?? ctx.residents.ids.length;
	const parts: InputLine[] = [
		{ kind: "status", text: ctx.prompt("competitor/status/minute", { minute: ctx.minute }), order: order.minute },
		{ kind: "status", text: levelText, order: order.level },
		{ kind: "status", text: ctx.prompt("competitor/status/rank", { rank, competitors: ctx.residents.ids.length }), order: order.rank },
	];
	if (awaitsCode(ctx, agent)) {
		const penalty = nextPenalty(ctx, agent);
		const cost = penalty > 0 ? ` ${ctx.prompt("competitor/status/no-confirmation-cost", { price: plural(penalty, "point", "points") })}` : "";
		parts.push({ kind: "status", text: ctx.prompt("competitor/status/no-confirmation", { cost }), order: order.awaitsCode });
	}
	return parts;
}

/** Whether the resident stands before a door of personal codes it has not passed (additive level, not waiting). */
export function awaitsCode(ctx: ProgressionCtx, agent: string): boolean {
	const entry = competitorOf(ctx, agent);
	return !isFinished(ctx, agent) && !entry.held && ctx.call(PuzzlesApi, "kindOf", { level: entry.level }) === "additive";
}
