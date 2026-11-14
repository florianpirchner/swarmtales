// SPDX-License-Identifier: Apache-2.0
/** Review of M2, part A: failing cases against the live command line (secrets, money, the run folder). */
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
		const priced = scriptedSource({ "resident:A01": [say(), say()], "resident:A02": [say(), say()], "resident:A03": [say(), say()] });
		const source: LiveInput["source"] = {
			bind: (actor, limits) => {
				const binding = priced.bind(actor, limits);
				return {
					...binding,
					streamFn: async (model, context, options) => {
						const stream = await binding.streamFn(model, context, options);
						const push = stream.push.bind(stream);
						stream.push = (event) => {
							push(event.type === "done" ? { ...event, message: { ...event.message, usage: { ...event.message.usage, cost: { ...event.message.usage.cost, total: 0.001 } } } } : event);
						};
						return stream;
					},
				};
			},
		};
		const { code, spend, end } = await live({ source, budget: 0.000001, out: "c2" });
		expect([code, spend?.requests, end?.limit]).toEqual([5, 1, "models.budget"]);

		// A killed process signs no head: the folder it leaves is told apart from a finished run and from a closed one (exit 3).
		const chain = join(cwd, "c2/guess-number-001/events.chain.jsonl");
		writeFileSync(chain, readFileSync(chain, "utf8").split("\n").filter((line) => !line.includes('"kind":"head"')).join("\n"));
		const err: string[] = [];
		expect(await main(["log", "verify", "c2/guess-number-001"], { cwd, now: () => new Date(0), out: () => undefined, err: (line) => err.push(line) })).toBe(1);
		expect(err.join("\n")).toContain("SWT-L002");
	});
});

describe("review A: the spend ledger", () => {
	// Open (L1, for issue 21): the ledger pairs a reservation with a cost line by the run's name, and a run folder's
	// name comes back when a folder is deleted or `--out` points elsewhere. A cost line of the second run then also
	// releases the reservation of a first run that crashed, and while the second run plays its own reservation is
	// not held at all. Proposed: pair by position (a cost line settles the oldest open reservation of its name), or
	// give every reservation an id of its own that the cost line repeats.
	it.fails("L1: keeps the reservation of a crashed run when a later run of the same name is settled", () => {
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
});
