// SPDX-License-Identifier: Apache-2.0
/**
 * The Node signer the carried chain tests run against: `EventChain`, `verifyChain` and `verifyContinuity` from
 * the old `packages/chronicle/src/log/chain.ts`, and a few lines that stand in for the old JSONL log and its bus.
 * The signer of the platform is `@swarmtales/runlog` (it needs `node:crypto`, and this package may import no
 * workspace package), so the tests keep their own copy. It writes a genesis of version 1 for the old input and
 * of version 2 for an input that names a manifest.
 */
import { createHash, generateKeyPairSync, type KeyObject, sign } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	CHAIN_FILE,
	CHAIN_FORMAT,
	type ChainCheckpoint,
	type ChainGenesisInput,
	type ChainGenesisV2Input,
	type ChainTexts,
	type ChainVerdict,
	type ContinuityTextOptions,
	canonicalJson,
	EVENTS_FILE,
	headMessage,
	PUBLIC_KEY_FILE,
	verifyChainText,
	verifyContinuityText,
	ZERO_HASH,
} from "../src/index.ts";

/** One link with `node:crypto`; the package's `linkHash` gives the same hex. */
function nodeLinkHash(previous: string, text: string): string {
	return createHash("sha256").update(previous, "utf8").update(text, "utf8").digest("hex");
}

function derOf(key: KeyObject): string {
	return key.export({ type: "spki", format: "der" }).toString("base64");
}

function isRunEnd(value: unknown): boolean {
	const type: unknown = typeof value === "object" && value !== null ? Reflect.get(value, "type") : undefined;
	return type === "run_end" || type === "run_ended";
}

export interface EventChainOptions {
	/** A fixed key pair instead of a fresh one (the chain's determinism). */
	readonly keys?: { readonly publicKey: KeyObject; readonly privateKey: KeyObject };
}

/** Writes `events.chain.jsonl` and `run.pub` of one run. */
export class EventChain {
	readonly #path: string;
	readonly #privateKey: KeyObject;
	/** base64 SPKI DER. */
	readonly publicKey: string;
	readonly genesisHash: string;
	#lines = 0;
	#head: string;
	/** Lines covered by the last signed head (-1: none yet). */
	#signed = -1;
	#checkpoint: ChainCheckpoint | undefined;

	constructor(directory: string, input: ChainGenesisInput | ChainGenesisV2Input, options: EventChainOptions = {}) {
		mkdirSync(directory, { recursive: true });
		const keys = options.keys ?? generateKeyPairSync("ed25519");
		this.#privateKey = keys.privateKey;
		this.publicKey = derOf(keys.publicKey);
		writeFileSync(join(directory, PUBLIC_KEY_FILE), keys.publicKey.export({ type: "spki", format: "pem" }));
		const genesis = { format: CHAIN_FORMAT, version: "manifest" in input ? 2 : 1, algorithm: "ed25519", digest: "sha256", canonical: "RFC 8785", publicKey: this.publicKey, ...input };
		const previousHash = input.resumedFrom?.checkpoint?.hash ?? ZERO_HASH;
		this.genesisHash = nodeLinkHash(previousHash, canonicalJson(genesis));
		this.#head = this.genesisHash;
		this.#path = join(directory, CHAIN_FILE);
		writeFileSync(this.#path, `${JSON.stringify({ kind: "genesis", seq: 0, previousHash, hash: this.genesisHash, genesis })}\n`);
	}

	/** Chains one line of `events.jsonl` (without its newline); a line that ends the run is signed at once. */
	append(line: string): void {
		const value: unknown = JSON.parse(line);
		this.#lines += 1;
		this.#head = nodeLinkHash(this.#head, canonicalJson(value));
		appendFileSync(this.#path, `{"seq":${String(this.#lines)},"hash":"${this.#head}"}\n`);
		if (isRunEnd(value)) this.#sign();
	}

	/** The lines chained so far and the hash of the last. */
	head(): { readonly lines: number; readonly hash: string } {
		return { lines: this.#lines, hash: this.#head };
	}

	/** Signs the head now (a snapshot's checkpoint) and returns it; `state` is signed with the head. */
	checkpoint(state?: string): ChainCheckpoint {
		return this.#sign(state);
	}

	/** Signs the head when lines came after the last signature. */
	close(): void {
		if (this.#signed !== this.#lines) this.#sign();
	}

	#sign(state?: string): ChainCheckpoint {
		if (this.#signed === this.#lines && this.#checkpoint !== undefined && (state === undefined || this.#checkpoint.state === state)) return this.#checkpoint;
		const signature = sign(null, Buffer.from(headMessage(this.genesisHash, this.#lines, this.#head, state), "utf8"), this.#privateKey).toString("base64");
		appendFileSync(this.#path, `${JSON.stringify({ kind: "head", seq: this.#lines, hash: this.#head, ...(state === undefined ? {} : { state }), signature })}\n`);
		this.#signed = this.#lines;
		this.#checkpoint = { genesis: this.genesisHash, lines: this.#lines, hash: this.#head, publicKey: this.publicKey, signature, ...(state === undefined ? {} : { state }) };
		return this.#checkpoint;
	}
}

/** An event as the old log took it: a `type` and its fields. */
export type LogEvent = Readonly<Record<string, unknown>> & { readonly type: string };

/**
 * Stands in for the old bus and JSONL log: numbers each event, stamps it with the minute and the wall clock,
 * writes it as one line of `events.jsonl` and chains it.
 */
export function openLog(directory: string, chain: EventChain, minute: () => number): (event: LogEvent) => void {
	let seq = 0;
	return (event) => {
		seq += 1;
		const line = JSON.stringify({ seq, minute: minute(), ...event, at: new Date().toISOString() });
		appendFileSync(join(directory, EVENTS_FILE), `${line}\n`);
		chain.append(line);
	};
}

/** The texts of a run directory's chain, or why they cannot be read; `publicKeyPem` replaces its `run.pub`. */
export function runTexts(directory: string, publicKeyPem?: string): ChainTexts | { readonly ok: false; readonly reason: string } {
	for (const name of [EVENTS_FILE, CHAIN_FILE, ...(publicKeyPem === undefined ? [PUBLIC_KEY_FILE] : [])]) {
		if (!existsSync(join(directory, name))) return { ok: false, reason: `${name} is missing in ${directory}` };
	}
	return {
		events: readFileSync(join(directory, EVENTS_FILE), "utf8"),
		chain: readFileSync(join(directory, CHAIN_FILE), "utf8"),
		publicKey: publicKeyPem ?? readFileSync(join(directory, PUBLIC_KEY_FILE), "utf8"),
	};
}

/** Reads a run directory's chain; `publicKeyPem` replaces its `run.pub` (a key published elsewhere). */
export function verifyChain(directory: string, publicKeyPem?: string): ChainVerdict {
	const texts = runTexts(directory, publicKeyPem);
	return "reason" in texts ? texts : verifyChainText(texts.events, texts.chain, texts.publicKey);
}

export interface ContinuityOptions extends ContinuityTextOptions {
	/** The previous run's public key (PEM) published elsewhere, instead of its own `run.pub`. */
	readonly previousKey?: string;
}

/** Checks that the run directory `resumed` continues the run directory `previous`. */
export function verifyContinuity(previous: string, resumed: string, options: ContinuityOptions = {}): ChainVerdict {
	const before = runTexts(previous, options.previousKey);
	if ("reason" in before) return { ok: false, reason: `the previous run's chain does not hold: ${before.reason}` };
	const after = runTexts(resumed);
	if ("reason" in after) return after;
	return verifyContinuityText(before, after, options.normalize === undefined ? {} : { normalize: options.normalize });
}
