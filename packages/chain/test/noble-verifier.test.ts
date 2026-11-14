// SPDX-License-Identifier: Apache-2.0
/**
 * The verifier (pure JavaScript, `@noble/*`) against a Node signer (`node:crypto`): a chain the signer writes
 * verifies in the browser verifier, and a tampered copy fails at the first broken line. Carried from the old
 * `test/chain/noble-verifier.test.ts`, without its pass over the recorded runs of the old repository.
 */
import { createHash, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// The byte and key helpers are internal to the package; their parity with node:crypto is checked here.
import { fromBase64, toBase64 } from "../src/bytes.ts";
import { linkHash } from "../src/hashes.ts";
import { CHAIN_FILE, EVENTS_FILE, jsonHash, keyFingerprint, PUBLIC_KEY_FILE, verifyChainText } from "../src/index.ts";
import { publicKeyFromDer, publicKeyFromPem, signatureVerifies } from "../src/keys.ts";
import { EventChain, openLog } from "./signer.ts";

const directories: string[] = [];

afterEach(() => {
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function playRun(): string {
	const directory = mkdtempSync(join(tmpdir(), "noble-chain-"));
	directories.push(directory);
	const chain = new EventChain(directory, { story: "cityofkeys", storyHash: "b".repeat(64), seed: 3, models: { A01: "scripted/-" } });
	let minute = 0;
	const bus = { emit: openLog(directory, chain, () => minute) };
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
		expect(verifyChainText(joined(edited), chain, key)).toEqual({ ok: false, kind: "chain", line: 3, reason: "does not match the chain (the line was changed, deleted, inserted or moved)" });

		const removed = lines(events).filter((_, index) => index !== 1);
		expect(verifyChainText(joined(removed), chain, key)).toEqual({ ok: false, kind: "chain", line: 2, reason: "does not match the chain (the line was changed, deleted, inserted or moved)" });

		const other = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
		const wrongKey = verifyChainText(events, chain, other);
		expect(wrongKey.ok).toBe(false);
		expect(wrongKey.ok ? "" : wrongKey.reason).toMatch(/^the chain was not made with this key/);

		const forged = lines(chain);
		const last = forged.at(-1) ?? "";
		forged[forged.length - 1] = last.replace(/"signature":"(.)/, (_, first: string) => `"signature":"${first === "A" ? "B" : "A"}`);
		expect(verifyChainText(events, joined(forged), key)).toEqual({ ok: false, kind: "signature", line: 4, reason: `${CHAIN_FILE} line 7: the head's signature does not verify` });
	});

	it("is stricter than node:crypto where that is safer: small-order keys, non-canonical base64, junk keys", () => {
		// The identity point as a key, R = identity and S = 0: OpenSSL accepts this "signature" on any message, noble does not.
		const identity = Uint8Array.from({ length: 32 }, (_, index) => (index === 0 ? 1 : 0));
		const prefix = Uint8Array.of(0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00);
		const key = publicKeyFromDer(toBase64(Uint8Array.from([...prefix, ...identity])));
		expect(key).toBeDefined();
		const signature = toBase64(Uint8Array.from([...identity, ...new Uint8Array(32)]));
		expect(key !== undefined && signatureVerifies(key, new TextEncoder().encode("hello"), signature)).toBe(false);
		// One byte string, one text: unused bits must be zero, and padding must fill the last quantum.
		expect(fromBase64("QQ==")).toEqual(Uint8Array.of(65));
		expect(fromBase64("QQ")).toEqual(Uint8Array.of(65));
		expect(fromBase64("QR==")).toBeUndefined();
		expect(fromBase64("QQ=")).toBeUndefined();
		// Two junk keys do not share a fingerprint (before, both were the sha256 of nothing).
		expect(keyFingerprint("!!")).toBe('(not base64: "!!")');
		expect(keyFingerprint("not base64")).not.toBe(keyFingerprint("!!"));
	});
});
