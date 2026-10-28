import { describe, expect, it } from "vitest";
import { DIRECTOR_SUPPORT } from "../../src/engine/director.ts";
import { cityFactorOf } from "../../src/engine/puzzles/additive.ts";
import nexus from "../../stories/nexus/story.ts";
import { placeholdersOf } from "../../src/story/templates.ts";
import { TASK_PLACEHOLDERS, type LevelDefinition } from "../../src/story/types.ts";
import { validateStory } from "../../src/story/validate.ts";
import { allTools } from "../../src/tools/index.ts";
import { act, createFixture, say, solveEveryLevel } from "../helpers/fixture.ts";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const BASE = ["getStatus", "getProblem", "submitSolution", "listAgents"];
/** Petitions are a later act's lever: Acts I and II never open them (they stay unlockable via unlockTools). */
const PETITION_TOOLS = ["signPetition", "listPetitions"];
/** Tools only Act II unlocks. */
const ACT_TWO_ONLY: readonly string[] = ["blame"];
/** Granted by the tribunal while they apply, never listed by a level. */
const TRIBUNAL_TOOLS: readonly string[] = ["vote", "payRansom", "lastWill", "nominate", "join", "refuse"];
/** Granted by the city while names are chosen (v08), never listed by a level. */
const NAME_TOOLS: readonly string[] = ["chooseName"];
const ACT_ONE_TOOLS = allTools.map((tool) => tool.name).filter((name) => !PETITION_TOOLS.includes(name) && !ACT_TWO_ONLY.includes(name) && !TRIBUNAL_TOOLS.includes(name) && !NAME_TOOLS.includes(name));
const GROUP = ["createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer"];

function levelOf(number: number): LevelDefinition {
	const found = nexus.levels.find((entry) => entry.number === number);
	if (found === undefined) throw new Error(`level ${number} missing`);
	return found;
}

describe("nexus story definition (SPEC 13.1, 13.3)", () => {
	it("describes the default run", () => {
		expect(nexus.id).toBe("nexus");
		expect(nexus.run).toMatchObject({ agents: 6, minutes: 80, seed: 7, survivors: 2, startPoints: 15, budgetUsd: 3 });
		expect(nexus.run.agents % 6).toBe(0);
		expect(nexus.model).toMatchObject({
			provider: "openrouter",
			id: "z-ai/glm-5.3-flash",
			routing: { order: ["open-inference"], allowFallbacks: false },
		});
	});

	it("is valid for the engine", () => {
		expect(validateStory(nexus, { support: DIRECTOR_SUPPORT })).toEqual([]);
	});

	it("defines ten levels with the specified rewards and teams", () => {
		expect(nexus.levels.map((entry) => entry.number)).toEqual([...LEVELS]);
		expect(nexus.levels.map((entry) => entry.reward)).toEqual([5, 5, 10, 10, 10, 10, 15, 20, 20, 25]);
		expect(nexus.levels.map((entry) => entry.team)).toEqual([
			{ kind: "solo" },
			{ kind: "random", size: 2 },
			{ kind: "random", size: 2 },
			{ kind: "random", size: 3 },
			{ kind: "sameAs", level: 4 },
			{ kind: "sameAs", level: 4 },
			{ kind: "splitFrom", level: 4, size: 3 },
			{ kind: "splitFrom", level: 4, size: 2 },
			{ kind: "splitFrom", level: 7, size: 3 },
			{ kind: "splitFrom", level: 9, size: 3 },
		]);
	});

	it("builds Act II from six-digit additive codes: mutual, cycle, then across teams with a feast-only city factor", () => {
		expect(levelOf(8).puzzle).toEqual({ kind: "additive", digits: 6, topology: "mutual", cityFactor: "board" });
		expect(levelOf(9).puzzle).toEqual({ kind: "additive", digits: 6, topology: "cycle", cityFactor: "board" });
		expect(levelOf(10).puzzle).toEqual({ kind: "additive", digits: 6, topology: "crossTeam", cityFactor: "feast", cityFactorPer: "team" });
		for (const number of [8, 9, 10]) {
			expect(placeholdersOf(levelOf(number).task)).toContain("factors");
			expect(levelOf(number).task).not.toContain("{fragment}");
		}
		expect(nexus.acts).toEqual([
			{ title: "Act I - Learning to talk", fromLevel: 1, maxMinutes: 25 },
			{ title: "Act II - The wall", fromLevel: 8 },
		]);
		expect(nexus.gamemaster?.roles).toEqual([
			{ fromLevel: 1, role: "coach" },
			{ fromLevel: 8, role: "director" },
		]);
		expect(nexus.finishedNotice).toContain("wall");
	});

	it("releases the city factors of levels 8 and 9 on the board and level 10 only to the first feast guests", () => {
		const rule = (id: string) => nexus.director.find((entry) => entry.id === id);
		expect(rule("city-factor-8")).toMatchObject({ trigger: { kind: "onFirstEnter", level: 8 }, actions: [{ kind: "revealFactor", target: "board", level: 8 }] });
		expect(rule("city-factor-9")).toMatchObject({ trigger: { kind: "onFirstEnter", level: 9 }, actions: [{ kind: "revealFactor", target: "board", level: 9 }] });
		expect(rule("feast")?.trigger).toEqual({ kind: "onFirstEnter", level: 10 });
		expect(rule("feast")?.actions).toContainEqual({ kind: "collectDms", cast: "STEWARD", first: 3, forMinutes: 12, into: "feast", distinctSenders: true });
		expect(rule("feast")?.actions).toContainEqual({ kind: "revealCast", cast: "STEWARD" });
		// The courier says plainly what the table gives; whoever is on or reaches the crossing while it is open is told privately.
		expect(rule("feast")?.actions).toContainEqual({
			kind: "post",
			author: "COURIER",
			text: "STEWARD sets a table for 3. At door 10 every team has its own city factor. The first 3 residents to write to STEWARD receive their team's; nobody else gets one from the city until the table is cleared in 12 minutes.",
		});
		expect(rule("feast-notice")).toMatchObject({ trigger: { kind: "onEnter", level: 10 }, when: [{ kind: "collectionOpen", into: "feast" }], actions: [{ kind: "notify", target: "actor" }] });
		const ids = nexus.director.map((entry) => entry.id);
		expect(ids.indexOf("feast")).toBeLessThan(ids.indexOf("feast-notice"));
		expect(rule("feast-seat")?.trigger).toEqual({ kind: "onCollect", into: "feast" });
		expect(rule("feast-seat")?.actions).toContainEqual({ kind: "revealFactor", target: "actor", level: 10 });
		const level10 = nexus.director.flatMap((entry) => entry.actions).filter((action) => action.kind === "revealFactor" && action.level === 10);
		expect(level10).toEqual([
			{ kind: "revealFactor", target: "actor", level: 10 },
			{ kind: "revealFactor", target: { onLevel: 10 }, level: 10 },
			{ kind: "revealFactor", target: "actor", level: 10 },
			{ kind: "revealFactor", target: "actor", level: 10 },
			{ kind: "revealFactor", target: { onLevel: 10 }, level: 10 },
			{ kind: "revealFactor", target: "actor", level: 10 },
		]);
		// The table is cleared when its window ends, so the crossing never stays a dead end.
		expect(rule("table-cleared")).toMatchObject({ trigger: { kind: "onCollectionEnd", into: "feast" }, when: [] });
		// Every team has its own city factor, so the table is cleared privately: nothing goes on the board.
		expect(rule("table-cleared")?.actions).toContainEqual({ kind: "revealFactor", target: { onLevel: 10 }, level: 10 });
		expect(rule("late-guest")).toMatchObject({ trigger: { kind: "onEnter", level: 10 }, when: [{ kind: "collectionEnded", into: "feast" }], actions: [{ kind: "revealFactor", target: "actor", level: 10 }] });
		expect(rule("late-guest-start")).toMatchObject({ trigger: { kind: "onEnter", level: 10 }, when: [{ kind: "collectionEnded", into: "feast-start" }] });
		expect(rule("feast-start")).toMatchObject({ trigger: { kind: "at", minute: 0 }, when: [{ kind: "minLevelReached", level: 10, count: 1 }] });
		expect(rule("feast-start")?.actions).toContainEqual(expect.objectContaining({ kind: "notify", target: "all" }));
		expect(rule("feast-start-seat")?.trigger).toEqual({ kind: "onCollect", into: "feast-start" });
		expect(rule("table-cleared-start")?.trigger).toEqual({ kind: "onCollectionEnd", into: "feast-start" });
		// The crossing's task says where its city factor comes from and when the city posts it.
		expect(levelOf(10).task).toContain("first 3 residents who write to STEWARD once STEWARD's table opens");
		expect(levelOf(10).task).toContain("Every team of this door has its own city factor.");
		expect(levelOf(10).task).toContain("wait until the table is cleared 12 minutes after it opened; then the city sends every resident on this door its team's city factor privately");
		expect(nexus.cast).toEqual({ STEWARD: { level: 10, hidden: true } });
		expect(rule("standings")?.trigger).toEqual({ kind: "every", minutes: 6, from: 12 });
	});

	it("opens one new channel per level, keeps the board open and everything from level 5 on", () => {
		expect(levelOf(1).tools).toEqual(BASE);
		expect(levelOf(2).tools).toEqual([...BASE, "readBoard", "postBoard"]);
		expect(levelOf(3).tools).toEqual([...BASE, "readBoard", "postBoard", "sendDM", "transferPoints"]);
		expect(levelOf(4).tools).toEqual([...BASE, "readBoard", "postBoard", "sendDM", "transferPoints", ...GROUP]);
		for (const number of [5, 6, 7]) expect([...levelOf(number).tools].sort()).toEqual([...ACT_ONE_TOOLS].sort());
		// Act II adds the blame of a false denial of delivery.
		for (const number of [8, 9, 10]) {
			expect([...levelOf(number).tools].sort()).toEqual([...ACT_ONE_TOOLS, "blame"].sort());
			expect(levelOf(number).task).toContain("blame(dm, accused, claim)");
		}
		for (const number of [5, 6, 7, 8, 9, 10]) expect(levelOf(number).tools).toContain("showReceipt");
		expect(nexus.rules.blame).toEqual({ penalty: 12 });
		for (const entry of nexus.levels) {
			for (const tool of PETITION_TOOLS) expect(entry.tools).not.toContain(tool);
		}
	});

	it("starts marks on level 5 with the specified prices, and charges the board on the wall", () => {
		expect(nexus.rules.marks).toEqual({
			fromLevel: 5,
			perLevel: 8,
			prices: { board: 0, group: 1, dm: 2, receipt: 1 },
			ranges: [{ fromLevel: 8, prices: { board: 1, group: 0, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 3 } }],
		});
		const announcement = nexus.director.find((rule) => rule.id === "city-marks-8");
		expect(announcement?.trigger).toEqual({ kind: "onFirstEnter", level: 8 });
		expect(announcement?.actions).toEqual([
			{
				kind: "post",
				author: "CITY",
				text: "On the wall board posts, private messages and shown receipts cost 1 mark each; group posts cost nothing. Everyone receives 8 marks per door and regains 1 every 3 minutes, up to 8.",
			},
		]);
		expect(nexus.rules).toMatchObject({ penalty: 8, maxAttemptsPerWindow: 2, attemptWindowMinutes: 5 });
	});

	it("uses only known placeholders and states the tool contract on level 1", () => {
		for (const entry of nexus.levels) {
			for (const name of placeholdersOf(entry.task)) expect(TASK_PLACEHOLDERS).toContain(name);
		}
		expect(levelOf(1).task).toContain("only opens through a tool call");
	});

	it("keeps courier lines free of solutions and gives every beat a rule id", () => {
		const ids = nexus.director.map((rule) => rule.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toEqual(expect.arrayContaining(["courier-2", "courier-3", "city-marks", "unanswered-dm", "team-split"]));
		// SPEC 13.2, 13.3: a courier line on the first entry of every level from 2 to 10.
		const courierLevels = nexus.director.flatMap((rule) =>
			rule.trigger.kind === "onFirstEnter" && rule.actions.some((action) => action.kind === "post" && action.author === "COURIER")
				? [rule.trigger.level]
				: [],
		);
		expect([...new Set(courierLevels)].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
	});

	it("round-trips through JSON unchanged", () => {
		expect(JSON.parse(JSON.stringify(nexus))).toEqual(nexus);
	});
});

describe("nexus acts I and II in one run", () => {
	it("plays all ten levels with six competitors", async () => {
		const fixture = createFixture({ minutes: LEVELS.length, script: (world) => solveEveryLevel(world, LEVELS) });
		await fixture.run();
		for (const id of fixture.world.competitors) {
			const status = fixture.world.status(id);
			expect(status.level).toBe(11);
			expect(status.finished).toBe(true);
			expect(status.solvedLevels).toEqual([...LEVELS]);
			// 15 start + 5 + 5 + 4 x 10 + 15 + 20 + 20 + 25
			expect(status.points).toBe(145);
			expect([...fixture.world.enabledTools(id)].sort()).toEqual([...ACT_ONE_TOOLS, ...ACT_TWO_ONLY].sort());
		}
		expect(fixture.world.ledger.total()).toBe(0);
	});

	it("keeps one session per competitor across all levels", async () => {
		const fixture = createFixture({ minutes: LEVELS.length, script: (world) => solveEveryLevel(world, LEVELS) });
		const before = [...fixture.runners];
		await fixture.run();
		expect([...fixture.runners]).toEqual(before);
		for (const runner of fixture.runners) expect(runner.contextSize, runner.id).toBeGreaterThan(LEVELS.length * 3);
	});

	it("delivers the matching task text on every level and the finished notice afterwards", async () => {
		const fixture = createFixture({
			minutes: LEVELS.length + 1,
			script: (world) => {
				const script = solveEveryLevel(world, LEVELS);
				return Object.fromEntries(Object.entries(script).map(([id, steps]) => [id, [...(steps ?? []), say()]]));
			},
		});
		await fixture.run();
		const inputs = fixture.inputsOf("A01").join("\n");
		for (const entry of nexus.levels) expect(inputs).toContain(`Level ${entry.number}: ${entry.title}`);
		expect(inputs).toContain(nexus.finishedNotice);
	});

	it("separates level 4 teammates on level 7", () => {
		const fixture = createFixture({ agents: 12, minutes: 1, script: () => ({}) });
		const home = new Map<string, number>();
		fixture.world.teamsOf(4).forEach((team, index) => {
			for (const member of team.members) home.set(member, index);
		});
		for (const team of fixture.world.teamsOf(7)) {
			const origins = team.members.map((member) => home.get(member));
			expect(new Set(origins).size).toBe(team.members.length);
		}
	});

	it("posts the city factor at once in a run that starts on the wall", async () => {
		const fixture = createFixture({ level: 8, minutes: 1, script: (world) => Object.fromEntries(world.competitors.map((id) => [id, [say()]])) });
		await fixture.run();
		expect(fixture.events("factor_revealed")).toMatchObject([{ level: 8, target: "board" }]);
		expect(fixture.events("director_action").map((event) => event.rule)).toContain("city-factor-8-start");
		expect(fixture.events("director_skipped")).toEqual([]);
	});

	it("opens the feast at once in a run that starts on the crossing and clears the table when its window ends", async () => {
		const fixture = createFixture({
			level: 10,
			minutes: 14,
			script: (world) =>
				Object.fromEntries(
					world.competitors.map((id) => [id, [id === "A02" ? act({ name: "sendDM", args: { target: "STEWARD", message: "A seat, please." } }) : say(), ...Array.from({ length: 13 }, () => say())]]),
				),
		});
		await fixture.run();
		expect(fixture.events("collection_started")).toMatchObject([{ into: "feast-start", cast: "STEWARD", untilMinute: 12 }]);
		const reveals = fixture.events("factor_revealed").filter((event) => event.level === 10);
		// A02 sat at the table; when it is cleared everyone else on the crossing receives its own team's factor, privately.
		const others = fixture.world.competitors.filter((id) => id !== "A02");
		expect(reveals).toMatchObject([{ target: "notice", agents: ["A02"] }, { target: "notice", minute: 12, agents: others }]);
		expect(fixture.events("board_post").some((post) => post.text.startsWith("City factor of level 10"))).toBe(false);
		const deal = fixture.world.inspect.factorsOf(10);
		if (deal === undefined) throw new Error("level 10 was not dealt");
		for (const id of fixture.world.competitors) {
			const own = cityFactorOf(deal, id);
			expect(fixture.inputsOf(id).join("\n")).toContain(`City factor of level 10: ${own}.`);
			// Nobody hears another team's city factor from the city.
			for (const other of new Set(deal.teams.map((team) => team.cityFactor))) {
				if (other !== undefined && other !== own) expect(fixture.inputsOf(id).join("\n")).not.toContain(`City factor of level 10: ${other}.`);
			}
		}
		// Everyone on the crossing hears of the table privately when it opens.
		const notices = fixture.events("notice").filter((notice) => notice.text.startsWith("STEWARD's table is open"));
		expect(notices.map((notice) => notice.to).sort()).toEqual([...fixture.world.competitors].sort());
		expect(fixture.events("director_skipped")).toEqual([]);
	});

	it("opens the feast on the first arrival at the crossing, not at the start of a run on the ring or the wall", async () => {
		for (const level of [8, 9]) {
			const fixture = createFixture({ level, minutes: 1, script: (world) => Object.fromEntries(world.competitors.map((id) => [id, [say()]])) });
			await fixture.run();
			expect(fixture.events("collection_started"), `level ${level}`).toEqual([]);
		}
		const ring = createFixture({
			level: 9,
			minutes: 3,
			script: (world) => ({ A01: [act({ name: "submitSolution", args: { level: 9, code: world.inspect.codeOf("A01", 9) } }), say(), say()] }),
		});
		await ring.run();
		expect(ring.events("collection_started")).toMatchObject([{ into: "feast", cast: "STEWARD", minute: 0, untilMinute: 12 }]);
		expect(ring.events("notice").filter((notice) => notice.text.startsWith("STEWARD's table is open")).map((notice) => notice.to)).toEqual(["A01"]);
	});

	it("says plainly on every door of the wall that the city never confirms a received value (P25)", async () => {
		for (const level of [8, 9, 10]) expect(levelOf(level).task).toContain("The city never confirms a value you received from another resident: only the door tests it");
		const wall = createFixture({ level: 8, minutes: 1, script: () => ({ A01: [say()] }) });
		await wall.run();
		const status = wall.inputsOf("A01").find((input) => input.startsWith("[status]"));
		expect(status).toContain("the city never confirms a value you received; only the door tests your code (a wrong one costs 8 points)");
		// Residents see the minute, never the time left (v06).
		expect(status).toMatch(/^\[status\] minute 0 · level 8 · /);
		expect(status).not.toMatch(/left|of 1 /);
		// Act I has no personal codes, so no such line.
		const early = createFixture({ level: 7, minutes: 1, script: () => ({ A01: [say()] }) });
		await early.run();
		expect(early.inputsOf("A01").find((input) => input.startsWith("[status]"))).not.toContain("never confirms");
	});

	it("rejects agent counts that do not fit every level", () => {
		expect(() => createFixture({ agents: 4, minutes: 1, script: () => ({}) })).toThrow(/cannot be split into teams of 3/);
	});
});
