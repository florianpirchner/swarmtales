// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt replay` and `swt scan` (specification of M4, section 4.4): a run folder replays equal through the command
 * line, a differing replay is `SWT-C031`, a log cut inside a tick is `SWT-T005`; the scan finds a held key value
 * in any folder and prints file names and counts only.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAIN_FILE, EVENTS_FILE } from "@swarmtales/chain";
import { SwtError } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS } from "@swarmtales/engine";
import { isGameFamily } from "@swarmtales/sdk";
import { replay } from "@swarmtales/testkit";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadGame } from "../src/load-game.ts";
import { main, type CliIo } from "../src/main.ts";
import { cli, eventsOf, type Printed } from "./support.ts";

const CITY = fileURLToPath(new URL("../../../games/city-slice/game.ts", import.meta.url));
const QUARRY = fileURLToPath(new URL("../../../games/quarry/game.ts", import.meta.url));
const KEY = "sk-ant-test-0123456789abcdefghij";
const PAUSE = { at: 7, tool: "pause", params: { reason: "stop here" } };

let cwd = "";
let swt: (...args: readonly string[]) => Promise<Printed> = () => Promise.reject(new Error("before all"));
beforeAll(async () => {
	cwd = mkdtempSync(join(tmpdir(), "swt-replay-"));
	swt = cli(cwd);
	writeFileSync(join(cwd, "pause.jsonl"), `${JSON.stringify(PAUSE)}\n`);
	expect((await swt("run", CITY, "--fake", "--seed", "7", "--out", "runs", "--snapshot-at", "6")).code).toBe(0);
	expect((await swt("resume", "runs/city-slice-001", "--game", CITY)).code).toBe(0);
	expect((await swt("run", CITY, "--fake", "--seed", "7", "--out", "paused", "--hand", "pause.jsonl")).code).toBe(3);
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

/** `swt scan` with a key in the environment. */
async function scan(env: Readonly<Record<string, string>>, ...args: readonly string[]): Promise<Printed> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date(0), out: (line) => out.push(line), err: (line) => err.push(line), env };
	const code = await main(["scan", ...args], io);
	return { code, out, err: err.join("\n"), issue: /SWT-[A-Z]\d{3}/.exec(err.join("\n"))?.[0] };
}

describe("swt replay", () => {
	it("replays a straight, a resumed and a paused run folder equal", async () => {
		for (const run of ["runs/city-slice-001", "runs/city-slice-002", "paused/city-slice-001"]) {
			const lines = eventsOf(join(cwd, run)).length;
			expect(await swt("replay", run, "--game", CITY), run).toMatchObject({ code: 0, out: [`equal, ${String(lines)} lines`], err: "" });
			expect((await swt("replay", run, "--game", CITY, "--json")).out).toEqual([JSON.stringify({ equal: true, lines })]);
		}
		expect(eventsOf(join(cwd, "runs/city-slice-002")).some((event) => event.type === "run_resumed")).toBe(true);
		expect(eventsOf(join(cwd, "paused/city-slice-001")).some((event) => event.type === "run_ended")).toBe(false);
	});

	it("reports the first differing line as SWT-C031 and exits with 1", async () => {
		const other = await swt("replay", "runs/city-slice-001", "--game", QUARRY);
		expect(other).toMatchObject({ code: 1, out: [], issue: "SWT-C031" });
		expect(other.err).toMatch(/^log: \{.*\}\nreplay: .*\nerror SWT-C031: the replayed log differs at line \d+: /);
		expect(other.err).toContain(`at ${join(cwd, "runs/city-slice-001", EVENTS_FILE)}`);
		expect(other.err).toContain("resolves to another game than the manifest names");
		const json = await swt("replay", "runs/city-slice-001", "--game", QUARRY, "--json");
		expect(json).toMatchObject({ code: 1, err: "" });
		expect(json.out[0]).toContain('"code":"SWT-C031"');
	});

	it("refuses a missing --game, a missing folder and a log that does not verify", async () => {
		expect(await swt("replay", "runs/city-slice-001")).toMatchObject({ code: 1, issue: "SWT-C003" });
		expect(await swt("replay", "nowhere", "--game", CITY)).toMatchObject({ code: 1, issue: "SWT-E001" });
		mkdirSync(join(cwd, "broken"));
		for (const name of ["manifest.json", EVENTS_FILE]) writeFileSync(join(cwd, "broken", name), readFileSync(join(cwd, "runs/city-slice-001", name), "utf8").replace('"A03"', '"A04"'));
		const broken = await swt("replay", "broken", "--game", CITY);
		expect(broken.code).toBe(1);
		expect(broken.issue).toMatch(/^SWT-L/);
	});

	it("refuses a log that stops inside a tick with SWT-T005, and takes one cut between two ticks", async () => {
		const { game } = await loadGame(CITY, cwd);
		if (isGameFamily(game)) throw new RangeError("the city slice is one game, not a family");
		const records = [DIRECTOR_RECORDS];
		const log = eventsOf(join(cwd, "runs/city-slice-001"));
		const ended = log.findLastIndex((event) => event.type === "tick_ended");
		const inside = log.findLastIndex((event) => event.type === "activation_opened");
		const refused = await replay({ game, log: log.slice(0, inside + 1), records }).catch((error: unknown) => error);
		expect(refused instanceof SwtError ? refused.issues[0] : refused).toMatchObject({ code: "SWT-T005", where: { line: inside + 1 } });
		cpSync(join(cwd, "runs/city-slice-001"), join(cwd, "cut"), { recursive: true });
		// A crashed run: the log and its chain stop inside a tick, and the chain has no head.
		const kept = (name: string, keep: (line: string, index: number) => boolean): void => {
			writeFileSync(join(cwd, "cut", name), readFileSync(join(cwd, "cut", name), "utf8").trimEnd().split("\n").filter(keep).map((line) => `${line}\n`).join(""));
		};
		kept(EVENTS_FILE, (_line, index) => index <= inside);
		kept(CHAIN_FILE, (line) => !line.includes('"kind":"head"') && Number(/"seq":(\d+)/.exec(line)?.[1]) <= inside + 1);
		expect(await swt("log", "verify", "cut")).toMatchObject({ code: 1, issue: "SWT-L002" });
		expect(await swt("replay", "cut", "--game", CITY)).toMatchObject({ code: 1, out: [], issue: "SWT-T005" });
		const whole = log.slice(0, log.findLastIndex((event, index) => event.type === "tick_ended" && index < ended) + 1);
		expect((await replay({ game, log: whole, records })).equal).toBe(true);
	});
});

describe("swt scan", () => {
	it("says clean with the count of files, and nothing of a key", async () => {
		const clean = await scan({ ARENA_ANTHROPIC_API_KEY: KEY }, "runs");
		expect(clean).toMatchObject({ code: 0, err: "" });
		expect(clean.out).toEqual([expect.stringMatching(/^clean, \d+ files, keys of 1 providers held$/)]);
		expect(await scan({ ARENA_ANTHROPIC_API_KEY: KEY, OPENROUTER_API_KEY: `${KEY}-or` }, "runs", "--json")).toMatchObject({ code: 0, out: [expect.stringContaining('"clean":true')] });
	});

	it("finds a key value in a file of any depth, also encoded, names the files only and exits with 1", async () => {
		mkdirSync(join(cwd, "data/a/b"), { recursive: true });
		writeFileSync(join(cwd, "data/a/b/events.jsonl"), `{"text":"${KEY}"}\n`);
		writeFileSync(join(cwd, "data/a/notes.md"), `encoded ${Buffer.from(KEY).toString("base64")}\n`);
		writeFileSync(join(cwd, "data/fine.txt"), "nothing\n");
		for (const flags of [[], ["--json"]]) {
			const hit = await scan({ ARENA_ANTHROPIC_API_KEY: KEY }, "data", ...flags);
			const printed = [...hit.out, hit.err].join("\n");
			expect(hit.code).toBe(1);
			expect(printed).toContain("SWT-X030");
			expect(printed).toContain("a/b/events.jsonl");
			expect(printed).toContain("a/notes.md");
			expect(printed).not.toContain("fine.txt");
			for (let at = 0; at + 6 <= KEY.length; at++) expect(printed).not.toContain(KEY.slice(at, at + 6));
		}
		expect(readFileSync(join(cwd, "data/LEAK"), "utf8")).toContain("a/b/events.jsonl");
		expect((await scan({ ARENA_ANTHROPIC_API_KEY: `${KEY}-other` }, "data")).code).toBe(0);
	});

	it("scans nothing without a held key (exit 3) and refuses what is no folder", async () => {
		// The folder of the run played before all tests, not the one the test above writes (M6-15).
		const none = await scan({}, "runs");
		expect(none).toMatchObject({ code: 3, out: [] });
		expect(none.err).toMatch(/^not scanned: none of the key variables is set/);
		expect(await scan({ ARENA_ANTHROPIC_API_KEY: KEY }, "nowhere")).toMatchObject({ code: 1, issue: "SWT-C003" });
		expect(await scan({ ARENA_ANTHROPIC_API_KEY: KEY }, "pause.jsonl")).toMatchObject({ code: 1, issue: "SWT-C003" });
	});
});
