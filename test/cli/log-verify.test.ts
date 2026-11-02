import { describe, expect, it } from "vitest";
import { ZERO_HASH } from "@swarmtales/chronicle";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import whispers from "../../stories/whispers/story.ts";
import { UsageError } from "../../apps/cli/src/args.ts";
import { codeCommit, runGenesis, storyHash } from "../../apps/cli/src/host/chain.ts";
import { describeVerdict, parseLogVerifyArgs } from "../../apps/cli/src/log-verify-args.ts";

describe("swt log verify", () => {
	it("parses a run directory, a key and a previous run", () => {
		expect(parseLogVerifyArgs(["runs/run-003"])).toEqual({ runDirectory: "runs/run-003" });
		expect(parseLogVerifyArgs(["runs/run-003", "--key", "published.pub", "--previous", "runs/run-002"])).toEqual({ runDirectory: "runs/run-003", key: "published.pub", previous: "runs/run-002" });
		expect(() => parseLogVerifyArgs([])).toThrow(UsageError);
		expect(() => parseLogVerifyArgs(["a", "b"])).toThrow(/Unexpected arguments: b/);
		expect(() => parseLogVerifyArgs(["a", "--bogus"])).toThrow(UsageError);
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
	});
});
