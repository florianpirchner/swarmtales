import { describe, expect, it } from "vitest";
import { ZERO_HASH } from "@swarmtales/chronicle";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { UsageError } from "../../apps/cli/src/args.ts";
import { codeCommit, inputCommitments, runGenesis, storyHash } from "../../apps/cli/src/host/chain.ts";
import { describeVerdict, parseLogVerifyArgs, snapshotIssue } from "../../apps/cli/src/log-verify-args.ts";

describe("swt log verify", () => {
	it("parses a run directory, a key and a previous run", () => {
		expect(parseLogVerifyArgs(["runs/run-003"])).toEqual({ runDirectory: "runs/run-003" });
		expect(parseLogVerifyArgs(["runs/run-003", "--key", "published.pub", "--previous", "runs/run-002"])).toEqual({ runDirectory: "runs/run-003", key: "published.pub", previous: "runs/run-002" });
		expect(() => parseLogVerifyArgs([])).toThrow(UsageError);
		expect(() => parseLogVerifyArgs(["a", "b"])).toThrow(/Unexpected arguments: b/);
		expect(() => parseLogVerifyArgs(["a", "--bogus"])).toThrow(UsageError);
		expect(parseLogVerifyArgs(["r", "--previous", "p", "--previous-key", "p.pub", "--snapshot", "p/snapshot-L7.json"])).toEqual({ runDirectory: "r", previous: "p", previousKey: "p.pub", snapshot: "p/snapshot-L7.json" });
		expect(() => parseLogVerifyArgs(["r", "--previous-key", "p.pub"])).toThrow(/--previous-key needs --previous/);
	});

	it("says when a resumed run's continuation was not checked, and what it was checked against (step 18 challenge, chain-security M2, m1)", () => {
		const checkpoint = { genesis: "1".repeat(64), lines: 1798, hash: "2".repeat(64), publicKey: "MCowBQYDK2VwAyEAzTk7lkA0BUzSzElz8y+7xujKkwsTUFuiRWfgiJKAbH4=", signature: "c2ln", state: "3".repeat(64) };
		const genesis = {
			format: "swarmtales-chain",
			version: 1,
			algorithm: "ed25519",
			digest: "sha256",
			canonical: "RFC 8785",
			publicKey: "MCowBQYDK2VwAyEAzTk7lkA0BUzSzElz8y+7xujKkwsTUFuiRWfgiJKAbH4=",
			run: "run-004",
			preregistration: "4".repeat(64),
			story: "cityofkeys",
			storyHash: "c".repeat(64),
			seed: 7,
			models: {},
			resumedFrom: { file: "snapshot-L7.json", run: "run-003", checkpoint },
		} as const;
		const verdict = { ok: true, lines: 2000, head: "d".repeat(64), genesisHash: ZERO_HASH, genesis, heads: [{ lines: 1900, hash: "e".repeat(64) }, { lines: 2000, hash: "d".repeat(64) }] } as const;
		const plain = describeVerdict("runs/run-004", verdict, true);
		expect(plain).toContain("resumed from snapshot-L7.json of run-003 after line 1798, snapshot state 3333333333333333 (continuation not checked: pass --previous <run>)");
		expect(plain).toContain("run run-004, story cityofkeys");
		expect(plain).toContain("2 signed head(s) over line(s) 1900, 2000");
		expect(plain).toContain(`pre-registration ${"4".repeat(16)}`);
		expect(describeVerdict("runs/run-004", verdict, true, { previous: true, snapshot: true })).toContain("snapshot state 3333333333333333 (the file given) (continuation checked)");
		expect(describeVerdict("runs/run-004", verdict, true, { previous: true, previousKey: true })).toContain("(continuation checked, previous run against the key given)");

		expect(snapshotIssue(verdict, "3".repeat(64))).toBeUndefined();
		expect(snapshotIssue(verdict, "5".repeat(64))).toMatch(/not the state the checkpoint signed/);
		expect(snapshotIssue({ ...verdict, genesis: { ...genesis, resumedFrom: { file: "s.json", checkpoint: { genesis: checkpoint.genesis, lines: checkpoint.lines, hash: checkpoint.hash, publicKey: checkpoint.publicKey, signature: checkpoint.signature } } } }, "3".repeat(64))).toMatch(/names no snapshot state/);
	});

	it("prints the first broken line, or what holds", () => {
		expect(describeVerdict("runs/run-001", { ok: false, line: 42, reason: "does not match the chain" }, true)).toBe("broken runs/run-001: events.jsonl line 42: does not match the chain");
		expect(describeVerdict("runs/run-001", { ok: false, reason: "the chain was not made with this key" }, true)).toBe("broken runs/run-001: the chain was not made with this key");
		const genesis = {
			format: "swarmtales-chain",
			version: 1,
			algorithm: "ed25519",
			digest: "sha256",
			canonical: "RFC 8785",
			publicKey: "MCowBQYDK2VwAyEAzTk7lkA0BUzSzElz8y+7xujKkwsTUFuiRWfgiJKAbH4=",
			story: "cityofkeys",
			storyHash: "c".repeat(64),
			seed: 7,
			models: {},
			resumedFrom: { file: "snapshot-L7.json", run: "run-002" },
		} as const;
		const text = describeVerdict("runs/run-003", { ok: true, lines: 12, head: "d".repeat(64), genesisHash: ZERO_HASH, genesis, heads: [] }, true);
		expect(text).toContain(`ok   runs/run-003: 12 lines, head ${"d".repeat(64)}`);
		expect(text).toContain("(the run's own run.pub: integrity, not authenticity)");
		expect(text).toContain("commit unknown");
		expect(text).toContain("resumed from snapshot-L7.json of run-002 (no checkpoint: not anchored)");
		expect(describeVerdict("runs/run-003", { ok: true, lines: 12, head: "d".repeat(64), genesisHash: ZERO_HASH, genesis, heads: [] }, false)).toContain("(the key given)");
	});
});

describe("the genesis of a CLI run", () => {
	it("hashes the story as 000-run.json serialises it, one hash per story", () => {
		expect(storyHash(cityOfKeys)).toMatch(/^[0-9a-f]{64}$/);
		expect(storyHash(cityOfKeys)).toBe(storyHash(structuredClone(cityOfKeys)));
		expect(storyHash(whispers)).not.toBe(storyHash(cityOfKeys));
	});

	it("takes the commit from SWARMTALES_COMMIT, else from git", () => {
		expect(codeCommit({ SWARMTALES_COMMIT: "abc123" })).toBe("abc123");
		expect(codeCommit({}, "/")).toBeUndefined();
	});

	it("states the story, seed, models and commitments, and nothing it was not given", () => {
		expect(runGenesis({ story: cityOfKeys, seed: 7, models: { A01: "scripted/-" } })).toEqual({ story: "cityofkeys", storyHash: storyHash(cityOfKeys), seed: 7, models: { A01: "scripted/-" } });
		expect(runGenesis({ story: cityOfKeys, seed: 7, models: {}, commit: "abc", commitments: { treatment: "e".repeat(64) } })).toMatchObject({ commit: "abc", commitments: { treatment: "e".repeat(64) } });
		expect(runGenesis({ story: cityOfKeys, seed: 7, models: {}, run: "run-004", preregistration: "f".repeat(64) })).toMatchObject({ run: "run-004", preregistration: "f".repeat(64) });
	});

	it("commits to the run's options and prompt addenda by hash (step 18 challenge, chain-security m4)", () => {
		const plain = inputCommitments({ overrides: {} });
		expect(Object.keys(plain)).toEqual(["runOptions"]);
		expect(plain.runOptions).toMatch(/^[0-9a-f]{64}$/);
		expect(inputCommitments({ overrides: { guards: false } }).runOptions).not.toBe(plain.runOptions);
		expect(inputCommitments({ overrides: {}, judgeTemper: "harsh" }).runOptions).not.toBe(plain.runOptions);
		const addenda = inputCommitments({ overrides: {}, promptAddenda: [{ text: "Be bold." }] });
		expect(addenda.runOptions).toBe(plain.runOptions);
		expect(addenda.promptAddenda).toMatch(/^[0-9a-f]{64}$/);
		expect(inputCommitments({ overrides: {}, promptAddenda: [{ agent: "A01", text: "Be bold." }] }).promptAddenda).not.toBe(addenda.promptAddenda);
	});
});
