// SPDX-License-Identifier: Apache-2.0
/** The texts of a turn: the rules and the role of a seat, the task it is asked to do, the table as `viewConvoy` shows it, the input lines of an activation and whether a seat has news. */
import { holdsAudit, list, phaseLine, sizeOf } from "./flow.ts";
import type { ConvoyCtx } from "./head.ts";
import { canDamage, damagedCount, saboteursOf } from "./stage.ts";

type Ctx = ConvoyCtx;

function rulesText(ctx: Ctx): string {
	const { saboteurs, crews, damageToLose, cooldown, talkPosts } = ctx.options;
	return ctx.prompt("convoy/rules", { seats: ctx.state.seats.length, saboteurs, stages: crews.length, crews: crews.join(", "), damageToLose, cooldown, talkPosts });
}

function roleText(ctx: Ctx, resident: string): string {
	if (ctx.state.roles[resident] === "saboteur") {
		const partners = saboteursOf(ctx).filter((seat) => seat !== resident);
		return ctx.prompt("convoy/role-saboteur", { seat: resident, partners: partners.length === 0 ? "nobody else (you are the only one)" : list(partners), cooldown: ctx.options.cooldown, damageToLose: ctx.options.damageToLose });
	}
	return ctx.prompt("convoy/role-loyal", { seat: resident, saboteurs: ctx.options.saboteurs });
}

function choiceText(ctx: Ctx, resident: string): string {
	const state = ctx.state;
	if (state.roles[resident] !== "saboteur") return "You are loyal: play safe.";
	if (canDamage(ctx, resident)) return `You are a saboteur: you may play safe or damage (your damage card is allowed now; after it, the next one only from stage ${String(state.stage + ctx.options.cooldown)}).`;
	return `You are a saboteur, but you played damage in stage ${String(state.lastDamage[resident] ?? 0)}: play safe now (damage again from stage ${String((state.lastDamage[resident] ?? 0) + ctx.options.cooldown)}).`;
}

function proposeTask(ctx: Ctx, resident: string): string {
	const state = ctx.state;
	const task = ctx.prompt("convoy/task-propose", {
		seat: resident,
		stage: state.stage,
		stages: ctx.options.crews.length,
		size: sizeOf(ctx, state.stage),
		damaged: damagedCount(ctx),
		damageToLose: ctx.options.damageToLose,
		vote: state.proposals === 0 ? "The table talks about it and then votes; a strict majority of no ends your term." : "After the lost vote of confidence your crew goes out without a vote.",
	});
	return task + (holdsAudit(ctx, resident) ? " You may first spend the game's single audit (audit: a seat and an earlier stage it crewed) to reveal that card to the table." : "");
}

function talkTask(ctx: Ctx, resident: string): string {
	const state = ctx.state;
	const left = ctx.options.talkPosts - (state.spoken[resident] ?? 0);
	return ctx.prompt("convoy/task-talk", {
		seat: resident,
		stage: state.stage,
		lead: state.lead,
		crew: list(state.crew),
		posts: Math.max(0, left),
		audit: `${state.votes[resident] === undefined ? " You may also cast your sealed vote of confidence now (voteConfidence) or wait for the vote." : " Your vote is cast."}${holdsAudit(ctx, resident) ? " As the lead you may also spend the game's single audit now." : ""}`,
	});
}

// What `resident` is asked to do now, or undefined.
function taskText(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	if (!state.running || state.phase === "idle") return undefined;
	if (state.phase === "talk") return talkTask(ctx, resident);
	if (!state.owing.includes(resident)) return undefined;
	const stage = state.stage;
	switch (state.phase) {
		case "propose":
			return proposeTask(ctx, resident);
		case "vote":
			return ctx.prompt("convoy/task-vote", { seat: resident, stage, lead: state.lead, crew: list(state.crew) });
		case "play":
			return ctx.prompt("convoy/task-play", { seat: resident, stage, crew: list(state.crew), choice: choiceText(ctx, resident) });
		case "accuse":
			return ctx.prompt("convoy/task-accuse", { seat: resident, count: ctx.options.saboteurs });
	}
}

/**
 * The table as `viewConvoy` shows it: where the game stands, the rules, the caller's role, the stages so far and its task.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller; a caller without a seat sees no role, no stages and no task.
 * @returns The text.
 *
 * @public
 */
export function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${state.seats.map((seat) => `${seat} ${String(state.scores[seat] ?? 0)}`).join(", ")}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over. The next game starts soon.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, stage ${String(state.stage)} of ${String(ctx.options.crews.length)}: ${phaseLine(ctx)} Damaged stages: ${String(damagedCount(ctx))} of ${String(ctx.options.damageToLose)}. Audit ${state.auditUsed ? "used" : "unused"}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) {
		lines.push(roleText(ctx, resident));
		const stages = state.stages.map((stage) => `stage ${String(stage.stage)}: lead ${stage.lead}, crew ${list(stage.crew)}, ${String(stage.damage)} damage, votes no: ${list(state.seats.filter((seat) => stage.votes[seat] === "no"))}${stage.audit === undefined ? "" : `, audit ${stage.audit.seat} ${stage.audit.card}`}${stage.rejected === undefined ? "" : ` (after ${stage.rejected.lead}'s crew ${list(stage.rejected.crew)} lost the vote)`}`);
		lines.push(stages.length === 0 ? "No stage played yet." : `Stages so far: ${stages.join("; ")}.`);
		lines.push(taskText(ctx, resident) ?? "Nothing for you to do right now: end your turn.");
	}
	return lines.join("\n");
}

/**
 * Whether `resident` is woken: it owes a move, or the talk is open and it was not invited yet or has lines of the
 * record to read and a line left to speak.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident.
 * @returns True when the resident has news.
 *
 * @public
 */
export function hasNews(ctx: Ctx, resident: string): boolean {
	const state = ctx.state;
	if (!state.running || !state.seats.includes(resident)) return false;
	if (state.owing.includes(resident)) return true;
	if (state.phase !== "talk") return false;
	const unseen = (state.seenLog[resident] ?? 0) < state.log.length;
	return !state.told.includes(resident) || (unseen && (state.spoken[resident] ?? 0) < ctx.options.talkPosts);
}

// The last input line: the invitation to the talk once, a task the seat still owes at every turn until it is done.
function cueLine(ctx: Ctx, resident: string, alone: boolean): string | undefined {
	const state = ctx.state;
	const owes = state.owing.includes(resident);
	if (!owes && (state.phase !== "talk" || state.told.includes(resident))) return undefined;
	if (!state.told.includes(resident)) state.told.push(resident);
	const task = taskText(ctx, resident);
	return task !== undefined && owes && alone ? `Still open: ${task}` : task;
}

/**
 * The input lines of a seat's activation: the rules and its role once per game, the record since its last look, and
 * its task. The invitation to the talk comes once; a task a seat still owes comes again at every turn until it is done.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident that is activated.
 * @returns The lines; none outside a game and for a resident without a seat.
 *
 * @public
 */
export function inputLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	if (!state.running || !state.seats.includes(resident)) return [];
	const lines: string[] = [];
	if (!state.briefed.includes(resident)) {
		state.briefed.push(resident);
		lines.push(`${ctx.prompt("convoy/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`, roleText(ctx, resident));
	}
	const from = state.seenLog[resident] ?? 0;
	if (from < state.log.length) {
		lines.push(state.log.slice(from).join("\n"));
		state.seenLog[resident] = state.log.length;
	}
	const cue = cueLine(ctx, resident, lines.length === 0);
	if (cue !== undefined) lines.push(cue);
	return lines;
}
