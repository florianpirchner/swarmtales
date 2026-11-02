/**
 * The signed event log (docs/design/event-log-signing.md): `events.chain.jsonl` and `run.pub`
 * beside an unchanged `events.jsonl`.
 */
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "@swarmtales/legacy-log";
import {
	CHAIN_FILE,
	type ChainGenesisInput,
	checkpointVerifies,
	EVENTS_FILE,
	EventChain,
	type EventChainOptions,
	JsonlEventLog,
	jsonHash,
	linkHash,
	PUBLIC_KEY_FILE,
	verifyChain,
	verifyChainText,
	verifyContinuity,
	ZERO_HASH,
} from "@swarmtales/chronicle";

/** `expect.stringMatching`, typed as the asymmetric matcher it is. */
function matching(pattern: RegExp): unknown {
	const matcher: unknown = expect.stringMatching(pattern);
	return matcher;
}

const directories: string[] = [];

function tempDirectory(): string {
	const directory = mkdtempSync(join(tmpdir(), "chain-test-"));
	directories.push(directory);
	return directory;
}

afterEach(() => {
	vi.useRealTimers();
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const GENESIS: ChainGenesisInput = { story: "cityofkeys", storyHash: "a".repeat(64), seed: 7, models: { A01: "scripted/-", gamemaker: "off" }, commit: "0123456789abcdef0123456789abcdef01234567" };

/** A run of a few lines through the bus, the log and the chain; returns its directory and chain. */
function playRun(options: { readonly genesis?: ChainGenesisInput; readonly chain?: EventChainOptions; readonly texts?: readonly string[]; readonly end?: boolean } = {}): { readonly directory: string; readonly chain: EventChain } {
	const directory = tempDirectory();
	const chain = new EventChain(directory, options.genesis ?? GENESIS, options.chain);
	let minute = 0;
	const bus = new EventBus([new JsonlEventLog(join(directory, EVENTS_FILE), { chain })], () => minute);
	bus.emit({ type: "round_start", round: 1, order: ["A01", "A02"] });
	for (const text of options.texts ?? ["Hello", "Who holds the key?", "Not me."]) bus.emit({ type: "text", agent: "A01", text });
	minute = 1;
	bus.emit({ type: "round_start", round: 2, order: ["A02", "A01"] });
	bus.emit({ type: "text", agent: "A02", text: "The door is open." });
	if (options.end !== false) bus.emit({ type: "run_end", reason: "done" });
	return { directory, chain };
}

function read(directory: string, name: string): string {
	return readFileSync(join(directory, name), "utf8");
}

function lines(directory: string, name: string): string[] {
	return read(directory, name).trimEnd().split("\n");
}

/** Verifies the run's files with one of them replaced. */
function verifyWith(directory: string, change: { readonly events?: readonly string[]; readonly chain?: readonly string[]; readonly key?: string }) {
	const events = change.events === undefined ? read(directory, EVENTS_FILE) : `${change.events.join("\n")}\n`;
	const chain = change.chain === undefined ? read(directory, CHAIN_FILE) : `${change.chain.join("\n")}\n`;
	return verifyChainText(events, chain, change.key ?? read(directory, PUBLIC_KEY_FILE));
}

describe("the signed event log", () => {
	it("chains every line of events.jsonl, signs the run's end and writes only the public key", () => {
		const { directory, chain } = playRun();
		const events = lines(directory, EVENTS_FILE);
		const entries = lines(directory, CHAIN_FILE).map((line): unknown => JSON.parse(line));
		expect(events).toHaveLength(7);
		// Genesis, one entry per line, the head signed at run_end.
		expect(entries).toHaveLength(9);
		expect(entries[0]).toMatchObject({ kind: "genesis", seq: 0, previousHash: ZERO_HASH, genesis: { format: "swarmtales-chain", story: "cityofkeys", seed: 7, publicKey: chain.publicKey, commit: GENESIS.commit } });
		expect(entries.slice(1, 8).map((entry): unknown => (typeof entry === "object" && entry !== null ? Reflect.get(entry, "seq") : undefined))).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(entries[8]).toMatchObject({ kind: "head", seq: 7, hash: chain.head().hash });
		// Line n: sha256(hash(n-1) + canonical JSON of line n).
		const first: unknown = JSON.parse(events[0] ?? "");
		const expected = linkHash(chain.genesisHash, '{"at":' + JSON.stringify(Reflect.get(typeof first === "object" && first !== null ? first : {}, "at")) + ',"minute":0,"order":["A01","A02"],"round":1,"seq":1,"type":"round_start"}');
		expect(entries[1]).toEqual({ seq: 1, hash: expected });

		const verdict = verifyChain(directory);
		expect(verdict).toMatchObject({ ok: true, lines: 7, head: chain.head().hash, heads: [{ lines: 7, hash: chain.head().hash }] });
		expect(readdirSync(directory).sort()).toEqual([CHAIN_FILE, EVENTS_FILE, PUBLIC_KEY_FILE].sort());
		expect(read(directory, PUBLIC_KEY_FILE)).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
		for (const name of readdirSync(directory)) expect(read(directory, name)).not.toMatch(/PRIVATE/);
		expect(JSON.stringify(chain)).not.toMatch(/PRIVATE|privateKey/);
	});

	it("leaves events.jsonl byte for byte as the log without a chain writes it", () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-11-02T10:00:00.000Z"));
		const signed = playRun();
		const plain = tempDirectory();
		let minute = 0;
		const bus = new EventBus([new JsonlEventLog(join(plain, EVENTS_FILE))], () => minute);
		bus.emit({ type: "round_start", round: 1, order: ["A01", "A02"] });
		for (const text of ["Hello", "Who holds the key?", "Not me."]) bus.emit({ type: "text", agent: "A01", text });
		minute = 1;
		bus.emit({ type: "round_start", round: 2, order: ["A02", "A01"] });
		bus.emit({ type: "text", agent: "A02", text: "The door is open." });
		bus.emit({ type: "run_end", reason: "done" });
		expect(read(signed.directory, EVENTS_FILE)).toBe(read(plain, EVENTS_FILE));
		expect(readdirSync(plain)).toEqual([EVENTS_FILE]);
	});

	it("finds a changed line", () => {
		const { directory } = playRun();
		const events = lines(directory, EVENTS_FILE);
		events[2] = (events[2] ?? "").replace("Who holds the key?", "I hold the key.");
		expect(verifyWith(directory, { events })).toEqual({ ok: false, line: 3, reason: matching(/does not match the chain/) });
		// Whitespace and key order are not changes: the chain hashes the canonical JSON.
		const reordered = lines(directory, EVENTS_FILE);
		const parsed: unknown = JSON.parse(reordered[1] ?? "");
		reordered[1] = JSON.stringify(typeof parsed === "object" && parsed !== null ? Object.fromEntries(Object.entries(parsed).reverse()) : parsed, null, 1).replace(/\n/g, " ");
		expect(verifyWith(directory, { events: reordered })).toMatchObject({ ok: true });
	});

	it("finds a deleted line, an inserted line and a swapped order", () => {
		const { directory } = playRun();
		const events = lines(directory, EVENTS_FILE);
		expect(verifyWith(directory, { events: events.filter((_, index) => index !== 3) })).toMatchObject({ ok: false, line: 4 });
		expect(verifyWith(directory, { events: [...events.slice(0, 2), events[2] ?? "", ...events.slice(2)] })).toMatchObject({ ok: false, line: 4 });
		const swapped = [...events];
		[swapped[1], swapped[2]] = [events[2] ?? "", events[1] ?? ""];
		expect(verifyWith(directory, { events: swapped })).toMatchObject({ ok: false, line: 2 });
		expect(verifyWith(directory, { events: [...events.slice(0, 4), "not json", ...events.slice(5)] })).toEqual({ ok: false, line: 5, reason: "not a JSON line" });
	});

	it("chains each hash on the one before, so lines cannot be moved together with their chain entries", () => {
		const { directory } = playRun();
		const events = lines(directory, EVENTS_FILE);
		const chain = lines(directory, CHAIN_FILE);
		// Lines 2 and 3 swapped in both files, the entries renumbered: each entry still names its line's own hash.
		const swapped = [events[0] ?? "", events[2] ?? "", events[1] ?? "", ...events.slice(3)];
		const renumber = (entry: string, seq: number): string => entry.replace(/^\{"seq":\d+/, `{"seq":${String(seq)}`);
		const entries = [chain[0] ?? "", chain[1] ?? "", renumber(chain[3] ?? "", 2), renumber(chain[2] ?? "", 3), ...chain.slice(4)];
		expect(verifyWith(directory, { events: swapped, chain: entries })).toMatchObject({ ok: false, line: 2 });
	});

	it("finds a truncated tail of the log and of the chain", () => {
		const { directory } = playRun();
		const events = lines(directory, EVENTS_FILE);
		const chain = lines(directory, CHAIN_FILE);
		expect(verifyWith(directory, { events: events.slice(0, 4) })).toEqual({ ok: false, line: 5, reason: matching(/missing from events\.jsonl/) });
		// Both cut, the head with them: nothing signs the lines left.
		expect(verifyWith(directory, { events: events.slice(0, 4), chain: chain.slice(0, 5) })).toEqual({ ok: false, line: 1, reason: matching(/lines 1-4 are not covered by a signed head/) });
		// Only the head gone.
		expect(verifyWith(directory, { chain: chain.slice(0, -1) })).toMatchObject({ ok: false, line: 1 });
		// A line appended to the log after the chain ended.
		expect(verifyWith(directory, { events: [...events, events[1] ?? ""] })).toEqual({ ok: false, line: 8, reason: matching(/not in the chain/) });
		// A chain entry dropped in the middle.
		expect(verifyWith(directory, { chain: chain.filter((_, index) => index !== 2) })).toMatchObject({ ok: false, line: 2 });
	});

	it("refuses a wrong key, a forged head and a rewritten genesis", () => {
		const { directory } = playRun();
		const other = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }).toString();
		expect(verifyWith(directory, { key: other })).toEqual({ ok: false, reason: matching(/not made with this key/) });
		expect(verifyWith(directory, { key: "not a key" })).toEqual({ ok: false, reason: matching(/not an Ed25519 public key/) });
		const chain = lines(directory, CHAIN_FILE);
		const head: unknown = JSON.parse(chain.at(-1) ?? "");
		const signature = typeof head === "object" && head !== null ? String(Reflect.get(head, "signature")) : "";
		const forged = Buffer.from(signature, "base64");
		forged[0] = (forged[0] ?? 0) ^ 1;
		expect(verifyWith(directory, { chain: [...chain.slice(0, -1), (chain.at(-1) ?? "").replace(signature, forged.toString("base64"))] })).toEqual({ ok: false, line: 7, reason: matching(/signature does not verify/) });
		// A changed seed in the genesis breaks its hash.
		expect(verifyWith(directory, { chain: [(chain[0] ?? "").replace('"seed":7', '"seed":8'), ...chain.slice(1)] })).toEqual({ ok: false, reason: matching(/genesis entry's hash/) });
		// The whole chain made again under a fresh key holds against that key, never against the run's (the stated limit).
		const resigned = playRun();
		expect(verifyWith(directory, { chain: lines(resigned.directory, CHAIN_FILE), key: read(directory, PUBLIC_KEY_FILE) })).toMatchObject({ ok: false });
	});

	it("gives the same hashes for the same log, and different ones for another genesis", () => {
		const keys = generateKeyPairSync("ed25519");
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-11-02T10:00:00.000Z"));
		const one = playRun({ chain: { keys } });
		const two = playRun({ chain: { keys } });
		// Ed25519 signatures are deterministic too, so the sidecars are byte-equal.
		expect(read(two.directory, CHAIN_FILE)).toBe(read(one.directory, CHAIN_FILE));
		const three = playRun({ chain: { keys }, genesis: { ...GENESIS, commitments: { treatment: jsonHash({ A01: "control", A02: "treated" }) } } });
		expect(three.chain.genesisHash).not.toBe(one.chain.genesisHash);
		expect(verifyChain(three.directory)).toMatchObject({ ok: true, genesis: { commitments: { treatment: jsonHash({ A02: "treated", A01: "control" }) } } });
		expect(jsonHash({ b: 1, a: [1, 2] })).toBe(jsonHash({ a: [1, 2], b: 1 }));
		// A head signed by the same key over another log of the same length does not sign this one.
		const other = playRun({ chain: { keys }, texts: ["Hello", "Who holds the key?", "I do."] });
		const foreignHead = lines(other.directory, CHAIN_FILE).at(-1) ?? "";
		expect(foreignHead).toMatch(/"kind":"head","seq":7/);
		expect(verifyWith(one.directory, { chain: [...lines(one.directory, CHAIN_FILE).slice(0, -1), foreignHead] })).toEqual({ ok: false, line: 7, reason: matching(/does not match the chain before it/) });
	});

	it("signs a run that ends without run_end when it closes, and signs checkpoints", () => {
		const { directory, chain } = playRun({ end: false });
		expect(verifyChain(directory)).toMatchObject({ ok: false, line: 1, reason: matching(/not covered by a signed head/) });
		chain.close();
		const heads = (): number => lines(directory, CHAIN_FILE).filter((line) => line.includes('"kind":"head"')).length;
		expect(heads()).toBe(1);
		// Signed, but a log without its run_end line is not a whole run.
		expect(verifyChain(directory)).toEqual({ ok: false, line: 6, reason: matching(/ends before its run_end line/) });
		// A checkpoint at the same line writes no second head.
		const checkpoint = chain.checkpoint();
		expect(heads()).toBe(1);
		expect(checkpoint).toMatchObject({ lines: 6, hash: chain.head().hash, genesis: chain.genesisHash, publicKey: chain.publicKey });
		expect(checkpointVerifies(checkpoint)).toBe(true);
		expect(checkpointVerifies({ ...checkpoint, lines: 5 })).toBe(false);
		expect(chain.checkpoint()).toEqual(checkpoint);
		chain.close();
		expect(heads()).toBe(1);
	});

	it("refuses a log cut back to a signed checkpoint", () => {
		const directory = tempDirectory();
		const chain = new EventChain(directory, GENESIS);
		const bus = new EventBus([new JsonlEventLog(join(directory, EVENTS_FILE), { chain })], () => 0);
		bus.emit({ type: "round_start", round: 1, order: ["A01"] });
		bus.emit({ type: "text", agent: "A01", text: "before the snapshot" });
		chain.checkpoint();
		bus.emit({ type: "text", agent: "A01", text: "after the snapshot" });
		bus.emit({ type: "run_end", reason: "done" });
		expect(verifyChain(directory)).toMatchObject({ ok: true, lines: 4, heads: [{ lines: 2 }, { lines: 4 }] });
		const chained = lines(directory, CHAIN_FILE);
		expect(verifyWith(directory, { events: lines(directory, EVENTS_FILE).slice(0, 2), chain: chained.slice(0, 4) })).toEqual({ ok: false, line: 2, reason: matching(/ends before its run_end line/) });
	});
});

describe("a resumed run's chain", () => {
	/** The original run (checkpoint after its fourth line) and the resumed run, which writes the prefix again. */
	function resumedPair(options: { readonly prefixChange?: (line: string) => string; readonly checkpoint?: (taken: ReturnType<EventChain["checkpoint"]>) => ReturnType<EventChain["checkpoint"]> } = {}) {
		const previous = tempDirectory();
		const before = new EventChain(previous, { ...GENESIS, models: { A01: "scripted/-" } });
		const log = new JsonlEventLog(join(previous, EVENTS_FILE), { chain: before });
		let minute = 0;
		const bus = new EventBus([log], () => minute);
		bus.emit({ type: "round_start", round: 1, order: ["A01"] });
		bus.emit({ type: "text", agent: "A01", text: "one" });
		bus.emit({ type: "text", agent: "A01", text: "two" });
		bus.emit({ type: "text", agent: "A01", text: "three" });
		const taken = before.checkpoint();
		minute = 1;
		bus.emit({ type: "run_end", reason: "snapshot" });

		const resumed = tempDirectory();
		const checkpoint = options.checkpoint?.(taken) ?? taken;
		const after = new EventChain(resumed, { ...GENESIS, resumedFrom: { file: "snapshot-L7.json", run: "run-001", checkpoint } });
		const prefix = lines(previous, EVENTS_FILE).slice(0, taken.lines);
		const write = (line: string): void => {
			writeFileSync(join(resumed, EVENTS_FILE), `${line}\n`, { flag: "a" });
			after.append(line);
		};
		// The CLI writes the prefix again with fresh wall-clock stamps.
		for (const line of prefix) write((options.prefixChange ?? ((text: string) => text))(line.replace(/"at":"[^"]+"/, '"at":"2026-11-02T11:00:00.000Z"')));
		write(JSON.stringify({ seq: taken.lines + 1, minute: 1, type: "text", agent: "A01", text: "four", at: "2026-11-02T11:00:01.000Z" }));
		write(JSON.stringify({ seq: taken.lines + 2, minute: 1, type: "run_end", at: "2026-11-02T11:00:02.000Z" }));
		return { previous, resumed, taken, after };
	}

	it("chains from the snapshot's checkpoint and continues the previous log", () => {
		const { previous, resumed, taken, after } = resumedPair();
		const genesis: unknown = JSON.parse(lines(resumed, CHAIN_FILE)[0] ?? "");
		expect(genesis).toMatchObject({ previousHash: taken.hash, genesis: { resumedFrom: { file: "snapshot-L7.json", run: "run-001", checkpoint: taken } } });
		expect(verifyChain(resumed)).toMatchObject({ ok: true, lines: 6, head: after.head().hash });
		expect(verifyContinuity(previous, resumed)).toMatchObject({ ok: true, lines: 6 });
	});

	it("refuses a prefix that differs from the previous log, a forged checkpoint and a checkpoint of another run", () => {
		const changed = resumedPair({ prefixChange: (line) => line.replace('"text":"two"', '"text":"2"') });
		// The resumed chain itself holds (it was written over the changed line); the continuity does not.
		expect(verifyChain(changed.resumed)).toMatchObject({ ok: true });
		expect(verifyContinuity(changed.previous, changed.resumed)).toEqual({ ok: false, line: 3, reason: matching(/prefix differs/) });

		const forged = resumedPair({ checkpoint: (taken) => ({ ...taken, hash: "b".repeat(64) }) });
		expect(verifyChain(forged.resumed)).toEqual({ ok: false, reason: matching(/checkpoint the run resumed from is not signed/) });

		const stranger = playRun();
		const foreign = resumedPair({ checkpoint: () => stranger.chain.checkpoint() });
		expect(verifyChain(foreign.resumed)).toMatchObject({ ok: true });
		expect(verifyContinuity(foreign.previous, foreign.resumed)).toEqual({ ok: false, reason: matching(/another chain/) });
		expect(verifyContinuity(stranger.directory, foreign.resumed)).toEqual({ ok: false, line: 1, reason: matching(/prefix differs/) });
	});

	it("needs the checkpoint among the previous run's signed heads", () => {
		const { previous, resumed } = resumedPair();
		// The previous chain still holds without its checkpoint head (the run_end head signs every line) ...
		const kept = lines(previous, CHAIN_FILE).filter((line, index) => index !== 5);
		expect(kept).toHaveLength(lines(previous, CHAIN_FILE).length - 1);
		writeFileSync(join(previous, CHAIN_FILE), `${kept.join("\n")}\n`);
		expect(verifyChain(previous)).toMatchObject({ ok: true, heads: [{ lines: 5 }] });
		// ... but no longer shows that it signed the head the resumed run names.
		expect(verifyContinuity(previous, resumed)).toEqual({ ok: false, reason: matching(/signed no head over line 4/) });
	});

	it("refuses to call a run without a checkpoint a continuation", () => {
		const { directory } = playRun();
		const other = playRun();
		expect(verifyContinuity(other.directory, directory)).toEqual({ ok: false, reason: matching(/does not chain from a snapshot checkpoint/) });
	});
});
