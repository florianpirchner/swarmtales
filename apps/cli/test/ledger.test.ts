// SPDX-License-Identifier: Apache-2.0
/**
 * The spend ledger: every test writes its own ledger file into a temporary folder; the ledger of the gate
 * (`games/m2-ledger.jsonl`) is never touched. The clock is fixed, the model is the scripted one.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SwtError } from "@swarmtales/contracts";
import { act, say, scriptedSource } from "@swarmtales/models";
import { guessNumber } from "@swarmtales/testkit";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { openLedger, type Ledger } from "../src/ledger.ts";
import { runLive, type LiveInput } from "../src/live.ts";
import { main } from "../src/main.ts";

const GAME = fileURLToPath(new URL("./fixtures/guess-number.ts", import.meta.url));
const AT = "2026-11-14T12:00:00.000Z";
const now = (): Date => new Date(AT);
// Built at run time from parts: no committed string reads as a key.
const env = { SWT_ANTHROPIC_API_KEY: `sk-${"l".repeat(37)}` };

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-ledger-"));
	vi.stubGlobal("fetch", () => Promise.reject(new TypeError("a test reached the global fetch")));
});
afterAll(() => {
	vi.unstubAllGlobals();
	rmSync(cwd, { recursive: true, force: true });
});

/**
 * Writes a ledger file of the test.
 *
 * @param name - The file name inside the temporary folder.
 * @param lines - The lines after the cap line of 1 USD.
 * @returns The path of the file.
 */
function ledgerFile(name: string, ...lines: readonly object[]): string {
	const file = join(cwd, name);
	writeFileSync(file, [{ capUsd: 1 }, ...lines].map((line) => JSON.stringify(line)).join("\n"));
	return file;
}
const linesOf = (file: string): readonly unknown[] => readFileSync(file, "utf8").trim().split("\n").map((line): unknown => JSON.parse(line));
// The code a reservation is refused with; undefined when it was written.
const refusal = (ledger: Ledger, run: string, usd: number): string | undefined => {
	try {
		ledger.reserve(run, usd);
	} catch (error) {
		return error instanceof SwtError ? error.issues[0]?.code : "no SwtError";
	}
	return undefined;
};

describe("the spend ledger", () => {
	it("reserves before a run and replaces the reservation by the cost; each line carries the injected time", () => {
		const file = ledgerFile("plain.jsonl");
		const ledger = openLedger(file, now);
		ledger.reserve("runs/a-001", 0.4);
		ledger.settle("runs/a-001", 0.1);
		// 0.1 spent: 0.9 fits exactly, and once it is reserved nothing more does.
		ledger.reserve("runs/a-002", 0.9);
		expect(refusal(ledger, "runs/a-003", 0.01)).toBe("SWT-C025");
		expect(linesOf(file)).toEqual([{ capUsd: 1 }, { run: "runs/a-001", reservedUsd: 0.4, at: AT }, { run: "runs/a-001", costUsd: 0.1, at: AT }, { run: "runs/a-002", reservedUsd: 0.9, at: AT }]);
	});

	it("counts the whole reservation of a run that never wrote its cost, and a legacy cost line added by hand", () => {
		const crashed = openLedger(ledgerFile("crashed.jsonl", { run: "runs/a-001", reservedUsd: 0.7 }), now);
		expect(refusal(crashed, "runs/a-002", 0.4)).toBe("SWT-C025");
		expect(refusal(crashed, "runs/a-002", 0.3)).toBeUndefined();
		const legacy = openLedger(ledgerFile("legacy.jsonl", { run: "legacy/quarry-s31", costUsd: 0.95 }), now);
		expect(refusal(legacy, "runs/a-001", 0.1)).toBe("SWT-C025");
	});

	it("refuses a ledger that cannot be read: no file, no JSON, no cap line, a line that is neither kind", () => {
		const broken = (name: string, text: string): string | undefined => {
			writeFileSync(join(cwd, name), text);
			return refusal(openLedger(join(cwd, name), now), "runs/a-001", 0.1);
		};
		expect(refusal(openLedger(join(cwd, "none.jsonl"), now), "runs/a-001", 0.1)).toBe("SWT-C025");
		expect(broken("json.jsonl", '{"capUsd":1}\n{"run":')).toBe("SWT-C025");
		expect(broken("cap.jsonl", '{"run":"runs/a-001","costUsd":0.1}\n')).toBe("SWT-C025");
		expect(broken("kind.jsonl", '{"capUsd":1}\n{"run":"runs/a-001"}\n')).toBe("SWT-C025");
		expect(broken("both.jsonl", '{"capUsd":1}\n{"run":"runs/a-001","reservedUsd":0.1,"costUsd":0.1}\n')).toBe("SWT-C025");
		expect(broken("negative.jsonl", '{"capUsd":1}\n{"run":"runs/a-001","costUsd":-5}\n')).toBe("SWT-C025");
	});
});

describe("swt run --ledger", () => {
	const guesses = Array.from({ length: 20 }, (_, index) => act({ name: "guess", args: { value: index + 1 } }));
	const waits = Array.from({ length: 40 }, () => say());
	const live = async (more: Partial<LiveInput>): Promise<{ readonly code: number; readonly err: string }> => {
		const err: string[] = [];
		const source = scriptedSource({ "resident:A01": guesses, "resident:A02": waits, "resident:A03": waits });
		const input: LiveInput = { file: GAME, seed: undefined, out: undefined, json: false, provider: "anthropic", budget: 0.4, purpose: "smoke", replicate: 0, env, source, ...more };
		const { code } = await runLive(input, { cwd, now, out: () => undefined, err: (line) => err.push(line), installed: { "guess-number": guessNumber } });
		return { code, err: err.join("\n") };
	};

	it("refuses a run whose cap does not fit (SWT-C025, exit 1, no folder); a run that fits is reserved and settled", async () => {
		const file = ledgerFile("run.jsonl", { run: "legacy/old", costUsd: 0.5 });
		const refused = await live({ ledger: "run.jsonl", budget: 0.6, out: "refused" });
		expect([refused.code, /SWT-[A-Z]\d{3}/.exec(refused.err)?.[0], existsSync(join(cwd, "refused"))]).toEqual([1, "SWT-C025", false]);
		expect(linesOf(file)).toHaveLength(2);
		expect((await live({ ledger: "run.jsonl", budget: 0.5, out: "fits" })).code).toBe(0);
		expect(linesOf(file).slice(2)).toEqual([{ run: "fits/guess-number-001", reservedUsd: 0.5, at: AT }, { run: "fits/guess-number-001", costUsd: 0, at: AT }]);
		// The flag of the command line reaches the run: the same ledger refuses through `main`.
		const err: string[] = [];
		const code = await main(["run", GAME, "--provider", "anthropic", "--budget", "0.6", "--ledger", file, "--out", "refused"], { cwd, now, out: () => undefined, err: (line) => err.push(line), env });
		expect([code, /SWT-[A-Z]\d{3}/.exec(err.join("\n"))?.[0]]).toEqual([1, "SWT-C025"]);
	});

	it("keeps the reservation of a run that crashed after its start: the next run is counted against it", async () => {
		const file = ledgerFile("crash.jsonl");
		const crash = { write: (): void => { throw new TypeError("the sink failed"); } };
		expect((await live({ ledger: "crash.jsonl", budget: 0.7, out: "crash", sinks: [crash] })).code).toBe(1);
		expect(linesOf(file).slice(1)).toEqual([{ run: "crash/guess-number-001", reservedUsd: 0.7, at: AT }]);
		expect((await live({ ledger: "crash.jsonl", budget: 0.4, out: "crash" })).code).toBe(1);
		expect((await live({ ledger: "crash.jsonl", budget: 0.3, out: "crash" })).code).toBe(0);
	});
});
