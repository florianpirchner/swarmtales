// SPDX-License-Identifier: Apache-2.0
/** The flow of a match: blocks, rounds and phases, the locks of the decision tools, a decision and the resolution of a round. */
import type { Refusal, ToolSuccess } from "@swarmtales/contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { refuse, reply } from "@swarmtales/sdk";
import type { EconGamesCtx } from "./head.ts";
import { dilemmaPayoff, pairsOf, points, publicGoods, referenceOf, type Action, type Block, type GameKind, type Option, type Outcome, type Pair, type RoundRecord, type Rules } from "./model.ts";

type Ctx = EconGamesCtx;

const TOOLS = { contribute: "contribute", offer: "offer", respond: "respond", choose: "choose" } as const;
const DECISION_TOOLS: readonly Action[] = ["contribute", "offer", "respond", "choose"];

/**
 * The neutral name of each game, as the residents read it.
 *
 * @public
 */
export const LABEL: Readonly<Record<GameKind, string>> = { "public-goods": "the shared fund", ultimatum: "the split offer", dilemma: "the A-or-B choice" };

const rulesOf = (ctx: Ctx): Rules => ({ endowment: ctx.options.endowment, multiplier: ctx.options.multiplier, pie: ctx.options.pie, dilemma: ctx.options.dilemma });

/**
 * The running (or last) block.
 *
 * @param ctx - The context of the mechanic.
 * @returns The block, or undefined before the first.
 *
 * @public
 */
export function blockOf(ctx: Ctx): Block | undefined {
	return ctx.options.blocks[ctx.state.block - 1];
}

// The pairs of the running round (ultimatum: proposer first).
function pairsNow(ctx: Ctx): readonly Pair[] {
	return pairsOf(ctx.state.seats, ctx.state.round);
}

/**
 * The partner of a resident in the running round.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident.
 * @returns The partner (null for a bye) and whether the resident is the first of the pair, or undefined when it is in no pair.
 *
 * @public
 */
export function partnerOf(ctx: Ctx, resident: string): { readonly partner: string | null; readonly first: boolean } | undefined {
	for (const [first, second] of pairsNow(ctx)) {
		if (first === resident) return { partner: second, first: true };
		if (second === resident) return { partner: first, first: false };
	}
	return undefined;
}

// The tool of the phase that is open now, or undefined.
function toolNow(ctx: Ctx): Action | undefined {
	const block = blockOf(ctx);
	if (!ctx.state.running || block === undefined || ctx.state.phase === "idle") return undefined;
	if (ctx.state.phase === "respond") return "respond";
	return block.game === "public-goods" ? "contribute" : block.game === "ultimatum" ? "offer" : "choose";
}

/**
 * Opens the phase's tool for the residents who owe a decision and closes every other decision tool.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function refreshLocks(ctx: Ctx): void {
	const open = toolNow(ctx);
	for (const resident of ctx.residents.ids) {
		for (const tool of DECISION_TOOLS) {
			if (tool === open && ctx.state.owing.includes(resident)) ctx.access.unlock(resident, TOOLS[tool]);
			else ctx.access.lock(resident, TOOLS[tool]);
		}
	}
}

function openPhase(ctx: Ctx, phase: "decide" | "respond", owing: readonly string[], minute: number): void {
	const state = ctx.state;
	state.phase = phase;
	state.owing = [...owing];
	state.told = [];
	state.opened = minute;
	refreshLocks(ctx);
	if (state.owing.length === 0) advance(ctx, minute);
}

function openRound(ctx: Ctx, minute: number): void {
	const state = ctx.state;
	const block = blockOf(ctx);
	if (block === undefined) return;
	state.round += 1;
	state.values = {};
	state.reasons = {};
	state.missed = [];
	state.reported = [];
	const pairs = pairsNow(ctx);
	ctx.emit("round_opened", { block: state.block, round: state.round, game: block.game, pairs: pairs.map(([first, second]) => [first ?? "", second ?? ""]) });
	const paired = pairs.flatMap(([first, second]) => (first !== null && second !== null ? [first, second] : []));
	const owing = block.game === "public-goods" ? state.seats : block.game === "ultimatum" ? pairs.flatMap(([first, second]) => (first !== null && second !== null ? [first] : [])) : paired;
	openPhase(ctx, "decide", owing, minute);
}

function startBlock(ctx: Ctx, block: number): void {
	const state = ctx.state;
	const spec = ctx.options.blocks[block - 1];
	if (spec === undefined) return;
	state.block = block;
	state.round = 0;
	state.history = [];
	state.briefed = [];
	state.blockScores = Object.fromEntries(state.seats.map((id) => [id, 0]));
	state.running = true;
	ctx.emit("block_started", { block, game: spec.game, rounds: spec.rounds, seats: [...state.seats] });
	ctx.tryCall(StrategyBrainService, "gameStarted", { game: block, first: "" });
	openRound(ctx, ctx.tick);
}

/**
 * Starts the next block, or marks it due when another mechanic holds it back.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startBlock(ctx, state.block + 1);
}

/**
 * The points of every seat in one line.
 *
 * @param scores - The points by seat.
 * @param seats - The seats, in the order of the line.
 * @returns The line: `A01 12, A02 9`.
 *
 * @public
 */
export function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${String(points(scores[seat] ?? 0))}`).join(", ");
}

function endBlock(ctx: Ctx): void {
	const state = ctx.state;
	const block = blockOf(ctx);
	if (block === undefined) return;
	state.running = false;
	state.phase = "idle";
	state.owing = [];
	refreshLocks(ctx);
	ctx.emit("block_ended", { block: state.block, game: block.game, scores: { ...state.blockScores }, totals: { ...state.scores } });
	ctx.emit("block_scored", { block: state.block, game: block.game, reference: referenceOf(block.game, state.history, state.seats, rulesOf(ctx)) });
	const last = state.block >= ctx.options.blocks.length;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.block, summary: `${LABEL[block.game]}, points ${scoreLine(state.blockScores, state.seats)}` });
	if (last) ctx.emit("match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.tick + 1, "nextBlock");
}

// The two outcomes of an ultimatum pair: without an offer the proposer missed and nobody gets anything.
function offerOutcomes(ctx: Ctx, first: string, second: string, missed: ReadonlySet<string>): Outcome[] {
	const offer = ctx.state.values[first];
	if (offer === undefined) {
		return [
			{ resident: first, partner: second, role: "proposer", action: "offer", payoff: 0, missed: true },
			{ resident: second, partner: first, role: "responder", payoff: 0, missed: false },
		];
	}
	const accepted = ctx.state.values[second] === 1;
	return [
		{ resident: first, partner: second, role: "proposer", action: "offer", value: offer, offer, accepted, payoff: accepted ? ctx.options.pie - offer : 0, missed: false },
		{ resident: second, partner: first, role: "responder", action: "respond", value: accepted ? 1 : 0, offer, accepted, payoff: accepted ? offer : 0, missed: missed.has(second) },
	];
}

// The two outcomes of a pair of the A-or-B game.
function choiceOutcomes(ctx: Ctx, first: string, second: string, missed: ReadonlySet<string>): Outcome[] {
	const optionOf = (seat: string): Option => (ctx.state.values[seat] === 1 ? "A" : "B");
	const a = optionOf(first);
	const b = optionOf(second);
	return [
		{ resident: first, partner: second, action: "choose", value: a === "A" ? 1 : 0, partnerOption: b, payoff: dilemmaPayoff(a, b, ctx.options.dilemma), missed: missed.has(first) },
		{ resident: second, partner: first, action: "choose", value: b === "A" ? 1 : 0, partnerOption: a, payoff: dilemmaPayoff(b, a, ctx.options.dilemma), missed: missed.has(second) },
	];
}

// The outcomes of the round from the sealed values; residents in `missed` took the default.
function outcomesOf(ctx: Ctx, game: GameKind): { readonly outcomes: Outcome[]; readonly pool?: number } {
	const state = ctx.state;
	const missed = new Set(state.missed);
	if (game === "public-goods") {
		const contributions = new Map(state.seats.map((seat) => [seat, state.values[seat] ?? 0]));
		const pool = [...contributions.values()].reduce((sum, value) => sum + value, 0);
		return { outcomes: [...publicGoods(contributions, state.seats, rulesOf(ctx), missed)], pool };
	}
	const outcomes: Outcome[] = [];
	for (const [first, second] of pairsNow(ctx)) {
		const alone = first ?? second;
		if (first === null || second === null) {
			if (alone !== null) outcomes.push({ resident: alone, payoff: 0, missed: false, sitsOut: true });
			continue;
		}
		outcomes.push(...(game === "ultimatum" ? offerOutcomes(ctx, first, second, missed) : choiceOutcomes(ctx, first, second, missed)));
	}
	return { outcomes };
}

function resolve(ctx: Ctx, minute: number): void {
	const state = ctx.state;
	const block = blockOf(ctx);
	if (block === undefined) return;
	const { outcomes, pool } = outcomesOf(ctx, block.game);
	const record: RoundRecord = { round: state.round, game: block.game, ...(pool === undefined ? {} : { pool }), outcomes };
	state.history.push(record);
	for (const outcome of outcomes) {
		state.scores[outcome.resident] = points((state.scores[outcome.resident] ?? 0) + outcome.payoff);
		state.blockScores[outcome.resident] = points((state.blockScores[outcome.resident] ?? 0) + outcome.payoff);
	}
	ctx.emit("round_resolved", { block: state.block, ...record });
	state.phase = "idle";
	state.owing = [];
	if (state.round < block.rounds) openRound(ctx, minute);
	else endBlock(ctx);
}

/**
 * The phase is complete (or past its deadline): the ultimatum's offers open the answers, everything else resolves.
 *
 * @param ctx - The context of the mechanic.
 * @param minute - The tick the next phase or round opens at.
 *
 * @public
 */
export function advance(ctx: Ctx, minute: number): void {
	const state = ctx.state;
	const block = blockOf(ctx);
	if (block === undefined) return;
	if (block.game === "ultimatum" && state.phase === "decide") {
		const answering = pairsNow(ctx).flatMap(([first, second]) => (first !== null && second !== null && state.values[first] !== undefined ? [second] : []));
		openPhase(ctx, "respond", answering, minute);
		return;
	}
	resolve(ctx, minute);
}

// Why `value` is no amount of the `action` decision, or undefined.
function rangeProblem(ctx: Ctx, action: Action, value: number): Refusal | undefined {
	const max = action === "contribute" ? ctx.options.endowment : action === "offer" ? ctx.options.pie : 1;
	if (!Number.isInteger(value) || value < 0 || value > max) return refuse("OUT_OF_RANGE", `The amount must be a whole number from 0 to ${String(max)}.`);
	return undefined;
}

/**
 * Why `resident` may not make the `action` decision with `value` now.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident that calls, or undefined when the caller is none.
 * @param action - The decision.
 * @param value - Its value: an amount, or 1/0 for accept/reject and A/B.
 * @returns The refusal, or undefined when the decision may be made.
 *
 * @public
 */
export function problemWith(ctx: Ctx, resident: string | undefined, action: Action, value: number): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running || state.phase === "idle") return refuse("NO_ROUND", "No round is open right now; wait for the next one.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this table.");
	if (toolNow(ctx) !== action) return refuse("WRONG_DECISION", `This round asks for ${toolNow(ctx) ?? "nothing"}, not ${action}.`);
	if (!state.owing.includes(resident)) return state.values[resident] === undefined ? refuse("NOT_YOURS", "This decision is not yours this round.") : refuse("ALREADY_DECIDED", "You already decided this round.");
	return rangeProblem(ctx, action, value);
}

// Whether `round` is still the running round with a phase open.
const stillOpen = (ctx: Ctx, round: number): boolean => ctx.state.round === round && ctx.state.phase !== "idle" && ctx.state.running;

/**
 * Seals a decision of `resident` and moves the phase on when it was the last one owed.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident that calls, or undefined when the caller is none.
 * @param action - The decision.
 * @param value - Its value: an amount, or 1/0 for accept/reject and A/B.
 * @param reason - The resident's reason, for the record.
 * @returns The reply, or the refusal of `problemWith`.
 *
 * @public
 */
export function decide(ctx: Ctx, resident: string | undefined, action: Action, value: number, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, resident, action, value);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	const state = ctx.state;
	const note = reason === undefined || reason.trim() === "" ? undefined : reason.trim();
	state.values[resident] = value;
	if (note !== undefined) state.reasons[resident] = note;
	state.owing = state.owing.filter((id) => id !== resident);
	ctx.emit("decision_made", { block: state.block, round: state.round, resident, action, value, ...(note === undefined ? {} : { reason: note }) });
	ctx.access.lock(resident, TOOLS[action]);
	const round = state.round;
	if (state.owing.length === 0) advance(ctx, ctx.tick);
	return reply(stillOpen(ctx, round) ? `Decision sealed for round ${String(round)}. Wait for the others.` : `Decision sealed. Round ${String(round)} is resolved; use viewTable for the result.`);
}
