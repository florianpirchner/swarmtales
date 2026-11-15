// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tribunal's work at the start of a tick, carried from the old `court.ts` (old `Tribunal.tick`, SPEC 6.4), step
 * for step: the act begins, the votes close (the exile closed the gates just before: it loads first), the city plans,
 * calls and opens tribunals, and the act's target is reached. The faction draft of the call and the opening joins with
 * M5-42. Votes are never shown; only the exiled learns who voted against it (the exile's gate notice).
 */
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import { active, actLevel, endOfAct, exiledList, lowestFirst, missing, notify, post, present, register, render, residentsCount, target, text } from "./city.ts";
import type { TribunalCtx } from "./head.ts";
import { accusedCount, callTick, earliestOpening, fitsBefore, maxFactions, noDraftReason, roomAfter } from "./pacing.ts";
import { currentSession, previousOpening, type Plan, type Planner } from "./state.ts";
import { namesOf } from "./template.ts";
import { busy, closeSession, end, verdictOpen } from "./verdict.ts";

/**
 * The city's work at the start of a tick, after the exile closed the gates whose time is up (old `tick`).
 *
 * @param ctx - The context.
 * @throws SwtError `SWT-G020` when a text of the options names an unknown placeholder.
 */
export function tick(ctx: TribunalCtx): void {
	const { state } = ctx;
	const minute = ctx.tick;
	state.lastTick = minute;
	if (state.ended || !begun(ctx) || !active(ctx)) return;
	for (const session of state.sessions) if (!session.closed && minute >= session.until) closeSession(ctx, session, minute);
	pace(ctx, minute);
	callDue(ctx, minute);
	openDue(ctx, minute);
	if (reached(ctx)) end(ctx);
}

// The called tribunal whose opening is due opens.
function openDue(ctx: TribunalCtx, minute: number): void {
	const called = ctx.state.plan;
	if (called?.called !== true || minute < called.opens) return;
	delete ctx.state.plan;
	open(ctx, called, minute);
}

// The target is reached once nothing is missing, as many are exiled, nothing is planned and nothing is under way.
function reached(ctx: TribunalCtx): boolean {
	return missing(ctx) === 0 && exiledList(ctx).length >= target(ctx) && ctx.state.plan === undefined && !busy(ctx);
}

// Whether the tribunal's act has begun (Act I is a tutorial: nothing to do yet); at its start the residents are counted.
function begun(ctx: TribunalCtx): boolean {
	const { state } = ctx;
	if (state.actStart !== undefined) return true;
	const start = ctx.call(ProgressionService, "actStart", { fromLevel: actLevel(ctx) });
	// The output of `actStart` is typed loosely by its contract: a number once the act has begun.
	if (typeof start !== "number") return false;
	state.actStart = start;
	state.residents = register(ctx).length;
	return true;
}

// The planned tribunal whose call is due: dropped while a snapshot door is shut or once nothing is missing, else called.
function callDue(ctx: TribunalCtx, minute: number): void {
	const plan = ctx.state.plan;
	if (plan === undefined || plan.called || minute < plan.calledAt) return;
	// A snapshot door shut at the call (SPEC 17): the plan is dropped, and the city plans anew once it opens.
	if (ctx.call(ProgressionService, "doorShut", {})) {
		ctx.emit("tribunal_cancelled", { tribunal: plan.tribunal, reason: "a snapshot door is shut" });
		delete ctx.state.plan;
		return;
	}
	const left = missing(ctx);
	if (left === 0) {
		// A seal struck the last resident still missing since the planning (v09): the city calls nothing.
		ctx.emit("tribunal_cancelled", { tribunal: plan.tribunal, reason: "the target is reached" });
		delete ctx.state.plan;
		return;
	}
	call(ctx, plan.count > left ? { ...plan, count: left } : plan);
}

// Whether the city may plan a tribunal of its own now: nothing pending, something missing, no door shut.
function mayPace(ctx: TribunalCtx): boolean {
	const { state } = ctx;
	if (state.halted || state.plan !== undefined || currentSession(state) !== undefined || verdictOpen(ctx) || missing(ctx) === 0) return false;
	return !ctx.call(ProgressionService, "doorShut", {});
}

// The city's own plans when nothing is pending: the first tribunal, the forced final one, a fallback (old `#pace`).
function pace(ctx: TribunalCtx, minute: number): void {
	const { state, options: spec } = ctx;
	if (!mayPace(ctx)) return;
	const previous = previousOpening(state);
	const opens = earliestOpening(spec, minute, previous);
	const last = endOfAct(ctx);
	if (!fitsBefore(spec, opens, last)) return;
	const factions = spec.factions?.count ?? 0;
	const left = missing(ctx);
	// One more only if another fits after it; otherwise this one takes everything still missing.
	const count = roomAfter(spec, opens, last) ? 1 : left;
	if (state.called === 0) {
		paceFirst(ctx, minute, opens, count, factions);
		return;
	}
	if (!fitsBefore(spec, earliestOpening(spec, minute + 1, previous), last)) {
		planTribunal(ctx, opens, left, factions, "final");
		return;
	}
	if (state.lastResult !== undefined && minute >= state.lastResult + spec.fallbackGap) planTribunal(ctx, opens, count, factions, "fallback");
}

// The first tribunal: once the first resident passed `first.level`, at the latest `first.latestAfter` after the act's start.
function paceFirst(ctx: TribunalCtx, minute: number, opens: number, count: number, factions: number): void {
	const { first } = ctx.options;
	const progress = ctx.call(ProgressionService, "passed", { level: first.level }).length > 0;
	const deadline = (ctx.state.actStart ?? 0) + first.latestAfter;
	if (progress || minute >= deadline) planTribunal(ctx, opens, count, factions, progress ? "progress" : "deadline");
}

/**
 * Old `#planTribunal`: the plan, and `tribunal_scheduled`.
 *
 * @param ctx - The context.
 * @param opens - The tick it opens.
 * @param count - Residents it exiles.
 * @param factions - Factions formed before it.
 * @param by - Who planned it.
 * @param reason - The gamemaker's reason.
 * @returns The plan.
 */
export function planTribunal(ctx: TribunalCtx, opens: number, count: number, factions: number, by: Planner, reason?: string): Plan {
	const calledAt = callTick(ctx.options, opens, previousOpening(ctx.state));
	const plan: Plan = { tribunal: ctx.state.called + 1, opens, calledAt, count, factions, by, ...(reason === undefined || reason.length === 0 ? {} : { reason }), called: false };
	ctx.state.plan = plan;
	// Whether the draft would be held with the residents present now; the call decides.
	const noDraft = draftRule(ctx, plan, present(ctx).length).noDraft;
	ctx.emit("tribunal_scheduled", { tribunal: plan.tribunal, opens, calledAt, count, factions, by, ...(plan.reason === undefined ? {} : { reason: plan.reason }), ...(noDraft === undefined ? {} : { noDraft }) });
	return plan;
}

// The factions of a tribunal's draft with `count` present residents, or why none is held (old `#draftRule`).
function draftRule(ctx: TribunalCtx, plan: Plan, count: number): { readonly factions: number; readonly noDraft?: string } {
	if (ctx.options.factions === undefined) return { factions: 0 };
	const factions = Math.min(plan.factions, maxFactions(count));
	const reason = noDraftReason(count, factions, accusedCount(plan.count, count));
	return reason === undefined ? { factions } : { factions: 0, noDraft: reason };
}

// Calls a planned tribunal: the rules with the first call, then when it opens and how many it exiles (old `#call`).
function call(ctx: TribunalCtx, plan: Plan): void {
	const { state } = ctx;
	const here = present(ctx);
	if (!state.announced) {
		state.announced = true;
		const announcement = text(ctx, "announcement", {});
		post(ctx, announcement);
		for (const agent of here) notify(ctx, agent, announcement);
		ctx.emit("tribunal_announced", { target: target(ctx), residents: residentsCount(ctx) });
	}
	state.called = plan.tribunal;
	state.plan = { ...plan, called: true };
	const { noDraft } = draftRule(ctx, plan, here.length);
	const values = { tribunal: String(plan.tribunal), minute: String(plan.opens), count: String(plan.count), accusedCount: String(accusedCount(plan.count, here.length)) };
	// A city with factions says plainly when there are none this time.
	const calledNoDraft = ctx.options.texts.calledNoDraft;
	const called = noDraft !== undefined && calledNoDraft !== undefined ? render(ctx, calledNoDraft, values) : text(ctx, "called", values);
	post(ctx, called);
	for (const agent of here) notify(ctx, agent, called);
	ctx.emit("tribunal_called", { tribunal: plan.tribunal, opens: plan.opens, count: plan.count, factions: 0, ...(noDraft === undefined ? {} : { noDraft }) });
}

// Old `#open`: the accused are named and every present resident votes.
function open(ctx: TribunalCtx, plan: Plan, minute: number): void {
	const { state, options: spec } = ctx;
	const here = present(ctx);
	// The last tribunal that fits takes everything still missing, also what a ransom since its planning added.
	const final = !roomAfter(spec, minute, endOfAct(ctx));
	const left = missing(ctx);
	if (left === 0) {
		// A seal struck the last resident still missing since the call (v09): nothing is left to exile.
		ctx.emit("tribunal_cancelled", { tribunal: plan.tribunal, reason: "the target is reached" });
		return;
	}
	const planned = Math.min(final ? Math.max(plan.count, left) : plan.count, left);
	const accused = lowestFirst(ctx, minute, here).slice(0, accusedCount(planned, here.length));
	if (accused.length === 0) {
		// Fewer than three residents present: no tribunal can be held, and the city stops calling them.
		ctx.emit("tribunal_cancelled", { tribunal: plan.tribunal, reason: "too few residents present" });
		state.halted = true;
		return;
	}
	// Every present resident votes, the accused too (never for itself, v08).
	const voters = [...here];
	const until = minute + spec.voteMinutes;
	const count = Math.min(planned, accused.length);
	state.sessions.push({ tribunal: plan.tribunal, minute, accused, voters, until, count, votes: [], closed: false });
	const values = { tribunal: String(plan.tribunal), minute: String(minute), accused: namesOf([...accused].sort()), until: String(until), count: String(count) };
	post(ctx, text(ctx, "opened", values));
	for (const agent of voters) notify(ctx, agent, text(ctx, accused.includes(agent) ? "accusedNotice" : "voteCall", values));
	ctx.emit("tribunal_opened", { tribunal: plan.tribunal, accused: [...accused], voters: [...voters], until, count });
}
