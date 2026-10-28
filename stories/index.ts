/** Registry of shipped stories, by name (`pnpm start --story <name>`). */
import type { AnyStory } from "../src/story/types.ts";
import nexus from "./nexus/story.ts";

export const DEFAULT_STORY = "nexus";

export const STORIES: Readonly<Record<string, AnyStory>> = {
	nexus,
};

export function storyNames(): readonly string[] {
	return Object.keys(STORIES);
}

export function findStory(name: string): AnyStory | undefined {
	return Object.hasOwn(STORIES, name) ? STORIES[name] : undefined;
}
