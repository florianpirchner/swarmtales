// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The samples of the tribunal's tools for the fake driver: each gives a call the court takes now, or nothing. */
import type { RandomSource } from "@swarmtales/contracts";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import type { ToolCtx } from "./head.ts";
import { courtFor } from "./ports.ts";

/** The share of the times a sample of the Director is asked in which it gives a call. */
const RATE = 0.25;

/**
 * A call on the first blocker while none runs and the pause is over.
 *
 * @param ctx - The context.
 * @param random - The sample's randomness.
 * @returns The params, or undefined.
 */
export function sampleCall(ctx: ToolCtx, random: RandomSource): { accused: string[]; reason: string } | undefined {
	const data = ctx.state.data;
	const blocker = [...data.blockers.values()][0];
	if (random.next() >= RATE || blocker === undefined || data.session !== undefined || ctx.tick < data.cooldownUntil) return undefined;
	return { accused: [blocker.blocker], reason: `Tribunal ${String(data.tribunals + 1)}: ${blocker.blocker} holds back a fragment of door ${String(blocker.door)}.` };
}

/**
 * A ballot of a voter while its vote is open.
 *
 * @param ctx - The context.
 * @param random - The sample's randomness.
 * @returns The params, or undefined.
 */
export function sampleVote(ctx: ToolCtx, random: RandomSource): { yes: boolean } | undefined {
	return ctx.resident !== undefined && courtFor(ctx).canVote(ctx.resident) ? { yes: random.next() < 0.5 } : undefined;
}

/**
 * The lot among every resident in the city, once the last vote failed.
 *
 * @param ctx - The context.
 * @returns The params, or undefined.
 */
export function sampleLot(ctx: ToolCtx): { candidates: string[] } | undefined {
	const session = ctx.state.data.session;
	return session?.stage === "lot" && session.drawn === undefined ? { candidates: [...ctx.call(ExileService, "alive", {})] } : undefined;
}

/**
 * The Director's words for the outcome that waits.
 *
 * @param ctx - The context.
 * @returns The params, or undefined.
 */
export function sampleAnnounce(ctx: ToolCtx): { text: string } | undefined {
	const pending = ctx.state.data.pending;
	return pending === undefined ? undefined : { text: `Tribunal ${String(pending.tribunal)}: ${pending.facts}.`.slice(0, 400) };
}

/**
 * The strike of the banished accused, or of the one the lot drew.
 *
 * @param ctx - The context.
 * @returns The params, or undefined.
 */
export function sampleStrike(ctx: ToolCtx): { agent: string; reason: string } | undefined {
	const session = ctx.state.data.session;
	const agent = session?.stage === "banish" ? session.accused : session?.stage === "lot" ? session.drawn : undefined;
	return agent === undefined || session === undefined ? undefined : { agent, reason: `Tribunal ${String(session.number)}: ${agent} leaves the city.` };
}
