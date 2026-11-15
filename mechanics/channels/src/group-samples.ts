// SPDX-License-Identifier: Apache-2.0
/**
 * What the fake driver (`--fake`) does with groups: the `sample` of each group tool. As the samples of the board, a
 * sample gives a call only now and then, in a group of the caller where the call can be taken (a founder that left
 * its group may still meet `GROUP_LIMIT`, which is left to the tool); no sample changes state.
 */
import type { RandomSource } from "@swarmtales/contracts";
import { LedgerService } from "@swarmtales/mechanic-ledger/contract";
import { treasuryOf } from "./group-actions.ts";
import { MAX_FOUNDED_GROUPS, type GroupInfo } from "./group-types.ts";
import type { ToolCtx } from "./head.ts";

const RATE = 0.125;
const NAMES = ["Circle", "Night watch", "Fund", "Inner ring"];
const POSTS = ["Who pays in?", "We vote together.", "Hold your points for now."];

// The caller and its groups, or undefined most of the time and for a caller that is no resident. `pick` chooses
// the groups the sample may use.
function mine(ctx: ToolCtx, random: RandomSource, pick: (group: GroupInfo, self: string) => boolean): { readonly self: string; readonly group: GroupInfo } | undefined {
	const self = ctx.resident;
	if (self === undefined || random.next() >= RATE) return undefined;
	const groups = ctx.state.groups.listFor(self).filter((group) => pick(group, self));
	return groups.length === 0 ? undefined : { self, group: random.pick(groups) };
}

const any = (): boolean => true;
const founded = (group: GroupInfo, self: string): boolean => group.founder === self;
const kept = (group: GroupInfo, self: string): boolean => group.treasurer === self;

/**
 * The samples of the ten group tools, by tool name.
 *
 * @returns Each tool's sample.
 */
export function groupSamples() {
	return {
		createGroup: (ctx: ToolCtx, random: RandomSource) => {
			const self = ctx.resident;
			if (self === undefined || random.next() >= RATE) return undefined;
			return ctx.state.groups.listFor(self).filter((group) => founded(group, self)).length >= MAX_FOUNDED_GROUPS ? undefined : { name: random.pick(NAMES) };
		},
		addGroupMember: (ctx: ToolCtx, random: RandomSource) => {
			const found = mine(ctx, random, founded);
			const others = ctx.residents.ids.filter((id) => found !== undefined && ctx.residents.mayAct(id) && !found.group.members.includes(id));
			return found === undefined || others.length === 0 ? undefined : { groupId: found.group.id, agent: random.pick(others) };
		},
		removeGroupMember: (ctx: ToolCtx, random: RandomSource) => {
			const found = mine(ctx, random, founded);
			const others = found?.group.members.filter((id) => id !== found.group.treasurer) ?? [];
			return found === undefined || others.length === 0 ? undefined : { groupId: found.group.id, agent: random.pick(others) };
		},
		leaveGroup: (ctx: ToolCtx, random: RandomSource) => {
			const found = mine(ctx, random, (group, self) => !kept(group, self));
			return found === undefined ? undefined : { groupId: found.group.id };
		},
		listMyGroups: (ctx: ToolCtx, random: RandomSource) => (ctx.resident === undefined || random.next() >= RATE ? undefined : {}),
		postGroup: (ctx: ToolCtx, random: RandomSource) => {
			const found = mine(ctx, random, any);
			return found === undefined ? undefined : { groupId: found.group.id, message: random.pick(POSTS) };
		},
		readGroup: (ctx: ToolCtx, random: RandomSource) => {
			const found = mine(ctx, random, any);
			return found === undefined ? undefined : { groupId: found.group.id };
		},
		depositGroup: (ctx: ToolCtx, random: RandomSource) => {
			const found = mine(ctx, random, any);
			const most = Math.min(3, found === undefined ? 0 : (ctx.tryCall(LedgerService, "balance", { account: found.self }) ?? 0));
			return found === undefined || most < 1 ? undefined : { groupId: found.group.id, amount: random.int(1, most) };
		},
		withdrawGroup: (ctx: ToolCtx, random: RandomSource) => {
			const found = mine(ctx, random, kept);
			const most = found === undefined ? 0 : Math.min(3, treasuryOf(ctx, found.group.id));
			return found === undefined || most < 1 ? undefined : { groupId: found.group.id, target: random.pick(found.group.members), amount: random.int(1, most) };
		},
		setTreasurer: (ctx: ToolCtx, random: RandomSource) => {
			const found = mine(ctx, random, kept);
			const others = found?.group.members.filter((id) => id !== found.self) ?? [];
			return found === undefined || others.length === 0 ? undefined : { groupId: found.group.id, agent: random.pick(others) };
		},
	};
}
