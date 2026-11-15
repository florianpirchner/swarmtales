// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of every game of the games list (`games/index.ts`), through the command line (M4
 * specification 4.3), for each fake seed of the game:
 *
 * - the fake run: `swt run --fake` ends without the reason `error`, prints no warning and holds an accepted call;
 * - resume: the same run with `--snapshot-at` for its boundaries (every one of a run of at most 12 ticks, as the
 *   city slice is; of a longer run the first three, the last three and every tenth, since a resume through the
 *   command line verifies two hash chains: every boundary of such a game is the job of its in-process check)
 *   writes the same log; `swt resume` from each snapshot writes a log that is the straight log once the marker
 *   `run_resumed` is taken out and the envelope fields behind it are moved back (decision A34: no payload is
 *   touched);
 * - continuity and replay: `swt replay` of the straight folder is equal; for the first, the middle and the last
 *   boundary `swt log verify --previous` holds and `swt replay` of the resumed folder is equal (the other resumed
 *   folders hold the same lines with the marker at another place; checking each would double the run time).
 *
 * A game joins by its line in the list; the gate `scripts/gates/games-list.test.ts` keeps the list whole.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sampleBoundaries } from "@swarmtales/testkit";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cli, eventsOf, withoutMarker, type Printed } from "./support.ts";

/** Up to this many ticks the command line resumes from every boundary. */
const EVERY = 12;
const HOLDS = /^ok, \d+ lines, head [0-9a-f]{64}, continuity holds$/;
/**
 * The games list, read as text: `games/` is no package, and a relative import never leaves `apps/cli` (the layer
 * check). One line of the list is one game; the first test fails when a line has another form than `LINE` reads.
 */
const LIST = readFileSync(new URL("../../../games/index.ts", import.meta.url), "utf8");
const LINE = /\{ name: "([^"]+)", file: "([^"]+)", seeds: \[[\d, ]*\], fakeSeeds: \[([\d, ]+)\] \}/g;
const RUNS = [...LIST.matchAll(LINE)].flatMap(([, name = "", file = "", seeds = ""]) => seeds.split(",").map((seed) => ({ name, seed: Number(seed), file: fileURLToPath(new URL(`../../../${file}`, import.meta.url)) })));
/**
 * Open: game to the boundaries from which its resumed log differs today. Tic-tac-toe teams and nine men's morris
 * at boundary 0: both teams have a retro window open, `strategy-brain` saves its windows as an object, the snapshot file sorts the
 * keys, and the two `resetCap` calls of the next tick swap. The fix belongs to `mechanics/strategy-brain`; the
 * entry goes with it (the test fails when the boundary resumes equal).
 */
const OPEN: Readonly<Record<string, readonly number[]>> = { "tictactoe-teams": [0], "morris-teams": [0] };
/** The run folder a command printed (`run: <folder>`), relative to the working directory. */
const folderOf = (printed: Printed): string => (printed.out.at(-1) ?? "").replace(/^run: /, "");

let cwd = "";
let swt: (...args: readonly string[]) => Promise<Printed> = () => Promise.reject(new Error("before all"));
beforeAll(() => {
	cwd = mkdtempSync(join(tmpdir(), "swt-standing-"));
	swt = cli(cwd);
});
afterAll(() => {
	rmSync(cwd, { recursive: true, force: true });
});

describe("the standing checks through the command line", () => {
	it("every line of the games list is read, and the list holds a game", () => {
		expect(RUNS.length).toBeGreaterThan(0);
		expect(new Set(RUNS.map((run) => run.name)).size).toBe(LIST.match(/\bname: "/g)?.length);
	});

	it.each(RUNS)("$name, fake seed $seed: the fake run holds, and resumed from its boundaries it is the straight run, verifies and replays", async ({ name, seed, file }) => {
		const out = `${name}-${String(seed)}`;
		const plain = await swt("run", file, "--fake", "--seed", String(seed), "--out", `${out}/plain`);
		expect([plain.code, plain.err]).toEqual([0, ""]);
		const log = eventsOf(join(cwd, folderOf(plain)));
		expect(log.at(-1)?.type).toBe("run_ended");
		expect(Reflect.get(Object(log.at(-1)?.payload), "reason")).not.toBe("error");
		expect(log.filter((event) => event.type === "tool_result").length).toBeGreaterThan(0);

		const boundaries = sampleBoundaries(log.filter((event) => event.type === "tick_ended").length, EVERY);
		const straight = await swt("run", file, "--fake", "--seed", String(seed), "--out", out, "--snapshot-at", boundaries.join(","));
		const folder = folderOf(straight);
		expect([straight.code, straight.err, readdirSync(join(cwd, folder, "snapshots")).length]).toEqual([0, "", boundaries.length]);
		expect(eventsOf(join(cwd, folder))).toEqual(log);
		expect((await swt("replay", folder, "--game", file)).code).toBe(0);
		const differing: number[] = [];
		const equal = boundaries.filter((tick) => !(OPEN[name] ?? []).includes(tick));
		const whole = [equal[0], equal[Math.floor(equal.length / 2)], equal.at(-1)];
		for (const tick of boundaries) {
			const resumed = await swt("resume", folder, "--game", file, "--snapshot", `${folder}/snapshots/t${String(tick)}.json`);
			expect([tick, resumed.code, resumed.err]).toEqual([tick, 0, ""]);
			const events = eventsOf(join(cwd, folderOf(resumed)));
			expect(events.filter((event) => event.type === "run_resumed").map((event) => event.tick)).toEqual([tick]);
			if (JSON.stringify(withoutMarker(events)) !== JSON.stringify(log)) differing.push(tick);
			if (!whole.includes(tick)) continue;
			expect((await swt("log", "verify", folderOf(resumed), "--previous", folder)).out, `boundary ${String(tick)}`).toEqual([expect.stringMatching(HOLDS)]);
			expect((await swt("replay", folderOf(resumed), "--game", file)).code, `boundary ${String(tick)}`).toBe(0);
		}
		expect(differing).toEqual(OPEN[name] ?? []);
		// Nine men's morris takes about 160 s here: 21 boundaries of a fake run of 156 ticks and 18000 lines.
	}, 300_000);
});
