// SPDX-License-Identifier: Apache-2.0
/** The texts of the hint towers: the status a seat reads, the record after a game and the lines the replies share. */
import { deckOf, rankOf, suitOf } from "@swarmtales/mechanic-card-table/contract";
import type { HintTowersCtx } from "./head.ts";
import { candidates, isPlayable, nextRank, penaltyStrikes, surePlayable, topOf, type TowerGame, type EndReason, type Rules, type Slot } from "./model.ts";

type Ctx = HintTowersCtx;

/**
 * The rules of a game as the options set them.
 *
 * @param ctx - The context.
 * @returns The rules.
 *
 * @public
 */
export const rulesOf = (ctx: Ctx): Rules => ({ handSize: ctx.options.handSize, maxSignals: ctx.options.signals, maxStrikes: ctx.options.strikes, refillOnTower: ctx.options.refillOnTower, strikePenalty: ctx.options.strikePenalty });

/**
 * A count with its noun.
 *
 * @param count - The count.
 * @param word - The noun in the singular.
 * @returns `1 card`, `2 cards`.
 *
 * @public
 */
export const plural = (count: number, word: string): string => `${String(count)} ${word}${count === 1 ? "" : "s"}`;

/**
 * The strike counter as the status shows it: the end at the last strike, or the soft-strike cost.
 *
 * @param ctx - The context.
 * @param core - The game.
 * @returns The sentence, without its full stop.
 *
 * @public
 */
export function strikeText(ctx: Ctx, core: Readonly<TowerGame>): string {
	const { strikes, strikePenalty } = ctx.options;
	if (strikePenalty === 0) return `Strikes ${String(core.strikes)} of ${String(strikes)} (the last one ends the game)`;
	const paid = penaltyStrikes(core, rulesOf(ctx));
	return `Strikes ${String(core.strikes)} (soft strikes: from strike ${String(strikes)} on, every misfire also costs ${String(strikePenalty)} points${paid > 0 ? `; ${String(paid * strikePenalty)} points so far` : ""})`;
}

/**
 * Why a game ended, in words.
 *
 * @param reason - The reason.
 * @returns The phrase.
 *
 * @public
 */
export const reasonText = (reason: EndReason): string => (reason === "complete" ? "every card is lit or lost" : reason === "strikes" ? "the strikes ran out" : "the harbour went dark");

function knowText(slot: Slot): string {
	const parts = [slot.know.suit, slot.know.rank === null ? null : String(slot.know.rank)].filter((part) => part !== null);
	const nots = [...slot.know.notSuits, ...slot.know.notRanks.map(String)];
	if (parts.length === 0) return nots.length === 0 ? "nothing" : `not ${nots.join(", ")}`;
	return nots.length === 0 ? parts.join(" ") : `${parts.join(" ")}; not ${nots.join(", ")}`;
}

// One line per own slot: what the seat knows, what the card may be, whether it is surely playable.
function ownSlots(ctx: Ctx, core: Readonly<TowerGame>, seat: string): string[] {
	return (core.hands[seat] ?? []).map((slot, index) => {
		const options = candidates(core, seat, index);
		const listed = options.length <= ctx.options.listCandidates ? `could be ${options.join(", ")}` : `${String(options.length)} possible cards`;
		const focus = slot.focus > 0 ? `, the newest card of the signal at turn ${String(slot.focus)}` : "";
		const sure = surePlayable(core, seat, index) ? " SURELY PLAYABLE NOW." : "";
		const playable = options.filter((card) => isPlayable(core, card)).length;
		const odds = ctx.options.playableOdds && sure === "" && options.length > 0 ? ` Chance a play lights it now: ${String(playable)} of ${String(options.length)} (${String(Math.round((100 * playable) / options.length))} %).` : "";
		return `  slot ${String(index + 1)}${index === 0 ? " (oldest)" : ""}: you know ${knowText(slot)}${focus}; ${listed}.${sure}${odds}`;
	});
}

function otherHand(core: Readonly<TowerGame>, seat: string): string {
	const slots = (core.hands[seat] ?? []).map((slot, index) => `${String(index + 1)} ${slot.card}${slot.focus > 0 ? "*" : ""} [knows ${knowText(slot)}]`);
	return `  ${seat}: ${slots.length === 0 ? "(no cards)" : slots.join(" · ")}`;
}

// The draw pile in the status: its size, or the dark count once it is empty.
function pileText(core: Readonly<TowerGame>): string {
	if (core.dark === null) return plural(core.pile, "card");
	return `empty; turns in a row with no card lit and no signal given to a teammate (a discard does not count): ${String(Math.max(0, core.dark))} (the game ends at ${String(core.seats.length)})`;
}

// What the seat on turn may do now.
function choicesLine(ctx: Ctx, core: Readonly<TowerGame>, seat: string): string {
	const choices = [`playSlot (slot 1 to ${String(core.hands[seat]?.length ?? 0)})`];
	if (core.signals < ctx.options.signals) choices.push("discardSlot (a signal back)");
	if (core.signals > 0) choices.push(`giveSignal (a seat and one suit or one rank; ${plural(core.signals, "signal")} left)`);
	return `Your turn: one action, ${choices.join(", or ")}.`;
}

/**
 * The game as `seat` sees it: the towers, the counters, every other hand, its own knowledge and the last actions.
 *
 * @param ctx - The context.
 * @param seat - The seat that reads; another resident sees every hand.
 * @returns The status.
 *
 * @public
 */
export function tableText(ctx: Ctx, seat: string): string {
	const state = ctx.state;
	if (state.finished) return "The match is over.";
	const core = state.core;
	if (core?.over !== null) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon.`;
	const deck = deckOf(core.suits).length;
	const towers = core.suits.map((suit) => {
		const next = nextRank(core, suit.name);
		return `${suit.name} ${String(topOf(core, suit.name))}${next === null ? " (done)" : ` (next ${String(next)})`}`;
	});
	const lines = [
		`Game ${String(state.game)} of ${String(ctx.options.games)}, turn ${String(core.turn + 1)}. Turn order: ${core.seats.join(", ")}. You are ${seat}.`,
		`Towers (top lit rank, next playable rank): ${towers.join(" · ")}.`,
		`Lit ${String(core.lit.length)} of ${String(deck)}. Lost: ${core.lost.length === 0 ? "none" : core.lost.join(", ")}. Signals ${String(core.signals)} of ${String(ctx.options.signals)}. ${strikeText(ctx, core)}. Draw pile: ${pileText(core)}.`,
	];
	if (core.seats.includes(seat)) lines.push(`Your hand (you cannot see it; slot 1 is your oldest card, a new card goes last):`, ...ownSlots(ctx, core, seat));
	lines.push("The others' hands (* the newest card of a signal; in brackets what that seat knows):", ...core.seats.filter((other) => other !== seat).map((other) => otherHand(core, other)));
	const recent = ctx.options.recent === 0 ? [] : core.log.slice(-ctx.options.recent);
	if (recent.length > 0) lines.push(`Last actions: ${recent.map((line) => `t${String(line.turn)} ${line.seat} ${line.text}`).join(" | ")}.`);
	lines.push(core.actor === seat ? choicesLine(ctx, core, seat) : `Waiting for ${core.actor}.`);
	return lines.join("\n");
}

/**
 * What a discarded card was still needed for, told before it is lost: every card is needed until lit (P170).
 *
 * @param core - The game, before the discard.
 * @param card - The card.
 * @returns The card with what it was needed for.
 *
 * @public
 */
export function stillNeeded(core: Readonly<TowerGame>, card: string): string {
	const suit = suitOf(card);
	const top = topOf(core, suit);
	if (nextRank(core, suit) === rankOf(card)) return `${card} (playable right then)`;
	return `${card} (${suit} stood at ${top === 0 ? "nothing lit" : String(top)}; it would have been playable once the ranks below it were lit or lost)`;
}

/**
 * The record every seat gets after a game.
 *
 * @param ctx - The context.
 * @returns The record; empty when no game has ended.
 *
 * @public
 */
export function debriefText(ctx: Ctx): string {
	const record = ctx.state.results.at(-1);
	const core = ctx.state.core;
	if (record === undefined || core === null) return "";
	return [
		`Game ${String(record.game)} is over: ${reasonText(record.reason)}. The crew lit ${String(core.lit.length)} of ${String(deckOf(core.suits).length)} cards${record.score === core.lit.length ? "" : `, score ${String(record.score)} after the strike penalty`}.`,
		`Lost: ${String(record.lost)} (${String(record.lost - record.misfires)} discarded, ${plural(record.misfires, "misfire")}: ${core.lost.join(", ") || "none"}). Signals given: ${String(record.signals)}.`,
		...(ctx.state.discarded.length === 0 ? [] : [`Discarded, each still needed and each one point lost (no card is ever dead): ${ctx.state.discarded.join(", ")}.`]),
		`Scores so far: ${ctx.state.results.map((entry) => `game ${String(entry.game)} ${String(entry.score)}`).join(", ")}.`,
		...(ctx.options.debriefNote === undefined ? [] : [ctx.options.debriefNote]),
	].join("\n");
}
