/**
 * The resident tools the old engine offered a story (`storyToolNames` of
 * packages/engine/src/tools/index.ts, copied for the tests that compare grants with it): every tool
 * of the catalog, in its order, but those only a story feature grants.
 */
import { TOOL_NAMES, type AnyStory, type ToolName } from "@swarmtales/contracts";

export function storyToolNames(story: AnyStory): readonly ToolName[] {
	return TOOL_NAMES.filter((name) => {
		if (name === "forgeReceipt") return story.whisperer?.forgery === true;
		if (name === "nameFavourite") return story.popularity !== undefined;
		if (name === "tribunalVote") return story.holdout !== undefined;
		return true;
	});
}
