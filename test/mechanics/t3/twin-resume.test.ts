/**
 * Resume differential tests (docs/design/carve-round2-T3.md, must-fix 9): the old engine and the new
 * host both resume `examples/cityofkeys-act1-06a-04/snapshot-L7.json` (six residents held at door 7)
 * and play the same calls; replies, lines and state must continue identically.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { Twin, type TwinOptions } from "./twin.ts";

const PATH = resolve(import.meta.dirname, "../../../examples/cityofkeys-act1-06a-04/snapshot-L7.json");

function record(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object");
	return Object.fromEntries(Object.entries(value));
}

/** The old snapshot, parsed fresh, with its `world` changed by `mutate`. */
function snapshot(mutate: (world: Record<string, unknown>) => void = () => undefined): unknown {
	const raw = record(JSON.parse(readFileSync(PATH, "utf8")));
	const world = record(raw.world);
	mutate(world);
	return { ...raw, world };
}

const SNAPSHOT = snapshot();

/** The same file with the door gone and every level the old engine deals without it saved, so the resume deals the same again. */
function openDoorWithDealtLevels(world: Record<string, unknown>): void {
	delete world.door;
	world.competitors = (Array.isArray(world.competitors) ? world.competitors : []).map((entry) => ({ ...record(entry), held: false }));
	const dealt = new Twin({
		story: cityOfKeys,
		resume: snapshot((open) => {
			delete open.door;
			open.competitors = world.competitors;
		}),
	});
	world.levels = dealt.world.snapshot().levels;
}

/** Every resident reads status and tasks and submits (a wrong code first on odd minutes), then the minute ends. */
async function play(twin: Twin, minutes: number): Promise<void> {
	for (let count = 0; count < minutes; count++) {
		const minute = twin.nextMinute;
		await twin.minuteWith(async () => {
			for (const id of twin.ids) {
				await twin.same(id, "getStatus", {});
				await twin.same(id, "activeTools", {});
				const level = twin.world.levelOf(id);
				for (const asked of [level - 1, level, level + 1]) if (asked >= 1) await twin.same(id, "getProblem", { level: asked });
				if (twin.world.isFinished(id)) continue;
				if (minute % 2 === 1) await twin.same(id, "submitSolution", { level, code: "x".repeat(20) });
				await twin.same(id, "submitSolution", { level, code: twin.codeOf(id, level) });
			}
		});
		twin.expectSameLog();
		twin.expectSameState();
	}
}

/** What the old engine's log must hold (`has`) and must not hold (`lacks`) for the scenario to test what it names. */
interface Scenario {
	readonly name: string;
	readonly options: TwinOptions;
	readonly has?: readonly string[];
	readonly lacks?: readonly string[];
	/** Line types in the order their first lines must come (the old `#restore`: core motives, act starts, re-deal). */
	readonly order?: readonly string[];
	/** The scenario is right and the new host does not meet it yet; whose work it waits for. The test must fail until then (`it.fails`). */
	readonly waitsFor?: string;
}

const scenarios: readonly Scenario[] = [
	{ name: "the door opens at the first minute", options: { story: cityOfKeys, resume: SNAPSHOT } },
	{
		name: "a snapshot without door and act starts takes this run's door, the first act begins at minute 0",
		options: {
			story: cityOfKeys,
			holdAfter: 9,
			resume: snapshot((world) => {
				delete world.door;
				delete world.actStarts;
				world.competitors = (Array.isArray(world.competitors) ? world.competitors : []).map((entry) => ({ ...record(entry), held: false }));
			}),
		},
	},
	{
		name: "a saved deal of an unreached level that differs from the story is dealt again and announced",
		has: ['"type":"factors_dealt","level":8'],
		options: {
			story: cityOfKeys,
			resume: snapshot((world) => {
				// No door: level 8 is not behind one, nobody reached it, and its saved deal is another level's.
				delete world.door;
				world.competitors = (Array.isArray(world.competitors) ? world.competitors : []).map((entry) => ({ ...record(entry), held: false }));
				const levels: unknown[] = Array.isArray(world.levels) ? Array.from<unknown>(world.levels) : [];
				const last = record(levels[levels.length - 1]);
				world.levels = [...levels, { ...last, level: 8 }];
			}),
		},
	},
	{
		name: "a saved deal of an unreached level that equals the story's is kept and not announced again",
		lacks: ['"type":"factors_dealt"', '"type":"fragments_dealt"'],
		options: { story: cityOfKeys, resume: snapshot(openDoorWithDealtLevels) },
	},
	{
		name: "residents who reached an act in the file begin it at the resume, with its goals",
		has: ['"type":"goal_dealt","act":8'],
		order: ["goal_dealt", "factors_dealt"],
		options: {
			story: cityOfKeys,
			resume: snapshot((world) => {
				delete world.door;
				delete world.actStarts;
				world.competitors = (Array.isArray(world.competitors) ? world.competitors : []).map((entry) => ({ ...record(entry), held: false, level: 8, solved: [1, 2, 3, 4, 5, 6, 7] }));
			}),
		},
	},
	{
		name: "a file from before the core motives: they are dealt first, then the acts begin, then the levels are dealt again",
		has: ['"type":"motive_dealt"'],
		order: ["motive_dealt", "goal_dealt", "factors_dealt"],
		options: {
			story: cityOfKeys,
			realMotives: true,
			resume: snapshot((world) => {
				delete world.cores;
				delete world.door;
				delete world.actStarts;
				world.competitors = (Array.isArray(world.competitors) ? world.competitors : []).map((entry) => ({ ...record(entry), held: false, level: 8, solved: [1, 2, 3, 4, 5, 6, 7] }));
			}),
		},
	},
	{
		name: "a released door of a snapshot without a door is not released for this run's own door",
		options: {
			story: cityOfKeys,
			holdAfter: 9,
			resume: snapshot((world) => {
				delete world.door;
				world.doorReleased = true;
				world.competitors = (Array.isArray(world.competitors) ? world.competitors : []).map((entry) => ({ ...record(entry), held: false }));
			}),
		},
	},
	{ name: "a door after the last level holds nobody (the next door is clamped)", options: { story: cityOfKeys, resume: SNAPSHOT, holdAfter: 10 } },
	{
		name: "a released door stays released while it is the same door",
		options: { story: cityOfKeys, resume: snapshot((world) => (world.doorReleased = true)) },
	},
	{ name: "this run holds a further door after level 9", options: { story: cityOfKeys, resume: SNAPSHOT, holdAfter: 9 } },
	{ name: "the level 9 opens at minute 14", options: { story: { ...cityOfKeys, levels: cityOfKeys.levels.map((level) => (level.number === 9 ? { ...level, opensAt: 14 } : level)) }, resume: SNAPSHOT } },
];

async function runScenario({ options, has, lacks, order }: Scenario): Promise<void> {
	const twin = new Twin(options);
	await play(twin, 8);
	const old = twin.logs().old.join("\n");
	for (const part of has ?? []) expect(old).toContain(part);
	for (const part of lacks ?? []) expect(old).not.toContain(part);
	const firsts = (order ?? []).map((type) => old.indexOf(`"type":"${type}"`));
	expect(firsts.every((at) => at >= 0)).toBe(true);
	expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
	expect(twin.logs().old.length).toBeGreaterThan(5);
}

describe("twin: a resumed run continues as the old engine does", () => {
	it.each(scenarios.filter((scenario) => scenario.waitsFor === undefined))("$name", runScenario);
	it.fails.each(scenarios.filter((scenario) => scenario.waitsFor !== undefined))("waits: $name", runScenario);
});
