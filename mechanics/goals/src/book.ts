// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The goal book, carried from the old `mechanics/goals/src/book.ts` (old `GoalBook`): dealing at the start of an
 * act, the status part, the void goal of an exiled resident, the heirs and leaders, and the resolution at the act's
 * end. The old calls of `exile` (`onExiled`, `noteHeir`) are listeners to its events now.
 */
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { MotivesService } from "@swarmtales/mechanic-motives/contract";
import type { Goal } from "./contract.ts";
import { dealGoals } from "./deal.ts";
import type { GoalsCtx, GoalsView } from "./head.ts";
import type { ActGoals } from "./model.ts";
import { renderTemplate } from "./template.ts";

const CITY = "CITY";

/** What reading a goal needs: a fact's view reads it as a hook's context does. */
type GoalReader = Pick<GoalsView, "options" | "state">;

/**
 * A goal held in a running act.
 *
 * @public
 */
export interface HeldGoal {
	/** The act. */
	readonly act: number;
	/** The goal. */
	readonly goal: Goal;
	/** The goal as the resident reads it. */
	readonly text: string;
}

/**
 * The goal in the game's words.
 *
 * @param ctx - The options.
 * @param goal - The goal.
 * @returns Its text.
 */
export function textOf(ctx: Pick<GoalReader, "options">, goal: Goal): string {
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

function goalIn(entry: ActGoals, agent: string): Goal | undefined {
	return entry.goals.find((held) => held.agent === agent)?.goal;
}

/**
 * Deals the act's goals to `residents` (once per act), privately.
 *
 * @param ctx - The context.
 * @param act - The act's first level.
 * @param residents - The residents still in the city.
 */
export function deal(ctx: GoalsCtx, act: number, residents: readonly string[]): void {
	if (!ctx.options.acts.includes(act) || ctx.state.acts.some((entry) => entry.act === act)) return;
	const dealt = dealGoals(ctx.options, residents, {
		rng: ctx.rng("goals", act),
		factions: ctx.options.factions,
		drives: (agent) => ctx.tryCall(MotivesService, "drivesOf", { resident: agent }) ?? null,
	});
	ctx.state.acts.push({ act, goals: [...dealt].map(([agent, goal]) => ({ agent, goal })), resolved: false, leads: [], heirs: [], voided: [] });
	const bonus = String(ctx.options.bonus);
	for (const [agent, goal] of dealt) {
		const text = textOf(ctx, goal);
		ctx.emit("goal_dealt", { act, agent, goal, text });
		ctx.call(ChannelsService, "notify", { to: agent, author: CITY, text: renderTemplate(ctx.options.texts.notice, { goal: text, bonus }) });
	}
}

/**
 * The goal `agent` holds in an act that is still running, if any.
 *
 * @param ctx - The options and the state.
 * @param agent - The resident.
 * @returns The goal, or undefined.
 */
export function goalOf(ctx: GoalReader, agent: string): HeldGoal | undefined {
	for (const entry of ctx.state.acts) {
		const goal = goalIn(entry, agent);
		if (entry.resolved || goal === undefined || entry.voided.includes(agent)) continue;
		return { act: entry.act, goal, text: textOf(ctx, goal) };
	}
	return undefined;
}

/**
 * The status line part for `agent`, while its act runs.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @returns The part, or undefined.
 */
export function statusOf(ctx: GoalsCtx, agent: string): string | undefined {
	const held = goalOf(ctx, agent);
	return held === undefined ? undefined : renderTemplate(ctx.options.texts.status, { goal: held.text, bonus: String(ctx.options.bonus) });
}

/**
 * Faction leaders of a tribunal: one more leadership each in every running act.
 *
 * @param ctx - The context.
 * @param leaders - The leaders.
 */
export function noteLeaders(ctx: GoalsCtx, leaders: readonly string[]): void {
	for (const entry of ctx.state.acts) {
		if (entry.resolved) continue;
		for (const agent of leaders) {
			const lead = entry.leads.find((held) => held.agent === agent);
			if (lead === undefined) entry.leads.push({ agent, count: 1 });
			else lead.count += 1;
		}
	}
}

/**
 * A last will left `heir` points or a piece.
 *
 * @param ctx - The context.
 * @param heir - The heir.
 */
export function noteHeir(ctx: GoalsCtx, heir: string): void {
	for (const entry of ctx.state.acts) if (!entry.resolved && !entry.heirs.includes(heir)) entry.heirs.push(heir);
}

/**
 * An exiled resident's goal is void; the city reads it out as the resident leaves.
 *
 * @param ctx - The context.
 * @param agent - The exiled resident.
 */
export function onExiled(ctx: GoalsCtx, agent: string): void {
	for (const entry of ctx.state.acts) {
		const goal = goalIn(entry, agent);
		if (entry.resolved || goal === undefined || entry.voided.includes(agent)) continue;
		entry.voided.push(agent);
		ctx.emit("goal_resolved", { act: entry.act, agent, goal, fulfilled: false, void: true, bonus: 0 });
		ctx.call(ChannelsService, "post", { author: CITY, text: renderTemplate(ctx.options.texts.exiledReadout, { resident: agent, goal: textOf(ctx, goal) }) });
	}
}

function isExiled(ctx: GoalsCtx, agent: string): boolean {
	return ctx.tryCall(ExileService, "isExiled", { resident: agent }) === true;
}

function fulfilled(ctx: GoalsCtx, entry: ActGoals, agent: string, goal: Goal): boolean {
	switch (goal.kind) {
		case "protect":
			return !isExiled(ctx, goal.target);
		case "exile":
			return isExiled(ctx, goal.target);
		case "outrank":
			return ctx.call(LedgerService, "balance", { account: agent }) > ctx.call(LedgerService, "balance", { account: goal.target });
		case "lead":
			return (entry.leads.find((held) => held.agent === agent)?.count ?? 0) >= goal.count;
		case "heir":
			return entry.heirs.includes(agent);
	}
}

/**
 * The act's end: every goal still held is checked and paid, privately told, and all are read out on the board.
 *
 * @param ctx - The context.
 * @param act - The act's first level.
 */
export function resolve(ctx: GoalsCtx, act: number): void {
	const entry = ctx.state.acts.find((each) => each.act === act);
	if (entry === undefined || entry.resolved) return;
	entry.resolved = true;
	const { texts, bonus: pay } = ctx.options;
	const lines: string[] = [];
	for (const { agent, goal } of entry.goals) {
		const text = textOf(ctx, goal);
		if (entry.voided.includes(agent)) {
			lines.push(`${agent}: ${text} (void)`);
			continue;
		}
		const met = fulfilled(ctx, entry, agent, goal);
		const bonus = met ? pay : 0;
		if (bonus > 0) ctx.call(LedgerService, "mint", { account: agent, amount: bonus, reason: "secret goal fulfilled" });
		ctx.emit("goal_resolved", { act, agent, goal, fulfilled: met, bonus });
		ctx.call(ChannelsService, "notify", { to: agent, author: CITY, text: renderTemplate(met ? texts.fulfilled : texts.missed, { goal: text, bonus: String(pay) }) });
		lines.push(`${agent}: ${text} (${met ? "fulfilled" : "missed"})`);
	}
	if (lines.length > 0) ctx.call(ChannelsService, "post", { author: CITY, text: renderTemplate(texts.readout, { list: lines.join("; ") }) });
}
