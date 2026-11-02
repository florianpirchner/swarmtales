import { describe, expect, it } from "vitest";
import { competitorIds } from "@swarmtales/kernel";
import { sharedPairs, TeamLayoutError, TeamPlanner } from "@swarmtales/engine";
import { level, puzzle, team } from "@swarmtales/sdk";
import type { LevelDefinition, TeamLayout } from "@swarmtales/contracts";

function levelsWith(...layouts: readonly TeamLayout[]): readonly LevelDefinition[] {
	return layouts.map((layout, index) =>
		level(index + 1, {
			title: `Level ${index + 1}`,
			puzzle: puzzle.fragments([8, 10]),
			team: layout,
			reward: 1,
			tools: ["submitSolution"],
			task: "{fragment}",
		}),
	);
}

const sorted = (members: readonly string[]): readonly string[] => [...members].sort();

describe("team layouts (SPEC 12.1)", () => {
	it("solo gives everyone a team of one", () => {
		const planner = new TeamPlanner(levelsWith(team.solo()), competitorIds(4), 7);
		expect(planner.teamsOf(1).map((entry) => entry.members)).toEqual([["A01"], ["A02"], ["A03"], ["A04"]]);
	});

	it("random(size) covers every competitor exactly once", () => {
		const planner = new TeamPlanner(levelsWith(team.random(3)), competitorIds(9), 7);
		const teams = planner.teamsOf(1);
		expect(teams).toHaveLength(3);
		expect(teams.flatMap((entry) => entry.members).sort()).toEqual([...competitorIds(9)]);
		for (const entry of teams) expect(entry.members).toContain(entry.leader);
	});

	it("is reproducible for a seed and differs between seeds", () => {
		const layouts = levelsWith(team.random(2));
		const draw = (seed: number) => new TeamPlanner(layouts, competitorIds(8), seed).teamsOf(1);
		expect(draw(7)).toEqual(draw(7));
		const seeds = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(draw(seed)));
		expect(new Set(seeds).size).toBeGreaterThan(1);
	});

	it("sameAs keeps the teams and leaders of the referenced level", () => {
		const planner = new TeamPlanner(levelsWith(team.random(2), team.random(3), team.sameAs(2)), competitorIds(6), 7);
		expect(planner.teamsOf(3)).toEqual(planner.teamsOf(2));
	});

	it.each([6, 12, 18, 24])("splitFrom(level, 3) separates former teammates with %i agents", (agents) => {
		const planner = new TeamPlanner(levelsWith(team.random(3), team.splitFrom(1, 3)), competitorIds(agents), 7);
		const reference = planner.teamsOf(1);
		const split = planner.teamsOf(2);
		expect(split.flatMap((entry) => entry.members).sort()).toEqual([...competitorIds(agents)].sort());
		// Six agents form two old teams, so each new team of three must keep one pair; more agents keep none.
		expect(sharedPairs(split, reference)).toBe(agents === 6 ? 2 : 0);
		for (const entry of split) expect(entry.members).toHaveLength(3);
		expect(split.map((entry) => sorted(entry.members))).not.toEqual(reference.map((entry) => sorted(entry.members)));
	});

	it("rejects agent counts that do not divide into the team size", () => {
		const planner = new TeamPlanner(levelsWith(team.random(3)), competitorIds(4), 7);
		expect(() => planner.teamsOf(1)).toThrow(TeamLayoutError);
		expect(() => planner.teamsOf(1)).toThrow(/4 agents cannot be split into teams of 3/);
	});
});
