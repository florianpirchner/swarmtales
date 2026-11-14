/** The committed oracle files (`oracles/`) fit the format, are consistent in themselves, and the code still produces them. */
import { existsSync, globSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Value } from "typebox/value";
import { createPromptLookup } from "@swarmtales/prompts";
import { coreStoryFor } from "../../apps/cli/src/host/core-run.ts";
import { CATALOG, DEFINITIONS, oraclePath } from "../../scripts/oracles/catalog.ts";
import { CHECKSUMS, checksumsText } from "../../scripts/oracles/checksums.ts";
import { COVERAGE, coverageText } from "../../scripts/oracles/coverage.ts";
import { OracleSchema, type Oracle, type OracleEntry } from "../../scripts/oracles/format.ts";
import { mechanicPages } from "../../scripts/oracles/mechanics-doc.ts";
import * as players from "../../scripts/oracles/players.ts";
import { rulesByActor, rulesProjection, rulesText } from "../../scripts/oracles/projection.ts";
import { oracleText, recordOracle } from "../../scripts/oracles/record.ts";
import { findCoreStory } from "../../stories/index.ts";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FILES = globSync("oracles/*/*.json", { cwd: ROOT }).sort();
/** Re-derived in the test: one scripted file and one replay of a recorded live run. `scripts/export-oracles.ts --check` re-derives all. */
const REDERIVED = ["oracles/tictactoe/tictactoe-teams-solo-s7.json", "oracles/tictactoe/tictactoe-teams-5x5-nobrain-solo-s3.json"];

/**
 * The seeded generator and the two hashes exactly as `oracles/README.md` states them ("Seeded randomness"), written
 * again here without the platform's code: the tests below hold the README to the files.
 */
function fnv1a(text: string): number {
	let hash = 0x811c9dc5;
	for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
	return hash >>> 0;
}

function stream(seed: number, ...labels: readonly (string | number)[]): () => number {
	let state = fnv1a([String(seed >>> 0), ...labels.map(String)].join(":"));
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffled<T>(next: () => number, items: readonly T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(next() * (i + 1));
		const a = copy[i];
		const b = copy[j];
		if (a === undefined || b === undefined) continue;
		copy[i] = b;
		copy[j] = a;
	}
	return copy;
}

function cyrb53(text: string): string {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);
		h1 = Math.imul(h1 ^ code, 2654435761);
		h2 = Math.imul(h2 ^ code, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

const field = (value: unknown, name: string): unknown => (typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined);

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

	it("reject a field the format does not know and a refusal without a known stage", () => {
		const oracle = read(REDERIVED[0] ?? "");
		expect(Value.Check(OracleSchema, oracle)).toBe(true);
		expect(Value.Check(OracleSchema, { ...oracle, extra: 1 })).toBe(false);
		expect(Value.Check(OracleSchema, { ...oracle, setup: { ...oracle.setup, extra: 1 } })).toBe(false);
		const first = oracle.timeline[0];
		expect(Value.Check(OracleSchema, { ...oracle, timeline: [{ ...first, extra: 1 }] })).toBe(false);
		const refused: OracleEntry = { k: "call", actor: "resident:A01", tool: "bid", params: {}, ok: false, code: "TOOL_LOCKED", stage: "lock" };
		expect(Value.Check(OracleSchema, { ...oracle, timeline: [refused] })).toBe(true);
		expect(Value.Check(OracleSchema, { ...oracle, timeline: [{ ...refused, stage: "somewhere" }] })).toBe(false);
		expect(Value.Check(OracleSchema, { ...oracle, timeline: [{ ...refused, actor: "someone" }] })).toBe(false);
	});

	it("match their checksums and the coverage table", () => {
		// A file changed by hand fails here, without any code of the platform being run.
		expect(readFileSync(resolve(ROOT, CHECKSUMS), "utf8")).toBe(checksumsText(ROOT));
		expect(readFileSync(resolve(ROOT, COVERAGE), "utf8")).toBe(coverageText(ROOT));
	});

	it("come with a page for every mechanic they load", () => {
		const pages = mechanicPages(ROOT);
		expect(pages.length).toBeGreaterThan(30);
		for (const page of pages) expect(readFileSync(resolve(ROOT, page.path), "utf8"), page.path).toBe(page.text);
		expect(globSync("oracles/mechanics/*.md", { cwd: ROOT }).sort()).toEqual(pages.map((page) => page.path).sort());
		// Every mechanic id in a file's setup has its page.
		for (const file of FILES) for (const mechanic of read(file).setup.mechanics) expect(existsSync(resolve(ROOT, "oracles/mechanics", `${mechanic.id}.md`)), `${file}: ${mechanic.id}`).toBe(true);
	});

	it("hold no model identifier, no key and no letter outside English", () => {
		for (const file of globSync("oracles/**/*.{json,md,txt}", { cwd: ROOT })) {
			const text = readFileSync(resolve(ROOT, file), "utf8");
			expect(text, file).not.toMatch(/claude-[a-z0-9]|deepseek|glm-\d|gpt-\d|sk-ant-|sk-or-/i);
			expect(text, file).not.toMatch(/[\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]/);
		}
	});

	it("show the seeded turn order the README states", () => {
		let passes = 0;
		for (const file of FILES) {
			const oracle = read(file);
			if (oracle.setup.turns.order !== "seeded") continue;
			let minute = 0;
			const seen = new Map<string, string[]>();
			for (const entry of oracle.timeline) {
				if (entry.k === "minute") minute = entry.minute;
				if (entry.k !== "turn" && entry.k !== "skip") continue;
				const key = `${String(minute)}:${String(entry.pass)}`;
				seen.set(key, [...(seen.get(key) ?? []), entry.resident]);
			}
			for (const [key, order] of seen) {
				const [at = 0, pass = 1] = key.split(":").map(Number);
				const expected = shuffled(stream(oracle.seed, "turns", ...(pass === 1 ? [at] : [at, pass])), oracle.setup.residents);
				// The last pass of a run may stop early; no file suspends a resident under this order.
				expect(order, `${file} minute ${String(at)} pass ${String(pass)}`).toEqual(expected.slice(0, order.length));
				passes++;
			}
		}
		expect(passes).toBeGreaterThan(5000);
	});

	it("show the seeded dice and the brain hash the README states", () => {
		let rolls = 0;
		let brains = 0;
		for (const file of FILES) {
			const oracle = read(file);
			const faces = 6;
			for (const entry of oracle.timeline) {
				if (entry.k !== "event") continue;
				if (entry.source === "strategy-brain" && entry.type === "brain_written") {
					expect(field(entry.payload, "hash"), file).toBe(cyrb53(String(field(entry.payload, "text"))));
					brains++;
				}
				if (entry.source !== "liars-dice" || entry.type !== "dice_rolled") continue;
				const next = stream(oracle.seed, "liars-dice", "roll", Number(field(entry.payload, "game")), Number(field(entry.payload, "round")));
				const dice = field(entry.payload, "dice");
				// Seats in table order, each die of a seat in turn: 1 + floor(next() * faces).
				for (const seat of oracle.setup.residents) {
					const own: unknown = field(dice, seat);
					if (!Array.isArray(own)) throw new Error(`${file}: no dice for ${seat}`);
					expect(own, file).toEqual(own.map(() => 1 + Math.floor(next() * faces)));
				}
				rolls++;
			}
		}
		expect(rolls).toBeGreaterThan(50);
		expect(brains).toBeGreaterThan(200);
	});

	it("have a rules projection that ignores scheduling and texts", () => {
		const oracle = read("oracles/tictactoe/tictactoe-teams-solo-s7.json");
		const base = rulesText(rulesProjection(oracle));
		// What another scheduler and other texts change: no skip entries, no empty turns, other pass and block numbers, no lock events, other words.
		const other: OracleEntry[] = oracle.timeline.flatMap((entry): OracleEntry[] => {
			if (entry.k === "skip" || (entry.k === "event" && (entry.type === "tool_locked" || entry.type === "tool_unlocked"))) return [];
			if (entry.k === "turn") return entry.inputs.length === 0 ? [] : [{ ...entry, pass: 1, block: 1, inputs: [] }];
			if (entry.k === "call") return [{ ...entry, ...(entry.reply === undefined ? {} : { reply: "other words" }), ...(entry.detail === undefined ? {} : { detail: "other words" }) }];
			return [entry];
		});
		expect(rulesText(rulesProjection({ ...oracle, timeline: other }))).toBe(base);
		// What it must not ignore: a verdict, a payload, the order of the mechanics' events.
		const at = oracle.timeline.findIndex((entry) => entry.k === "event" && entry.type === "move_played");
		const moved = oracle.timeline[at];
		if (moved?.k !== "event") throw new Error("no move in the file");
		const changed = oracle.timeline.map((entry, index): OracleEntry => (index === at ? { ...moved, payload: { cell: 8 } } : entry));
		expect(rulesText(rulesProjection({ ...oracle, timeline: changed }))).not.toBe(base);
	});

	it("keep the per-actor projection when the same players are scheduled in another order", async () => {
		// Tic-tac-toe with one resident per side and heads-up liar's dice: one resident acts at a time, so another turn
		// order changes only the order between residents who act independently (the brains before a game).
		for (const [file, script] of [["oracles/tictactoe/tictactoe-teams-solo-s7.json", "tictactoe"], ["oracles/liars-dice/liars-dice-hu-quiet-g2-d5-s7.json", "liarsDice"]] as const) {
			const oracle = read(file);
			const entry = findCoreStory(oracle.variant);
			if (entry === undefined) throw new Error(`${oracle.variant} is not in the registry`);
			const story = coreStoryFor(entry.story, { seed: oracle.seed });
			const rosterOrder = { ...story, turns: { ...story.turns, order: (view: { readonly residents: readonly string[] }) => view.residents } };
			const again = await recordOracle({ game: oracle.game, variant: oracle.variant, source: oracle.source, host: { story: rosterOrder, prompts: createPromptLookup(entry.prompts === undefined ? {} : { story: entry.prompts }) }, agent: () => ({ take: players[script]() }) });
			const woken = (timeline: readonly OracleEntry[]): string[] => timeline.flatMap((item) => (item.k === "turn" ? [item.resident] : []));
			expect(woken(again.timeline), file).not.toEqual(woken(oracle.timeline));
			expect(rulesText(rulesProjection(again)), file).not.toBe(rulesText(rulesProjection(oracle)));
			expect(rulesByActor(rulesProjection(again)), file).toEqual(rulesByActor(rulesProjection(oracle)));
			expect(again.end, file).toEqual(oracle.end);
		}
	}, 60_000);

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
