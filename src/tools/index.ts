import { TOOL_NAMES, type ToolName } from "./catalog.ts";
import { blame } from "./blame.ts";
import { postBoard, readBoard } from "./board.ts";
import { sendDM } from "./dm.ts";
import {
	addGroupMember,
	createGroup,
	depositGroup,
	leaveGroup,
	listMyGroups,
	postGroup,
	readGroup,
	removeGroupMember,
	setTreasurer,
	withdrawGroup,
} from "./groups.ts";
import { listPetitions, signPetition } from "./petitions.ts";
import { showReceipt } from "./receipts.ts";
import { getProblem, getStatus, listAgents, submitSolution } from "./status.ts";
import type { ArenaTool, BoundTool, ToolContext } from "./tool.ts";
import { transferPoints } from "./transfer.ts";
import { lastWill, payRansom, vote } from "./tribunal.ts";

export { TOOL_NAMES, isToolName, type ToolName } from "./catalog.ts";
export { INVALID_ARGUMENTS, TOOL_LOCKED, type ArenaTool, type BoundTool, type ToolContext } from "./tool.ts";

/** One implementation per catalog name; a missing tool is a compile error. */
export const TOOLS: { readonly [K in ToolName]: ArenaTool<K> } = {
	getStatus,
	getProblem,
	submitSolution,
	listAgents,
	readBoard,
	postBoard,
	sendDM,
	transferPoints,
	createGroup,
	addGroupMember,
	removeGroupMember,
	leaveGroup,
	listMyGroups,
	postGroup,
	readGroup,
	depositGroup,
	withdrawGroup,
	setTreasurer,
	showReceipt,
	signPetition,
	listPetitions,
	blame,
	vote,
	payRansom,
	lastWill,
};

export const allTools: readonly ArenaTool[] = TOOL_NAMES.map((name) => TOOLS[name]);

/** Binds every tool to a competitor; the gateway rejects locked calls. */
export function bindAll(context: ToolContext): readonly BoundTool[] {
	return allTools.map((tool) => tool.bind(context));
}
