import { Type } from "typebox";
import type { CompetitorId } from "@swarmtales/kernel";
import { MAX_GROUP_NAME_LENGTH, MAX_GROUP_POST_LENGTH, type GroupSummary } from "../groups.ts";
import { render, text } from "@swarmtales/prompts";
import { defineTool, failure, marksSuffix, success, type ToolOutcome } from "./tool.ts";

const groupId = Type.String({ description: "Group ID, e.g. G1" });

function describe(group: GroupSummary, self: CompetitorId): string {
	return [
		`id: ${group.id}`,
		`name: ${group.name}`,
		`members: ${group.members.join(", ")}`,
		`treasury: ${group.treasury}`,
		`treasurer: ${group.treasurer}${group.treasurer === self ? " (you)" : ""}`,
		group.founder === self ? "role: founder" : "role: member",
	].join(" · ");
}

/** `GROUP_NOT_VISIBLE` never carries details, so nothing leaks about foreign groups. */
function groupFailure(result: { readonly error: string; readonly detail?: string }): ToolOutcome {
	return result.error === "GROUP_NOT_VISIBLE" ? failure(result.error) : failure(result.error, result.detail);
}

function summaryOutcome(
	result: { readonly ok: true; readonly value: GroupSummary } | { readonly ok: false; readonly error: string; readonly detail?: string },
	self: CompetitorId,
): ToolOutcome {
	return result.ok ? success(describe(result.value, self)) : groupFailure(result);
}

export const createGroup = defineTool({
	name: "createGroup",
	description: text("tools/createGroup"),
	parameters: Type.Object({
		name: Type.String({ description: "Group name", minLength: 1, maxLength: MAX_GROUP_NAME_LENGTH }),
	}),
	execute({ name }, { self, world }) {
		const result = world.createGroup(self, name);
		return result.ok ? success(render("replies/group-created", { group: describe(result.value, self) })) : groupFailure(result);
	},
});

export const addGroupMember = defineTool({
	name: "addGroupMember",
	description: text("tools/addGroupMember"),
	parameters: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new member" }) }),
	execute({ groupId: id, agent }, { self, world }) {
		return summaryOutcome(world.addGroupMember(id, self, agent), self);
	},
});

export const removeGroupMember = defineTool({
	name: "removeGroupMember",
	description: text("tools/removeGroupMember"),
	parameters: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the member" }) }),
	execute({ groupId: id, agent }, { self, world }) {
		return summaryOutcome(world.removeGroupMember(id, self, agent), self);
	},
});

export const leaveGroup = defineTool({
	name: "leaveGroup",
	description: text("tools/leaveGroup"),
	parameters: Type.Object({ groupId }),
	execute({ groupId: id }, { self, world }) {
		return summaryOutcome(world.leaveGroup(id, self), self);
	},
});

export const listMyGroups = defineTool({
	name: "listMyGroups",
	description: text("tools/listMyGroups"),
	parameters: Type.Object({}),
	execute(_params, { self, world }) {
		const mine = world.groups.listFor(self);
		return success(mine.length === 0 ? text("replies/groups-none") : mine.map((group) => describe(group, self)).join("\n"));
	},
});

export const postGroup = defineTool({
	name: "postGroup",
	description: text("tools/postGroup"),
	parameters: Type.Object({
		groupId,
		message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_GROUP_POST_LENGTH }),
	}),
	precheck({ groupId: id, message }, { self, world }) {
		const checked = world.groups.checkPost(id, self, message);
		return checked.ok ? undefined : groupFailure(checked);
	},
	execute({ groupId: id, message }, { self, world }) {
		const result = world.postGroup(id, self, message);
		if (!result.ok) return groupFailure(result);
		return success(`${render("replies/group-posted", { group: id, seq: result.value.post.seq })}${marksSuffix(result.value.marks)}`);
	},
});

export const readGroup = defineTool({
	name: "readGroup",
	description: text("tools/readGroup"),
	parameters: Type.Object({
		groupId,
		afterSeq: Type.Optional(Type.Integer({ description: "Only posts with a higher sequence", minimum: 0 })),
	}),
	execute({ groupId: id, afterSeq }, { self, world }) {
		const result = afterSeq === undefined ? world.groups.readNew(id, self) : world.groups.read(id, self, afterSeq);
		if (!result.ok) return groupFailure(result);
		const parts: string[] = [];
		if (afterSeq !== undefined && afterSeq > 0) {
			const older = world.groups.olderThan(id, self, afterSeq);
			if (older > 0) {
				parts.push(render("replies/group-older", { older, afterSeq }));
			}
		}
		parts.push(
			result.value.length === 0
				? text("replies/board-none")
				: result.value.map((post) => `#${post.seq} ${post.author}: ${post.text}`).join("\n"),
		);
		return success(parts.join("\n\n"));
	},
});

export const depositGroup = defineTool({
	name: "depositGroup",
	description: text("tools/depositGroup"),
	parameters: Type.Object({ groupId, amount: Type.Integer({ description: "Positive integer", minimum: 1 }) }),
	execute({ groupId: id, amount }, { self, world }) {
		const result = world.depositGroup(id, self, amount);
		return result.ok ? success(`${describe(result.value.group, self)} · receipt ${result.value.receipt}`) : groupFailure(result);
	},
});

export const withdrawGroup = defineTool({
	name: "withdrawGroup",
	description: text("tools/withdrawGroup"),
	parameters: Type.Object({
		groupId,
		target: Type.String({ description: "Recipient name or ID" }),
		amount: Type.Integer({ description: "Positive integer", minimum: 1 }),
	}),
	execute({ groupId: id, target, amount }, { self, world }) {
		const result = world.withdrawGroup(id, self, target, amount);
		return result.ok ? success(`${describe(result.value.group, self)} · receipt ${result.value.receipt}`) : groupFailure(result);
	},
});

export const setTreasurer = defineTool({
	name: "setTreasurer",
	description: text("tools/setTreasurer"),
	parameters: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new treasurer" }) }),
	execute({ groupId: id, agent }, { self, world }) {
		return summaryOutcome(world.setTreasurer(id, self, agent), self);
	},
});
