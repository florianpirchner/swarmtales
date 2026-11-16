// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The standing checks of every game of the games list (`games/index.ts`), through the command line (M4
 * specification 4.3), for each fake seed of the game:
 *
 * - the fake run: `swt run --fake` ends without the reason `error`, prints no warning and holds an accepted call;
 * - resume: the same run with `--snapshot-at` for its boundaries (every one of a run of at most 12 ticks, as the
 *   city slice is; of a longer run the first, the middle and the last, decision A97: a resume through the command line
 *   verifies two hash chains, and the Whispers run of 45 ticks took about 290 s from eleven) writes the same log;
 *   `swt resume` from each snapshot writes a log that is the straight log once the marker `run_resumed` is taken out
 *   and the envelope fields behind it are moved back (decision A34: no payload is touched). The other boundaries are
 *   the job of the in-process `checkResumeEveryBoundary` of `@swarmtales/testkit`, run by each game's
 *   `games/<name>/test/standing.test.ts` (every boundary of a run of at most 30 ticks, `sampleBoundaries` of a longer
 *   one); nine men's morris runs it on its scripted runs, a fake match of one game and, at nine sampled boundaries, the
 *   fake run of the game file (J256);
 * - continuity and replay: `swt replay` of the straight folder is equal; for the first, the middle and the last
 *   boundary `swt log verify --previous` holds and `swt replay` of the resumed folder is equal (the other resumed
 *   folders of a short run hold the same lines with the marker at another place; checking each would double the run
 *   time).
 *
 * The checks run in `PARTS` test files (`standing.test.ts`, `standing-b.test.ts`, `standing-c.test.ts`), so the
 * resumes of one long game run in several workers (M4-71: nine men's morris alone took 150 s in one file). The fake
 * run and the straight run with the snapshots of all the boundaries are played once per test session and shared by
 * the parts (decision A99, `standing-cache.ts`); each part checks the fake run's end and the straight log as its own,
 * and starts with the runs whose index modulo `PARTS` is its own (the last of the list, the longest, first), so the
 * parts play different games at once. The rest
 * is dealt in units (a short run whole; of a long run each of its three boundaries, and the replay of the straight
 * folder), and the first part that comes to a unit takes it (`claim`), so a part that starts late (Vitest runs fewer
 * workers than parts) finds less to do. Together the parts check every boundary that one file checked, each once.
 *
 * A game joins by its line in the list; the gate `scripts/gates/games-list.test.ts` keeps the list whole.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { claim, folderOf, partDone, releaseClaims, sharedRuns, type SharedRuns } from "./standing-cache.ts";
import { cli, eventsOf, withoutMarker, type Printed, type StoredEnvelope } from "./support.ts";

/** The number of test files the checks are dealt over. */
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
/** The boundaries the command line resumes a run of `ticks` ticks from: every one up to `EVERY` ticks, else the first, the middle and the last. */
const boundariesOf = (ticks: number): readonly number[] => (ticks <= EVERY ? Array.from({ length: Math.max(ticks, 0) }, (_, tick) => tick) : [0, Math.floor(ticks / 2), ticks - 1]);

/** The log of the fake run, checked: the run ended without an error or a warning, and holds an accepted call. */
function fakeLog(cwd: string, plain: SharedRuns["plain"]): readonly StoredEnvelope[] {
	expect([plain.code, plain.err]).toEqual([0, ""]);
	const log = eventsOf(join(cwd, plain.folder));
	expect(log.at(-1)?.type).toBe("run_ended");
	expect(Reflect.get(Object(log.at(-1)?.payload), "reason")).not.toBe("error");
	expect(log.filter((event) => event.type === "tool_result").length).toBeGreaterThan(0);
	return log;
}

/** The folder of the run with the snapshots, checked: it ended as the fake run did, with `count` snapshots and the fake run's log. */
function straightFolder(cwd: string, straight: SharedRuns["straight"], count: number, log: readonly StoredEnvelope[]): string {
	const folder = straight?.folder ?? "";
	expect([straight?.code, straight?.err, readdirSync(join(cwd, folder, "snapshots")).length]).toEqual([0, "", count]);
	expect(eventsOf(join(cwd, folder))).toEqual(log);
	return folder;
}

type Swt = (...args: readonly string[]) => Promise<Printed>;

/** A unit of the checks of one run: the boundaries to resume from, and whether the straight folder is replayed. */
interface Unit {
	readonly name: string;
	readonly boundaries: readonly number[];
	readonly replay: boolean;
}

/** The units of a run of `ticks` ticks: a short run is one unit; a long one has one per boundary, the first (the dearest) first, and the replay. */
const unitsOf = (ticks: number, all: readonly number[]): readonly Unit[] =>
	ticks <= EVERY ? [{ name: "whole", boundaries: all, replay: true }] : [...all.map((tick) => ({ name: `t${String(tick)}`, boundaries: [tick], replay: false })), { name: "replay", boundaries: [], replay: true }];

/**
 * Resumes the straight folder from `boundaries`: each resumed log is the straight log without the marker, and for the
 * first, the middle and the last of `all` the resumed folder verifies against the straight one and replays.
 */
async function checkResumes(swt: Swt, input: { cwd: string; file: string; folder: string; boundaries: readonly number[]; all: readonly number[]; log: readonly StoredEnvelope[] }): Promise<void> {
	const { cwd, file, folder, all, log } = input;
	const differing: number[] = [];
	const whole = [all[0], all[Math.floor(all.length / 2)], all.at(-1)];
	for (const tick of input.boundaries) {
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
}

/**
 * Defines the standing checks of one part: the shared runs of every run of the list, and the units it comes to first.
 *
 * @param part - The part, from 0 to `PARTS - 1`.
 */
export function describeStandingPart(part: number): void {
	let cwd = "";
	let swt: Swt = () => Promise.reject(new Error("before all"));
	beforeAll(() => {
		cwd = mkdtempSync(join(tmpdir(), "swt-standing-"));
		swt = cli(cwd);
		releaseClaims(part);
	});
	afterAll(() => {
		rmSync(cwd, { recursive: true, force: true });
		partDone(part, PARTS);
	});
	// The later games of the list are the longer ones: each part plays its own from the end, then comes to the others'.
	const last = [...RUNS].reverse();
	const first = [...last.filter((_, index) => (RUNS.length - 1 - index) % PARTS === part), ...last.filter((_, index) => (RUNS.length - 1 - index) % PARTS !== part)];

	describe(`the standing checks through the command line, part ${String(part + 1)} of ${String(PARTS)}`, () => {
		it.each(first)("$name, fake seed $seed: the fake run holds, and resumed from its boundaries it is the straight run, verifies and replays", async ({ name, seed, file }) => {
			const out = `${name}-${String(seed)}`;
			const { plain, straight, entry } = await sharedRuns({ file, seed, boundariesOf, cwd, out });
			const log = fakeLog(cwd, plain);
			const ticks = log.filter((event) => event.type === "tick_ended").length;
			const all = boundariesOf(ticks);
			if (all.length === 0) return;
			const folder = straightFolder(cwd, straight, all.length, log);
			for (const unit of unitsOf(ticks, all)) {
				if (!claim(entry, unit.name, part)) continue;
				if (unit.replay) expect((await swt("replay", folder, "--game", file)).code).toBe(0);
				await checkResumes(swt, { cwd, file, folder, boundaries: unit.boundaries, all, log });
			}
		}, 600_000);
	});
}
