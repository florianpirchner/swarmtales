/** What the lookup reads of a run (a `RunModel` has all of it). */
export interface StoryHints {
	readonly name: string;
	readonly meta?: { readonly storyId?: string; readonly story?: unknown };
	readonly genesis?: { readonly story: string };
}

export interface FoundStory {
	readonly id: string;
	readonly story: unknown;
}

/** Story ids a run may be filed under: its own, then shorter names (`chess-p80` is a variant of `chess`). */
function candidates(id: string): readonly string[] {
	const parts = id.split("-");
	return parts.map((_part, index) => parts.slice(0, parts.length - index).join("-"));
}

/**
 * The story of a run: the host's story with the run's `storyId` (or the genesis' `story`), else the
 * same name without its variant suffixes, else the story the run's own `000-run.json` carries.
 */
export function storyOfRun(model: StoryHints, stories: Readonly<Record<string, unknown>> = {}): FoundStory | undefined {
	const ids = [model.meta?.storyId, model.genesis?.story].filter((id): id is string => id !== undefined);
	for (const id of ids.flatMap(candidates)) {
		const story = Object.entries(stories).find(([key]) => key === id)?.[1];
		if (story !== undefined) return { id, story };
	}
	const own = model.meta?.story;
	return own === undefined ? undefined : { id: ids[0] ?? model.name, story: own };
}
