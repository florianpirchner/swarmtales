/**
 * The golden gate of the script mechanic (step 18, team S1). Each golden log is replayed on the real
 * city with the real script (golden-host.ts):
 *
 * - the director's own lines (`director_action`, `director_skipped`, `standings_published`) equal
 *   the golden's, line for line (`goldenDiff`, no sorting, no field dropped);
 * - every director window (window.ts) equals the golden's: the action lines and the posts, notices,
 *   cast and factor lines they caused, in order, and the line right before and right after them,
 *   which shows the `level_entered` order (after `level_up` and the holder notices, before the
 *   `submission`) and the minute-start order (before `round_start`). A neighbour the replay cannot
 *   write (the gamemaker's model lines between two minutes) is left out with its reason.
 */
import { describe, expect, it } from "vitest";
import { dropJustified, goldenDiff, ownedBy } from "@swarmtales/testkit";
import { GOLDEN_NAMES } from "../puzzles/harness.ts";
import { replayGolden } from "./golden-host.ts";
import { neighbour, windowsOf } from "./windows.ts";

describe.each(GOLDEN_NAMES)("the script on golden %s", (name) => {
	it("writes the director's lines and windows of the golden run", async () => {
		const run = await replayGolden(name);
		const expected = ownedBy(run.golden, ["script"]);
		expect(expected.length).toBeGreaterThan(0);
		expect(goldenDiff(expected, ownedBy(run.lines, ["script"]))).toEqual([]);

		const produced = new Set(run.lines.map((line) => String(line.type)));
		const goldenWindows = windowsOf(run.golden);
		const replayWindows = windowsOf(run.lines);
		expect(replayWindows.map((window) => window.lines)).toEqual(goldenWindows.map((window) => window.lines));
		const sides = goldenWindows.flatMap((window, index) => {
			const ours = replayWindows[index];
			return [
				{ index, side: "before", golden: neighbour(window.before, produced), replay: neighbour(ours?.before, produced) },
				{ index, side: "after", golden: neighbour(window.after, produced), replay: neighbour(ours?.after, produced) },
			];
		});
		const foreign = (side: { readonly golden: string }): boolean => side.golden.startsWith("(foreign");
		const kept = sides.some(foreign)
			? dropJustified(sides, foreign, "the gamemaker's model lines (usage, gamemaker_*) between two minutes are app lines the replay does not write").kept
			: sides;
		expect(kept.length).toBeGreaterThan(sides.length / 2);
		expect(kept.filter((side) => side.golden !== side.replay)).toEqual([]);
	}, 120_000);
});
