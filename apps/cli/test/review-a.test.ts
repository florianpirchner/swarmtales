// SPDX-License-Identifier: Apache-2.0
/** Review of M2, part A: failing cases against the live command line (secrets, money, the run folder). */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { say, scriptedSource } from "@swarmtales/models";
import { guessNumber } from "@swarmtales/testkit";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { openLedger } from "../src/ledger.ts";
import { runLive, type LiveInput, type LiveResult } from "../src/live.ts";
import { main, type CliIo } from "../src/main.ts";
import { readSourceTree } from "../src/tree.ts";

const GAME = fileURLToPath(new URL("./fixtures/guess-number.ts", import.meta.url));
// Built at run time from parts: no committed string reads as a key.
const KEY = `sk-${"r".repeat(37)}`;
// A held value of no known shape: only the broker's value redaction takes it out.
const PLAIN = `canary${"q".repeat(34)}`;

let cwd = "";
let fetched = vi.fn();
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-review-a-"));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});
beforeEach(() => {
	fetched = vi.fn(() => Promise.reject(new TypeError("a test reached the global fetch")));
	vi.stubGlobal("fetch", fetched);
});
afterEach(() => {
	expect(fetched).not.toHaveBeenCalled();
	vi.unstubAllGlobals();
});

// `scripted: false` leaves the model source out, so the run builds the provider's own (no request is sent before `SWT-X007`).
async function live(more: Partial<LiveInput> = {}, scripted = true): Promise<LiveResult & { readonly out: readonly string[]; readonly err: string }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), installed: { "guess-number": guessNumber } };
	const input: LiveInput = { file: GAME, seed: undefined, out: undefined, json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env: { ARENA_ANTHROPIC_API_KEY: PLAIN }, ...(scripted ? { source: scriptedSource({}) } : {}), ...more };
	return { ...(await runLive(input, io)), out, err: err.join("\n") };
}

// The scripted source of three residents that wait, with every answer at the cost `usd`.
function costing(usd: number): NonNullable<LiveInput["source"]> {
	const priced = scriptedSource({ "resident:A01": [say(), say()], "resident:A02": [say(), say()], "resident:A03": [say(), say()] });
	return {
		bind: (actor, limits) => {
			const binding = priced.bind(actor, limits);
			return {
				...binding,
				streamFn: async (model, context, options) => {
					const stream = await binding.streamFn(model, context, options);
					const push = stream.push.bind(stream);
					stream.push = (event) => {
						push(event.type === "done" ? { ...event, message: { ...event.message, usage: { ...event.message.usage, cost: { ...event.message.usage.cost, total: usd } } } } : event);
					};
					return stream;
				},
			};
		},
	};
}

describe("review A: secrets on the command line", () => {
	it("A1: returns no held value in the issues of a result (a caller such as the experiment runner gets them)", async () => {
		const { code, issues, err } = await live({ params: { [PLAIN]: 1 }, out: "a1" });
		expect([code, issues.map((issue) => issue.code)]).toEqual([1, ["SWT-G041"]]);
		expect(err).not.toContain(PLAIN);
		expect(JSON.stringify(issues)).not.toContain(PLAIN);
	});

	it("A2: echoes no key of a known shape from a flag value that is refused before the run", async () => {
		const err: string[] = [];
		const out: string[] = [];
		const io: CliIo = { cwd, now: () => new Date(0), out: (line) => out.push(line), err: (line) => err.push(line), env: {} };
		expect(await main(["run", GAME, "--budget", "1", "--set", `label=${KEY}`], io)).toBe(1);
		expect(await main(["run", GAME, "--budget", KEY, "--json"], io)).toBe(1);
		expect(await main(["run", GAME, "--budget", "1", "--thinking", KEY], io)).toBe(1);
		expect([...err, ...out].join("\n")).toContain("[redacted]");
		expect([...err, ...out].join("\n")).not.toContain(KEY);
	});
});

describe("review A: the run folder of a run that is refused", () => {
	it("A3: refuses a model without a price (SWT-X007) before the run: no folder, no event", async () => {
		const { code, issues } = await live({ provider: "openrouter", modelId: "auto", env: { OPENROUTER_API_KEY: PLAIN }, out: "a3" }, false);
		expect([code, issues.map((issue) => issue.code)]).toEqual([1, ["SWT-X007"]]);
		expect(existsSync(join(cwd, "a3"))).toBe(false);
	});
});

describe("review A: the cost cap on the command line", () => {
	it("C1: takes no --budget that is not a plain positive amount, and refuses before any folder is made", async () => {
		const codes = async (...args: readonly string[]): Promise<string | undefined> => {
			const err: string[] = [];
			const code = await main(["run", GAME, "--out", "c1", ...args], { cwd, now: () => new Date(0), out: () => undefined, err: (line) => err.push(line), env: { ARENA_ANTHROPIC_API_KEY: PLAIN } });
			return `${String(code)} ${/SWT-[A-Z]\d{3}/.exec(err.join("\n"))?.[0] ?? ""}`;
		};
		for (const budget of ["-1", "NaN", "Infinity", "0x10", "1e-3", ".5", "5.", "", " 1", "1,5", "abc"]) expect([budget, await codes("--provider", "anthropic", `--budget=${budget}`)]).toEqual([budget, "1 SWT-C003"]);
		// Zero in every spelling, and a number too large to be finite, are no cap.
		for (const budget of ["0", "0.0", "000", "9".repeat(400)]) expect([budget, await codes("--provider", "anthropic", `--budget=${budget}`)]).toEqual([budget, "1 SWT-X005"]);
		// The flag given twice: the last one counts, and a bad last one is refused.
		expect(await codes("--provider", "anthropic", "--budget", "1", "--budget", "0")).toBe("1 SWT-X005");
		expect(existsSync(join(cwd, "c1"))).toBe(false);
	});

	it("C2: plays under the smallest cap (one request, exit code 5), and a folder without a signed head is SWT-L002", async () => {
		const { code, spend, end } = await live({ source: costing(0.001), budget: 0.000001, out: "c2" });
		expect([code, spend?.requests, end?.limit]).toEqual([5, 1, "models.budget"]);

		// A killed process signs no head: the folder it leaves is told apart from a finished run and from a closed one (exit 3).
		const chain = join(cwd, "c2/guess-number-001/events.chain.jsonl");
		writeFileSync(chain, readFileSync(chain, "utf8").split("\n").filter((line) => !line.includes('"kind":"head"')).join("\n"));
		const err: string[] = [];
		expect(await main(["log", "verify", "c2/guess-number-001"], { cwd, now: () => new Date(0), out: () => undefined, err: (line) => err.push(line) })).toBe(1);
		expect(err.join("\n")).toContain("SWT-L002");
	});
});

describe("review A: a cost that cannot be counted, on the command line", () => {
	it("M1: ends the run at the limit after one request (exit code 5) and keeps the whole reservation in the ledger", async () => {
		const file = join(cwd, "ledger-m1.jsonl");
		writeFileSync(file, '{"capUsd":0.1}\n');
		const { code, spend, end, out } = await live({ source: costing(Number.NaN), budget: 0.05, ledger: "ledger-m1.jsonl", out: "m1" });
		expect([code, spend?.requests, spend?.costUsd, end?.limit]).toEqual([5, 0, 0, "models.budget"]);
		expect(out.join("\n")).toMatch(/limit models\.budget: the cost of the run is not known: the costUsd of an answer to resident:A0\d is no amount that can be counted/);
		const requests = readFileSync(join(cwd, "m1/guess-number-001/events.jsonl"), "utf8").split("\n").filter((line) => line.includes('"type":"request"'));
		expect(requests).toHaveLength(1);
		// No cost line: 0.05 stays held, so a run with a cap of 0.06 does not fit under 0.10, and the counted run after it is settled.
		expect(readFileSync(file, "utf8")).not.toContain("costUsd");
		expect((await live({ ledger: "ledger-m1.jsonl", budget: 0.06, out: "m1" })).err).toContain("SWT-C025");
		expect((await live({ ledger: "ledger-m1.jsonl", budget: 0.05, out: "m1" })).code).toBe(0);
		expect(readFileSync(file, "utf8").match(/"costUsd":0,/g)).toHaveLength(1);
	});
});

describe("review A: a confirmatory run needs a clean tree (SWT-C023)", () => {
	const experiment = { id: "guess-small", specHash: "0".repeat(64), arm: "small" };
	const commit = "c".repeat(40);

	it("refuses a dirty tree and a tree without a state before any folder is made; a clean tree plays, and its commit is in the manifest", async () => {
		for (const tree of [{ commit, dirty: true }, { commit }, {}]) {
			const { code, issues, err } = await live({ purpose: "confirmatory", experiment, tree, out: "c023" });
			expect([code, issues.map((issue) => issue.code), /SWT-[A-Z]\d{3}/.exec(err)?.[0]]).toEqual([1, ["SWT-C023"], "SWT-C023"]);
		}
		expect(existsSync(join(cwd, "c023"))).toBe(false);
		// Any other purpose plays on a dirty tree, and the manifest says so.
		expect((await live({ purpose: "pilot", tree: { commit, dirty: true }, out: "c023" })).code).toBe(0);
		expect(JSON.parse(readFileSync(join(cwd, "c023/guess-number-001/manifest.json"), "utf8"))).toMatchObject({ kernel: { commit, dirty: true } });
		const clean = await live({ purpose: "confirmatory", experiment, tree: { commit, dirty: false }, out: "c023" });
		expect([clean.code, clean.err]).toEqual([0, ""]);
		expect(JSON.parse(readFileSync(join(cwd, "c023/guess-number-002/manifest.json"), "utf8"))).toMatchObject({ run: { purpose: "confirmatory" }, kernel: { commit, dirty: false }, experiment });
	});

	it("reads the commit and the state of a tree from git: no checkout, a clean one, one with a file git does not know", () => {
		const tree = mkdtempSync(join(tmpdir(), "swt-tree-"));
		try {
			expect(readSourceTree(tree)).toEqual({});
			const git = (...args: readonly string[]): void => void execFileSync("git", ["-C", tree, "-c", "user.name=t", "-c", "user.email=t@example.test", "-c", "commit.gpgsign=false", ...args], { stdio: "ignore" });
			git("init", "--quiet");
			// A checkout without a commit has no state either.
			expect(readSourceTree(tree)).toEqual({});
			git("commit", "--quiet", "--allow-empty", "--no-verify", "-m", "first");
			const clean = readSourceTree(tree);
			expect([clean.dirty, /^[0-9a-f]{40,64}$/.test(clean.commit ?? "")]).toEqual([false, true]);
			writeFileSync(join(tree, "runs.txt"), "a run folder inside the checkout");
			expect(readSourceTree(tree).dirty).toBe(true);
		} finally {
			rmSync(tree, { recursive: true, force: true });
		}
	});
});

describe("review A: the spend ledger", () => {
	// L1: a run folder's name comes back when a folder is deleted or `--out` points elsewhere, so the ledger pairs a
	// reservation with its cost line by an id that is made new for every reservation, and not by the run's name.
	it("L1: keeps the reservation of a crashed run when a later run of the same name is settled", () => {
		const file = join(cwd, "ledger.jsonl");
		writeFileSync(file, '{"capUsd":0.1}\n');
		const ledger = openLedger(file, () => new Date(0));
		ledger.reserve("runs/guess-number-001", 0.05);
		// The process died; the folder was deleted; the next run gets the same name and ends.
		ledger.reserve("runs/guess-number-001", 0.05);
		ledger.settle("runs/guess-number-001", 0.01);
		// 0.05 (crashed, kept whole) + 0.01 are held: a run with a cap of 0.05 does not fit under 0.10.
		expect(() => {
			ledger.reserve("runs/guess-number-002", 0.05);
		}).toThrow(/SWT-C025/);
	});

	it("L1: a second process settles its own reservation only, and the lines without an id still read as before", () => {
		const file = join(cwd, "ledger-two.jsonl");
		// Written before the id existed: a settled run, a crashed one, and a cost added by hand.
		const old = [{ capUsd: 0.2 }, { run: "runs/old-001", reservedUsd: 0.05 }, { run: "runs/old-001", costUsd: 0.01 }, { run: "runs/old-002", reservedUsd: 0.04 }, { run: "legacy/quarry", costUsd: 0.02 }];
		writeFileSync(file, old.map((line) => JSON.stringify(line)).join("\n"));
		const crashed = openLedger(file, () => new Date(0));
		crashed.reserve("runs/guess-number-001", 0.05);
		const next = openLedger(file, () => new Date(0));
		next.reserve("runs/guess-number-001", 0.03);
		// While the second run plays both reservations are held: 0.01 + 0.04 + 0.02 + 0.05 + 0.03 = 0.15, so 0.06 more is too much.
		expect(() => {
			next.reserve("runs/guess-number-002", 0.06);
		}).toThrow(/SWT-C025/);
		next.settle("runs/guess-number-001", 0.01);
		// 0.07 of the old lines + 0.05 (crashed) + 0.01 = 0.13: 0.07 fits exactly, 0.08 does not.
		expect(() => {
			next.reserve("runs/guess-number-002", 0.08);
		}).toThrow(/SWT-C025/);
		next.reserve("runs/guess-number-002", 0.07);
		const lines = readFileSync(file, "utf8").trim().split("\n").slice(5).map((line): unknown => JSON.parse(line));
		const ids = lines.map((line) => (typeof line === "object" && line !== null && "id" in line ? line.id : undefined));
		expect(new Set(ids).size).toBe(3);
		expect([ids[2], ids.every((id) => typeof id === "string")]).toEqual([ids[1], true]);
		// A cost line without an id (added by hand) releases the old reservation of its name, and none that has an id.
		writeFileSync(file, `${readFileSync(file, "utf8")}${JSON.stringify({ run: "runs/old-002", costUsd: 0 })}\n${JSON.stringify({ run: "runs/guess-number-001", costUsd: 0 })}\n`);
		expect(() => {
			next.reserve("runs/guess-number-003", 0.05);
		}).toThrow(/SWT-C025/);
		next.reserve("runs/guess-number-003", 0.04);
	});
});
