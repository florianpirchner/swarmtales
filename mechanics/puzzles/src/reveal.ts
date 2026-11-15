// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The release of a city factor (old `revealFactor` of the service `PuzzlesApi`), the command `revealFactor` of the
 * service `deal`. A tool for the actor `script` would put that actor into every game that loads `puzzles`, the city
 * slice included (erratum of M5-64).
 */
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { cityFactorOf, type FactorDeal } from "./additive.ts";
import { lastLevelOf } from "./deal.ts";
import type { PuzzlesCtx } from "./head.ts";

const CITY = "CITY";

/** The answer of `revealFactor`: the new recipients, or why nothing was released. */
type Revealed = { readonly ok: true; readonly agents: string[] } | { readonly ok: false; readonly code: string; readonly detail: string };

const refused = (code: string, detail: string): Revealed => ({ ok: false, code, detail });

/**
 * Releases the city factor of an additive level: a city board post for `board`, otherwise a private city notice to
 * every listed resident who has not received it yet; writes `factor_revealed`.
 *
 * @param ctx - The context.
 * @param level - The level.
 * @param target - `board`, or the residents.
 * @returns The new recipients (none on the board), or `NOT_PLAYED`, `NOT_ADDITIVE`, `PER_TEAM`.
 */
export function revealFactor(ctx: PuzzlesCtx, level: number, target: "board" | readonly string[]): Revealed {
	if (level < ctx.options.startLevel || level > lastLevelOf(ctx)) return refused("NOT_PLAYED", `level ${String(level)} is not played in this run`);
	const puzzle = ctx.state.levels.get(level)?.puzzle;
	if (puzzle === undefined) return refused("NOT_PLAYED", `level ${String(level)} is behind a shut door`);
	if (puzzle.kind !== "additive") return refused("NOT_ADDITIVE", `level ${String(level)} has no factors`);
	return target === "board" ? toBoard(ctx, level, puzzle.deal) : toResidents(ctx, level, puzzle.deal, target);
}

// The city factor on the board, unless every team has its own.
function toBoard(ctx: PuzzlesCtx, level: number, deal: FactorDeal): Revealed {
	if (deal.teams.some((entry) => entry.cityFactor !== undefined)) return refused("PER_TEAM", `every team of level ${String(level)} has its own city factor`);
	ctx.tryCall(ChannelsService, "post", { author: CITY, text: `City factor of level ${String(level)}: ${deal.cityFactor}.` });
	ctx.emit("factor_revealed", { level, target: "board", agents: [] });
	return { ok: true, agents: [] };
}

// The city factor privately to each listed resident who has not received it yet.
function toResidents(ctx: PuzzlesCtx, level: number, deal: FactorDeal, target: readonly string[]): Revealed {
	const holders = ctx.state.cityFactors.get(level) ?? new Set<string>();
	ctx.state.cityFactors.set(level, holders);
	const recipients = target.filter((agent, index) => !holders.has(agent) && target.indexOf(agent) === index);
	for (const agent of recipients) {
		holders.add(agent);
		ctx.tryCall(ChannelsService, "notify", { to: agent, author: CITY, text: `City factor of level ${String(level)}: ${cityFactorOf(deal, agent)}.` });
	}
	if (recipients.length > 0) ctx.emit("factor_revealed", { level, target: "notice", agents: [...recipients] });
	return { ok: true, agents: recipients };
}
