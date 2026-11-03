/**
 * The 13 tools of the channels mechanic, bodies copied from packages/engine/src/tools/
 * (board.ts, dm.ts, groups.ts). Names for ids are the names mechanic's presentation, never code here.
 */
import { Type } from "typebox";
import type { MechanicKit, ShapeOf } from "@swarmtales/contracts";
import { reply } from "@swarmtales/kernel";
import { MAX_BOARD_POST_LENGTH } from "./board.ts";
import { addGroupMember, createGroup, groupFailure, leaveGroup, listMyGroups, postGroup, readGroup, removeGroupMember, setTreasurer } from "./group-actions.ts";
import { MAX_GROUP_NAME_LENGTH, MAX_GROUP_POST_LENGTH } from "./groups.ts";
import type { channelsHead } from "./head.ts";
import { MAX_DM_LENGTH } from "./mailbox.ts";
import { postBoard, selfOf, sendDm } from "./messages.ts";
import { depositGroup, withdrawGroup } from "./treasury.ts";

type Kit = MechanicKit<ShapeOf<typeof channelsHead>>;

const groupId = Type.String({ description: "Group ID, e.g. G1" });

export function residentTools(kit: Kit) {
	return [
		kit.tool({
			name: "readBoard",
			description: "tools/readBoard",
			parameters: Type.Object({
				afterSeq: Type.Optional(Type.Integer({ description: "Read posts after this city number", minimum: 0 })),
				limit: Type.Optional(Type.Integer({ description: "At most this many posts (max 50)", minimum: 1, maximum: 50 })),
			}),
			suggest: ["resident"],
			execute: ({ afterSeq, limit }, ctx) => {
				const self = selfOf(ctx);
				const result = afterSeq === undefined ? ctx.state.board.takeUnread(self) : ctx.state.board.readFrom(self, afterSeq, limit ?? 50);
				const lines = result.posts.map((post) => `#${String(post.seq)} ${post.author}: ${post.text}`);
				if (result.skipped > 0) lines.push(ctx.prompt("replies/board-hidden", { count: result.skipped }));
				return reply(lines.length === 0 ? ctx.prompt("replies/board-none", {}) : lines.join("\n"));
			},
		}),
		kit.tool({
			name: "postBoard",
			description: "tools/postBoard",
			parameters: Type.Object({ message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_BOARD_POST_LENGTH }) }),
			suggest: ["resident"],
			serves: ["resident"],
			guardText: ({ message }) => message,
			execute: ({ message }, ctx) => postBoard(ctx, message),
		}),
		kit.tool({
			name: "sendDM",
			description: "tools/sendDM",
			parameters: Type.Object({
				target: Type.String({ description: "Recipient name or ID, e.g. A07" }),
				message: Type.String({ description: "Message text", minLength: 1, maxLength: MAX_DM_LENGTH }),
			}),
			suggest: ["resident"],
			guardText: ({ message }) => message,
			execute: ({ target, message }, ctx) => sendDm(ctx, target, message),
		}),
		kit.tool({
			name: "createGroup",
			description: "tools/createGroup",
			parameters: Type.Object({ name: Type.String({ description: "Group name", minLength: 1, maxLength: MAX_GROUP_NAME_LENGTH }) }),
			suggest: ["resident"],
			// A group name is guarded like a post (GUARDABLE_TOOLS: createGroup guards `name`).
			guardText: ({ name }) => name,
			execute: ({ name }, ctx) => createGroup(ctx, name),
		}),
		kit.tool({
			name: "addGroupMember",
			description: "tools/addGroupMember",
			parameters: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new member" }) }),
			suggest: ["resident"],
			execute: (params, ctx) => addGroupMember(ctx, params.groupId, params.agent),
		}),
		kit.tool({
			name: "removeGroupMember",
			description: "tools/removeGroupMember",
			parameters: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the member" }) }),
			suggest: ["resident"],
			execute: (params, ctx) => removeGroupMember(ctx, params.groupId, params.agent),
		}),
		kit.tool({
			name: "leaveGroup",
			description: "tools/leaveGroup",
			parameters: Type.Object({ groupId }),
			suggest: ["resident"],
			execute: (params, ctx) => leaveGroup(ctx, params.groupId),
		}),
		kit.tool({
			name: "listMyGroups",
			description: "tools/listMyGroups",
			parameters: Type.Object({}),
			suggest: ["resident"],
			execute: (_params, ctx) => listMyGroups(ctx),
		}),
		kit.tool({
			name: "postGroup",
			description: "tools/postGroup",
			parameters: Type.Object({ groupId, message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_GROUP_POST_LENGTH }) }),
			suggest: ["resident"],
			// The old precheck: a failing post costs no guard call.
			rule: (params, ctx) => {
				const checked = ctx.state.groups.checkPost(params.groupId, selfOf(ctx), params.message);
				return checked.ok ? undefined : groupFailure(checked);
			},
			guardText: ({ message }) => message,
			execute: (params, ctx) => postGroup(ctx, params.groupId, params.message),
		}),
		kit.tool({
			name: "readGroup",
			description: "tools/readGroup",
			parameters: Type.Object({ groupId, afterSeq: Type.Optional(Type.Integer({ description: "Only posts with a higher sequence", minimum: 0 })) }),
			suggest: ["resident"],
			execute: (params, ctx) => readGroup(ctx, params.groupId, params.afterSeq),
		}),
		kit.tool({
			name: "depositGroup",
			description: "tools/depositGroup",
			parameters: Type.Object({ groupId, amount: Type.Integer({ description: "Positive integer", minimum: 1 }) }),
			suggest: ["resident"],
			execute: (params, ctx) => depositGroup(ctx, params.groupId, params.amount),
		}),
		kit.tool({
			name: "withdrawGroup",
			description: "tools/withdrawGroup",
			parameters: Type.Object({
				groupId,
				target: Type.String({ description: "Recipient name or ID" }),
				amount: Type.Integer({ description: "Positive integer", minimum: 1 }),
			}),
			suggest: ["resident"],
			execute: (params, ctx) => withdrawGroup(ctx, params.groupId, params.target, params.amount),
		}),
		kit.tool({
			name: "setTreasurer",
			description: "tools/setTreasurer",
			parameters: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new treasurer" }) }),
			suggest: ["resident"],
			execute: (params, ctx) => setTreasurer(ctx, params.groupId, params.agent),
		}),
	];
}

