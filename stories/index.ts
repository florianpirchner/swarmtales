/** Registry of shipped stories, by name (`pnpm start --story <name>`). */
import type { AnyStory } from "@swarmtales/contracts";
import cityOfKeys from "./cityofkeys/story.ts";
import whispers, { whispersStory } from "./whispers/story.ts";

export const DEFAULT_STORY = "cityofkeys";

export const STORIES: Readonly<Record<string, AnyStory>> = {
	cityofkeys: cityOfKeys,
	whispers,
	// The paper's second factor: no receipts to show, word against word.
	"whispers-rumours": whispersStory(false),
};

/** Earlier names of a story; snapshots and runs recorded before a rename still find it. */
const ALIASES: Readonly<Record<string, string>> = { nexus: "cityofkeys" };

export function storyNames(): readonly string[] {
	return Object.keys(STORIES);
}

/** The current name of a story: "nexus" is now "cityofkeys". */
export function storyId(name: string): string {
	return Object.hasOwn(ALIASES, name) ? (ALIASES[name] ?? name) : name;
}

export function findStory(name: string): AnyStory | undefined {
	const id = storyId(name);
	return Object.hasOwn(STORIES, id) ? STORIES[id] : undefined;
}
