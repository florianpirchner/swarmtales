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
	const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), installed: { "guess-number": guessNumber }, env: {} };
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

	// M1 review, finding C2. The sdk says which tools have a `sample` (`head.tools[].sampled`); the kernel is not asked.
	it("warns once with SWT-C010 about a granted tool without a sample, and still plays", async () => {
		const { code, out, err } = await swt("run", fixture("no-sample.ts"), "--fake");
		expect([code, err.match(/SWT-C010/g)?.length]).toEqual([0, 1]);
		expect(err.split("\n")[0]).toBe('warning SWT-C010: the tool "poke" of the grant "resident" has no `sample`, so `--fake` never calls it');
		expect(out[0]).toBe("fake models: no result");
		// A game whose tools all have a `sample` gives no warning.
		expect((await swt("run", fixture("guess-number.ts"), "--fake", "--out", "quiet")).err).toBe("");
	});

	it("exits 1 with the issue before a run: no --fake, a bad seed, an unknown flag or command, a missing file", async () => {
		const codes = async (...args: readonly string[]): Promise<readonly [number, string | undefined]> => {
			const { code, err } = await swt(...args);
			return [code, /SWT-[A-Z]\d{3}/.exec(err)?.[0]];
		};
		// Without `--fake` the run is a live one (M2-20), and a live run without a cost cap is refused before anything else.
		expect(await codes("run", fixture("guess-number.ts"))).toEqual([1, "SWT-X005"]);
		expect(await codes("run", fixture("guess-number.ts"), "--fake", "--seed", "-1")).toEqual([1, "SWT-C003"]);
		expect(await codes("run", fixture("guess-number.ts"), "--fake", "--seed", "1.5")).toEqual([1, "SWT-C003"]);
		// M1 review, finding C1: a seed above 32 bits started a run that ended with SWT-R020 (the manifest refused it) and exit 2.
		expect(await codes("run", fixture("guess-number.ts"), "--fake", "--seed", "4294967296", "--out", "none")).toEqual([1, "SWT-C003"]);
		expect((await swt("run", fixture("guess-number.ts"), "--fake", "--seed", "4294967295", "--out", "bound")).code).toBe(0);
		expect(await codes("run", fixture("guess-number.ts"), "--live")).toEqual([1, "SWT-C003"]);
		expect(await codes("play", "x")).toEqual([1, "SWT-C003"]);
		expect(await codes("log", "check", "runs")).toEqual([1, "SWT-C003"]);
		expect(await codes("run", "no-such.ts", "--fake", "--out", "none")).toEqual([1, "SWT-C001"]);
		expect(json((await swt("run", "no-such.ts", "--fake", "--json")).out[0])).toMatchObject({ issues: [{ code: "SWT-C001" }] });
		expect(() => readFileSync(join(cwd, "none"))).toThrow();
	});
});

// M2-20: since M2-15 the two ported games default-export a game family, and `definitionsOf` of the family threw a TypeError.
describe("swt run --fake of a game family", () => {
	const quarry = fileURLToPath(new URL("../../../games/quarry/game.ts", import.meta.url));

	it("plays quarry to the end of its match with the defaults of the family, and the log verifies", async () => {
		const { code, out, err } = await swt("run", quarry, "--fake", "--json");
		const result = Parse(Result, json(out[0]));
		expect([code, err.match(/SWT-C010/g)?.length]).toEqual([0, 4]);
		expect(result).toMatchObject({ seed: 29, end: { reason: "limit", limit: "draft-rounds.match" }, run: "runs/quarry-001", log: { ok: true } });
		expect((await swt("log", "verify", "runs/quarry-001")).code).toBe(0);
		expect(Parse(RunManifestSchema, json(file("runs/quarry-001", "manifest.json"))).game.params).toMatchObject({ games: 3, brain: true });
	});

	it("takes --set overrides into the game and the manifest, and reports a bad one before the run", async () => {
		const { code, out } = await swt("run", quarry, "--fake", "--json", "--out", "arm", "--set", "games=1", "--set", "brain=false");
		expect([code, Parse(Result, json(out[0])).run]).toEqual([0, "arm/quarry-001"]);
		const [base, arm] = ["runs", "arm"].map((folder) => Parse(RunManifestSchema, json(file(`${folder}/quarry-001`, "manifest.json"))).game);
		expect(arm?.params).toMatchObject({ games: 1, brain: false });
		expect(arm?.hash).not.toBe(base?.hash);
		const wrong = await swt("run", quarry, "--fake", "--out", "none", "--set", "gamez=1", "--set", 'games="x"');
		expect([wrong.code, wrong.err.match(/error SWT-G041/g)?.length, wrong.err]).toEqual([1, 2, expect.stringContaining('did you mean "games"?')]);
		expect([(await swt("run", quarry, "--fake", "--set", "games")).err, (await swt("run", quarry, "--fake", "--set", "games=one")).err]).toEqual([expect.stringContaining("SWT-C021"), expect.stringContaining("SWT-C021")]);
		// A game that is no family takes no override.
		expect((await swt("run", fixture("guess-number.ts"), "--fake", "--out", "none", "--set", "max=3")).err).toContain("SWT-G041");
		expect(() => readFileSync(join(cwd, "none"))).toThrow();
	});
});

// M1 review, finding S2: a module whose default export is an object that is no game left `main` with a TypeError.
describe("a module that exports no game", () => {
	it("exits 1 with an issue of the game, whatever the export holds", async () => {
		const module = (name: string, text: string): string => {
			writeFileSync(join(cwd, name), text);
			return name;
		};
		const shell = "id: 'x', residents: 1, end: { ticks: 1 }";
		expect((await swt("run", module("no-definition.mjs", `export default { ${shell}, mechanics: [{ mechanic: undefined }] };`), "--fake")).err).toContain("SWT-G001");
		expect((await swt("run", module("no-list.mjs", `export default { ${shell} };`), "--fake")).err).toContain("SWT-G001");
		expect((await swt("run", module("text.mjs", `export default { ${shell}, mechanics: "none" };`), "--fake")).err).toContain("SWT-G001");
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

	// M1 review, finding R2: `verifyRun` compared only the keys of `manifest.texts`.
	it("exits 1 when a briefing in texts.json was changed, or a text was added that no hash covers", async () => {
		await swt("run", fixture("guess-number.ts"), "--fake", "--out", "texts");
		const path = join(cwd, "texts/guess-number-001/texts.json");
		const texts = Parse(Texts, json(readFileSync(path, "utf8")));
		writeFileSync(path, JSON.stringify({ ...texts, "briefing/resident:A02": "Lose on purpose." }));
		const changed = (await swt("log", "verify", "texts/guess-number-001")).code;
		writeFileSync(path, JSON.stringify({ ...texts, "guess-number/extra": "A text nobody committed." }));
		expect([changed, (await swt("log", "verify", "texts/guess-number-001")).code]).toEqual([1, 1]);
	});
});
