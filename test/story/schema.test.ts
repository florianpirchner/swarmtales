import { describe, expect, it } from "vitest";
import { StorySchema, storyJsonSchema } from "@swarmtales/contracts";
import { parseStoryData } from "@swarmtales/sdk";
import { STORIES } from "../../stories/index.ts";
import { tinyStory } from "../helpers/stories.ts";

/** A story as a file would hold it: plain data, every type erased. */
function plain(story: unknown): unknown {
	return JSON.parse(JSON.stringify(story));
}

describe("story schema", () => {
	it.each(Object.entries(STORIES))("accepts the registered story %s as plain data", (_name, story) => {
		const parsed = parseStoryData(plain(story));
		expect(parsed.issues).toBeUndefined();
		expect(parsed.story).toEqual(story);
	});

	it("is a JSON schema with an id and the story's fields", () => {
		expect(plain(StorySchema)).toMatchObject({ $id: "https://swarmtales.dev/story.schema.json", properties: { levels: { type: "array" } } });
	});

	it("writes a standalone JSON schema: every $ref points into the root's $defs", () => {
		const document = storyJsonSchema();
		const text = JSON.stringify(document);
		const refs = [...text.matchAll(/"\$ref":"([^"]*)"/g)].map((match) => match[1]);
		expect(refs.length).toBeGreaterThan(0);
		const definitions: unknown = document.$defs;
		const defined = typeof definitions === "object" && definitions !== null ? Object.keys(definitions) : [];
		expect(defined).toEqual(expect.arrayContaining(["Action", "Petition"]));
		for (const ref of refs) expect(defined.map((name) => `#/$defs/${name}`)).toContain(ref);
		expect(text.match(/"\$defs"/g)).toHaveLength(1);
	});

	it("names the path of a wrong field", () => {
		const story = tinyStory();
		const [first] = story.levels;
		const data = { ...story, levels: [{ ...first, reward: "lots" }] };
		expect(parseStoryData(data).issues?.join("\n")).toContain("/levels/0/reward");
	});

	it("rejects an unknown tool name and an unknown trigger", () => {
		const story = tinyStory();
		const [first] = story.levels;
		expect(parseStoryData({ ...story, levels: [{ ...first, tools: ["teleport"] }] }).issues?.join("\n")).toContain("/levels/0/tools/0");
		const rule = { id: "x", trigger: { kind: "whenever" }, when: [], actions: [] };
		expect(parseStoryData({ ...story, director: [rule] }).issues?.length).toBeGreaterThan(0);
	});

	it("runs the cross-field rules after the schema", () => {
		const story = tinyStory();
		const parsed = parseStoryData({ ...story, run: { ...story.run, survivors: 99 } });
		expect(parsed.story).toBeUndefined();
		expect(parsed.issues?.join("\n")).toContain("run.survivors");
	});
});
