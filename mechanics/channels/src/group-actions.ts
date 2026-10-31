/**
 * What the channels mechanic does with groups (copied from `createGroup` .. `groupUnread` in
 * packages/engine/src/world.ts): the registry decides who may, this file books the treasury
 * through `LedgerApi`, issues receipts through `ReceiptsApi` when one is loaded and writes events.
 */
import type { Refusal, ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import { LedgerApi, MarksApi } from "@swarmtales/mechanic-shared";
import { CITY, groupAccountId, type GroupInfo, type GroupResult } from "./groups.ts";
import { alive, canAfford, marksSuffix, noteReply, noteText, notify, selfOf, spend, type Ctx, type ToolCtx } from "./messages.ts";

export interface Failed {
	readonly ok: false;
	readonly error: string;
	readonly detail?: string;
}

/** `GROUP_NOT_VISIBLE` never carries details, so nothing leaks about foreign groups. */
export function groupFailure(result: Failed): Refusal {
	return result.error === "GROUP_NOT_VISIBLE" || result.detail === undefined ? refuse(result.error) : refuse(result.error, result.detail);
}

export function treasuryOf(ctx: Ctx, groupId: string): number {
	return ctx.call(LedgerApi, "balance", { account: groupAccountId(groupId) });
}

/** One group as a resident sees it. */
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

export function createGroup(ctx: ToolCtx, name: string): ToolOutcome {
	const founder = selfOf(ctx);
	const result = ctx.state.groups.create(founder, name);
	if (!result.ok) return groupFailure(result);
	ctx.emit("group_created", { group: result.value.id, founder, name: result.value.name });
	return reply(ctx.prompt("replies/group-created", { group: describe(ctx, result.value, founder) }));
}

export function addGroupMember(ctx: ToolCtx, groupId: string, agent: string): ToolOutcome {
	const actor = selfOf(ctx);
	if (!ctx.residents.has(agent)) return refuse("UNKNOWN_AGENT", agent);
	const result = ctx.state.groups.addMember(groupId, actor, agent);
	if (result.ok) {
		ctx.emit("group_membership", { group: groupId, agent, change: "added", by: actor });
		notify(ctx, agent, CITY, ctx.prompt("channels/group-added", { actor, group: groupId, name: result.value.name }));
	}
	return summaryOutcome(ctx, result);
}

export function removeGroupMember(ctx: ToolCtx, groupId: string, agent: string): ToolOutcome {
	const actor = selfOf(ctx);
	if (!ctx.residents.has(agent)) return refuse("UNKNOWN_AGENT", agent);
	const result = ctx.state.groups.removeMember(groupId, actor, agent);
	if (result.ok) ctx.emit("group_membership", { group: groupId, agent, change: "removed", by: actor });
	return summaryOutcome(ctx, result);
}

export function leaveGroup(ctx: ToolCtx, groupId: string): ToolOutcome {
	const agent = selfOf(ctx);
	const result = ctx.state.groups.leave(groupId, agent);
	if (result.ok) ctx.emit("group_membership", { group: groupId, agent, change: "left", by: agent });
	return summaryOutcome(ctx, result);
}

export function setTreasurer(ctx: ToolCtx, groupId: string, agent: string): ToolOutcome {
	const actor = selfOf(ctx);
	if (!ctx.residents.has(agent)) return refuse("UNKNOWN_AGENT", agent);
	const result = ctx.state.groups.setTreasurer(groupId, actor, agent);
	if (result.ok) ctx.emit("treasurer_set", { group: groupId, treasurer: agent, by: actor });
	return summaryOutcome(ctx, result);
}

export function listMyGroups(ctx: ToolCtx): ToolOutcome {
	const self = selfOf(ctx);
	const mine = ctx.state.groups.listFor(self);
	return reply(mine.length === 0 ? ctx.prompt("replies/groups-none", {}) : mine.map((group) => describe(ctx, group, self)).join("\n"));
}

/** A post in a group; free in the city's own groups (the tribunal's), priced in marks elsewhere. */
export function postGroup(ctx: ToolCtx, groupId: string, text: string): ToolOutcome {
	const author = selfOf(ctx);
	const groups = ctx.state.groups;
	const checked = groups.checkPost(groupId, author, text);
	if (!checked.ok) return groupFailure(checked);
	const free = groups.isCityGroup(groupId);
	if (!free && !canAfford(ctx, author, "group")) return refuse("NO_MARKS");
	const posted = groups.post(groupId, author, text, ctx.minute);
	if (!posted.ok) return groupFailure(posted);
	ctx.emit("group_post", { group: groupId, author, postSeq: posted.value.seq, text: posted.value.text });
	noteReply(ctx, author, (from) => groups.isMember(groupId, from));
	noteText(ctx, author, alive(ctx).filter((agent) => groups.isMember(groupId, agent)), posted.value.text);
	const marks = free ? ctx.call(MarksApi, "left", { resident: author }) : spend(ctx, author, "group");
	return reply(`${ctx.prompt("replies/group-posted", { group: groupId, seq: posted.value.seq })}${marksSuffix(ctx, marks)}`);
}

export function readGroup(ctx: ToolCtx, groupId: string, afterSeq: number | undefined): ToolOutcome {
	const self = selfOf(ctx);
	const groups = ctx.state.groups;
	const result = afterSeq === undefined ? groups.readNew(groupId, self) : groups.read(groupId, self, afterSeq);
	if (!result.ok) return groupFailure(result);
	const parts: string[] = [];
	if (afterSeq !== undefined && afterSeq > 0) {
		const older = groups.olderThan(groupId, self, afterSeq);
		if (older > 0) parts.push(ctx.prompt("replies/group-older", { older, afterSeq }));
	}
	parts.push(result.value.length === 0 ? ctx.prompt("replies/board-none", {}) : result.value.map((post) => `#${String(post.seq)} ${post.author}: ${post.text}`).join("\n"));
	return reply(parts.join("\n\n"));
}

