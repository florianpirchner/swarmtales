// SPDX-License-Identifier: Apache-2.0
/** The prompt file format and its renderer. Carried from the old `test/prompts/prompts.test.ts` ("prompt files"). */
import { describe, expect, it } from "vitest";
import { hasStrayBraces, parsePromptFile, placeholders, PromptError, renderBody } from "../src/index.ts";

const FILE = "---\nid: demo/greeting\nvariables: name, city\n---\nHello {{name}} of {{ city }}.\n";

describe("prompt files", () => {
	it("parses the frontmatter and drops the final newline only", () => {
		const file = parsePromptFile(FILE, "demo.md");
		expect(file).toEqual({ id: "demo/greeting", variables: ["name", "city"], body: "Hello {{name}} of {{ city }}." });
		expect(parsePromptFile("---\nid: a\nvariables:\n---\nx\n\n", "a.md").body).toBe("x\n");
	});

	it("rejects a file without a frontmatter or with a bad variable name", () => {
		expect(() => parsePromptFile("Hello", "x.md")).toThrow(/frontmatter/);
		expect(() => parsePromptFile("---\nid: a\nvariables: not valid\n---\nx", "x.md")).toThrow(/plain names/);
		expect(() => parsePromptFile("Hello", "x.md")).toThrow(PromptError);
	});

	it("renders declared variables, numbers included", () => {
		const file = parsePromptFile(FILE, "demo.md");
		expect(renderBody(file, { name: "Mira", city: 7 })).toBe("Hello Mira of 7.");
	});

	it("fails on a missing, an unknown or an undeclared variable", () => {
		const file = parsePromptFile(FILE, "demo.md");
		expect(() => renderBody(file, { name: "Mira" })).toThrow(/missing variable "city"/);
		expect(() => renderBody(file, { name: "a", city: "b", extra: "c" })).toThrow(/unknown variable "extra"/);
		const sloppy = parsePromptFile("---\nid: a\nvariables: x\n---\n{{x}} {{y}}\n", "a.md");
		expect(() => renderBody(sloppy, { x: "1" })).toThrow(/"y"/);
		expect(placeholders(sloppy.body)).toEqual(["x", "y"]);
		expect(hasStrayBraces("{{ not valid }}")).toBe(true);
	});
});
