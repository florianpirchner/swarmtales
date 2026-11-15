// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The run folder: what is written, that it verifies, and the L code each tampering gives. */
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalJson, CanonicalJsonError, CHAIN_FILE, EVENTS_FILE, jsonHash, PUBLIC_KEY_FILE } from "@swarmtales/chain";
import { type Envelope, type RunManifest, actorId, SwtError } from "@swarmtales/contracts";
import { EventChain } from "../src/chain-writer.ts";
import { GAME_FILE, MANIFEST_FILE, nextRunFolder, openRunFolder, TEXTS_FILE } from "../src/folder.ts";
import { type RunVerdict, verifyRun } from "../src/verify.ts";

const HASH = "a".repeat(64);
const GAME = { id: "hello-game" };
const MANIFEST: RunManifest = {
	format: "swarmtales-run",
	version: 1,
	run: { id: "hello-game-001", startedAt: "2026-11-14T10:00:00.000Z", purpose: "smoke" },
	game: { id: "hello-game", hash: jsonHash(GAME), params: {} },
	kernel: { revision: 3, version: "0.0.0", node: "26.13.0" },
	scheduler: { id: "turns", revision: 1, determinism: "seeded", options: {}, optionsHash: HASH },
	plugins: [],
	actors: [],
	texts: { rules: jsonHash("Play fair.") },
	seed: 7,
	replicate: 0,
	limits: { maxTicks: 4 },
	naming: 1,
	log: { format: "swarmtales.events", version: 1 },
};
const KEYS = generateKeyPairSync("ed25519");
const ACTOR = actorId("resident", "A01");
const event = (seq: number, type: string, more: Partial<Envelope> = {}): Envelope => ({ seq, tick: 0, source: "kernel", type, actor: ACTOR, payload: { n: seq }, ...more });
const EVENTS = [event(1, "run_started"), event(2, "tool_called", { causedBy: 1, basis: 1 }), event(3, "run_ended", { tick: 1 })];

const directories: string[] = [];
afterEach(() => {
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** Writes a run with a fixed clock and a fixed key; `ended: false` stops before `run_ended`. */
function writeRun(options: { readonly ended?: boolean; readonly events?: readonly Envelope[] } = {}): string {
	const directory = join(mkdtempSync(join(tmpdir(), "runlog-")), "hello-game-001");
	directories.push(join(directory, ".."));
	let clock = Date.UTC(2026, 10, 14, 10);
	const folder = openRunFolder(directory, MANIFEST, { now: () => new Date((clock += 1000)), keys: KEYS, game: GAME, texts: { rules: "Play fair." } });
	const events = options.events ?? (options.ended === false ? EVENTS.slice(0, 2) : EVENTS);
	for (const item of events) folder.sink.write(item);
	if (options.ended === false) folder.close();
	else folder.sink.close?.({ reason: "ticks", tick: 1 });
	folder.close();
	return directory;
}

/** Rewrites one file of a run folder. */
function change(directory: string, file: string, edit: (text: string) => string): void {
	writeFileSync(join(directory, file), edit(readFileSync(join(directory, file), "utf8")));
}

const codes = (verdict: RunVerdict): readonly string[] => verdict.issues.map((issue) => issue.code);
const dropLast = (text: string): string => `${text.trimEnd().split("\n").slice(0, -1).join("\n")}\n`;

describe("openRunFolder", () => {
	it("writes the files of the run folder, each line as canonical JSON with the clock's stamp", () => {
		const directory = writeRun();
		expect(readdirSync(directory).sort()).toEqual([CHAIN_FILE, EVENTS_FILE, GAME_FILE, MANIFEST_FILE, PUBLIC_KEY_FILE, TEXTS_FILE].sort());
		expect(readFileSync(join(directory, MANIFEST_FILE), "utf8")).toBe(`${canonicalJson(MANIFEST)}\n`);
		expect(readFileSync(join(directory, TEXTS_FILE), "utf8")).toBe('{"rules":"Play fair."}\n');
		const lines = readFileSync(join(directory, EVENTS_FILE), "utf8").trimEnd().split("\n");
		// The stamp is added, and the keys are in canonical order.
		expect(lines[1]).toBe('{"actor":"resident:A01","at":"2026-11-14T10:00:02.000Z","basis":1,"causedBy":1,"payload":{"n":2},"seq":2,"source":"kernel","tick":0,"type":"tool_called"}');
		expect(lines).toHaveLength(3);
		const genesis: unknown = JSON.parse(readFileSync(join(directory, CHAIN_FILE), "utf8").split("\n")[0] ?? "");
		expect(genesis).toMatchObject({ kind: "genesis", genesis: { version: 2, manifest: jsonHash(MANIFEST), log: MANIFEST.log } });
	});

	it("writes the same bytes for the same events, clock and key", () => {
		const [first, second] = [writeRun(), writeRun()];
		for (const file of readdirSync(first)) expect(readFileSync(join(second, file), "utf8"), file).toBe(readFileSync(join(first, file), "utf8"));
	});

	it("refuses an event that is no JSON value, and writes nothing for it", () => {
		const directory = writeRun({ ended: false });
		const chain = new EventChain(join(directory, "other"), { manifest: jsonHash(MANIFEST), log: MANIFEST.log });
		expect(() => {
			chain.append({ ...event(1, "bad"), payload: { when: new Date(0) } });
		}).toThrow(CanonicalJsonError);
		expect(readFileSync(join(directory, "other", EVENTS_FILE), "utf8")).toBe("");
		expect(chain.head().lines).toBe(0);
	});

	it("does not write over a run, and numbers the next folder", () => {
		const directory = writeRun();
		expect(() => openRunFolder(directory, MANIFEST, { now: () => new Date(0) })).toThrow(/EEXIST/);
		const root = join(directory, "..");
		expect(nextRunFolder(root, "hello-game")).toBe(join(root, "hello-game-002"));
		expect(nextRunFolder(root, "hello")).toBe(join(root, "hello-001"));
		expect(nextRunFolder(join(root, "none"), "hello-game")).toBe(join(root, "none", "hello-game-001"));
	});
	it("refuses a manifest that is no run manifest with SWT-L003, and writes nothing", () => {
		const directory = join(mkdtempSync(join(tmpdir(), "runlog-")), "bad-001");
		directories.push(join(directory, ".."));
		let fault: unknown;
		try {
			openRunFolder(directory, { ...MANIFEST, seed: -1 }, { now: () => new Date(0) });
		} catch (error) {
			fault = error;
		}
		expect(fault).toBeInstanceOf(SwtError);
		expect(fault instanceof SwtError ? [fault.code, fault.issues[0]?.where] : []).toEqual(["SWT-L003", { file: MANIFEST_FILE }]);
		expect(fault instanceof SwtError ? fault.issues[0]?.summary : "").toMatch(/^the manifest of the run is not a run manifest: \/seed /);
		expect(readdirSync(join(directory, ".."))).toEqual([]);
	});
});

describe("verifyRun", () => {
	it("holds for a run as written, and says when a run stopped before its end", () => {
		const whole = verifyRun(writeRun());
		expect(whole).toMatchObject({ ok: true, finished: true, lines: 3, issues: [] });
		expect(whole.head).toMatch(/^[0-9a-f]{64}$/);
		expect(verifyRun(writeRun({ ended: false }))).toMatchObject({ ok: true, finished: false, lines: 2, issues: [] });
	});

	it("gives SWT-L001 for a changed line and for a cut log", () => {
		const changed = writeRun();
		change(changed, EVENTS_FILE, (text) => text.replace('"payload":{"n":2}', '"payload":{"n":9}'));
		const verdict = verifyRun(changed);
		expect(verdict).toMatchObject({ ok: false, finished: false });
		expect(verdict.head).toBeUndefined();
		expect(verdict.issues).toMatchObject([{ code: "SWT-L001", where: { file: EVENTS_FILE, line: 2 } }]);
		// The same value in another key order is not the line that was signed.
		const reordered = writeRun();
		change(reordered, EVENTS_FILE, (text) => text.replace('"seq":2,"source":"kernel"', '"source":"kernel","seq":2'));
		expect(verifyRun(reordered).issues).toMatchObject([{ code: "SWT-L001", where: { line: 2 } }]);
		const cut = writeRun();
		change(cut, EVENTS_FILE, dropLast);
		expect(verifyRun(cut).issues).toMatchObject([{ code: "SWT-L001", where: { line: 3 } }]);
	});

	it("gives SWT-L002 for a changed head, a cut chain and another key", () => {
		const forged = writeRun();
		change(forged, CHAIN_FILE, (text) => text.replace(/"signature":"(.)/, (_, first: string) => `"signature":"${first === "A" ? "B" : "A"}`));
		expect(codes(verifyRun(forged))).toEqual(["SWT-L002"]);
		const cut = writeRun();
		change(cut, CHAIN_FILE, dropLast);
		expect(verifyRun(cut)).toMatchObject({ ok: false, finished: false, issues: [{ code: "SWT-L002" }] });
		const other = writeRun();
		writeFileSync(join(other, PUBLIC_KEY_FILE), generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }));
		expect(codes(verifyRun(other))).toEqual(["SWT-L002"]);
	});

	it("gives SWT-L003 for a manifest that was changed, is not canonical or disagrees with the genesis", () => {
		const changed = writeRun();
		change(changed, MANIFEST_FILE, (text) => text.replace('"seed":7', '"seed":8'));
		expect(verifyRun(changed).issues).toMatchObject([{ code: "SWT-L003", where: { file: MANIFEST_FILE } }]);
		const pretty = writeRun();
		change(pretty, MANIFEST_FILE, (text) => JSON.stringify(JSON.parse(text), null, "\t"));
		expect(codes(verifyRun(pretty))).toEqual(["SWT-L003"]);
		// A chain that holds over a manifest that names another log format than its genesis.
		const directory = mkdtempSync(join(tmpdir(), "runlog-"));
		directories.push(directory);
		const manifest = { ...MANIFEST, log: { format: "swarmtales.events", version: 2 } };
		writeFileSync(join(directory, MANIFEST_FILE), canonicalJson(manifest));
		new EventChain(directory, { manifest: jsonHash(manifest), log: MANIFEST.log }).close();
		expect(verifyRun(directory)).toMatchObject({ ok: false, issues: [{ code: "SWT-L003", summary: "the manifest and the genesis name different log formats" }] });
		// A chain that holds over a file that is canonical JSON and no run manifest: a field the format does not know.
		const stranger = mkdtempSync(join(tmpdir(), "runlog-"));
		directories.push(stranger);
		const extended = { ...MANIFEST, note: "mine" };
		writeFileSync(join(stranger, MANIFEST_FILE), canonicalJson(extended));
		new EventChain(stranger, { manifest: jsonHash(extended), log: MANIFEST.log }).close();
		const strange = verifyRun(stranger).issues;
		expect(strange).toMatchObject([{ code: "SWT-L003", where: { file: MANIFEST_FILE } }]);
		expect(strange[0]?.summary).toMatch(/^the file is not a run manifest: /);
	});

	it("gives SWT-L003 for a game or a text that is not what the manifest names by hash", () => {
		const directory = writeRun();
		change(directory, GAME_FILE, (text) => text.replace("hello-game", "other-game"));
		change(directory, TEXTS_FILE, (text) => text.replace("Play fair.", "Cheat."));
		expect(verifyRun(directory).issues).toMatchObject([
			{ code: "SWT-L003", where: { file: GAME_FILE } },
			{ code: "SWT-L003", summary: 'texts.json: the text "rules" is not the text the manifest names by hash', where: { file: TEXTS_FILE } },
		]);
		change(directory, TEXTS_FILE, () => "{}");
		expect(codes(verifyRun(directory))).toEqual(["SWT-L003", "SWT-L003"]);
	});

	// M1 review, finding R1: a committed file that was overwritten with something that is no JSON passed as "absent".
	it("gives SWT-L003 for a game.json or a texts.json that is there and is no JSON, or no object of texts", () => {
		for (const garbage of ["", "garbage{"]) {
			const directory = writeRun();
			change(directory, GAME_FILE, () => garbage);
			expect(verifyRun(directory).issues).toMatchObject([{ code: "SWT-L003", where: { file: GAME_FILE } }]);
			change(directory, TEXTS_FILE, () => garbage);
			expect(verifyRun(directory).issues).toMatchObject([{ code: "SWT-L003", where: { file: GAME_FILE } }, { code: "SWT-L003", where: { file: TEXTS_FILE } }]);
		}
		const directory = writeRun();
		change(directory, TEXTS_FILE, () => '"rules"');
		expect(verifyRun(directory).issues).toMatchObject([{ code: "SWT-L003", where: { file: TEXTS_FILE } }]);
	});

	it("gives SWT-L004 for a line that is no stored envelope and SWT-L005 once for an order fault", () => {
		const directory = mkdtempSync(join(tmpdir(), "runlog-"));
		directories.push(directory);
		writeFileSync(join(directory, MANIFEST_FILE), canonicalJson(MANIFEST));
		const chain = new EventChain(directory, { manifest: jsonHash(MANIFEST), log: MANIFEST.log });
		const at = "2026-11-14T10:00:00.000Z";
		chain.append({ ...event(1, "run_started"), at });
		chain.append({ hello: 1 });
		chain.append(event(3, "no_stamp"));
		chain.append({ ...event(5, "gap"), at });
		chain.append({ ...event(6, "after_gap"), at });
		// A stamp that is no time, and a field an envelope does not have: the stored envelope's schema refuses both.
		chain.append({ ...event(7, "bad_stamp"), at: "yesterday" });
		chain.append({ ...event(8, "extra"), at, note: 1 });
		chain.close();
		expect(verifyRun(directory).issues).toMatchObject([
			{ code: "SWT-L004", where: { file: EVENTS_FILE, line: 2 } },
			{ code: "SWT-L004", where: { line: 3 } },
			{ code: "SWT-L004", where: { line: 6 } },
			{ code: "SWT-L004", where: { line: 7 } },
			{ code: "SWT-L005", summary: "line 4: seq is 5, the line number is 4", where: { line: 4 } },
		]);
	});

	it("names each file that is missing", () => {
		const directory = writeRun();
		rmSync(join(directory, MANIFEST_FILE));
		rmSync(join(directory, PUBLIC_KEY_FILE));
		expect(codes(verifyRun(directory))).toEqual(["SWT-L002", "SWT-L003"]);
	});
});
