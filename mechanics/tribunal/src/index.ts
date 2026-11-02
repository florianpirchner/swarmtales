/**
 * The `tribunal` mechanic (carve step 13, team T4a, docs/design/carve-round2-T4.md): exile by
 * tribunal (SPEC 6.4). A port of the old `Tribunal` and `FactionDraft` without the gate, which is
 * the exile's: pacing (the first call, the gamemaker's plans and the city's own), the call, the
 * faction draft, the secret vote, the result with the non-voters' penalty, and the act's end.
 */
import { Type } from "typebox";
import { defineMechanic, refuse, reply } from "@swarmtales/kernel";
import { HOOK_ORDER, ProgressionApi, STATUS_ORDER, TribunalApi, TribunalViewApi } from "@swarmtales/mechanic-shared";
import { actLevel, missing, render } from "./city.ts";
import { commitVerdict, prices, tick } from "./court.ts";
import { tribunalHead, type TribunalCtx } from "./head.ts";
import { atRisk, canVote, cityCall, draftPhase, draftStep, schedule, schedulingWindow, vote } from "./schedule.ts";
import { tribunalSnapshot } from "./slice.ts";
import { currentSession } from "./state.ts";
import { statusPart } from "./status.ts";
import { mayScheduleTribunal, readsOf, SectionFact, sectionOf, StopFact, stopOf } from "./view.ts";

export { tribunalHead } from "./head.ts";
export { TribunalOptions } from "./spec.ts";
export { accusedCount, earliestOpening, exileTarget, factionCap, leadFor, noDraftReason, tribunalHeld } from "./rules.ts";
export { renderTribunalSection, tribunalSectionOf, type TribunalSection } from "./section.ts";

/** The old `enabledTools` for the tribunal's tools: the vote while one is due, the draft's steps by phase. */
function isOpen(ctx: TribunalCtx, tool: string, resident: string): boolean {
	if (tool === "vote") return canVote(ctx, resident);
	const phase = draftPhase(ctx, resident);
	if (tool === "nominate") return phase?.kind === "nominate";
	if (tool === "join") return phase?.kind === "join" && !phase.leads;
	return tool === "refuse" && phase?.kind === "join" && phase.leads;
}

const ScheduleParams = Type.Object({
	minute: Type.Integer({ description: "The run minute the tribunal opens; the report shows the bounds" }),
	count: Type.Integer({ description: "Residents it exiles, from 1 to those still missing", minimum: 1 }),
	factions: Type.Optional(Type.Integer({ description: "Factions formed before it, from 2 to half the residents present", minimum: 2 })),
	reason: Type.String({ description: "Why now and why this many; logged only, never shown to residents", maxLength: 500 }),
});

export const tribunal = defineMechanic(tribunalHead,(kit) => ({
	tools: [
		kit.tool({
			name: "vote",
			description: "tools/vote",
			parameters: Type.Object({ target: Type.String({ description: "One of the accused, by name or ID, e.g. A03" }) }),
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ target }, ctx) => {
				if (ctx.resident === undefined) return refuse("NO_RESIDENT");
				const result = vote(ctx, ctx.resident, target);
				return result.ok ? reply(ctx.prompt("replies/vote-recorded", { target: result.value })) : refuse(result.error, result.detail);
			},
		}),
		kit.tool({
			name: "nominate",
			description: "tools/nominate",
			parameters: Type.Object({ agent: Type.String({ description: "The resident you nominate, by name or ID, e.g. A03" }) }),
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ agent }, ctx) => {
				const self = ctx.resident;
				if (self === undefined) return refuse("NO_RESIDENT");
				const result = draftStep(ctx, "nominate", self, agent);
				if (!result.ok) return refuse(result.error, result.detail);
				const phase = draftPhase(ctx, self);
				const until = phase?.kind === "nominate" ? ` · ${ctx.prompt("replies/nominate-until", { until: phase.until })}` : "";
				return reply(`${ctx.prompt("replies/nominate-recorded", { agent: result.value })}${until}`);
			},
		}),
		kit.tool({
			name: "join",
			description: "tools/join",
			parameters: Type.Object({ leader: Type.String({ description: "A faction leader, by name or ID, e.g. A02" }) }),
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ leader }, ctx) => {
				const self = ctx.resident;
				if (self === undefined) return refuse("NO_RESIDENT");
				const result = draftStep(ctx, "join", self, leader);
				if (!result.ok) return refuse(result.error, result.detail);
				const phase = draftPhase(ctx, self);
				const until = phase?.kind === "join" ? ` ${ctx.prompt("replies/join-until", { until: phase.until })}` : "";
				return reply(`${ctx.prompt("replies/join-applied", { leader: result.value })}${until}`);
			},
		}),
		kit.tool({
			name: "refuse",
			description: "tools/refuse",
			parameters: Type.Object({ agent: Type.String({ description: "An applicant to your faction, by name or ID, e.g. A05" }) }),
			suggest: ["resident"],
			serves: ["resident"],
			execute: ({ agent }, ctx) => {
				const self = ctx.resident;
				if (self === undefined) return refuse("NO_RESIDENT");
				const result = draftStep(ctx, "refuse", self, agent);
				return result.ok ? reply(ctx.prompt("replies/refuse-done", { agent: result.value })) : refuse(result.error, result.detail);
			},
		}),
		kit.tool({
			name: "scheduleTribunal",
			description: "gamemaker/tools/scheduleTribunal",
			parameters: ScheduleParams,
			suggest: ["gamemaker"],
			serves: ["gamemaker"],
			execute: ({ minute, count, factions, reason }, ctx) => {
				const planned = schedule(ctx, minute, count, factions, reason);
				if (!planned.ok) return refuse(planned.error, planned.detail);
				const plan = planned.value;
				const text = ctx.prompt("gamemaker/replies/tribunal-planned", { tribunal: plan.tribunal, calledAt: plan.calledAt, opens: plan.opens, count: plan.count });
				return reply(plan.factions >= 2 ? `${text}, ${ctx.prompt("gamemaker/replies/tribunal-factions", { factions: plan.factions })}` : text);
			},
		}),
	],
	services: [
		kit.provide(TribunalApi, {
			missing: (_input, ctx) => missing(ctx),
			inSession: (_input, ctx) => currentSession(ctx.state) !== undefined,
			ransomPrices: (_input, ctx) => prices(ctx),
			text: ({ key, values }, ctx) => render(ctx, ctx.options.texts[key], values),
			bequestPerHeir: (_input, ctx) => ctx.options.bequestPerHeir,
		}),
		kit.provide(TribunalViewApi, {
			schedulingWindow: (_input, ctx) => schedulingWindow(ctx),
			cityCall: (_input, ctx) => cityCall(ctx) ?? null,
			stop: (_input, ctx) => stopOf(ctx),
			atRisk: (_input, ctx) => {
				const risk = atRisk(ctx);
				return risk === undefined ? null : { ...risk, accused: [...risk.accused] };
			},
		}),
	],
	commits: { verdict: commitVerdict },
	pipeline: {
		lock: (call, ctx) => {
			if (call.owner !== "tribunal") return undefined;
			const locked = refuse("TOOL_LOCKED", ctx.prompt("replies/locked", {}));
			if (call.tool === "scheduleTribunal") return mayScheduleTribunal(ctx) ? undefined : locked;
			if (call.resident === undefined) return undefined;
			return isOpen(ctx, call.tool, call.resident) ? undefined : locked;
		},
	},
	hooks: {
		minuteStarted: [
			/** After the exile's phase at the same order (it loads first): the gates whose time is up are closed. */
			{ order: HOOK_ORDER.minuteStarted.tribunal, run: (ctx) => { tick(ctx); } },
			{
				order: HOOK_ORDER.minuteStarted.tribunalActEnd,
				run: (ctx) => {
					// The tribunal's act is over once its target is reached (v09: goals and seals end with it).
					if (ctx.state.ended) ctx.call(ProgressionApi, "endAct", { fromLevel: actLevel(ctx) });
				},
			},
		],
		turnInputs: {
			order: HOOK_ORDER.turnInputs.status,
			run: (resident, ctx) => {
				const text = statusPart(ctx, resident);
				return text === undefined ? [] : [{ kind: "status", text, order: STATUS_ORDER.tribunal }];
			},
		},
	},
	facts: {
		plan: kit.fact(Type.Union([Type.Object({ tribunal: Type.Integer(), opens: Type.Integer(), calledAt: Type.Integer(), count: Type.Integer(), factions: Type.Integer(), by: Type.String(), called: Type.Boolean() }), Type.Null()]), (view) => {
			const plan = view.state.plan;
			return plan === undefined ? null : { tribunal: plan.tribunal, opens: plan.opens, calledAt: plan.calledAt, count: plan.count, factions: plan.factions, by: plan.by, called: plan.called };
		}),
		session: kit.fact(Type.Union([Type.Object({ tribunal: Type.Integer(), minute: Type.Integer(), accused: Type.Array(Type.String()), voters: Type.Array(Type.String()), until: Type.Integer(), count: Type.Integer() }), Type.Null()]), (view) => {
			const session = currentSession(view.state);
			return session === undefined ? null : { tribunal: session.tribunal, minute: session.minute, accused: [...session.accused], voters: [...session.voters], until: session.until, count: session.count };
		}),
		called: kit.fact(Type.Integer(), (view) => view.state.called),
		ended: kit.fact(Type.Boolean(), (view) => view.state.ended),
		/** What the run's stop rule reads (old arena `#stopReason`); null before the first minute. */
		stop: kit.fact(Type.Union([StopFact, Type.Null()]), (view) => {
			const reads = readsOf(view);
			return reads === undefined ? null : stopOf(reads);
		}),
		/** The data of the gamemaker's tribunal section (old `tribunalLines`); null when no tribunal is held or before the first minute. */
		section: kit.fact(SectionFact, (view) => {
			const reads = readsOf(view);
			return reads === undefined ? null : sectionOf(reads);
		}),
		draft: kit.fact(Type.Union([Type.Object({ group: Type.String(), leaders: Type.Array(Type.String()) }), Type.Null()]), (view) => {
			const draft = view.state.draft;
			return draft === undefined ? null : { group: draft.group, leaders: [...(draft.leaders ?? [])] };
		}),
	},
	snapshot: kit.snapshot(tribunalSnapshot),
}));
