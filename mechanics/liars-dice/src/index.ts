/**
 * The `liars-dice` mechanic: the traditional bluffing game with hidden dice for solo seats
 * (docs/ideas/game-roadmap.md §2.11). A match is several games. In a game every seat starts with the
 * same number of dice; each round every seat still in rolls its dice in secret (seeded), and the seats
 * take turns in table order: each either bids higher ("at least 4 x 5 on the whole table") or calls the
 * last bid a lie (`liar`). A call reveals every die: if the table holds at least the bid's quantity of
 * its face, the caller loses a die, else the bidder does; ones are wild (they count for every face and
 * cannot be bid on) unless the story turns that off. The loser opens the next round (or the next seat
 * still in, if it is out). A seat without dice is out; the last seat with dice wins the game. Places
 * score points (default 3, 2, 1, 0).
 *
 * Every die is server-side: the rolls (`dice_rolled`) and the reasons a seat gives are for the human
 * only, so a bluff stays a bluff; a seat sees only its own dice, the dice counts and the public record
 * of bids, calls and reveals. A bid may carry a short public remark (`say`, table talk; off with
 * `talk: false`). The engine checks every bid (it must beat the standing bid and fit on the table). A
 * seat that does not act by the deadline calls liar, or opens with the lowest bid. Every decision is
 * scored against a simple probability baseline (the seat's own dice, every other die fair and
 * unknown; it reads nothing into the bids) in `dice_decision_scored`, and every game ends with
 * `dice_game_scored` (bluffs, calls won, agreement), both for the human and the reporter only. A
 * strategy brain plugs in through `BrainSourceApi` and `StrategyBrainApi`, as in the econ lab.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import {
	baselineOf,
	Bid,
	bidProblem,
	bidText,
	countFor,
	DiceSlice,
	diceText,
	type Entry,
	lowestFace,
	minimalRaise,
	nextLive,
	Scored,
	SeatStats,
	statsOf,
	truthOf,
	type DiceState,
	type Rules,
} from "./model.ts";

const BID = "bid";
const LIAR = "liar";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games in the match; a strategy brain is rewritten between games, and every game starts from a fresh context." }),
	dice: Type.Integer({ minimum: 1, maximum: 10, default: 4, description: "Dice every seat starts a game with." }),
	faces: Type.Integer({ minimum: 2, maximum: 12, default: 6, description: "Faces of a die." }),
	wildOnes: Type.Boolean({ default: true, description: "Ones count for every face and cannot be bid on." }),
	placePoints: Type.Array(Type.Number(), { maxItems: 10, default: [3, 2, 1, 0], description: "Points for the first, second, ... place of a game (the winner first, the first seat out last); missing places score 0." }),
	talk: Type.Boolean({ default: true, description: "A bid or a call may carry a short public remark (table talk)." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes the seat to act has before it calls liar, or opens with the lowest bid." }),
});

const head = defineHead({
	id: "liars-dice",
	summary: "Liar's dice for solo seats: secret seeded rolls, escalating bids checked by the engine, liar calls that reveal every die, a probability baseline for the report.",
	options,
	state: (setup): DiceState => {
		if (setup.residents.length < 2 || setup.residents.length > 8) throw new Error("liars-dice: a table seats 2 to 8 players");
		return {
			seats: [...setup.residents],
			game: 0,
			round: 0,
			counts: {},
			dice: {},
			bidder: "",
			toAct: "",
			out: [],
			log: [],
			seenLog: {},
			briefed: [],
			told: false,
			opened: 0,
			decisions: [],
			scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
			gameScores: {},
			running: false,
			finished: false,
			held: false,
			due: false,
		};
	},
	events: {
		dice_game_started: Type.Object({ game: Type.Integer(), seats: Type.Array(Type.String()), dice: Type.Integer() }),
		dice_rolled: Type.Object({ game: Type.Integer(), round: Type.Integer(), dice: Type.Record(Type.String(), Type.Array(Type.Integer())) }),
		dice_round_started: Type.Object({ game: Type.Integer(), round: Type.Integer(), starter: Type.String(), counts: Type.Record(Type.String(), Type.Integer()) }),
		dice_bid: Type.Object({ game: Type.Integer(), round: Type.Integer(), seat: Type.String(), quantity: Type.Integer(), face: Type.Integer(), say: Type.Optional(Type.String()), missed: Type.Optional(Type.Boolean()) }),
		dice_called: Type.Object({
			game: Type.Integer(),
			round: Type.Integer(),
			seat: Type.String(),
			bidder: Type.String(),
			bid: Bid,
			count: Type.Integer(),
			dice: Type.Record(Type.String(), Type.Array(Type.Integer())),
			loser: Type.String(),
			say: Type.Optional(Type.String()),
			missed: Type.Optional(Type.Boolean()),
		}),
		dice_seat_out: Type.Object({ game: Type.Integer(), seat: Type.String(), place: Type.Integer() }),
		dice_decision_scored: Type.Object({ ...Scored.properties, reason: Type.Optional(Type.String()) }),
		dice_game_ended: Type.Object({ game: Type.Integer(), places: Type.Record(Type.String(), Type.Integer()), points: Type.Record(Type.String(), Type.Number()), totals: Type.Record(Type.String(), Type.Number()) }),
		dice_game_scored: Type.Object({ game: Type.Integer(), stats: Type.Record(Type.String(), SeatStats) }),
		dice_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// Every roll and every reason (a bluff's motive) is for the human and the reporter only.
	audiences: { dice_rolled: ["human"], dice_decision_scored: ["human"], dice_game_scored: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi],
	prompts: {
		"liars-dice/tools/viewTable": [],
		"liars-dice/tools/bid": [],
		"liars-dice/tools/liar": [],
		"liars-dice/rules": ["seats", "dice", "faces", "wild", "lowest", "places", "talk"],
		"liars-dice/game-head": ["game", "games"],
		"liars-dice/task": ["round", "dice", "total", "standing", "choices"],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const rulesOf = (ctx: Ctx): Rules => ({ faces: ctx.options.faces, wildOnes: ctx.options.wildOnes });

const totalDice = (state: DiceState): number => Object.values(state.counts).reduce((sum, count) => sum + count, 0);

/** A seat's name as `viewer` reads it: its own seat is marked (P133). */
const nameFor = (seat: string, viewer: string | undefined): string => (seat === viewer ? `${seat} (you)` : seat);

function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[], viewer?: string): string {
	return seats.map((seat) => `${nameFor(seat, viewer)} ${String(scores[seat] ?? 0)}`).join(", ");
}

function countsLine(state: DiceState, viewer: string | undefined): string {
	return state.seats.map((seat) => `${nameFor(seat, viewer)} ${String(state.counts[seat] ?? 0)}`).join(", ");
}

function refreshLocks(ctx: Ctx): void {
	const state = ctx.state;
	for (const seat of state.seats) {
		const turn = state.running && state.toAct === seat;
		if (turn) ctx.access.unlock(seat, BID);
		else ctx.access.lock(seat, BID);
		if (turn && state.standing !== undefined) ctx.access.unlock(seat, LIAR);
		else ctx.access.lock(seat, LIAR);
	}
}

function startRound(ctx: Ctx, starter: string, minute: number): void {
	const state = ctx.state;
	state.round += 1;
	const rng = ctx.rng("liars-dice", "roll", state.game, state.round);
	state.dice = Object.fromEntries(state.seats.map((seat) => [seat, Array.from({ length: state.counts[seat] ?? 0 }, () => rng.int(1, ctx.options.faces))]));
	delete state.standing;
	state.bidder = "";
	state.toAct = starter;
	state.opened = minute;
	state.told = false;
	const counts = { ...state.counts };
	state.log.push({ kind: "round", round: state.round, starter, counts });
	ctx.emit("dice_rolled", { game: state.game, round: state.round, dice: Object.fromEntries(Object.entries(state.dice).map(([seat, dice]) => [seat, [...dice]])) });
	ctx.emit("dice_round_started", { game: state.game, round: state.round, starter, counts });
	refreshLocks(ctx);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.round = 0;
	state.counts = Object.fromEntries(state.seats.map((seat) => [seat, ctx.options.dice]));
	state.out = [];
	state.log = [];
	state.seenLog = {};
	state.briefed = [];
	state.decisions = [];
	state.gameScores = {};
	state.running = true;
	ctx.emit("dice_game_started", { game, seats: [...state.seats], dice: ctx.options.dice });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: "" });
	// The first round of each game opens one seat further round the table.
	startRound(ctx, state.seats[(game - 1) % state.seats.length] ?? "", ctx.minute);
}

function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
}

/** Places of the finished game: the last seat with dice first, then the seats out, last out first. */
function placesOf(state: DiceState): Record<string, number> {
	const order = [...state.seats.filter((seat) => !state.out.includes(seat)), ...[...state.out].reverse()];
	return Object.fromEntries(order.map((seat, index) => [seat, index + 1]));
}

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	state.running = false;
	state.toAct = "";
	refreshLocks(ctx);
	const places = placesOf(state);
	const points = Object.fromEntries(state.seats.map((seat) => [seat, ctx.options.placePoints[(places[seat] ?? 1) - 1] ?? 0]));
	state.gameScores = points;
	for (const seat of state.seats) state.scores[seat] = (state.scores[seat] ?? 0) + (points[seat] ?? 0);
	ctx.emit("dice_game_ended", { game: state.game, places, points: { ...points }, totals: { ...state.scores } });
	ctx.emit("dice_game_scored", { game: state.game, stats: statsOf(state.seats, state.decisions, state.log, places, points) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	const ranking = Object.entries(places)
		.sort((a, b) => a[1] - b[1])
		.map(([seat, place]) => `${String(place)}. ${seat}`)
		.join(", ");
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: `${String(state.round)} rounds; places ${ranking}; points ${scoreLine(points, state.seats)}` });
	if (last) ctx.emit("dice_match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.minute + 1, "nextGame");
}

/** Scores the decision of the seat to act against the baseline and records it. */
function score(ctx: Ctx, kind: "bid" | "liar", bid: Bid | undefined, missed: boolean, reason: string | undefined): void {
	const state = ctx.state;
	const seat = state.toAct;
	const own = state.dice[seat] ?? [];
	const unseen = totalDice(state) - own.length;
	const rules = rulesOf(ctx);
	const base = baselineOf(state.standing, own, unseen, rules);
	const round3 = (value: number): number => Math.round(value * 1000) / 1000;
	const standingTruth = state.standing === undefined ? undefined : truthOf(state.standing, own, unseen, rules);
	const truth = kind === "bid" && bid !== undefined ? truthOf(bid, own, unseen, rules) : 1 - (standingTruth ?? 1);
	const scored: Scored = {
		game: state.game,
		round: state.round,
		resident: seat,
		kind,
		...(bid === undefined ? {} : { bid: { ...bid } }),
		...(state.standing === undefined ? {} : { standing: { ...state.standing } }),
		dice: [...own],
		unseen,
		truth: round3(truth),
		...(standingTruth === undefined ? {} : { standingTruth: round3(standingTruth) }),
		baseline: base.kind,
		...(base.bid === undefined ? {} : { baselineBid: { ...base.bid } }),
		agree: base.kind === kind,
		bluff: kind === "bid" && truth < 0.5,
		missed,
	};
	state.decisions.push(scored);
	ctx.emit("dice_decision_scored", { ...scored, ...(reason === undefined || reason.trim() === "" ? {} : { reason: reason.trim() }) });
}

const remarkOf = (ctx: Ctx, say: string | undefined): string | undefined => (ctx.options.talk && say !== undefined && say.trim() !== "" ? say.trim() : undefined);

function placeBid(ctx: Ctx, bid: Bid, say: string | undefined, missed: boolean, minute: number): void {
	const state = ctx.state;
	const seat = state.toAct;
	const remark = remarkOf(ctx, say);
	state.standing = { ...bid };
	state.bidder = seat;
	state.log.push({ kind: "bid", round: state.round, seat, bid: { ...bid }, ...(remark === undefined ? {} : { say: remark }), ...(missed ? { missed: true } : {}) });
	ctx.emit("dice_bid", { game: state.game, round: state.round, seat, quantity: bid.quantity, face: bid.face, ...(remark === undefined ? {} : { say: remark }), ...(missed ? { missed: true } : {}) });
	state.toAct = nextLive(state.seats, state.counts, seat, false);
	state.opened = minute;
	state.told = false;
	// The seat knows its own bid: its next turn reports only what came after it.
	state.seenLog[seat] = state.log.length;
	refreshLocks(ctx);
}

/** The call: every die is shown, the loser gives up one die, and the next round (or the game's end) follows. */
function callLiar(ctx: Ctx, say: string | undefined, missed: boolean, minute: number): { readonly loser: string; readonly count: number; readonly bid: Bid } | undefined {
	const state = ctx.state;
	const bid = state.standing;
	if (bid === undefined) return undefined;
	const seat = state.toAct;
	const remark = remarkOf(ctx, say);
	const all = Object.values(state.dice).flat();
	const count = countFor(all, bid.face, rulesOf(ctx));
	const loser = count >= bid.quantity ? seat : state.bidder;
	const dice = Object.fromEntries(Object.entries(state.dice).filter(([, own]) => own.length > 0).map(([owner, own]) => [owner, [...own].sort((a, b) => a - b)]));
	state.log.push({ kind: "liar", round: state.round, seat, bidder: state.bidder, bid: { ...bid }, count, dice, loser, ...(remark === undefined ? {} : { say: remark }), ...(missed ? { missed: true } : {}) });
	ctx.emit("dice_called", { game: state.game, round: state.round, seat, bidder: state.bidder, bid: { ...bid }, count, dice, loser, ...(remark === undefined ? {} : { say: remark }), ...(missed ? { missed: true } : {}) });
	state.counts[loser] = Math.max(0, (state.counts[loser] ?? 0) - 1);
	if ((state.counts[loser] ?? 0) === 0) {
		state.out.push(loser);
		const place = state.seats.length - state.out.length + 1;
		state.log.push({ kind: "out", seat: loser, place });
		ctx.emit("dice_seat_out", { game: state.game, seat: loser, place });
	}
	const live = state.seats.filter((other) => (state.counts[other] ?? 0) > 0);
	if (live.length <= 1) endGame(ctx);
	else startRound(ctx, nextLive(state.seats, state.counts, loser, true), minute);
	return { loser, count, bid };
}

/** Why `resident` may not act now, or undefined. */
function turnProblem(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_GAME", "No game is running right now; wait for the next one.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this table.");
	if ((state.counts[resident] ?? 0) === 0) return refuse("OUT", "You are out of this game: you have no dice left. End your turn; the next game starts soon.");
	if (state.toAct !== resident) return refuse("NOT_YOUR_TURN", `It is ${state.toAct}'s turn, not yours.`);
	return undefined;
}

function bidRefusal(ctx: Ctx, resident: string | undefined, bid: Bid): Refusal | undefined {
	const problem = turnProblem(ctx, resident);
	if (problem !== undefined) return problem;
	const issue = bidProblem(bid, ctx.state.standing, totalDice(ctx.state), rulesOf(ctx));
	return issue === undefined ? undefined : refuse("ILLEGAL_BID", issue);
}

function liarRefusal(ctx: Ctx, resident: string | undefined): Refusal | undefined {
	const problem = turnProblem(ctx, resident);
	if (problem !== undefined) return problem;
	return ctx.state.standing === undefined ? refuse("NO_BID", "Nobody has bid yet this round: you open it with a bid.") : undefined;
}

const after = (ctx: Ctx, resident: string): string => {
	const state = ctx.state;
	if (!state.running) return "end your turn now.";
	return state.toAct === resident ? "It is your turn again." : `${state.toAct} is to act, not you: end your turn now; you will be told when it is yours.`;
};

function bidNow(ctx: Ctx, resident: string | undefined, bid: Bid, say: string | undefined, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = bidRefusal(ctx, resident, bid);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	score(ctx, "bid", bid, false, reason);
	placeBid(ctx, bid, say, false, ctx.minute);
	return reply(`You bid ${bidText(bid)}. ${after(ctx, resident)}`);
}

function liarNow(ctx: Ctx, resident: string | undefined, say: string | undefined, reason: string | undefined): ToolSuccess | Refusal {
	const refusal = liarRefusal(ctx, resident);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	const bidder = ctx.state.bidder;
	score(ctx, "liar", undefined, false, reason);
	const result = callLiar(ctx, say, false, ctx.minute);
	if (result === undefined) return refuse("NO_BID", "Nobody has bid yet this round.");
	const verdict = result.loser === resident ? `The bid held (${String(result.count)} counted): you lose a die.` : `The bid was a lie (${String(result.count)} counted): ${bidder} loses a die.`;
	return reply(`You called ${bidder}'s ${bidText(result.bid)} a lie. ${verdict} The dice are shown in your next turn. ${ctx.state.running && ctx.state.toAct === resident ? "You open the next round: it is your turn." : "End your turn now; you will be told when it is yours."}`);
}

function entryLine(ctx: Ctx, entry: Entry, viewer: string | undefined): string {
	const late = entry.kind !== "round" && entry.kind !== "out" && entry.missed === true ? " (no action in time)" : "";
	const remark = entry.kind !== "round" && entry.kind !== "out" && entry.say !== undefined ? ` ("${entry.say}")` : "";
	switch (entry.kind) {
		case "round":
			return `Round ${String(entry.round)}: new roll; dice per seat ${Object.entries(entry.counts).map(([seat, count]) => `${nameFor(seat, viewer)} ${String(count)}`).join(", ")}; ${nameFor(entry.starter, viewer)} opens`;
		case "bid":
			return `${nameFor(entry.seat, viewer)} bids ${bidText(entry.bid)}${late}${remark}`;
		case "liar": {
			const shown = Object.entries(entry.dice).map(([seat, dice]) => `${nameFor(seat, viewer)} ${diceText(dice)}`).join("; ");
			const held = entry.loser === entry.seat;
			const wild = ctx.options.wildOnes ? " (ones wild)" : "";
			return `${nameFor(entry.seat, viewer)} calls liar on ${entry.bidder === viewer ? "your" : `${entry.bidder}'s`} ${bidText(entry.bid)}${late}${remark}. Dice: ${shown}. ${String(entry.count)} count for ${String(entry.bid.face)}${wild}: the bid ${held ? "held" : "was a lie"}, ${nameFor(entry.loser, viewer)} loses a die`;
		}
		case "out":
			return `${nameFor(entry.seat, viewer)} has no dice left and is out (place ${String(entry.place)})`;
	}
}

function placesText(ctx: Ctx): string {
	const names = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
	return ctx.state.seats.map((_, index) => `${names[index] ?? String(index + 1)} ${String(ctx.options.placePoints[index] ?? 0)}`).join(", ");
}

function rulesText(ctx: Ctx): string {
	const { dice, faces, wildOnes, talk } = ctx.options;
	return ctx.prompt("liars-dice/rules", {
		seats: ctx.state.seats.length,
		dice,
		faces,
		wild: wildOnes ? "Ones are wild: a 1 counts for every face, and nobody may bid on ones." : "No face is wild.",
		lowest: lowestFace(rulesOf(ctx)),
		places: placesText(ctx),
		talk: talk ? "A bid or a call may carry a short remark (say) that the whole table reads; it may be true or not." : "There is no table talk.",
	});
}

function choicesOf(ctx: Ctx): string {
	const state = ctx.state;
	const total = totalDice(state);
	const rules = rulesOf(ctx);
	const standing = state.standing;
	if (standing === undefined) return `open the round with any bid (bid quantity and face, faces ${String(lowestFace(rules))}-${String(rules.faces)}, at most ${String(total)} dice)`;
	const parts: string[] = [];
	if (standing.face < rules.faces) parts.push(`${String(standing.quantity)} x ${String(standing.face + 1)} up to ${String(standing.quantity)} x ${String(rules.faces)}`);
	if (standing.quantity < total) parts.push(`${String(standing.quantity + 1)} or more dice of any face ${String(lowestFace(rules))}-${String(rules.faces)}, at most ${String(total)}`);
	const raise = parts.length === 0 ? "" : `bid higher (${parts.join("; or ")}) or `;
	return `${raise}call ${state.bidder}'s bid a lie (liar)`;
}

function taskText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	return ctx.prompt("liars-dice/task", {
		round: state.round,
		dice: diceText(state.dice[seat] ?? []),
		total: totalDice(state),
		standing: state.standing === undefined ? "none yet (you open)" : `${bidText(state.standing)} by ${state.bidder}`,
		choices: choicesOf(ctx),
	});
}

function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats, resident)}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon. Points: ${scoreLine(state.scores, state.seats, resident)}.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, round ${String(state.round)}.`, rulesText(ctx), `Dice per seat: ${countsLine(state, resident)} (${String(totalDice(state))} on the table).`];
	if (resident !== undefined && state.seats.includes(resident)) {
		const roundStart = state.log.map((entry) => entry.kind).lastIndexOf("round");
		lines.push(`This round so far: ${state.log.slice(Math.max(0, roundStart)).map((entry) => entryLine(ctx, entry, resident)).join("; ")}.`);
		if ((state.counts[resident] ?? 0) === 0) lines.push("You are out of this game.");
		else if (state.toAct === resident) lines.push(taskText(ctx, resident));
		else lines.push(`Your dice: ${diceText(state.dice[resident] ?? [])}. ${state.toAct} is to act; wait for your turn.`);
		lines.push(`Points in the match before this game: ${scoreLine(state.scores, state.seats, resident)}.`);
	}
	return lines.join("\n");
}

const Say = Type.Optional(Type.String({ maxLength: 160, description: "Optional table talk: a short remark every seat reads (true or not)." }));
const Reason = Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record (never shown to the other players)." }));

export const liarsDice = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewTable",
			description: "liars-dice/tools/viewTable",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(tableText(ctx, ctx.resident)),
		}),
		kit.tool({
			name: BID,
			description: "liars-dice/tools/bid",
			parameters: Type.Object({
				quantity: Type.Integer({ minimum: 1, maximum: 80, description: "How many dice on the whole table (at least) show the face." }),
				face: Type.Integer({ minimum: 1, maximum: 12, description: "The face." }),
				say: Say,
				reason: Reason,
			}),
			suggest: ["resident"],
			rule: (params, ctx) => bidRefusal(ctx, ctx.resident, { quantity: params.quantity, face: params.face }),
			execute: (params, ctx) => bidNow(ctx, ctx.resident, { quantity: params.quantity, face: params.face }, params.say, params.reason),
		}),
		kit.tool({
			name: LIAR,
			description: "liars-dice/tools/liar",
			parameters: Type.Object({ say: Say, reason: Reason }),
			suggest: ["resident"],
			rule: (_params, ctx) => liarRefusal(ctx, ctx.resident),
			execute: (params, ctx) => liarNow(ctx, ctx.resident, params.say, params.reason),
		}),
	],
	services: [
		kit.provide(BrainSourceApi, {
			game: (_input, ctx) => ctx.state.game,
			hold: (_input, ctx) => {
				if (ctx.state.finished) return false;
				ctx.state.held = true;
				return true;
			},
			release: (_input, ctx) => {
				const state = ctx.state;
				state.held = false;
				if (state.due && !state.running && !state.finished) ctx.schedule.at(ctx.minute + 1, "nextGame");
				return null;
			},
		}),
	],
	hooks: {
		// After the strategy brain's runStarted phase, which may hold the first game back.
		runStarted: {
			order: HOOK_ORDER.runStarted.liarsDice,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.liarsDice,
			run: (ctx) => {
				const state = ctx.state;
				if (!state.running || state.toAct === "" || ctx.minute - state.opened + 1 < ctx.options.deadline) return;
				if (state.standing === undefined) {
					const bid = minimalRaise(undefined, totalDice(state), rulesOf(ctx)) ?? { quantity: 1, face: lowestFace(rulesOf(ctx)) };
					score(ctx, "bid", bid, true, undefined);
					placeBid(ctx, bid, undefined, true, ctx.minute + 1);
				} else {
					score(ctx, "liar", undefined, true, undefined);
					callLiar(ctx, undefined, true, ctx.minute + 1);
				}
			},
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.toAct === resident,
		turnInputs: {
			order: HOOK_ORDER.turnInputs.liarsDice,
			run: (resident, ctx) => {
				const state = ctx.state;
				if (!state.running || !state.seats.includes(resident)) return [];
				const lines: string[] = [];
				if (!state.briefed.includes(resident)) {
					state.briefed.push(resident);
					lines.push(`${ctx.prompt("liars-dice/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`);
				}
				const from = state.seenLog[resident] ?? 0;
				if (from < state.log.length) {
					lines.push(`${state.log.slice(from).map((entry) => entryLine(ctx, entry, resident)).join(". ")}.`);
					state.seenLog[resident] = state.log.length;
				}
				if (state.toAct === resident && !state.told) {
					state.told = true;
					lines.push(taskText(ctx, resident));
				} else if (state.toAct !== resident && lines.length > 0) {
					// A seat woken to answer its last tool result reads the record as its cue and acts out of turn (P131, P283).
					lines.push((state.counts[resident] ?? 0) === 0 ? "You are out of this game: nothing to do; end your turn." : `Not your turn: ${state.toAct} is to act. End your turn; you will be told when it is yours.`);
				}
				return lines;
			},
		},
	},
	jobs: {
		nextGame: (ctx) => {
			startNext(ctx);
		},
	},
	limits: [kit.limit("match", "Breaches once the last game of the match is over.", (view: View) => (view.state.finished ? "the match is over" : undefined))],
	facts: {
		scores: kit.fact(Type.Record(Type.String(), Type.Number()), (view) => ({ ...view.state.scores })),
	},
	snapshot: kit.snapshot({
		version: 1,
		schema: DiceSlice,
		save: (state) => structuredClone(state),
		load: (data) => structuredClone(data),
	}),
}));
