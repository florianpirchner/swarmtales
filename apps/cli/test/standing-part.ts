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
 * The boundaries of a long run are dealt over `PARTS` test files (`standing.test.ts`, `standing-b.test.ts`,
 * `standing-c.test.ts`), so the resumes of one long game run in several workers (M4-71: nine men's morris alone took
 * 150 s in one file). Each part plays the run, and the straight run with the snapshots of its own boundaries. One
 * part owns a run, by the run's place in the list: it replays the straight folder, and checks a short run whole.
 * Together the parts check every boundary that one file checked.
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

/** The number of test files the boundaries of a run are dealt over. */
export const PARTS = 3;
/** Up to this many ticks the command line resumes from every boundary. */
const EVERY = 12;
const HOLDS = /^ok, \d+ lines, head [0-9a-f]{64}, continuity holds$/;
/**
 * The games list, read as text: `games/` is no package, and a relative import never leaves `apps/cli` (the layer
 * check). One line of the list is one game; the list test fails when a line has another form than `LINE` reads.
 */
export const LIST = readFileSync(new URL("../../../games/index.ts", import.meta.url), "utf8");
const LINE = /\{ name: "([^"]+)", file: "([^"]+)", seeds: \[[\d, ]*\], fakeSeeds: \[([\d, ]+)\] \}/g;
/** The runs of the list: one per game and fake seed. */
export const RUNS = [...LIST.matchAll(LINE)].flatMap(([, name = "", file = "", seeds = ""]) => seeds.split(",").map((seed) => ({ name, seed: Number(seed), file: fileURLToPath(new URL(`../../../${file}`, import.meta.url)) })));
/** The run folder a command printed (`run: <folder>`), relative to the working directory. */
const folderOf = (printed: Printed): string => (printed.out.at(-1) ?? "").replace(/^run: /, "");

/**
 * Defines the standing checks of one part: the boundaries whose index in the run's list is `part` modulo `PARTS`.
 *
 * @param part - The part, from 0 to `PARTS - 1`.
 */
export function describeStandingPart(part: number): void {
	let cwd = "";
	let swt: (...args: readonly string[]) => Promise<Printed> = () => Promise.reject(new Error("before all"));
	beforeAll(() => {
		cwd = mkdtempSync(join(tmpdir(), "swt-standing-"));
		swt = cli(cwd);
	});
	afterAll(() => {
		rmSync(cwd, { recursive: true, force: true });
	});

	describe(`the standing checks through the command line, part ${String(part + 1)} of ${String(PARTS)}`, () => {
		it.each(RUNS.map((run, index) => ({ ...run, owner: index % PARTS === part })))("$name, fake seed $seed: the fake run holds, and resumed from its boundaries it is the straight run, verifies and replays", async ({ name, seed, file, owner }) => {
			const out = `${name}-${String(seed)}`;
			const plain = await swt("run", file, "--fake", "--seed", String(seed), "--out", `${out}/plain`);
			expect([plain.code, plain.err]).toEqual([0, ""]);
			const log = eventsOf(join(cwd, folderOf(plain)));
			expect(log.at(-1)?.type).toBe("run_ended");
			expect(Reflect.get(Object(log.at(-1)?.payload), "reason")).not.toBe("error");
			expect(log.filter((event) => event.type === "tool_result").length).toBeGreaterThan(0);

			const all = sampleBoundaries(log.filter((event) => event.type === "tick_ended").length, EVERY);
			// A short run is checked whole by its owner; the parts deal the boundaries of a long one.
			const boundaries = all.length <= EVERY ? all.filter(() => owner) : all.filter((_, index) => index % PARTS === part);
			if (boundaries.length === 0) return;
			const straight = await swt("run", file, "--fake", "--seed", String(seed), "--out", out, "--snapshot-at", boundaries.join(","));
			const folder = folderOf(straight);
			expect([straight.code, straight.err, readdirSync(join(cwd, folder, "snapshots")).length]).toEqual([0, "", boundaries.length]);
			expect(eventsOf(join(cwd, folder))).toEqual(log);
			if (owner) expect((await swt("replay", folder, "--game", file)).code).toBe(0);
			const differing: number[] = [];
			const whole = [all[0], all[Math.floor(all.length / 2)], all.at(-1)];
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
			expect(differing).toEqual([]);
			// Nine men's morris takes about 160 s in one file: 21 boundaries of a fake run of 156 ticks and 18000 lines.
		}, 300_000);
	});
}
