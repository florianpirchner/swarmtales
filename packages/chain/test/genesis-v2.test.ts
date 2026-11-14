// SPDX-License-Identifier: Apache-2.0
/** The genesis of version 2 and `verifyRunTexts`: a run of envelopes whose genesis names the hash of its manifest. */
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Check } from "typebox/value";
import { CHAIN_VERSION, type ChainGenesisV2Input, ChainGenesisV2Schema, EVENTS_FILE, jsonHash, type RunTexts, verifyChainText, verifyRunTexts } from "../src/index.ts";
import { EventChain, runTexts } from "./signer.ts";

/** `expect.stringMatching`, typed as the asymmetric matcher it is. */
function matching(pattern: RegExp): unknown {
	const matcher: unknown = expect.stringMatching(pattern);
	return matcher;
}

const directories: string[] = [];

afterEach(() => {
	for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const MANIFEST = { schema: 1, game: { name: "guess-number", hash: "a".repeat(64) }, seed: 7, runtime: 3 };
const GENESIS: ChainGenesisV2Input = { manifest: jsonHash(MANIFEST), log: { format: "swarmtales.events", version: 1 } };

const envelope = (seq: number, source: string, type: string, payload: unknown): string =>
	JSON.stringify({ seq, tick: 0, source, type, actor: "kernel", payload, at: "2026-11-14T10:00:00.000Z" });

/** A run of envelopes with a version 2 genesis; `events` replaces the three lines it writes by default. */
function playRun(options: { readonly events?: readonly string[]; readonly genesis?: ConstructorParameters<typeof EventChain>[1]; readonly close?: boolean } = {}): RunTexts {
	const directory = mkdtempSync(join(tmpdir(), "chain-v2-"));
	directories.push(directory);
	const chain = new EventChain(directory, options.genesis ?? GENESIS);
	const events = options.events ?? [
		envelope(1, "kernel", "run_started", { game: "guess-number", seed: 7 }),
		envelope(2, "kernel", "tool_called", { as: "guess", params: { number: 4 } }),
		envelope(3, "kernel", "run_ended", { reason: "done" }),
	];
	for (const line of events) {
		appendFileSync(join(directory, EVENTS_FILE), `${line}\n`);
		chain.append(line);
	}
	if (options.close === true) chain.close();
	const texts = runTexts(directory);
	if ("reason" in texts) throw new Error(texts.reason);
	// Key order and whitespace of the manifest file do not matter: its canonical JSON is hashed.
	return { ...texts, manifest: JSON.stringify(Object.fromEntries(Object.entries(MANIFEST).reverse()), null, "\t") };
}

describe("the genesis of version 2", () => {
	it("is what a run writes today, and names the manifest in place of what the manifest says", () => {
		expect(CHAIN_VERSION).toBe(2);
		const run = playRun();
		const first: unknown = JSON.parse(run.chain.split("\n")[0] ?? "");
		const genesis: unknown = typeof first === "object" && first !== null ? Reflect.get(first, "genesis") : undefined;
		expect(Check(ChainGenesisV2Schema, genesis)).toBe(true);
		expect(genesis).toMatchObject({ version: 2, manifest: jsonHash(MANIFEST), log: { format: "swarmtales.events", version: 1 } });
		// The fields of version 1 are gone, and a genesis that mixes the versions is none.
		expect(Check(ChainGenesisV2Schema, { ...Object(genesis), seed: 7 })).toBe(false);
		const mixed = verifyChainText(run.events, run.chain.replace('"version":2', '"version":1'), run.publicKey);
		expect(mixed).toEqual({ ok: false, reason: "events.chain.jsonl line 1 is not a genesis entry" });
	});

	it("accepts a version 2 run", () => {
		const run = playRun();
		expect(verifyRunTexts(run)).toMatchObject({ ok: true, lines: 3, genesis: { version: 2, manifest: jsonHash(MANIFEST) }, heads: [{ lines: 3 }] });
		expect(verifyRunTexts(run)).toEqual(verifyChainText(run.events, run.chain, run.publicKey));
	});

	it("names a changed manifest", () => {
		const run = playRun();
		expect(verifyRunTexts({ ...run, manifest: run.manifest.replace('"seed": 7', '"seed": 8') })).toEqual({ ok: false, reason: matching(/^the manifest does not match the genesis/) });
		expect(verifyRunTexts({ ...run, manifest: "{" })).toEqual({ ok: false, reason: "the manifest is not JSON" });
		expect(verifyRunTexts({ ...run, manifest: '{"seed":7,"seed":8}' })).toEqual({ ok: false, reason: matching(/^the manifest is not I-JSON \(duplicate key "seed"\)/) });
		// A genesis rewritten to name the changed manifest breaks its own hash.
		const changed = { ...MANIFEST, seed: 8 };
		const rewritten = { ...run, manifest: JSON.stringify(changed), chain: run.chain.replace(jsonHash(MANIFEST), jsonHash(changed)) };
		expect(verifyRunTexts(rewritten)).toEqual({ ok: false, reason: "the genesis entry's hash does not match its content" });
	});

	it("reports a broken chain before the manifest, and at its line", () => {
		const run = playRun();
		const tampered = { ...run, events: run.events.replace('"number":4', '"number":5'), manifest: "{}" };
		expect(verifyRunTexts(tampered)).toEqual({ ok: false, line: 2, reason: "does not match the chain (the line was changed, deleted, inserted or moved)" });
	});

	it("refuses a run of version 1: it names no manifest", () => {
		const old = playRun({ genesis: { story: "cityofkeys", storyHash: "a".repeat(64), seed: 7, models: {} }, events: ['{"seq":1,"minute":0,"type":"run_end"}'] });
		expect(verifyChainText(old.events, old.chain, old.publicKey)).toMatchObject({ ok: true, genesis: { version: 1 } });
		expect(verifyRunTexts(old)).toEqual({ ok: false, reason: matching(/^the genesis is of version 1/) });
	});

	it("lets a run end once: nothing follows the kernel's run_ended, and a plugin's event of that name is no end", () => {
		const grown = playRun({ events: [envelope(1, "kernel", "run_ended", { reason: "done" }), envelope(2, "kernel", "tick_started", {}), envelope(3, "kernel", "run_ended", { reason: "done" })] });
		expect(verifyRunTexts(grown)).toEqual({ ok: false, line: 1, reason: "a run_ended before the log's last line (a run ends once)" });
		const plugin = playRun({ events: [envelope(1, "@swarmtales/roster/roster", "run_ended", {}), envelope(2, "kernel", "run_ended", { reason: "done" })] });
		expect(verifyRunTexts(plugin)).toMatchObject({ ok: true, lines: 2 });
	});

	it("holds for a signed log without its run_ended (unfinished is the run log's verdict), and not without a signed head", () => {
		const events = [envelope(1, "kernel", "run_started", {}), envelope(2, "kernel", "tick_started", {})];
		expect(verifyRunTexts(playRun({ events }))).toEqual({ ok: false, line: 1, reason: matching(/^lines 1-2 are not covered by a signed head/) });
		expect(verifyRunTexts(playRun({ events, close: true }))).toMatchObject({ ok: true, lines: 2 });
	});
});
