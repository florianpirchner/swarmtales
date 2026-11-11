/**
 * The verifier of the signed event log (docs/design/event-log-signing.md), on texts: no file system,
 * no `node:crypto`, so the CLI, a browser and a Web Worker give the same verdict.
 *
 * Line `n`'s hash is `sha256(hash(n-1) + canonicalJson(line n))` (RFC 8785, hex digests, UTF-8),
 * starting from the genesis entry's hash. A head entry signs `{format, genesis, lines, hash}` (and a
 * checkpoint's snapshot `state`) with the run's Ed25519 key.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { Check } from "typebox/value";
import { bytesToHex, utf8ToBytes } from "./bytes.ts";
import { canonicalJson, iJsonIssue } from "./canonical.ts";
import { publicKeyFromDer, publicKeyFromPem, keyFingerprint, signatureVerifies } from "./keys.ts";
import { CHAIN_FILE, type ChainCheckpoint, type ChainVerdict, EVENTS_FILE, GenesisEntrySchema, HEAD_FORMAT, HeadEntrySchema, LineEntrySchema, ZERO_HASH } from "./schemas.ts";

/** One link: `sha256(previous + text)`, hex. */
export function linkHash(previous: string, text: string): string {
	return bytesToHex(sha256(utf8ToBytes(previous + text)));
}

/** The hash of a JSON value (a log line, the genesis, a story): sha256 of its canonical JSON. */
export function jsonHash(value: unknown): string {
	return bytesToHex(sha256(utf8ToBytes(canonicalJson(value))));
}

/** The text a head signature is made over (sign its UTF-8 bytes); a checkpoint's head also signs its snapshot's state. */
export function headMessage(genesis: string, lines: number, hash: string, state?: string): string {
	return canonicalJson({ format: HEAD_FORMAT, genesis, lines, hash, ...(state === undefined ? {} : { state }) });
}

/**
 * The state hash of a snapshot file (a parsed run file, untrusted): sha256 of its canonical JSON
 * without its `chain`. What a checkpoint signs as `state` and what a resume and `swt log verify
 * --snapshot` compare against.
 */
export function snapshotStateHash(file: unknown): string {
	const value: unknown = JSON.parse(JSON.stringify(file));
	if (typeof value !== "object" || value === null || Array.isArray(value)) return jsonHash(value);
	return jsonHash(Object.fromEntries(Object.entries(value).filter(([key]) => key !== "chain")));
}

/** Whether a checkpoint's signature holds under the key it names. */
export function checkpointVerifies(checkpoint: ChainCheckpoint): boolean {
	const key = publicKeyFromDer(checkpoint.publicKey);
	return key !== undefined && signatureVerifies(key, utf8ToBytes(headMessage(checkpoint.genesis, checkpoint.lines, checkpoint.hash, checkpoint.state)), checkpoint.signature);
}

function isRunEnd(value: unknown): boolean {
	return typeof value === "object" && value !== null && Reflect.get(value, "type") === "run_end";
}

/** The lines of a JSONL text, without the empty string after its last newline. */
export function linesOf(text: string): readonly string[] {
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

/** A line's link hash and value, or why it cannot be hashed: not JSON, or not I-JSON (step 18 challenge, m2). */
function hashOfLine(previous: string, text: string): { readonly hash: string; readonly value: unknown } | { readonly reason: string } {
	const parsed = parseJson(text);
	if (!parsed.ok) return { reason: "not a JSON line" };
	const issue = iJsonIssue(text, parsed.value);
	if (issue !== undefined) return { reason: `not I-JSON (${issue}): JSON parsers may read the line differently` };
	try {
		return { hash: linkHash(previous, canonicalJson(parsed.value)), value: parsed.value };
	} catch {
		return { reason: "not a JSON line" };
	}
}

function chainLines(entries: readonly string[]): number {
	return entries.filter((text) => {
		const parsed = parseJson(text);
		return parsed.ok && Check(LineEntrySchema, parsed.value);
	}).length;
}

/**
 * Checks a chain against the lines of `events.jsonl` and a public key (PEM). Reports the first
 * broken line: a changed, deleted, inserted or moved line breaks the hash of the first line it
 * touches; a cut tail leaves lines without a chain entry or without a signed head.
 */
export function verifyChainText(events: string, chain: string, publicKeyPem: string): ChainVerdict {
	const key = publicKeyFromPem(publicKeyPem);
	if (key === undefined) return { ok: false, reason: "the public key is not an Ed25519 public key" };
	const entries = linesOf(chain);
	const first = entries[0] === undefined ? undefined : parseJson(entries[0]);
	if (first === undefined || !first.ok || !Check(GenesisEntrySchema, first.value)) return { ok: false, reason: `${CHAIN_FILE} line 1 is not a genesis entry` };
	const { genesis, previousHash } = first.value;
	if (genesis.publicKey !== key.der) return { ok: false, reason: `the chain was not made with this key (the genesis names key ${keyFingerprint(genesis.publicKey)}, the key given is ${keyFingerprint(key.der)})` };
	const anchor = genesis.resumedFrom?.checkpoint;
	if (previousHash !== (anchor?.hash ?? ZERO_HASH)) return { ok: false, reason: "the genesis does not chain from the hash it names" };
	if (anchor !== undefined && !checkpointVerifies(anchor)) return { ok: false, reason: "the snapshot checkpoint the run resumed from is not signed by the key it names" };
	const genesisHash = linkHash(previousHash, canonicalJson(genesis));
	if (first.value.hash !== genesisHash) return { ok: false, reason: "the genesis entry's hash does not match its content" };

	const lines = linesOf(events);
	const chained = chainLines(entries);
	const heads: { lines: number; hash: string; state?: string }[] = [];
	let head = genesisHash;
	let covered = 0;
	let signedLast = false;
	for (const [index, text] of entries.entries()) {
		if (index === 0) continue;
		const parsed = parseJson(text);
		const entry = parsed.ok ? parsed.value : undefined;
		if (Check(HeadEntrySchema, entry)) {
			if (entry.seq !== covered || entry.hash !== head) return { ok: false, line: covered, reason: `${CHAIN_FILE} line ${String(index + 1)}: the signed head does not match the chain before it` };
			if (!signatureVerifies(key, utf8ToBytes(headMessage(genesisHash, entry.seq, entry.hash, entry.state)), entry.signature)) return { ok: false, line: covered, reason: `${CHAIN_FILE} line ${String(index + 1)}: the head's signature does not verify` };
			heads.push({ lines: entry.seq, hash: entry.hash, ...(entry.state === undefined ? {} : { state: entry.state }) });
			signedLast = true;
			continue;
		}
		if (!Check(LineEntrySchema, entry)) return { ok: false, line: covered + 1, reason: `${CHAIN_FILE} line ${String(index + 1)} is not a chain entry` };
		covered += 1;
		signedLast = false;
		if (entry.seq !== covered) return { ok: false, line: covered, reason: `${CHAIN_FILE} line ${String(index + 1)}: expected seq ${String(covered)}, found ${String(entry.seq)}` };
		const line = lines[covered - 1];
		if (line === undefined) return { ok: false, line: covered, reason: `missing from ${EVENTS_FILE} (it has ${String(lines.length)} lines, the chain covers ${String(chained)})` };
		const linked = hashOfLine(head, line);
		if ("reason" in linked) return { ok: false, line: covered, reason: linked.reason };
		if (linked.hash !== entry.hash) return { ok: false, line: covered, reason: "does not match the chain (the line was changed, deleted, inserted or moved)" };
		// A run has one end: a log with lines after a run_end was cut back to it or grew past it (step 18 challenge, m3).
		if (isRunEnd(linked.value) && covered < chained) return { ok: false, line: covered, reason: "a run_end before the log's last line (a run ends once)" };
		head = linked.hash;
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

/** The three texts of a signed run: `events.jsonl`, `events.chain.jsonl` and the public key (PEM). */
export interface ChainTexts {
	readonly events: string;
	readonly chain: string;
	readonly publicKey: string;
}

export interface ContinuityTextOptions {
	/**
	 * Maps a parsed line before the prefix comparison, e.g. an old event type to its current name
	 * (chronicle passes legacy-log's `withCurrentType`). Default: the line as it is.
	 */
	readonly normalize?: (value: unknown) => unknown;
}

/** A line without its wall-clock stamp, which a resumed run writes anew for its prefix. */
function withoutStamp(value: unknown): unknown {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
	return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "at"));
}

/**
 * Checks that a resumed run continues a previous one: both chains hold, the resumed genesis chains
 * from a head the previous run signed (with the same snapshot state, when the checkpoint names one),
 * the resumed log's prefix repeats the previous log's lines up to that head (all but their
 * wall-clock stamps), and the line right after the prefix is the resume's `run_resumed`, so nothing
 * stands between them (step 18 challenge, chain-security M1).
 */
export function verifyContinuityText(previous: ChainTexts, resumed: ChainTexts, options: ContinuityTextOptions = {}): ChainVerdict {
	const before = verifyChainText(previous.events, previous.chain, previous.publicKey);
	if (!before.ok) return { ok: false, reason: `the previous run's chain does not hold: ${before.line === undefined ? "" : `line ${String(before.line)}: `}${before.reason}` };
	const after = verifyChainText(resumed.events, resumed.chain, resumed.publicKey);
	if (!after.ok) return after;
	const anchor = after.genesis.resumedFrom?.checkpoint;
	if (anchor === undefined) return { ok: false, reason: "the run does not chain from a snapshot checkpoint" };
	if (anchor.publicKey !== before.genesis.publicKey || anchor.genesis !== before.genesisHash) return { ok: false, reason: "the snapshot checkpoint belongs to another chain than the previous run's" };
	if (!before.heads.some((entry) => entry.lines === anchor.lines && entry.hash === anchor.hash && entry.state === anchor.state)) {
		return { ok: false, reason: `the previous run signed no head over line ${String(anchor.lines)} with the checkpoint's hash${anchor.state === undefined ? "" : " and snapshot state"}` };
	}
	const normalize = options.normalize ?? ((value: unknown) => value);
	const comparable = (text: string): string | undefined => {
		const parsed = parseJson(text);
		return parsed.ok ? canonicalJson(withoutStamp(normalize(parsed.value))) : undefined;
	};
	const old = linesOf(previous.events);
	const now = linesOf(resumed.events);
	for (let index = 0; index < anchor.lines; index += 1) {
		const left = comparable(old[index] ?? "");
		if (left === undefined || left !== comparable(now[index] ?? "")) return { ok: false, line: index + 1, reason: "the resumed run's prefix differs from the previous run's line" };
	}
	const marker = parseJson(now[anchor.lines] ?? "");
	if (!marker.ok || typeof marker.value !== "object" || marker.value === null || Reflect.get(marker.value, "type") !== "run_resumed") {
		return { ok: false, line: anchor.lines + 1, reason: "the line after the resumed prefix is not the run_resumed marker (a line between the checkpoint and the resume is not the previous run's)" };
	}
	return after;
}
