/**
 * What the tribunal reads and does in the city (old `TribunalPorts`, world.ts): the register, the
 * points, the board and notices, the act's bounds and the texts with the rule values. The gates and
 * the exiled are the exile's (`ExileApi`). The functions that only read take `Reads`, which a
 * mechanic context and the facts' view both give, so the facts compute what the API answers.
 */
import type { ApiInput, ApiOutput, DecisionsView, QueryMethodName, ShapeOf } from "@swarmtales/contracts";
import { ChannelsApi, ExileApi, LedgerApi, ProgressionApi } from "@swarmtales/mechanic-shared";
import type { tribunalHead, TribunalCtx } from "./head.ts";
import { actEnd, exileTarget, tribunalHeld, tribunalRuleValues } from "./rules.ts";
import type { TribunalSpec, TribunalTextKey } from "./spec.ts";
import type { TribunalState } from "./state.ts";
import { renderTemplate } from "./template.ts";

export const CITY = "CITY";

type Required = ShapeOf<typeof tribunalHead>["requires"][number];

/** What the read-only functions need: the state, the options, the run's minutes, the residents and the queries of the required APIs. */
export interface Reads {
	readonly state: Readonly<TribunalState>;
	readonly options: TribunalSpec;
	readonly minutes: number;
	readonly residents: { readonly ids: readonly string[] };
	/** The decision gate: a verdict still open there keeps the tribunal busy. */
	readonly decisions: DecisionsView;
	call<A extends Required, K extends QueryMethodName<A>>(api: A, method: K, input: ApiInput<A, K>): ApiOutput<A, K>;
}

/** Who left through the gate or by the seal, in order (old `#exiled`). */
export function exiledList(ctx: Reads): readonly string[] {
	return ctx.call(ExileApi, "exiled", {});
}

export function gateCount(ctx: Reads): number {
	return ctx.call(ExileApi, "gates", {}).length;
}

/** The register: residents not exiled by the gate or the seal (old `ids.filter(!#exiled)`). */
export function register(ctx: Reads): readonly string[] {
	const exiled = exiledList(ctx);
	return ctx.residents.ids.filter((agent) => !exiled.includes(agent));
}

/** Residents at the start of the act; the register until the act begins (old `residents`). */
export function residentsCount(ctx: Reads): number {
	return ctx.state.residents ?? register(ctx).length;
}

export function survivors(ctx: Reads): number {
	return ctx.call(ProgressionApi, "bounds", {}).survivors;
}

export function target(ctx: Reads): number {
	return exileTarget(ctx.options, residentsCount(ctx));
}

/** Residents still to exile: the target less the exiled and those at the gate (old `missing`). */
export function missing(ctx: Reads): number {
	return Math.max(0, target(ctx) - exiledList(ctx).length - gateCount(ctx));
}

/** Old `active`: a city too small for a tribunal never hears of it. */
export function active(ctx: Reads): boolean {
	return tribunalHeld(ctx.options, residentsCount(ctx), survivors(ctx));
}

/** Old `actEnd`. */
export function endOfAct(ctx: Reads): number {
	return ctx.state.actStart === undefined ? ctx.minutes : actEnd(ctx.options, ctx.state.actStart, ctx.minutes);
}

/** The level the tribunal's act starts at (`act`, else the run's first level). */
export function actLevel(ctx: Reads): number {
	return ctx.options.act ?? ctx.call(ProgressionApi, "bounds", {}).startLevel;
}

export function isAlive(ctx: Reads, agent: string): boolean {
	return ctx.call(ExileApi, "standing", { resident: agent }).kind === "alive";
}

/** Alive and not at the gate: who can be accused and who votes (old `#present`). */
export function present(ctx: Reads): readonly string[] {
	return ctx.residents.ids.filter((agent) => isAlive(ctx, agent));
}

export function points(ctx: Reads, agent: string): number {
	return ctx.call(LedgerApi, "balance", { account: agent });
}

/** Minute of the last level-up, -1 for none. */
export function lastProgress(ctx: Reads, agent: string): number {
	return ctx.call(ProgressionApi, "lastProgress", { resident: agent }) ?? -1;
}

/** Fewest points first, then the longest without progress, then a seeded order of this tribunal (old `#lowestFirst`). */
export function lowestFirst(ctx: TribunalCtx, minute: number, agents: readonly string[]): string[] {
	const seeded = ctx.rng("tribunal", minute).shuffle([...agents].sort());
	return [...agents].sort((a, b) => points(ctx, a) - points(ctx, b) || lastProgress(ctx, a) - lastProgress(ctx, b) || seeded.indexOf(a) - seeded.indexOf(b));
}

export function post(ctx: TribunalCtx, text: string): void {
	ctx.call(ChannelsApi, "post", { author: CITY, text });
}

export function notify(ctx: TribunalCtx, agent: string, text: string): void {
	ctx.call(ChannelsApi, "notify", { to: agent, author: CITY, text });
}

export function burn(ctx: TribunalCtx, agent: string, amount: number, reason: string): void {
	ctx.call(LedgerApi, "burn", { account: agent, amount, reason });
}

export function grant(ctx: TribunalCtx, agent: string, amount: number, reason: string): void {
	ctx.call(LedgerApi, "mint", { account: agent, amount, reason });
}

/** A template with the rule values every tribunal text may show (old `#render`). */
export function render(ctx: Reads, template: string, values: Readonly<Record<string, string>>): string {
	return renderTemplate(template, { ...tribunalRuleValues(ctx.options, residentsCount(ctx), survivors(ctx)), ...values });
}

/** Old `#text`. */
export function text(ctx: Reads, key: TribunalTextKey, values: Readonly<Record<string, string>>): string {
	return render(ctx, ctx.options.texts[key], values);
}
