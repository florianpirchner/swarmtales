// SPDX-License-Identifier: Apache-2.0
/** `swt run --fake` and `swt log verify` end to end: a game file to a run folder that verifies, and the exit codes. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { jsonHash } from "@swarmtales/chain";
import { RunManifestSchema } from "@swarmtales/contracts";
import { openRunFolder } from "@swarmtales/runlog";
import { guessNumber, play } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { main, type CliIo } from "../src/main.ts";
import game from "./fixtures/guess-number.ts";

const fixture = (name: string): string => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const Texts = Type.Record(Type.String({ description: "A key" }), Type.String({ description: "A text" }), { description: "texts.json" });
const Result = Type.Object(
	{ seed: Type.Integer({ description: "The seed" }), end: Type.Unknown({ description: "The end" }), run: Type.String({ description: "The folder" }), log: Type.Object({ ok: Type.Boolean({ description: "Verified" }) }, { description: "The log" }) },
	{ description: "The JSON line of a run" },
);

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-cli-"));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

/**
 * Runs one command with a fixed clock and the fixture mechanic as the installed table.
 *
 * @param args - The arguments of `swt`.
 * @returns The exit code and what was printed.
 */
async function swt(...args: readonly string[]): Promise<{ readonly code: number; readonly out: readonly string[]; readonly err: string }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), installed: { "guess-number": guessNumber } };
	return { code: await main(args, io), out, err: err.join("\n") };
}

const file = (run: string, name: string): string => readFileSync(join(cwd, run, name), "utf8");
const json = (text: string | undefined): unknown => JSON.parse(text ?? "null");

describe("swt run --fake", () => {
	it("plays a module game into a run folder that verifies, and prints the result lines", async () => {
		const { code, out, err } = await swt("run", fixture("guess-number.ts"), "--fake");
		const head = /head ([0-9a-f]{64})$/.exec(out[2] ?? "")?.[1];
		expect([code, err]).toEqual([0, ""]);
		expect(out).toEqual(["fake models: no result", "guess-number seed 4: ended after 5 ticks (limit guess-number.solved: A01 found the secret)", `log verified: 83 lines, head ${head ?? "?"}`, "run: runs/guess-number-001"]);
		expect(await swt("log", "verify", "runs/guess-number-001")).toEqual({ code: 0, out: [`ok, 83 lines, head ${head ?? "?"}`], err: "" });
	});

	it("records the fake driver for every actor, and every text and briefing by the hash the manifest names", () => {
		const manifest = Parse(RunManifestSchema, json(file("runs/guess-number-001", "manifest.json")));
		const texts = Parse(Texts, json(file("runs/guess-number-001", "texts.json")));
		expect(manifest.actors.map((actor) => [actor.id, actor.driver])).toEqual([1, 2, 3].map((n) => [`resident:A0${String(n)}`, "fake/sample"]));
		expect(manifest.kernel.revision).toBe(3);
		expect(Object.keys(manifest.texts).length).toBeGreaterThan(0);
		expect(Object.fromEntries(Object.keys(manifest.texts).map((key) => [key, jsonHash(texts[key])]))).toEqual(manifest.texts);
		expect(texts["briefing/resident:A02"]).toBe("Find the secret number.");
		expect(manifest.actors[1]?.textHashes.briefing).toBe(jsonHash(texts["briefing/resident:A02"]));
	});

	it("plays the same game from a YAML file as from the module, takes --seed and --out, and prints JSON", async () => {
		const same = Parse(Result, json((await swt("run", fixture("guess-number.yaml"), "--fake", "--json", "--out", "data")).out[0]));
		expect(same).toMatchObject({ seed: 4, end: { reason: "limit", tick: 5, limit: "guess-number.solved" }, run: "data/guess-number-001", log: { ok: true } });
		expect(file("data/guess-number-001", "game.json")).toBe(file("runs/guess-number-001", "game.json"));
		const other = await swt("run", fixture("guess-number.yaml"), "--fake", "--json", "--out", "data", "--seed", "9");
		expect([other.code, Parse(Result, json(other.out[0]))]).toMatchObject([0, { seed: 9, run: "data/guess-number-002" }]);
		expect(Parse(RunManifestSchema, json(file("data/guess-number-002", "manifest.json"))).seed).toBe(9);
	});

	it("exits 2 when the run ends with an error, and its log still verifies", async () => {
		const { code, out, err } = await swt("run", fixture("broken.ts"), "--fake");
		expect([code, out[1], out.at(-1)]).toEqual([2, "broken seed 1: ended after 0 ticks (error)", "run: runs/broken-001"]);
		expect(err).toContain("SWT-R003");
		expect((await swt("log", "verify", "runs/broken-001")).code).toBe(0);
	});

	it("exits 1 with the issue before a run: no --fake, a bad seed, an unknown flag or command, a missing file", async () => {
		const codes = async (...args: readonly string[]): Promise<readonly [number, string | undefined]> => {
			const { code, err } = await swt(...args);
			return [code, /SWT-[A-Z]\d{3}/.exec(err)?.[0]];
		};
		expect(await codes("run", fixture("guess-number.ts"))).toEqual([1, "SWT-C020"]);
		expect(await codes("run", fixture("guess-number.ts"), "--fake", "--seed", "-1")).toEqual([1, "SWT-C003"]);
		expect(await codes("run", fixture("guess-number.ts"), "--fake", "--seed", "1.5")).toEqual([1, "SWT-C003"]);
		expect(await codes("run", fixture("guess-number.ts"), "--live")).toEqual([1, "SWT-C003"]);
		expect(await codes("play", "x")).toEqual([1, "SWT-C003"]);
		expect(await codes("log", "check", "runs")).toEqual([1, "SWT-C003"]);
		expect(await codes("run", "no-such.ts", "--fake", "--out", "none")).toEqual([1, "SWT-C001"]);
		expect(json((await swt("run", "no-such.ts", "--fake", "--json")).out[0])).toMatchObject({ issues: [{ code: "SWT-C001" }] });
		expect(() => readFileSync(join(cwd, "none"))).toThrow();
	});
});

describe("swt log verify", () => {
	it("exits 3 on a log that holds but has no end", async () => {
		const manifest = Parse(RunManifestSchema, json(file("data/guess-number-001", "manifest.json")));
		const folder = openRunFolder(join(cwd, "cut"), manifest, { now: () => new Date(0) });
		await play(game, { sinks: [folder.sink], ticks: 1 });
		folder.close();
		expect(await swt("log", "verify", "cut")).toMatchObject({ code: 3, out: [expect.stringMatching(/^unfinished, \d+ lines, head [0-9a-f]{64}$/)], err: "" });
	});

	it("exits 1 on a tampered line and names the line; exits 1 on a folder that is no run", async () => {
		const events = join(cwd, "runs/guess-number-001/events.jsonl");
		writeFileSync(events, readFileSync(events, "utf8").replace('"value":', '"value":1'));
		const { code, out, err } = await swt("log", "verify", "runs/guess-number-001");
		expect([code, out]).toEqual([1, []]);
		expect(err).toMatch(/^error SWT-L001: .*\n {2}at .*events\.jsonl:\d+/);
		const asJson = await swt("log", "verify", "runs/guess-number-001", "--json");
		expect([asJson.code, json(asJson.out[0])]).toMatchObject([1, { ok: false, issues: [{ code: "SWT-L001" }] }]);
		expect((await swt("log", "verify", "nowhere")).code).toBe(1);
	});
});
