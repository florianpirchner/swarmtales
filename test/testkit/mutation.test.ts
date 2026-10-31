/**
 * The testkit's mutation check (packages/testkit/src/mutation.ts, R2-D23): a listed change applies
 * only where it is unambiguous, a run in the hard-linked copy tells a caught change from one that
 * survives, and the repository's own file is untouched afterwards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { applyMutation, parseMutations, runMutants } from "@swarmtales/testkit";

const ROOT = resolve(import.meta.dirname, "../..");
const LEDGER = "mechanics/ledger/src/index.ts";
const TESTS = ["test/mechanics/round2-shared.test.ts"];

describe("applyMutation", () => {
	it("replaces the one occurrence and refuses none or several", () => {
		expect(applyMutation("a < b", { find: "<", replace: "<=" })).toBe("a <= b");
		expect(() => applyMutation("a < b", { find: ">", replace: "<" })).toThrow(/does not occur/);
		expect(() => applyMutation("a < b < c", { find: "<", replace: "<=" })).toThrow(/more than once/);
	});
});

describe("parseMutations", () => {
	it("reads a list and refuses one without tests", () => {
		expect(parseMutations(JSON.stringify([{ id: "M1", file: LEDGER, find: "x", replace: "y", tests: TESTS }]))).toHaveLength(1);
		expect(() => parseMutations(JSON.stringify([{ id: "M1", file: LEDGER, find: "x", replace: "y", tests: [] }]), "list.json")).toThrow(/list.json: not a mutation list/);
	});
});

describe("runMutants", () => {
	it("says killed, survived or broken and leaves the repository's file as it was", () => {
		const before = readFileSync(resolve(ROOT, LEDGER), "utf8");
		const results = runMutants({
			root: ROOT,
			mutations: [
				{ id: "open does nothing", file: LEDGER, find: "if (!ctx.state.balances.has(input.account)) ctx.state.balances.set(input.account, 0);", replace: "", tests: TESTS },
				{ id: "a comment", file: LEDGER, find: "// Old `ledger.open`: an account at 0", replace: "// An account at 0", tests: TESTS },
				{ id: "no such line", file: LEDGER, find: "not in the ledger", replace: "", tests: TESTS },
			],
		});
		expect(results.map((result) => [result.id, result.verdict])).toEqual([
			["open does nothing", "killed"],
			["a comment", "survived"],
			["no such line", "broken"],
		]);
		expect(readFileSync(resolve(ROOT, LEDGER), "utf8")).toBe(before);
	}, 180_000);
});
