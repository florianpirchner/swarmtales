// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The canary test (specification of M2, 5.2): fake key values go through the whole live path of the command line,
 * each sub-test tries to leak them one way, and two scans look for them: one of every file, the terminal and the
 * thrown issues, one of the events in memory before the run log's own redaction. Offline: the scripted source,
 * an injected environment, the global `fetch` rejects. This file is also the game file of the test: its default
 * export is a family of guess-number with a text param (for `--set`) and a plugin that throws.
 */
import { Buffer } from "node:buffer";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventSink } from "@swarmtales/contracts";
import { act, createKeyBroker, fail, RESIDENT_RECORDS, say, scriptedSource, type ScriptStep } from "@swarmtales/models";
import { defineGame, defineGameFamily, defineMechanic } from "@swarmtales/sdk";
import { guessNumber, guessNumberHead } from "@swarmtales/testkit";
import { Type } from "typebox";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LEAK_FILE } from "../src/leak-scan.ts";
import { runLive, type LiveInput } from "../src/live.ts";
import { REPORT_FILE } from "../src/report.ts";
import { main } from "../src/main.ts";

// Fake values of 40 characters, built at run time from parts: one shaped like a key, one shaped like no pattern
// (it proves the value redaction of the broker) and with characters that base64 and percent-encoding change.
const SHAPED = `sk-${"c4".repeat(18)}x`;
const PLAIN = `or/${"Z9+".repeat(12)}=`;
// What the patterns alone must take out: the credentials of a URL and a bearer token.
const PASSWORD = `pw${"7q".repeat(9)}`;
const TOKEN = `tk${"8w".repeat(11)}`;
const SECRETS = `${SHAPED} and ${PLAIN} at https://user:${PASSWORD}@example.test/v1 with Bearer ${TOKEN}`;
// What the redaction makes of `SECRETS`: the prefix of a key's shape stays, no value does.
const CLEAN = "[redacted] and [redacted] at https://[redacted]@example.test/v1 with Bearer [redacted]";
const NEEDLES = [SHAPED, PLAIN, PASSWORD, TOKEN].flatMap((value) => [value, Buffer.from(value).toString("base64").replace(/=+$/, ""), Buffer.from(value).toString("base64url"), encodeURIComponent(value)]);
const holds = (text: string): boolean => NEEDLES.some((needle) => text.includes(needle));
const env = { SWT_ANTHROPIC_API_KEY: SHAPED, OPENROUTER_API_KEY: PLAIN };

const trap = defineMechanic(guessNumberHead, {
	tools: { guess: { run: () => { throw new Error(`the plugin failed with ${SECRETS}`); } } },
	hooks: { toAct: (ctx) => ctx.residents.ids },
});
const Params = Type.Object({ label: Type.String({ default: "", description: "A text that reaches the manifest" }), trap: Type.Boolean({ default: false, description: "The plugin throws" }) }, { description: "The params of the canary family" });
export default defineGameFamily(Params, (params) => defineGame({ id: "guess-number", seed: 4, residents: 3, mechanics: [(params.trap ? trap : guessNumber)({ max: 20 })], briefing: "Find the secret number.", end: { ticks: 30 } }));

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-canary-"));
	vi.stubGlobal("fetch", () => Promise.reject(new TypeError("a test reached the global fetch")));
});
afterAll(() => {
	vi.unstubAllGlobals();
	rmSync(cwd, { recursive: true, force: true });
});

const guesses: readonly ScriptStep[] = Array.from({ length: 20 }, (_, index) => act({ name: "guess", args: { value: index + 1 } }));
const waits: readonly ScriptStep[] = Array.from({ length: 40 }, () => say());
const filesOf = (folder: string): readonly string[] => (existsSync(folder) ? readdirSync(folder, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name)) : []);

/**
 * Plays one leak attempt through `runLive` and scans what it left: every file under the attempt's folder, the
 * terminal, the returned issues and the broker of the same environment; then the events in memory.
 *
 * @param name - The folder of the attempt.
 * @param first - The first answers of A01; the guesses that end the game follow.
 * @param more - What differs from a run with both canaries in the environment.
 * @returns The exit code, the terminal, the event types of the log lines that hold the redacted secrets, the two
 * scans as lists of what holds a canary, the exit code of `swt log verify` (-1 without a run folder) and the exit
 * code of `swt report` (-1 without a run folder), whose `REPORT.md` and terminal lines are scanned with the rest.
 */
async function attempt(name: string, first: readonly ScriptStep[], more: Partial<LiveInput> = {}): Promise<{ readonly code: number; readonly terminal: string; readonly clean: readonly string[]; readonly files: readonly string[]; readonly memory: readonly string[]; readonly verified: number; readonly reported: number }> {
	const terminal: string[] = [];
	const seen: Parameters<EventSink["write"]>[0][] = [];
	const io = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line: string) => void terminal.push(line), err: (line: string) => void terminal.push(line) };
	const source = scriptedSource({ "resident:A01": [...first, ...guesses], "resident:A02": waits, "resident:A03": waits });
	const memory: EventSink = { write: (event) => void seen.push(event) };
	const { code, issues } = await runLive({ file: fileURLToPath(import.meta.url), seed: undefined, out: name, json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env, source, ...more, sinks: [memory, ...(more.sinks ?? [])] }, io);
	const run = join(cwd, name, "guess-number-001");
	// The report is written before the scan, with the environment of the test: `report` never reads the process then.
	const reported = existsSync(run) ? await main(["report", run, "--game", fileURLToPath(import.meta.url)], { ...io, env }) : -1;
	const texts = { terminal: terminal.join("\n"), issues: JSON.stringify(issues), broker: `${JSON.stringify(createKeyBroker(env))}${String(createKeyBroker(env))}`, ...Object.fromEntries(filesOf(join(cwd, name)).map((file) => [file.slice(cwd.length + 1), readFileSync(file, "utf8")])) };
	// The memory scan: `run_ended` and the records. What a plugin gets and emits is redacted by the run log's sink only.
	const records = seen.filter((event) => event.type === "run_ended" || event.source === RESIDENT_RECORDS.id);
	return {
		code,
		terminal: texts.terminal,
		clean: (existsSync(run) ? readFileSync(join(run, "events.jsonl"), "utf8") : "").split("\n").filter((line) => line.includes(CLEAN)).map((line) => /"type":"([a-z_]+)"/.exec(line)?.[1] ?? ""),
		files: Object.entries(texts).filter(([, text]) => holds(text)).map(([file]) => file),
		memory: records.filter((event) => holds(JSON.stringify(event))).map((event) => `${event.source}/${event.type}`),
		verified: existsSync(run) ? await main(["log", "verify", run], { ...io, out: () => undefined }) : -1,
		reported,
	};
}

describe("the canary: no key value in any artefact of a live run", () => {
	it("(a) a provider error with a canary, a URL with credentials and a bearer token", async () => {
		const { code, files, memory, clean, verified, reported } = await attempt("a", [fail(`the provider said: ${SECRETS}`)]);
		expect([code, files, memory, clean, verified]).toEqual([0, [], [], ["request_failed"], 0]);
		// `swt report` wrote its file into the folder before the scan read every file of it.
		expect([reported, existsSync(join(cwd, "a", "guess-number-001", REPORT_FILE))]).toEqual([0, true]);
	});

	it("(b) a plugin that throws with the canary ends the run: run_ended.detail", async () => {
		const { code, files, memory, clean, verified } = await attempt("b", [], { params: { trap: true } });
		expect([code, files, memory, clean, verified]).toEqual([2, [], [], ["run_ended"], 0]);
	});

	it("(c) a model answer whose text and whose tool arguments hold the canary", async () => {
		const { code, files, memory, clean, verified, reported } = await attempt("c", [act({ name: "guess", args: { value: 1, note: SECRETS } }), say(`I say ${SECRETS}`)]);
		expect([code, files, memory, clean, verified, reported]).toEqual([0, [], [], ["tool_called", "text"], 0, 0]);
	});

	it("(d) a sink that throws with the canary while the folder closes", async () => {
		const closing: EventSink = { write: () => undefined, close: () => { throw new TypeError(`the sink failed with ${SECRETS}`); } };
		const { code, files, memory, terminal, verified } = await attempt("d", [], { sinks: [closing] });
		expect([code > 0, files, memory, verified]).toEqual([true, [], [], 0]);
		expect(terminal.includes(`the sink failed with ${CLEAN}`)).toBe(true);
	});

	it("(e) a missing key (SWT-X001) and an unknown model (SWT-X003) that is itself a canary", async () => {
		const missing = await attempt("e", [], { env: { OPENROUTER_API_KEY: PLAIN } });
		expect([missing.code, missing.files, /SWT-X\d{3}/.exec(missing.terminal)?.[0]]).toEqual([1, [], "SWT-X001"]);
		// No source of the test: the provider's own source looks the model up, and refuses before any request.
		const provider: LiveInput = { file: fileURLToPath(import.meta.url), seed: undefined, out: "e", json: false, provider: "anthropic", modelId: `${PLAIN}${SHAPED}`, budget: 1, purpose: "smoke", replicate: 0, env };
		const terminal: string[] = [];
		const unknown = await runLive(provider, { cwd, now: () => new Date(0), out: (line) => terminal.push(line), err: (line) => terminal.push(line) });
		expect([unknown.code, unknown.issues.map((issue) => issue.code), holds(JSON.stringify(unknown.issues)), holds(terminal.join("\n"))]).toEqual([1, ["SWT-X003"], false, false]);
		expect(terminal.join("\n")).toContain("[redacted]");
		expect(existsSync(join(cwd, "e"))).toBe(false);
	});

	it("(f) --set with a canary as a value: the run folder is not created (SWT-L006), and the ledger gets the cap back", async () => {
		writeFileSync(join(cwd, "ledger.jsonl"), '{"capUsd":1}\n');
		for (const label of [SHAPED, PLAIN]) {
			const { code, files, terminal } = await attempt("f", [], { params: { label }, ledger: "ledger.jsonl" });
			expect([code, files, /SWT-[A-Z]\d{3}/.exec(terminal)?.[0], existsSync(join(cwd, "f"))]).toEqual([1, [], "SWT-L006", false]);
		}
		expect(readFileSync(join(cwd, "ledger.jsonl"), "utf8").match(/"costUsd":0,/g)).toHaveLength(2);
	});

	it("a value planted in a run folder gives exit 4 and the LEAK file without the value", async () => {
		const planted = join(cwd, "g", "guess-number-001", "notes.txt");
		const plant: EventSink = { write: () => { writeFileSync(planted, `Authorization: ${Buffer.from(PLAIN).toString("base64")}`); } };
		const { code, files, terminal, verified, reported } = await attempt("g", [], { sinks: [plant] });
		// The report of a folder that holds a value exits with 4 too, and its own file holds none.
		expect([code, files, verified, reported]).toEqual([4, ["g/guess-number-001/notes.txt"], 0, 4]);
		expect([/SWT-X030[^\n]*`notes\.txt`/.test(terminal), readFileSync(join(cwd, "g", "guess-number-001", LEAK_FILE), "utf8").endsWith("\nnotes.txt\n")]).toEqual([true, true]);
	});

	it("swt doctor names the variables of both canaries, in its lines and in --json, and holds neither value", async () => {
		const terminal: string[] = [];
		const io = { cwd, now: () => new Date(0), out: (line: string) => void terminal.push(line), err: (line: string) => void terminal.push(line), env: { ...env, SWT_MODEL: SHAPED, SWT_SECRET: PLAIN } };
		expect([await main(["doctor"], io), await main(["doctor", "--json"], io)]).toEqual([0, 0]);
		const printed = terminal.join("\n");
		expect([holds(printed), printed.match(/a key is set in (SWT_ANTHROPIC_API_KEY|OPENROUTER_API_KEY)/g)?.length]).toEqual([false, 4]);
		expect(printed).toContain("SWT_SECRET is set, and swt reads no variable of that name");
	});

	it("swt doctor --online holds neither value when both providers echo every secret in their error", async () => {
		const terminal: string[] = [];
		const models = (): ReturnType<typeof scriptedSource> => scriptedSource({ "doctor:anthropic": [fail(`401 ${SECRETS}`)], "doctor:openrouter": [fail(`401 ${SECRETS}`)] });
		const io = { cwd, now: () => new Date(0), out: (line: string) => void terminal.push(line), err: (line: string) => void terminal.push(line), env, models };
		expect([await main(["doctor", "--online"], io), await main(["doctor", "--online", "--json"], io)]).toEqual([1, 1]);
		const printed = terminal.join("\n");
		expect([holds(printed), printed.match(/did not answer/g)?.length, printed.includes(CLEAN)]).toEqual([false, 4, true]);
	});
});
