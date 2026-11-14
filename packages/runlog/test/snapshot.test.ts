// SPDX-License-Identifier: Apache-2.0
/** Snapshot files, the prefix of a resumed folder, and continuity against the previous folder (`SWT-L007`, `SWT-L008`). */
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CHAIN_FILE, EVENTS_FILE, jsonHash, snapshotStateHash } from "@swarmtales/chain";
import { type Envelope, type KernelSnapshot, type RunManifest, type SnapshotCheckpoint, type SnapshotFile, SwtError } from "@swarmtales/contracts";
import { openRunFolder, type RunFolder, type RunFolderOptions } from "../src/folder.ts";
import { readSnapshotFile, writeSnapshotFile } from "../src/snapshot.ts";
import { verifyRun } from "../src/verify.ts";

const GAME = { id: "hello-game" };
const manifest = (id: string, snapshotHash?: string): RunManifest => ({
	format: "swarmtales-run",
	version: 1,
	run: { id, startedAt: "2026-11-14T10:00:00.000Z", purpose: "smoke" },
	game: { id: "hello-game", hash: jsonHash(GAME), params: {} },
	kernel: { revision: 3, version: "0.0.0", node: "26.13.0" },
	scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: "a".repeat(64) },
	plugins: [],
	actors: [],
	texts: {},
	seed: 7,
	replicate: 0,
	limits: { maxTicks: 4 },
	naming: 1,
	log: { format: "swarmtales.events", version: 1 },
	...(snapshotHash === undefined ? {} : { resumedFrom: { snapshotHash } }),
});
const SNAPSHOT: KernelSnapshot = { format: "swarmtales.kernel", version: 1, game: "hello-game", gameHash: "g", seed: 7, tick: 1, seq: 2, suspensions: {}, locks: {}, jobs: [], plugins: { hello: { version: 1, data: { n: 2 } } } };
const event = (seq: number, type: string, tick = 0, source = "kernel"): Envelope => ({ seq, tick, source, type, actor: "kernel", payload: { n: seq } });
const MARKER = event(3, "run_resumed", 1, "@swarmtales/cli/run");
const END = event(4, "run_ended", 2);

const root = mkdtempSync(join(tmpdir(), "runlog-snapshot-"));
afterAll(() => { rmSync(root, { recursive: true, force: true }); });
let count = 0;

function open(id: string, options: Partial<RunFolderOptions> = {}, snapshotHash?: string): RunFolder {
	let clock = Date.UTC(2026, 10, 14, 10 + count);
	return openRunFolder(join(root, `${id}-${String((count += 1))}`), manifest(id, snapshotHash), { now: () => new Date((clock += 1000)), game: GAME, ...options });
}

function finish(folder: RunFolder, events: readonly Envelope[]): string {
	for (const item of events) folder.sink.write(item);
	folder.sink.close?.({ reason: "ticks", tick: 2 });
	return folder.directory;
}

/** A run of two lines, a snapshot, and two more lines: the folder, the snapshot file and its first two lines. */
async function previousRun(id = "hello-game-001"): Promise<{ readonly directory: string; readonly path: string; readonly hash: string; readonly file: SnapshotFile; readonly prefix: readonly string[] }> {
	const folder = open(id, id === "hello-game-001" ? {} : { keys: generateKeyPairSync("ed25519") });
	folder.sink.write(event(1, "run_started"));
	folder.sink.write(event(2, "tick_started", 1));
	const written = await writeSnapshotFile(folder, SNAPSHOT, 1);
	const directory = finish(folder, [event(3, "tick_started", 2), END]);
	return { directory, ...written, file: await readSnapshotFile(written.path), prefix: readFileSync(join(directory, EVENTS_FILE), "utf8").split("\n").slice(0, 2) };
}

/** A resumed folder built by hand; without `prefix` the lines go through the sink (new stamps, a valid chain). */
function resumed(checkpoint: SnapshotCheckpoint, hash: string, events: readonly Envelope[], prefix?: readonly string[]): string {
	return finish(open("hello-game-002", { resumedFrom: { file: "t1.json", run: "hello-game-001", checkpoint }, ...(prefix === undefined ? {} : { prefix }) }, hash), events);
}

const codeOf = (run: () => unknown): string | undefined => {
	try {
		run();
	} catch (thrown) {
		return thrown instanceof SwtError ? thrown.code : String(thrown);
	}
	return undefined;
};
const refusal = async (path: string, expected = {}): Promise<string> => readSnapshotFile(path, expected).then(() => "read", (thrown: unknown) => (thrown instanceof SwtError ? thrown.code : String(thrown)));

describe("snapshot file", () => {
	it("round trips, signs the state with the head and writes no event", async () => {
		const { directory, path, hash, file } = await previousRun();
		expect(path).toBe(join(directory, "snapshots", "t1.json"));
		expect(file).toEqual({ format: 1, runId: "hello-game-001", gameHash: jsonHash(GAME), tick: 1, snapshot: SNAPSHOT, checkpoint: file.checkpoint });
		expect(file.checkpoint).toMatchObject({ lines: 2, state: snapshotStateHash(SNAPSHOT) });
		expect(hash).toBe(jsonHash(file));
		expect(readFileSync(join(directory, EVENTS_FILE), "utf8").trimEnd().split("\n")).toHaveLength(4);
		expect(verifyRun(directory)).toMatchObject({ ok: true, finished: true, lines: 4 });
		expect(verifyRun(directory).continuity).toBeUndefined();
	});

	it("is refused with SWT-L008 when it is no snapshot file, was changed, or belongs to another run or game", async () => {
		const { path, file } = await previousRun();
		expect(await refusal(join(root, "none.json"))).toBe("SWT-L008");
		expect(await refusal(path, { runId: "hello-game-001", gameHash: jsonHash(GAME) })).toBe("read");
		expect(await refusal(path, { gameHash: "b".repeat(64) })).toBe("SWT-L008");
		expect(await refusal(path, { runId: "hello-game-009" })).toBe("SWT-L008");
		const rewrite = (value: unknown): void => { writeFileSync(path, JSON.stringify(value)); };
		rewrite({ ...file, more: 1 });
		expect(await refusal(path)).toBe("SWT-L008");
		rewrite({ ...file, snapshot: { ...SNAPSHOT, plugins: { hello: { version: 1, data: { n: 99 } } } } });
		expect(await refusal(path)).toBe("SWT-L008");
		rewrite({ ...file, checkpoint: { ...file.checkpoint, lines: 1 } });
		expect(await refusal(path)).toBe("SWT-L008");
	});
});

describe("resumed folder", () => {
	it("starts with the previous lines as they were and verifies against its previous folder", async () => {
		const { directory, hash, file, prefix } = await previousRun();
		const next = resumed(file.checkpoint, hash, [MARKER, END], prefix);
		expect(readFileSync(join(next, EVENTS_FILE), "utf8").split("\n").slice(0, 2)).toEqual(prefix);
		expect(verifyRun(next, { previous: directory })).toMatchObject({ ok: true, finished: true, lines: 4, continuity: "holds", issues: [] });
		expect(verifyRun(next)).toMatchObject({ ok: true, continuity: "unchecked" });
	});

	it("is not created with SWT-L007 when the prefix is not what the checkpoint signed", async () => {
		const { hash, file, prefix } = await previousRun();
		const before = readdirSync(root).length;
		const changed = [prefix[0] ?? "", (prefix[1] ?? "").replace('"n":2', '"n":5')];
		for (const lines of [changed, prefix.slice(0, 1), [...prefix, prefix[0] ?? ""]]) expect(codeOf(() => resumed(file.checkpoint, hash, [], lines))).toBe("SWT-L007");
		expect(codeOf(() => open("hello-game-002", { prefix }))).toBe("SWT-L007");
		expect(readdirSync(root)).toHaveLength(before);
	});

	it("gives SWT-L007 for a changed prefix line, a missing marker, a foreign checkpoint and a missing previous folder", async () => {
		const { directory, hash, file, prefix } = await previousRun();
		const faults = (next: string, previous = directory): unknown => {
			const verdict = verifyRun(next, { previous });
			return { continuity: verdict.continuity, issues: verdict.issues.map((issue) => [issue.code, issue.where?.file, issue.where?.line]) };
		};
		const head = [event(1, "run_started"), event(2, "tick_started", 1)];
		expect(faults(resumed(file.checkpoint, hash, [...head, MARKER, END]))).toEqual({ continuity: "holds", issues: [] });
		const changed = resumed(file.checkpoint, hash, [head[0] ?? END, { ...event(2, "tick_started", 1), payload: { n: 5 } }, MARKER, END]);
		expect(faults(changed)).toEqual({ continuity: "broken", issues: [["SWT-L007", EVENTS_FILE, 2]] });
		expect(verifyRun(changed)).toMatchObject({ ok: true, continuity: "unchecked" });
		expect(faults(resumed(file.checkpoint, hash, [END], prefix))).toEqual({ continuity: "broken", issues: [["SWT-L007", EVENTS_FILE, 3], ["SWT-L005", EVENTS_FILE, 3]] });
		const foreign = await previousRun("hello-game-007");
		expect(faults(resumed(foreign.file.checkpoint, foreign.hash, [MARKER, END], foreign.prefix))).toEqual({ continuity: "broken", issues: [["SWT-L007", CHAIN_FILE, undefined]] });
		expect(faults(directory, foreign.directory)).toEqual({ continuity: "broken", issues: [["SWT-L007", CHAIN_FILE, undefined]] });
		expect(faults(resumed(file.checkpoint, hash, [MARKER, END], prefix), join(root, "none"))).toEqual({ continuity: "broken", issues: [["SWT-L007", EVENTS_FILE, undefined]] });
	});
});
