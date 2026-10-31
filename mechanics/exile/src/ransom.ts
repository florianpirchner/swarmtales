/**
 * The ransom (old `World.payRansom` and `Tribunal.payRansom`): points paid toward a gate are spent
 * at once and never refunded; others' points count toward `price`, the exiled's own toward
 * `selfPrice`, and more than the rest is not taken. Paid in full, the resident returns, once.
 */
import { ChannelsApi, LedgerApi, TribunalApi } from "@swarmtales/mechanic-shared";
import type { ExileCtx } from "./head.ts";
import { CITY, tribunalText } from "./gone.ts";
import { coveredPercent, gateOf, namesOf, pricesOf, ransomRest, tribunalExiled } from "./state.ts";

export interface RansomPaid {
	readonly paid: number;
	readonly price: number;
	readonly selfPrice: number;
	readonly covered: number;
	readonly freed: boolean;
}

export interface Refused { readonly ok: false; readonly code: string; readonly detail?: string }

function refused(code: string, detail?: string): Refused {
	return detail === undefined ? { ok: false, code } : { ok: false, code, detail };
}

export function payRansom(ctx: ExileCtx, payer: string, target: string, amount: number): { readonly ok: true; readonly value: RansomPaid } | Refused {
	if (!ctx.has(TribunalApi) || !ctx.residents.has(target)) return refused("UNKNOWN_AGENT", target);
	if (tribunalExiled(ctx.state).includes(payer)) return refused("EXILED");
	const gate = gateOf(ctx.state, target);
	if (gate === undefined) return refused("NOT_AT_GATE", `${target} is not at the gate`);
	if (!gate.ransomable) return refused("NO_RANSOM", `${target} was bought back once already; the city takes no second ransom`);
	if (!Number.isInteger(amount) || amount <= 0) return refused("INVALID_AMOUNT");
	const { price, selfPrice } = pricesOf(gate);
	const own = payer === gate.resident;
	const rest = ransomRest(gate);
	// The rest of the ransom in the payer's points, rounded up: rest / target of the payer's price.
	const due = Math.ceil((rest * (own ? selfPrice : price)) / (price * selfPrice));
	const spent = Math.min(amount, due);
	if (ctx.call(LedgerApi, "balance", { account: payer }) < spent) return refused("INSUFFICIENT_FUNDS");
	ctx.call(LedgerApi, "burn", { account: payer, amount: spent, reason: `ransom for ${target}` });
	gate.payments.push({ payer, amount: spent });
	const paid = gate.payments.reduce((sum, payment) => sum + payment.amount, 0);
	const covered = coveredPercent(gate);
	const freed = ransomRest(gate) <= 0;
	ctx.emit("ransom_paid", { payer, target, amount: spent, paid, price, selfPrice, covered });
	if (!own) ctx.call(ChannelsApi, "notify", { to: target, author: CITY, text: ctx.prompt("exile/ransom-toward", { payer, amount: spent, covered }) });
	const value = { paid, price, selfPrice, covered, freed };
	if (!freed) return { ok: true, value };
	ctx.state.gates.splice(ctx.state.gates.indexOf(gate), 1);
	if (!ctx.state.ransomed.includes(target)) ctx.state.ransomed.push(target);
	const payers = [...new Set(gate.payments.map((payment) => payment.payer))].sort();
	ctx.call(ChannelsApi, "post", { author: CITY, text: tribunalText(ctx, "ransomed", { exiled: target, payers: namesOf(payers) }) });
	ctx.emit("ransomed", { agent: target, payers });
	return { ok: true, value };
}
