import { describe, expect, it } from "vitest";
import { parseStartArgs, UsageError } from "../../apps/cli/src/args.ts";
import { effectiveRun, resolveBlockSize } from "../../apps/cli/src/run-options.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { findStory } from "../../stories/index.ts";
import { tinyStory } from "../helpers/stories.ts";

describe("pnpm start arguments", () => {
	it("defaults to the cityofkeys story", () => {
		expect(parseStartArgs([])).toEqual({ story: "cityofkeys", overrides: {}, reporter: true, runsDirectory: "runs" });
	});

	it("parses every override", () => {
		const args = parseStartArgs([
			"--story", "cityofkeys", "--agents", "12", "--minutes", "20", "--seed", "0", "--provider", "scripted",
			"--model", "glm-flash", "--level", "3", "--stop-when-done", "--no-personas", "--no-gamemaker", "--runs", "out",
			"--gamemaker-provider", "anthropic", "--gamemaker-model", "haiku",
			"--no-classifier", "--classifier-provider", "openrouter", "--classifier-model", "perplexity/pplx-decider-v1.2",
		]);
		expect(args).toEqual({
			story: "cityofkeys",
			overrides: { agents: 12, minutes: 20, seed: 0, level: 3, stopWhenDone: true, personas: false, gamemaker: false, classifier: false },
			provider: "scripted",
			model: "glm-flash",
			gamemakerProvider: "anthropic",
			gamemakerModel: "haiku",
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
		expect(effectiveRun(cityOfKeys, { passesPerMinute: 1, blockSize: 6 })).toMatchObject({ passesPerMinute: 1, blockSize: 6 });
	});

	it("sizes the blocks to the agents when the story says auto (v08): one per six residents", () => {
		expect(cityOfKeys.run.blockSize).toBe("auto");
		expect([1, 6, 7, 12, 48, 96].map((agents) => resolveBlockSize("auto", agents))).toEqual([1, 1, 2, 2, 8, 16]);
		expect(resolveBlockSize(3, 48)).toBe(3);
		expect(effectiveRun(cityOfKeys, {}).blockSize).toBe(1);
		expect(effectiveRun(cityOfKeys, { agents: 48 }).blockSize).toBe(8);
		expect(effectiveRun(cityOfKeys, { agents: 48, blockSize: 4 }).blockSize).toBe(4);
	});

	it("parses --no-whisperer (the control run of a story with a whisperer) and --no-guards", () => {
		expect(parseStartArgs(["--story", "whispers", "--no-whisperer"])).toMatchObject({ overrides: { whisperer: false } });
		expect(parseStartArgs([]).overrides).not.toHaveProperty("whisperer");
		const whispers = findStory("whispers");
		if (whispers === undefined) throw new Error("whispers is not registered");
		expect(effectiveRun(whispers).whisperer).toBe(true);
		expect(effectiveRun(whispers, { whisperer: false }).whisperer).toBe(false);
		expect(effectiveRun(whispers).guards).toBe(true);
		expect(effectiveRun(whispers, { guards: false }).guards).toBe(false);
		expect(parseStartArgs(["--story", "whispers", "--no-guards"])).toMatchObject({ overrides: { guards: false } });
	});

	it("parses the judge's temper", () => {
		expect(parseStartArgs(["--judge-temper", "partial"]).judgeTemper).toBe("partial");
		expect(parseStartArgs([]).judgeTemper).toBeUndefined();
		expect(() => parseStartArgs(["--judge-temper", "cruel"])).toThrow(UsageError);
	});

	it("parses --budget as a positive number of USD (P47)", () => {
		expect(parseStartArgs(["--budget", "8"])).toMatchObject({ overrides: { budgetUsd: 8 } });
		expect(parseStartArgs(["--budget", "0.5"])).toMatchObject({ overrides: { budgetUsd: 0.5 } });
		expect(parseStartArgs([]).overrides).not.toHaveProperty("budgetUsd");
		expect(() => parseStartArgs(["--budget", "0"])).toThrow(/--budget/);
		expect(() => parseStartArgs(["--budget", "lots"])).toThrow(/--budget/);
	});

	it("parses the weaver's flags: off by default, its model only with --weaver", () => {
		expect(parseStartArgs([]).overrides.weaver).toBeUndefined();
		expect(parseStartArgs(["--weaver"])).toMatchObject({ overrides: { weaver: true } });
		expect(parseStartArgs(["--weaver", "--weaver-provider", "anthropic", "--weaver-model", "haiku"])).toMatchObject({ weaverProvider: "anthropic", weaverModel: "haiku" });
		expect(() => parseStartArgs(["--weaver-model", "haiku"])).toThrow(/need --weaver/);
	});

	it("parses the run reporter flags", () => {
		expect(parseStartArgs(["--no-reporter"])).toMatchObject({ reporter: false });
		expect(parseStartArgs(["--no-core-motives"])).toMatchObject({ overrides: { coreMotives: false } });
		expect(parseStartArgs(["--no-cores"])).toMatchObject({ overrides: { coreMotives: false } });
		expect(parseStartArgs(["--gamemaker-provider", "anthropic", "--gamemaker-model", "sonnet"])).toMatchObject({
			gamemakerProvider: "anthropic",
			gamemakerModel: "sonnet",
		});
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
		expect(effectiveRun(cityOfKeys)).toEqual({
			agents: 6,
			minutes: 80,
			seed: 7,
			startLevel: 1,
			lastLevel: 10,
			stopWhenDone: true,
			stopWhenSeatsDecided: true,
			activation: "onNovelty",
			passesPerMinute: 3,
			blockSize: 1,
			personas: true,
			gamemaker: false,
			classifier: false,
			names: true,
			coreMotives: true,
			figureDirection: 4,
			gmDirection: 4,
			whisperer: false,
			guards: false,
		});
		expect(effectiveRun(cityOfKeys, { figureDirection: 9, gmDirection: 5 })).toMatchObject({ figureDirection: 8, gmDirection: 4 });
		expect(effectiveRun(cityOfKeys, { coreMotives: false })).toMatchObject({ coreMotives: false });
		expect(effectiveRun(tinyStory())).toMatchObject({ coreMotives: false });
		expect(effectiveRun(cityOfKeys, { classifier: true })).toMatchObject({ classifier: true });
		expect(effectiveRun(tinyStory(), { classifier: true })).toMatchObject({ classifier: false });
		expect(effectiveRun(cityOfKeys, { gamemaker: true })).toMatchObject({ gamemaker: true });
		expect(effectiveRun(tinyStory(), { gamemaker: true })).toMatchObject({ gamemaker: false });
		expect(effectiveRun(cityOfKeys, { personas: false })).toMatchObject({ personas: false });
		expect(effectiveRun(cityOfKeys, { only: 4, agents: 3 })).toMatchObject({ agents: 3, startLevel: 4, lastLevel: 4, stopWhenDone: true, stopWhenSeatsDecided: false });
		expect(effectiveRun(cityOfKeys, { level: 2 })).toMatchObject({ startLevel: 2, lastLevel: 10 });
		expect(() => effectiveRun(cityOfKeys, { level: 2, only: 3 })).toThrow();
	});

	it("parses snapshot and resume flags (SPEC 17)", () => {
		expect(parseStartArgs(["--snapshot-after", "7", "--stop-after-snapshot"])).toEqual({
			story: "cityofkeys",
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
		expect(parseStartArgs(["--resume", "s.json", "--story", "cityofkeys"])).toMatchObject({ story: "cityofkeys", resume: "s.json" });
		expect(() => parseStartArgs(["--stop-after-snapshot"])).toThrow(/needs --snapshot-after/);
		expect(() => parseStartArgs(["--snapshot-after", "0"])).toThrow(/--snapshot-after must be an integer >= 1/);
		expect(() => parseStartArgs(["--resume", "s.json", "--level", "8"])).toThrow(/--level and --only do not apply/);
	});

	it("parses a pre-registration file for the signed log's genesis (step 18 challenge, chain-security M3)", () => {
		expect(parseStartArgs(["--preregistration", "istant/prereg.md"])).toMatchObject({ preregistration: "istant/prereg.md" });
		expect(parseStartArgs([])).not.toHaveProperty("preregistration");
	});

	it("parses a snapshot at a minute and a prompt addendum (lab/)", () => {
		expect(
			parseStartArgs(["--resume", "s.json", "--snapshot-at", "11", "--stop-after-snapshot", "--prompt-addendum", "lab/variants/B.md", "--prompt-addendum", "A01=lab/characters/verena.md"]),
		).toMatchObject({
			snapshotAt: 11,
			stopAfterSnapshot: true,
			promptAddenda: [{ file: "lab/variants/B.md" }, { agent: "A01", file: "lab/characters/verena.md" }],
		});
		expect(() => parseStartArgs(["--snapshot-after", "8", "--snapshot-at", "11"])).toThrow(/either --snapshot-after or --snapshot-at/);
	});

	it("parses the cast figures to play", () => {
		expect(parseStartArgs(["--cast", "banner, house,crier"])).toMatchObject({ overrides: { cast: ["banner", "house", "crier"] } });
		expect(() => parseStartArgs(["--cast", "banner,banner"])).toThrow(/twice/);
		expect(() => parseStartArgs(["--cast", "banner", "--no-core-motives"])).toThrow(/needs core motives/);
		expect(parseStartArgs(["--figure-direction", "10", "--gm-direction", "0"])).toMatchObject({ overrides: { figureDirection: 10, gmDirection: 0 } });
		expect(() => parseStartArgs(["--figure-direction", "11"])).toThrow(/from 0 to 10/);
		expect(() => parseStartArgs(["--gm-direction", "x"])).toThrow(/from 0 to 10/);
		expect(() => parseStartArgs(["--figure-direction", "6", "--no-cores"])).toThrow(/drop --no-core-motives/);
		// The lab plays the gamemaker's orders from a scene, without a live gamemaker.
		expect(parseStartArgs(["--gm-direction", "10", "--no-gamemaker"])).toMatchObject({ overrides: { gmDirection: 10, gamemaker: false } });
	});
});
