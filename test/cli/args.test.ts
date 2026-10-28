import { describe, expect, it } from "vitest";
import { parseStartArgs, UsageError } from "../../src/cli/args.ts";
import { effectiveRun, resolveBlockSize } from "../../src/cli/compose.ts";
import nexus from "../../stories/nexus/story.ts";
import { tinyStory } from "../helpers/stories.ts";

describe("pnpm start arguments", () => {
	it("defaults to the nexus story", () => {
		expect(parseStartArgs([])).toEqual({ story: "nexus", overrides: {}, reporter: true, runsDirectory: "runs" });
	});

	it("parses every override", () => {
		const args = parseStartArgs([
			"--story", "nexus", "--agents", "12", "--minutes", "20", "--seed", "0", "--provider", "scripted",
			"--model", "glm-flash", "--level", "3", "--stop-when-done", "--no-personas", "--no-gamemaster", "--runs", "out",
			"--gamemaster-provider", "anthropic", "--gamemaster-model", "haiku",
			"--no-classifier", "--classifier-provider", "openrouter", "--classifier-model", "perplexity/pplx-decider-v1.2",
		]);
		expect(args).toEqual({
			story: "nexus",
			overrides: { agents: 12, minutes: 20, seed: 0, level: 3, stopWhenDone: true, personas: false, gamemaster: false, classifier: false },
			provider: "scripted",
			model: "glm-flash",
			gamemasterProvider: "anthropic",
			gamemasterModel: "haiku",
			classifierProvider: "openrouter",
			classifierModel: "perplexity/pplx-decider-v1.2",
			reporter: true,
			runsDirectory: "out",
		});
	});

	it("parses the scheduler flags (SPEC 3)", () => {
		expect(parseStartArgs(["--passes", "2", "--block-size", "3"])).toMatchObject({ overrides: { passesPerMinute: 2, blockSize: 3 } });
		expect(() => parseStartArgs(["--passes", "0"])).toThrow(/--passes must be an integer >= 1/);
		expect(() => parseStartArgs(["--passes", "6"])).toThrow(/--passes must be at most 5/);
		expect(() => parseStartArgs(["--block-size", "0"])).toThrow(/--block-size must be an integer >= 1/);
		expect(effectiveRun(nexus, { passesPerMinute: 1, blockSize: 6 })).toMatchObject({ passesPerMinute: 1, blockSize: 6 });
	});

	it("sizes the blocks to the agents when the story says auto (v08): one per six residents", () => {
		expect(nexus.run.blockSize).toBe("auto");
		expect([1, 6, 7, 12, 48, 96].map((agents) => resolveBlockSize("auto", agents))).toEqual([1, 1, 2, 2, 8, 16]);
		expect(resolveBlockSize(3, 48)).toBe(3);
		expect(effectiveRun(nexus, {}).blockSize).toBe(1);
		expect(effectiveRun(nexus, { agents: 48 }).blockSize).toBe(8);
		expect(effectiveRun(nexus, { agents: 48, blockSize: 4 }).blockSize).toBe(4);
	});

	it("parses the run reporter flags", () => {
		expect(parseStartArgs(["--no-reporter"])).toMatchObject({ reporter: false });
		expect(parseStartArgs(["--reporter-provider", "anthropic", "--reporter-model", "haiku"])).toMatchObject({
			reporter: true,
			reporterProvider: "anthropic",
			reporterModel: "haiku",
		});
		expect(() => parseStartArgs(["--no-reporter", "--reporter-model", "haiku"])).toThrow(/--no-reporter/);
	});

	it("rejects invalid numbers, unknown flags and --level with --only", () => {
		expect(() => parseStartArgs(["--agents", "two"])).toThrow(UsageError);
		expect(() => parseStartArgs(["--minutes", "0"])).toThrow(/--minutes must be an integer >= 1/);
		expect(() => parseStartArgs(["--nope"])).toThrow(UsageError);
		expect(() => parseStartArgs(["--level", "2", "--only", "3"])).toThrow(UsageError);
	});

	it("applies overrides to the story's run parameters", () => {
		expect(effectiveRun(nexus)).toEqual({
			agents: 6,
			minutes: 60,
			seed: 7,
			startLevel: 1,
			lastLevel: 10,
			stopWhenDone: true,
			stopWhenSeatsDecided: true,
			activation: "onNovelty",
			passesPerMinute: 3,
			blockSize: 1,
			personas: true,
			gamemaster: false,
			classifier: false,
		});
		expect(effectiveRun(nexus, { classifier: true })).toMatchObject({ classifier: true });
		expect(effectiveRun(tinyStory(), { classifier: true })).toMatchObject({ classifier: false });
		expect(effectiveRun(nexus, { gamemaster: true })).toMatchObject({ gamemaster: true });
		expect(effectiveRun(tinyStory(), { gamemaster: true })).toMatchObject({ gamemaster: false });
		expect(effectiveRun(nexus, { personas: false })).toMatchObject({ personas: false });
		expect(effectiveRun(nexus, { only: 4, agents: 3 })).toMatchObject({ agents: 3, startLevel: 4, lastLevel: 4, stopWhenDone: true, stopWhenSeatsDecided: false });
		expect(effectiveRun(nexus, { level: 2 })).toMatchObject({ startLevel: 2, lastLevel: 10 });
		expect(() => effectiveRun(nexus, { level: 2, only: 3 })).toThrow();
	});

	it("parses snapshot and resume flags (SPEC 17)", () => {
		expect(parseStartArgs(["--snapshot-after", "7", "--stop-after-snapshot"])).toEqual({
			story: "nexus",
			overrides: {},
			reporter: true,
			runsDirectory: "runs",
			snapshotAfter: 7,
			stopAfterSnapshot: true,
		});
		// Without --story a resumed run plays the snapshot's story.
		expect(parseStartArgs(["--resume", "runs/run-001/snapshot-L7.json", "--provider", "anthropic", "--minutes", "40"])).toEqual({
			overrides: { minutes: 40 },
			provider: "anthropic",
			reporter: true,
			runsDirectory: "runs",
			resume: "runs/run-001/snapshot-L7.json",
		});
		expect(parseStartArgs(["--resume", "s.json", "--story", "nexus"])).toMatchObject({ story: "nexus", resume: "s.json" });
		expect(() => parseStartArgs(["--stop-after-snapshot"])).toThrow(/needs --snapshot-after/);
		expect(() => parseStartArgs(["--snapshot-after", "0"])).toThrow(/--snapshot-after must be an integer >= 1/);
		expect(() => parseStartArgs(["--resume", "s.json", "--level", "8"])).toThrow(/--level and --only do not apply/);
	});
});
