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
 * Every run makes its own Ed25519 key pair (`node:crypto`); the private key lives only in this
 * object's memory and is never written or logged. Line `n`'s hash is
 * `sha256(hash(n-1) + canonicalJson(line n))` (RFC 8785, hex digests, UTF-8), starting from the
 * genesis entry's hash. A head entry signs `{format, genesis, lines, hash}` at the run's end, at
 * every snapshot (a checkpoint the run file carries) and when the writer closes. A resumed run's
 * genesis chains from the snapshot's checkpoint: its `previousHash` is the checkpoint's hash.
 */
import { createHash, createPublicKey, generateKeyPairSync, type KeyObject, sign, verify } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { canonicalJson } from "./canonical.ts";

export const EVENTS_FILE = "events.jsonl";
export const CHAIN_FILE = "events.chain.jsonl";
export const PUBLIC_KEY_FILE = "run.pub";
export const CHAIN_FORMAT = "swarmtales-chain";
export const CHAIN_VERSION = 1;
/** What a head signature is made over (`format` of the signed message). */
const HEAD_FORMAT = "swarmtales-chain-head";
/** The `previousHash` of a chain that continues none. */
export const ZERO_HASH = "0".repeat(64);

const Hash = Type.String({ pattern: "^[0-9a-f]{64}$" });
const Lines = Type.Integer({ minimum: 0 });

/** A signed head, as a snapshot carries it: what a resumed run chains from. */
export const ChainCheckpointSchema = Type.Object(
	{
		/** The genesis hash of the chain it belongs to. */
		genesis: Hash,
		/** How many lines of `events.jsonl` it covers. */
		lines: Lines,
		hash: Hash,
		/** The chain's public key (base64 SPKI DER). */
		publicKey: Type.String(),
		/** Ed25519 over the canonical head message (base64). */
		signature: Type.String(),
	},
	{ additionalProperties: false },
);
export type ChainCheckpoint = Static<typeof ChainCheckpointSchema>;

const ResumedFromSchema = Type.Object(
	{
		/** The snapshot's file name. */
		file: Type.String(),
		/** The run that took it, when its file names it. */
		run: Type.Optional(Type.String()),
		/** The snapshot's signed head; absent for a file written before the chain (no anchor). */
		checkpoint: Type.Optional(ChainCheckpointSchema),
	},
	{ additionalProperties: false },
);

export const ChainGenesisSchema = Type.Object(
	{
		format: Type.Literal(CHAIN_FORMAT),
		version: Type.Literal(CHAIN_VERSION),
		algorithm: Type.Literal("ed25519"),
		digest: Type.Literal("sha256"),
		canonical: Type.Literal("RFC 8785"),
		/** base64 SPKI DER; the same key as `run.pub`. */
		publicKey: Type.String(),
		/** The code's commit, when the run knew it. */
		commit: Type.Optional(Type.String()),
		story: Type.String(),
		/** sha256 of the canonical JSON of the serialised story (`story` in `000-run.json`). */
		storyHash: Hash,
		seed: Type.Number(),
		/** Model per role and resident, e.g. `A01: anthropic/claude-haiku-4-5`. */
		models: Type.Record(Type.String(), Type.String()),
		/** Further commitments fixed before the first line (e.g. a hash of a treatment assignment). */
		commitments: Type.Optional(Type.Record(Type.String(), Type.String())),
		resumedFrom: Type.Optional(ResumedFromSchema),
	},
	{ additionalProperties: false },
);
export type ChainGenesis = Static<typeof ChainGenesisSchema>;

/** What the writer of a run states in its genesis; the key and the format fields are the chain's own. */
export type ChainGenesisInput = Omit<ChainGenesis, "format" | "version" | "algorithm" | "digest" | "canonical" | "publicKey">;

const GenesisEntry = Type.Object({ kind: Type.Literal("genesis"), seq: Type.Literal(0), previousHash: Hash, hash: Hash, genesis: ChainGenesisSchema }, { additionalProperties: false });
const LineEntry = Type.Object({ seq: Type.Integer({ minimum: 1 }), hash: Hash }, { additionalProperties: false });
const HeadEntry = Type.Object({ kind: Type.Literal("head"), seq: Lines, hash: Hash, signature: Type.String() }, { additionalProperties: false });

/** One link: `sha256(previous + text)`, hex. */
export function linkHash(previous: string, text: string): string {
	return createHash("sha256").update(previous, "utf8").update(text, "utf8").digest("hex");
}

/** The hash of a JSON value (a log line, the genesis, a story): sha256 of its canonical JSON. */
export function jsonHash(value: unknown): string {
	return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

/** The bytes a head signature is made over. */
function headMessage(genesis: string, lines: number, hash: string): Buffer {
	return Buffer.from(canonicalJson({ format: HEAD_FORMAT, genesis, lines, hash }), "utf8");
}

function derOf(key: KeyObject): string {
	return key.export({ type: "spki", format: "der" }).toString("base64");
}

/** A short name of a public key: the first 16 hex digits of the sha256 of its DER bytes. */
export function keyFingerprint(publicKey: string): string {
	return createHash("sha256").update(Buffer.from(publicKey, "base64")).digest("hex").slice(0, 16);
}

function publicKeyOf(text: string, format: "pem" | "der"): KeyObject | undefined {
	try {
		const key = format === "pem" ? createPublicKey(text) : createPublicKey({ key: Buffer.from(text, "base64"), format: "der", type: "spki" });
		return key.asymmetricKeyType === "ed25519" ? key : undefined;
	} catch {
		return undefined;
	}
}

function verifies(key: KeyObject, message: Buffer, signature: string): boolean {
	try {
		return verify(null, message, key, Buffer.from(signature, "base64"));
	} catch {
		return false;
	}
}

/** Whether a checkpoint's signature holds under the key it names. */
export function checkpointVerifies(checkpoint: ChainCheckpoint): boolean {
	const key = publicKeyOf(checkpoint.publicKey, "der");
	return key !== undefined && verifies(key, headMessage(checkpoint.genesis, checkpoint.lines, checkpoint.hash), checkpoint.signature);
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
		this.genesisHash = linkHash(previousHash, canonicalJson(genesis));
		this.#head = this.genesisHash;
		this.#path = join(directory, CHAIN_FILE);
		writeFileSync(this.#path, `${JSON.stringify({ kind: "genesis", seq: 0, previousHash, hash: this.genesisHash, genesis })}\n`);
	}

	/** Chains one line of `events.jsonl` (without its newline); a `run_end` line is signed at once. */
	append(line: string): void {
		const value: unknown = JSON.parse(line);
		this.#lines += 1;
		this.#head = linkHash(this.#head, canonicalJson(value));
		appendFileSync(this.#path, `{"seq":${String(this.#lines)},"hash":"${this.#head}"}\n`);
		if (isRunEnd(value)) this.#sign();
	}

	/** The lines chained so far and the hash of the last. */
	head(): { readonly lines: number; readonly hash: string } {
		return { lines: this.#lines, hash: this.#head };
	}

	/** Signs the head now (a snapshot's checkpoint) and returns it; a resumed run's genesis chains from it. */
	checkpoint(): ChainCheckpoint {
		return this.#sign();
	}

	/** Signs the head when lines came after the last signature. Call once the run's last line is written. */
	close(): void {
		if (this.#signed !== this.#lines) this.#sign();
	}

	#sign(): ChainCheckpoint {
		if (this.#signed === this.#lines && this.#checkpoint !== undefined) return this.#checkpoint;
		const signature = sign(null, headMessage(this.genesisHash, this.#lines, this.#head), this.#privateKey).toString("base64");
		appendFileSync(this.#path, `${JSON.stringify({ kind: "head", seq: this.#lines, hash: this.#head, signature })}\n`);
		this.#signed = this.#lines;
		this.#checkpoint = { genesis: this.genesisHash, lines: this.#lines, hash: this.#head, publicKey: this.publicKey, signature };
		return this.#checkpoint;
	}
}

export type ChainVerdict =
	| {
			readonly ok: true;
			/** Lines of `events.jsonl` covered. */
			readonly lines: number;
			readonly head: string;
			readonly genesisHash: string;
			readonly genesis: ChainGenesis;
			/** The signed heads, in chain order (the last covers every line). */
			readonly heads: readonly { readonly lines: number; readonly hash: string }[];
	  }
	| {
			readonly ok: false;
			/** The first line of `events.jsonl` that is broken, when the fault is in a line. */
			readonly line?: number;
			readonly reason: string;
	  };

function linesOf(text: string): readonly string[] {
	const lines = text.split("\n");
	if (lines.at(-1) === "") lines.pop();
	return lines;
}

function parseJson(text: string): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
	try {
		const value: unknown = JSON.parse(text);
		return { ok: true, value };
	} catch {
		return { ok: false };
	}
}

function hashOfLine(previous: string, text: string): string | undefined {
	const parsed = parseJson(text);
	if (!parsed.ok) return undefined;
	try {
		return linkHash(previous, canonicalJson(parsed.value));
	} catch {
		return undefined;
	}
}

/**
 * Checks a chain against the lines of `events.jsonl` and a public key (PEM). Reports the first
 * broken line: a changed, deleted, inserted or moved line breaks the hash of the first line it
 * touches; a cut tail leaves lines without a chain entry or without a signed head.
 */
export function verifyChainText(events: string, chain: string, publicKeyPem: string): ChainVerdict {
	const key = publicKeyOf(publicKeyPem, "pem");
	if (key === undefined) return { ok: false, reason: "the public key is not an Ed25519 public key" };
	const entries = linesOf(chain);
	const first = entries[0] === undefined ? undefined : parseJson(entries[0]);
	if (first === undefined || !first.ok || !Check(GenesisEntry, first.value)) return { ok: false, reason: `${CHAIN_FILE} line 1 is not a genesis entry` };
	const { genesis, previousHash } = first.value;
	if (genesis.publicKey !== derOf(key)) return { ok: false, reason: `the chain was not made with this key (the genesis names key ${keyFingerprint(genesis.publicKey)}, the key given is ${keyFingerprint(derOf(key))})` };
	const anchor = genesis.resumedFrom?.checkpoint;
	if (previousHash !== (anchor?.hash ?? ZERO_HASH)) return { ok: false, reason: "the genesis does not chain from the hash it names" };
	if (anchor !== undefined && !checkpointVerifies(anchor)) return { ok: false, reason: "the snapshot checkpoint the run resumed from is not signed by the key it names" };
	const genesisHash = linkHash(previousHash, canonicalJson(genesis));
	if (first.value.hash !== genesisHash) return { ok: false, reason: "the genesis entry's hash does not match its content" };

	const lines = linesOf(events);
	const heads: { lines: number; hash: string }[] = [];
	let head = genesisHash;
	let covered = 0;
	let signedLast = false;
	for (const [index, text] of entries.entries()) {
		if (index === 0) continue;
		const parsed = parseJson(text);
		const entry = parsed.ok ? parsed.value : undefined;
		if (Check(HeadEntry, entry)) {
			if (entry.seq !== covered || entry.hash !== head) return { ok: false, line: covered, reason: `${CHAIN_FILE} line ${String(index + 1)}: the signed head does not match the chain before it` };
			if (!verifies(key, headMessage(genesisHash, entry.seq, entry.hash), entry.signature)) return { ok: false, line: covered, reason: `${CHAIN_FILE} line ${String(index + 1)}: the head's signature does not verify` };
			heads.push({ lines: entry.seq, hash: entry.hash });
			signedLast = true;
			continue;
		}
		if (!Check(LineEntry, entry)) return { ok: false, line: covered + 1, reason: `${CHAIN_FILE} line ${String(index + 1)} is not a chain entry` };
		covered += 1;
		signedLast = false;
		if (entry.seq !== covered) return { ok: false, line: covered, reason: `${CHAIN_FILE} line ${String(index + 1)}: expected seq ${String(covered)}, found ${String(entry.seq)}` };
		const line = lines[covered - 1];
		if (line === undefined) return { ok: false, line: covered, reason: `missing from ${EVENTS_FILE} (it has ${String(lines.length)} lines, the chain covers ${String(chainLines(entries))})` };
		const hash = hashOfLine(head, line);
		if (hash === undefined) return { ok: false, line: covered, reason: "not a JSON line" };
		if (hash !== entry.hash) return { ok: false, line: covered, reason: "does not match the chain (the line was changed, deleted, inserted or moved)" };
		head = hash;
	}
	if (lines.length > covered) return { ok: false, line: covered + 1, reason: `not in the chain (the chain ends after line ${String(covered)})` };
	if (!signedLast) {
		const from = (heads.at(-1)?.lines ?? 0) + 1;
		return { ok: false, line: from, reason: `lines ${String(from)}-${String(covered)} are not covered by a signed head (the chain's tail is missing or the run did not end)` };
	}
	// A checkpoint is a signed head too: a log cut back to one would hold without this.
	const last = covered === 0 ? undefined : parseJson(lines[covered - 1] ?? "");
	if (last === undefined || !last.ok || !isRunEnd(last.value)) {
		return { ok: false, line: covered, reason: "the log ends before its run_end line (cut back to a checkpoint, or the run did not end)" };
	}
	return { ok: true, lines: covered, head, genesisHash, genesis, heads };
}

function chainLines(entries: readonly string[]): number {
	return entries.filter((text) => {
		const parsed = parseJson(text);
		return parsed.ok && Check(LineEntry, parsed.value);
	}).length;
}

/** Reads a run directory's chain; `publicKeyPem` replaces its `run.pub` (a key published elsewhere). */
export function verifyChain(directory: string, publicKeyPem?: string): ChainVerdict {
	for (const name of [EVENTS_FILE, CHAIN_FILE, ...(publicKeyPem === undefined ? [PUBLIC_KEY_FILE] : [])]) {
		if (!existsSync(join(directory, name))) return { ok: false, reason: `${name} is missing in ${directory}` };
	}
	return verifyChainText(
		readFileSync(join(directory, EVENTS_FILE), "utf8"),
		readFileSync(join(directory, CHAIN_FILE), "utf8"),
		publicKeyPem ?? readFileSync(join(directory, PUBLIC_KEY_FILE), "utf8"),
	);
}

/** A line without its wall-clock stamp, which a resumed run writes anew for its prefix. */
function withoutStamp(value: unknown): unknown {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
	return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "at"));
}

/**
 * Checks that a resumed run continues a previous one: both chains hold, the resumed genesis
 * chains from a head the previous run signed, and the resumed log's prefix repeats the previous
 * log's lines up to that head (all but their wall-clock stamps).
 */
export function verifyContinuity(previous: string, resumed: string): ChainVerdict {
	const before = verifyChain(previous);
	if (!before.ok) return { ok: false, reason: `the previous run's chain does not hold: ${before.line === undefined ? "" : `line ${String(before.line)}: `}${before.reason}` };
	const after = verifyChain(resumed);
	if (!after.ok) return after;
	const anchor = after.genesis.resumedFrom?.checkpoint;
	if (anchor === undefined) return { ok: false, reason: "the run does not chain from a snapshot checkpoint" };
	if (anchor.publicKey !== before.genesis.publicKey || anchor.genesis !== before.genesisHash) return { ok: false, reason: "the snapshot checkpoint belongs to another chain than the previous run's" };
	if (!before.heads.some((entry) => entry.lines === anchor.lines && entry.hash === anchor.hash)) return { ok: false, reason: `the previous run signed no head over line ${String(anchor.lines)} with the checkpoint's hash` };
	const old = linesOf(readFileSync(join(previous, EVENTS_FILE), "utf8"));
	const now = linesOf(readFileSync(join(resumed, EVENTS_FILE), "utf8"));
	for (let index = 0; index < anchor.lines; index += 1) {
		const left = parseJson(old[index] ?? "");
		const right = parseJson(now[index] ?? "");
		if (!left.ok || !right.ok || canonicalJson(withoutStamp(left.value)) !== canonicalJson(withoutStamp(right.value))) {
			return { ok: false, line: index + 1, reason: "the resumed run's prefix differs from the previous run's line" };
		}
	}
	return after;
}
