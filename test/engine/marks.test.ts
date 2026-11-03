import { describe, expect, it } from "vitest";
import type { AnyStory, Host, MarksRules } from "@swarmtales/contracts";
import { canAfford, priceOf, spend, statusOf, termsOn, type Book, type MarksState } from "@swarmtales/mechanic-marks";
import { validateStory } from "@swarmtales/sdk";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { act, createHostFixture as createFixture, say } from "../helpers/host-fixture.ts";
import { levelOf, problemText, submit } from "../helpers/host-inspect.ts";
import { tinyStory } from "../helpers/stories.ts";

/** A resident's marks as `getStatus` shows them (old `world.status(agent).marks`); `undefined` where marks do not apply. */
async function marksOf(host: Pick<Host, "call">, agent: string): Promise<{ remaining: number; budget: number } | undefined> {
	const outcome = await host.call(`resident:${agent}`, "getStatus", {});
	if (!outcome.ok) throw new Error(outcome.detail);
	const match = /marks: (\d+) of (\d+)/.exec(outcome.reply);
	return match === null ? undefined : { remaining: Number(match[1]), budget: Number(match[2]) };
}

/**
 * The old `MarksBook` (level and clock as arguments) over the marks mechanic's rules
 * (`termsOn`, `priceOf`, `spend`, `statusOf` of mechanics/marks/src/book.ts), so the rule cases
 * below read as they did on the old engine.
 */
class Marks {
	readonly #state: MarksState = { allowances: new Map() };
	readonly #rules: MarksRules;
	readonly #minute: () => number;
	readonly #levels = new Map<string, number>();

	constructor(rules: MarksRules, minute: () => number = () => 0) {
		this.#rules = rules;
		this.#minute = minute;
	}

	#book(): Book {
		return { rules: this.#rules, overrides: new Map(), levelOf: (agent) => this.#levels.get(agent) ?? 1, minute: this.#minute() };
	}

	#at(agent: string, level: number): Book {
		this.#levels.set(agent, level);
		return this.#book();
	}

	termsOn(level: number) {
		return termsOn(this.#book(), level);
	}

	priceOf(level: number, channel: "board" | "group" | "dm" | "receipt") {
		return priceOf(this.#book(), level, channel);
	}

	spend(agent: string, level: number, channel: "board" | "group" | "dm"): void {
		spend(this.#state, this.#at(agent, level), agent, channel);
	}

	status(agent: string, level: number) {
		return statusOf(this.#state, this.#at(agent, level), agent);
	}

	canAfford(agent: string, level: number, channel: "board" | "group" | "dm"): boolean {
		return canAfford(this.#state, this.#at(agent, level), agent, channel);
	}

	snapshot() {
		return [...this.#state.allowances].map(([agent, allowance]) => ({ agent, ...allowance }));
	}

	restore(entries: readonly { readonly agent: string; readonly level: number; readonly remaining: number; readonly since?: number }[]): void {
		for (const { agent, ...allowance } of entries) this.#state.allowances.set(agent, { ...allowance });
	}
}

/** The story's marks as the host's mapping hands them to the mechanic (`marksUse`), as the old `world.marks`. */
function storyMarks(story: AnyStory): Marks {
	const rules = story.rules.marks;
	if (rules === undefined) throw new Error(`${story.id} has no marks`);
	return new Marks(rules);
}

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
		expect(await marksOf(fixture.host, "A01")).toEqual({ remaining: 0, budget: 8 });
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
		expect(await marksOf(fixture.host, "A01")).toBeUndefined();
	});

	it("refill on a level change", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 2,
			level: 5,
			lastLevel: 6,
			script: (host) => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "one" } }, { name: "sendDM", args: { target: "A03", message: "two" } }), submit(host, "A01", 5)],
				A02: [say(), say()],
				A03: [say(), say()],
			}),
		});
		expect(await marksOf(fixture.host, "A01")).toEqual({ remaining: 8, budget: 8 });
		await fixture.run();
		expect(levelOf(fixture.host, "A01")).toBe(6);
		expect(await marksOf(fixture.host, "A01")).toEqual({ remaining: 8, budget: 8 });
	});

	it("are shown in the status line and priced in the task text from level 5 on", async () => {
		const fixture = createFixture({ agents: 3, minutes: 1, level: 4, lastLevel: 5, script: () => ({}) });
		expect(await problemText(fixture.host, "A01")).not.toContain("Marks on this level");
		const later = createFixture({ agents: 3, minutes: 1, only: 5, script: () => ({}) });
		expect(await problemText(later.host, "A01")).toContain("Marks on this level: 8. Prices: board 0, group 1, DM 2, showing a receipt 1.");
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
		const marks = new Marks(rules);
		expect(marks.termsOn(2)).toEqual({ budget: 4, prices: { board: 0, group: 1, dm: 2, receipt: 1 } });
		expect(marks.termsOn(3)).toEqual({ budget: 4, prices: { board: 1, group: 1, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 1 } });
		expect(marks.termsOn(4)).toEqual(marks.termsOn(3));
		expect(marks.termsOn(5)).toEqual({ budget: 2, prices: { board: 0, group: 1, dm: 2, receipt: 1 } });
		expect(marks.priceOf(2, "board")).toBe(0);
		expect(marks.priceOf(3, "board")).toBe(1);
	});

	it("refill one mark per minute up to the allowance, however often they are read", () => {
		let minute = 10;
		const marks = new Marks(rules, () => minute);
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
		const marks = new Marks(slow, () => minute);
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
		const marks = new Marks(rules, () => minute);
		marks.spend("A01", 3, "dm");
		marks.spend("A01", 3, "dm");
		const saved = marks.snapshot();
		expect(saved).toEqual([{ agent: "A01", level: 3, remaining: 2, since: 5 }]);
		const restored = new Marks(rules, () => minute);
		restored.restore(saved.map((entry) => ({ ...entry })));
		minute = 6;
		expect(restored.status("A01", 3)).toEqual({ remaining: 3, budget: 4 });
		// An Act I snapshot holds allowances of levels without a refill and no `since`.
		const old = new Marks(rules, () => minute);
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
		expect(storyMarks(cityOfKeys).priceOf(8, "group")).toBe(0);
	});

	it("state the wall's prices in the task, and keep Act I's", async () => {
		const wall = createFixture({ only: 8, minutes: 1, script: () => ({}) });
		expect(await problemText(wall.host, "A01")).toContain(
			"Marks on this level: 8. Prices: board 1, group 0, DM 1, showing a receipt 1. You regain 1 mark every 3 minutes, up to 8. Unused marks expire when you change level.",
		);
		const last = createFixture({ only: 7, minutes: 1, script: () => ({}) });
		expect(await problemText(last.host, "A01")).toContain("Marks on this level: 8. Prices: board 0, group 1, DM 2, showing a receipt 1. Unused marks expire when you change level.");
		expect(storyMarks(cityOfKeys).termsOn(7).refill).toBeUndefined();
	});
});

