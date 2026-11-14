// SPDX-License-Identifier: Apache-2.0
/** The name lint (issue 15): retired words stay out of exported identifiers and out of the docs. */
import { describe, expect, it } from "vitest";
import { isBudgetFile } from "../lib/budget.ts";
import { isCarried } from "../lib/carried.ts";
import { listFiles, readText } from "../lib/files.ts";
import { RETIRED, retiredExports, retiredProse } from "../lib/names.ts";

const GLOSSARY = "docs/GLOSSARY.md";
/** The ten words of the vocabulary; the glossary defines each under its own heading. */
const VOCABULARY = ["Game", "Resident", "Mechanic", "Director", "Referee", "Service", "Event", "Tick", "Experiment", "Human Hand"];
/** Generated files quote other people's words. */
const GENERATED_DOCS = new Set(["THIRD-PARTY-LICENSES.md"]);

describe("name lint", () => {
	it("finds no retired word in the exported identifiers of the packages", () => {
		const files = ["packages", "mechanics", "games", "samples"].flatMap((folder) => listFiles(folder, isBudgetFile));
		expect(files.length).toBeGreaterThan(0);
		expect(files.flatMap((file) => retiredExports(readText(file)).map((message) => `${file}: ${message}`))).toEqual([]);
	});

	it("finds no retired word in the docs written for the new platform", () => {
		const docs = listFiles(".", (path) => path.endsWith(".md") && path !== GLOSSARY && !isCarried(path) && !GENERATED_DOCS.has(path));
		expect(docs).toContain("README.md");
		expect(docs).toContain("CLAUDE.md");
		const offences = docs.flatMap((file) => retiredProse(readText(file)).map((hit) => `${file}:${hit.line} retired word "${hit.word}"`));
		expect(offences).toEqual([]);
	});

	it("keeps the glossary in step: every term is defined and every retired word is listed", () => {
		const glossary = readText(GLOSSARY);
		for (const term of VOCABULARY) expect(glossary).toMatch(new RegExp(`^### ${term}$`, "m"));
		const listed = glossary.toLowerCase();
		for (const entry of RETIRED) expect(listed).toContain(`| ${entry.word} |`);
	});

	it("reads exported identifiers only, word by word", () => {
		const text = [
			"export const storyOf = 1;",
			"export function loadModule(): void {}",
			"export interface OverseerOptions { a: number }",
			"export type HostPort = string;",
			"const minuteHand = 2;",
			"export { minuteHand };",
			"export const history = 1;",
			"function coreLoop(): void {}",
			"export class Game {}",
			"export enum ArenaMode { A }",
			'export * as capability from "./x.ts";',
			'export { a as competitorOf } from "./y.ts";',
		].join("\n");
		expect(retiredExports(text).map((message) => message.split(";")[0])).toEqual([
			'the export "storyOf" uses the retired word "story"',
			'the export "loadModule" uses the retired word "module"',
			'the export "OverseerOptions" uses the retired word "overseer"',
			'the export "HostPort" uses the retired word "host"',
			'the export "minuteHand" uses the retired word "minute"',
			'the export "ArenaMode" uses the retired word "arena"',
			'the export "capability" uses the retired word "capability"',
			'the export "competitorOf" uses the retired word "competitor"',
		]);
	});

	it("reads prose without the quoted code, and only words with no everyday meaning", () => {
		expect(retiredProse("The Overseers decide.\nThe core of the story is `overseer`.\nTwo competitors.")).toEqual([
			{ line: 1, word: "overseer" },
			{ line: 3, word: "competitor" },
		]);
	});
});
