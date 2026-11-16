// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt resume` (specification of M3, section 7.2): the resumed log without its marker is the straight log, the
 * continuity of the two folders verifies, and what cannot be resumed is refused before a folder is written.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunManifestSchema } from "@swarmtales/contracts";
import { act, say, scriptedSource } from "@swarmtales/models";
import { Parse } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runLive } from "../src/live.ts";
import { RUN_RECORDS } from "../src/records.ts";
import { cli, eventsOf, withoutMarker, type Printed } from "./support.ts";

const GAME = fileURLToPath(new URL("./fixtures/hand.ts", import.meta.url));
const HELLO = fileURLToPath(new URL("../../../games/hello/game.ts", import.meta.url));
const OK = /^ok, \d+ lines, head [0-9a-f]{64}/;

let cwd = "";
let swt: (...args: readonly string[]) => Promise<Printed> = () => Promise.reject(new Error("before all"));
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-resume-"));
	swt = cli(cwd);
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

/** Writes a file of the Human Hand and gives its name. */
function hand(name: string, lines: readonly unknown[]): string {
	writeFileSync(join(cwd, name), lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
	return name;
}
const events = (run: string): ReturnType<typeof eventsOf> => eventsOf(join(cwd, run));
const manifest = (run: string): ReturnType<typeof Parse<typeof RunManifestSchema>> => Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, run, "manifest.json"), "utf8")));

describe("swt resume", () => {
	it("resumes the Hello Game after tick 2: the log without the marker is the straight log, and continuity verifies", async () => {
		expect((await swt("run", HELLO, "--fake", "--out", "hello", "--snapshot-at", "2")).code).toBe(0);
		const resumed = await swt("resume", "hello/hello-game-001", "--game", HELLO);
		expect([resumed.code, resumed.out.at(-1)]).toEqual([0, "run: hello/hello-game-002"]);
		const straight = events("hello/hello-game-001");
		const lines = events("hello/hello-game-002");
		const prefix = straight.findLastIndex((event) => event.tick < 2) + 1;
		expect(lines[prefix]).toMatchObject({ seq: prefix + 1, tick: 2, source: RUN_RECORDS.id, type: "run_resumed", actor: "script", audience: ["human"], payload: { from: "hello-game-001", tick: 2 } });
		expect(lines.length).toBe(straight.length + 1);
		expect(straight.length - prefix).toBeGreaterThan(20);
		expect(withoutMarker(lines)).toEqual(straight);
		const written = manifest("hello/hello-game-002");
		expect(written).toMatchObject({ run: { id: "hello-game-002", purpose: "smoke" }, seed: 1, resumedFrom: {} });
		expect(written.resumedFrom?.snapshotHash).toMatch(/^[0-9a-f]{64}$/);
		expect(lines[prefix]?.payload).toMatchObject({ snapshotHash: written.resumedFrom?.snapshotHash });
		expect(await swt("log", "verify", "hello/hello-game-002", "--previous", "hello/hello-game-001")).toMatchObject({ code: 0, out: [expect.stringMatching(new RegExp(`${OK.source}, continuity holds$`))] });
		expect(await swt("log", "verify", "hello/hello-game-002")).toMatchObject({ code: 0, out: [expect.stringMatching(new RegExp(`${OK.source}, continuity not checked$`))] });
		expect(await swt("log", "verify", "hello/hello-game-001")).toMatchObject({ code: 0, out: [expect.stringMatching(new RegExp(`${OK.source}$`))] });
		// Another run of the same game is not the run that was resumed.
		expect((await swt("run", HELLO, "--fake", "--out", "other", "--seed", "2")).code).toBe(0);
		expect(await swt("log", "verify", "hello/hello-game-002", "--previous", "other/hello-game-001")).toMatchObject({ code: 1, issue: "SWT-L007" });
	});

	it("stops at --ticks with the run open, and resumes that run again from its own snapshot", async () => {
		const first = await swt("resume", "hello/hello-game-001", "--game", HELLO, "--ticks", "4", "--snapshot-at", "4", "--out", "steps");
		expect([first.code, first.out[1]]).toEqual([3, "hello-game seed 1: stopped after 4 ticks (open)"]);
		expect((await swt("resume", "steps/hello-game-001", "--game", HELLO)).code).toBe(0);
		const lines = events("steps/hello-game-002");
		expect(lines.filter((event) => event.type === "run_resumed").map((event) => event.payload)).toMatchObject([{ from: "hello-game-001", tick: 2 }, { from: "hello-game-001", tick: 4 }]);
		expect(withoutMarker(withoutMarker(lines))).toEqual(events("hello/hello-game-001"));
		expect((await swt("log", "verify", "steps/hello-game-002", "--previous", "steps/hello-game-001")).code).toBe(0);
	});

	it("gives a resumed run the hand file of the straight run and applies only the lines after the snapshot", async () => {
		const lines = [{ at: 1, tool: "pause" }, { at: 1, command: "snapshot" }, { at: 1, tool: "resume" }, { at: 3, tool: "pause" }, { at: 3, tool: "resume" }];
		const file = hand("play.jsonl", lines);
		expect((await swt("run", GAME, "--fake", "--out", "hand", "--hand", file, "--snapshot-at", "3")).code).toBe(0);
		const straight = events("hand/hand-001");
		// From the `snapshot` line (the run is paused in it), and from `--snapshot-at 3` (both lines of tick 3 are in its prefix).
		for (const [snapshot, calls] of [["t1.json", 3], ["t3.json", 0]] as const) {
			const resumed = await swt("resume", "hand/hand-001", "--game", GAME, "--hand", file, "--snapshot", `hand/hand-001/snapshots/${snapshot}`, "--out", snapshot);
			expect(resumed.code).toBe(0);
			const log = events(`${snapshot}/hand-001`);
			const marker = log.findIndex((event) => event.type === "run_resumed");
			expect(log.slice(marker).filter((event) => event.actor === "human" && event.type === "tool_called")).toHaveLength(calls);
			expect(withoutMarker(log)).toEqual(straight);
			expect(existsSync(join(cwd, snapshot, "hand-001/snapshots"))).toBe(false);
		}
		// A run that stopped paused (exit 3) goes on with a hand that resumes it.
		expect((await swt("run", GAME, "--fake", "--out", "paused", "--hand", hand("pause.jsonl", lines.slice(0, 1)))).code).toBe(3);
		expect((await swt("resume", "paused/hand-001", "--game", GAME)).issue).toBe("SWT-X009");
		expect((await swt("resume", "paused/hand-001", "--game", GAME, "--hand", file)).code).toBe(0);
		expect(withoutMarker(events("paused/hand-003"))).toEqual(straight);
	});

	it("refuses a live folder without --budget, a snapshot or a game file of another game, a folder without a snapshot, and writes no folder", async () => {
		const source = scriptedSource({ "resident:A01": [say(), say(), say(), say()], "resident:A02": [act({ name: "guess", args: { value: 5 } }), say()], "director:herald": [say('{"line":"a guess"}')] });
		const io = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: () => undefined, err: () => undefined };
		const live = await runLive({ file: GAME, seed: undefined, out: "live", json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env: { ARENA_ANTHROPIC_API_KEY: `sk-${"k".repeat(37)}` }, source, snapshotAt: [2] }, io);
		expect([live.code, readdirSync(join(cwd, "live/hand-001/snapshots"))]).toEqual([0, ["t2.json"]]);
		const refused = await swt("resume", "live/hand-001", "--game", GAME, "--out", "none");
		expect([refused.code, refused.issue, refused.err]).toEqual([1, "SWT-X010", expect.stringContaining("was given no `--budget`")]);
		const codes = async (...args: readonly string[]): Promise<readonly [number, string | undefined]> => {
			const { code, issue } = await swt("resume", ...args, "--out", "none");
			return [code, issue];
		};
		expect(await codes("hello/hello-game-001", "--game", HELLO, "--snapshot", "hand/hand-001/snapshots/t1.json")).toEqual([1, "SWT-L008"]);
		expect(await codes("hello/hello-game-001", "--game", GAME)).toEqual([1, "SWT-L008"]);
		expect(await codes("hello/hello-game-001", "--game", HELLO, "--snapshot", "none.json")).toEqual([1, "SWT-L008"]);
		expect(await codes("other/hello-game-001", "--game", HELLO)).toEqual([1, "SWT-X008"]);
		expect(await codes("hello/hello-game-001")).toEqual([1, "SWT-C003"]);
		expect(await codes("hello/hello-game-001", "--game", HELLO, "--ticks", "x")).toEqual([1, "SWT-C003"]);
		// P490 (A111, M5-101): `--ticks` counts the finished ticks of the whole run, so one not above the snapshot's plays no tick.
		expect(await codes("hello/hello-game-001", "--game", HELLO, "--ticks", "2")).toEqual([1, "SWT-C034"]);
		expect(await codes("hello/hello-game-001", "--game", HELLO, "--ticks", "0")).toEqual([1, "SWT-C034"]);
		expect((await swt("resume", "hello/hello-game-001", "--game", HELLO, "--ticks", "1", "--out", "none")).err).toContain("`--ticks 1` is not above the 2 finished ticks of the snapshot");
		expect(await codes("hello/hello-game-001", "--game", HELLO, "--hand", "none.jsonl")).toEqual([1, "SWT-X008"]);
		expect(await codes("hello/no-such-run", "--game", HELLO)).toEqual([1, "SWT-L001"]);
		expect(existsSync(join(cwd, "none"))).toBe(false);
	});
});
