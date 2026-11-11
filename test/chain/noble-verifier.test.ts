/**
 * `@swarmtales/chain` (pure JavaScript, `@noble/*`) against the Node signer of `@swarmtales/chronicle`
 * (`node:crypto`): a chain the CLI writes verifies in the browser verifier, a tampered copy fails at
 * the same first broken line as `swt log verify` reports it, and every recorded run still verifies.
 */
import { createHash, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	CHAIN_FILE,
	EVENTS_FILE,
	jsonHash,
	keyFingerprint,
	linkHash,
	PUBLIC_KEY_FILE,
	verifyChainText,
} from "@swarmtales/chain";
import { EventChain, JsonlEventLog, verifyChain } from "@swarmtales/chronicle";
// The byte and key helpers are internal to the package; their parity with node:crypto is checked here.
import { fromBase64, toBase64 } from "../../packages/chain/src/bytes.ts";
import { publicKeyFromPem, signatureVerifies } from "../../packages/chain/src/keys.ts";
import { EventBus } from "@swarmtales/legacy-log";

/** `expect.stringMatching`, typed as the asymmetric matcher it is. */
function matching(pattern: RegExp): unknown {
	const matcher: unknown = expect.stringMatching(pattern);
	return matcher;
}

const ROOT = join(import.meta.dirname, "..", "..");
const directories: string[] = [];

afterEach(() => {
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function playRun(): string {
	const directory = mkdtempSync(join(tmpdir(), "noble-chain-"));
	directories.push(directory);
	const chain = new EventChain(directory, { story: "cityofkeys", storyHash: "b".repeat(64), seed: 3, models: { A01: "scripted/-" } });
	let minute = 0;
	const bus = new EventBus([new JsonlEventLog(join(directory, EVENTS_FILE), { chain })], () => minute);
	bus.emit({ type: "round_start", round: 1, order: ["A01", "A02"] });
	bus.emit({ type: "text", agent: "A01", text: "Gr\u00fc\u00dfe, 🗝️ \"quoted\"   line" });
	chain.checkpoint("c".repeat(64));
	minute = 1;
	bus.emit({ type: "text", agent: "A02", text: "The door is open." });
	bus.emit({ type: "run_end", reason: "done" });
	return directory;
}

const read = (directory: string, name: string): string => readFileSync(join(directory, name), "utf8");
const lines = (text: string): string[] => text.trimEnd().split("\n");
const joined = (rows: readonly string[]): string => `${rows.join("\n")}\n`;

describe("the noble verifier against the Node signer", () => {
	it("gives the bytes node:crypto gives: sha256, base64, the SPKI key and a signature", () => {
		for (const text of ["", "a", "Gr\u00fc\u00dfe 🗝️", "x".repeat(1000)]) {
			expect(linkHash("0".repeat(64), text)).toBe(createHash("sha256").update("0".repeat(64)).update(text).digest("hex"));
		}
		expect(jsonHash({ b: 1, a: [true, null, "é"] })).toBe(createHash("sha256").update('{"a":[true,null,"é"],"b":1}').digest("hex"));
		for (const length of [0, 1, 2, 3, 31, 32, 33, 64]) {
			const bytes = Uint8Array.from({ length }, (_, index) => (index * 37 + length) % 256);
			expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
			expect(fromBase64(toBase64(bytes))).toEqual(bytes);
		}
		expect(fromBase64("not base64!")).toBeUndefined();
		const keys = generateKeyPairSync("ed25519");
		const pem = keys.publicKey.export({ type: "spki", format: "pem" });
		const der = keys.publicKey.export({ type: "spki", format: "der" }).toString("base64");
		const key = publicKeyFromPem(pem);
		expect(key?.der).toBe(der);
		expect(keyFingerprint(der)).toBe(createHash("sha256").update(Buffer.from(der, "base64")).digest("hex").slice(0, 16));
		const message = new TextEncoder().encode("signed by node");
		const signature = sign(null, message, keys.privateKey).toString("base64");
		expect(key !== undefined && signatureVerifies(key, message, signature)).toBe(true);
		expect(key !== undefined && signatureVerifies(key, new TextEncoder().encode("signed by nobody"), signature)).toBe(false);
		// Not an Ed25519 key: an X25519 key has another algorithm identifier.
		const x25519 = generateKeyPairSync("x25519").publicKey.export({ type: "spki", format: "pem" });
		expect(publicKeyFromPem(x25519)).toBeUndefined();
		expect(createPublicKey(pem).asymmetricKeyType).toBe("ed25519");
	});

	it("verifies a chain the Node signer wrote, and finds the first broken line of a tampered copy", () => {
		const directory = playRun();
		const events = read(directory, EVENTS_FILE);
		const chain = read(directory, CHAIN_FILE);
		const key = read(directory, PUBLIC_KEY_FILE);
		expect(verifyChainText(events, chain, key)).toMatchObject({ ok: true, lines: 4, heads: [{ lines: 2, state: "c".repeat(64) }, { lines: 4 }] });

		const edited = lines(events);
		edited[2] = (edited[2] ?? "").replace("door", "doer");
		expect(verifyChainText(joined(edited), chain, key)).toEqual({ ok: false, line: 3, reason: "does not match the chain (the line was changed, deleted, inserted or moved)" });

		const removed = lines(events).filter((_, index) => index !== 1);
		expect(verifyChainText(joined(removed), chain, key)).toEqual({ ok: false, line: 2, reason: "does not match the chain (the line was changed, deleted, inserted or moved)" });

		const other = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
		const wrongKey = verifyChainText(events, chain, other);
		expect(wrongKey.ok).toBe(false);
		expect(wrongKey.ok ? "" : wrongKey.reason).toMatch(/^the chain was not made with this key/);

		const forged = lines(chain);
		const last = forged.at(-1) ?? "";
		forged[forged.length - 1] = last.replace(/"signature":"(.)/, (_, first: string) => `"signature":"${first === "A" ? "B" : "A"}`);
		expect(verifyChainText(events, joined(forged), key)).toEqual({ ok: false, line: 4, reason: `${CHAIN_FILE} line 7: the head's signature does not verify` });
	});
});

/** Every recorded run folder with a chain (stories/<name>/runs/<run>/run). */
function recordedRuns(): readonly string[] {
	const stories = join(ROOT, "stories");
	return readdirSync(stories, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(stories, entry.name, "runs")))
		.flatMap((entry) => readdirSync(join(stories, entry.name, "runs")).map((run) => join(stories, entry.name, "runs", run, "run")))
		.filter((directory) => existsSync(join(directory, CHAIN_FILE)));
}

/** A recorded run that was stopped before its end: its chain's tail was never signed. */
const STOPPED = "salt-market-04a-003-v2-s42-stopped";

describe("the recorded runs (golden)", () => {
	const runs = recordedRuns();

	it("finds the recorded runs", () => {
		expect(runs.length).toBeGreaterThanOrEqual(30);
	});

	it.each(runs.map((directory) => [directory.slice(ROOT.length + 1), directory]))("%s verifies as before", (_, directory) => {
		const verdict = verifyChainText(read(directory, EVENTS_FILE), read(directory, CHAIN_FILE), read(directory, PUBLIC_KEY_FILE));
		expect(verifyChain(directory)).toEqual(verdict);
		if (directory.includes(STOPPED)) {
			expect(verdict).toEqual({ ok: false, line: 1, reason: "lines 1-2287 are not covered by a signed head (the chain's tail is missing or the run did not end)" });
		} else {
			expect(verdict).toMatchObject({ ok: true, lines: lines(read(directory, EVENTS_FILE)).length });
		}
	});

	it("fails a recorded run with one byte changed, a line removed or another key, at the first broken line", () => {
		const directory = runs.find((run) => run.includes("chess-02a-002-default-s31")) ?? runs[0] ?? "";
		const events = lines(read(directory, EVENTS_FILE));
		const chain = read(directory, CHAIN_FILE);
		const key = read(directory, PUBLIC_KEY_FILE);
		const middle = Math.floor(events.length / 2);
		const changed = [...events];
		changed[middle] = (changed[middle] ?? "").replace(/"minute":(\d)/, (_, digit: string) => `"minute":${String((Number(digit) + 1) % 10)}`);
		expect(changed[middle]).not.toBe(events[middle]);
		expect(verifyChainText(joined(changed), chain, key)).toEqual({ ok: false, line: middle + 1, reason: "does not match the chain (the line was changed, deleted, inserted or moved)" });
		const removed = events.filter((_, index) => index !== middle);
		expect(verifyChainText(joined(removed), chain, key)).toMatchObject({ ok: false, line: middle + 1 });
		const other = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
		expect(verifyChainText(joined(events), chain, other)).toMatchObject({ ok: false, reason: matching(/^the chain was not made with this key/) });
	});
});
