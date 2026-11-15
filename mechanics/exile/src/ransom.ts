// SPDX-License-Identifier: Apache-2.0
/**
 * The ransom, carried from the old `exile` (`ransom.ts`): points paid toward a gate are spent at once and never
 * refunded, others' points count toward `price`, the resident's own toward `selfPrice`, and more than the rest is not
 * taken. Paid in full, the board is told, `ransomed` is written and the resident returns, once.
 */
import type { ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { ExilePurseService } from "./contract.ts";
import { balanceOf, coveredPercent, filled, gateOf, namesOf, notify, post, ransomRest, refused, registered, shown } from "./gate.ts";
import type { ExileCtx, ExileToolCtx, GateState } from "./head.ts";

// The refusals before the payment, in the old order; the gate when it may be paid.
function payable(ctx: ExileToolCtx, payer: string, target: string, amount: number): GateState | ToolOutcome {
	if (!ctx.residents.has(target)) return refused(ctx, "UNKNOWN_AGENT", target);
	if (registered(ctx.state).includes(payer)) return refuse("EXILED");
	const gate = gateOf(ctx.state, target);
	if (gate === undefined) return refused(ctx, "NOT_AT_GATE", `${target} is not at the gate`);
	if (!gate.ransomable) return refused(ctx, "NO_RANSOM", `${target} was bought back once already; the city takes no second ransom`);
	return Number.isInteger(amount) && amount > 0 ? gate : refuse("INVALID_AMOUNT");
}

// The ransom paid in full: the gate opens, the board is told, then `ransomed`.
function free(ctx: ExileCtx, gate: GateState): void {
	ctx.state.gates.splice(ctx.state.gates.indexOf(gate), 1);
	if (!ctx.state.ransomed.includes(gate.resident)) ctx.state.ransomed.push(gate.resident);
	const payers = [...new Set(gate.payments.map((payment) => payment.payer))].sort();
	post(ctx, filled(gate.texts.ransomed, { exiled: gate.resident, payers: namesOf(payers) }));
	ctx.emit("ransomed", { agent: gate.resident, payers });
}

/**
 * The tool `payRansom` (old `World.payRansom`): the refusals in the old order, then the payment.
 *
 * @param ctx - The context of the tool.
 * @param payer - The resident that pays.
 * @param target - The resident at the gate, resolved to its id.
 * @param amount - The points offered.
 * @returns The reply, or the refusal.
 */
export function payRansom(ctx: ExileToolCtx, payer: string, target: string, amount: number): ToolOutcome {
	const gate = payable(ctx, payer, target, amount);
	if (!("resident" in gate)) return gate;
	const { price, selfPrice } = gate;
	const own = payer === gate.resident;
	// The rest of the ransom in the payer's points, rounded up.
	const spent = Math.min(amount, Math.ceil((ransomRest(gate) * (own ? selfPrice : price)) / (price * selfPrice)));
	if (balanceOf(ctx, payer) < spent) return refuse("INSUFFICIENT_FUNDS");
	ctx.tryCall(ExilePurseService, "burn", { account: payer, amount: spent, reason: `ransom for ${target}` });
	gate.payments.push({ payer, amount: spent });
	const paid = gate.payments.reduce((sum, payment) => sum + payment.amount, 0);
	const covered = coveredPercent(gate);
	ctx.emit("ransom_paid", { payer, target, amount: spent, paid, price, selfPrice, covered });
	if (!own) notify(ctx, target, ctx.prompt("exile/ransom-toward", { payer, amount: spent, covered }));
	if (ransomRest(gate) > 0) return reply(shown(ctx, ctx.prompt("exile/replies/ransom-paid", { covered, target, price, selfPrice })));
	free(ctx, gate);
	return reply(shown(ctx, ctx.prompt("exile/replies/ransom-covered", { paid, target })));
}
