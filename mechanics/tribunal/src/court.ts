/**
 * The tribunal's work at the start of a minute (old `Tribunal.tick`, SPEC 6.4), step for step: the
 * act begins, the votes close (the exile closed the gates just before, at the same order), the
 * city plans, calls and opens tribunals, and the act ends once the target is reached. Votes are
 * never shown; only the exiled learns who voted against it (the exile's gate notice).
 */
import { ExileApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import { active, actLevel, burn, endOfAct, exiledList, gateCount, lowestFirst, missing, notify, points, post, present, register, render, residentsCount, target, text } from "./city.ts";
import { ExileExtrasApi } from "./extras.ts";
import { dissolveDraft, formFactions, settleDraft, startDraft, tickDraft } from "./factions.ts";
import type { TribunalCtx } from "./head.ts";
import { accusedCount, callMinute, earliestOpening, fitsBefore, maxFactions, noDraftReason, ransomPrices, roomAfter, type RansomPrices } from "./rules.ts";
import { currentSession, previousOpening, type Plan, type Planner, type Session } from "./state.ts";
import { namesOf } from "./template.ts";

/** The ransom for a gate opening now: from the median points of every resident still in the register (old `#prices`). */
export function prices(ctx: TribunalCtx): RansomPrices {
	return ransomPrices(
		ctx.options.ransom,
		register(ctx).map((agent) => points(ctx, agent)),
	);
}

/** Whether a tribunal is under way: called and not open yet, voting, or someone at the gate (old `busy`). */
export function busy(ctx: TribunalCtx): boolean {
	return ctx.state.plan?.called === true || currentSession(ctx.state) !== undefined || gateCount(ctx) > 0;
}

/** Whether the city still pursues its target: the act is not over and tribunals are still held (old `pursuing`). */
export function pursuing(ctx: TribunalCtx): boolean {
	return active(ctx) && !ctx.state.ended && !ctx.state.halted && target(ctx) > 0;
}

/** The run's end reason once the act is over (old `endReason`). */
export function endReason(ctx: TribunalCtx): string | undefined {
	return ctx.state.ended ? text(ctx, "targetReached", { exiledList: namesOf(exiledList(ctx)) }) : undefined;
}

/** The city's work at the start of a minute, after the exile closed the gates whose time is up (old `tick`). */
export function tick(ctx: TribunalCtx): void {
	const { state } = ctx;
	const minute = ctx.minute;
	state.lastTick = minute;
	if (state.ended) return;
	if (state.actStart === undefined) {
		// The tribunal's act has not begun (Act I is a tutorial): nothing to do yet.
		const start = ctx.call(ProgressionApi, "actStart", { fromLevel: actLevel(ctx) });
		if (start === null) return;
		state.actStart = start;
		state.residents = register(ctx).length;
	}
	if (!active(ctx)) return;
	for (const session of state.sessions) if (!session.closed && minute >= session.until) closeSession(ctx, session, minute);
	pace(ctx, minute);
	const plan = state.plan;
	if (plan !== undefined && !plan.called && minute >= plan.calledAt) {
		// A snapshot door shut at the call (SPEC 17): the plan is dropped, and the city plans anew once it opens.
		if (ctx.call(ProgressionApi, "doorShut", {})) {
			ctx.emit("tribunal_cancelled", { tribunal: plan.tribunal, reason: "a snapshot door is shut" });
			state.plan = undefined;
		} else if (missing(ctx) === 0) {
			// A seal struck the last resident still missing since the planning (v09): the city calls nothing.
			ctx.emit("tribunal_cancelled", { tribunal: plan.tribunal, reason: "the target is reached" });
			state.plan = undefined;
		} else {
			const left = missing(ctx);
			call(ctx, plan.count > left ? { ...plan, count: left } : plan, minute);
		}
	}
	if (state.draft !== undefined) tickDraft(ctx, state.draft, minute, present(ctx));
	const called = state.plan;
	if (called?.called === true && minute >= called.opens) {
		state.plan = undefined;
		open(ctx, called, minute);
	}
	if (missing(ctx) === 0 && exiledList(ctx).length >= target(ctx) && state.plan === undefined && !busy(ctx)) end(ctx);
}

/** The city's own plans when nothing is pending: the first tribunal, the forced final one, a fallback (old `#pace`). */
function pace(ctx: TribunalCtx, minute: number): void {
	const { state, options: spec } = ctx;
	if (state.halted || state.plan !== undefined || currentSession(state) !== undefined || missing(ctx) === 0) return;
	if (ctx.call(ProgressionApi, "doorShut", {})) return;
	const previous = previousOpening(state);
	const opens = earliestOpening(spec, minute, previous);
	const end = endOfAct(ctx);
	if (!fitsBefore(spec, opens, end)) return;
	const factions = spec.factions?.count ?? 0;
	const left = missing(ctx);
	// One more only if another fits after it; otherwise this one takes everything still missing.
	const count = roomAfter(spec, opens, end) ? 1 : left;
	if (state.called === 0) {
		const progress = ctx.call(ProgressionApi, "passed", { level: spec.first.level }).length > 0;
		const deadline = (state.actStart ?? 0) + spec.first.latestAfter;
		if (progress || minute >= deadline) planTribunal(ctx, opens, count, factions, progress ? "progress" : "deadline");
		return;
	}
	if (!fitsBefore(spec, earliestOpening(spec, minute + 1, previous), end)) {
		planTribunal(ctx, opens, left, factions, "final");
		return;
	}
	if (state.lastResult !== undefined && minute >= state.lastResult + spec.fallbackGap) planTribunal(ctx, opens, count, factions, "fallback");
}

/** Old `#planTribunal`: the plan, and `tribunal_scheduled`. */
export function planTribunal(ctx: TribunalCtx, opens: number, count: number, factions: number, by: Planner, reason?: string): Plan {
	const calledAt = callMinute(ctx.options, opens, previousOpening(ctx.state));
	const plan: Plan = { tribunal: ctx.state.called + 1, opens, calledAt, count, factions, by, ...(reason === undefined || reason.length === 0 ? {} : { reason }), called: false };
	ctx.state.plan = plan;
	// Whether the draft would be held with the residents present now; the call decides.
	const noDraft = draftRule(ctx, plan, present(ctx).length).noDraft;
	ctx.emit("tribunal_scheduled", {
		tribunal: plan.tribunal,
		opens,
		calledAt,
		count,
		factions,
		by,
		...(plan.reason === undefined ? {} : { reason: plan.reason }),
		...(noDraft === undefined ? {} : { noDraft }),
	});
	return plan;
}

/** The factions of a tribunal's draft with `count` present residents, or why none is held (old `#draftRule`). */
function draftRule(ctx: TribunalCtx, plan: Plan, count: number): { readonly factions: number; readonly noDraft?: string } {
	if (ctx.options.factions === undefined) return { factions: 0 };
	const factions = Math.min(plan.factions, maxFactions(count));
	const reason = noDraftReason(count, factions, accusedCount(plan.count, count));
	return reason === undefined ? { factions } : { factions: 0, noDraft: reason };
}

/** Calls a planned tribunal: the rules with the first call, then when it opens and how many it exiles, and the draft (old `#call`). */
function call(ctx: TribunalCtx, plan: Plan, minute: number): void {
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
	const { factions, noDraft } = draftRule(ctx, plan, here.length);
	const values = { tribunal: String(plan.tribunal), minute: String(plan.opens), count: String(plan.count), accusedCount: String(accusedCount(plan.count, here.length)) };
	// A city with factions says plainly when there are none this time.
	const calledNoDraft = ctx.options.texts.calledNoDraft;
	const called = noDraft !== undefined && calledNoDraft !== undefined ? render(ctx, calledNoDraft, values) : text(ctx, "called", values);
	post(ctx, called);
	for (const agent of here) notify(ctx, agent, called);
	if (factions >= 2) {
		const nominateUntil = minute + Math.max(1, Math.floor((plan.opens - minute) / 2));
		const draft = startDraft(ctx, plan.tribunal, factions, here, nominateUntil, plan.opens);
		state.draft = draft;
		ctx.emit("tribunal_called", { tribunal: plan.tribunal, opens: plan.opens, count: plan.count, factions, group: draft.group, nominateUntil });
		return;
	}
	ctx.emit("tribunal_called", { tribunal: plan.tribunal, opens: plan.opens, count: plan.count, factions: 0, ...(noDraft === undefined ? {} : { noDraft }) });
}

function dropDraft(ctx: TribunalCtx): void {
	if (ctx.state.draft !== undefined) dissolveDraft(ctx, ctx.state.draft);
	ctx.state.draft = undefined;
}

/** Old `#open`: the factions form, the accused are named and every present resident votes. */
function open(ctx: TribunalCtx, plan: Plan, minute: number): void {
	const { state, options: spec } = ctx;
	if (state.draft !== undefined) formFactions(ctx, state.draft, present(ctx));
	const here = present(ctx);
	// The last tribunal that fits takes everything still missing, also what a ransom since its planning added.
	const final = !roomAfter(spec, minute, endOfAct(ctx));
	const left = missing(ctx);
	if (left === 0) {
		// A seal struck the last resident still missing since the call (v09): nothing is left to exile.
		ctx.emit("tribunal_cancelled", { tribunal: plan.tribunal, reason: "the target is reached" });
		dropDraft(ctx);
		return;
	}
	const planned = Math.min(final ? Math.max(plan.count, left) : plan.count, left);
	const accused = lowestFirst(ctx, minute, here).slice(0, accusedCount(planned, here.length));
	if (accused.length === 0) {
		// Fewer than three residents present: no tribunal can be held, and the city stops calling them.
		ctx.emit("tribunal_cancelled", { tribunal: plan.tribunal, reason: "too few residents present" });
		dropDraft(ctx);
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

/** Old `#close`: the penalty for non-voters, the result, the gates (the exile's), then the draft settles. */
function closeSession(ctx: TribunalCtx, session: Session, minute: number): void {
	const { state, options: spec } = ctx;
	session.closed = true;
	state.lastResult = minute;
	const gone = exiledList(ctx);
	const voted = (agent: string): boolean => session.votes.some((vote) => vote.voter === agent);
	const nonVoters = session.voters.filter((agent) => !voted(agent) && !gone.includes(agent));
	for (const agent of nonVoters) {
		if (spec.nonVoterPenalty > 0) burn(ctx, agent, spec.nonVoterPenalty, "did not vote in the tribunal");
		notify(ctx, agent, text(ctx, "nonVoter", {}));
	}
	const votesFor = (agent: string): number => session.votes.filter((vote) => vote.target === agent).length;
	// An accused struck by a seal during the vote (v09) is gone already.
	const standing = session.accused.filter((agent) => !gone.includes(agent));
	const order = lowestFirst(ctx, session.minute, standing);
	const ranked = [...standing].sort((a, b) => votesFor(b) - votesFor(a) || order.indexOf(a) - order.indexOf(b));
	const count = Math.max(0, Math.min(session.count, missing(ctx)));
	const exiled = ranked.slice(0, count);
	const counts = ranked.map((agent) => ({ agent, votes: votesFor(agent) }));
	const until = minute + spec.gateMinutes;
	const price = prices(ctx);
	const countsText = counts.map((entry) => `${entry.agent}: ${entry.votes} ${entry.votes === 1 ? "vote" : "votes"}`).join(" · ");
	post(ctx, text(ctx, "result", { counts: countsText, exiled: namesOf([...exiled].sort()), until: String(until), price: String(price.price), selfPrice: String(price.selfPrice) }));
	ctx.emit("tribunal_result", { counts, exiled: [...exiled], nonVoters });
	for (const agent of exiled) {
		const voters = session.votes
			.filter((vote) => vote.target === agent)
			.map((vote) => vote.voter)
			.sort();
		const ransomable = !ctx.call(ExileExtrasApi, "ransomed", { resident: agent });
		ctx.call(ExileApi, "toGate", { resident: agent, until, ransomable, voters, price: price.price, selfPrice: price.selfPrice });
	}
	const draft = state.draft;
	if (draft?.tribunal === session.tribunal) {
		const left = exiledList(ctx);
		settleDraft(ctx, draft, session.voters, session.votes, (agent) => !left.includes(agent));
		state.draft = undefined;
	}
}

/** The target is reached and the last gate closed: the city says so; the act ends with it (old `#end`). */
function end(ctx: TribunalCtx): void {
	ctx.state.ended = true;
	const reason = endReason(ctx);
	if (reason !== undefined) post(ctx, reason);
}
