/**
 * Conformance of the T3 mechanics (testkit checks): options documented, sources free of forbidden
 * imports and globals, file sizes within the carve rule (400 non-blank lines).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { goals } from "@swarmtales/mechanic-goals";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { checkOptionsDocumented, checkSourceRules } from "@swarmtales/testkit";

const MECHANICS = [
	{ id: "puzzles", definition: puzzles },
	{ id: "progression", definition: progression },
	{ id: "goals", definition: goals },
] as const;

function sources(id: string): readonly { readonly path: string; readonly text: string }[] {
	const directory = resolve(import.meta.dirname, "../../../mechanics", id, "src");
	return readdirSync(directory)
		.filter((name) => name.endsWith(".ts"))
		.map((name) => ({ path: join(directory, name), text: readFileSync(join(directory, name), "utf8") }));
}

describe.each(MECHANICS)("conformance of $id", ({ id, definition }) => {
	it("documents every option", () => {
		expect(checkOptionsDocumented(definition)).toEqual([]);
	});

	it("uses no forbidden import or global", () => {
		expect(checkSourceRules(sources(id))).toEqual([]);
	});

	it("keeps every file under 400 non-blank lines", () => {
		for (const file of sources(id)) expect(file.text.split("\n").filter((line) => line.trim().length > 0).length, file.path).toBeLessThanOrEqual(400);
	});
});
