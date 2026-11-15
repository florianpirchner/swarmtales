// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What `channels` does with groups, carried from the old platform: the registry decides who may, this file writes the
 * events and the replies. The old marks of a group post (its price, `marks n/m left`) belong to `marks` and to the
 * allowance part of the reply, not to this file (12-m5-spec.md, 2.3).
 */
import type { Refusal, ToolOutcome } from "@swarmtales/contracts";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { refuse, reply } from "@swarmtales/sdk";
import { CITY, groupAccountId, type GroupFailure, type GroupInfo, type GroupResult } from "./group-types.ts";
import type { Ctx, ToolCtx } from "./head.ts";
import { notify, selfOf } from "./messages.ts";

/**
 * Turns a refusal of the registry into the caller's refusal. `GROUP_NOT_VISIBLE` never carries a detail, so nothing
 * leaks about foreign groups.
 *
 * @param result - The refusal.
 * @returns The refusal of the call.
 */
export function groupFailure(result: GroupFailure): Refusal {
	return result.error === "GROUP_NOT_VISIBLE" || result.detail === undefined ? refuse(result.error) : refuse(result.error, result.detail);
}

/**
 * Reads the points of a group's treasury.
 *
 * @param ctx - The context.
 * @param groupId - The group.
 * @returns The balance of its ledger account; 0 without a ledger.
 */
export function treasuryOf(ctx: Ctx, groupId: string): number {
	return ctx.tryCall(LedgerService, "balance", { account: groupAccountId(groupId) }) ?? 0;
}

/**
 * Shows one group as a resident sees it.
 *
 * @param ctx - The context.
 * @param group - The group.
 * @param self - The reader.
 * @returns One line: id, name, members, treasury, treasurer and the reader's role.
 */
export function describe(ctx: Ctx, group: GroupInfo, self: string): string {
	return [
		`id: ${group.id}`,
		`name: ${group.name}`,
		`members: ${group.members.join(", ")}`,
		`treasury: ${String(treasuryOf(ctx, group.id))}`,
		`treasurer: ${group.treasurer}${group.treasurer === self ? " (you)" : ""}`,
		group.founder === self ? "role: founder" : "role: member",
	].join(" · ");
}

function summaryOutcome(ctx: ToolCtx, result: GroupResult<GroupInfo>): ToolOutcome {
	return result.ok ? reply(describe(ctx, result.value, selfOf(ctx))) : groupFailure(result);
}

/**
 * Runs `createGroup`: founds the group and opens its treasury account.
 *
 * @param ctx - The context of the tool call.
 * @param name - The name as written.
 * @returns The group, or `INVALID_NAME`, `GROUP_LIMIT`.
 */
export function createGroup(ctx: ToolCtx, name: string): ToolOutcome {
	const founder = selfOf(ctx);
	const result = ctx.state.groups.create(founder, name);
	if (!result.ok) return groupFailure(result);
	// The treasury account opens with the group: the ledger refuses an account nobody opened.
	ctx.tryCall(LedgerService, "open", { account: groupAccountId(result.value.id) });
	ctx.emit("group_created", { group: result.value.id, founder, name: result.value.name });
	return reply(ctx.prompt("channels/replies/group-created", { group: describe(ctx, result.value, founder) }));
}

/**
 * Runs `addGroupMember`: the new member hears of it by a notice.
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @param agent - The new member.
 * @returns The group, or `UNKNOWN_AGENT` and the refusals of the registry.
 */
export function addGroupMember(ctx: ToolCtx, groupId: string, agent: string): ToolOutcome {
	const actor = selfOf(ctx);
	if (!ctx.residents.has(agent)) return refuse("UNKNOWN_AGENT", agent);
	const result = ctx.state.groups.addMember(groupId, actor, agent);
	if (result.ok) {
		ctx.emit("group_membership", { group: groupId, agent, change: "added", by: actor });
		notify(ctx, agent, CITY, ctx.prompt("channels/notices/group-added", { actor, group: groupId, name: result.value.name }));
	}
	return summaryOutcome(ctx, result);
}

/**
 * Runs `removeGroupMember`.
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @param agent - The member.
 * @returns The group, or `UNKNOWN_AGENT` and the refusals of the registry.
 */
export function removeGroupMember(ctx: ToolCtx, groupId: string, agent: string): ToolOutcome {
	const actor = selfOf(ctx);
	if (!ctx.residents.has(agent)) return refuse("UNKNOWN_AGENT", agent);
	const result = ctx.state.groups.removeMember(groupId, actor, agent);
	if (result.ok) ctx.emit("group_membership", { group: groupId, agent, change: "removed", by: actor });
	return summaryOutcome(ctx, result);
}

/**
 * Runs `leaveGroup`.
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @returns The group, or the refusals of the registry.
 */
export function leaveGroup(ctx: ToolCtx, groupId: string): ToolOutcome {
	const agent = selfOf(ctx);
	const result = ctx.state.groups.leave(groupId, agent);
	if (result.ok) ctx.emit("group_membership", { group: groupId, agent, change: "left", by: agent });
	return summaryOutcome(ctx, result);
}

/**
 * Runs `setTreasurer`.
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @param agent - The new treasurer.
 * @returns The group, or `UNKNOWN_AGENT` and the refusals of the registry.
 */
export function setTreasurer(ctx: ToolCtx, groupId: string, agent: string): ToolOutcome {
	const actor = selfOf(ctx);
	if (!ctx.residents.has(agent)) return refuse("UNKNOWN_AGENT", agent);
	const result = ctx.state.groups.setTreasurer(groupId, actor, agent);
	if (result.ok) ctx.emit("treasurer_set", { group: groupId, treasurer: agent, by: actor });
	return summaryOutcome(ctx, result);
}

/**
 * Runs `listMyGroups`.
 *
 * @param ctx - The context of the tool call.
 * @returns One line per group, or the line that says there is none.
 */
export function listMyGroups(ctx: ToolCtx): ToolOutcome {
	const self = selfOf(ctx);
	const mine = ctx.state.groups.listFor(self);
	return reply(mine.length === 0 ? ctx.prompt("channels/replies/groups-none", {}) : mine.map((group) => describe(ctx, group, self)).join("\n"));
}

/**
 * The tool's own rule of `postGroup` (the old precheck: a failing post reaches no later stage).
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @param text - The text as written.
 * @returns `GROUP_NOT_VISIBLE` or `INVALID_TEXT`; undefined when the post may run.
 */
export function checkGroupPost(ctx: ToolCtx, groupId: string, text: string): Refusal | undefined {
	const checked = ctx.state.groups.checkPost(groupId, selfOf(ctx), text);
	return checked.ok ? undefined : groupFailure(checked);
}

/**
 * Runs `postGroup`, after its rule.
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @param text - The text as written.
 * @returns `posted · G1 #7`, or the refusals of the registry.
 */
export function postGroup(ctx: ToolCtx, groupId: string, text: string): ToolOutcome {
	const author = selfOf(ctx);
	const posted = ctx.state.groups.post(groupId, author, text, ctx.tick);
	if (!posted.ok) return groupFailure(posted);
	ctx.emit("group_post", { group: groupId, author, postSeq: posted.value.seq, text: posted.value.text });
	return reply(ctx.prompt("channels/replies/group-posted", { group: groupId, seq: posted.value.seq }));
}

/**
 * Runs `readGroup`: without `afterSeq` the unread posts of others, else the posts after that number, with a hint
 * about older posts.
 *
 * @param ctx - The context of the tool call.
 * @param groupId - The group.
 * @param afterSeq - Read after this number; undefined: since the last read.
 * @returns The posts, one line each, or `GROUP_NOT_VISIBLE`.
 */
export function readGroup(ctx: ToolCtx, groupId: string, afterSeq: number | undefined): ToolOutcome {
	const self = selfOf(ctx);
	const groups = ctx.state.groups;
	const result = afterSeq === undefined ? groups.readNew(groupId, self) : groups.read(groupId, self, afterSeq);
	if (!result.ok) return groupFailure(result);
	const parts: string[] = [];
	if (afterSeq !== undefined && afterSeq > 0) {
		const older = groups.olderThan(groupId, self, afterSeq);
		if (older > 0) parts.push(ctx.prompt("channels/replies/group-older", { older, afterSeq }));
	}
	parts.push(result.value.length === 0 ? ctx.prompt("channels/replies/board-none", {}) : result.value.map((post) => `#${String(post.seq)} ${post.author}: ${post.text}`).join("\n"));
	return reply(parts.join("\n\n"));
}
