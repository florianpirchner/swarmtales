/**
 * What the residents and the gamemaker do with the tribunal (old `Tribunal.schedule`,
 * `schedulingWindow`, `cityCall`, `atRisk`, `vote`, `nominate`, `join`, `refuse`), with the old
 * checks in the old order.
 */
import type { Static } from "typebox";
import { ProgressionApi } from "@swarmtales/mechanic-shared";
import { active, endOfAct, isAlive, lowestFirst, missing, present } from "./city.ts";
import { planTribunal } from "./court.ts";
import { join, nominate, phaseOf, refuseApplicant, type DraftError, type DraftPhase } from "./factions.ts";
import type { TribunalCtx } from "./head.ts";
import { accusedCount, callMinute, earliestOpening, fitsBefore, lastCityMinute, maxFactions, roomAfter } from "./rules.ts";
import { currentSession, previousOpening, type Plan } from "./state.ts";
import { err, namesOf, ok, type Result } from "./template.ts";
import type { SchedulingWindow } from "./view-api.ts";

export type VoteError = "NO_TRIBUNAL" | "NOT_A_VOTER" | "ALREADY_VOTED" | "NOT_ACCUSED" | "SELF_VOTE";
export type ScheduleError = "NO_TRIBUNAL" | "NOT_NOW" | "INVALID_COUNT" | "INVALID_FACTIONS" | "INVALID_MINUTE";

/** Old `schedulingWindow`. */
export function schedulingWindow(ctx: TribunalCtx): Static<typeof SchedulingWindow> {
	const { state, options: spec } = ctx;
	if (!active(ctx) || state.ended || state.halted) return { open: false, why: "the city holds no more tribunals" };
	if (state.actStart === undefined) return { open: false, why: "the tribunal's act has not begun" };
	if (state.called === 0) return { open: false, why: "the first tribunal has not been called yet" };
	if (state.plan !== undefined || currentSession(state) !== undefined) return { open: false, why: "a tribunal is pending; plan the next once its result is out" };
	const left = missing(ctx);
	if (left === 0) return { open: false, why: "the target is reached; the last gates are closing" };
	if (doorShut(ctx)) return { open: false, why: "a snapshot door is shut; plan once it opens" };
	const now = state.lastTick + 1;
	const previous = previousOpening(state);
	const earliest = earliestOpening(spec, now, previous);
	const end = endOfAct(ctx);
	const last = lastCityMinute(end) - spec.voteMinutes - spec.gateMinutes;
	if (earliest > last) return { open: false, why: "no tribunal fits before the act's last minute" };
	let latestWithRoom: number | undefined;
	for (let opens = earliest; opens <= last; opens++) if (roomAfter(spec, opens, end)) latestWithRoom = opens;
	const factions = spec.factions === undefined ? 0 : maxFactions(present(ctx).length);
	return { open: true, earliest, latestFinal: last, ...(latestWithRoom === undefined ? {} : { latestWithRoom }), missing: left, maxFactions: factions };
}

function doorShut(ctx: TribunalCtx): boolean {
	return ctx.call(ProgressionApi, "doorShut", {});
}

/** Old `schedule`: the gamemaker plans the next tribunal within the guard rails. */
export function schedule(ctx: TribunalCtx, minute: number, count: number, factions: number | undefined, reason: string): Result<Plan, ScheduleError> {
	const window = schedulingWindow(ctx);
	if (!window.open) return err("NOT_NOW", window.why);
	if (!Number.isInteger(count) || count < 1 || count > window.missing) return err("INVALID_COUNT", `count must be between 1 and ${window.missing}, the residents still to exile`);
	const draft = ctx.options.factions;
	// Left out, the story's default count, within what the city's residents allow.
	const asked = factions ?? (draft === undefined ? undefined : Math.min(draft.count, window.maxFactions));
	if (draft !== undefined && window.maxFactions >= 2 && (asked === undefined || !Number.isInteger(asked) || asked < 2 || asked > window.maxFactions)) {
		return err("INVALID_FACTIONS", `factions must be between 2 and ${window.maxFactions} (half of the residents present)`);
	}
	if (draft === undefined && factions !== undefined) return err("INVALID_FACTIONS", "this city holds no faction draft; leave factions out");
	if (!Number.isInteger(minute) || minute < window.earliest) {
		return err(
			"INVALID_MINUTE",
			`the earliest opening is minute ${window.earliest} (the call comes ahead of it, not before the next minute, and ${ctx.options.minGap} minutes after the previous opening)`,
		);
	}
	if (minute > window.latestFinal) return err("INVALID_MINUTE", `the latest opening is minute ${window.latestFinal}: vote and gate must end before the act does`);
	if (count < window.missing && (window.latestWithRoom === undefined || minute > window.latestWithRoom)) {
		return err(
			"INVALID_MINUTE",
			window.latestWithRoom === undefined
				? `no tribunal fits after this one: exile all ${window.missing} still missing (count ${window.missing})`
				: `open by minute ${window.latestWithRoom} to leave room for one more tribunal, or exile all ${window.missing} still missing`,
		);
	}
	return ok(planTribunal(ctx, minute, count, window.maxFactions >= 2 ? (asked ?? 0) : 0, "gamemaker", reason.trim().slice(0, 500)));
}

/** Old `cityCall`: when the city calls a tribunal itself if nobody plans one. */
export function cityCall(ctx: TribunalCtx): { readonly calledAt: number; readonly opens: number } | undefined {
	const { state, options: spec } = ctx;
	if (!active(ctx) || state.ended || state.halted || state.called === 0) return undefined;
	if (state.plan !== undefined || currentSession(state) !== undefined || missing(ctx) === 0) return undefined;
	const previous = previousOpening(state);
	const end = endOfAct(ctx);
	const fallback = state.lastResult === undefined ? undefined : state.lastResult + spec.fallbackGap;
	for (let minute = state.lastTick + 1; minute < end; minute++) {
		const opens = earliestOpening(spec, minute, previous);
		if (!fitsBefore(spec, opens, end)) return undefined;
		const final = !fitsBefore(spec, earliestOpening(spec, minute + 1, previous), end);
		if (final || (fallback !== undefined && minute >= fallback)) return { calledAt: callMinute(spec, opens, previous), opens };
	}
	return undefined;
}

/** Old `atRisk`: who stands trial. */
export function atRisk(ctx: TribunalCtx): { readonly opens: number; readonly now: boolean; readonly accused: readonly string[] } | undefined {
	const session = currentSession(ctx.state);
	if (session !== undefined) return { opens: session.minute, now: true, accused: session.accused };
	const plan = ctx.state.plan;
	const left = missing(ctx);
	if (plan === undefined || left === 0) return undefined;
	const here = present(ctx);
	const final = !roomAfter(ctx.options, plan.opens, endOfAct(ctx));
	const planned = Math.min(final ? Math.max(plan.count, left) : plan.count, left);
	return { opens: plan.opens, now: false, accused: lowestFirst(ctx, plan.opens, here).slice(0, accusedCount(planned, here.length)) };
}

/** Old `canVote`: a voter of the open tribunal that has not voted yet. */
export function canVote(ctx: TribunalCtx, agent: string): boolean {
	const session = currentSession(ctx.state);
	return session !== undefined && session.voters.includes(agent) && !session.votes.some((vote) => vote.voter === agent) && isAlive(ctx, agent);
}

/** Old `draftPhase`: where `agent` stands in a running faction draft. */
export function draftPhase(ctx: TribunalCtx, agent: string): DraftPhase | undefined {
	if (!isAlive(ctx, agent) || ctx.state.draft === undefined) return undefined;
	return phaseOf(ctx.state.draft, agent);
}

/** Old `vote`. */
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

/** Old `nominate`, `join` and `refuse`: the draft's steps for a resident in the city. */
export function draftStep(ctx: TribunalCtx, step: "nominate" | "join" | "refuse", agent: string, other: string): Result<string, DraftError> {
	const draft = ctx.state.draft;
	if (draft === undefined || !isAlive(ctx, agent)) return err("NO_DRAFT", "no faction draft is running for you");
	if (step === "nominate") return nominate(ctx, draft, agent, other);
	return step === "join" ? join(ctx, draft, agent, other) : refuseApplicant(ctx, draft, agent, other);
}
