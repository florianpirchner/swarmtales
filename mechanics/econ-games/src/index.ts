/**
 * The `econ-games` mechanic: a match of classic experimental-economics games for solo seats, one game
 * after another, each over several rounds (docs/ideas/game-roadmap.md §2.2):
 * - `public-goods`: everyone gets an endowment and secretly puts some into a fund that is multiplied
 *   and split equally;
 * - `ultimatum`: rotating pairs, the proposer offers a part of a sum, the responder accepts (the split
 *   holds) or rejects (both get nothing);
 * - `dilemma`: rotating pairs choose A or B at the same time from a payoff table (A is cooperation).
 * The framing is neutral (a shared fund, a split offer, an A-or-B choice): no game is named, so a
 * model has to play the numbers rather than recite a textbook answer. Decisions are sealed (event
 * audience `human`) until a round resolves; a decision not made by the deadline takes the default
 * (nothing put in, no offer, reject, B) and is marked missed. Whether a seat is told the number of
 * rounds is an option (`showHorizon`, off by default against end-game defection). Each game ends
 * with `block_scored`, the distance from Nash play and from the social optimum, for the human only.
 * A strategy brain plugs in through `BrainSourceApi` (it may hold the next game for a retro) and
 * `StrategyBrainApi` (game start and end); without one the match runs on its own.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import {
	Action,
	Block,
	DilemmaPayoffs,
	dilemmaPayoff,
	EconSlice,
	GameKind,
	Outcome,
	pairsOf,
	points,
	publicGoods,
	Reference,
	referenceOf,
	RoundRecord,
	type EconState,
	type Option,
	type Pair,
	type Rules,
} from "./model.ts";

export type { Block } from "./model.ts";

const TOOLS = { contribute: "contribute", offer: "offer", respond: "respond", choose: "choose" } as const;
const DECISION_TOOLS: readonly Action[] = ["contribute", "offer", "respond", "choose"];

const LABEL: Readonly<Record<GameKind, string>> = { "public-goods": "the shared fund", ultimatum: "the split offer", dilemma: "the A-or-B choice" };

const Reason = Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." }));

const options = Type.Object({
	blocks: Type.Array(Block, {
		minItems: 1,
		default: [
			{ game: "ultimatum", rounds: 6 },
			{ game: "public-goods", rounds: 6 },
			{ game: "dilemma", rounds: 6 },
		],
		description: "The games of the match in order, each with its rounds; the run ends after the last.",
	}),
	endowment: Type.Integer({ minimum: 1, default: 10, description: "Public goods: the tokens each seat gets per round." }),
	multiplier: Type.Number({ exclusiveMinimum: 0, default: 1.6, description: "Public goods: the factor on the fund before it is split equally (a dilemma when it lies between 1 and the number of seats)." }),
	pie: Type.Integer({ minimum: 1, default: 10, description: "Ultimatum: the points to split per pair and round." }),
	dilemma: Type.Object(DilemmaPayoffs.properties, { default: { bothA: 3, bothB: 1, temptation: 5, sucker: 0 }, description: "The payoff table of the A-or-B game (a dilemma when temptation > bothA > bothB > sucker and 2 bothA > temptation + sucker)." }),
	showHorizon: Type.Boolean({ default: false, description: "Tell the seats how many rounds a game has (off: unknown horizon, against end-game defection)." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a phase stays open before missing decisions take the default." }),
});

const head = defineHead({
	id: "econ-games",
	summary: "Public goods, ultimatum and an A-or-B dilemma in rounds for solo seats: sealed decisions, payoffs, a match of games.",
	options,
	state: (setup): EconState => ({
		seats: [...setup.residents],
		block: 0,
		round: 0,
		phase: "idle",
		opened: 0,
		owing: [],
		told: [],
		briefed: [],
		reported: [],
		values: {},
		reasons: {},
		missed: [],
		history: [],
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		blockScores: {},
		running: false,
		finished: false,
		held: false,
		due: false,
	}),
	events: {
		block_started: Type.Object({ block: Type.Integer(), game: GameKind, rounds: Type.Integer(), seats: Type.Array(Type.String()) }),
		round_opened: Type.Object({ block: Type.Integer(), round: Type.Integer(), game: GameKind, pairs: Type.Array(Type.Array(Type.String()), { description: "The pairs of the round (the proposer first in the ultimatum game); '' is the bye of an odd table." }) }),
		decision_made: Type.Object({ block: Type.Integer(), round: Type.Integer(), resident: Type.String(), action: Action, value: Type.Number(), reason: Type.Optional(Type.String()) }),
		round_resolved: Type.Object({ block: Type.Integer(), round: RoundRecord.properties.round, game: GameKind, pool: Type.Optional(Type.Number()), outcomes: Type.Array(Outcome) }),
		block_ended: Type.Object({ block: Type.Integer(), game: GameKind, scores: Type.Record(Type.String(), Type.Number()), totals: Type.Record(Type.String(), Type.Number()) }),
		block_scored: Type.Object({ block: Type.Integer(), game: GameKind, reference: Reference }),
		match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// Sealed until the round resolves; the reference score is for the human and the reporter only.
	audiences: { decision_made: ["human"], block_scored: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi],
	prompts: {
		"econ-games/tools/viewTable": [],
		"econ-games/tools/contribute": [],
		"econ-games/tools/offer": [],
		"econ-games/tools/respond": [],
		"econ-games/tools/choose": [],
		"econ-games/rules-public-goods": ["endowment", "multiplier", "seats"],
		"econ-games/rules-ultimatum": ["pie"],
		"econ-games/rules-dilemma": ["bothA", "bothB", "temptation", "sucker"],
		"econ-games/horizon-known": ["rounds"],
		"econ-games/horizon-hidden": [],
		"econ-games/block-head": ["block", "blocks"],
		"econ-games/task-contribute": ["round", "endowment"],
		"econ-games/task-offer": ["round", "partner", "pie"],
		"econ-games/task-respond": ["round", "partner", "offer", "keep"],
		"econ-games/task-wait": ["round", "partner"],
		"econ-games/task-choose": ["round", "partner"],
		"econ-games/sits-out": ["round"],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const rulesOf = (ctx: Ctx): Rules => ({ endowment: ctx.options.endowment, multiplier: ctx.options.multiplier, pie: ctx.options.pie, dilemma: ctx.options.dilemma });

function blockOf(ctx: Ctx): Block | undefined {
	return ctx.options.blocks[ctx.state.block - 1];
}

/** The pairs of the running round (ultimatum: proposer first). */
function pairsNow(ctx: Ctx): readonly Pair[] {
	return pairsOf(ctx.state.seats, ctx.state.round);
}

function partnerOf(ctx: Ctx, resident: string): { readonly partner: string | null; readonly first: boolean } | undefined {
	for (const [first, second] of pairsNow(ctx)) {
		if (first === resident) return { partner: second, first: true };
		if (second === resident) return { partner: first, first: false };
	}
	return undefined;
}

/** The tool of the phase that is open now, or undefined. */
function toolNow(ctx: Ctx): Action | undefined {
	const block = blockOf(ctx);
	if (!ctx.state.running || block === undefined || ctx.state.phase === "idle") return undefined;
	if (ctx.state.phase === "respond") return "respond";
	return block.game === "public-goods" ? "contribute" : block.game === "ultimatum" ? "offer" : "choose";
}

/** Opens the phase's tool for the residents who owe a decision and closes every other decision tool. */
function refreshLocks(ctx: Ctx): void {
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
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game: block, first: "" });
	openRound(ctx, ctx.minute);
}

function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startBlock(ctx, state.block + 1);
}

function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
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
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.block, summary: `${LABEL[block.game]}, points ${scoreLine(state.blockScores, state.seats)}` });
	if (last) ctx.emit("match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.minute + 1, "nextBlock");
}

/** The outcomes of the round from the sealed values; residents in `missed` took the default. */
function outcomesOf(ctx: Ctx, game: GameKind): { readonly outcomes: Outcome[]; readonly pool?: number } {
	const state = ctx.state;
	const missed = new Set(state.missed);
	const rules = rulesOf(ctx);
	if (game === "public-goods") {
		const contributions = new Map(state.seats.map((seat) => [seat, state.values[seat] ?? 0]));
		const pool = [...contributions.values()].reduce((sum, value) => sum + value, 0);
		return { outcomes: [...publicGoods(contributions, state.seats, rules, missed)], pool };
	}
	const outcomes: Outcome[] = [];
	for (const [first, second] of pairsNow(ctx)) {
		const alone = first ?? second;
		if (first === null || second === null) {
			if (alone !== null) outcomes.push({ resident: alone, payoff: 0, missed: false, sitsOut: true });
			continue;
		}
		if (game === "ultimatum") {
			const offer = state.values[first];
			if (offer === undefined) {
				outcomes.push({ resident: first, partner: second, role: "proposer", action: "offer", payoff: 0, missed: true });
				outcomes.push({ resident: second, partner: first, role: "responder", payoff: 0, missed: false });
				continue;
			}
			const accepted = state.values[second] === 1;
			outcomes.push({ resident: first, partner: second, role: "proposer", action: "offer", value: offer, offer, accepted, payoff: accepted ? rules.pie - offer : 0, missed: false });
			outcomes.push({ resident: second, partner: first, role: "responder", action: "respond", value: accepted ? 1 : 0, offer, accepted, payoff: accepted ? offer : 0, missed: missed.has(second) });
			continue;
		}
		const optionOf = (seat: string): Option => (state.values[seat] === 1 ? "A" : "B");
		const a = optionOf(first);
		const b = optionOf(second);
		outcomes.push({ resident: first, partner: second, action: "choose", value: a === "A" ? 1 : 0, partnerOption: b, payoff: dilemmaPayoff(a, b, rules.dilemma), missed: missed.has(first) });
		outcomes.push({ resident: second, partner: first, action: "choose", value: b === "A" ? 1 : 0, partnerOption: a, payoff: dilemmaPayoff(b, a, rules.dilemma), missed: missed.has(second) });
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

/** The phase is complete (or past its deadline): the ultimatum's offers open the answers, everything else resolves. */
function advance(ctx: Ctx, minute: number): void {
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

/** Why `resident` may not make the `action` decision with `value` now, or undefined. */
function problemWith(ctx: Ctx, resident: string | undefined, action: Action, value: number): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running || state.phase === "idle") return refuse("NO_ROUND", "No round is open right now; wait for the next one.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this table.");
	if (toolNow(ctx) !== action) return refuse("WRONG_DECISION", `This round asks for ${toolNow(ctx) ?? "nothing"}, not ${action}.`);
	if (!state.owing.includes(resident)) return refuse(state.values[resident] === undefined ? "NOT_YOURS" : "ALREADY_DECIDED", state.values[resident] === undefined ? "This decision is not yours this round." : "You already decided this round.");
	const max = action === "contribute" ? ctx.options.endowment : action === "offer" ? ctx.options.pie : 1;
	if (!Number.isInteger(value) || value < 0 || value > max) return refuse("OUT_OF_RANGE", `The amount must be a whole number from 0 to ${String(max)}.`);
	return undefined;
}

function decide(ctx: Ctx, resident: string | undefined, action: Action, value: number, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, resident, action, value);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	const state = ctx.state;
	state.values[resident] = value;
	if (reason !== undefined && reason.trim() !== "") state.reasons[resident] = reason.trim();
	state.owing = state.owing.filter((id) => id !== resident);
	ctx.emit("decision_made", { block: state.block, round: state.round, resident, action, value, ...(reason === undefined || reason.trim() === "" ? {} : { reason: reason.trim() }) });
	ctx.access.lock(resident, TOOLS[action]);
	const round = state.round;
	if (state.owing.length === 0) advance(ctx, ctx.minute);
	return reply(state.round === round && state.phase !== "idle" && state.running ? `Decision sealed for round ${String(round)}. Wait for the others.` : `Decision sealed. Round ${String(round)} is resolved; use viewTable for the result.`);
}

/** One line of a resident's own past round. */
function outcomeLine(record: RoundRecord, resident: string, ctx: Ctx): string {
	const own = record.outcomes.find((outcome) => outcome.resident === resident);
	const head = `round ${String(record.round)}: `;
	if (own === undefined || own.sitsOut === true) return `${head}you sat out`;
	const got = `you got ${String(own.payoff)}`;
	if (record.game === "public-goods") {
		const all = record.outcomes.map((outcome) => `${outcome.resident} ${String(outcome.value ?? 0)}`).join(", ");
		return `${head}${own.missed ? "no decision in time, counted as 0" : `you put in ${String(own.value ?? 0)}`}; contributions ${all} (fund ${String(record.pool ?? 0)}); ${got}`;
	}
	const partner = own.partner ?? "nobody";
	if (record.game === "ultimatum") {
		if (own.role === "proposer") {
			if (own.offer === undefined) return `${head}you made no offer to ${partner} in time; ${got}`;
			return `${head}you offered ${partner} ${String(own.offer)} of ${String(ctx.options.pie)}, ${own.accepted === true ? "accepted" : "rejected"}; ${got}`;
		}
		if (own.offer === undefined) return `${head}${partner} made you no offer in time; ${got}`;
		const answer = own.missed ? "no answer in time, counted as a rejection" : own.accepted === true ? "you accepted" : "you rejected";
		return `${head}${partner} offered you ${String(own.offer)} of ${String(ctx.options.pie)}, ${answer}; ${got}`;
	}
	const mine = own.value === 1 ? "A" : "B";
	return `${head}${own.missed ? "no choice in time, counted as B" : `you chose ${mine}`}, ${partner} chose ${own.partnerOption ?? "B"}; ${got}`;
}

function rulesText(ctx: Ctx, block: Block): string {
	const { endowment, multiplier, pie, dilemma } = ctx.options;
	const rules =
		block.game === "public-goods"
			? ctx.prompt("econ-games/rules-public-goods", { endowment, multiplier, seats: ctx.state.seats.length })
			: block.game === "ultimatum"
				? ctx.prompt("econ-games/rules-ultimatum", { pie })
				: ctx.prompt("econ-games/rules-dilemma", { bothA: dilemma.bothA, bothB: dilemma.bothB, temptation: dilemma.temptation, sucker: dilemma.sucker });
	const horizon = ctx.options.showHorizon ? ctx.prompt("econ-games/horizon-known", { rounds: block.rounds }) : ctx.prompt("econ-games/horizon-hidden", {});
	return `${rules} ${horizon}`;
}

/** What `resident` is asked to do in the open phase, or undefined when nothing. */
function taskText(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	const block = blockOf(ctx);
	if (!state.running || block === undefined || state.phase === "idle" || !state.seats.includes(resident)) return undefined;
	const round = state.round;
	const seat = partnerOf(ctx, resident);
	if (block.game !== "public-goods" && (seat === undefined || seat.partner === null)) return ctx.prompt("econ-games/sits-out", { round });
	const partner = seat?.partner ?? "";
	const owes = state.owing.includes(resident);
	if (block.game === "public-goods") return owes ? ctx.prompt("econ-games/task-contribute", { round, endowment: ctx.options.endowment }) : undefined;
	if (block.game === "dilemma") return owes ? ctx.prompt("econ-games/task-choose", { round, partner }) : undefined;
	if (state.phase === "decide") return owes ? ctx.prompt("econ-games/task-offer", { round, partner, pie: ctx.options.pie }) : seat?.first === false ? ctx.prompt("econ-games/task-wait", { round, partner }) : undefined;
	const offer = state.values[partner];
	return owes && offer !== undefined ? ctx.prompt("econ-games/task-respond", { round, partner, offer, keep: ctx.options.pie - offer }) : undefined;
}

function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	const block = blockOf(ctx);
	if (block === undefined || !state.running) return state.block === 0 ? "The first game has not started yet." : `Game ${String(state.block)} is over; the next one starts soon. Points: ${scoreLine(state.scores, state.seats)}.`;
	const lines = [`Game ${String(state.block)} of ${String(ctx.options.blocks.length)}: ${LABEL[block.game]}, round ${String(state.round)}.`, rulesText(ctx, block)];
	if (resident !== undefined && state.seats.includes(resident)) {
		lines.push(taskText(ctx, resident) ?? "Nothing to decide for you right now.");
		lines.push(`Your points: ${String(points(state.blockScores[resident] ?? 0))} in this game, ${String(points(state.scores[resident] ?? 0))} in all.`);
		const past = state.history.map((record) => outcomeLine(record, resident, ctx));
		lines.push(past.length === 0 ? "No round of this game is resolved yet." : `Your rounds in this game: ${past.join("; ")}.`);
	}
	return lines.join("\n");
}

export const econGames = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewTable",
			description: "econ-games/tools/viewTable",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(tableText(ctx, ctx.resident)),
		}),
		kit.tool({
			name: TOOLS.contribute,
			description: "econ-games/tools/contribute",
			parameters: Type.Object({ amount: Type.Integer({ minimum: 0, description: "Tokens to put into the shared fund." }), reason: Reason }),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx, ctx.resident, "contribute", params.amount),
			execute: (params, ctx) => decide(ctx, ctx.resident, "contribute", params.amount, params.reason),
		}),
		kit.tool({
			name: TOOLS.offer,
			description: "econ-games/tools/offer",
			parameters: Type.Object({ amount: Type.Integer({ minimum: 0, description: "Points offered to the partner." }), reason: Reason }),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx, ctx.resident, "offer", params.amount),
			execute: (params, ctx) => decide(ctx, ctx.resident, "offer", params.amount, params.reason),
		}),
		kit.tool({
			name: TOOLS.respond,
			description: "econ-games/tools/respond",
			parameters: Type.Object({ accept: Type.Boolean({ description: "true accepts the offer, false rejects it." }), reason: Reason }),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx, ctx.resident, "respond", params.accept ? 1 : 0),
			execute: (params, ctx) => decide(ctx, ctx.resident, "respond", params.accept ? 1 : 0, params.reason),
		}),
		kit.tool({
			name: TOOLS.choose,
			description: "econ-games/tools/choose",
			parameters: Type.Object({ option: Type.Union([Type.Literal("A"), Type.Literal("B")], { description: "A or B." }), reason: Reason }),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx, ctx.resident, "choose", params.option === "A" ? 1 : 0),
			execute: (params, ctx) => decide(ctx, ctx.resident, "choose", params.option === "A" ? 1 : 0, params.reason),
		}),
	],
	services: [
		kit.provide(BrainSourceApi, {
			game: (_input, ctx) => ctx.state.block,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.minute + 1, "nextBlock");
				return null;
			},
		}),
	],
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.econGames,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.econGames,
			run: (ctx) => {
				const state = ctx.state;
				if (!state.running || state.phase === "idle" || ctx.minute - state.opened + 1 < ctx.options.deadline) return;
				state.missed = [...state.missed, ...state.owing];
				state.owing = [];
				refreshLocks(ctx);
				advance(ctx, ctx.minute + 1);
			},
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.phase !== "idle" && ctx.state.owing.includes(resident),
		turnInputs: {
			order: HOOK_ORDER.turnInputs.econGames,
			run: (resident, ctx) => {
				const state = ctx.state;
				const block = blockOf(ctx);
				if (!state.running || block === undefined || !state.seats.includes(resident)) return [];
				const lines: string[] = [];
				if (!state.briefed.includes(resident)) {
					state.briefed.push(resident);
					lines.push(`${ctx.prompt("econ-games/block-head", { block: state.block, blocks: ctx.options.blocks.length })} ${rulesText(ctx, block)}`);
				}
				if (state.phase !== "idle" && !state.told.includes(resident)) {
					state.told.push(resident);
					const last = state.history[state.history.length - 1];
					if (last?.round === state.round - 1 && !state.reported.includes(resident)) {
						state.reported.push(resident);
						lines.push(`Last ${outcomeLine(last, resident, ctx)}.`);
					}
					const task = taskText(ctx, resident);
					if (task !== undefined) lines.push(task);
				}
				return lines;
			},
		},
	},
	jobs: {
		nextBlock: (ctx) => {
			startNext(ctx);
		},
	},
	limits: [kit.limit("match", "Breaches once the last game of the match is over.", (view: View) => (view.state.finished ? "the match is over" : undefined))],
	facts: {
		scores: kit.fact(Type.Record(Type.String(), Type.Number()), (view) => ({ ...view.state.scores })),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: EconSlice,
		save: (state) => ({
			...state,
			seats: [...state.seats],
			owing: [...state.owing],
			told: [...state.told],
			briefed: [...state.briefed],
			reported: [...state.reported],
			values: { ...state.values },
			reasons: { ...state.reasons },
			missed: [...state.missed],
			history: state.history.map((record) => ({ ...record, outcomes: record.outcomes.map((outcome) => ({ ...outcome })) })),
			scores: { ...state.scores },
			blockScores: { ...state.blockScores },
		}),
		load: (data) => ({
			...data,
			seats: [...data.seats],
			owing: [...data.owing],
			told: [...data.told],
			briefed: [...data.briefed],
			reported: [...(data.reported ?? [])],
			values: { ...data.values },
			reasons: { ...data.reasons },
			missed: [...data.missed],
			history: data.history.map((record) => ({ ...record, outcomes: record.outcomes.map((outcome) => ({ ...outcome })) })),
			scores: { ...data.scores },
			blockScores: { ...data.blockScores },
		}),
	}),
}));
