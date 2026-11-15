// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The `puzzles` mechanic, the deal: the fragment cases of the old `test/mechanics/puzzles/puzzles.test.ts`. The
 * golden logs of the old test are the oracle files here; the cases of factors and of the door are not ported
 * (additive levels and `holdAfter` are not in the cut).
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { defineGame, defineHead, defineMechanic, type CtxOf } from "@swarmtales/sdk";
import { testKernel } from "@swarmtales/testkit";
import { assembleAll, puzzles, TeamPlanner, validatePuzzle, type Streams } from "../src/index.ts";
import { ALL_LEVELS, city, LEVELS, oracleEvents, prompts, written } from "./support.ts";

// The labelled streams of a run of `seed`, taken from the context of a test mechanic.
function streamsOf(seed: number): Streams {
	const head = defineHead({ id: "probe", package: "@test/probe", summary: "Test: hands out the run's streams." });
	let streams: Streams | undefined;
	const probe = defineMechanic(head, { hooks: { runStarted: (ctx: CtxOf<typeof head>) => void (streams = ctx.rng) } });
	testKernel(defineGame({ id: "probe-test", seed, residents: 6, mechanics: [probe()], end: { ticks: 1 } }));
	if (streams === undefined) throw new RangeError("the run did not start");
	return streams;
}

const Slice = Type.Object({ data: Type.Object({ levels: Type.Array(Type.Object({ puzzles: Type.Array(Type.Object({ password: Type.String(), fragments: Type.Array(Type.String()), overlap: Type.Integer() })) })) }) });
const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const dealt = (seed: number, options = {}) => written(testKernel(city(seed, options), { prompts }).kernel.log.all(), "puzzles").map(([, payload]) => payload);

describe("first test: the teams do not depend on the levels the options leave out", () => {
	it.each([7, 11])("seed %i: levels 1 to 7 get the same teams with seven levels as with all ten", (seed) => {
		const streams = streamsOf(seed);
		const cut = new TeamPlanner(LEVELS, RESIDENTS, streams);
		const whole = new TeamPlanner(ALL_LEVELS, RESIDENTS, streams);
		expect(LEVELS.map((level) => level.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(ALL_LEVELS).toHaveLength(10);
		for (const { number } of LEVELS) expect(cut.teamsOf(number)).toEqual(whole.teamsOf(number));
		expect(cut.teamsOf(4).map((team) => team.members.length)).toEqual([3, 3]);
		expect(() => cut.teamsOf(8)).toThrow("Unknown level 8");
	});
});

describe("the deal", () => {
	it.each([
		["cityofkeys-act1-s7", 7],
		["cityofkeys-act1-s11", 11],
		["cityofkeys-burn-s7", 7],
	] as const)("deals %s as the old platform did, with levels 8 to 10 left out of the options", (file, seed) => {
		const expected = oracleEvents(file, "puzzles", "fragments_dealt");
		expect(expected).toHaveLength(7);
		expect(dealt(seed)).toEqual(expected);
		expect(JSON.stringify(dealt(seed))).toBe(JSON.stringify(expected));
	});

	it("answers its facts from the deal, and deals only from startLevel to lastLevel", () => {
		expect(testKernel(city(7), { prompts }).fact("puzzles.dealt")).toEqual([1, 2, 3, 4, 5, 6, 7]);
		const cut = testKernel(city(7, { startLevel: 2, lastLevel: 3 }), { prompts });
		expect(cut.fact("puzzles.dealt")).toEqual([2, 3]);
		expect(cut.fact("puzzles.exclusions")).toEqual([]);
		// The stream of a level is its own: level 3 is the same deal whether level 1 was dealt before it or not.
		expect(dealt(7, { startLevel: 2, lastLevel: 3 })).toEqual(dealt(7).slice(1, 3));
	});

	it("runs alone, without exile and channels, and every dealt puzzle is valid", () => {
		const alone = testKernel(defineGame({ id: "alone", seed: 11, residents: 6, mechanics: [puzzles({ levels: LEVELS })], end: { ticks: 1 } }));
		const slice = Value.Parse(Slice, JSON.parse(JSON.stringify(alone.kernel.snapshot().plugins.puzzles)));
		const all = slice.data.levels.flatMap((level) => level.puzzles);
		expect(all).toHaveLength(6 + 3 + 3 + 2 + 2 + 2 + 2);
		for (const puzzle of all) {
			expect(validatePuzzle(puzzle)).toEqual([]);
			expect(assembleAll(puzzle.fragments, puzzle.overlap)).toEqual([puzzle.password]);
		}
		expect(alone.fact("puzzles.lacking")).toHaveLength(0);
	});

	it("refuses a layout the residents do not divide into when the run starts", () => {
		const odd = LEVELS.slice(0, 1).map((level) => ({ ...level, team: { kind: "random" as const, size: 4 } }));
		expect(() => testKernel(city(7, { levels: odd }), { prompts })).toThrow(/6 agents cannot be split into teams of 4/);
	});
});

describe("the slice", () => {
	it("survives a snapshot: the resumed run holds the same deal and deals nothing again", () => {
		const first = testKernel(city(7), { prompts });
		const snapshot: unknown = JSON.parse(JSON.stringify(first.kernel.snapshot()));
		const log: readonly unknown[] = first.kernel.log.all().map((event): unknown => JSON.parse(JSON.stringify(event)));
		const resumed = testKernel(city(7), { prompts, resume: { snapshot, log } });
		expect(resumed.kernel.snapshot()).toEqual(snapshot);
		expect(resumed.fact("puzzles.dealt")).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(written(resumed.kernel.log.all(), "puzzles")).toHaveLength(7);
	});
});
