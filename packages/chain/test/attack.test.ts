// SPDX-License-Identifier: Apache-2.0
/**
 * Attacks on a version 2 run, written by the challenger of M1-04: a log that is cut back, grown, rewritten or
 * reworded must not pass as the run that was signed, and what holds without being a whole run must say so.
 */
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Check } from "typebox/value";
import { afterEach, describe, expect, it } from "vitest";
import { linesOf, linkHash } from "../src/hashes.ts";
import { canonicalJson, ChainGenesisSchema, type ChainGenesisV2Input, ChainGenesisV2Schema, EVENTS_FILE, GenesisEntrySchema, jsonHash, type RunTexts, verifyChainText, verifyRunTexts } from "../src/index.ts";
import { EventChain, runTexts } from "./signer.ts";

const directories: string[] = [];

afterEach(() => {
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const MANIFEST = { format: "swarmtales-run", version: 1, game: { id: "hello", hash: "a".repeat(64) }, seed: 7 };
const GENESIS: ChainGenesisV2Input = { manifest: jsonHash(MANIFEST), log: { format: "swarmtales.events", version: 1 } };
const BIG = 9007199254740992;

const envelope = (seq: number, type: string, payload: unknown): string => canonicalJson({ seq, tick: 0, source: "kernel", type, actor: "kernel", payload, at: "2026-11-14T10:00:00.000Z" });

const LINES = [envelope(1, "run_started", { seed: 7 }), envelope(2, "tool_called", { as: "guess", params: { number: BIG, word: "A" } }), envelope(3, "tick_ended", {}), envelope(4, "run_ended", { reason: "ticks" })];

/** A signed run of four lines; `checkpointAfter` signs a head after that many lines, as a snapshot does. */
function run(checkpointAfter?: number): RunTexts {
	const directory = mkdtempSync(join(tmpdir(), "chain-attack-"));
	directories.push(directory);
	const chain = new EventChain(directory, GENESIS);
	for (const [index, line] of LINES.entries()) {
		appendFileSync(join(directory, EVENTS_FILE), `${line}\n`);
		chain.append(line);
		if (index + 1 === checkpointAfter) chain.checkpoint();
	}
	const texts = runTexts(directory);
	if ("reason" in texts) throw new Error(texts.reason);
	return { ...texts, manifest: JSON.stringify(MANIFEST) };
}

/** A run that signed a head before its first line. */
function signedEmpty(): RunTexts {
	const directory = mkdtempSync(join(tmpdir(), "chain-attack-"));
	directories.push(directory);
	new EventChain(directory, GENESIS).close();
	appendFileSync(join(directory, EVENTS_FILE), "");
	const texts = runTexts(directory);
	if ("reason" in texts) throw new Error(texts.reason);
	return { ...texts, manifest: JSON.stringify(MANIFEST) };
}

const text = (lines: readonly string[]): string => `${lines.join("\n")}\n`;

/** `expect.stringMatching`, typed as the asymmetric matcher it is. */
function matching(pattern: RegExp): unknown {
	const matcher: unknown = expect.stringMatching(pattern);
	return matcher;
}

/** The `hash` of a chain entry. */
function hashOf(entry: string | undefined): string {
	const value: unknown = JSON.parse(entry ?? "{}");
	const hash: unknown = typeof value === "object" && value !== null ? Reflect.get(value, "hash") : undefined;
	return typeof hash === "string" ? hash : "";
}

/** The chain rewritten by someone without the key: the genesis changed, every hash computed anew, the old heads kept. */
function rechained(texts: RunTexts, change: (genesis: Record<string, unknown>) => Record<string, unknown>): string {
	const [first = "", ...rest] = linesOf(texts.chain);
	const entry: unknown = JSON.parse(first);
	if (!Check(GenesisEntrySchema, entry)) throw new Error("no genesis entry");
	const genesis = change({ ...entry.genesis });
	let head = linkHash(entry.previousHash, canonicalJson(genesis));
	const lines = [JSON.stringify({ ...entry, hash: head, genesis })];
	for (const [index, line] of linesOf(texts.events).entries()) {
		head = linkHash(head, line);
		lines.push(JSON.stringify({ seq: index + 1, hash: head }));
	}
	const signed: unknown = JSON.parse(rest.at(-1) ?? "");
	lines.push(JSON.stringify({ ...Object(signed), hash: head }));
	return text(lines);
}

describe("a version 2 run under attack", () => {
	it("holds as it was written, and says that it is finished", () => {
		expect(verifyRunTexts(run())).toMatchObject({ ok: true, lines: 4, finished: true, heads: [{ lines: 4 }] });
	});

	it("does not pass a line whose text another parser reads differently: digits beyond a double, key order, an escape, white space", () => {
		const texts = run();
		const [one = "", two = "", ...rest] = linesOf(texts.events);
		const reworded = [two.replace(String(BIG), "9007199254740993"), two.replace('"word":"A"', '"word":"\\u0041"'), two.replace('{"number"', '{ "number"'), `${two}\r`, two.replace(String(BIG), "9007199254740992.0")];
		for (const line of reworded) {
			expect(JSON.parse(line)).toEqual(JSON.parse(two));
			expect(verifyRunTexts({ ...texts, events: text([one, line, ...rest]) })).toEqual({ ok: false, kind: "chain", line: 2, reason: matching(/^not canonical JSON/) });
		}
		const parsed: unknown = JSON.parse(one);
		const reordered = JSON.stringify(Object.fromEntries((typeof parsed === "object" && parsed !== null ? Object.entries(parsed) : []).reverse()));
		expect(verifyRunTexts({ ...texts, events: text([reordered, two, ...rest]) })).toMatchObject({ ok: false, kind: "chain", line: 1 });
	});

	it("says `finished: false` for a log cut back to a signed head, and breaks for a cut without one", () => {
		const texts = run(2);
		expect(verifyRunTexts(texts)).toMatchObject({ ok: true, lines: 4, finished: true, heads: [{ lines: 2 }, { lines: 4 }] });
		const events = linesOf(texts.events);
		const chain = linesOf(texts.chain);
		// Genesis, two line entries and the head of the snapshot: a whole chain file of a run that stopped there.
		const cut = { ...texts, events: text(events.slice(0, 2)), chain: text(chain.slice(0, 4)) };
		expect(verifyRunTexts(cut)).toMatchObject({ ok: true, lines: 2, finished: false, heads: [{ lines: 2 }] });
		expect(verifyChainText(cut.events, cut.chain, cut.publicKey)).toMatchObject({ ok: true, finished: false });
		expect(verifyRunTexts({ ...texts, events: text(events.slice(0, 3)), chain: text(chain.slice(0, 5)) })).toMatchObject({ ok: false, kind: "unsigned", line: 3 });
		expect(verifyRunTexts({ ...texts, events: text(events.slice(0, 3)) })).toMatchObject({ ok: false, kind: "chain", line: 4 });
		// A head over no line at all holds, and is no finished run; the same head under another run's genesis does not hold.
		expect(verifyRunTexts(signedEmpty())).toMatchObject({ ok: true, lines: 0, finished: false });
		expect(verifyRunTexts({ ...texts, events: "", chain: text([chain[0] ?? "", ...linesOf(signedEmpty().chain).slice(1)]) })).toMatchObject({ ok: false, kind: "chain" });
	});

	it("does not let a log grow past its end without the key", () => {
		const texts = run();
		const chain = linesOf(texts.chain);
		const more = envelope(5, "tool_called", { as: "guess", params: {} });
		const head = linkHash(hashOf(chain[4]), more);
		const lineEntry = JSON.stringify({ seq: 5, hash: head });
		const grown = text([...linesOf(texts.events), more]);
		expect(verifyRunTexts({ ...texts, events: grown })).toMatchObject({ ok: false, kind: "chain", line: 5 });
		expect(verifyRunTexts({ ...texts, events: grown, chain: text([...chain, lineEntry]) })).toMatchObject({ ok: false, kind: "chain", line: 4, reason: matching(/a run ends once/) });
		// The end line replaced by another, with its hash entry and the old head pointed at the new hash.
		const other = envelope(4, "tool_called", { as: "guess", params: {} });
		const replaced = linkHash(hashOf(chain[3]), other);
		const forged = [...chain.slice(0, 4), JSON.stringify({ seq: 4, hash: replaced }), (chain[5] ?? "").replace(hashOf(chain[5]), replaced)];
		expect(verifyRunTexts({ ...texts, events: text([...linesOf(texts.events).slice(0, 3), other]), chain: text(forged) })).toMatchObject({ ok: false, kind: "signature", line: 4 });
	});

	it("does not let the genesis be rewritten: another manifest, with every hash computed anew, fails at the signature", () => {
		const texts = run();
		const changed = { ...MANIFEST, seed: 8 };
		const chain = rechained(texts, (genesis) => ({ ...genesis, manifest: jsonHash(changed) }));
		expect(verifyRunTexts({ ...texts, chain, manifest: JSON.stringify(changed) })).toMatchObject({ ok: false, kind: "signature", line: 4 });
		expect(verifyRunTexts({ ...texts, manifest: JSON.stringify(changed) })).toMatchObject({ ok: false, kind: "manifest" });
		expect(verifyRunTexts({ ...texts, chain: rechained(texts, (genesis) => genesis) })).toMatchObject({ ok: true });
	});

	it("takes no unknown field in the genesis, in its log format or in a chain entry", () => {
		const texts = run();
		const refused = { ok: false, kind: "chain", reason: "events.chain.jsonl line 1 is not a genesis entry" };
		expect(verifyRunTexts({ ...texts, chain: rechained(texts, (genesis) => ({ ...genesis, note: "x" })) })).toEqual(refused);
		expect(verifyRunTexts({ ...texts, chain: rechained(texts, (genesis) => ({ ...genesis, log: { ...Object(genesis.log), note: "x" } })) })).toEqual(refused);
		expect(verifyRunTexts({ ...texts, chain: rechained(texts, (genesis) => ({ ...genesis, seed: 7 })) })).toEqual(refused);
		expect(verifyRunTexts({ ...texts, chain: rechained(texts, (genesis) => ({ ...genesis, manifest: "A".repeat(64) })) })).toEqual(refused);
		const [first = "", second = "", ...rest] = linesOf(texts.chain);
		expect(verifyRunTexts({ ...texts, chain: text([first, second.replace("{", '{"note":"x",'), ...rest]) })).toMatchObject({ ok: false, kind: "chain", line: 1, reason: matching(/is not a chain entry/) });
		expect(verifyRunTexts({ ...texts, chain: text([first.replace("{", '{"note":"x",'), second, ...rest]) })).toEqual(refused);
	});

	it("is refused whole by a verifier that knows only version 1", () => {
		const first: unknown = JSON.parse(linesOf(run().chain)[0] ?? "");
		const entry = Check(GenesisEntrySchema, first) ? first : undefined;
		const genesis: unknown = entry?.genesis;
		expect(Check(ChainGenesisV2Schema, genesis)).toBe(true);
		// The old verifier's genesis schema is closed and wants `version: 1`, `story`, `storyHash`, `seed` and `models`.
		expect(Check(ChainGenesisSchema, genesis)).toBe(false);
		expect(Check(ChainGenesisSchema, { ...Object(genesis), version: 1 })).toBe(false);
	});
});
