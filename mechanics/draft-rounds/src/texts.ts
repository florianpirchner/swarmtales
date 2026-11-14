// SPDX-License-Identifier: Apache-2.0
/** The texts of the `draft-rounds` mechanic: the rules, the pick a seat is asked for, the table and a game's result line. */
import type { DraftRoundsCtx } from "./head.ts";
import { cardsLine, deckOf, quarryLine, receiverOf, RESOURCES } from "./model.ts";

type Ctx = DraftRoundsCtx;

/**
 * The cards of a game's deck.
 *
 * @param ctx - The mechanic's context.
 * @returns Seats times pack rounds times pack size.
 */
export const deckSize = (ctx: Ctx): number => ctx.state.seats.length * ctx.options.packs * ctx.options.packSize;

// The deck's make-up in words: `11 amber, 11 basalt, 11 cobalt, 11 jade, 4 lodestone`.
function deckLine(ctx: Ctx): string {
	const deck = deckOf(deckSize(ctx), ctx.options.wilds);
	return [...RESOURCES, "lodestone" as const].map((kind) => `${String(deck.filter((card) => card.kind === kind).length)} ${kind}`).join(", ");
}

function scoreLine(scores: Readonly<Record<string, number>>, seats: readonly string[]): string {
	return seats.map((seat) => `${seat} ${String(scores[seat] ?? 0)}`).join(", ");
}

/**
 * The game's public result in one line: points, and each seat's quarry.
 *
 * @param ctx - The mechanic's context.
 * @returns The line.
 */
export function resultLine(ctx: Ctx): string {
	const state = ctx.state;
	const quarries = state.seats.map((seat) => `${seat} ${quarryLine(state.hands[seat] ?? [])}`).join("; ");
	const line = `points ${scoreLine(state.gameScores, state.seats)}; quarries ${quarries}`;
	return ctx.options.maxBurns === 0 ? line : `${line}; burns ${burnsLine(ctx)}`;
}

// Every seat's burns of the game, and which of them could have come back to the burner (P126: a brain
// cannot learn a cost it never sees): `A01 J3 amber (its pack came back to A01 later: A01 lost that card), B4 basalt; A02 none`.
function burnsLine(ctx: Ctx): string {
	const state = ctx.state;
	return state.seats
		.map((seat) => {
			const burns = state.picks.filter((pick) => pick.resident === seat && pick.burned !== undefined);
			if (burns.length === 0) return `${seat} none`;
			return `${seat} ${burns.map((pick) => `${pick.burned?.id ?? ""} ${pick.burned?.kind ?? ""}${pick.returnable === true ? ` (its pack came back to ${seat} later: ${seat} lost that card)` : ""}`).join(", ")}`;
		})
		.join("; ");
}

// The place bonus in words: `the best quarry of the game gets 10 more points, the second 5`.
function placesLine(ctx: Ctx): string {
	const names = ["best", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
	const parts = ctx.options.placeBonus.map((points, index) => (index === 0 ? `the ${names[index] ?? ""} quarry of the game gets ${String(points)} more points` : `the ${names[index] ?? ""} ${String(points)}`)).filter((_, index) => (ctx.options.placeBonus[index] ?? 0) > 0);
	return parts.length === 0 ? "No bonus for places." : `By the score so far, ${parts.join(", ")} (a tie shares the better place).`;
}

/**
 * The rules of the game, with the options of this run.
 *
 * @param ctx - The mechanic's context.
 * @returns The text.
 */
export function rulesText(ctx: Ctx): string {
	const { games, packs, packSize, majorityBonus, maxBurns, burnCost } = ctx.options;
	const burnRule = maxBurns === 0 ? "There are no burns in this game." : `With a pick you may burn one more card of the pack to destroy it, at most ${String(maxBurns)} times a game, for ${String(burnCost)} points each.`;
	return ctx.prompt("draft-rounds/rules", { seats: ctx.state.seats.length, games, packs, packSize, deck: deckLine(ctx), majorityBonus, burnRule, places: placesLine(ctx) });
}

/**
 * The pick `resident` is asked for now, or undefined.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The seat.
 * @returns The text, or undefined when the seat owes no pick.
 */
export function taskText(ctx: Ctx, resident: string): string | undefined {
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
		burnLine:
			ctx.options.maxBurns === 0
				? "Keep one card with pick (card id and a short reason)."
				: `Burns left: ${String(Math.max(0, ctx.options.maxBurns - (state.burns[resident] ?? 0)))} (each costs ${String(ctx.options.burnCost)} points). Keep one card with pick (card id and a short reason; add burn with a second card id to destroy it).`,
		receiver: receiverOf(state.seats, resident, state.packRound),
	});
}

/**
 * The table as `viewTable` shows it to `resident`.
 *
 * @param ctx - The mechanic's context.
 * @param resident - The caller; undefined when it is no resident.
 * @returns The text.
 */
export function tableText(ctx: Ctx, resident: string | undefined): string {
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
