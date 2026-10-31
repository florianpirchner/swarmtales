/**
 * Group treasuries and the groups of the city (copied from `depositGroup` .. `groupUnread` in
 * packages/engine/src/world.ts): points move through `LedgerApi`, receipts come from `ReceiptsApi`
 * when a receipts mechanic is loaded.
 */
import type { ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import { LedgerApi, ReceiptsApi } from "@swarmtales/mechanic-shared";
import type { ReceiptBody } from "@swarmtales/mechanic-shared";
import { describe, groupFailure, treasuryOf, type Failed } from "./group-actions.ts";
import { CITY, groupAccountId, type GroupInfo } from "./groups.ts";
import { notify, selfOf, type Ctx, type ToolCtx } from "./messages.ts";

/** A receipt of the city, when a receipts mechanic is loaded; the id is empty otherwise. */
function issueReceipt(ctx: Ctx, body: ReceiptBody): { readonly id: string; readonly text: string } {
	return ctx.tryCall(ReceiptsApi, "issue", { body }) ?? { id: "", text: "" };
}

/** Books points between accounts; the amount must be a whole number, the ledger refuses a poor payer. */
function book(ctx: Ctx, from: string, to: string, amount: number, reason: string): Failed | undefined {
	if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "INVALID_AMOUNT" };
	const moved = ctx.call(LedgerApi, "move", { from, to, amount, reason });
	return moved.ok ? undefined : { ok: false, error: moved.code };
}

function withReceipt(ctx: Ctx, group: GroupInfo, self: string, receipt: string): string {
	return `${describe(ctx, group, self)}${receipt === "" ? "" : ` · receipt ${receipt}`}`;
}

export function depositGroup(ctx: ToolCtx, groupId: string, amount: number): ToolOutcome {
	const agent = selfOf(ctx);
	const group = ctx.state.groups.checkDeposit(groupId, agent);
	if (!group.ok) return groupFailure(group);
	const failed = book(ctx, agent, groupAccountId(groupId), amount, `deposit ${groupId}`);
	if (failed !== undefined) return groupFailure(failed);
	const receipt = issueReceipt(ctx, { kind: "deposit", from: agent, group: groupId, amount });
	ctx.emit("treasury_deposit", { group: groupId, agent, amount, receipt: receipt.id });
	return reply(withReceipt(ctx, group.value, agent, receipt.id));
}

export function withdrawGroup(ctx: ToolCtx, groupId: string, target: string, amount: number): ToolOutcome {
	const actor = selfOf(ctx);
	if (!ctx.residents.has(target)) return refuse("UNKNOWN_AGENT", target);
	const group = ctx.state.groups.checkWithdraw(groupId, actor, target);
	if (!group.ok) return groupFailure(group);
	const failed = book(ctx, groupAccountId(groupId), target, amount, `withdrawal ${groupId}`);
	if (failed !== undefined) return groupFailure(failed);
	const receipt = issueReceipt(ctx, { kind: "withdrawal", group: groupId, treasurer: actor, to: target, amount });
	ctx.emit("treasury_withdrawal", { group: groupId, treasurer: actor, to: target, amount, receipt: receipt.id });
	if (target !== actor) notify(ctx, target, CITY, receipt.text);
	return reply(withReceipt(ctx, group.value, actor, receipt.id));
}

/** Pays a treasury out to its members; returns the payouts, or undefined when there was nothing to pay. */
function payOut(ctx: Ctx, groupId: string): Readonly<Record<string, number>> | undefined {
	const account = groupAccountId(groupId);
	const payouts = ctx.state.groups.split(groupId, treasuryOf(ctx, groupId));
	if (payouts === undefined) return undefined;
	for (const [member, amount] of Object.entries(payouts)) {
		if (amount > 0) ctx.call(LedgerApi, "move", { from: account, to: member, amount, reason: `settlement ${groupId}` });
	}
	return payouts;
}

/** A group the city founds with `members` (the tribunal's); every member hears of it. Returns its id. */
export function createCityGroup(ctx: Ctx, name: string, members: readonly string[]): string {
	const group = ctx.state.groups.createForCity(name, members);
	ctx.emit("group_created", { group: group.id, founder: CITY, name: group.name });
	for (const agent of members) {
		ctx.emit("group_membership", { group: group.id, agent, change: "added", by: CITY });
		notify(ctx, agent, CITY, ctx.prompt("channels/city-group-added", { group: group.id, name: group.name }));
	}
	return group.id;
}

/** Removes a group of the city; its treasury is split among its members first. */
export function removeCityGroup(ctx: Ctx, groupId: string): void {
	const members = ctx.state.groups.cityGroupMembers(groupId);
	if (members === undefined) return;
	const payouts = payOut(ctx, groupId);
	ctx.state.groups.markRemoved(groupId);
	if (payouts !== undefined) ctx.emit("treasury_settled", { group: groupId, payouts });
	ctx.emit("group_removed", { group: groupId, members });
}

/** A post of the city in one of its groups. */
export function postGroupAsCity(ctx: Ctx, groupId: string, text: string): void {
	const posted = ctx.state.groups.postAsCity(groupId, text, ctx.minute);
	if (posted.ok) ctx.emit("group_post", { group: groupId, author: CITY, postSeq: posted.value.seq, text: posted.value.text });
}

/** Run end: every treasury is split equally among its current members, the remainder goes to the treasurer. */
export function settleTreasuries(ctx: Ctx): void {
	const settled = ctx.state.groups.liveIds().flatMap((group) => {
		const payouts = payOut(ctx, group);
		return payouts === undefined ? [] : [{ group, payouts }];
	});
	for (const entry of settled) ctx.emit("treasury_settled", entry);
}

/** Unread group posts; empty while readGroup is locked, since the resident could not read them. */
export function groupUnread(ctx: Ctx, agent: string): readonly { readonly group: string; readonly unread: number }[] {
	if (ctx.access.isLocked(agent, "readGroup")) return [];
	return ctx.state.groups
		.listFor(agent)
		.map((group) => ({ group: group.id, unread: ctx.state.groups.unreadCount(group.id, agent) }))
		.filter((entry) => entry.unread > 0);
}
