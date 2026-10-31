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

const scenarios: readonly { readonly name: string; readonly options: TwinOptions }[] = [
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
		options: {
			story: cityOfKeys,
			resume: snapshot((world) => {
				const levels = Array.isArray(world.levels) ? world.levels : [];
				const last = record(levels[levels.length - 1]);
				world.levels = [...levels, { ...last, level: 8 }];
			}),
		},
	},
	{
		name: "a released door stays released while it is the same door",
		options: { story: cityOfKeys, resume: snapshot((world) => (world.doorReleased = true)) },
	},
	{ name: "this run holds a further door after level 9", options: { story: cityOfKeys, resume: SNAPSHOT, holdAfter: 9 } },
	{ name: "the level 9 opens at minute 14", options: { story: { ...cityOfKeys, levels: cityOfKeys.levels.map((level) => (level.number === 9 ? { ...level, opensAt: 14 } : level)) }, resume: SNAPSHOT } },
];

describe("twin: a resumed run continues as the old engine does", () => {
	it.each(scenarios)("$name", async ({ options }) => {
		const twin = new Twin(options);
		await play(twin, 8);
		expect(twin.logs().old.length).toBeGreaterThan(5);
	});
});
