// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The texts a resident reads: the rules of a game, its task in the open phase, a past round in one line and the table. */
import { blockOf, LABEL, partnerOf, scoreLine } from "./flow.ts";
import type { EconGamesCtx } from "./head.ts";
import { points, type Block, type Outcome, type RoundRecord } from "./model.ts";

type Ctx = EconGamesCtx;

// A past round of the shared fund.
function fundLine(record: RoundRecord, own: Outcome, head: string, got: string): string {
	const all = record.outcomes.map((outcome) => `${outcome.resident} ${String(outcome.value ?? 0)}`).join(", ");
	return `${head}${own.missed ? "no decision in time, counted as 0" : `you put in ${String(own.value ?? 0)}`}; contributions ${all} (fund ${String(record.pool ?? 0)}); ${got}`;
}

// A past round of the split offer, for the proposer or the responder.
function offerLine(own: Outcome, partner: string, pie: number, head: string, got: string): string {
	if (own.role === "proposer") {
		if (own.offer === undefined) return `${head}you made no offer to ${partner} in time; ${got}`;
		return `${head}you offered ${partner} ${String(own.offer)} of ${String(pie)}, ${own.accepted === true ? "accepted" : "rejected"}; ${got}`;
	}
	if (own.offer === undefined) return `${head}${partner} made you no offer in time; ${got}`;
	const answer = own.missed ? "no answer in time, counted as a rejection" : own.accepted === true ? "you accepted" : "you rejected";
	return `${head}${partner} offered you ${String(own.offer)} of ${String(pie)}, ${answer}; ${got}`;
}

/**
 * One line of a resident's own past round.
 *
 * @param record - The resolved round.
 * @param resident - The resident that reads the line.
 * @param ctx - The context of the mechanic.
 * @returns The line, without a full stop.
 *
 * @public
 */
export function outcomeLine(record: RoundRecord, resident: string, ctx: Ctx): string {
	const own = record.outcomes.find((outcome) => outcome.resident === resident);
	const head = `round ${String(record.round)}: `;
	if (own === undefined || own.sitsOut === true) return `${head}you sat out`;
	const got = `you got ${String(own.payoff)}`;
	if (record.game === "public-goods") return fundLine(record, own, head, got);
	const partner = own.partner ?? "nobody";
	if (record.game === "ultimatum") return offerLine(own, partner, ctx.options.pie, head, got);
	const mine = own.value === 1 ? "A" : "B";
	return `${head}${own.missed ? "no choice in time, counted as B" : `you chose ${mine}`}, ${partner} chose ${own.partnerOption ?? "B"}; ${got}`;
}

/**
 * The rules of a block's game, with what the seats are told of its length.
 *
 * @param ctx - The context of the mechanic.
 * @param block - The block.
 * @returns The text.
 *
 * @public
 */
export function rulesText(ctx: Ctx, block: Block): string {
	const { endowment, multiplier, pie, dilemma } = ctx.options;
	const rules =
		block.game === "public-goods"
			? ctx.prompt("econ-lab/rules-public-goods", { endowment, multiplier, seats: ctx.state.seats.length })
			: block.game === "ultimatum"
				? ctx.prompt("econ-lab/rules-ultimatum", { pie })
				: ctx.prompt("econ-lab/rules-dilemma", { bothA: dilemma.bothA, bothB: dilemma.bothB, temptation: dilemma.temptation, sucker: dilemma.sucker });
	const horizon = ctx.options.showHorizon ? ctx.prompt("econ-lab/horizon-known", { rounds: block.rounds }) : ctx.prompt("econ-lab/horizon-hidden", {});
	return `${rules} ${horizon}`;
}

// The task of a seat of a pair: the A-or-B choice, the offer (or the wait for it), the answer.
function pairTask(ctx: Ctx, game: Block["game"], seat: { readonly partner: string; readonly first: boolean }, owes: boolean): string | undefined {
	const round = ctx.state.round;
	const partner = seat.partner;
	if (game === "dilemma") return owes ? ctx.prompt("econ-lab/task-choose", { round, partner }) : undefined;
	if (ctx.state.phase === "decide") return owes ? ctx.prompt("econ-lab/task-offer", { round, partner, pie: ctx.options.pie }) : seat.first ? undefined : ctx.prompt("econ-lab/task-wait", { round, partner });
	const offer = ctx.state.values[partner];
	return owes && offer !== undefined ? ctx.prompt("econ-lab/task-respond", { round, partner, offer, keep: ctx.options.pie - offer }) : undefined;
}

/**
 * What `resident` is asked to do in the open phase.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident.
 * @returns The task, or undefined when there is nothing to do.
 *
 * @public
 */
export function taskText(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	const block = blockOf(ctx);
	if (!state.running || block === undefined || state.phase === "idle" || !state.seats.includes(resident)) return undefined;
	const round = state.round;
	const owes = state.owing.includes(resident);
	if (block.game === "public-goods") return owes ? ctx.prompt("econ-lab/task-contribute", { round, endowment: ctx.options.endowment }) : undefined;
	const seat = partnerOf(ctx, resident);
	if (seat?.partner === undefined || seat.partner === null) return ctx.prompt("econ-lab/sits-out", { round });
	return pairTask(ctx, block.game, { partner: seat.partner, first: seat.first }, owes);
}

// What a seat reads of itself on the table: its task, its points and its past rounds of the game.
function ownLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	const past = state.history.map((record) => outcomeLine(record, resident, ctx));
	return [
		taskText(ctx, resident) ?? "Nothing to decide for you right now.",
		`Your points: ${String(points(state.blockScores[resident] ?? 0))} in this game${ctx.options.showEarlierPoints === false ? "" : `, ${String(points(state.scores[resident] ?? 0))} in all`}.`,
		past.length === 0 ? "No round of this game is resolved yet." : `Your rounds in this game: ${past.join("; ")}.`,
	];
}

/**
 * The lines a seat is shown when it is activated: the rules once per game, then once per phase the result of the
 * round before and the task. It notes in the state what the seat was told.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident that is activated.
 * @returns The lines; none between two games and for a resident without a seat.
 *
 * @public
 */
export function inputLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	const block = blockOf(ctx);
	if (!state.running || block === undefined || !state.seats.includes(resident)) return [];
	const lines: string[] = [];
	if (!state.briefed.includes(resident)) {
		state.briefed.push(resident);
		lines.push(`${ctx.prompt("econ-lab/block-head", { block: state.block, blocks: ctx.options.blocks.length })} ${rulesText(ctx, block)}`);
	}
	if (state.phase === "idle" || state.told.includes(resident)) return lines;
	state.told.push(resident);
	return [...lines, ...phaseLines(ctx, resident)];
}

// The result of the round before (once per round) and the task of the open phase.
function phaseLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	const lines: string[] = [];
	const last = state.history[state.history.length - 1];
	if (last?.round === state.round - 1 && !state.reported.includes(resident)) {
		state.reported.push(resident);
		lines.push(`Last ${outcomeLine(last, resident, ctx)}.`);
	}
	const task = taskText(ctx, resident);
	if (task !== undefined) lines.push(task);
	return lines;
}

/**
 * The table as `viewTable` shows it: the game, its rules, the caller's task, points and past rounds.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident that looks, or undefined when the caller is none.
 * @returns The text.
 *
 * @public
 */
export function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	const block = blockOf(ctx);
	if (block === undefined || !state.running) return state.block === 0 ? "The first game has not started yet." : `Game ${String(state.block)} is over; the next one starts soon.${ctx.options.showEarlierPoints === false ? "" : ` Points: ${scoreLine(state.scores, state.seats)}.`}`;
	const lines = [`Game ${String(state.block)} of ${String(ctx.options.blocks.length)}: ${LABEL[block.game]}, round ${String(state.round)}.`, rulesText(ctx, block)];
	if (resident !== undefined && state.seats.includes(resident)) lines.push(...ownLines(ctx, resident));
	return lines.join("\n");
}
