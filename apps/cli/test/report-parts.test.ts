// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt report` of the runs that are not one straight finished run (A127): a paused run gets a report whose facts are
 * up to the pause (P488); a resumed run is counted from its last `run_resumed`, with its base's part apart and the
 * base named in the header (P493); a run on a dirty tree names `kernel.dirty: true` in its header (P494).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RunManifestSchema } from "@swarmtales/contracts";
import { BASE_HEADING, readRun } from "@swarmtales/lab";
import { act, say, scriptedSource } from "@swarmtales/models";
import { Parse } from "typebox/value";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runLive } from "../src/live.ts";
import { cli, eventsOf, type Printed } from "./support.ts";

const GAME = fileURLToPath(new URL("./fixtures/hand.ts", import.meta.url));
const HELLO = fileURLToPath(new URL("../../../games/hello/game.ts", import.meta.url));
const KEY = { ARENA_ANTHROPIC_API_KEY: `sk-${"k".repeat(37)}` };

let cwd = "";
let swt: (...args: readonly string[]) => Promise<Printed> = () => Promise.reject(new Error("before all"));
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-report-parts-"));
	swt = cli(cwd);
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

const reportOf = (run: string): string => readFileSync(join(cwd, run, "REPORT.md"), "utf8");
// The value of a key in the first facts table after `heading`.
function valueIn(text: string, heading: string, key: string): string | undefined {
	const part = text.slice(text.indexOf(`${heading}\n`));
	return new RegExp(`^\\| \`${key.replaceAll(".", "\\.")}\` \\| [^|]* \\| [^|]* \\| ([^|]*) \\|$`, "m").exec(part)?.[1];
}
const KERNEL_COUNTS = ["run.ticks", "run.activations", "run.toolCalls"] as const;

describe("swt report of a paused, a resumed and a dirty run", () => {
	it("writes the report of a scripted paused run, its facts marked up to the pause (P488)", async () => {
		writeFileSync(join(cwd, "pause.jsonl"), `${JSON.stringify({ at: 1, tool: "pause" })}\n`);
		expect((await swt("run", GAME, "--fake", "--out", "paused", "--hand", "pause.jsonl")).code).toBe(3);
		expect(await swt("report", "paused/hand-001", "--game", GAME)).toMatchObject({ code: 0, out: ["report: paused/hand-001/REPORT.md"] });
		const text = reportOf("paused/hand-001");
		const ticks = eventsOf(join(cwd, "paused/hand-001")).filter((event) => event.source === "kernel" && event.type === "tick_started").length;
		expect(ticks).toBe(1);
		expect(text).toContain("\n- Paused: the log ends at a signed head without `run_ended`; the facts are up to the pause\n");
		expect(text).toContain("\n## Result\n\nThe run is paused after tick 1: the facts are up to the pause.\n");
		expect([valueIn(text, "## Facts (up to the pause)", "run.ticks"), text.includes("\n## Facts\n"), text.includes(BASE_HEADING)]).toEqual(["1", false, false]);
		// The lab still refuses it by default: an experiment reads finished runs only.
		expect(() => readRun(join(cwd, "paused/hand-001"), {})).toThrow(/SWT-E006: .*unfinished/);
	});

	it("counts a resumed run from its last run_resumed, with the base's part apart and named in the header (P493)", async () => {
		expect((await swt("run", HELLO, "--fake", "--out", "hello", "--snapshot-at", "2")).code).toBe(0);
		expect((await swt("resume", "hello/hello-game-001", "--game", HELLO)).code).toBe(0);
		expect((await swt("report", "hello/hello-game-001", "--game", HELLO)).code).toBe(0);
		expect((await swt("report", "hello/hello-game-002", "--game", HELLO)).code).toBe(0);
		const [straight, resumed] = [reportOf("hello/hello-game-001"), reportOf("hello/hello-game-002")];
		const marker = eventsOf(join(cwd, "hello/hello-game-002")).find((event) => event.type === "run_resumed")?.payload;
		expect(marker).toMatchObject({ from: "hello-game-001", tick: 2 });
		const hash = Parse(RunManifestSchema, JSON.parse(readFileSync(join(cwd, "hello/hello-game-002/manifest.json"), "utf8"))).resumedFrom?.snapshotHash ?? "";
		expect([hash, marker]).toEqual([expect.stringMatching(/^[0-9a-f]{64}$/), expect.objectContaining({ snapshotHash: hash })]);
		expect(resumed).toContain(`\n- Resumed from run \`hello-game-001\` after tick 2, snapshot \`${hash}\`: the facts count from the last \`run_resumed\`, the base's part stands apart\n`);
		expect(resumed).toContain(`\n${BASE_HEADING}\n\nThe lines of the log before the last \`run_resumed\`: run \`hello-game-001\` up to tick 2. None of them is counted above.\n`);
		expect([straight.includes(BASE_HEADING), straight.includes("- Resumed from")]).toEqual([false, false]);
		expect(valueIn(resumed, BASE_HEADING, "run.ticks")).toBe("2");
		// The resume's part and the base's part are the straight run, count for count.
		for (const key of KERNEL_COUNTS) {
			const [own, base, whole] = [valueIn(resumed, "## Facts", key), valueIn(resumed, BASE_HEADING, key), valueIn(straight, "## Facts", key)];
			expect([key, Number(own) + Number(base)]).toEqual([key, Number(whole)]);
			expect(Number(own)).toBeLessThan(Number(whole));
		}
		// A resume of a resumed run counts from the last marker only.
		expect((await swt("resume", "hello/hello-game-001", "--game", HELLO, "--ticks", "4", "--snapshot-at", "4", "--out", "steps")).code).toBe(3);
		expect((await swt("resume", "steps/hello-game-001", "--game", HELLO)).code).toBe(0);
		expect((await swt("report", "steps/hello-game-002", "--game", HELLO)).code).toBe(0);
		const twice = reportOf("steps/hello-game-002");
		expect([valueIn(twice, BASE_HEADING, "run.ticks"), Number(valueIn(twice, "## Facts", "run.ticks")) + 4]).toEqual(["4", Number(valueIn(straight, "## Facts", "run.ticks"))]);
		// The resume stopped at `--ticks` is paused, and its base's part stands apart too.
		expect((await swt("report", "steps/hello-game-001", "--game", HELLO)).code).toBe(0);
		const stopped = reportOf("steps/hello-game-001");
		expect([valueIn(stopped, "## Facts (up to the pause)", "run.ticks"), valueIn(stopped, BASE_HEADING, "run.ticks")]).toEqual(["2", "2"]);
	});

	it("names kernel.dirty: true in the header of a run on a dirty tree, and nothing of the kind for a clean one (P494)", async () => {
		const io = { cwd, now: () => new Date("2026-11-14T12:00:00.000Z"), out: () => undefined, err: () => undefined };
		const play = async (out: string, dirty: boolean): Promise<number> => {
			const source = scriptedSource({ "resident:A01": [say(), say(), say(), say()], "resident:A02": [act({ name: "guess", args: { value: 5 } }), say()], "director:herald": [say('{"line":"a guess"}')] });
			const tree = { commit: "c0ffee".padEnd(40, "0"), dirty };
			return (await runLive({ file: GAME, seed: undefined, out, json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env: KEY, source, tree }, io)).code;
		};
		expect([await play("dirty", true), await play("clean", false)]).toEqual([0, 0]);
		expect((await swt("report", "dirty/hand-001", "--game", GAME)).code).toBe(0);
		expect((await swt("report", "clean/hand-001", "--game", GAME)).code).toBe(0);
		const line = "\n- Dirty tree: `kernel.dirty: true`, the source tree had changes that were not committed, so the commit does not hold the whole code of the run\n";
		expect([reportOf("dirty/hand-001").includes(line), reportOf("clean/hand-001").includes("Dirty tree")]).toEqual([true, false]);
		expect(reportOf("dirty/hand-001")).toContain(`, commit \`${"c0ffee".padEnd(40, "0")}\`; scheduler`);
	});
});
