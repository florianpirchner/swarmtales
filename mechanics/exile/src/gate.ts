// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gate, carried from the old `exile` (`gone.ts`, `state.ts`): a caller sends a resident to the gate with its
 * prices and texts, a caller banishes at once, and a gate whose time is up closes: the board is told, `exiled` is
 * written and the resident is suspended. What the resident owned is cleared away by its owners, who listen to
 * `exiled`. Also the readers and the city's voice that the ransom and the will share.
 */
import type { Static } from "typebox";
import type { ToolOutcome } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { refuse } from "@swarmtales/sdk";
import { EXILE_SUSPENSION, ExilePurseService, KEEPING_STRIKE, type BanishResult, type GateView, type ToGate } from "./contract.ts";
import type { ExileCtx, ExileState, ExileToolCtx, GateState } from "./head.ts";

const CITY = "CITY";

/**
 * The open gate of a resident.
 *
 * @param state - The state of `exile`.
 * @param resident - The resident.
 * @returns Its gate, or undefined when it stands at none.
 */
export function gateOf(state: ExileState, resident: string): GateState | undefined {
	return state.gates.find((gate) => gate.resident === resident);
}

/**
 * Whether the resident is banished.
 *
 * @param state - The state of `exile`.
 * @param resident - The resident.
 * @returns True once banished, by anyone.
 */
export function isGone(state: ExileState, resident: string): boolean {
	return state.gone.some((entry) => entry.resident === resident);
}

/**
 * The old register of the exiled (`Tribunal#exiled`): every banished resident but those of a strike that keeps.
 *
 * @param state - The state of `exile`.
 * @returns The residents, in the order they left.
 */
export function registered(state: ExileState): string[] {
	return state.gone.filter((entry) => entry.by !== KEEPING_STRIKE).map((entry) => entry.resident);
}

/**
 * A text as the resident reads it: every id shown by its name (old `display` of `names`).
 *
 * @param ctx - The context of the tool.
 * @param text - The text.
 * @returns The text, as written when no provider of `identity` is loaded.
 */
export function shown(ctx: ExileToolCtx, text: string): string {
	return ctx.tryCall(IdentityService, "display", { text }) ?? text;
}

/**
 * The id that a name or an id stands for (old `resolve` of `names`).
 *
 * @param ctx - The context of the tool.
 * @param text - What the resident wrote where an id goes.
 * @returns The id, or the text unchanged.
 */
export function resolved(ctx: ExileToolCtx, text: string): string {
	return ctx.tryCall(IdentityService, "resolve", { text }) ?? text;
}

/**
 * A refusal with its detail shown as the resident reads it.
 *
 * @param ctx - The context of the tool.
 * @param code - The code.
 * @param detail - The detail with ids.
 * @returns The refusal.
 */
export function refused(ctx: ExileToolCtx, code: string, detail: string): ToolOutcome {
	return refuse(code, shown(ctx, detail));
}

/**
 * The points of an account.
 *
 * @param ctx - The context.
 * @param account - The account.
 * @returns Its points; 0 when no keeper of the points is loaded.
 */
export function balanceOf(ctx: ExileCtx, account: string): number {
	return ctx.tryCall(ExilePurseService, "balance", { account }) ?? 0;
}

/**
 * "A04", "A04 and A05", "A02, A04 and A05"; `nobody` for none (old `namesOf`).
 *
 * @param ids - The ids.
 * @returns The list in words.
 */
export function namesOf(ids: readonly string[]): string {
	if (ids.length === 0) return "nobody";
	const last = ids.at(-1) ?? "";
	return ids.length === 1 ? last : `${ids.slice(0, -1).join(", ")} and ${last}`;
}

/**
 * One of the caller's texts of a gate with the three placeholders of the exile filled; any other brace stays.
 *
 * @param template - The text.
 * @param values - The resident, the payers and the will's text.
 * @returns The text to post.
 */
export function filled(template: string, values: Readonly<Partial<Record<"exiled" | "payers" | "will", string>>>): string {
	return template.replace(/\{(exiled|payers|will)\}/g, (match, name: "exiled" | "payers" | "will") => values[name] ?? match);
}

/**
 * A post of the city on the board; nothing without `channels`.
 *
 * @param ctx - The context.
 * @param text - The text.
 */
export function post(ctx: ExileCtx, text: string): void {
	ctx.tryCall(ChannelsService, "post", { author: CITY, text });
}

/**
 * A private notice of the city to a resident; nothing without `channels`.
 *
 * @param ctx - The context.
 * @param to - The resident.
 * @param text - The text.
 */
export function notify(ctx: ExileCtx, to: string, text: string): void {
	ctx.tryCall(ChannelsService, "notify", { to, author: CITY, text });
}

/**
 * What is left of a ransom, in units of `price * selfPrice`: each point of others covers `selfPrice` units, each
 * own point `price` units (old `ransomRest`).
 *
 * @param gate - The gate.
 * @returns The units left; 0 or less when paid in full.
 */
export function ransomRest(gate: GateState): number {
	const covered = gate.payments.reduce((sum, payment) => sum + payment.amount * (payment.payer === gate.resident ? gate.price : gate.selfPrice), 0);
	return gate.price * gate.selfPrice - covered;
}

/**
 * The share of the ransom covered (old `coveredPercent`).
 *
 * @param gate - The gate.
 * @returns Percent, at most 100, rounded down.
 */
export function coveredPercent(gate: GateState): number {
	const whole = gate.price * gate.selfPrice;
	return Math.min(100, Math.floor((100 * (whole - ransomRest(gate))) / whole));
}

/**
 * Every open gate as a caller sees it (old `Tribunal.gates()`).
 *
 * @param state - The state of `exile`.
 * @returns The gates, in the order opened.
 */
export function gateViews(state: ExileState): Static<typeof GateView>[] {
	return state.gates.map((gate) => ({
		agent: gate.resident,
		since: gate.since,
		until: gate.until,
		ransomable: gate.ransomable,
		price: gate.price,
		selfPrice: gate.selfPrice,
		paid: gate.payments.reduce((sum, payment) => sum + payment.amount, 0),
		covered: coveredPercent(gate),
		willDone: gate.will !== undefined,
	}));
}

/**
 * `exile.toGate` (old `Tribunal#close`, the gate part): the gate set, the resident notified, then `exile_gate`.
 *
 * @param ctx - The context of the service.
 * @param input - The gate as the caller sets it.
 * @param caller - The id of the calling plugin, the `by` of the exile when the input names none.
 */
export function toGate(ctx: ExileCtx, input: Static<typeof ToGate>, caller: string): void {
	const { resident, until, ransomable, voters, price, selfPrice, bequestPerHeir, texts, notice } = input;
	const gate: GateState = { resident, since: ctx.tick, until, ransomable, voters: [...voters], price, selfPrice, bequestPerHeir, texts: { ...texts }, by: input.by ?? caller, payments: [] };
	const at = ctx.state.gates.findIndex((entry) => entry.resident === resident);
	ctx.state.gates.splice(at < 0 ? ctx.state.gates.length : at, at < 0 ? 0 : 1, gate);
	notify(ctx, resident, notice);
	ctx.emit("exile_gate", { agent: resident, until, ransomable, voters: [...voters], price, selfPrice });
}

// The resident leaves: from the gate, into the list of the banished with what its will bequeathed.
function leave(ctx: ExileCtx, resident: string, by: string): void {
	const gate = gateOf(ctx.state, resident);
	if (gate !== undefined) ctx.state.gates.splice(ctx.state.gates.indexOf(gate), 1);
	ctx.state.gone.push({ resident, by, tick: ctx.tick, bequeathed: [...(gate?.will?.factors ?? [])] });
}

/**
 * `exile.banish`: at once, also from the gate, whose will stands (old seal `strike`, holdout `#onStruck`, the court).
 *
 * @param ctx - The context of the service.
 * @param resident - The resident.
 * @param by - Who banishes.
 * @returns What the call did.
 */
export function banish(ctx: ExileCtx, resident: string, by: string): Static<typeof BanishResult> {
	if (!ctx.residents.has(resident)) return { ok: false, code: "UNKNOWN_RESIDENT" };
	if (isGone(ctx.state, resident)) return { ok: false, code: "ALREADY_EXILED" };
	leave(ctx, resident, by);
	ctx.emit("exiled", { agent: resident, by });
	ctx.residents.suspend(resident, EXILE_SUSPENSION);
	return { ok: true };
}

/**
 * The gates whose time is up close, in the order they opened (old `#closeGate`): the board told, the will read out,
 * then `exiled` and the suspension.
 *
 * @param ctx - The context of the hook.
 */
export function closeGates(ctx: ExileCtx): void {
	for (const gate of [...ctx.state.gates]) {
		if (ctx.tick < gate.until) continue;
		const will = gate.will;
		leave(ctx, gate.resident, gate.by);
		post(ctx, filled(gate.texts.exiled, { exiled: gate.resident }));
		if (will !== undefined) post(ctx, filled(gate.texts.will, { exiled: gate.resident, will: will.text }));
		ctx.emit("exiled", { agent: gate.resident, ...(will === undefined ? {} : { will: will.text }) });
		ctx.residents.suspend(gate.resident, EXILE_SUSPENSION);
	}
}
