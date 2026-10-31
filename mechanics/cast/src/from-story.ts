/**
 * The options of `cast` as the story gives them: its cast members (`story.cast`) and the collections
 * its director rules can start (`collectDms`, in the order of the rules, the actions of a petition or
 * a lottery after the rule's own). The order matters: windows that end after a solve are shortened
 * in the story's rule order (old `director.#endCollectionsAfterSolve`).
 */
import type { Action, AnyStory } from "@swarmtales/contracts";

/** What `cast.with(...)` takes from a story. */
export interface CastStoryOptions {
	members: Record<string, { level: number; hidden?: boolean; escrow?: number }>;
	collections: string[];
}

/** The `into` of every `collectDms` in `actions`, depth first (a petition's `onPass`/`onFail`, a lottery's `then`). */
function collectionsIn(actions: readonly Action[]): readonly string[] {
	return actions.flatMap((action): readonly string[] => {
		switch (action.kind) {
			case "collectDms":
				return [action.into];
			case "openPetition":
				return collectionsIn([...action.petition.onPass, ...action.petition.onFail]);
			case "lottery":
				return collectionsIn(action.then);
			default:
				return [];
		}
	});
}

/** The cast options of a story: members as the story declares them, collections in rule order without repeats. */
export function castOptionsFromStory(story: Pick<AnyStory, "cast" | "director">): CastStoryOptions {
	const members = Object.fromEntries(
		Object.entries(story.cast).map(([id, member]) => [
			id,
			{ level: member.level, ...(member.hidden === undefined ? {} : { hidden: member.hidden }), ...(member.escrow === undefined ? {} : { escrow: member.escrow }) },
		]),
	);
	return { members, collections: [...new Set(story.director.flatMap((rule) => collectionsIn(rule.actions)))] };
}
