// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the tribunal reads and does in the city, carried from the old `city.ts` (old `TribunalPorts`, world.ts) over the
 * services of the new platform: the register and the gates (`exile`), the points (`ledger`), the board and the notices
 * (`channels`), the act's bounds (`progression`) and the texts with the rule values.
 */
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { ExileService } from "@swarmtales/mechanic-exile/contract";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { ProgressionService } from "@swarmtales/mechanic-progression/contract";
import type { Reads, TribunalCtx } from "./head.ts";
import { actEnd, exileTarget, tribunalHeld, tribunalRuleValues } from "./pacing.ts";
import type { TribunalTextKey } from "./spec.ts";
import { renderTemplate } from "./template.ts";

const CITY = "CITY";

/**
 * Who left through the gate or by the seal, in order (old `#exiled`).
 *
 * @param ctx - The context.
 * @returns The residents.
 */
export function exiledList(ctx: Reads): readonly string[] {
	return ctx.call(ExileService, "exiled", {});
}

/**
 * The open gates' number.
 *
 * @param ctx - The context.
 * @returns How many stand at the gate.
 */
export function gateCount(ctx: Reads): number {
	return ctx.call(ExileService, "gates", {}).length;
}

/**
 * The register: residents not exiled by the gate or the seal (old `ids.filter(!#exiled)`).
 *
 * @param ctx - The context.
 * @returns The residents in roster order.
 */
export function register(ctx: Reads): readonly string[] {
	const exiled = exiledList(ctx);
	return ctx.residents.ids.filter((agent) => !exiled.includes(agent));
}

/**
 * Residents at the start of the act; the register until the act begins (old `residents`).
 *
 * @param ctx - The context.
 * @returns The number.
 */
export function residentsCount(ctx: Reads): number {
	return ctx.state.residents ?? register(ctx).length;
}

function survivors(ctx: Reads): number {
	return ctx.call(ProgressionService, "bounds", {}).survivors;
}

/**
 * Residents the tribunals exile in all.
 *
 * @param ctx - The context.
 * @returns The target.
 */
export function target(ctx: Reads): number {
	return exileTarget(ctx.options, residentsCount(ctx));
}

/**
 * Residents still to exile: the target less the exiled and those at the gate (old `missing`).
 *
 * @param ctx - The context.
 * @returns The number, at least 0.
 */
export function missing(ctx: Reads): number {
	return Math.max(0, target(ctx) - exiledList(ctx).length - gateCount(ctx));
}

/**
 * Old `active`: a city too small for a tribunal never hears of it.
 *
 * @param ctx - The context.
 * @returns True when the city holds tribunals.
 */
export function active(ctx: Reads): boolean {
	return tribunalHeld(ctx.options, residentsCount(ctx), survivors(ctx));
}

/**
 * Old `actEnd`: the tick the tribunal's act ends (exclusive).
 *
 * @param ctx - The context.
 * @returns The tick.
 */
export function endOfAct(ctx: Reads): number {
	return ctx.state.actStart === undefined ? ctx.ticks : actEnd(ctx.options, ctx.state.actStart, ctx.ticks);
}

/**
 * The level the tribunal's act starts at (`act`, else the run's first level).
 *
 * @param ctx - The context.
 * @returns The level.
 */
export function actLevel(ctx: TribunalCtx): number {
	return ctx.options.act ?? ctx.call(ProgressionService, "bounds", {}).startLevel;
}

/**
 * Whether the resident is in the city and not at the gate.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @returns True when alive.
 */
export function isAlive(ctx: Reads, agent: string): boolean {
	return ctx.call(ExileService, "standing", { resident: agent }).kind === "alive";
}

/**
 * Alive and not at the gate: who can be accused and who votes (old `#present`).
 *
 * @param ctx - The context.
 * @returns The residents in roster order.
 */
export function present(ctx: Reads): readonly string[] {
	return ctx.residents.ids.filter((agent) => isAlive(ctx, agent));
}

/**
 * The resident's points.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @returns Its balance.
 */
export function points(ctx: Reads, agent: string): number {
	return ctx.call(LedgerService, "balance", { account: agent });
}

/**
 * Fewest points first, then the longest without progress, then a seeded order of this tribunal (old `#lowestFirst`).
 *
 * @param ctx - The context.
 * @param minute - The tick the tribunal opens.
 * @param agents - The residents.
 * @returns The residents, lowest first.
 */
export function lowestFirst(ctx: TribunalCtx, minute: number, agents: readonly string[]): string[] {
	const seeded = ctx.rng("tribunal", minute).shuffle([...agents].sort());
	const progress = (agent: string): number => ctx.call(ProgressionService, "lastProgress", { resident: agent });
	return [...agents].sort((a, b) => points(ctx, a) - points(ctx, b) || progress(a) - progress(b) || seeded.indexOf(a) - seeded.indexOf(b));
}

/**
 * A post of the city on the board.
 *
 * @param ctx - The context.
 * @param text - The text.
 */
export function post(ctx: TribunalCtx, text: string): void {
	ctx.call(ChannelsService, "post", { author: CITY, text });
}

/**
 * A notice of the city to one resident.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @param text - The text.
 */
export function notify(ctx: TribunalCtx, agent: string, text: string): void {
	ctx.call(ChannelsService, "notify", { to: agent, author: CITY, text });
}

/**
 * Burns points of a resident.
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @param amount - The points.
 * @param reason - Why, for the booking.
 */
export function burn(ctx: TribunalCtx, agent: string, amount: number, reason: string): void {
	ctx.call(LedgerService, "burn", { account: agent, amount, reason });
}

/**
 * Grants points to a resident (the bloc bonus).
 *
 * @param ctx - The context.
 * @param agent - The resident.
 * @param amount - The points.
 * @param reason - Why, for the booking.
 */
export function grant(ctx: TribunalCtx, agent: string, amount: number, reason: string): void {
	ctx.call(LedgerService, "mint", { account: agent, amount, reason });
}

/**
 * A template with the rule values every tribunal text may show (old `#render`).
 *
 * @param ctx - The context.
 * @param template - The text.
 * @param values - The values of this text.
 * @returns The text filled in.
 * @throws SwtError `SWT-G020` when the text names a placeholder that has no value.
 */
export function render(ctx: Reads, template: string, values: Readonly<Record<string, string>>): string {
	return renderTemplate(template, { ...tribunalRuleValues(ctx.options, residentsCount(ctx), survivors(ctx)), ...values });
}

/**
 * One of the city's tribunal texts (old `#text`).
 *
 * @param ctx - The context.
 * @param key - The text.
 * @param values - The values of this text.
 * @returns The text filled in.
 * @throws SwtError `SWT-G020` when the text names a placeholder that has no value.
 */
export function text(ctx: Reads, key: TribunalTextKey, values: Readonly<Record<string, string>>): string {
	return render(ctx, ctx.options.texts[key], values);
}
