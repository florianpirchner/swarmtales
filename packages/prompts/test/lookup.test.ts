// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The layered prompt lookup: the game, then the owning mechanic, then the library. Carried from the old
 * `test/host/prompt-lookup.test.ts`.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPromptLookup, PromptError } from "../src/index.ts";

function folder(files: Readonly<Record<string, string>>): string {
	const root = mkdtempSync(join(tmpdir(), "swt-prompts-"));
	for (const [id, body] of Object.entries(files)) {
		const path = join(root, `${id}.md`);
		mkdirSync(dirname(path), { recursive: true });
		const variables = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? "");
		writeFileSync(path, `---\nid: ${id}\nvariables: ${[...new Set(variables)].join(", ")}\n---\n${body}\n`);
	}
	return root;
}

describe("the layered prompt lookup", () => {
	const mechanic = folder({ "m/hello": "hello {{name}} from the mechanic", "m/only": "mechanic only" });
	const game = folder({ "m/hello": "hello {{name}} from the game" });

	it("prefers the game, then the mechanic's folder, then the library", () => {
		const lookup = createPromptLookup({ game, mechanics: { m: mechanic } });
		expect(lookup.render("m", "m/hello", { name: "A01" }, ["name"])).toBe("hello A01 from the game");
		expect(lookup.render("m", "m/only", {}, [])).toBe("mechanic only");
		expect(lookup.render("core", "replies/core/locked", {}, [])).toBe("not available to you at this level or in this phase; activeTools lists the tools you can use now");
		expect(createPromptLookup({ mechanics: { m: mechanic } }).render("m", "m/hello", { name: "A02" }, ["name"])).toBe("hello A02 from the mechanic");
		expect(lookup.pathOf("m", "m/hello")).toBe(join(game, "m", "hello.md"));
		expect(lookup.pathOf("m", "m/none")).toBeUndefined();
	});

	it("keeps a mechanic's folder to that mechanic and checks the declared variables", () => {
		const lookup = createPromptLookup({ mechanics: { m: mechanic } });
		expect(() => lookup.render("other", "m/only", {}, [])).toThrow(/no file/);
		expect(() => lookup.render("m", "m/hello", { name: "A01" }, ["name", "extra"])).toThrow(/declares variables/);
		expect(() => lookup.render("other", "m/only", {}, [])).toThrow(PromptError);
	});

	it("checks the declared variables of every owner, also after another owner read the file (M6-33)", () => {
		const shared = folder({ "s/greet": "hi {{name}}" });
		const lookup = createPromptLookup({ library: shared });
		expect(lookup.render("first", "s/greet", { name: "A01" }, ["name"])).toBe("hi A01");
		expect(() => lookup.render("second", "s/greet", { name: "A02", extra: "x" }, ["name", "extra"])).toThrow(/SWT-P013/);
		expect(() => lookup.render("third", "s/greet", {}, [])).toThrow(/SWT-P013/);
		expect(lookup.render("first", "s/greet", { name: "A03" }, ["name"])).toBe("hi A03");
	});

	it("reads a file once, whatever owners ask for it (M6-33)", () => {
		const shared = folder({ "s/once": "once {{name}}" });
		const lookup = createPromptLookup({ library: shared });
		expect(lookup.render("first", "s/once", { name: "A01" }, ["name"])).toBe("once A01");
		writeFileSync(join(shared, "s", "once.md"), "---\nid: s/once\nvariables: name\n---\nchanged {{name}}\n");
		expect(() => lookup.render("second", "s/once", {}, [])).toThrow(/SWT-P013/);
		expect(lookup.render("third", "s/once", { name: "A02" }, ["name"])).toBe("once A02");
	});
});
