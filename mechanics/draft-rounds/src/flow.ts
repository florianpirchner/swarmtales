// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The flow of the `draft-rounds` mechanic: games, pack rounds and picks, the pass of the packs and the end of a game. */
import type { Refusal, ToolSuccess } from "@swarmtales/contracts";
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { refuse, reply } from "@swarmtales/sdk";
import type { DraftRoundsCtx } from "./head.ts";
import { cardsLine, deckOf, gainOf, greedyTable, laneOf, packsOf, quarryLine, receiverOf, scoreTable, type Card, type PickRecord, type Reference, type Rules } from "./model.ts";
import { deckSize, resultLine } from "./texts.ts";

/** The bare name of the locked tool. */
export const PICK = "pick";

type Ctx = DraftRoundsCtx;

const rulesOf = (ctx: Ctx): Rules => ({ majorityBonus: ctx.options.majorityBonus, burnCost: ctx.options.burnCost, placeBonus: ctx.options.placeBonus });

/**
 * Opens `pick` for the seats that owe a pick and closes it for everybody else.
 *
 * @param ctx - The mechanic's context.
 */
export function refreshLocks(ctx: Ctx): void {
	for (const resident of ctx.residents.ids) {
		if (ctx.state.running && ctx.state.owing.includes(resident)) ctx.access.unlock(resident, PICK);
		else ctx.access.lock(resident, PICK);
	}
}

function openPick(ctx: Ctx, tick: number): void {
	const state = ctx.state;
	state.step += 1;
	state.opened = tick;
	state.told = [];
	state.owing = state.seats.filter((seat) => (state.packs[seat]?.length ?? 0) > 0);
	ctx.emit("draft_pick_opened", { game: state.game, pack: state.packRound, step: state.step, sizes: Object.fromEntries(state.seats.map((seat) => [seat, state.packs[seat]?.length ?? 0])) });
	refreshLocks(ctx);
}

function openPackRound(ctx: Ctx, round: number, tick: number): void {
	const state = ctx.state;
	const row = packsOf(state.deck, state.seats.length, ctx.options.packs, ctx.options.packSize)[round - 1] ?? [];
	state.packRound = round;
	state.step = 0;
	state.packs = Object.fromEntries(state.seats.map((seat, index) => [seat, row[index] ?? []]));
	state.from = {};
	openPick(ctx, tick);
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
	ctx.tryCall(StrategyBrainService, "gameStarted", { game, first: "" });
	openPackRound(ctx, 1, ctx.tick);
}

/**
 * Starts the next game, or marks it due when another mechanic holds it back.
 *
 * @param ctx - The mechanic's context.
 */
export function startNext(ctx: Ctx): void {
	const state = ctx.state;
	if (state.finished || state.running) return;
	if (state.held) {
		state.due = true;
		return;
	}
	state.due = false;
	startGame(ctx, state.game + 1);
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
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary: resultLine(ctx) });
	if (last) ctx.emit("draft_match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.tick + 1, "nextGame");
}

/**
 * Every pick is in: the packs move on; an empty table opens the next pack round or ends the game.
 *
 * @param ctx - The mechanic's context.
 * @param tick - The tick the next pick opens at.
 */
export function pass(ctx: Ctx, tick: number): void {
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
	if (state.seats.some((seat) => (state.packs[seat]?.length ?? 0) > 0)) openPick(ctx, tick);
	else if (state.packRound < ctx.options.packs) openPackRound(ctx, state.packRound + 1, tick);
	else endGame(ctx);
}

const normalize = (id: string): string => id.trim().toUpperCase();

// The refusal for a seat that owes no pick: it has no pack, or it picked already.
function notOwing(ctx: Ctx, resident: string): Refusal {
	const state = ctx.state;
	return refuse((state.packs[resident]?.length ?? 0) === 0 ? "NO_PACK" : "ALREADY_PICKED", (state.packs[resident]?.length ?? 0) === 0 ? "You have no pack in front of you this pick." : "You already picked from this pack; wait for the next one.");
}

// Why `resident` may not burn `burn` with its pick of `card`, or undefined: the second half of `problemWith`.
function burnProblem(ctx: Ctx, resident: string, pack: readonly Card[], card: string, burn: string | undefined): Refusal | undefined {
	if (burn === undefined || burn.trim() === "") return undefined;
	if ((ctx.state.burns[resident] ?? 0) >= ctx.options.maxBurns) return refuse("NO_BURNS_LEFT", `You have used all ${String(ctx.options.maxBurns)} burns of this game.`);
	if (normalize(burn) === normalize(card)) return refuse("BURN_IS_PICK", "You cannot burn the card you keep.");
	if (!pack.some((other) => other.id === normalize(burn))) return refuse("NOT_IN_PACK", `${burn} is not in your pack. Your pack: ${cardsLine(pack)}.`);
	return undefined;
}

/**
 * Why `resident` may not pick `card` (and burn `burn`) now, or undefined.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller; undefined when it is no resident.
 * @param card - The id of the card to keep.
 * @param burn - The id of the card to burn, if any.
 * @returns The refusal, or undefined when the pick may be made.
 */
export function problemWith(ctx: Ctx, resident: string | undefined, card: string, burn: string | undefined): Refusal | undefined {
	const state = ctx.state;
	if (state.finished) return refuse("MATCH_OVER", "The match is over.");
	if (!state.running) return refuse("NO_PICK", "No pick is open right now; wait for the next game.");
	if (resident === undefined || !state.seats.includes(resident)) return refuse("NOT_A_SEAT", "You have no seat at this table.");
	if (!state.owing.includes(resident)) return notOwing(ctx, resident);
	const pack = state.packs[resident] ?? [];
	if (!pack.some((other) => other.id === normalize(card))) return refuse("NOT_IN_PACK", `${card} is not in your pack. Your pack: ${cardsLine(pack)}.`);
	return burnProblem(ctx, resident, pack, card, burn);
}

// The reference values of a pick: what the card adds, what the best card would add, and whether it is a hate pick.
function valuesOf(ctx: Ctx, resident: string, pack: readonly Card[], card: Card): { readonly gain: number; readonly best: number; readonly denied: boolean } {
	const state = ctx.state;
	const hand = state.hands[resident] ?? [];
	const receiver = receiverOf(state.seats, resident, state.packRound);
	const receiverHand = state.hands[receiver] ?? [];
	const gains = pack.map((other) => gainOf(hand, other));
	const best = Math.max(...gains);
	const gain = gainOf(hand, card);
	const forReceiver = pack.map((other) => gainOf(receiverHand, other));
	const receiverBest = Math.max(...forReceiver);
	const denied = receiver !== resident && gain < best && gainOf(receiverHand, card) === receiverBest && receiverBest > 0;
	return { gain, best, denied };
}

/**
 * Takes `card` (and burns `burn`) from the resident's pack and records the pick with its reference values.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The seat that picks.
 * @param cardId - The id of the card to keep.
 * @param burnId - The id of the card to burn, if any.
 * @param missed - True when the timer picks for the seat.
 * @returns The record, or undefined when the card is not in the pack.
 */
export function take(ctx: Ctx, resident: string, cardId: string, burnId: string | undefined, missed: boolean): PickRecord | undefined {
	const state = ctx.state;
	const pack = state.packs[resident] ?? [];
	const card = pack.find((other) => other.id === normalize(cardId));
	if (card === undefined) return undefined;
	const burned = burnId === undefined || burnId.trim() === "" ? undefined : pack.find((other) => other.id === normalize(burnId));
	const hand = state.hands[resident] ?? [];
	const { gain, best, denied } = valuesOf(ctx, resident, pack, card);
	const record: PickRecord = {
		game: state.game,
		pack: state.packRound,
		step: state.step,
		resident,
		card: { ...card },
		...(burned === undefined ? {} : { burned: { ...burned } }),
		packSize: pack.length,
		...(burned === undefined ? {} : { returnable: pack.length > state.seats.length }),
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

/**
 * Makes the pick of a call of `pick`: checks it, takes the card and passes the packs when every pick is in.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller; undefined when it is no resident.
 * @param card - The id of the card to keep.
 * @param burn - The id of the card to burn, if any.
 * @returns The reply, or the refusal.
 */
export function pickNow(ctx: Ctx, resident: string | undefined, card: string, burn: string | undefined): ToolSuccess | Refusal {
	const refusal = problemWith(ctx, resident, card, burn);
	if (refusal !== undefined || resident === undefined) return refusal ?? refuse("NOT_A_SEAT", "You have no seat at this table.");
	const record = take(ctx, resident, card, burn, false);
	if (record === undefined) return refuse("NOT_IN_PACK", `${card} is not in your pack.`);
	ctx.access.lock(resident, PICK);
	const burned = record.burned === undefined ? "" : `, burned ${record.burned.id}`;
	const done = `Kept ${record.card.id} ${record.card.kind}${burned}. Your quarry: ${quarryLine(ctx.state.hands[resident] ?? [])}.`;
	if (ctx.state.owing.length === 0) pass(ctx, ctx.tick);
	return reply(`${done} Wait for the next pack.`);
}
