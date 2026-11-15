// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The two standing checks in process: they pass on a game that holds, and each names the fault of one that does not. */
import type { ActorDriver } from "@swarmtales/contracts";
import { defineGame } from "@swarmtales/sdk";
import { describe, expect, it } from "vitest";
import { fakeDriver, idleDriver, scriptedDriver } from "../src/drivers.ts";
import { guessNumber } from "../src/fixtures/guess-number.ts";
import { checkReplay, checkResumeEveryBoundary, sampleBoundaries, type StandingDrivers } from "../src/standing.ts";

const game = defineGame({ id: "guess", residents: 2, seed: 7, mechanics: [guessNumber({ max: 20 })], end: { ticks: 6 } });
/** A driver that decides from its activation alone. */
const byTick: StandingDrivers = () => ({ resident: scriptedDriver((activation) => [{ tool: "guess", params: { value: activation.tick + 1 } }]) });
/** The planted fault: a driver that counts its own activations, so a fresh one after a resume starts at 1 again. */
const counting: StandingDrivers = () => {
	let made = 0;
	const driver: ActorDriver = scriptedDriver(() => [{ tool: "guess", params: { value: (made += 1) } }]);
	return { resident: driver };
};

describe("sampleBoundaries", () => {
	it("takes every boundary of a short run, and of a long one the first three, the last three and every tenth", () => {
		expect(sampleBoundaries(4)).toEqual([0, 1, 2, 3]);
		expect(sampleBoundaries(30)).toHaveLength(30);
		expect(sampleBoundaries(45)).toEqual([0, 1, 2, 10, 20, 30, 40, 42, 43, 44]);
		expect(sampleBoundaries(13, 12)).toEqual([0, 1, 2, 10, 11, 12]);
		expect(sampleBoundaries(0)).toEqual([]);
	});
});

describe("checkReplay", () => {
	it("passes for a scripted run and for a fake run", async () => {
		expect(await checkReplay(game, byTick)).toEqual([]);
		expect(await checkReplay(game, (kernel) => ({ resident: fakeDriver(kernel, 3) }), { seed: 3 })).toEqual([]);
	});

	it("does not pass on a run without an accepted call", async () => {
		expect(await checkReplay(game, () => ({ resident: idleDriver }))).toEqual(["replay: the run holds no accepted call, so its replay proves nothing"]);
	});
});

describe("checkResumeEveryBoundary", () => {
	it("passes for a driver that decides from its activation, from every boundary and from chosen ones", async () => {
		expect(await checkResumeEveryBoundary(game, byTick)).toEqual([]);
		expect(await checkResumeEveryBoundary(game, (kernel) => ({ resident: fakeDriver(kernel, 3) }), { seed: 3, boundaries: [0, 5] })).toEqual([]);
	});

	it("names every boundary from which the resumed run differs, and a boundary the run did not have", async () => {
		const problems = await checkResumeEveryBoundary(game, counting);
		// Boundary 0 resumes before the first activation, so the fresh count is the straight one; every later one differs.
		expect(problems.map((problem) => problem.split(":")[0])).toEqual([1, 2, 3, 4, 5].map((tick) => `resume from boundary ${String(tick)}`));
		expect(problems[0]).toMatch(/^resume from boundary 1: line \d+ differs:\n {2}\{.*"value":3.*\n {2}\{.*"value":1/);
		expect(await checkResumeEveryBoundary(game, byTick, { boundaries: [2, 6] })).toEqual(["resume from boundary 6: the run of 6 ticks has no such boundary"]);
	});
});
