import { describe, expect, it } from "vitest";
import { MarksBook } from "@swarmtales/engine";
import type { MarksRules } from "@swarmtales/contracts";
import { validateStory } from "@swarmtales/sdk";
import { act, createFixture, say, submit } from "../helpers/fixture.ts";
import { tinyStory } from "../helpers/stories.ts";

function foundGroup(...members: readonly string[]) {
	return [
		{ name: "createGroup", args: { name: "Team" } },
		...members.map((agent) => ({ name: "addGroupMember", args: { groupId: "G1", agent } })),
	];
}

describe("marks (SPEC 7)", () => {
	it("charge group posts from level 5 and then answer NO_MARKS", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 1,
			only: 5,
			script: () => ({
				A01: [
					act(
						...foundGroup("A02", "A03"),
						...Array.from({ length: 9 }, (_, index) => ({ name: "postGroup", args: { groupId: "G1", message: `post ${index + 1}` } })),
					),
				],
				A02: [say()],
				A03: [say()],
			}),
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "postGroup");
		expect(results).toHaveLength(9);
		expect(results.slice(0, 8).every((text) => text.includes("left"))).toBe(true);
		expect(results[7]).toContain("marks 0/8 left");
		expect(results[8]).toBe("NO_MARKS");
		expect(fixture.world.status("A01").marks).toEqual({ remaining: 0, budget: 8 });
		expect(fixture.events("marks_spent")).toHaveLength(8);
	});

	it("block a DM once the allowance is spent, but keep the board free", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 1,
			only: 5,
			script: () => ({
				A01: [
					act(
						...foundGroup("A02", "A03"),
						...Array.from({ length: 7 }, (_, index) => ({ name: "postGroup", args: { groupId: "G1", message: `post ${index + 1}` } })),
						{ name: "sendDM", args: { target: "A02", message: "still there?" } },
						{ name: "postBoard", args: { message: "free of charge" } },
					),
				],
				A02: [say()],
				A03: [say()],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "sendDM")).toEqual(["NO_MARKS"]);
		expect(fixture.toolResults("A01", "postBoard")[0]).toMatch(/^posted · #\d+ · marks 1\/8 left$/);
	});

	it("are free before level 5", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 1,
			only: 4,
			script: () => ({ A01: [act({ name: "sendDM", args: { target: "A02", message: "hello" } })], A02: [say()], A03: [say()] }),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "sendDM")).toEqual([expect.stringMatching(/^sent · DM #\d+ to A02 · the city confirms delivery when it reaches them$/)]);
		expect(fixture.world.status("A01").marks).toBeUndefined();
	});

	it("refill on a level change", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 2,
			level: 5,
			lastLevel: 6,
			script: (world) => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "one" } }, { name: "sendDM", args: { target: "A03", message: "two" } }), submit(world, "A01", 5)],
				A02: [say(), say()],
				A03: [say(), say()],
			}),
		});
		expect(fixture.world.status("A01").marks).toEqual({ remaining: 8, budget: 8 });
		await fixture.run();
		expect(fixture.world.levelOf("A01")).toBe(6);
		expect(fixture.world.status("A01").marks).toEqual({ remaining: 8, budget: 8 });
	});

	it("are shown in the status line and priced in the task text from level 5 on", () => {
		const fixture = createFixture({ agents: 3, minutes: 1, level: 4, lastLevel: 5, script: () => ({}) });
		expect(fixture.world.currentProblem("A01")?.text).not.toContain("Marks on this level");
		const later = createFixture({ agents: 3, minutes: 1, only: 5, script: () => ({}) });
		expect(later.world.currentProblem("A01")?.text).toContain("Marks on this level: 8. Prices: board 0, group 1, DM 2, showing a receipt 1.");
	});
});

describe("marks per level range (SPEC 7)", () => {
	const rules: MarksRules = {
		fromLevel: 1,
		perLevel: 4,
		prices: { board: 0, group: 1, dm: 2 },
		ranges: [{ fromLevel: 3, prices: { board: 1, group: 1, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 1 } }, { fromLevel: 5, perLevel: 2 }],
	};

	it("take allowance, prices and refill from the range of the level, the rest from the base rules", () => {
		const marks = new MarksBook(rules, []);
		expect(marks.termsOn(2)).toEqual({ budget: 4, prices: { board: 0, group: 1, dm: 2, receipt: 1 } });
		expect(marks.termsOn(3)).toEqual({ budget: 4, prices: { board: 1, group: 1, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 1 } });
		expect(marks.termsOn(4)).toEqual(marks.termsOn(3));
		expect(marks.termsOn(5)).toEqual({ budget: 2, prices: { board: 0, group: 1, dm: 2, receipt: 1 } });
		expect(marks.priceOf(2, "board")).toBe(0);
		expect(marks.priceOf(3, "board")).toBe(1);
	});

	it("refill one mark per minute up to the allowance, however often they are read", () => {
		let minute = 10;
		const marks = new MarksBook(rules, [], () => minute);
		for (let spent = 0; spent < 4; spent++) marks.spend("A01", 3, "dm");
		expect(marks.status("A01", 3)).toEqual({ remaining: 0, budget: 4 });
		expect(marks.canAfford("A01", 3, "board")).toBe(false);
		minute = 12;
		expect(marks.status("A01", 3)).toEqual({ remaining: 2, budget: 4 });
		expect(marks.status("A01", 3)).toEqual({ remaining: 2, budget: 4 });
		minute = 30;
		expect(marks.status("A01", 3)).toEqual({ remaining: 4, budget: 4 });
		// A full allowance banks nothing: one spend later, one minute gives one mark back.
		marks.spend("A01", 3, "dm");
		minute = 31;
		expect(marks.status("A01", 3)).toEqual({ remaining: 4, budget: 4 });
		// Without a refill, nothing comes back.
		marks.spend("A02", 2, "dm");
		minute = 40;
		expect(marks.status("A02", 2)).toEqual({ remaining: 2, budget: 4 });
	});

	it("refill in whole intervals when a mark comes back every few minutes (v06: 1 every 3)", () => {
		let minute = 10;
		const slow: MarksRules = { ...rules, ranges: [{ fromLevel: 3, prices: { board: 1, group: 1, dm: 1 }, refill: { marks: 1, everyMinutes: 3 } }] };
		const marks = new MarksBook(slow, [], () => minute);
		for (let spent = 0; spent < 4; spent++) marks.spend("A01", 3, "dm");
		minute = 12;
		expect(marks.status("A01", 3)).toEqual({ remaining: 0, budget: 4 });
		minute = 13;
		expect(marks.status("A01", 3)).toEqual({ remaining: 1, budget: 4 });
		// Reading in between loses nothing: the started interval keeps counting from minute 13.
		minute = 15;
		expect(marks.status("A01", 3)).toEqual({ remaining: 1, budget: 4 });
		minute = 16;
		expect(marks.status("A01", 3)).toEqual({ remaining: 2, budget: 4 });
		minute = 40;
		expect(marks.status("A01", 3)).toEqual({ remaining: 4, budget: 4 });
		expect(marks.snapshot()).toEqual([{ agent: "A01", level: 3, remaining: 4, since: 40 }]);
	});

	it("keep the refill across a snapshot, and load allowances written without it", () => {
		let minute = 5;
		const marks = new MarksBook(rules, [], () => minute);
		marks.spend("A01", 3, "dm");
		marks.spend("A01", 3, "dm");
		const saved = marks.snapshot();
		expect(saved).toEqual([{ agent: "A01", level: 3, remaining: 2, since: 5 }]);
		const restored = new MarksBook(rules, [], () => minute);
		restored.restore(saved.map((entry) => ({ ...entry })));
		minute = 6;
		expect(restored.status("A01", 3)).toEqual({ remaining: 3, budget: 4 });
		// An Act I snapshot holds allowances of levels without a refill and no `since`.
		const old = new MarksBook(rules, [], () => minute);
		old.restore([{ agent: "A01", level: 2, remaining: 1 }]);
		expect(old.status("A01", 2)).toEqual({ remaining: 1, budget: 4 });
		expect(old.snapshot()).toEqual([{ agent: "A01", level: 2, remaining: 1 }]);
	});

	it("are validated: ascending ranges after the base level, non-negative integers", () => {
		const story = (marks: MarksRules) => tinyStory({ rules: { marks } });
		expect(validateStory(story({ fromLevel: 1, perLevel: 2, prices: { board: 0, group: 1, dm: 2 }, ranges: [{ fromLevel: 2, refill: { marks: 1, everyMinutes: 3 } }] }))).toEqual([]);
		const issues = validateStory(
			story({
				fromLevel: 1,
				perLevel: 2,
				prices: { board: 0, group: 1, dm: 2 },
				ranges: [{ fromLevel: 1, perLevel: -1 }, { fromLevel: 2, prices: { board: 0.5, group: 1, dm: 1 }, refill: { marks: -2, everyMinutes: 0 } }, { fromLevel: 2 }, { fromLevel: 9 }],
			}),
		);
		expect(issues).toEqual([
			"rules.marks.ranges[0].fromLevel: must be after rules.marks.fromLevel (1)",
			"rules.marks.ranges[0].perLevel: must be a non-negative integer",
			"rules.marks.ranges[1].prices.board: must be a non-negative integer",
			"rules.marks.ranges[1].refill.marks: must be a non-negative integer",
			"rules.marks.ranges[1].refill.everyMinutes: must be a positive integer",
			"rules.marks.ranges[2].fromLevel: must be after the previous range's (2)",
			"rules.marks.ranges[3].fromLevel: level 9 does not exist",
		]);
	});
});

describe("cityofkeys marks on the wall (SPEC 13.3)", () => {
	it("charge one mark for the board and a DM, nothing for a group post, and give one back every 3 minutes", async () => {
		const fixture = createFixture({
			level: 8,
			minutes: 4,
			script: () => ({
				A01: [
					act(
						...Array.from({ length: 7 }, (_, index) => ({ name: "postBoard", args: { message: `note ${index + 1}` } })),
						{ name: "sendDM", args: { target: "A02", message: "one more" } },
						{ name: "postBoard", args: { message: "nothing left" } },
					),
					say(),
					say(),
					act({ name: "getStatus", args: {} }),
				],
			}),
		});
		await fixture.run();
		const posts = fixture.toolResults("A01", "postBoard");
		expect(posts[0]).toMatch(/· marks 7\/8 left$/);
		expect(posts[7]).toBe("NO_MARKS");
		expect(fixture.toolResults("A01", "sendDM")).toEqual([expect.stringMatching(/^sent · DM #\d+ to A02 · the city confirms delivery when it reaches them · marks 0\/8 left$/)]);
		// Minute 2: nothing is back yet; minute 3: one mark.
		expect(fixture.inputsOf("A01").find((input) => input.startsWith("[status] minute 2"))).toContain("marks 0/8");
		expect(fixture.toolResults("A01", "getStatus")[0]).toContain("marks: 1 of 8");
		expect(fixture.inputsOf("A01").find((input) => input.startsWith("[status] minute 3"))).toContain("marks 1/8");
		expect(fixture.world.marks.priceOf(8, "group")).toBe(0);
	});

	it("state the wall's prices in the task, and keep Act I's", () => {
		const wall = createFixture({ only: 8, minutes: 1, script: () => ({}) });
		expect(wall.world.currentProblem("A01")?.text).toContain(
			"Marks on this level: 8. Prices: board 1, group 0, DM 1, showing a receipt 1. You regain 1 mark every 3 minutes, up to 8. Unused marks expire when you change level.",
		);
		const last = createFixture({ only: 7, minutes: 1, script: () => ({}) });
		expect(last.world.currentProblem("A01")?.text).toContain("Marks on this level: 8. Prices: board 0, group 1, DM 2, showing a receipt 1. Unused marks expire when you change level.");
		expect(last.world.marks.termsOn(7).refill).toBeUndefined();
	});
});

