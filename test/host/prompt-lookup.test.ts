/** The layered prompt lookup of the new core: story, then the owning mechanic, then the library. */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createPromptLookup } from "@swarmtales/prompts";

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
	const story = folder({ "m/hello": "hello {{name}} from the story" });

	it("prefers the story, then the mechanic's folder, then the library", () => {
		const lookup = createPromptLookup({ story, mechanics: { m: mechanic } });
		expect(lookup.render("m", "m/hello", { name: "A01" }, ["name"])).toBe("hello A01 from the story");
		expect(lookup.render("m", "m/only", {}, [])).toBe("mechanic only");
		expect(lookup.render("core", "replies/core/locked", {}, [])).toBe("not available to you at this level or in this phase; activeTools lists the tools you can use now");
		expect(createPromptLookup({ mechanics: { m: mechanic } }).render("m", "m/hello", { name: "A02" }, ["name"])).toBe("hello A02 from the mechanic");
	});

	it("keeps a mechanic's folder to that mechanic and checks the declared variables", () => {
		const lookup = createPromptLookup({ mechanics: { m: mechanic } });
		expect(() => lookup.render("other", "m/only", {}, [])).toThrow(/no file/);
		expect(() => lookup.render("m", "m/hello", { name: "A01" }, ["name", "extra"])).toThrow(/declares variables/);
	});
});
