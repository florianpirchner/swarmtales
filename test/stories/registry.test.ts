import { describe, expect, it } from "vitest";
import { DIRECTOR_SUPPORT } from "@swarmtales/contracts";
import { DEFAULT_STORY, findStory, STORIES, storyNames } from "../../stories/index.ts";
import { validateStory } from "@swarmtales/sdk";

describe("story registry", () => {
	it("contains the default story", () => {
		expect(storyNames()).toContain(DEFAULT_STORY);
		expect(findStory(DEFAULT_STORY)?.id).toBe(DEFAULT_STORY);
		expect(findStory("toString")).toBeUndefined();
		expect(findStory("missing")).toBeUndefined();
	});

	it.each(Object.entries(STORIES))("story %s round-trips through JSON unchanged", (_name, story) => {
		const serialized = JSON.stringify(story);
		expect(JSON.parse(serialized)).toEqual(story);
		expect(JSON.stringify(JSON.parse(serialized))).toBe(serialized);
	});

	it.each(Object.entries(STORIES))("story %s is registered under its id and valid", (name, story) => {
		expect(story.id).toBe(name);
		expect(validateStory(story, { support: DIRECTOR_SUPPORT })).toEqual([]);
	});
});
