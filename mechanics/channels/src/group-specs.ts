// SPDX-License-Identifier: Apache-2.0
/** The declarations of the group tools of `channels` and the prompts they read: names, parameters and texts as on the old platform. */
import { Type } from "typebox";
import { MAX_GROUP_NAME_LENGTH, MAX_GROUP_POST_LENGTH } from "./group-types.ts";

const groupId = Type.String({ description: "Group ID, e.g. G1" });
const amount = Type.Integer({ description: "Positive integer", minimum: 1 });
const resident = ["resident"] as const;

/** The prompts of groups and treasuries, with their variables. */
export const GROUP_PROMPTS = {
	"channels/tools/createGroup": [],
	"channels/tools/addGroupMember": [],
	"channels/tools/removeGroupMember": [],
	"channels/tools/leaveGroup": [],
	"channels/tools/listMyGroups": [],
	"channels/tools/postGroup": [],
	"channels/tools/readGroup": [],
	"channels/tools/depositGroup": [],
	"channels/tools/withdrawGroup": [],
	"channels/tools/setTreasurer": [],
	"channels/replies/group-created": ["group"],
	"channels/replies/groups-none": [],
	"channels/replies/group-posted": ["group", "seq"],
	"channels/replies/group-older": ["older", "afterSeq"],
	"channels/notices/group-added": ["actor", "group", "name"],
	"channels/notices/city-group-added": ["group", "name"],
} as const;

/** The ten group tools, in the old order of the grant. */
export const GROUP_TOOLS = {
	createGroup: { description: "channels/tools/createGroup", params: Type.Object({ name: Type.String({ description: "Group name", minLength: 1, maxLength: MAX_GROUP_NAME_LENGTH }) }), for: resident },
	addGroupMember: { description: "channels/tools/addGroupMember", params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new member" }) }), for: resident },
	removeGroupMember: { description: "channels/tools/removeGroupMember", params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the member" }) }), for: resident },
	leaveGroup: { description: "channels/tools/leaveGroup", params: Type.Object({ groupId }), for: resident },
	listMyGroups: { description: "channels/tools/listMyGroups", params: Type.Object({}), for: resident },
	postGroup: { description: "channels/tools/postGroup", params: Type.Object({ groupId, message: Type.String({ description: "Text", minLength: 1, maxLength: MAX_GROUP_POST_LENGTH }) }), for: resident },
	readGroup: {
		description: "channels/tools/readGroup",
		params: Type.Object({ groupId, afterSeq: Type.Optional(Type.Integer({ description: "Only posts with a higher sequence", minimum: 0 })) }),
		for: resident,
	},
	depositGroup: { description: "channels/tools/depositGroup", params: Type.Object({ groupId, amount }), for: resident },
	withdrawGroup: { description: "channels/tools/withdrawGroup", params: Type.Object({ groupId, target: Type.String({ description: "Recipient name or ID" }), amount }), for: resident },
	setTreasurer: { description: "channels/tools/setTreasurer", params: Type.Object({ groupId, agent: Type.String({ description: "Name or ID of the new treasurer" }) }), for: resident },
};
