/**
 * The goal book (old `GoalBook` of packages/engine/src/goals.ts): dealing at the start of an act,
 * the status part, the void goal of an exiled resident and the resolution at the act's end.
 */
import { ExileApi, LedgerApi, ChannelsApi } from "@swarmtales/mechanic-shared";
import { CoresExtrasApi } from "./cores-extras.ts";
import { dealGoals } from "./deal.ts";
import type { GoalsCtx } from "./head.ts";
import type { ActGoals, Goal } from "./model.ts";
import { renderTemplate } from "./template.ts";

const CITY = "CITY";

export interface HeldGoal {
	readonly act: number;
	readonly goal: Goal;
	/** The goal as the resident reads it. */
	readonly text: string;
}

/** The goal in the story's words. */
export function textOf(ctx: GoalsCtx, goal: Goal): string {
	const texts = ctx.options.texts;
	switch (goal.kind) {
		case "protect":
		case "exile":
		case "outrank":
			return renderTemplate(texts[goal.kind], { target: goal.target });
		case "lead":
			return renderTemplate(texts.lead, { count: String(goal.count) });
		case "heir":
			return texts.heir;
	}
}

/** Deals the act's goals to `residents` (once per act), privately. */
export function deal(ctx: GoalsCtx, act: number, residents: readonly string[]): void {
	if (!ctx.options.acts.includes(act) || ctx.state.acts.has(act)) return;
	const dealt = dealGoals(ctx.options, residents, {
		rng: ctx.rng("goals", act),
		factions: ctx.options.factions,
		drives: (agent) => ctx.tryCall(CoresExtrasApi, "drivesOf", { resident: agent }) ?? null,
	});
	ctx.state.acts.set(act, { goals: new Map(dealt), resolved: false, leads: new Map(), heirs: new Set(), voided: new Set() });
	const bonus = String(ctx.options.bonus);
	for (const [agent, goal] of dealt) {
		const text = textOf(ctx, goal);
		ctx.emit("goal_dealt", { act, agent, goal, text });
		ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text: renderTemplate(ctx.options.texts.notice, { goal: text, bonus }) });
	}
}

/** The goal `agent` holds in an act that is still running, if any. */
export function goalOf(ctx: GoalsCtx, agent: string): HeldGoal | undefined {
	for (const [act, state] of ctx.state.acts) {
		const goal = state.goals.get(agent);
		if (state.resolved || goal === undefined || state.voided.has(agent)) continue;
		return { act, goal, text: textOf(ctx, goal) };
	}
	return undefined;
}

/** The status line part for `agent`, while its act runs. */
export function statusOf(ctx: GoalsCtx, agent: string): string | undefined {
	const held = goalOf(ctx, agent);
	return held === undefined ? undefined : renderTemplate(ctx.options.texts.status, { goal: held.text, bonus: String(ctx.options.bonus) });
}

/** Faction leaders of a tribunal: one more leadership each in every running act. */
export function noteLeaders(ctx: GoalsCtx, leaders: readonly string[]): void {
	for (const state of ctx.state.acts.values()) {
		if (state.resolved) continue;
		for (const leader of leaders) state.leads.set(leader, (state.leads.get(leader) ?? 0) + 1);
	}
}

/** A last will left `heir` points or a piece. */
export function noteHeir(ctx: GoalsCtx, heir: string): void {
	for (const state of ctx.state.acts.values()) if (!state.resolved) state.heirs.add(heir);
}

/** An exiled resident's goal is void; the city reads it out as the resident leaves. */
export function onExiled(ctx: GoalsCtx, agent: string): void {
	for (const [act, state] of ctx.state.acts) {
		const goal = state.goals.get(agent);
		if (state.resolved || goal === undefined || state.voided.has(agent)) continue;
		state.voided.add(agent);
		ctx.emit("goal_resolved", { act, agent, goal, fulfilled: false, void: true, bonus: 0 });
		ctx.call(ChannelsApi, "post", { author: CITY, text: renderTemplate(ctx.options.texts.exiledReadout, { resident: agent, goal: textOf(ctx, goal) }) });
	}
}

function isExiled(ctx: GoalsCtx, agent: string): boolean {
	return ctx.tryCall(ExileApi, "isExiled", { resident: agent }) === true;
}

function fulfilled(ctx: GoalsCtx, state: ActGoals, agent: string, goal: Goal): boolean {
	switch (goal.kind) {
		case "protect":
			return !isExiled(ctx, goal.target);
		case "exile":
			return isExiled(ctx, goal.target);
		case "outrank":
			return ctx.call(LedgerApi, "balance", { account: agent }) > ctx.call(LedgerApi, "balance", { account: goal.target });
		case "lead":
			return (state.leads.get(agent) ?? 0) >= goal.count;
		case "heir":
			return state.heirs.has(agent);
	}
}

/** The act's end: every goal still held is checked and paid, privately told, and all are read out on the board. */
export function resolve(ctx: GoalsCtx, act: number): void {
	const state = ctx.state.acts.get(act);
	if (state === undefined || state.resolved) return;
	state.resolved = true;
	const { texts, bonus: pay } = ctx.options;
	const lines: string[] = [];
	for (const [agent, goal] of state.goals) {
		const text = textOf(ctx, goal);
		if (state.voided.has(agent)) {
			lines.push(`${agent}: ${text} (void)`);
			continue;
		}
		const met = fulfilled(ctx, state, agent, goal);
		const bonus = met ? pay : 0;
		if (bonus > 0) ctx.call(LedgerApi, "mint", { account: agent, amount: bonus, reason: "secret goal fulfilled" });
		ctx.emit("goal_resolved", { act, agent, goal, fulfilled: met, bonus });
		ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text: renderTemplate(met ? texts.fulfilled : texts.missed, { goal: text, bonus: String(pay) }) });
		lines.push(`${agent}: ${text} (${met ? "fulfilled" : "missed"})`);
	}
	if (lines.length > 0) ctx.call(ChannelsApi, "post", { author: CITY, text: renderTemplate(texts.readout, { list: lines.join("; ") }) });
}
