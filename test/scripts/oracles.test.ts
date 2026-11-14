/** The committed oracle files (`oracles/`) fit the format, are consistent in themselves, and the code still produces them. */
import { existsSync, globSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Value } from "typebox/value";
import { CATALOG, DEFINITIONS, oraclePath } from "../../scripts/oracles/catalog.ts";
import { OracleSchema, type Oracle } from "../../scripts/oracles/format.ts";
import { oracleText } from "../../scripts/oracles/record.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FILES = globSync("oracles/*/*.json", { cwd: ROOT }).sort();
/** Re-derived in the test: one scripted file and one replay of a recorded live run. `scripts/export-oracles.ts --check` re-derives all. */
const REDERIVED = ["oracles/tictactoe/tictactoe-teams-solo-s7.json", "oracles/tictactoe/tictactoe-teams-5x5-nobrain-solo-s3.json"];

function read(file: string): Oracle {
	const parsed: unknown = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));
	if (!Value.Check(OracleSchema, parsed)) throw new Error(`${file}: ${JSON.stringify([...Value.Errors(OracleSchema, parsed)].slice(0, 3))}`);
	return parsed;
}

describe("oracle files", () => {
	it("are exactly the files of the catalog", () => {
		expect(FILES).toEqual(CATALOG.map(oraclePath).sort());
	});

	it("fit the schema, their folder and name, and their own counts", () => {
		for (const file of FILES) {
			const oracle = read(file);
			expect(basename(dirname(file)), file).toBe(oracle.game);
			expect(basename(file).startsWith(`${oracle.variant}-s${String(oracle.seed)}`), file).toBe(true);
			expect(oracle.setup.seed, file).toBe(oracle.seed);
			const kinds: Record<string, number> = {};
			for (const entry of oracle.timeline) kinds[entry.k] = (kinds[entry.k] ?? 0) + 1;
			expect(kinds, file).toEqual(oracle.counts.entries);
			expect(oracle.timeline.filter((entry) => entry.k === "event").length, file).toBe(Object.values(oracle.counts.events).reduce((sum, count) => sum + count, 0));
			// A file is either complete or says where it was cut.
			expect(oracle.end === undefined, file).toBe(oracle.truncated !== undefined);
			// A refused call names its code; a resident's accepted call carries the answer it read.
			for (const entry of oracle.timeline) {
				if (entry.k !== "call") continue;
				if (!entry.ok) expect(entry.code, file).toBeDefined();
				else if (entry.actor.startsWith("resident:")) expect(entry.reply, file).toBeDefined();
			}
		}
	});

	it("name a story definition that is there and current", () => {
		for (const file of FILES) {
			const definition = read(file).setup.definition;
			if (definition !== undefined) expect(existsSync(resolve(ROOT, dirname(file), definition.file)), file).toBe(true);
		}
		for (const definition of DEFINITIONS) expect(readFileSync(resolve(ROOT, definition.path), "utf8"), definition.path).toBe(definition.text());
	});

	it("hold no wall-clock time, cost or absolute path", () => {
		for (const file of FILES) {
			const text = readFileSync(resolve(ROOT, file), "utf8");
			expect(text, file).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
			expect(text.includes(ROOT), file).toBe(false);
			expect(text, file).not.toMatch(/"costUsd":(?!0[,}])/);
		}
	});

	it("come with a README per game", () => {
		for (const game of new Set(CATALOG.map((item) => item.game))) expect(existsSync(resolve(ROOT, "oracles", game, "README.md")), game).toBe(true);
		expect(existsSync(resolve(ROOT, "oracles/README.md"))).toBe(true);
	});

	it("are what today's code produces", async () => {
		for (const file of REDERIVED) {
			const item = CATALOG.find((entry) => oraclePath(entry) === file);
			if (item === undefined) throw new Error(`${file} is not in the catalog`);
			expect(oracleText(await item.make()), file).toBe(readFileSync(resolve(ROOT, file), "utf8"));
		}
	}, 120_000);
});
