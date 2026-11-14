// SPDX-License-Identifier: Apache-2.0
/** A run folder written by `@swarmtales/runlog` opens in the viewer: events, actors, header and the chain verdict. */
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type Envelope, type RunManifest, actorId } from "@swarmtales/contracts";
import { openRunFolder } from "@swarmtales/runlog";
import { findRuns, indexRun, loadRun, memorySource, verifyRun, type RunSource } from "@swarmtales/viewer-core";

const HASH = "a".repeat(64);
const GAME = { id: "hello-game" };
const MANIFEST: RunManifest = {
	format: "swarmtales-run",
	version: 1,
	run: { id: "hello-game-001", startedAt: "2026-11-14T10:00:00.000Z", purpose: "smoke" },
	game: { id: "hello-game", title: "Hello Game", hash: HASH, params: {} },
	kernel: { revision: 3, version: "0.0.0", node: "26.13.0" },
	scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: HASH },
	plugins: [],
	actors: ["A01", "A02"].map((name) => ({ id: actorId("resident", name), kind: "resident", grant: "resident", driver: "fake/sample", textHashes: {} })),
	texts: {},
	seed: 7,
	replicate: 0,
	limits: { maxTicks: 4 },
	naming: 1,
	log: { format: "swarmtales.events", version: 1 },
};
const KEYS = generateKeyPairSync("ed25519");
const A01 = actorId("resident", "A01");
const TOOL = "@swarmtales/mechanic-grid-game/grid-game/playMove";
const EVENTS: readonly Envelope[] = [
	{ seq: 1, tick: 0, source: "kernel", type: "run_started", actor: "kernel", payload: { seed: 7 } },
	{ seq: 2, tick: 0, source: "kernel", type: "activation_opened", actor: A01, causedBy: 1, basis: 1, payload: {} },
	{ seq: 3, tick: 0, source: "kernel", type: "tool_called", actor: A01, causedBy: 2, basis: 2, tool: TOOL, payload: { as: "playMove", params: { cell: 4 } } },
	{ seq: 4, tick: 0, source: "@swarmtales/mechanic-grid-game/grid-game", type: "move_played", actor: A01, causedBy: 3, tool: TOOL, payload: { cell: 4, mark: "X" } },
	{ seq: 5, tick: 1, source: "kernel", type: "run_ended", actor: "kernel", payload: { reason: "ticks" } },
];

const folders: string[] = [];
afterEach(() => {
	for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

/** Writes a run with the run log's own writer and hands its files to the viewer as a source. */
function writtenRun(events: readonly Envelope[] = EVENTS): Record<string, string> {
	const root = mkdtempSync(join(tmpdir(), "viewer-"));
	folders.push(root);
	const directory = join(root, "hello-game-001");
	let clock = Date.UTC(2026, 10, 14, 10);
	const folder = openRunFolder(directory, MANIFEST, { now: () => new Date((clock += 1000)), keys: KEYS, game: GAME, texts: {} });
	for (const event of events) folder.sink.write(event);
	folder.sink.close?.({ reason: "ticks", tick: 1 });
	folder.close();
	return Object.fromEntries(readdirSync(directory).map((name) => [`runs/hello-game-001/${name}`, readFileSync(join(directory, name), "utf8")]));
}

const RUN = "runs/hello-game-001";
const load = (source: RunSource) => loadRun(source, RUN);

describe("a run folder written by runlog", () => {
	it("loads with its events, its actors, its header and an ok verdict", async () => {
		const model = await load(memorySource(writtenRun()));
		expect(model.issues).toEqual([]);
		expect(model.events.map((event) => [event.seq, event.minute, event.type, event.actor])).toEqual([
			[1, 0, "run_started", "kernel"], [2, 0, "activation_opened", "A01"], [3, 0, "tool_called", "A01"], [4, 0, "move_played", "A01"], [5, 1, "run_ended", "kernel"],
		]);
		expect(model.events[3]).toMatchObject({ at: "2026-11-14T10:00:04.000Z", data: { cell: 4, mark: "X", source: "@swarmtales/mechanic-grid-game/grid-game", causedBy: 3, tool: TOOL } });
		const index = indexRun(model.events);
		expect(index.actors()).toEqual(["kernel", "A01"]);
		expect(index.byActor("A01").map((event) => event.seq)).toEqual([2, 3, 4]);
		expect(model.meta).toEqual({
			run: "hello-game-001", startedAt: "2026-11-14T10:00:00.000Z", storyId: "hello-game", title: "Hello Game", effective: { agents: 2, seed: 7 },
			agents: [{ agent: "A01", driver: "fake/sample" }, { agent: "A02", driver: "fake/sample" }],
		});
		expect(model.genesis).toMatchObject({ version: 2, log: { format: "swarmtales.events", version: 1 } });
		expect(verifyRun(model)).toMatchObject({ signed: true, checkedWith: "run.pub", verdict: { ok: true, lines: 5, finished: true } });
	});

	it("is listed with the header of its manifest", async () => {
		expect(await findRuns(memorySource(writtenRun()))).toEqual([{ dir: RUN, name: "hello-game-001", signed: true, hasReport: false, story: "hello-game", title: "Hello Game", startedAt: "2026-11-14T10:00:00.000Z", agents: 2 }]);
	});

	it("gets a broken verdict for a changed line, a changed manifest and a log out of order", async () => {
		const files = writtenRun();
		const withFile = (name: string, edit: (text: string) => string) => memorySource({ ...files, [`${RUN}/${name}`]: edit(files[`${RUN}/${name}`] ?? "") });
		const line = await load(withFile("events.jsonl", (text) => text.replace('"cell":4,"mark"', '"cell":5,"mark"')));
		expect(verifyRun(line)).toMatchObject({ signed: true, verdict: { ok: false, kind: "chain", line: 4 } });
		const manifest = await load(withFile("manifest.json", (text) => text.replace('"seed":7', '"seed":8')));
		expect(verifyRun(manifest)).toMatchObject({ signed: true, verdict: { ok: false, kind: "manifest" } });
		// The chain of a log whose seq skips a number holds; the order of the log does not.
		const gap = await load(memorySource(writtenRun(EVENTS.map((event) => (event.seq < 4 ? event : { ...event, seq: event.seq + 1 })))));
		expect(verifyRun(gap)).toMatchObject({ signed: true, verdict: { ok: false, kind: "chain", line: 4, reason: "seq is 5, the line number is 4" } });
	});
});
