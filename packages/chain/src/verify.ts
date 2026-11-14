// SPDX-License-Identifier: Apache-2.0
/**
 * The verifier of the signed event log, on texts: no file system, no `node:crypto`, so the CLI, a browser and a
 * Web Worker give the same verdict. The hash rule is in `hashes.ts`.
 */
import type { Static } from "typebox";
import { Check } from "typebox/value";
import { utf8ToBytes } from "./bytes.ts";
import { canonicalJson, iJsonIssue } from "./canonical.ts";
import { checkpointVerifies, fieldOf, headMessage, linesOf, linkHash, parseJson } from "./hashes.ts";
import { type PublicKey, keyFingerprint, publicKeyFromPem, signatureVerifies } from "./keys.ts";
import { CHAIN_FILE, type ChainBroken, type ChainGenesis, type ChainGenesisV2, type ChainVerdict, EVENTS_FILE, GenesisEntrySchema, HeadEntrySchema, LineEntrySchema, type VerifiedHead, ZERO_HASH } from "./schemas.ts";

// The line that ends a run: `run_end` in a version 1 log, the kernel's `run_ended` envelope in a version 2 log.
function endType(genesis: ChainGenesis | ChainGenesisV2): string {
	return genesis.version === 1 ? "run_end" : "run_ended";
}

function isRunEnd(value: unknown, genesis: ChainGenesis | ChainGenesisV2): boolean {
	if (fieldOf(value, "type") !== endType(genesis)) return false;
	return genesis.version === 1 || fieldOf(value, "source") === "kernel";
}

// A line's link hash and value, or why it cannot be hashed: not JSON, or not I-JSON.
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

/** What stays the same while the entries of a chain are walked. */
interface Start {
	readonly key: PublicKey;
	readonly genesis: ChainGenesis | ChainGenesisV2;
	readonly genesisHash: string;
	/** The lines of `events.jsonl`. */
	readonly lines: readonly string[];
	/** How many line entries the chain has. */
	readonly chained: number;
}

/** Where the walk stands. */
interface Walk {
	head: string;
	covered: number;
	signedLast: boolean;
	readonly heads: VerifiedHead[];
}

const broken = (reason: string, line?: number): ChainBroken => (line === undefined ? { ok: false, reason } : { ok: false, line, reason });

// Why a genesis entry does not stand at the start of a chain under this key.
function genesisFault(entry: Static<typeof GenesisEntrySchema>, key: PublicKey, genesisHash: string): ChainBroken | undefined {
	const { genesis, previousHash } = entry;
	if (genesis.publicKey !== key.der) return broken(`the chain was not made with this key (the genesis names key ${keyFingerprint(genesis.publicKey)}, the key given is ${keyFingerprint(key.der)})`);
	const anchor = genesis.resumedFrom?.checkpoint;
	if (previousHash !== (anchor?.hash ?? ZERO_HASH)) return broken("the genesis does not chain from the hash it names");
	if (anchor !== undefined && !checkpointVerifies(anchor)) return broken("the snapshot checkpoint the run resumed from is not signed by the key it names");
	if (entry.hash !== genesisHash) return broken("the genesis entry's hash does not match its content");
	return undefined;
}

// Checks the key and the genesis entry; returns the start of the walk or the fault.
function startOf(events: string, entries: readonly string[], publicKeyPem: string): Start | ChainBroken {
	const key = publicKeyFromPem(publicKeyPem);
	if (key === undefined) return broken("the public key is not an Ed25519 public key");
	const first = entries[0] === undefined ? undefined : parseJson(entries[0]);
	if (first === undefined || !first.ok || !Check(GenesisEntrySchema, first.value)) return broken(`${CHAIN_FILE} line 1 is not a genesis entry`);
	const { genesis, previousHash } = first.value;
	const genesisHash = linkHash(previousHash, canonicalJson(genesis));
	return genesisFault(first.value, key, genesisHash) ?? { key, genesis, genesisHash, lines: linesOf(events), chained: chainLines(entries) };
}

// Takes a signed head entry: it must name the chain before it and carry the key's signature.
function takeHead(start: Start, walk: Walk, entry: { readonly seq: number; readonly hash: string; readonly state?: string; readonly signature: string }, index: number): ChainBroken | undefined {
	if (entry.seq !== walk.covered || entry.hash !== walk.head) return broken(`${CHAIN_FILE} line ${String(index + 1)}: the signed head does not match the chain before it`, walk.covered);
	if (!signatureVerifies(start.key, utf8ToBytes(headMessage(start.genesisHash, entry.seq, entry.hash, entry.state)), entry.signature)) {
		return broken(`${CHAIN_FILE} line ${String(index + 1)}: the head's signature does not verify`, walk.covered);
	}
	walk.heads.push({ lines: entry.seq, hash: entry.hash, ...(entry.state === undefined ? {} : { state: entry.state }) });
	walk.signedLast = true;
	return undefined;
}

// Takes a line entry: its line of `events.jsonl` must give the entry's hash.
function takeLine(start: Start, walk: Walk, entry: { readonly seq: number; readonly hash: string }, index: number): ChainBroken | undefined {
	walk.covered += 1;
	walk.signedLast = false;
	const covered = walk.covered;
	if (entry.seq !== covered) return broken(`${CHAIN_FILE} line ${String(index + 1)}: expected seq ${String(covered)}, found ${String(entry.seq)}`, covered);
	const line = start.lines[covered - 1];
	if (line === undefined) return broken(`missing from ${EVENTS_FILE} (it has ${String(start.lines.length)} lines, the chain covers ${String(start.chained)})`, covered);
	const linked = hashOfLine(walk.head, line);
	if ("reason" in linked) return broken(linked.reason, covered);
	if (linked.hash !== entry.hash) return broken("does not match the chain (the line was changed, deleted, inserted or moved)", covered);
	// A run has one end: a log with lines after its end was cut back to it or grew past it.
	if (isRunEnd(linked.value, start.genesis) && covered < start.chained) return broken(`a ${endType(start.genesis)} before the log's last line (a run ends once)`, covered);
	walk.head = linked.hash;
	return undefined;
}

// Takes one entry after the genesis.
function takeEntry(start: Start, walk: Walk, text: string, index: number): ChainBroken | undefined {
	const parsed = parseJson(text);
	const entry = parsed.ok ? parsed.value : undefined;
	if (Check(HeadEntrySchema, entry)) return takeHead(start, walk, entry, index);
	if (!Check(LineEntrySchema, entry)) return broken(`${CHAIN_FILE} line ${String(index + 1)} is not a chain entry`, walk.covered + 1);
	return takeLine(start, walk, entry, index);
}

// What is wrong after the last entry: lines outside the chain, an unsigned tail, a version 1 log without its end.
function tailFault(start: Start, walk: Walk): ChainBroken | undefined {
	const { covered } = walk;
	if (start.lines.length > covered) return broken(`not in the chain (the chain ends after line ${String(covered)})`, covered + 1);
	if (!walk.signedLast) {
		const from = (walk.heads.at(-1)?.lines ?? 0) + 1;
		return broken(`lines ${String(from)}-${String(covered)} are not covered by a signed head (the chain's tail is missing or the run did not end)`, from);
	}
	return endFault(start, covered);
}

// Why a version 1 log does not end with its end line. A checkpoint is a signed head too: a log cut back to one
// would hold without this. A version 2 log that ends without `run_ended` is unfinished, not broken: the run
// log's verifier says so.
function endFault(start: Start, covered: number): ChainBroken | undefined {
	if (start.genesis.version !== 1) return undefined;
	const last = covered === 0 ? undefined : parseJson(start.lines[covered - 1] ?? "");
	if (last === undefined || !last.ok || !isRunEnd(last.value, start.genesis)) {
		return broken("the log ends before its run_end line (cut back to a checkpoint, or the run did not end)", covered);
	}
	return undefined;
}

/**
 * Checks a chain against the lines of `events.jsonl` and a public key (PEM). Reports the first
 * broken line: a changed, deleted, inserted or moved line breaks the hash of the first line it
 * touches; a cut tail leaves lines without a chain entry or without a signed head. A genesis of version 1
 * (an old run) and of version 2 are both read.
 *
 * @param events - The text of `events.jsonl`.
 * @param chain - The text of `events.chain.jsonl`.
 * @param publicKeyPem - The public key as PEM (`run.pub`, or a copy published elsewhere).
 * @returns The verdict: the covered lines, the head and the genesis, or the first fault.
 * @public
 */
export function verifyChainText(events: string, chain: string, publicKeyPem: string): ChainVerdict {
	const entries = linesOf(chain);
	const start = startOf(events, entries, publicKeyPem);
	if ("ok" in start) return start;
	const walk: Walk = { head: start.genesisHash, covered: 0, signedLast: false, heads: [] };
	for (const [index, text] of entries.entries()) {
		if (index === 0) continue;
		const fault = takeEntry(start, walk, text, index);
		if (fault !== undefined) return fault;
	}
	return tailFault(start, walk) ?? { ok: true, lines: walk.covered, head: walk.head, genesisHash: start.genesisHash, genesis: start.genesis, heads: walk.heads };
}

/** The three texts of a signed run: `events.jsonl`, `events.chain.jsonl` and the public key (PEM). @public */
export interface ChainTexts {
	/** The text of `events.jsonl`. */
	readonly events: string;
	/** The text of `events.chain.jsonl`. */
	readonly chain: string;
	/** The public key as PEM. */
	readonly publicKey: string;
}
