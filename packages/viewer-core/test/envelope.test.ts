// SPDX-License-Identifier: Apache-2.0
/** The envelope reader, the choice of the reader by `manifest.json`, and the carried legacy fixture. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { RunManifest } from "@swarmtales/contracts";
import { headerOf, parseEnvelopes } from "../src/envelope.ts";
import { findRuns, indexRun, loadRun, memorySource, verifyRun } from "../src/index.ts";

const HASH = "a".repeat(64);
const MANIFEST: RunManifest = {
	format: "swarmtales-run",
	version: 1,
	run: { id: "hello-game-001", startedAt: "2026-11-14T10:00:00.000Z", purpose: "smoke" },
	game: { id: "hello-game", title: "Hello Game", hash: HASH, params: {} },
	kernel: { revision: 3, version: "0.0.0", node: "26.13.0" },
	scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: HASH },
	plugins: [],
	actors: [
		{ id: "resident:A01", kind: "resident", grant: "resident", driver: "fake/sample", textHashes: {} },
		{ id: "director:D1", kind: "director", grant: "director", driver: "model", model: { provider: "p", requestedId: "m", resolvedId: "m-1", params: { temperature: 0, topP: "provider-default", maxOutputTokens: 100, thinking: "off" }, pricing: "prices@1.0.0" }, textHashes: {} },
	],
	texts: {},
	seed: 7,
	replicate: 0,
	limits: { maxTicks: 4 },
	naming: 1,
	log: { format: "swarmtales.events", version: 1 },
};
const LINES = [
	{ seq: 1, tick: 0, source: "kernel", type: "run_started", actor: "kernel", payload: { seed: 7 }, at: "2026-11-14T10:00:01.000Z" },
	{ seq: 2, tick: 0, source: "kernel", type: "tool_called", actor: "resident:A01", causedBy: 1, basis: 1, tool: "pkg/grid/playMove", payload: { as: "playMove", params: { cell: 4 }, type: "shadowed" } },
	{ seq: 3, tick: 1, source: "pkg/grid", type: "note", actor: "script", payload: "plain" },
];
const jsonl = (lines: readonly unknown[]): string => `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`;
const FIXTURE = join(import.meta.dirname, "fixtures", "legacy-run");

describe("parseEnvelopes", () => {
	it("turns an envelope into the record the views read: the tick as the minute, the name of the actor, the payload's fields beside the envelope's", () => {
		const { events, issues } = parseEnvelopes(jsonl(LINES));
		expect(issues).toEqual([]);
		expect(events.map((event) => [event.seq, event.minute, event.type, event.actor, event.line])).toEqual([[1, 0, "run_started", "kernel", 1], [2, 0, "tool_called", "A01", 2], [3, 1, "note", "script", 3]]);
		expect(events[0]?.at).toBe("2026-11-14T10:00:01.000Z");
		expect(events[1]?.at).toBeUndefined();
		// The envelope's own fields win over a payload field of the same name.
		expect(events[1]?.data).toEqual({ as: "playMove", params: { cell: 4 }, type: "tool_called", seq: 2, minute: 0, source: "kernel", actor: "A01", causedBy: 1, basis: 1, tool: "pkg/grid/playMove" });
		expect(events[2]?.data).toEqual({ payload: "plain", type: "note", seq: 3, minute: 1, source: "pkg/grid", actor: "script" });
	});

	it("reports a line that is no envelope with its line number, and reads the rest", () => {
		const text = `${JSON.stringify(LINES[0])}\nnot json\n${JSON.stringify({ type: "flat", seq: 3, minute: 0 })}\n${JSON.stringify(LINES[2])}\n`;
		const { events, issues } = parseEnvelopes(text, "run/events.jsonl");
		expect(events.map((event) => event.line)).toEqual([1, 4]);
		expect(issues).toEqual([{ file: "run/events.jsonl", line: 2, reason: "not an envelope" }, { file: "run/events.jsonl", line: 3, reason: "not an envelope" }]);
	});
});

describe("headerOf", () => {
	it("reads the run id, the game, the seed, the start and the actors with driver and model from the manifest", () => {
		expect(headerOf(MANIFEST)).toEqual({
			run: "hello-game-001",
			startedAt: "2026-11-14T10:00:00.000Z",
			storyId: "hello-game",
			title: "Hello Game",
			effective: { agents: 2, seed: 7 },
			agents: [{ agent: "A01", driver: "fake/sample" }, { agent: "D1", driver: "model", provider: "p", model: "m-1" }],
		});
	});
});

describe("loadRun", () => {
	it("reads a folder with an envelope manifest by the envelope reader", async () => {
		const source = memorySource({ "runs/hello-game-001/manifest.json": JSON.stringify(MANIFEST), "runs/hello-game-001/events.jsonl": jsonl(LINES) });
		const model = await loadRun(source, "runs/hello-game-001");
		expect(model.issues).toEqual([]);
		expect(model.manifest?.game.id).toBe("hello-game");
		expect(model.meta).toEqual(headerOf(MANIFEST));
		expect(indexRun(model.events).actors()).toEqual(["kernel", "A01", "script"]);
		expect(model.texts.manifest).toBe(JSON.stringify(MANIFEST));
		expect(verifyRun(model)).toEqual({ signed: false });
		expect(await findRuns(source)).toEqual([{ dir: "runs/hello-game-001", name: "hello-game-001", signed: false, hasReport: false, story: "hello-game", title: "Hello Game", startedAt: "2026-11-14T10:00:00.000Z", agents: 2 }]);
	});

	it("reads a folder whose manifest.json is no envelope manifest as an old run, and says so", async () => {
		const flat = `${JSON.stringify({ type: "dm_sent", agent: "A01", to: "A02", seq: 1, minute: 3 })}\n`;
		const other = { ...MANIFEST, log: { format: "another.log", version: 1 } };
		const model = await loadRun(memorySource({ "run/manifest.json": JSON.stringify(other), "run/events.jsonl": flat }), "run");
		expect(model.manifest).toBeUndefined();
		expect(model.texts.manifest).toBeUndefined();
		expect(model.events.map((event) => [event.type, event.actor, event.minute])).toEqual([["dm_sent", "A01", 3]]);
		expect(model.issues.map((issue) => issue.file)).toEqual(["run/manifest.json"]);
	});

	it("refuses a folder without events.jsonl with SWT-L001", async () => {
		await expect(loadRun(memorySource({ "run/manifest.json": "{}" }), "run")).rejects.toMatchObject({ code: "SWT-L001" });
	});

	it("still loads the carried legacy fixture: flat lines, the header of 000-run.json, a chain of version 1", async () => {
		const files = Object.fromEntries(readdirSync(FIXTURE).map((name) => [`legacy/${name}`, readFileSync(join(FIXTURE, name), "utf8")]));
		const model = await loadRun(memorySource(files), "legacy");
		expect(model.issues).toEqual([]);
		expect(model.manifest).toBeUndefined();
		expect(model.events).toHaveLength(40);
		// The fixture is the head of an old run and its last line: the seq of a flat line is the line's own.
		expect(model.events.at(-1)).toMatchObject({ seq: 1370, type: "run_end", line: 40 });
		expect(model.events[2]).toMatchObject({ seq: 3, minute: 0, type: "agent_profile", actor: "A01", line: 3 });
		expect(model.events[2]?.data).toMatchObject({ type: "agent_profile", agent: "A01", provider: "openrouter" });
		expect([...indexRun(model.events).actors()].sort()).toEqual(["A01", "A02", "A03", "A04", "A05", "A06"]);
		expect(model.meta).toMatchObject({ storyId: "tictactoe-teams", effective: { agents: 6, seed: 11 } });
		expect(model.genesis).toMatchObject({ version: 1, story: "tictactoe-teams", seed: 11 });
		expect(verifyRun(model)).toMatchObject({ signed: true, checkedWith: "run.pub", verdict: { ok: true, lines: 40 } });
		// A changed line breaks the chain of the old run as before.
		const changed = await loadRun(memorySource({ ...files, "legacy/events.jsonl": (files["legacy/events.jsonl"] ?? "").replace('"captain":"A01"', '"captain":"A02"') }), "legacy");
		expect(verifyRun(changed)).toMatchObject({ signed: true, verdict: { ok: false, line: 1 } });
	});
});
