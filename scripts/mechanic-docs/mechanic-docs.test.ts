// SPDX-License-Identifier: Apache-2.0
/** The README generator of the mechanics: schemas as text, the blocks of a head, and what the check refuses. */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT, readText } from "../lib/files.ts";
import { docsContext, mechanicBlocks } from "./blocks.ts";
import { loadMechanics, type LoadedMechanic } from "./head.ts";
import { docsProblems, MECHANIC_SECTIONS, PLACEHOLDER, readmeProblems, skeleton, withBlocks } from "./readme.ts";
import { fieldLine, fieldsOf, typeText } from "./schema-text.ts";

const mechanics = await loadMechanics(REPO_ROOT);
const ctx = docsContext(REPO_ROOT, mechanics);

function mechanic(folder: string): LoadedMechanic {
	const found = mechanics.find((entry) => entry.folder === folder);
	if (found === undefined) throw new Error(`no mechanic ${folder}`);
	return found;
}

/** A temporary repository with the given files. */
function fixture(files: Readonly<Record<string, string>>): string {
	const root = mkdtempSync(join(tmpdir(), "swt-mechanic-docs-"));
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(join(root, path, ".."), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	return root;
}

const MANIFEST = JSON.stringify({ name: "@swarmtales/mechanic-toy", swarmtales: { kind: "mechanic", mechanics: ["toy"] } });
const TOY_HEAD = '{ id: "toy", package: "@swarmtales/mechanic-toy", summary: "A toy.", options: {}, version: 1, events: {}, audiences: {}, prompts: {}, requires: [], provides: [], uses: [], tools: [], metrics: [] }';

describe("schemas as text", () => {
	it("names a type in a few words", () => {
		expect(typeText({ type: "integer", minimum: 1, maximum: 50 })).toBe("integer ≥ 1 ≤ 50");
		expect(typeText({ anyOf: [{ const: "a" }, { const: "b" }, { type: "null" }] })).toBe('"a" or "b" or null');
		expect(typeText({ type: "array", items: { anyOf: [{ const: "X" }, { const: "O" }] } })).toBe('("X" or "O")[]');
		expect(typeText({ type: "object", patternProperties: { "^.*$": { type: "array", items: { type: "string" } } } })).toBe("record of string[]");
		expect(typeText({})).toBe("any");
	});

	it("lists nested fields down to the given depth, with defaults and descriptions", () => {
		const schema = { type: "object", required: ["blocks"], properties: { blocks: { type: "array", default: [], description: "The games.", items: { type: "object", required: ["rounds"], properties: { rounds: { type: "integer" } } } }, note: { type: "string" } } };
		expect(fieldsOf(schema, 2).map((field) => `${field.name}:${field.type}:${field.required}`)).toEqual(["blocks:object[]:true", "blocks[].rounds:integer:true", "note:string:false"]);
		expect(fieldsOf(schema, 1).map((field) => field.name)).toEqual(["blocks", "note"]);
		expect(fieldsOf(schema, 1)[0]).toMatchObject({ defaultText: "[]", description: "The games." });
		expect(fieldLine(schema)).toBe("blocks: object[], note?: string");
		expect(fieldLine({ type: "object", properties: {} })).toBe("-");
	});
});

describe("the blocks of a head", () => {
	it("reads tools, events, options, services, metrics and prompts from the head", () => {
		const blocks = mechanicBlocks(ctx, mechanic("econ-games"));
		expect(Object.keys(blocks)).toEqual(MECHANIC_SECTIONS.flatMap((section) => (section.generated === undefined ? [] : [section.generated])));
		expect(blocks.tools).toContain("### `contribute`");
		expect(blocks.tools).toContain("(prompts/econ-games/tools/contribute.md)");
		expect(blocks.events).toContain("### `decision_made`\n\nAudience: `human`");
		expect(blocks.options).toContain("| `blocks[].rounds` | integer ≥ 1 ≤ 50 | required |");
		expect(blocks.metrics).toContain("| `econ-games.tablePoints` | Points of the table | points | `match_ended` |");
		expect(blocks.services).toContain("### `brain-source`");
		expect(blocks.glance).toContain("| Games | [econ-lab](../../games/econ-lab/README.md) |");
		expect(blocks.glance).toContain("`strategy-brain` (from [strategy-brain](../strategy-brain/README.md))");
	});

	it("says so when a head declares nothing", () => {
		const blocks = mechanicBlocks(ctx, mechanic("optimal-referee"));
		expect(blocks.tools).toBe("This mechanic declares no tools.");
		expect(blocks.metrics).toBe("This mechanic exports no metrics.");
		expect(blocks.services).toBe("This mechanic provides no service to other mechanics.");
	});
});

describe("the check of a README", () => {
	const consensus = mechanic("consensus");
	const file = "mechanics/consensus/README.md";
	const readme = readText(file);
	const blocks = mechanicBlocks(ctx, consensus);

	it("accepts the committed README and fails when the head changes", () => {
		expect(readmeProblems(file, readme, blocks)).toEqual([]);
		const [first, ...rest] = consensus.head.tools;
		const changes: readonly LoadedMechanic["head"][] = [
			{ ...consensus.head, tools: [...consensus.head.tools, { name: "veto", description: "Stops a vote.", parameters: { type: "object", properties: {} }, for: ["resident"], free: false }] },
			{ ...consensus.head, tools: rest },
			{ ...consensus.head, tools: first === undefined ? [] : [{ ...first, free: true }, ...rest] },
			{ ...consensus.head, events: { ...consensus.head.events, vetoed: { type: "object", properties: { team: { type: "string" } } } } },
			{ ...consensus.head, options: { type: "object", properties: { quorum: { type: "integer", default: 2, description: "Votes needed." } } } },
			{ ...consensus.head, metrics: [{ id: "forfeits", title: "Forfeits", reads: ["consensus_forfeited"] }] },
			{ ...consensus.head, summary: "Another rule." },
		];
		for (const head of changes) {
			expect(readmeProblems(file, readme, mechanicBlocks(ctx, { ...consensus, head }))).toEqual([`${file}: a generated block is stale; run \`pnpm docs:mechanics\``]);
		}
	});

	it("fails on a missing marker, a missing section, a placeholder and a README without an opening paragraph", () => {
		const noMarker = readme.replace("<!-- /generated:metrics -->", "");
		expect(readmeProblems(file, noMarker, blocks)).toEqual([`${file}: no generated block "metrics" (markers <!-- generated:metrics --> ... <!-- /generated:metrics -->)`]);
		expect(readmeProblems(file, readme.replace("## How it plays", "## Flow"), blocks)).toEqual([`${file}: no section "## How it plays"`]);
		expect(readmeProblems(file, readme.replace("## Example", "## Tests").replace(/## Tests\n\n\[`test/, "## Example\n\n[`test"), blocks)).toContain(`${file}: the sections are not in the order of docs/MECHANIC-README.md`);
		const fresh = skeleton("consensus", blocks);
		expect(readmeProblems(file, fresh, blocks)).toEqual([`${file}: a section still says "${PLACEHOLDER}"`]);
		expect(readmeProblems(file, fresh.replaceAll(PLACEHOLDER, ""), blocks)).toEqual([`${file}: no paragraph under the title`]);
		expect(readmeProblems(file, "", blocks).length).toBeGreaterThan(MECHANIC_SECTIONS.length);
	});

	it("rewrites the blocks and nothing else", () => {
		const stale = withBlocks(readme, { ...blocks, tools: "old", glance: "old" });
		expect(stale).not.toBe(readme);
		expect(withBlocks(stale, blocks)).toBe(readme);
	});
});

describe("a gate never passes on nothing", () => {
	it("fails when there is no mechanic", async () => {
		await expect(docsProblems(fixture({ "README.md": "" }))).rejects.toThrow("no mechanic package under");
		await expect(docsProblems(fixture({ "mechanics/contracts/package.json": '{"name":"@swarmtales/mechanic-contracts"}' }))).rejects.toThrow("no mechanic package under");
	});

	it("fails on a mechanic package that names no mechanic, or one without a head", async () => {
		const unnamed = fixture({ "mechanics/toy/package.json": JSON.stringify({ name: "toy", swarmtales: { kind: "mechanic" } }) });
		await expect(docsProblems(unnamed)).rejects.toThrow("must name exactly one mechanic");
		const headless = fixture({ "mechanics/toy/package.json": MANIFEST, "mechanics/toy/src/index.ts": "export const toy = { head: { id: 1 } };\n" });
		await expect(docsProblems(headless)).rejects.toThrow('has no export "toy" with a head the generator can read');
	});

	it("fails on a mechanic without a README", async () => {
		const root = fixture({ "mechanics/toy/package.json": MANIFEST, "mechanics/toy/src/index.ts": `export const toy = { head: ${TOY_HEAD} };\n` });
		expect(await docsProblems(root)).toEqual(["mechanics/toy/README.md: missing; run `pnpm docs:mechanics`"]);
	});
});
