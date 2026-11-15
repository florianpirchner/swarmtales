// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The residents' secret vote and who stands trial, carried from the old `schedule.ts` (`vote`, `canVote`, `atRisk`),
 * with the old checks in the old order. The gamemaker's schedule (`scheduleTribunal`, `schedulingWindow`, `cityCall`)
 * joins with M5-43; the draft's steps are in `draft.ts`.
 */
import { endOfAct, isAlive, lowestFirst, missing, present } from "./city.ts";
import type { TribunalCtx } from "./head.ts";
import { accusedCount, roomAfter } from "./pacing.ts";
import { currentSession } from "./state.ts";
import { err, namesOf, ok, type Result } from "./template.ts";

/**
 * The refusal codes of `vote`.
 *
 * @public
 */
export type VoteError = "NO_TRIBUNAL" | "NOT_A_VOTER" | "ALREADY_VOTED" | "NOT_ACCUSED" | "SELF_VOTE";

/**
 * The next trial: when it opens, whether it runs now, and its accused.
 *
 * @public
 */
export interface Risk {
	/** The tick it opens. */
	readonly opens: number;
	/** Whether its vote runs now. */
	readonly now: boolean;
	/** Its accused. */
	readonly accused: string[];
}

/**
 * Old `atRisk`: who stands trial, in the running tribunal or in the planned one.
 *
 * @param ctx - The context.
 * @returns The trial, or undefined without one or with nothing missing.
 */
export function atRisk(ctx: TribunalCtx): Risk | undefined {
	const session = currentSession(ctx.state);
	if (session !== undefined) return { opens: session.minute, now: true, accused: [...session.accused] };
	const plan = ctx.state.plan;
	const left = missing(ctx);
	if (plan === undefined || left === 0) return undefined;
	const here = present(ctx);
	const final = !roomAfter(ctx.options, plan.opens, endOfAct(ctx));
	const planned = Math.min(final ? Math.max(plan.count, left) : plan.count, left);
	return { opens: plan.opens, now: false, accused: lowestFirst(ctx, plan.opens, here).slice(0, accusedCount(planned, here.length)) };
}

/**
 * Old `canVote`: a voter of the open tribunal that has not voted yet.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @returns True when it may vote now.
 */
export function canVote(ctx: TribunalCtx, agent: string): boolean {
	const session = currentSession(ctx.state);
	return session !== undefined && session.voters.includes(agent) && !session.votes.some((vote) => vote.voter === agent) && isAlive(ctx, agent);
}

/**
 * Old `vote`: the secret vote of `voter` against one of the accused.
 *
 * @param ctx - The context.
 * @param voter - The resident that votes.
 * @param target - The resident it votes against, an id.
 * @returns The accused voted against, or the refusal.
 */
export function vote(ctx: TribunalCtx, voter: string, target: string): Result<string, VoteError> {
	const session = currentSession(ctx.state);
	if (session === undefined) return err("NO_TRIBUNAL", "no tribunal is voting now");
	if (!session.voters.includes(voter) || !isAlive(ctx, voter)) return err("NOT_A_VOTER", "you do not vote in this tribunal");
	if (session.votes.some((entry) => entry.voter === voter)) return err("ALREADY_VOTED", "your vote is cast and final");
	const accused = session.accused.find((agent) => agent === target);
	if (accused === undefined) return err("NOT_ACCUSED", `the accused are ${namesOf(session.accused)}`);
	if (accused === voter) {
		const others = session.accused.filter((agent) => agent !== voter);
		return err("SELF_VOTE", `you may not vote against yourself; vote against ${others.length === 1 ? "" : "one of "}${namesOf(others)}`);
	}
	session.votes.push({ voter, target: accused });
	ctx.emit("tribunal_vote", { voter, target: accused });
	return ok(accused);
}
