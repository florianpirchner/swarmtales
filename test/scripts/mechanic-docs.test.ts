/** Every mechanic README has the sections of docs/MECHANIC-README.md and generated blocks that match the code. */
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fieldsOf, readmeProblems, readmeTargets, skeleton, typeText, unknownFolders, withBlocks, MECHANIC_SECTIONS } from "../../scripts/mechanic-docs.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");

describe("mechanic READMEs", () => {
	it("every mechanic folder is known to the generator", () => {
		expect(unknownFolders(ROOT)).toEqual([]);
	});

	it("every README is complete and its generated blocks are current (pnpm docs:mechanics)", () => {
		const problems = readmeTargets(ROOT).flatMap((target) => {
			const file = relative(ROOT, target.file);
			if (!existsSync(target.file)) return [`${file}: missing`];
			return readmeProblems(file, readFileSync(target.file, "utf8"), target.sections, target.blocks);
		});
		expect(problems).toEqual([]);
	}, 120_000);
});

describe("the generator", () => {
	it("describes schema types in words", () => {
		expect(typeText({ type: "integer", minimum: 1 })).toBe("integer ≥ 1");
		expect(typeText({ anyOf: [{ const: "a" }, { const: "b" }] })).toBe('"a" or "b"');
		expect(typeText({ type: "array", items: { type: "string" } })).toBe("string[]");
		expect(typeText({ type: "object", patternProperties: { "^.*$": { type: "number" } } })).toBe("record of number");
	});

	it("lists nested fields with their paths", () => {
		const schema = { type: "object", required: ["a"], properties: { a: { type: "array", items: { type: "object", properties: { b: { type: "string", description: "B." } } } } } };
		expect(fieldsOf(schema, 2).map((field) => `${field.name}:${String(field.required)}`)).toEqual(["a:true", "a[].b:false"]);
	});

	it("reports a placeholder, a missing section and a stale block, and refreshes the block", () => {
		const blocks = { glance: "G", tools: "T", events: "E", options: "O", services: "S", prompts: "P" };
		const fresh = skeleton("x", MECHANIC_SECTIONS, blocks);
		expect(readmeProblems("x", fresh, MECHANIC_SECTIONS, blocks).some((problem) => problem.includes("To be written"))).toBe(true);
		const written = fresh.replaceAll("_To be written._", "Text.");
		expect(readmeProblems("x", written, MECHANIC_SECTIONS, blocks)).toEqual([]);
		const changed = { ...blocks, tools: "T2" };
		expect(readmeProblems("x", written, MECHANIC_SECTIONS, changed)).toEqual(["x: a generated block is stale; run `pnpm docs:mechanics`"]);
		expect(readmeProblems("x", withBlocks(written, changed), MECHANIC_SECTIONS, changed)).toEqual([]);
		expect(readmeProblems("x", written.replace("## Example", "## Sample"), MECHANIC_SECTIONS, blocks)).toContain('x: no section "## Example"');
	});
});
