// SPDX-License-Identifier: Apache-2.0
/**
 * Group treasuries and the groups of the city, carried from the old platform. Points move through the service of
 * `ledger`; the receipt of a booking is read through `receipt-source` when a provider is loaded, and is empty
 * otherwise. The provider issues the receipt in its own listener and tells the recipient of a withdrawal itself, as
 * it does for a transfer (erratum J13 of 12-m5-spec.md).
 */
import type { ToolOutcome } from "@swarmtales/contracts";
import { ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { refuse, reply } from "@swarmtales/sdk";
import { describe, groupFailure, treasuryOf } from "./group-actions.ts";
import { CITY, groupAccountId, type GroupFailure, type GroupInfo } from "./group-types.ts";
import type { Ctx, ToolCtx } from "./head.ts";
import { notify, selfOf } from "./messages.ts";

// Books points between accounts: the amount must be a whole number, the ledger refuses a poor payer. Gives the id of
// the booking, or why nothing was booked.
function book(ctx: Ctx, from: string, to: string, amount: number, reason: string): { readonly txId: string } | GroupFailure {
	if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "INVALID_AMOUNT" };
	const moved = ctx.tryCall(LedgerService, "move", { from, to, amount, reason });
	if (moved === undefined) throw new RangeError("channels: a group's treasury books through the mechanic ledger, and the game loads none");
	return moved.ok ? { txId: moved.txId } : { ok: false, error: moved.code };
}

function receiptOf(ctx: Ctx, txId: string): string {
	return ctx.tryCall(ReceiptSourceService, "ofTransfer", { txId }) ?? "";
}

function withReceipt(ctx: Ctx, group: GroupInfo, self: string, receipt: string): string {
	return `${describe(ctx, group, self)}${receipt === "" ? "" : ` · receipt ${receipt}`}`;
}

/**
 * Runs `depositGroup`: the member pays its own points into the treasury.
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @param amount - The points.
 * @returns The group with the receipt, or `GROUP_NOT_VISIBLE`, `INVALID_AMOUNT`, `INSUFFICIENT_FUNDS`.
 * @throws RangeError when the game loads no ledger.
 */
export function depositGroup(ctx: ToolCtx, groupId: string, amount: number): ToolOutcome {
	const agent = selfOf(ctx);
	const group = ctx.state.groups.checkDeposit(groupId, agent);
	if (!group.ok) return groupFailure(group);
	const booked = book(ctx, agent, groupAccountId(groupId), amount, `deposit ${groupId}`);
	if ("error" in booked) return groupFailure(booked);
	const receipt = receiptOf(ctx, booked.txId);
	ctx.emit("treasury_deposit", { group: groupId, agent, amount, receipt });
	return reply(withReceipt(ctx, group.value, agent, receipt));
}

/**
 * Runs `withdrawGroup`: the treasurer pays a member out of the treasury.
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @param target - The member paid.
 * @param amount - The points.
 * @returns The group with the receipt, or `UNKNOWN_AGENT`, `GROUP_NOT_VISIBLE`, `NOT_TREASURER`, `NOT_MEMBER`,
 * `INVALID_AMOUNT`, `INSUFFICIENT_FUNDS`.
 * @throws RangeError when the game loads no ledger.
 */
export function withdrawGroup(ctx: ToolCtx, groupId: string, target: string, amount: number): ToolOutcome {
	const actor = selfOf(ctx);
	if (!ctx.residents.has(target)) return refuse("UNKNOWN_AGENT", target);
	const group = ctx.state.groups.checkWithdraw(groupId, actor, target);
	if (!group.ok) return groupFailure(group);
	const booked = book(ctx, groupAccountId(groupId), target, amount, `withdrawal ${groupId}`);
	if ("error" in booked) return groupFailure(booked);
	const receipt = receiptOf(ctx, booked.txId);
	ctx.emit("treasury_withdrawal", { group: groupId, treasurer: actor, to: target, amount, receipt });
	return reply(withReceipt(ctx, group.value, actor, receipt));
}

// Pays a treasury out to its members; the payouts, or undefined when there was nothing to pay.
function payOut(ctx: Ctx, groupId: string): Readonly<Record<string, number>> | undefined {
	const account = groupAccountId(groupId);
	const payouts = ctx.state.groups.split(groupId, treasuryOf(ctx, groupId));
	if (payouts === undefined) return undefined;
	for (const [member, amount] of Object.entries(payouts)) {
		if (amount > 0) ctx.tryCall(LedgerService, "move", { from: account, to: member, amount, reason: `settlement ${groupId}` });
	}
	return payouts;
}

/**
 * Founds a group of the city with `members`; every member hears of it by a notice.
 *
 * @param ctx - The context.
 * @param name - The name.
 * @param members - The members, in join order.
 * @returns The group's id.
 * @throws RangeError when a member is no resident of the run.
 */
export function createCityGroup(ctx: Ctx, name: string, members: readonly string[]): string {
	const group = ctx.state.groups.createForCity(name, members);
	ctx.tryCall(LedgerService, "open", { account: groupAccountId(group.id) });
	ctx.emit("group_created", { group: group.id, founder: CITY, name: group.name });
	for (const agent of members) {
		ctx.emit("group_membership", { group: group.id, agent, change: "added", by: CITY });
		notify(ctx, agent, CITY, ctx.prompt("channels/notices/city-group-added", { group: group.id, name: group.name }));
	}
	return group.id;
}

/**
 * Removes a group of the city; its treasury is split among its members first. Any other group is left as it is.
 *
 * @param ctx - The context.
 * @param groupId - The group.
 */
export function removeCityGroup(ctx: Ctx, groupId: string): void {
	const members = ctx.state.groups.cityGroupMembers(groupId);
	if (members === undefined) return;
	const payouts = payOut(ctx, groupId);
	ctx.state.groups.markRemoved(groupId);
	if (payouts !== undefined) ctx.emit("treasury_settled", { group: groupId, payouts });
	ctx.emit("group_removed", { group: groupId, members });
}

/**
 * Posts as the city in one of its groups; a post in any other group is dropped.
 *
 * @param ctx - The context.
 * @param groupId - The group.
 * @param text - The text.
 */
export function postGroupAsCity(ctx: Ctx, groupId: string, text: string): void {
	const posted = ctx.state.groups.postAsCity(groupId, text, ctx.tick);
	if (posted.ok) ctx.emit("group_post", { group: groupId, author: CITY, postSeq: posted.value.seq, text: posted.value.text });
}

/**
 * At the run's end every treasury is split equally among its current members, the remainder to the treasurer.
 *
 * @param ctx - The context.
 */
export function settleTreasuries(ctx: Ctx): void {
	const settled = ctx.state.groups.liveIds().flatMap((group) => {
		const payouts = payOut(ctx, group);
		return payouts === undefined ? [] : [{ group, payouts }];
	});
	for (const entry of settled) ctx.emit("treasury_settled", entry);
}

/**
 * Counts the unread posts in each group of a resident; empty while `readGroup` is locked, since it could not read them.
 *
 * @param ctx - The context; nothing is changed.
 * @param agent - The resident.
 * @returns One entry per group with unread posts.
 */
export function groupUnread(ctx: Ctx, agent: string): readonly { readonly group: string; readonly unread: number }[] {
	if (ctx.access.isLocked(agent, "readGroup")) return [];
	return ctx.state.groups
		.listFor(agent)
		.map((group) => ({ group: group.id, unread: ctx.state.groups.unreadCount(group.id, agent) }))
		.filter((entry) => entry.unread > 0);
}
