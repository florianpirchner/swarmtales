// SPDX-License-Identifier: Apache-2.0
/**
 * The standing checks of Lanterns, in process (M4 specification 4.3): the log replays equal, and a run resumed from
 * every tick boundary writes the log of the straight run. The scripted runs get both checks, the fake runs the
 * replay: their resume from every boundary is proven through the command line over the games list
 * (`apps/cli/test/standing.test.ts`).
 */
import { checkReplay, checkResumeEveryBoundary, fakeDriver, type StandingDrivers } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { player, rosterGame } from "./support.ts";

const fake = (seed: number): StandingDrivers => (kernel) => ({ resident: fakeDriver(kernel, seed) });
/** The scripted match of the carried test and the fake driver on the game file, with the seeds of the games list, and the scripted match without a brain. */
const RUNS = [
	...[73, 107].flatMap((seed) => [
		{ name: `scripted, seed ${String(seed)}`, game: rosterGame(), drivers: (): { resident: typeof player } => ({ resident: player }), options: { seed } },
		{ name: `fake, seed ${String(seed)}`, game, drivers: fake(seed), options: { seed } },
	]),
	{ name: "scripted, no brain, seed 67", game: rosterGame({ brain: false }), drivers: (): { resident: typeof player } => ({ resident: player }), options: { seed: 67 } },
];

/**
 * Open, found by this check: resumed from any boundary, the run writes the straight run's events with the keys of
 * some payload objects in another order. `clue-grid` loads its snapshot with `structuredClone`, and a snapshot file
 * sorts the keys, so the grid's cards (`{ by, owner, revealed, word }`), the clue records and the game results come
 * back sorted, and the events written from them later (`clue_closed`, `clue_game_ended`, `clue_match_ended`) carry
 * the sorted order. The values are the same. The fix belongs to `mechanics/clue-grid` (a load that rebuilds the
 * state in the order of its schema); this test turns red when it lands, and then expects no problem.
 */
function keyOrderOnly(problem: string): boolean {
	const [, left = "", right = ""] = problem.split("\n").map((line) => line.trim());
	const sorted = (_key: string, inner: unknown): unknown => (typeof inner === "object" && inner !== null && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : 1))) : inner);
	const canonical = (line: string): string => JSON.stringify(JSON.parse(line), sorted);
	return left !== right && canonical(left) === canonical(right);
}

describe("Lanterns: the standing checks", () => {
	it.each(RUNS)("$name: the log replays equal", async ({ game, drivers, options }) => {
		expect(await checkReplay(game, drivers, options)).toEqual([]);
	});

	it.each(RUNS.filter((run) => run.name.startsWith("scripted")))("$name: resumed from every boundary, the first line that differs differs only in the order of its keys (open)", async ({ game, drivers, options }) => {
		const problems = await checkResumeEveryBoundary(game, drivers, options);
		expect(problems.length).toBeGreaterThan(0);
		expect(problems.filter((problem) => !keyOrderOnly(problem))).toEqual([]);
	});
});
