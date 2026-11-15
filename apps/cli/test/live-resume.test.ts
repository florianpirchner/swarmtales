// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The live resume (M5 spec 4.5, rows 2 to 5; issue M5-09): a live run with the scripted source of `live.test.ts` is
 * paused on an event (`--pause-on`), resumed live from its snapshot (`swt resume --budget`), and equals the straight
 * run by decision A34; its snapshot holds the sessions and no key canary, and `swt replay --previous` of the resumed
 * folder is equal. The token counts of `response` records are left out of the equality (erratum J95): the scripted
 * provider simulates a prompt cache per binding, and a resumed run binds again.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, RESIDENT_RECORDS, say, scriptedSource, type ModelSource, type ScriptStep } from "@swarmtales/models";
import { guessNumber } from "@swarmtales/testkit";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runLive, type LiveInput } from "../src/live.ts";
import { main, type CliIo } from "../src/main.ts";
import { resumeRun, type ResumeRunInput } from "../src/resume.ts";
import { eventsOf, withoutMarker, type StoredEnvelope } from "./support.ts";

const GAME = fileURLToPath(new URL("./fixtures/guess-number.ts", import.meta.url));
// Built at run time from parts: no committed string reads as a key.
const KEY = `sk-${"q".repeat(37)}`;
const env = { ARENA_ANTHROPIC_API_KEY: KEY };
const ACTORS = ["resident:A01", "resident:A02", "resident:A03"] as const;
const guesses: readonly ScriptStep[] = Array.from({ length: 20 }, (_, index) => act({ name: "guess", args: { value: index + 1 } }));
const steps = (actor: string): readonly ScriptStep[] => (actor === "resident:A01" ? guesses : Array.from({ length: 40 }, () => say()));
// The script of every resident, from the answers each one had been given before.
const script = (from: Readonly<Record<string, number>> = {}): ModelSource => scriptedSource(Object.fromEntries(ACTORS.map((actor) => [actor, steps(actor).slice(from[actor] ?? 0)])));

let cwd = "";
let out: string[] = [];
const io = (): CliIo => ({ cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => out.push(line), installed: { "guess-number": guessNumber }, env });
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-live-resume-"));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});
beforeEach(() => {
	out = [];
	vi.stubGlobal("fetch", () => Promise.reject(new TypeError("a test reached the global fetch")));
});
afterEach(() => {
	vi.unstubAllGlobals();
});

const live = (more: Partial<LiveInput>): ReturnType<typeof runLive> => runLive({ file: GAME, seed: undefined, out: undefined, json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env, source: script(), ...more }, io());
const resume = (directory: string, more: Partial<ResumeRunInput>): Promise<number> => resumeRun({ directory, game: GAME, out: undefined, json: false, live: { provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0 }, env, ...more }, io());
// The answers each resident was given in a log: one `response` record each.
const answered = (log: readonly StoredEnvelope[]): Readonly<Record<string, number>> => Object.fromEntries(ACTORS.map((actor) => [actor, log.filter((event) => event.source === RESIDENT_RECORDS.id && event.type === "response" && event.actor === actor).length]));
// The log without what a binding's prompt cache changes: the token counts of a `response` record that a provider reads from its cache (J15, J95).
const uncounted = (log: readonly StoredEnvelope[]): readonly unknown[] =>
	log.map((event) => {
		if (event.type !== "response" || typeof event.payload !== "object" || event.payload === null) return event;
		return { ...event, payload: Object.fromEntries(Object.entries(event.payload).filter(([key]) => !["input", "cacheRead", "cacheWrite"].includes(key))) };
	});

describe("swt resume --budget, swt run --pause-on", () => {
	it("a live run paused on an event and resumed live equals the straight run by A34; its snapshot holds the sessions and no key canary; replay --previous is equal", async () => {
		expect((await live({ out: "straight" })).code).toBe(0);
		const paused = await live({ out: "base", pauseOn: { mechanic: "guess-number", event: "guessed" } });
		expect([paused.code, paused.stopped]).toEqual([3, { stopped: "paused", tick: 1, on: "guess-number.guessed" }]);
		const snapshot = readFileSync(join(cwd, "base/guess-number-001/snapshots/t1.json"), "utf8");
		expect([snapshot.includes(KEY), snapshot.includes('"sessions":{"resident:A01"')]).toEqual([false, true]);
		const base = eventsOf(join(cwd, "base/guess-number-001"));
		const ledger = join(cwd, "ledger.jsonl");
		writeFileSync(ledger, '{"capUsd":5}\n');
		expect(await resume("base/guess-number-001", { source: script(answered(base)), live: { provider: "anthropic", budget: 1, ledger, purpose: "pilot", replicate: 0 } })).toBe(0);
		const resumed = eventsOf(join(cwd, "base/guess-number-002"));
		expect(resumed.filter((event) => event.type === "prompt_fixed")).toHaveLength(3);
		expect(uncounted(withoutMarker(resumed))).toEqual(uncounted(eventsOf(join(cwd, "straight/guess-number-001"))));
		expect(JSON.stringify(resumed.find((event) => event.type === "run_resumed")?.payload)).toMatch(/^\{"from":"guess-number-001","snapshotHash":"[0-9a-f]{64}","tick":1\}$/);
		// The cap counts from the resume, and the reservation names the base.
		expect(JSON.parse(readFileSync(ledger, "utf8").split("\n")[1] ?? "null")).toMatchObject({ run: "pilot/guess-number-002", reservedUsd: 1, base: "guess-number-001" });
		const swt = (...args: readonly string[]): Promise<number> => main(args, io());
		out = [];
		expect(await swt("replay", "base/guess-number-002", "--game", GAME, "--previous", "base/guess-number-001")).toBe(0);
		expect(out).toEqual([expect.stringMatching(/^equal, \d+ lines$/)]);
		expect(await swt("log", "verify", "base/guess-number-002", "--previous", "base/guess-number-001")).toBe(0);
		// A replaced thinking level is named in the marker, the base's model beside the new one.
		expect(await resume("base/guess-number-001", { out: "other", source: script(answered(base)), live: { provider: "anthropic", thinking: "low", budget: 1, purpose: "smoke", replicate: 0 } })).toBe(0);
		const marker = JSON.stringify(eventsOf(join(cwd, "other/guess-number-001")).find((event) => event.type === "run_resumed")?.payload);
		expect(marker).toMatch(/"replaced":\{"resident:A01":\{"from":"anthropic\/[^"]+:medium","to":"anthropic\/[^"]+:low"\},"resident:A02"/);
	});

	it("refuses a live resume without --budget and a fake one with it (SWT-X010), a --pause-on of no event (SWT-C003), and --previous of a run that did not resume", async () => {
		expect((await live({ out: "plain", pauseOn: { mechanic: "guess-number", event: "guessed" } })).code).toBe(3);
		const swt = async (...args: readonly string[]): Promise<readonly [number, string | undefined]> => {
			out = [];
			const code = await main(args, io());
			return [code, /SWT-[A-Z]\d{3}/.exec(out.join("\n"))?.[0]];
		};
		expect(await swt("resume", "plain/guess-number-001", "--game", GAME)).toEqual([1, "SWT-X010"]);
		expect(await swt("run", GAME, "--fake", "--out", "fake", "--pause-on", "guess-number.guessed")).toEqual([3, undefined]);
		expect(await swt("resume", "fake/guess-number-001", "--game", GAME, "--budget", "1")).toEqual([1, "SWT-X010"]);
		expect(await swt("run", GAME, "--fake", "--out", "none", "--pause-on", "guess-number.solved")).toEqual([1, "SWT-C003"]);
		expect(await swt("run", GAME, "--fake", "--out", "none", "--pause-on", "guessed")).toEqual([1, "SWT-C003"]);
		expect(existsSync(join(cwd, "none"))).toBe(false);
		expect(await swt("replay", "plain/guess-number-001", "--game", GAME, "--previous", "fake/guess-number-001")).toEqual([1, "SWT-C003"]);
		// A fake run paused on an event resumes with the fake driver and goes on to its end.
		expect((await swt("resume", "fake/guess-number-001", "--game", GAME))[0]).toBe(0);
	});
});
