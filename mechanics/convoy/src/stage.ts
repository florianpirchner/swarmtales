// SPDX-License-Identifier: Apache-2.0
/**
 * The second half of a stage and the end of a game: the sealed cards of the crew, the reveal of their count, the
 * accusations of the loyal seats after the crossing, the score of the game, and the timer of these two phases.
 */
import { StrategyBrainService } from "@swarmtales/mechanic-strategy-brain/contract";
import { list, miss, openPhase, openStage, record, refreshLocks } from "./flow.ts";
import type { ConvoyCtx } from "./head.ts";
import { mayDamage, winnerOf, type CardKind, type PlayRecord, type Rules, type StageRecord } from "./model.ts";
import { referenceOf } from "./tracker.ts";

type Ctx = ConvoyCtx;

const rulesOf = (ctx: Ctx): Rules => ({ seats: ctx.state.seats.length, saboteurs: ctx.options.saboteurs, crews: ctx.options.crews, damageToLose: ctx.options.damageToLose, cooldown: ctx.options.cooldown });

/**
 * The stages of the game that were damaged.
 *
 * @param ctx - The context of the mechanic.
 * @returns Their number.
 *
 * @public
 */
export const damagedCount = (ctx: Ctx): number => ctx.state.stages.filter((stage) => stage.damaged).length;

/**
 * The saboteurs of the game, in table order.
 *
 * @param ctx - The context of the mechanic.
 * @returns Their seats.
 *
 * @public
 */
export const saboteursOf = (ctx: Ctx): string[] => ctx.state.seats.filter((seat) => ctx.state.roles[seat] === "saboteur");

/**
 * Whether `seat` may play a damage card in the stage that is open: a saboteur whose cooldown is over.
 *
 * @param ctx - The context of the mechanic.
 * @param seat - The seat.
 * @returns True when a damage card is allowed.
 *
 * @public
 */
export function canDamage(ctx: Ctx, seat: string): boolean {
	return ctx.state.roles[seat] === "saboteur" && mayDamage(ctx.state.lastDamage[seat] ?? 0, ctx.state.stage, ctx.options.cooldown);
}

/**
 * Takes a crew member's sealed card.
 *
 * @param ctx - The context of the mechanic.
 * @param seat - The crew member.
 * @param card - The card.
 * @param missed - True when the timer played it.
 *
 * @public
 */
export function playCard(ctx: Ctx, seat: string, card: CardKind, missed: boolean): void {
	const state = ctx.state;
	const role = state.roles[seat] ?? "loyal";
	const entry: PlayRecord = { game: state.game, stage: state.stage, seat, card, role, missed, mayDamage: canDamage(ctx, seat) };
	state.plays[seat] = card;
	if (card === "damage") state.lastDamage[seat] = state.stage;
	state.sealed.push(entry);
	state.owing = state.owing.filter((id) => id !== seat);
	ctx.emit("convoy_card_played", { ...entry });
}

/**
 * Reveals the number of damage cards of the stage: the next stage opens, or the crossing is over and the loyal seats
 * name their suspects.
 *
 * @param ctx - The context of the mechanic.
 * @param tick - The tick the next phase counts from.
 *
 * @public
 */
export function resolveStage(ctx: Ctx, tick: number): void {
	const state = ctx.state;
	const damage = state.crew.filter((seat) => state.plays[seat] === "damage").length;
	const stage: StageRecord = { stage: state.stage, lead: state.lead, crew: [...state.crew], votes: { ...state.firstVotes }, ...(state.noVote.length === 0 ? {} : { noVote: [...state.noVote] }), damage, damaged: damage > 0, ...(state.rejected === undefined ? {} : { rejected: { lead: state.rejected.lead, crew: [...state.rejected.crew] } }) };
	state.stages.push(stage);
	ctx.emit("convoy_stage_revealed", structuredClone(stage));
	const total = damagedCount(ctx);
	record(ctx, `Stage ${String(stage.stage)} revealed: ${String(damage)} damage card${damage === 1 ? "" : "s"} among the crew ${list(stage.crew)}. ${stage.damaged ? `The stage is damaged (${String(total)} of ${String(ctx.options.damageToLose)} damaged stages stop the convoy).` : `The stage is crossed safely (${String(total)} of ${String(ctx.options.damageToLose)} damaged so far).`}`);
	// The lead moves one seat per stage from the stage's first lead, also when its term ended.
	const index = state.seats.indexOf(stage.rejected?.lead ?? state.lead);
	state.nextLead = (index + 1) % state.seats.length;
	const winner = winnerOf(rulesOf(ctx), state.stages);
	if (winner === undefined) {
		openStage(ctx, state.stage + 1, tick);
		return;
	}
	record(ctx, winner === "saboteurs" ? `The convoy is stopped at stage ${String(stage.stage)}: the saboteurs win.` : "The convoy crosses the last stage: the loyal seats win.");
	const loyal = state.seats.filter((seat) => state.roles[seat] === "loyal");
	openPhase(ctx, "accuse", loyal, tick);
}

// The game is over: a point to every seat of the winning side, the reference of the report, the brain's retro, the next game.
function endGame(ctx: Ctx): void {
	const state = ctx.state;
	const winner = winnerOf(rulesOf(ctx), state.stages) ?? "convoy";
	state.running = false;
	state.phase = "idle";
	state.owing = [];
	refreshLocks(ctx);
	const winners = state.seats.filter((seat) => (winner === "saboteurs") === (state.roles[seat] === "saboteur"));
	for (const seat of winners) state.scores[seat] = (state.scores[seat] ?? 0) + 1;
	ctx.emit("convoy_game_ended", { game: state.game, winner, roles: { ...state.roles }, damaged: damagedCount(ctx), stages: state.stages.length, cards: state.sealed.map((entry) => ({ ...entry })), totals: { ...state.scores } });
	ctx.emit("convoy_game_scored", { game: state.game, ...referenceOf(ctx) });
	const last = state.game >= ctx.options.games;
	if (last) state.finished = true;
	const summary = `${winner === "saboteurs" ? `the saboteurs (${list(saboteursOf(ctx))}) stopped the convoy at stage ${String(state.stages.length)}` : `the convoy crossed all ${String(state.stages.length)} stages; the saboteurs were ${list(saboteursOf(ctx))}`} (${String(damagedCount(ctx))} damaged); points ${state.seats.map((seat) => `${seat} ${String(state.scores[seat] ?? 0)}`).join(", ")}`;
	ctx.tryCall(StrategyBrainService, "gameEnded", { game: state.game, summary });
	if (last) ctx.emit("convoy_match_ended", { scores: { ...state.scores } });
	else ctx.schedule.at(ctx.tick + 1, "nextGame");
}

/**
 * Takes a loyal seat's sealed suspects; the game ends with the last of them.
 *
 * @param ctx - The context of the mechanic.
 * @param seat - The loyal seat.
 * @param ids - The seats it names; none when the timer filled it in.
 * @param missed - True when the timer filled it in.
 *
 * @public
 */
export function accuseSeat(ctx: Ctx, seat: string, ids: readonly string[], missed: boolean): void {
	const state = ctx.state;
	state.accusations[seat] = [...ids];
	state.owing = state.owing.filter((id) => id !== seat);
	ctx.access.lock(seat, "accuse");
	ctx.emit("convoy_accused", { game: state.game, seat, accused: [...ids], missed });
	if (state.owing.length === 0) endGame(ctx);
}

/**
 * The timer of the cards and the accusations, at the end of a tick: a card that was not played in time is safe, a
 * loyal seat that named nobody in time accuses nobody. Other phases are left alone.
 *
 * @param ctx - The context of the mechanic.
 *
 * @public
 */
export function closeLateCards(ctx: Ctx): void {
	const state = ctx.state;
	if (!state.running || ctx.tick - state.opened + 1 < ctx.options.deadline) return;
	if (state.phase === "play") {
		for (const seat of [...state.owing]) {
			miss(ctx, seat);
			playCard(ctx, seat, "safe", true);
		}
		resolveStage(ctx, ctx.tick + 1);
	} else if (state.phase === "accuse") {
		for (const seat of [...state.owing]) {
			miss(ctx, seat);
			accuseSeat(ctx, seat, [], true);
		}
	}
}
