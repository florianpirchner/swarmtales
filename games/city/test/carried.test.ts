// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (`12-m5-spec.md` 2.5, rules 7 and 8): the story data serialises to the old
 * platform's own dump of the definition (`oracles/cityofkeys/setup/cityofkeys.story.json`, old `definitionText`: the
 * JSON without its model blocks, tab-indented), the model blocks of the old story are the game's, and every prompt
 * file of the game's mechanics, its Directors and the library carries the body of its old file.
 *
 * `prompt-pins.json` maps each prompt file to the old file whose body it carries and pins the sha256 of that old
 * body, computed on `legacy` (the map and the registered changes are those of `games/whispers/test/prompt-pins.json`,
 * J145, J189, J201, G11).
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { CITY } from "../src/story.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");

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

// The prompt folders: the mechanics of the files' setup, the Directors' package and the library.
const MECHANICS = ["ledger", "marks", "names", "channels", "petitions", "motives", "receipts", "puzzles", "progression", "cast", "goals", "standoff", "exile", "tribunal", "seal", "script", "arena", "city-directors"];
const FOLDERS = [...MECHANICS.map((id) => join("mechanics", id, "prompts")), join("library", "prompts")];
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

describe("city: carried byte for byte", () => {
	it("serialises the story data to its old setup file", () => {
		expect(`${JSON.stringify(withoutModels(CITY), null, "\t")}\n`).toBe(readFileSync(join(ROOT, "oracles", "cityofkeys", "setup", "cityofkeys.story.json"), "utf8"));
	});

	it("carries the model blocks of the old story", () => {
		expect(CITY.model).toEqual({ provider: "openrouter", id: "z-ai/glm-5.3-flash", routing: { order: ["open-inference"], allowFallbacks: false }, thinking: "medium" });
		expect(CITY.gamemaker.model).toEqual({ provider: "openrouter", id: "deepseek/deepseek-v4.1-flash-1017", thinking: "high", maxOutputTokens: 393216 });
		expect(CITY.classifier.model).toEqual({ provider: "anthropic", id: "claude-haiku-5-5", thinking: "off" });
	});

	it("pins every prompt file to the body of its old file", () => {
		const files = FOLDERS.flatMap(filesOf).sort();
		expect(files.length).toBeGreaterThan(250);
		expect(Object.keys(PINS).sort()).toEqual(files);
		for (const file of files) {
			const pin = PINS[file];
			const body = (pin?.undo ?? []).reduce((text, [now, old]) => text.split(now).join(old), bodyOf(readFileSync(join(ROOT, file), "utf8")));
			expect(sha256(body), `${file} (old ${pin?.legacy ?? "none"})`).toBe(pin?.sha256);
		}
	});
});
