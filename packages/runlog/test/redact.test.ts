// SPDX-License-Identifier: Apache-2.0
/** No secret in a file of a run folder: each line is redacted before it is chained, and a manifest, game or texts with a secret opens no folder (M2-01). */
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EVENTS_FILE, jsonHash } from "@swarmtales/chain";
import { type Envelope, type RunManifest, actorId, redactSecrets, redactWith, SwtError } from "@swarmtales/contracts";
import { MANIFEST_FILE, openRunFolder, type RunFolderOptions } from "../src/folder.ts";
import { verifyRun } from "../src/verify.ts";

// Built at run time: no committed text has the shape of a key.
const KEY = `${["s", "k"].join("")}-ant-${"a1B2_c3-".repeat(4)}`;
const TOKEN = "t0K.en~".repeat(4);
const HELD = "a-held-value-of-no-known-shape";
const MESSAGE = `POST https://user:${TOKEN}@api.example/v1 with ${KEY} and Bearer ${TOKEN} failed`;
const SECRETS = [KEY, TOKEN, HELD];

const GAME = { id: "hello-game" };
const MANIFEST: RunManifest = {
	format: "swarmtales-run",
	version: 1,
	run: { id: "hello-game-001", startedAt: "2026-11-14T10:00:00.000Z", purpose: "smoke" },
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
};
const KEYS = generateKeyPairSync("ed25519");
const ACTOR = actorId("resident", "A01");
const event = (seq: number, type: string, payload: unknown): Envelope => ({ seq, tick: 0, source: "kernel", type, actor: ACTOR, payload });

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function place(): string {
	const root = mkdtempSync(join(tmpdir(), "runlog-redact-"));
	roots.push(root);
	return join(root, "hello-game-001");
}
const options = (more: Partial<RunFolderOptions> = {}): RunFolderOptions => ({ now: () => new Date(Date.UTC(2026, 10, 14, 10)), keys: KEYS, ...more });

/** Writes a run whose events hold the secrets as a kernel without redaction would hand them on. */
function writeRun(more: Partial<RunFolderOptions> = {}): string {
	const directory = place();
	const folder = openRunFolder(directory, MANIFEST, options(more));
	folder.sink.write(event(1, "tool_called", { args: { note: [`my key is ${KEY}`, HELD] } }));
	folder.sink.write(event(2, "run_ended", { reason: "error", detail: MESSAGE }));
	folder.sink.close?.({ reason: "error", tick: 0 });
	return directory;
}
const filesOf = (directory: string): string => readdirSync(directory).map((file) => readFileSync(join(directory, file), "utf8")).join("\n");

describe("the sink of a run folder", () => {
	it("writes and chains the redacted line: no secret in any file, and the run verifies", () => {
		const directory = writeRun();
		const lines = readFileSync(join(directory, EVENTS_FILE), "utf8").trimEnd().split("\n");
		expect(lines[0]).toBe('{"actor":"resident:A01","at":"2026-11-14T10:00:00.000Z","payload":{"args":{"note":["my key is sk-[redacted]","a-held-value-of-no-known-shape"]}},"seq":1,"source":"kernel","tick":0,"type":"tool_called"}');
		expect(lines[1]).toContain('"detail":"POST https://[redacted]@api.example/v1 with sk-[redacted] and Bearer [redacted] failed"');
		for (const secret of [KEY, TOKEN]) expect(filesOf(directory)).not.toContain(secret);
		expect(verifyRun(directory)).toMatchObject({ ok: true, finished: true, lines: 2, issues: [] });
	});

	it("uses the `redact` of the options, so a held value of no known shape is taken out too", () => {
		const directory = writeRun({ redact: redactWith(redactSecrets, (text) => text.replaceAll(HELD, "[redacted]")) });
		const files = filesOf(directory);
		expect(files).toContain('["my key is sk-[redacted]","[redacted]"]');
		for (const secret of SECRETS) expect(files).not.toContain(secret);
		expect(verifyRun(directory).ok).toBe(true);
	});
});

describe("openRunFolder", () => {
	const refused = (manifest: RunManifest, more: Partial<RunFolderOptions> = {}): { readonly directory: string; readonly fault: unknown } => {
		const directory = place();
		try {
			openRunFolder(directory, manifest, options(more));
		} catch (fault) {
			return { directory, fault };
		}
		return { directory, fault: undefined };
	};
	const seen = (fault: unknown): unknown => (fault instanceof SwtError ? [fault.code, fault.issues[0]?.where] : fault);

	it("creates no folder for a manifest with an sk- value in game.params, and names the place, never the value", () => {
		const { directory, fault } = refused({ ...MANIFEST, game: { ...MANIFEST.game, params: { tries: 3, endpoint: { key: KEY } } } });
		expect(seen(fault)).toEqual(["SWT-L006", { file: MANIFEST_FILE, path: "game.params.endpoint.key" }]);
		expect(existsSync(directory)).toBe(false);
		expect(fault instanceof SwtError ? JSON.stringify([fault.message, fault.issues]) : KEY).not.toContain(KEY);
	});

	it("refuses the game and the texts the same way, with the `redact` of the options", () => {
		const game = refused(MANIFEST, { game: { ...GAME, mechanics: [{ id: "m" }, { options: { url: `https://u:${TOKEN}@h.example` } }] } });
		expect(seen(game.fault)).toEqual(["SWT-L006", { file: "game.json", path: "mechanics[1].options.url" }]);
		const texts = refused(MANIFEST, { texts: { rules: `Play fair. ${HELD}` }, redact: (text) => text.replaceAll(HELD, "[redacted]") });
		expect(seen(texts.fault)).toEqual(["SWT-L006", { file: "texts.json", path: "rules" }]);
		expect([existsSync(game.directory), existsSync(texts.directory)]).toEqual([false, false]);
		expect(refused(MANIFEST, { game: GAME, texts: { rules: "Play fair." } }).fault).toBeUndefined();
	});
});
