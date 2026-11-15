// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The texts a seat reads: a resolved lot, the rules, its task on an open lot, the auction, and the input lines of an activation. */
import { lotNow } from "./flow.ts";
import type { SealedAuctionCtx } from "./head.ts";
import { scoreLine } from "./model.ts";
import type { LotKind, LotResult } from "./rules.ts";

type Ctx = SealedAuctionCtx;

const LABEL: Readonly<Record<LotKind, string>> = { "first-price": "pay-your-bid", "second-price": "pay-the-runner-up", common: "shared-worth" };

/**
 * One public line of a resolved lot, from the view of `resident`.
 *
 * @param result - The resolved lot.
 * @param resident - The reader.
 * @param worth - A common lot's true worth, if known.
 * @returns The line.
 *
 * @public
 */
export function resultLine(result: LotResult, resident: string, worth: number | undefined): string {
	const bids = Object.entries(result.bids).map(([seat, bid]) => `${seat} ${String(bid)}`).join(", ");
	const head = `lot ${String(result.number)} (${LABEL[result.kind]}): bids ${bids}`;
	if (result.winner === undefined) return `${head}; no bid counted, unsold`;
	const won = result.winner === resident ? `you won and paid ${String(result.price)}, gaining ${String(result.profit)}` : `${result.winner} won and paid ${String(result.price)}`;
	const shown = result.kind === "common" && worth !== undefined ? `; the true worth was ${String(worth)}` : "";
	const tie = result.tie ? " (a tie, drawn by lot)" : "";
	const missed = result.missed.includes(resident) ? "; you did not bid in time (a pass)" : "";
	return `${head}; ${won}${tie}${shown}${missed}`;
}

function rulesText(ctx: Ctx): string {
	const { purse, reserve, valueMin, valueMax, worthMin, worthMax, noise } = ctx.options;
	return ctx.prompt("sealed-auction/rules", { purse, lots: ctx.options.lots.length, reserve, valueMin, valueMax, worthMin, worthMax, noise });
}

function taskText(ctx: Ctx, resident: string): string | undefined {
	const state = ctx.state;
	const lot = lotNow(ctx);
	if (lot === undefined || !state.owing.includes(resident)) return undefined;
	const own = lot.values[resident] ?? 0;
	const base = { lot: lot.number, lots: state.lots.length, coins: state.coins[resident] ?? 0 };
	if (lot.kind === "common") return ctx.prompt("sealed-auction/task-common", { ...base, estimate: own, noise: ctx.options.noise });
	return ctx.prompt(lot.kind === "first-price" ? "sealed-auction/task-first-price" : "sealed-auction/task-second-price", { ...base, value: own });
}

// What `viewAuction` shows a seat beyond the rules: its task, its coins and points, and the results of the game so far.
function seatLines(ctx: Ctx, resident: string): readonly string[] {
	const state = ctx.state;
	const past = state.results.map((result) => resultLine(result, resident, state.lots[result.number - 1]?.worth));
	return [
		taskText(ctx, resident) ?? "Nothing to bid for you right now.",
		`Your coins: ${String(state.coins[resident] ?? 0)}. Your points: ${String(state.gameScores[resident] ?? 0)} in this game, ${String(state.scores[resident] ?? 0)} in all.`,
		past.length === 0 ? "No lot of this game is sold yet." : `This game so far: ${past.join("; ")}.`,
	];
}

/**
 * What `viewAuction` shows `resident`: the game and lot, the rules, its task, its coins and points, and the results so far.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The caller.
 * @returns The text.
 *
 * @public
 */
export function auctionText(ctx: Ctx, resident: string | undefined): string {
	const state = ctx.state;
	if (state.finished) return `The match is over. Points: ${scoreLine(state.scores, state.seats)}.`;
	if (!state.running) return state.game === 0 ? "The first game has not started yet." : `Game ${String(state.game)} is over; the next one starts soon. Points: ${scoreLine(state.scores, state.seats)}.`;
	const lines = [`Game ${String(state.game)} of ${String(ctx.options.games)}, lot ${String(state.lot)} of ${String(state.lots.length)}.`, rulesText(ctx)];
	if (resident !== undefined && state.seats.includes(resident)) lines.push(...seatLines(ctx, resident));
	return lines.join("\n");
}

/**
 * The input lines of an activation of `resident`: the game's rules once per game, then the last result and the task
 * once per lot.
 *
 * @param ctx - The context of the mechanic.
 * @param resident - The resident to act.
 * @returns The lines.
 *
 * @public
 */
export function inputLines(ctx: Ctx, resident: string): string[] {
	const state = ctx.state;
	if (!state.running || !state.seats.includes(resident)) return [];
	const lines: string[] = [];
	if (!state.briefed.includes(resident)) {
		state.briefed.push(resident);
		lines.push(`${ctx.prompt("sealed-auction/game-head", { game: state.game, games: ctx.options.games, lots: state.lots.length })} ${rulesText(ctx)}`);
	}
	if (state.open && !state.told.includes(resident)) {
		state.told.push(resident);
		const last = state.results[state.results.length - 1];
		if (last?.number === state.lot - 1) lines.push(`Last ${resultLine(last, resident, state.lots[last.number - 1]?.worth)}.`);
		const task = taskText(ctx, resident);
		if (task !== undefined) lines.push(task);
	}
	return lines;
}
