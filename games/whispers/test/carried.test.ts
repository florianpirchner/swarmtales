// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (`12-m5-spec.md` 2.5, rules 7 and 8): the story data serialises to the old
 * platform's own dump of the definition (`oracles/whispers/setup/*.story.json`, old `definitionText`: the JSON
 * without its model blocks, tab-indented), and the model blocks of the old story are the game's.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { whispersData } from "../src/story.ts";

const SETUP = join(import.meta.dirname, "..", "..", "..", "oracles", "whispers", "setup");

// The old `withoutModels`: every `model` key left out, at any depth.
function withoutModels(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(withoutModels);
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(Object.entries(value).flatMap(([key, entry]): [string, unknown][] => (key === "model" ? [] : [[key, withoutModels(entry)]])));
}

describe("whispers: carried byte for byte", () => {
	it.each([
		["whispers", true],
		["whispers-rumours", false],
	] as const)("the story data of %s serialises to its old setup file", (name, receipts) => {
		expect(`${JSON.stringify(withoutModels(whispersData(receipts)), null, "\t")}\n`).toBe(readFileSync(join(SETUP, `${name}.story.json`), "utf8"));
	});

	it("carries the model blocks of the old story", () => {
		const story = whispersData(true);
		expect(story.model).toEqual({ provider: "anthropic", id: "claude-haiku-5-5", thinking: "low" });
		expect(story.gamemaker.model).toEqual({ provider: "openrouter", id: "deepseek/deepseek-v4.1-flash-1017", thinking: "high", maxOutputTokens: 393216 });
		expect([story.classifier.model, story.guards.model]).toEqual([0, 1].map(() => ({ provider: "anthropic", id: "claude-haiku-5-5", thinking: "off" })));
	});
});
