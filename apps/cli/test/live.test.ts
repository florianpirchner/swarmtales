// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt run` without `--fake`, with the scripted source in place of a provider: the test builds its environment
 * record and its key values itself, reads nothing from the process, and the global `fetch` rejects.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunManifestSchema, type EventSink } from "@swarmtales/contracts";
import { act, RESIDENT_DRIVER, RESIDENT_RECORDS, say, scriptedSource, type ModelSource, type ScriptStep } from "@swarmtales/models";
import { guessNumber } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Check, Parse } from "typebox/value";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runLive, runName, tokenLine, type LiveInput, type LiveResult } from "../src/live.ts";
import { main, type CliIo } from "../src/main.ts";

const GAME = fileURLToPath(new URL("./fixtures/guess-number.ts", import.meta.url));
// Built at run time from parts: no committed string reads as a key.
const KEY = `sk-${"k".repeat(37)}`;
const Fixed = Type.Object({ source: Type.Literal(RESIDENT_RECORDS.id, { description: "The record source" }), type: Type.Literal("prompt_fixed", { description: "The record" }), actor: Type.String({ description: "The actor" }), payload: Type.Object({ systemHash: Type.String({ description: "The hash" }) }, { description: "The payload" }) }, { description: "A `prompt_fixed` line of the log" });

let cwd = "";
let fetched = vi.fn();
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-live-"));
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

// A01 guesses 1, 2, 3 and so on until the game ends; the two others say something and wait.
const guesses: readonly ScriptStep[] = Array.from({ length: 20 }, (_, index) => act({ name: "guess", args: { value: index + 1 } }));
const script = (): ModelSource => scriptedSource({ "resident:A01": guesses, "resident:A02": Array.from({ length: 40 }, () => say()), "resident:A03": Array.from({ length: 40 }, () => say()) });

// A source whose every answer costs `usd`: the scripted model has no price, so the cost is set on the answer as it ends.
function priced(usd: number): ModelSource {
	const source = script();
	return {
		bind: (actor, limits) => {
			const binding = source.bind(actor, limits);
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

/**
 * Plays the fixture game live with a fake key under the fallback name of decision A13.
 *
 * @param more - What differs from a run with the provider `anthropic`, a cap of 1 USD and the script.
 * @returns The result and what was printed.
 */
async function live(more: Partial<LiveInput> = {}): Promise<LiveResult & { readonly out: readonly string[]; readonly err: string }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), installed: { "guess-number": guessNumber } };
	const input: LiveInput = { file: GAME, seed: undefined, out: undefined, json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env: { ARENA_ANTHROPIC_API_KEY: KEY }, source: script(), ...more };
	return { ...(await runLive(input, io)), out, err: err.join("\n") };
}

const manifestOf = (run: string): ReturnType<typeof Parse<typeof RunManifestSchema>> => Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, run, "manifest.json"), "utf8")));

describe("runLive with the scripted source", () => {
	it("writes the manifest before the first event, plays to the end, verifies the log and prints the spend", async () => {
		const seen: boolean[] = [];
		const watch: EventSink = { write: () => void seen.push(existsSync(join(cwd, "runs/guess-number-001/manifest.json"))) };
		const { code, run, name, end, out, err } = await live({ sinks: [watch], replicate: 2, purpose: "pilot" });
		expect([code, run, name, err]).toEqual([0, "runs/guess-number-001", "pilot/guess-number-001", ""]);
		expect(end).toMatchObject({ reason: "limit", limit: "guess-number.solved" });
		expect([seen.length > 10, seen.every(Boolean)]).toEqual([true, true]);
		expect(out).toEqual([expect.stringMatching(/^guess-number seed 4 with anthropic\/\S+: ended after \d+ ticks \(limit guess-number.solved: A01 found the secret\)$/), expect.stringMatching(/^log verified: \d+ lines, head [0-9a-f]{64}$/), expect.stringMatching(/^spend: 0\.0000 USD of the cap 1\.00 USD, [1-9]\d* requests, \d+ input, \d+ cache-read, \d+ cache-write and \d+ output tokens$/), "run: runs/guess-number-001"]);
		const manifest = manifestOf("runs/guess-number-001");
		expect(manifest).toMatchObject({ run: { purpose: "pilot" }, replicate: 2, limits: { budgetUsd: 1 }, game: { params: {} } });
		expect(manifest.actors.map((actor) => [actor.driver, actor.model?.provider, actor.model?.params.thinking, /^pi-ai@\d+\.\d+\.\d+$/.test(actor.model?.pricing ?? "")])).toEqual([1, 2, 3].map(() => [RESIDENT_DRIVER, "anthropic", "medium", true]));
		// What `prompt_fixed` recorded is what the manifest promised before the run started.
		const lines: readonly unknown[] = readFileSync(join(cwd, "runs/guess-number-001/events.jsonl"), "utf8").trim().split("\n").map((line): unknown => JSON.parse(line));
		const fixed = lines.flatMap((line) => (Check(Fixed, line) ? [[line.actor, line.payload.systemHash]] : []));
		expect(fixed).toHaveLength(3);
		expect(fixed).toEqual(manifest.actors.map((actor) => [actor.id, actor.textHashes.system]));
		expect(manifest.actors.every((actor) => actor.textHashes.toolSpecs !== undefined)).toBe(true);
	});

	it("exits 5 when the run ends at its cost cap, and the log still verifies", async () => {
		// One answer of 0.03 leaves 0.02 under the cap of 0.05, less than its own cost: no second request is sent (P472).
		const { code, end, spend, out } = await live({ source: priced(0.03), budget: 0.05, out: "capped", json: true });
		expect([code, end]).toMatchObject([5, { reason: "limit", limit: "models.budget" }]);
		expect([spend?.requests, spend?.costUsd]).toEqual([1, 0.03]);
		expect(JSON.parse(out[0] ?? "null")).toMatchObject({ driver: RESIDENT_DRIVER, capUsd: 0.05, log: { ok: true }, run: "capped/guess-number-001", issues: [] });
		// The replay meters the cap of the manifest again, so the run that ended at its cap replays equal (P471).
		const replayed: string[] = [];
		const io: CliIo = { cwd, now: () => new Date(0), out: (line) => replayed.push(line), err: (line) => replayed.push(line), env: {} };
		expect(await main(["replay", "capped/guess-number-001", "--game", GAME], io)).toBe(0);
		expect(replayed).toEqual([expect.stringMatching(/^equal, \d+ lines$/)]);
	});

	it("exits 1 with SWT-X001 and names both variables when the key is missing; finds it under either name", async () => {
		const { code, err, issues } = await live({ env: {}, out: "none" });
		expect([code, issues.map((issue) => issue.code)]).toEqual([1, ["SWT-X001"]]);
		expect(err).toContain("SWT_ANTHROPIC_API_KEY");
		expect(err).toContain("ARENA_ANTHROPIC_API_KEY");
		// A key of another provider is no key of this one.
		expect((await live({ env: { OPENROUTER_API_KEY: KEY }, out: "none" })).issues[0]?.code).toBe("SWT-X001");
		expect(existsSync(join(cwd, "none"))).toBe(false);
		expect((await live({ env: { SWT_ANTHROPIC_API_KEY: KEY }, out: "named" })).code).toBe(0);
	});

	it("refuses a run without a cost cap (SWT-X005), a confirmatory single run, and bad flag values", async () => {
		const codes = async (...args: readonly string[]): Promise<readonly [number, string | undefined]> => {
			const err: string[] = [];
			const code = await main(["run", GAME, "--out", "none", ...args], { cwd, now: () => new Date(0), out: () => undefined, err: (line) => err.push(line), env: { ARENA_ANTHROPIC_API_KEY: KEY } });
			return [code, /SWT-[A-Z]\d{3}/.exec(err.join("\n"))?.[0]];
		};
		expect(await codes("--provider", "anthropic")).toEqual([1, "SWT-X005"]);
		expect(await codes("--budget", "0")).toEqual([1, "SWT-X005"]);
		expect(await codes("--budget", "1e3")).toEqual([1, "SWT-C003"]);
		expect(await codes("--budget", "1", "--replicate", "-1")).toEqual([1, "SWT-C003"]);
		expect(await codes("--budget", "1", "--thinking", "hard")).toEqual([1, "SWT-C022"]);
		expect(await codes("--budget", "1", "--purpose", "final")).toEqual([1, "SWT-C022"]);
		expect(await codes("--budget", "1", "--purpose", "confirmatory")).toEqual([1, "SWT-C023"]);
		expect(await codes("--budget", "1", "--provider", "nobody")).toEqual([1, "SWT-X002"]);
		expect(await codes("--budget", "1", "--set", "max=3")).toEqual([1, "SWT-G041"]);
		expect(existsSync(join(cwd, "none"))).toBe(false);
	});

	it("prints through the redaction of the broker: a held key value never reaches the terminal", async () => {
		const { code, out, err } = await live({ out: `runs-${KEY}` });
		expect([code, out.at(-1), [...out, err].join("\n").includes(KEY)]).toEqual([0, expect.stringMatching(/^run: runs-.*\[redacted\]\/guess-number-001$/), false]);
		// An `SwtError` is printed as its issues, anything else as its redacted message; neither as an error object.
		const broken = await live({ out: "broken", sinks: [{ write: () => { throw new TypeError(`the sink failed with ${KEY}`); } }] });
		expect([broken.code > 0, [...broken.out, broken.err].join("\n").includes(KEY), broken.err]).toEqual([true, false, expect.stringContaining("[redacted]")]);
	});
});

describe("the result line and the name of a run", () => {
	it("P448: prints the cache reads and writes beside the input and the output; P447: names a run without a path", () => {
		expect(tokenLine({ requests: 12, input: 686, output: 31038, cacheRead: 755266, cacheWrite: 84665, costUsd: 0.4 })).toBe("12 requests, 686 input, 755266 cache-read, 84665 cache-write and 31038 output tokens");
		const experiment = { id: "harbor-lights-notes", specHash: "0".repeat(64), arm: "solo" };
		expect([runName({ purpose: "smoke" }, "/somewhere/runs-data/smoke/quarry-001"), runName({ purpose: "confirmatory", experiment }, "../runs/harbor-lights-007")]).toEqual(["smoke/quarry-001", "harbor-lights-notes/harbor-lights-007"]);
	});
});
