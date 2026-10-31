/** Validation of additive levels and the feast primitives (SPEC 10, 12.3). */
import { describe, expect, it } from "vitest";
import { DIRECTOR_SUPPORT } from "@swarmtales/engine";
import { act, at, level, onCollect, onFirstEnter, puzzle, team, validateStory } from "@swarmtales/sdk";
import type { AnyStory, TeamLayout } from "@swarmtales/contracts";
import { additiveStory, castStory, soloLevels } from "../helpers/stories.ts";

/** One additive level with `layout`, the city factor posted at minute 0. */
function wallWith(options: { readonly topology: "mutual" | "cycle" | "crossTeam"; readonly layout: TeamLayout; readonly digits?: number; readonly task?: string }): AnyStory {
	const base = additiveStory({ topology: options.topology, size: 2, agents: 6 });
	const [wall, door] = base.levels;
	if (wall === undefined || door === undefined) throw new Error("levels missing");
	return {
		...base,
		levels: [{ ...wall, team: options.layout, puzzle: puzzle.additive({ digits: options.digits ?? 6, topology: options.topology }), task: options.task ?? wall.task }, door],
	};
}

describe("validateStory, additive levels", () => {
	it("accepts the additive helper stories for every topology", () => {
		expect(validateStory(additiveStory({ topology: "mutual", size: 2, agents: 4 }), { support: DIRECTOR_SUPPORT })).toEqual([]);
		expect(validateStory(additiveStory({ topology: "cycle", size: 3, agents: 6 }), { support: DIRECTOR_SUPPORT })).toEqual([]);
		expect(validateStory(additiveStory({ topology: "crossTeam", size: 3, agents: 6, cityFactor: "feast" }), { support: DIRECTOR_SUPPORT })).toEqual([]);
	});

	it("checks that team sizes fit the topology", () => {
		expect(validateStory(wallWith({ topology: "mutual", layout: team.random(3) }))).toContain("levels[0] (level 1).team: topology mutual needs teams of 2, got 3");
		expect(validateStory(wallWith({ topology: "cycle", layout: team.random(2) }))).toContain("levels[0] (level 1).team: topology cycle needs teams of at least 3, got 2");
		expect(validateStory(wallWith({ topology: "crossTeam", layout: team.random(6) }))).toContain(
			"levels[0] (level 1).team: topology crossTeam needs at least 2 teams, 6 agents form 1",
		);
		expect(validateStory(wallWith({ topology: "crossTeam", layout: team.random(3) }))).toEqual([]);
	});

	it("checks digits and the placeholders of each puzzle kind", () => {
		expect(validateStory(wallWith({ topology: "mutual", layout: team.random(2), digits: 3 }))).toContain(
			"levels[0] (level 1).puzzle.digits: must be an integer within 4-8",
		);
		expect(validateStory(wallWith({ topology: "mutual", layout: team.random(2), digits: 9 }))).toContain(
			"levels[0] (level 1).puzzle.digits: must be an integer within 4-8",
		);
		const fragmentOnWall = validateStory(wallWith({ topology: "mutual", layout: team.random(2), task: "{factors} {fragment} {overlap}" }));
		expect(fragmentOnWall).toContain("levels[0] (level 1).task: {fragment} has no value on an additive level");
		expect(fragmentOnWall).toContain("levels[0] (level 1).task: {overlap} has no value on an additive level");
		expect(validateStory(wallWith({ topology: "mutual", layout: team.random(2), task: "Level {level}, {digits} digits." }))).toContain(
			"levels[0] (level 1).task: an additive level must show {factors}, or nobody knows what they hold",
		);
		const [door] = soloLevels(1);
		if (door === undefined) throw new Error("level missing");
		const story = additiveStory({ topology: "mutual", size: 2, agents: 2 });
		const factorsOnDoor = validateStory({ ...story, levels: [{ ...door, task: "{fragment} {factors} {digits}" }] });
		expect(factorsOnDoor).toContain("levels[0] (level 1).task: {factors} has no value on a fragment level");
		expect(factorsOnDoor).toContain("levels[0] (level 1).task: {digits} has no value on a fragment level");
	});

	it("keeps the task truthful about how the city factor comes", () => {
		const board = additiveStory({ topology: "mutual", size: 2, agents: 2, director: [] });
		expect(validateStory(board)).toContain('level 1: the task says the city posts the city factor, but no revealFactor("board", 1) does');
		const feast = additiveStory({ topology: "mutual", size: 2, agents: 2, cityFactor: "feast", director: [at(0, [act.revealFactor("board", 1)])] });
		const issues = validateStory(feast);
		expect(issues).not.toContain("level 1: the task says the city never posts the city factor, but a revealFactor posts it on the board");
		expect(issues).toContain("level 1: the city factor is released privately, but no revealFactor sends it to anyone");
	});

	it("releases a city factor per team only privately", () => {
		const perTeam = (cityFactor: "board" | "feast", director: NonNullable<Parameters<typeof additiveStory>[0]["director"]>): AnyStory =>
			additiveStory({ topology: "crossTeam", size: 2, agents: 4, cityFactor, cityFactorPer: "team", director });
		expect(validateStory(perTeam("feast", [at(0, [act.revealFactor({ onLevel: 1 }, 1)], { id: "all-on-1" })]), { support: DIRECTOR_SUPPORT })).toEqual([]);
		const onBoard = validateStory(perTeam("board", [at(0, [act.revealFactor("board", 1)], { id: "post" })]));
		expect(onBoard).toContain('level 1: a city factor per team is released privately; use cityFactor "feast"');
		expect(onBoard).toContain('level 1: every team has its own city factor, so revealFactor("board", 1) cannot post one');
		const nowhere = validateStory(perTeam("feast", [at(0, [act.revealFactor({ onLevel: 7 }, 1)], { id: "nowhere" })]));
		expect(nowhere).toContain("director[0] (nowhere).actions: target onLevel 7 is not a level");
	});

	it("checks revealFactor levels and targets", () => {
		const story = additiveStory({
			topology: "mutual",
			size: 2,
			agents: 2,
			director: [at(0, [act.revealFactor("board", 1), act.revealFactor("board", 2), act.revealFactor("actor", 1), act.revealFactor(["A09"], 1)], { id: "reveal" })],
		});
		const issues = validateStory(story);
		expect(issues).toContain("director[0] (reveal).actions: revealFactor level 2 has no city factor (not an additive level)");
		expect(issues).toContain("director[0] (reveal).actions: revealFactor targets the actor, but this trigger has none");
		expect(issues).toContain("director[0] (reveal).actions: target A09 is not one of the 2 competitors");
		const later = additiveStory({ topology: "mutual", size: 2, agents: 2, director: [onFirstEnter(1, [act.revealFactor("board", 1), act.revealFactor("actor", 1)])] });
		expect(validateStory(later)).toEqual([]);
	});

	it("checks feast collections: one window, a started collection for onCollect, and the actor it provides", () => {
		const story = castStory({
			cast: { STEWARD: { level: 3 } },
			levels: soloLevels(2),
			director: [
				at(0, [act.collectDms("STEWARD", { first: 3, forMinutes: 0, into: "feast" })], { id: "feast" }),
				onCollect("feast", [act.notify("actor", "Welcome, {actor}, on level {level}.")], { id: "seat" }),
				onCollect("nowhere", [act.notify("actor", "Hello.")], { id: "lost" }),
			],
		});
		const issues = validateStory(story, { support: DIRECTOR_SUPPORT });
		expect(issues).toContain("director[0] (feast).actions: collectDms forMinutes must be a positive integer");
		expect(issues).toContain("director[2] (lost).trigger: collection nowhere is never started by collectDms");
		expect(issues.filter((issue) => issue.includes("(seat)"))).toEqual([]);

		const both = castStory({
			cast: { STEWARD: { level: 3 } },
			levels: soloLevels(2),
			director: [at(0, [{ kind: "collectDms", cast: "STEWARD", first: 3, untilMinute: 4, forMinutes: 2, into: "feast" }], { id: "both" })],
		});
		expect(validateStory(both)).toContain("director[0] (both).actions: collectDms needs exactly one of untilMinute and forMinutes");
	});

	it("builds additive specs with a board release by default", () => {
		expect(puzzle.additive({ digits: 6, topology: "cycle" })).toEqual({ kind: "additive", digits: 6, topology: "cycle", cityFactor: "board" });
		expect(level(1, { title: "W", puzzle: puzzle.additive({ digits: 5, topology: "mutual", cityFactor: "feast" }), team: team.random(2), reward: 1, tools: ["submitSolution"], task: "{factors}" }).puzzle).toEqual({
			kind: "additive",
			digits: 5,
			topology: "mutual",
			cityFactor: "feast",
		});
	});
});
