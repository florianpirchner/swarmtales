/**
 * The Story tab draws the version of a story a signed run played, or says it does not: the lookup
 * checks each candidate against the genesis' `storyHash`, on recorded runs with today's stories.
 */
import { join, resolve } from "node:path";
import { storyData } from "@swarmtales/kernel";
import { loadRun, storyHashOf } from "@swarmtales/viewer-core";
import { describe, expect, it } from "vitest";
import { storyOfRun } from "../../packages/viewer-ui/src/story-lookup.ts";
import { coreStories } from "../../stories/index.ts";
import { fsRunSource } from "../helpers/fs-run-source.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const source = fsRunSource(ROOT);

/** Today's core stories as the web app's build exports them. */
function hostStories(names: readonly string[]): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const name of names) {
		const entry = coreStories[name];
		if (entry !== undefined) out[name] = JSON.parse(JSON.stringify(storyData(entry.story)));
	}
	return out;
}

describe("the story version of a recorded run", () => {
	it("finds the played version when today's story still hashes the same", async () => {
		const run = await loadRun(source, join("stories", "salt-market", "runs", "salt-market-04a-002-v2-s41", "run"));
		expect(storyOfRun(run, hostStories(["salt-market"]), storyHashOf)).toMatchObject({ id: "salt-market", from: "host", check: "matches" });
	});

	it("says so when only a shorter name's story is there, and it is another version", async () => {
		const run = await loadRun(source, join("stories", "ember-tricks", "runs", "ember-tricks-04a-001-smoke", "run"));
		expect(run.genesis?.story).toBe("ember-tricks-r4");
		expect(storyOfRun(run, hostStories(["ember-tricks"]), storyHashOf)).toMatchObject({ id: "ember-tricks", from: "host-prefix", check: "differs" });
	});

	it("hashes a story as the genesis does, and refuses a value that is no JSON", () => {
		expect(storyHashOf({ b: 1, a: 2 })).toBe(storyHashOf({ a: 2, b: 1 }));
		expect(storyHashOf({ a: undefined })).toBeUndefined();
	});
});
