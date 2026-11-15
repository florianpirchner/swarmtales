// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Who an action reaches and the text it says (old `Director#forEachTarget`, `#personal` and `#render`), carried from
 * `legacy` `mechanics/script/src/actions.ts`: the skip reasons are the old words.
 */
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import type { Occasion } from "./actions.ts";
import { need, type ScriptCtx } from "./head.ts";
import { alive, isExiled, levelOf } from "./reads.ts";
import type { NoticeTarget } from "./rules.ts";
import { placeholdersOf, renderTemplate } from "./template.ts";

function agentsOf(ctx: ScriptCtx, target: NoticeTarget, occasion: Occasion, reasons: string[]): readonly string[] {
	if (target === "all") return alive(ctx);
	if (target === "actor") return occasion.actor === undefined || isExiled(ctx, occasion.actor) ? [] : [occasion.actor];
	if ("onLevel" in target) return alive(ctx).filter((agent) => levelOf(ctx, agent) === target.onLevel);
	const unknown = target.filter((agent) => !ctx.residents.has(agent));
	if (unknown.length > 0) reasons.push(`unknown competitors ${unknown.join(", ")}`);
	return target.filter((agent) => ctx.residents.has(agent) && !isExiled(ctx, agent));
}

/**
 * Runs `apply` for every resident the target resolves to (old `#forEachTarget`).
 *
 * @param ctx - The script's context.
 * @param target - Who the action reaches.
 * @param occasion - Who and what the firing is about.
 * @param apply - What to do for one resident; it answers why it failed, or undefined.
 * @returns Why the action (or part of it) was skipped: unknown ids in a list, a target that reaches nobody, or the
 * failures `apply` reports; undefined when nothing was skipped.
 */
export function forEachTarget(ctx: ScriptCtx, target: NoticeTarget, occasion: Occasion, apply: (agent: string) => string | undefined): string | undefined {
	const reasons: string[] = [];
	const agents = agentsOf(ctx, target, occasion, reasons);
	if (agents.length === 0) return [...reasons, "no competitor to target"].join("; ");
	for (const agent of agents) {
		const failed = apply(agent);
		if (failed !== undefined) reasons.push(failed);
	}
	return reasons.length === 0 ? undefined : reasons.join(", ");
}

/**
 * A private text addresses its recipient: `{actor}` falls back to them (old `#personal`).
 *
 * @param occasion - The firing.
 * @param recipient - The resident the text goes to.
 * @returns The occasion with an actor.
 */
export function personal(occasion: Occasion, recipient: string): Occasion {
	return occasion.actor === undefined ? { ...occasion, actor: recipient } : occasion;
}

const optional = (value: number | string | undefined): string => (value === undefined ? "" : String(value));

/**
 * Renders a text of a rule (old `#render`); each value is read only when the text names it.
 *
 * @param ctx - The script's context.
 * @param text - The template.
 * @param occasion - Who and what the firing is about.
 * @returns The text.
 * @throws RangeError for an unknown placeholder, or a value whose mechanic is not loaded.
 */
export function render(ctx: ScriptCtx, text: string, occasion: Occasion): string {
	const named = new Set(placeholdersOf(text));
	const value = (name: string, read: () => string): Readonly<Record<string, string>> => (named.has(name) ? { [name]: read() } : {});
	const level = (): string => optional(occasion.level ?? (occasion.actor === undefined ? undefined : levelOf(ctx, occasion.actor)));
	return renderTemplate(text, {
		...value("actor", () => occasion.actor ?? ""),
		...value("other", () => occasion.other ?? ""),
		...value("minute", () => String(ctx.tick)),
		...value("level", level),
		...value("survivors", () => String(need(ctx, ProgressionService, "bounds", {}).survivors)),
		...value("agents", () => String(ctx.residents.ids.length)),
		...value("otherLevel", () => optional(occasion.otherLevel)),
		...value("piece", () => occasion.piece ?? ""),
		...value("seats", () => optional(occasion.seats)),
	});
}
