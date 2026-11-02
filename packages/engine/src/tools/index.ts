import { type AnyStory, TOOL_NAMES, type ToolName } from "@swarmtales/contracts";
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
import { chooseName } from "./names.ts";
import { defy } from "./defy.ts";
import { claimPiece } from "./pieces.ts";
import { listPetitions, signPetition } from "./petitions.ts";
import { showQuotedReceipt, showReceipt } from "./receipts.ts";
import { bid, permaDeath } from "./seal.ts";
import { activeTools, getProblem, getStatus, listAgents, submitSolution } from "./status.ts";
import type { ArenaTool, BoundTool, ToolContext } from "./tool.ts";
import { transferPoints } from "./transfer.ts";
import { join, lastWill, nominate, payRansom, refuse, vote } from "./tribunal.ts";
import { forgeReceipt, nameFavourite, tribunalVote } from "./whispers.ts";

export { TOOL_NAMES, isToolName, type ToolName } from "@swarmtales/contracts";
export { INVALID_ARGUMENTS, LOCKED_REPLY, TOOL_LOCKED, type ArenaTool, type BoundTool, type ToolContext } from "./tool.ts";

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
	nominate,
	join,
	refuse,
	chooseName,
	bid,
	permaDeath,
	defy,
	claimPiece,
	forgeReceipt,
	nameFavourite,
	tribunalVote,
	activeTools,
};

export const allTools: readonly ArenaTool[] = TOOL_NAMES.map((name) => TOOLS[name]);

/**
 * Every tool a story may ever show: all of them but those only a story
 * feature grants (Whispers) when the story lacks that feature. So the City of
 * Keys sees the same tools as before they existed, and nobody there reads
 * that receipts can be forged.
 */
export function storyToolNames(story: AnyStory): readonly ToolName[] {
	return TOOL_NAMES.filter((name) => {
		if (name === "forgeReceipt") return story.whisperer?.forgery === true;
		if (name === "nameFavourite") return story.popularity !== undefined;
		if (name === "tribunalVote") return story.holdout !== undefined;
		return true;
	});
}

/**
 * Binds a story's tools (storyToolNames) to a competitor. Where DM receipts
 * quote their text, showReceipt says so; elsewhere every schema is the
 * catalog's, byte for byte (the prompt cache, P46).
 */
export function bindStory(context: ToolContext, story: AnyStory): readonly BoundTool[] {
	const quoted = story.rules.receipts?.quoteDms === true;
	return storyToolNames(story).map((name) => (quoted && name === "showReceipt" ? showQuotedReceipt : TOOLS[name]).bind(context));
}

/** Binds every tool to a competitor (or the `names` given); the gateway rejects locked calls. */
export function bindAll(context: ToolContext, names: readonly ToolName[] = TOOL_NAMES): readonly BoundTool[] {
	return names.map((name) => TOOLS[name].bind(context));
}
