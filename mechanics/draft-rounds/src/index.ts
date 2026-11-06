/**
 * The `draft-rounds` mechanic: the drafting game Quarry (docs/ideas/game-roadmap.md §2.4) for solo seats.
 * A match is several games; a game is several pack rounds; in a pack round every seat opens a pack,
 * keeps one card (`pick`) and passes the rest, to the next seat in odd pack rounds and to the previous
 * one in even rounds, until every pack is empty. The cards are four resources (amber, basalt, cobalt,
 * jade) and a wild ore (lodestone). At the game's end each quarry scores:
 * - every resource the square of its cards; a set takes at most one lodestone, the lodestones go to the
 *   biggest sets (so a single lane pays, and a contested lane pays nobody);
 * - a majority bonus for the single seat with the most cards of a resource (a tie scores nothing, so a
 *   hate pick can cost a neighbour its bonus);
 * - minus the cost of each burn: with a pick a seat may destroy one more card of the pack before it
 *   moves on (a limited number per game), to deny it to the receiver.
 * Picks are simultaneous and sealed (`draft_card_picked`, audience `human`): a seat sees only its own
 * pack and quarry and who passed the pack to it; hands are revealed at the game's end (`openHands`
 * shows them all along). A pick not made by the deadline takes the first card of the pack and is
 * marked missed. Every pick is scored against the greedy reference (what it added to the own set score
 * against the best card, and whether it took the receiver's best card), and each game against the
 * greedy table (four greedy seats on the same deal), in `draft_game_scored` for the human only. A
 * strategy brain plugs in through `BrainSourceApi` and `StrategyBrainApi`, as in the econ lab.
 */
import { Type } from "typebox";
import type { ContextOf, Refusal, ToolContextOf, ToolSuccess, ViewOf } from "@swarmtales/contracts";
import { defineHead, defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER } from "@swarmtales/mechanic-shared";
import { BrainSourceApi, StrategyBrainApi } from "@swarmtales/mechanic-strategy-brain";
import {
	Breakdown,
	Card,
	cardsLine,
	copyState,
	deckOf,
	DraftSlice,
	gainOf,
	greedyTable,
	laneOf,
	packsOf,
	PickRecord,
	quarryLine,
	receiverOf,
	Reference,
	RESOURCES,
	scoreTable,
	type DraftState,
	type Rules,
} from "./model.ts";


const PICK = "pick";

const options = Type.Object({
	games: Type.Integer({ minimum: 1, maximum: 20, default: 3, description: "Games in the match; the run ends after the last." }),
	packs: Type.Integer({ minimum: 1, maximum: 4, default: 2, description: "Pack rounds per game; the passing direction turns every round." }),
	packSize: Type.Integer({ minimum: 2, maximum: 15, default: 6, description: "Cards in a pack." }),
	wilds: Type.Integer({ minimum: 0, default: 4, description: "Lodestones (wild ore) in a game's deck; the rest is split over the four resources." }),
	majorityBonus: Type.Integer({ minimum: 0, default: 5, description: "Points for strictly the most cards of a resource (wilds do not count; a tie scores nothing)." }),
	burnCost: Type.Integer({ minimum: 0, default: 2, description: "Points a burn costs." }),
	maxBurns: Type.Integer({ minimum: 0, default: 2, description: "Burns a seat may make per game." }),
	openHands: Type.Boolean({ default: false, description: "Every seat sees every quarry during the game (off: only at the game's end)." }),
	deadline: Type.Integer({ minimum: 1, default: 2, description: "Minutes a pick stays open before a missing pick takes the first card of the pack." }),
});

const head = defineHead({
	id: "draft-rounds",
	summary: "The drafting game Quarry for solo seats: packs passed around a table, one sealed pick each, quarries of four resources scored at the end of a game.",
	options,
	state: (setup): DraftState => ({
		seats: [...setup.residents],
		game: 0,
		packRound: 0,
		step: 0,
		opened: 0,
		deck: [],
		packs: {},
		from: {},
		hands: {},
		burned: [],
		burns: {},
		owing: [],
		told: [],
		briefed: [],
		picks: [],
		scores: Object.fromEntries(setup.residents.map((id) => [id, 0])),
		gameScores: {},
		running: false,
		finished: false,
		held: false,
		due: false,
	}),
	events: {
		draft_game_started: Type.Object({ game: Type.Integer(), seats: Type.Array(Type.String()), deck: Type.Array(Card, { description: "The deck in deal order (sealed: audience human)." }) }),
		draft_pick_opened: Type.Object({ game: Type.Integer(), pack: Type.Integer(), step: Type.Integer(), sizes: Type.Record(Type.String(), Type.Integer(), { description: "Cards in front of each seat." }) }),
		draft_card_picked: PickRecord,
		draft_game_ended: Type.Object({
			game: Type.Integer(),
			hands: Type.Record(Type.String(), Type.Array(Card)),
			breakdown: Type.Record(Type.String(), Breakdown),
			totals: Type.Record(Type.String(), Type.Number()),
		}),
		draft_game_scored: Type.Object({ game: Type.Integer(), reference: Reference }),
		draft_match_ended: Type.Object({ scores: Type.Record(Type.String(), Type.Number()) }),
	},
	// Sealed: the deal and the picks; the reference score is for the human and the reporter only.
	audiences: { draft_game_started: ["human"], draft_card_picked: ["human"], draft_game_scored: ["human"] },
	provides: [BrainSourceApi],
	uses: [StrategyBrainApi],
	prompts: {
		"draft-rounds/tools/viewTable": [],
		"draft-rounds/tools/pick": [],
		"draft-rounds/rules": ["seats", "games", "packs", "packSize", "deck", "majorityBonus", "maxBurns", "burnCost"],
		"draft-rounds/game-head": ["game", "games"],
		"draft-rounds/task-pick": ["pack", "packs", "step", "from", "cards", "quarry", "burns", "burnCost", "receiver"],
	},
});

type Ctx = ContextOf<typeof head>;
type ToolCtx = ToolContextOf<typeof head>;
type View = ViewOf<typeof head>;

const rulesOf = (ctx: Ctx): Rules => ({ majorityBonus: ctx.options.majorityBonus, burnCost: ctx.options.burnCost });

const deckSize = (ctx: Ctx): number => ctx.state.seats.length * ctx.options.packs * ctx.options.packSize;

/** The deck's make-up in words: `11 amber, 11 basalt, 11 cobalt, 11 jade, 4 lodestone`. */
function deckLine(ctx: Ctx): string {
	const deck = deckOf(deckSize(ctx), ctx.options.wilds);
	return [...RESOURCES, "lodestone" as const].map((kind) => `${String(deck.filter((card) => card.kind === kind).length)} ${kind}`).join(", ");
}

function refreshLocks(ctx: Ctx): void {
	for (const resident of ctx.residents.ids) {
		if (ctx.state.running && ctx.state.owing.includes(resident)) ctx.access.unlock(resident, PICK);
		else ctx.access.lock(resident, PICK);
	}
}

function openPick(ctx: Ctx, minute: number): void {
	const state = ctx.state;
	state.step += 1;
	state.opened = minute;
	state.told = [];
	state.owing = state.seats.filter((seat) => (state.packs[seat]?.length ?? 0) > 0);
	ctx.emit("draft_pick_opened", { game: state.game, pack: state.packRound, step: state.step, sizes: Object.fromEntries(state.seats.map((seat) => [seat, state.packs[seat]?.length ?? 0])) });
	refreshLocks(ctx);
}

function openPackRound(ctx: Ctx, round: number, minute: number): void {
	const state = ctx.state;
	const row = packsOf(state.deck, state.seats.length, ctx.options.packs, ctx.options.packSize)[round - 1] ?? [];
	state.packRound = round;
	state.step = 0;
	state.packs = Object.fromEntries(state.seats.map((seat, index) => [seat, row[index] ?? []]));
	state.from = {};
	openPick(ctx, minute);
}

function startGame(ctx: Ctx, game: number): void {
	const state = ctx.state;
	state.game = game;
	state.deck = ctx.rng("draft-rounds", "deck", game).shuffle(deckOf(deckSize(ctx), ctx.options.wilds));
	state.hands = Object.fromEntries(state.seats.map((seat) => [seat, []]));
	state.burns = Object.fromEntries(state.seats.map((seat) => [seat, 0]));
	state.burned = [];
	state.picks = [];
	state.briefed = [];
	state.gameScores = {};
	state.running = true;
	ctx.emit("draft_game_started", { game, seats: [...state.seats], deck: state.deck.map((card) => ({ ...card })) });
	ctx.tryCall(StrategyBrainApi, "gameStarted", { game, first: "" });
	openPackRound(ctx, 1, ctx.minute);
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

function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${String(scores[seat] ?? 0)}`).join(", ");
}

/** The game's public result in one line: points, and each seat's quarry. */
function resultLine(ctx: Ctx): string {
	const state = ctx.state;
	const quarries = state.seats.map((seat) => `${seat} ${quarryLine(state.hands[seat] ?? [])}`).join("; ");
	return `points ${scoreLine(state.gameScores, state.seats)}; quarries ${quarries}`;
}

function referenceOf(ctx: Ctx): Reference {
	const state = ctx.state;
	const greedy = greedyTable(state.deck, state.seats, ctx.options.packs, ctx.options.packSize, rulesOf(ctx));
	const lanes = new Map(state.seats.map((seat) => [seat, laneOf(state.hands[seat] ?? [])]));
	const seats = Object.fromEntries(
		state.seats.map((seat) => {
			const own = state.picks.filter((pick) => pick.resident === seat);
			const lane = lanes.get(seat) ?? { lanes: [], focus: 0 };
			return [
				seat,
				{
					score: state.gameScores[seat] ?? 0,
					greedy: greedy[seat] ?? 0,
					regret: own.reduce((sum, pick) => sum + pick.regret, 0),
					hatePicks: own.filter((pick) => pick.denied).length,
					burns: state.burns[seat] ?? 0,
					missed: own.filter((pick) => pick.missed).length,
					lane: lane.lanes.join("+"),
					focus: lane.focus,
				},
			];
		}),
	);
	const shared = state.seats.filter((seat) => {
		const own = lanes.get(seat)?.lanes ?? [];
		return state.seats.some((other) => other !== seat && (lanes.get(other)?.lanes ?? []).some((lane) => own.includes(lane)));
	}).length;
	const total = state.seats.reduce((sum, seat) => sum + (state.gameScores[seat] ?? 0), 0);
	const greedyTotal = state.seats.reduce((sum, seat) => sum + (greedy[seat] ?? 0), 0);
	return { seats, sharedLanes: shared, efficiency: greedyTotal === 0 ? 0 : Math.round((total / greedyTotal) * 1000) / 1000 };
}

function endGame(ctx: Ctx): void {
	const state = ctx.state;
	state.running = false;
	state.owing = [];
	refreshLocks(ctx);
	const breakdown = scoreTable(state.hands, state.burns, rulesOf(ctx));
	state.gameScores = Object.fromEntries(state.seats.map((seat) => [seat, breakdown[seat]?.total ?? 0]));
	for (const seat of state.seats) state.scores[seat] = (state.scores[seat] ?? 0) + (state.gameScores[seat] ?? 0);
	ctx.emit("draft_game_ended", { game: state.game, hands: Object.fromEntries(state.seats.map((seat) => [seat, (state.hands[seat] ?? []).map((card) => ({ ...card }))])), breakdown, totals: { ...state.scores } });
	ctx.emit("draft_game_scored", { game: state.game, reference: referenceOf(ctx) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	ctx.tryCall(StrategyBrainApi, "gameEnded", { game: state.game, summary: resultLine(ctx) });
	if (last) ctx.emit("draft_match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.minute + 1, "nextGame");
}

/** Every pick is in: the packs move on; an empty table opens the next pack round or ends the game. */
function pass(ctx: Ctx, minute: number): void {
	const state = ctx.state;
	const moved: Record<string, Card[]> = {};
	const from: Record<string, string> = {};
	for (const seat of state.seats) {
		const receiver = receiverOf(state.seats, seat, state.packRound);
		moved[receiver] = state.packs[seat] ?? [];
		from[receiver] = seat;
	}
	state.packs = moved;
	state.from = from;
	state.owing = [];
	if (state.seats.some((seat) => (state.packs[seat]?.length ?? 0) > 0)) openPick(ctx, minute);
	else if (state.packRound < ctx.options.packs) openPackRound(ctx, state.packRound + 1, minute);
	else endGame(ctx);
}

const normalize = (id: string): string => id.trim().toUpperCase();

/** Why `resident` may not pick `card` (and burn `burn`) now, or undefined. */
function problemWith(ctx: Ctx, resident: string | undefined, card: string, burn: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_PICK", "No pick is open right now; wait for the next game.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this table.");
	if (!state.owing.includes(resident)) return refuse((state.packs[resident]?.length ?? 0) === 0 ? "NO_PACK" : "ALREADY_PICKED", (state.packs[resident]?.length ?? 0) === 0 ? "You have no pack in front of you this pick." : "You already picked from this pack; wait for the next one.");
	const pack = state.packs[resident] ?? [];
	if (!pack.some((other) => other.id === normalize(card))) return refuse("NOT_IN_PACK", `${card} is not in your pack. Your pack: ${cardsLine(pack)}.`);
	if (burn === undefined || burn.trim() === "") return undefined;
	if ((state.burns[resident] ?? 0) >= ctx.options.maxBurns) return refuse("NO_BURNS_LEFT", `You have used all ${String(ctx.options.maxBurns)} burns of this game.`);
	if (normalize(burn) === normalize(card)) return refuse("BURN_IS_PICK", "You cannot burn the card you keep.");
	if (!pack.some((other) => other.id === normalize(burn))) return refuse("NOT_IN_PACK", `${burn} is not in your pack. Your pack: ${cardsLine(pack)}.`);
	return undefined;
}

/** Takes `card` (and burns `burn`) from the resident's pack and records the pick with its reference values. */
function take(ctx: Ctx, resident: string, cardId: string, burnId: string | undefined, missed: boolean): PickRecord | undefined {
	const state = ctx.state;
	const pack = state.packs[resident] ?? [];
	const card = pack.find((other) => other.id === normalize(cardId));
	if (card === undefined) return undefined;
	const burned = burnId === undefined || burnId.trim() === "" ? undefined : pack.find((other) => other.id === normalize(burnId));
	const hand = state.hands[resident] ?? [];
	const receiver = receiverOf(state.seats, resident, state.packRound);
	const receiverHand = state.hands[receiver] ?? [];
	const gains = pack.map((other) => gainOf(hand, other));
	const best = Math.max(...gains);
	const gain = gainOf(hand, card);
	const forReceiver = pack.map((other) => gainOf(receiverHand, other));
	const receiverBest = Math.max(...forReceiver);
	const denied = receiver !== resident && gain < best && gainOf(receiverHand, card) === receiverBest && receiverBest > 0;
	const record: PickRecord = {
		game: state.game,
		pack: state.packRound,
		step: state.step,
		resident,
		card: { ...card },
		...(burned === undefined ? {} : { burned: { ...burned } }),
		packSize: pack.length,
		gain,
		best,
		regret: best - gain,
		denied,
		missed,
	};
	state.packs[resident] = pack.filter((other) => other.id !== card.id && other.id !== burned?.id);
	state.hands[resident] = [...hand, { ...card }];
	if (burned !== undefined) {
		state.burned.push({ ...burned });
		state.burns[resident] = (state.burns[resident] ?? 0) + 1;
	}
	state.picks.push(record);
	state.owing = state.owing.filter((id) => id !== resident);
	ctx.emit("draft_card_picked", record);
	return record;
}

function pickNow(ctx: Ctx, resident: string | undefined, card: string, burn: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, resident, card, burn);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	const record = take(ctx, resident, card, burn, false);
	if (record === undefined) return refuse("NOT_IN_PACK", `${card} is not in your pack.`);
	ctx.access.lock(resident, PICK);
	const burned = record.burned === undefined ? "" : `, burned ${record.burned.id}`;
	const done = `Kept ${record.card.id} ${record.card.kind}${burned}. Your quarry: ${quarryLine(ctx.state.hands[resident] ?? [])}.`;
	if (ctx.state.owing.length === 0) pass(ctx, ctx.minute);
	return reply(`${done} Wait for the next pack.`);
}

function rulesText(ctx: Ctx): string {
	const { games, packs, packSize, majorityBonus, maxBurns, burnCost } = ctx.options;
	return ctx.prompt("draft-rounds/rules", { seats: ctx.state.seats.length, games, packs, packSize, deck: deckLine(ctx), majorityBonus, maxBurns, burnCost });
}

/** The pick `resident` is asked for now, or undefined. */
function taskText(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	if (!state.running || !state.owing.includes(resident)) return undefined;
	const pack = state.packs[resident] ?? [];
	return ctx.prompt("draft-rounds/task-pick", {
		pack: state.packRound,
		packs: ctx.options.packs,
		step: state.step,
		from: state.from[resident] === undefined ? "a fresh pack" : `passed to you by ${state.from[resident] ?? ""}`,
		cards: cardsLine(pack),
		quarry: quarryLine(state.hands[resident] ?? []),
		burns: Math.max(0, ctx.options.maxBurns - (state.burns[resident] ?? 0)),
		burnCost: ctx.options.burnCost,
		receiver: receiverOf(state.seats, resident, state.packRound),
	});
}

function tableText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over: ${resultLine(ctx)}. The next game starts soon.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, pack ${String(state.packRound)} of ${String(ctx.options.packs)}, pick ${String(state.step)}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) {
		lines.push(taskText(ctx, resident) ?? `Nothing to pick for you right now. Your quarry: ${quarryLine(state.hands[resident] ?? [])}.`);
		lines.push(`Your points from earlier games: ${String(state.scores[resident] ?? 0)}.`);
	}
	if (ctx.options.openHands) lines.push(`Quarries: ${state.seats.map((seat) => `${seat} ${quarryLine(state.hands[seat] ?? [])}`).join("; ")}.`);
	return lines.join("\n");
}

export const draftRounds = defineMechanic(head, (kit) => ({
	tools: [
		kit.tool({
			name: "viewTable",
			description: "draft-rounds/tools/viewTable",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx: ToolCtx) => reply(tableText(ctx, ctx.resident)),
		}),
		kit.tool({
			name: PICK,
			description: "draft-rounds/tools/pick",
			parameters: Type.Object({
				card: Type.String({ minLength: 1, maxLength: 8, description: "The id of the card you keep (for example A3)." }),
				burn: Type.Optional(Type.String({ maxLength: 8, description: "Optional: the id of a second card of the pack to destroy before the pack moves on (costs points, limited per game)." })),
				reason: Type.Optional(Type.String({ maxLength: 400, description: "A short reason, for the record." })),
			}),
			suggest: ["resident"],
			rule: (params, ctx) => problemWith(ctx, ctx.resident, params.card, params.burn),
			execute: (params, ctx) => pickNow(ctx, ctx.resident, params.card, params.burn),
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
			order: HOOK_ORDER.runStarted.draftRounds,
			run: (ctx) => {
				startNext(ctx);
			},
		},
		minuteEnded: {
			order: HOOK_ORDER.minuteEnded.draftRounds,
			run: (ctx) => {
				const state = ctx.state;
				if (!state.running || state.owing.length === 0 || ctx.minute - state.opened + 1 < ctx.options.deadline) return;
				for (const seat of [...state.owing]) {
					const first = state.packs[seat]?.[0];
					if (first !== undefined) take(ctx, seat, first.id, undefined, true);
				}
				state.owing = [];
				refreshLocks(ctx);
				pass(ctx, ctx.minute + 1);
			},
		},
		news: (resident, ctx) => ctx.state.running && ctx.state.owing.includes(resident),
		turnInputs: {
			order: HOOK_ORDER.turnInputs.draftRounds,
			run: (resident, ctx) => {
				const state = ctx.state;
				if (!state.running || !state.seats.includes(resident)) return [];
				const lines: string[] = [];
				if (!state.briefed.includes(resident)) {
					state.briefed.push(resident);
					lines.push(`${ctx.prompt("draft-rounds/game-head", { game: state.game, games: ctx.options.games })} ${rulesText(ctx)}`);
				}
				if (state.owing.includes(resident) && !state.told.includes(resident)) {
					state.told.push(resident);
					const task = taskText(ctx, resident);
					if (task !== undefined) lines.push(task);
					if (ctx.options.openHands) lines.push(`Quarries: ${state.seats.map((seat) => `${seat} ${quarryLine(state.hands[seat] ?? [])}`).join("; ")}.`);
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
		schema: DraftSlice,
		save: (state) => copyState(state),
		load: (data) => copyState(data),
	}),
}));
