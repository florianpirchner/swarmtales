// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (`12-m5-spec.md` 2.5, rules 7 and 8): the story data serialises to the old
 * platform's own dump of the definition (`oracles/whispers/setup/*.story.json`, old `definitionText`: the JSON
 * without its model blocks, tab-indented), the model blocks of the old story are the game's, and every prompt file
 * of the game's mechanics, its Directors, the library and the game carries the body of its old file.
 *
 * `prompt-pins.json` maps each prompt file to the old file whose body it carries (the map of old to new ids, J145,
 * J189, J201) and pins the sha256 of that old body, computed on `legacy`. A file's front matter is not compared: it
 * holds the id, which moved. A registered change (`undo`, with its erratum) names the new words and the old ones
 * they stand for; the body with the old words put back hashes to the pin.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createPromptLookup } from "@swarmtales/prompts";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { whispersData } from "../src/story.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SETUP = join(ROOT, "oracles", "whispers", "setup");

const Pins = Type.Record(
	Type.String(),
	Type.Object({
		legacy: Type.String({ description: "The old file whose body is carried" }),
		sha256: Type.String({ description: "The sha256 of the old body" }),
		erratum: Type.Optional(Type.String({ description: "The erratum of a registered change" })),
		undo: Type.Optional(Type.Array(Type.Tuple([Type.String(), Type.String()]), { description: "The new words and the old ones they stand for" })),
	}),
	{ description: "The prompt pins of the game, by file" },
);
const PINS = Value.Parse(Pins, JSON.parse(readFileSync(join(import.meta.dirname, "prompt-pins.json"), "utf8")));

// The prompt folders: the mechanics of the files' setup, the Directors' package, the library and the game.
const MECHANICS = ["ledger", "marks", "names", "channels", "petitions", "receipts", "whispers", "motives", "puzzles", "progression", "cast", "standoff", "exile", "standoff-tribunal", "script", "arena", "city-directors"];
const FOLDERS = [...MECHANICS.map((id) => join("mechanics", id, "prompts")), join("library", "prompts"), join("games", "whispers", "prompts")];
const walk = (folder: string): readonly string[] => readdirSync(join(ROOT, folder), { recursive: true, encoding: "utf8" }).filter((name) => name.endsWith(".md")).map((name) => relative(ROOT, join(ROOT, folder, name)));
// `arena` has no prompt folder.
const filesOf = (folder: string): readonly string[] => (existsSync(join(ROOT, folder)) ? walk(folder) : []);
const bodyOf = (text: string): string => text.slice(text.indexOf("\n---\n") + 5);
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

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

	it("pins every prompt file to the body of its old file", () => {
		const files = FOLDERS.flatMap(filesOf).sort();
		expect(files.length).toBeGreaterThan(300);
		expect(Object.keys(PINS).sort()).toEqual(files);
		for (const file of files) {
			const pin = PINS[file];
			const body = (pin?.undo ?? []).reduce((text, [now, old]) => text.split(now).join(old), bodyOf(readFileSync(join(ROOT, file), "utf8")));
			expect(sha256(body), `${file} (old ${pin?.legacy ?? "none"})`).toBe(pin?.sha256);
		}
	});

	it("shows the old quoted receipt in the description of showReceipt (J68)", () => {
		const text = createPromptLookup({ game: join(import.meta.dirname, "..", "prompts") }).render("receipts", "receipts/tools/showReceipt", {}, []);
		expect(text).toContain("and quotes the DM word for word");
	});
});
