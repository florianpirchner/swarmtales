/**
 * The signed event log (docs/design/event-log-signing.md): a hash chain over the lines of
 * `events.jsonl`, kept as a sidecar so the log itself keeps its bytes.
 *
 * ```
 * events.jsonl         unchanged
 * events.chain.jsonl   genesis, then {"seq":n,"hash":...} per line of events.jsonl, and signed heads
 * run.pub              the run's Ed25519 public key (PEM, SPKI)
 * ```
 *
 * This file signs (`EventChain`, `node:crypto`) and reads run directories. Every verification is
 * `@swarmtales/chain`'s pure verifier, so the CLI and the browser viewer give one verdict; its
 * names are re-exported here for the callers of this package.
 *
 * Every run makes its own Ed25519 key pair; the private key lives only in this object's memory and
 * is never written or logged. A resumed run's genesis chains from the snapshot's checkpoint: its
 * `previousHash` is the checkpoint's hash.
 */
import { createHash, generateKeyPairSync, type KeyObject, sign } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	CHAIN_FILE,
	CHAIN_FORMAT,
	CHAIN_VERSION,
	type ChainCheckpoint,
	type ChainGenesis,
	type ChainGenesisInput,
	type ChainTexts,
	type ChainVerdict,
	canonicalJson,
	EVENTS_FILE,
	headMessage,
	PUBLIC_KEY_FILE,
	verifyChainText,
	verifyContinuityText,
	ZERO_HASH,
} from "@swarmtales/chain";
import { withCurrentType } from "@swarmtales/legacy-log";

// What the CLI and the other packages import from here; the rest of the verifier is `@swarmtales/chain`'s.
export {
	CHAIN_FILE,
	ChainCheckpointSchema,
	checkpointVerifies,
	EVENTS_FILE,
	jsonHash,
	keyFingerprint,
	PUBLIC_KEY_FILE,
	snapshotStateHash,
	type ChainCheckpoint,
	type ChainGenesisInput,
	type ChainVerdict,
} from "@swarmtales/chain";

/** One link with `node:crypto` (the writer's hot path); `@swarmtales/chain`'s `linkHash` gives the same hex. */
function nodeLinkHash(previous: string, text: string): string {
	return createHash("sha256").update(previous, "utf8").update(text, "utf8").digest("hex");
}

function derOf(key: KeyObject): string {
	return key.export({ type: "spki", format: "der" }).toString("base64");
}

function isRunEnd(value: unknown): boolean {
	return typeof value === "object" && value !== null && Reflect.get(value, "type") === "run_end";
}

export interface EventChainOptions {
	/** A fixed key pair instead of a fresh one; for tests only (the chain's determinism). */
	readonly keys?: { readonly publicKey: KeyObject; readonly privateKey: KeyObject };
}

/**
 * Writes `events.chain.jsonl` and `run.pub` of one run. `JsonlEventLog` hands it every line it
 * writes, after writing it; nothing else may append to `events.jsonl`.
 */
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

	constructor(directory: string, input: ChainGenesisInput, options: EventChainOptions = {}) {
		mkdirSync(directory, { recursive: true });
		const keys = options.keys ?? generateKeyPairSync("ed25519");
		this.#privateKey = keys.privateKey;
		this.publicKey = derOf(keys.publicKey);
		writeFileSync(join(directory, PUBLIC_KEY_FILE), keys.publicKey.export({ type: "spki", format: "pem" }));
		const genesis: ChainGenesis = { format: CHAIN_FORMAT, version: CHAIN_VERSION, algorithm: "ed25519", digest: "sha256", canonical: "RFC 8785", publicKey: this.publicKey, ...input };
		const previousHash = input.resumedFrom?.checkpoint?.hash ?? ZERO_HASH;
		this.genesisHash = nodeLinkHash(previousHash, canonicalJson(genesis));
		this.#head = this.genesisHash;
		this.#path = join(directory, CHAIN_FILE);
		writeFileSync(this.#path, `${JSON.stringify({ kind: "genesis", seq: 0, previousHash, hash: this.genesisHash, genesis })}\n`);
	}

	/** Chains one line of `events.jsonl` (without its newline); a `run_end` line is signed at once. */
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

	/**
	 * Signs the head now (a snapshot's checkpoint) and returns it; a resumed run's genesis chains from
	 * it. `state` is the snapshot's `snapshotStateHash`, signed with the head.
	 */
	checkpoint(state?: string): ChainCheckpoint {
		return this.#sign(state);
	}

	/** Signs the head when lines came after the last signature. Call once the run's last line is written. */
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

/** The texts of a run directory's chain, or why they cannot be read; `publicKeyPem` replaces its `run.pub`. */
function runTexts(directory: string, publicKeyPem?: string): ChainTexts | { readonly ok: false; readonly reason: string } {
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

export interface ContinuityOptions {
	/** The previous run's public key (PEM) published elsewhere, instead of its own `run.pub`. */
	readonly previousKey?: string;
}

/**
 * Checks that the run directory `resumed` continues the run directory `previous`
 * (`verifyContinuityText` of `@swarmtales/chain`); event types an older log wrote under another
 * name are compared under their current one (`withCurrentType`).
 */
export function verifyContinuity(previous: string, resumed: string, options: ContinuityOptions = {}): ChainVerdict {
	const before = runTexts(previous, options.previousKey);
	if ("reason" in before) return { ok: false, reason: `the previous run's chain does not hold: ${before.reason}` };
	const after = runTexts(resumed);
	if ("reason" in after) return after;
	return verifyContinuityText(before, after, { normalize: withCurrentType });
}
