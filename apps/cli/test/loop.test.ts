// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The run loop of `swt run` (specification of M3, section 6.3): the Human Hand from a file and from standard input,
 * the pause, the snapshots, `SWT-X008` and `SWT-X009`, and a run without the flags, which has the log of `Kernel.run`.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunManifestSchema, StoredEnvelopeSchema } from "@swarmtales/contracts";
import { DIRECTOR_RECORDS } from "@swarmtales/engine";
import { act, RESIDENT_DRIVER, say, scriptedSource } from "@swarmtales/models";
import { readSnapshotFile } from "@swarmtales/runlog";
import { isGameFamily } from "@swarmtales/sdk";
import { fakeDriver, play } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HAND_DRIVER } from "../src/assembly.ts";
import { runLive } from "../src/live.ts";
import { loadGame } from "../src/load-game.ts";
import { main, type CliIo } from "../src/main.ts";

const GAME = fileURLToPath(new URL("./fixtures/hand.ts", import.meta.url));
const HELLO = fileURLToPath(new URL("../../../games/hello/game.ts", import.meta.url));
const Events = Type.Array(StoredEnvelopeSchema, { description: "The lines of events.jsonl" });

let cwd = "";
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-loop-"));
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

async function swt(args: readonly string[], stdin?: AsyncIterable<string>): Promise<{ readonly code: number; readonly out: readonly string[]; readonly err: string }> {
	const out: string[] = [];
	const err: string[] = [];
	const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: (line) => out.push(line), err: (line) => err.push(line), env: {}, ...(stdin === undefined ? {} : { stdin }) };
	return { code: await main(args, io), out, err: err.join("\n") };
}

/** Writes a file of the Human Hand and gives its name. */
function hand(name: string, lines: readonly unknown[]): string {
	writeFileSync(join(cwd, name), lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
	return name;
}

const events = (run: string): ReturnType<typeof Parse<typeof Events>> =>
	Parse(
		Events,
		readFileSync(join(cwd, run, "events.jsonl"), "utf8")
			.trimEnd()
			.split("\n")
			.map((line): unknown => JSON.parse(line)),
	);
const snapshots = (run: string): readonly string[] => (existsSync(join(cwd, run, "snapshots")) ? readdirSync(join(cwd, run, "snapshots")).sort() : []);

describe("swt run with the run loop", () => {
	// The first test of the issue (specification, section 18, open detail 5).
	it("stops a paused run whose Human Hand has ended with exit 3, and leaves a snapshot and a folder that verifies", async () => {
		const { code, out, err } = await swt(["run", GAME, "--fake", "--out", "paused", "--hand", hand("pause.jsonl", [{ at: 1, tool: "pause" }])]);
		const run = "paused/hand-001";
		expect([code, out[1], /SWT-X\d{3}/.exec(err)?.[0]]).toEqual([3, "hand seed 4: stopped after 1 ticks (paused)", "SWT-X009"]);
		expect(events(run).slice(-3).map((event) => [event.tick, event.actor, event.type])).toEqual([[1, "human", "tool_called"], [1, "human", "paused"], [1, "human", "tool_result"]]);
		expect(events(run).some((event) => event.type === "run_ended")).toBe(false);
		expect(await swt(["log", "verify", run])).toMatchObject({ code: 3, out: [expect.stringMatching(/^unfinished, \d+ lines, head [0-9a-f]{64}$/)], err: "" });
		const file = await readSnapshotFile(join(cwd, run, "snapshots/t1.json"), { runId: "hand-001" });
		expect([snapshots(run), file.tick, file.snapshot.tick, file.checkpoint.lines]).toEqual([["t1.json"], 1, 1, events(run).length]);
		const manifest = Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, run, "manifest.json"), "utf8")));
		expect([manifest.human, manifest.actors.slice(-2)]).toMatchObject([true, [{ id: "director:herald", driver: DIRECTOR_RECORDS.id }, { id: "human", driver: HAND_DRIVER }]]);
	});

	it("gives a Director its driver: in a fake run it acts on its fallback, in a live run it asks the model of the run under the cost meter", async () => {
		const herald = (run: string): readonly unknown[] => events(run).flatMap((event) => (event.actor === "director:herald" && /^(asked|answered|noted|request|response)$/.test(event.type) ? [[event.source.split("/").at(-1), event.type, event.payload]] : []));
		expect(herald("paused/hand-001").slice(0, 3)).toMatchObject([["director", "asked", {}], ["director", "answered", { ok: false, fallback: true, reason: "error" }], ["humanHand", "noted", { line: "silence" }]]);
		const source = scriptedSource({ "resident:A01": [say(), say(), say(), say()], "resident:A02": [act({ name: "guess", args: { value: 5 } }), say()], "director:herald": [say('{"line":"a guess"}')] });
		const io: CliIo = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: () => undefined, err: () => undefined };
		const env = { ARENA_ANTHROPIC_API_KEY: `sk-${"k".repeat(37)}` };
		const live = await runLive({ file: GAME, seed: undefined, out: "live", json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env, source, snapshotAt: [2] }, io);
		expect([live.code, live.issues, snapshots("live/hand-001")]).toEqual([0, [], ["t2.json"]]);
		expect(herald("live/hand-001")).toMatchObject([["director", "asked", {}], ["director", "request", {}], ["director", "response", {}], ["director", "answered", { ok: true, fallback: false }], ["humanHand", "noted", { line: "a guess" }]]);
		// A live run that is paused with its Human Hand ended: exit 3, the snapshot, and the ledger gets the cost, not the cap.
		writeFileSync(join(cwd, "ledger.jsonl"), '{"capUsd":2}\n');
		const paused = await runLive({ file: GAME, seed: undefined, out: "live", json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env, source, hand: "pause.jsonl", ledger: "ledger.jsonl" }, io);
		expect([paused.code, paused.end, paused.stopped, paused.issues.map((issue) => issue.code), snapshots("live/hand-002")]).toEqual([3, undefined, { stopped: "paused", tick: 1 }, ["SWT-X009"], ["t1.json"]]);
		expect(readFileSync(join(cwd, "ledger.jsonl"), "utf8").split("\n")[2]).toContain('"costUsd":0,');
		const actors = Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, "live/hand-001/manifest.json"), "utf8"))).actors.map((actor) => [actor.id, actor.driver, actor.model?.provider, actor.textHashes.system === undefined]);
		expect(actors.slice(-3)).toEqual([["resident:A02", RESIDENT_DRIVER, "anthropic", false], ["director:herald", DIRECTOR_RECORDS.id, "anthropic", true], ["human", HAND_DRIVER, undefined, true]]);
	});

	it("applies a hand file: pause, a snapshot while paused, resume; the snapshots are on disk and write no event", async () => {
		const lines = [{ at: 1, tool: "pause" }, { at: 1, tool: "pause" }, { at: 9, command: "snapshot" }, { at: 9, tool: "resume" }, { at: 3, command: "snapshot" }];
		const { code, out } = await swt(["run", GAME, "--fake", "--out", "played", "--hand", hand("play.jsonl", lines), "--snapshot-at", "0,2"]);
		expect([code, out[1]]).toEqual([0, "hand seed 4: ended after 4 ticks (tick limit)"]);
		const human = events("played/hand-001").filter((event) => event.actor === "human");
		expect(human.map((event) => [event.tick, event.type])).toEqual([[1, "tool_called"], [1, "paused"], [1, "tool_result"], [1, "tool_called"], [1, "tool_refused"], [1, "tool_called"], [1, "resumed"], [1, "tool_result"]]);
		expect(human[4]?.payload).toMatchObject({ code: "ALREADY_PAUSED" });
		expect(snapshots("played/hand-001")).toEqual(["t0.json", "t1.json", "t2.json", "t3.json"]);
		expect((await swt(["log", "verify", "played/hand-001"])).code).toBe(0);
		// Without a Human Hand: a run with snapshots has the log of the run without them (the clock of the test stands still).
		expect([(await swt(["run", GAME, "--fake", "--out", "plain"])).code, (await swt(["run", GAME, "--fake", "--out", "shot", "--snapshot-at", "0,2,4"])).code]).toEqual([0, 0]);
		expect([snapshots("plain/hand-001"), snapshots("shot/hand-001"), events("shot/hand-001")]).toEqual([[], ["t0.json", "t2.json"], events("plain/hand-001")]);
	});

	it("takes the Human Hand from standard input: the lines that are there at a boundary, and while paused the next one", async () => {
		async function* typed(...lines: readonly string[]): AsyncGenerator<string> {
			for (const line of lines) {
				yield line;
				await new Promise((later) => setTimeout(later, 20));
			}
		}
		expect((await swt(["run", GAME, "--fake", "--out", "typed", "--hand", "-"], typed(JSON.stringify({ at: 0, tool: "pause" }), "", JSON.stringify({ at: 0, tool: "resume" })))).code).toBe(0);
		expect(events("typed/hand-001").flatMap((event) => (event.actor === "human" ? [[event.tick, event.type]] : []))).toEqual([[0, "tool_called"], [0, "paused"], [0, "tool_result"], [0, "tool_called"], [0, "resumed"], [0, "tool_result"]]);
		const broken = await swt(["run", GAME, "--fake", "--out", "typed", "--hand", "-"], typed("pause"));
		expect([broken.code, /SWT-X\d{3}/.exec(broken.err)?.[0]]).toEqual([1, "SWT-X008"]);
	});

	it("refuses with SWT-X008, before a run folder exists, a hand the game cannot take; and a bad --snapshot-at with SWT-C003", async () => {
		const refused = async (...args: readonly string[]): Promise<readonly [number, string | undefined]> => {
			const { code, err } = await swt(["run", ...args, "--fake", "--out", "none"]);
			return [code, /SWT-[A-Z]\d{3}/.exec(err)?.[0]];
		};
		expect(await refused(HELLO, "--hand", hand("ok.jsonl", [{ at: 0, command: "snapshot" }]))).toEqual([1, "SWT-X008"]);
		expect(await refused(GAME, "--hand", hand("tool.jsonl", [{ at: 0, tool: "guess", params: { value: 1 } }]))).toEqual([1, "SWT-X008"]);
		expect(await refused(GAME, "--hand", hand("both.jsonl", [{ at: 0, tool: "pause", command: "snapshot" }]))).toEqual([1, "SWT-X008"]);
		expect(await refused(GAME, "--hand", hand("at.jsonl", [{ at: -1, tool: "pause" }]))).toEqual([1, "SWT-X008"]);
		expect(await refused(GAME, "--hand", "no-such.jsonl")).toEqual([1, "SWT-X008"]);
		expect(await refused(GAME, "--snapshot-at", "2,x")).toEqual([1, "SWT-C003"]);
		expect(existsSync(join(cwd, "none"))).toBe(false);
	});

	it("plays the Hello Game without the flags to the log that one call of Kernel.run gives", async () => {
		expect((await swt(["run", HELLO, "--fake", "--out", "hello"])).code).toBe(0);
		const { game } = await loadGame(HELLO, cwd);
		const straight = await play(isGameFamily(game) ? game.build({}) : game, { drivers: (kernel) => ({ resident: fakeDriver(kernel, 1) }) });
		const lines = events("hello/hello-game-001");
		expect(lines.length).toBeGreaterThan(20);
		expect(lines.map((event) => ({ ...event, at: undefined }))).toEqual(straight.events);
		expect(snapshots("hello/hello-game-001")).toEqual([]);
	});
});
