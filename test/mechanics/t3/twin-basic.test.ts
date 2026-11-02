/**
 * Differential tests of puzzles and progression against the old engine (docs/design/carve-round2-T3.md):
 * the same calls and minutes on the old `World` and on the new host; replies, lines and state compared.
 */
import { describe, expect, it } from "vitest";
import type { AnyStory } from "@swarmtales/contracts";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import whispers from "../../../stories/whispers/story.ts";
import { Twin, type TwinOptions } from "./twin.ts";

/** A copy of the story whose level `number` opens at minute `at`. */
function withDoor(story: AnyStory, number: number, at: number): AnyStory {
	return { ...story, levels: story.levels.map((level) => (level.number === number ? { ...level, opensAt: at } : level)) };
}

/** Every resident reads status and tasks and submits (a wrong code on odd minutes), then the minute ends. */
async function playRun(twin: Twin, minutes: number, wrongOn: (minute: number, id: string) => boolean = (minute) => minute % 2 === 1): Promise<void> {
	for (let minute = 0; minute < minutes; minute++) {
		await twin.minuteWith(async () => {
			for (const id of twin.ids) {
				await twin.same(id, "getStatus", {});
				await twin.same(id, "activeTools", {});
				await twin.same(id, "listAgents", {});
				const level = twin.world.levelOf(id);
				for (const asked of [level - 1, level, level + 1, 99]) if (asked >= 1) await twin.same(id, "getProblem", { level: asked });
				if (twin.world.isFinished(id)) {
					await twin.same(id, "submitSolution", { level, code: "ZZ" });
					continue;
				}
				if (wrongOn(minute, id)) await twin.same(id, "submitSolution", { level, code: "x".repeat(20) });
				await twin.same(id, "submitSolution", { level, code: twin.codeOf(id, level) });
				await twin.same(id, "getStatus", {});
			}
		});
		twin.expectSameLog();
		twin.expectSameState();
	}
}

const scenarios: readonly { readonly name: string; readonly options: () => TwinOptions; readonly minutes: number }[] = [
	{ name: "cityofkeys, no door", options: () => ({ story: cityOfKeys }), minutes: 14 },
	{ name: "cityofkeys with a door after level 3", options: () => ({ story: cityOfKeys, holdAfter: 3 }), minutes: 14 },
	{ name: "cityofkeys with a door after level 7", options: () => ({ story: cityOfKeys, holdAfter: 7 }), minutes: 14 },
	{ name: "cityofkeys with level 3 opening at minute 4", options: () => ({ story: withDoor(cityOfKeys, 3, 4) }), minutes: 14 },
	{ name: "whispers", options: () => ({ story: whispers }), minutes: 14 },
	{ name: "other seed", options: () => ({ story: cityOfKeys, seed: 11 }), minutes: 14 },
];

describe("twin: puzzles and progression against the old engine", () => {
	it.each(scenarios)("$name: replies, lines and state agree every minute", async ({ options, minutes }) => {
		const twin = new Twin(options());
		await playRun(twin, minutes);
		expect(twin.logs().old.length).toBeGreaterThan(10);
	});

	it("refuses with the same code and text in the same order", async () => {
		const twin = new Twin({ story: cityOfKeys });
		await twin.minuteWith(async () => {
			const refusals = new Set<string>();
			const record = async (agent: string, tool: string, args: unknown): Promise<void> => {
				const pair = await twin.call(agent, tool, args);
				expect(pair.now).toBe(pair.old);
				refusals.add(pair.old.split(":")[0] ?? "");
			};
			await record("A01", "submitSolution", { level: 2, code: "AAAA" });
			await record("A01", "submitSolution", { level: 99, code: "AAAA" });
			await record("A01", "submitSolution", { level: 1, code: "A" });
			for (let attempt = 0; attempt < 8; attempt++) await record("A01", "submitSolution", { level: 1, code: "Q".repeat(twin.codeOf("A01", 1).length) });
			await record("A01", "submitSolution", { level: 1, code: twin.codeOf("A01", 1) });
			await record("A01", "getProblem", { level: 5 });
			await record("A02", "submitSolution", { level: 1, code: twin.codeOf("A02", 1) });
			await record("A02", "submitSolution", { level: 1, code: twin.codeOf("A02", 1) });
			expect(refusals.size).toBeGreaterThan(2);
		});
		twin.expectSameLog();
		twin.expectSameState();
	});
});
