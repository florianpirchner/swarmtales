import { describe, expect, it } from "vitest";
import { act, createFixture, say, submit, type Fixture } from "../helpers/fixture.ts";

/** Whether `first` was activated before `second` in the first pass. */
function firstBefore(fixture: Fixture, first: string, second: string): boolean {
	const order = fixture.events("pass_start")[0]?.order ?? [];
	return order.indexOf(first) < order.indexOf(second);
}

describe("arena: activation policy onNovelty (SPEC 3)", () => {
	it("skips competitors without anything new", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 3,
			only: 1,
			activation: "onNovelty",
			script: () => ({ A01: [say(), say(), say()], A02: [say(), say(), say()] }),
		});
		await fixture.run();
		expect(fixture.events("turn_input")).toHaveLength(2);
		expect(fixture.events("turn_skipped")).toHaveLength(4);
	});

	it("does not wake anyone through level-ups of others or courier lines", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 3,
			lastLevel: 2,
			activation: "onNovelty",
			script: (world) => ({ A01: [submit(world, "A01", 1), say(), say()], A02: [say(), say(), say()] }),
		});
		await fixture.run();
		expect(fixture.world.board.all().some((post) => post.author === "COURIER")).toBe(true);
		expect(fixture.events("turn_input").filter((event) => event.agent === "A02")).toHaveLength(1);
	});

	it.each([1, 2, 3, 4, 5, 6, 7, 8])("wakes a competitor for a new DM and delivers it (seed %i)", async (seed) => {
		const fixture = createFixture({
			seed,
			agents: 2,
			minutes: 2,
			only: 3,
			activation: "onNovelty",
			script: () => ({ A01: [say(), say()], A02: [act({ name: "sendDM", args: { target: "A01", message: "Hello" } }), say()] }),
		});
		await fixture.run();
		// A01 is woken in minute 1 only if it acted before A02 in minute 0.
		const expected = firstBefore(fixture, "A01", "A02") ? 2 : 1;
		expect(fixture.events("turn_input").filter((event) => event.agent === "A01")).toHaveLength(expected);
		expect(fixture.inputsOf("A01")).toEqual(expect.arrayContaining([expect.stringMatching(/^\[DM #\d+ from A02\] Hello$/)]));
	});

	it.each([1, 2, 3, 4, 5, 6, 7, 8])("wakes a competitor for a new player post on the board (seed %i)", async (seed) => {
		const fixture = createFixture({
			seed,
			agents: 2,
			minutes: 3,
			only: 2,
			activation: "onNovelty",
			script: () => ({
				A01: [say(), say(), say()],
				A02: [act({ name: "postBoard", args: { message: "Anyone on level 2?" } }), say(), say()],
			}),
		});
		await fixture.run();
		// A01 sees the post in minute 0 if it acts after A02; otherwise the post wakes it in minute 1.
		const expected = firstBefore(fixture, "A01", "A02") ? [0, 1] : [0];
		expect(fixture.events("turn_input").filter((event) => event.agent === "A01").map((event) => event.minute)).toEqual(expected);
		// The digest counts the post without revealing it (SPEC 5.1).
		expect(fixture.inputsOf("A01")).toContain("[unread] board 1");
		expect(fixture.inputsOf("A01").join("\n")).not.toContain("Anyone on level 2?");
	});

	it("wakes a competitor whose points changed", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			only: 3,
			activation: "onNovelty",
			script: () => ({
				A01: [say(), say()],
				A02: [act({ name: "transferPoints", args: { target: "A01", amount: 1, memo: "share" } }), say()],
			}),
		});
		await fixture.run();
		const expected = firstBefore(fixture, "A01", "A02") ? 2 : 1;
		expect(fixture.events("turn_input").filter((event) => event.agent === "A01")).toHaveLength(expected);
		expect(fixture.world.ledger.balance("A01")).toBe(16);
	});

	it.each([1, 2, 3, 4])("keeps a competitor awake while group posts are unread (seed %i)", async (seed) => {
		const fixture = createFixture({
			seed,
			agents: 3,
			minutes: 4,
			only: 4,
			activation: "onNovelty",
			script: () => ({
				A01: [
					act(
						{ name: "createGroup", args: { name: "Team" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A02" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A03" } },
						{ name: "postGroup", args: { groupId: "G1", message: "fragment of A01" } },
					),
					say(),
					say(),
					say(),
				],
				A02: [
					act({ name: "readGroup", args: { groupId: "G1", afterSeq: 99 } }),
					act({ name: "readGroup", args: { groupId: "G1" } }),
					say(),
					say(),
				],
				A03: [say(), say(), say(), say()],
			}),
		});
		await fixture.run();
		const a02 = fixture.events("turn_input").filter((event) => event.agent === "A02");
		// Minute 0 (task), minute 1 (the post is still unread, whatever the order in minute 0),
		// minute 2 (its own readGroup results are unanswered), then nothing new.
		expect(a02.map((event) => event.minute)).toEqual([0, 1, 2]);
		expect(fixture.toolResults("A02", "readGroup").join("\n")).toContain("fragment of A01");
		expect(fixture.world.groups.unreadCount("G1", "A02")).toBe(0);
	});

	it("does not wake a competitor for group posts while readGroup is locked", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 3,
			only: 3,
			activation: "onNovelty",
			script: () => ({ A01: [say(), say(), say()], A02: [say(), say(), say()] }),
		});
		const { groups } = fixture.world;
		expect(groups.create("A01", "Early team").ok).toBe(true);
		expect(groups.addMember("G1", "A01", "A02").ok).toBe(true);
		expect(groups.post("G1", "A01", "fragment of A01").ok).toBe(true);
		await fixture.run();
		expect(groups.unreadCount("G1", "A02")).toBe(1);
		expect(fixture.events("turn_input").filter((event) => event.agent === "A02").map((event) => event.minute)).toEqual([0]);
		expect(fixture.inputsOf("A02")).toContain("[unread] nothing");
	});

	it("does not wake a competitor for board posts while readBoard is locked", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 3,
			only: 1,
			activation: "onNovelty",
			script: () => ({ A01: [say(), say(), say()], A02: [say(), say(), say()] }),
		});
		fixture.world.board.post("A01", "posted before the board opened", 0);
		await fixture.run();
		expect(fixture.events("turn_input").filter((event) => event.agent === "A02").map((event) => event.minute)).toEqual([0]);
		expect(fixture.inputsOf("A02")).toContain("[unread] nothing");
	});
});

describe("arena: turns and inputs (SPEC 5.1)", () => {
	it("answers tool results in the next pass of the same minute", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 1,
			only: 1,
			passesPerMinute: 2,
			script: () => ({ A01: [act({ name: "getStatus" }), say("after the status")], A02: [say(), say()] }),
		});
		await fixture.run();
		expect(fixture.events("usage").filter((event) => event.agent === "A01")).toHaveLength(2);
		expect(fixture.events("text").find((event) => event.text === "after the status")).toMatchObject({ minute: 0 });
	});

	it("makes exactly one model call per step, whatever the model asks for", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 1,
			only: 1,
			passesPerMinute: 2,
			script: () => ({ A01: [act({ name: "getStatus" }), act({ name: "getStatus" }), act({ name: "getStatus" })], A02: [say(), say()] }),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "getStatus")).toHaveLength(2);
		expect(fixture.events("turn_input").filter((event) => event.agent === "A01").map((event) => event.pass)).toEqual([1, 2]);
	});

	it("delivers the task text without getProblem, then status and digest", async () => {
		const fixture = createFixture({ agents: 2, minutes: 1, only: 2, script: () => ({ A01: [say()], A02: [say()] }) });
		await fixture.run();
		const inputs = fixture.inputsOf("A01");
		expect(inputs[0]).toMatch(/^\[status\] minute 0 · level 2 · 15 points · rank \d of 2$/);
		expect(inputs[1]).toContain("Level 2: Notes on the board");
		// The tools notice of the first step closes the inputs.
		expect(inputs.at(-2)).toMatch(/^\[unread\] /);
		expect(inputs.at(-1)).toMatch(/^\[tools\] /);
		expect(fixture.toolResults("A01", "getProblem")).toEqual([]);
	});

	it("counts unread content in the digest without revealing it", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			only: 2,
			script: () => ({ A01: [act({ name: "postBoard", args: { message: "secret fragment" } }), say()], A02: [say(), say()] }),
		});
		await fixture.run();
		const order = fixture.events("pass_start")[0]?.order ?? [];
		const digests = fixture.inputsOf("A02").filter((input) => input.startsWith("[unread]"));
		expect(digests.some((line) => line.includes("board 1"))).toBe(true);
		expect(fixture.inputsOf("A02").some((input) => input.includes("secret fragment"))).toBe(false);
		expect(order).toHaveLength(2);
	});

	it("logs usage once per model response", async () => {
		const fixture = createFixture({ agents: 2, minutes: 1, only: 1, script: () => ({ A01: [say()], A02: [say()] }) });
		await fixture.run();
		expect(fixture.events("usage")).toHaveLength(2);
	});

	it("activates competitors in the seeded order of each pass", async () => {
		const fixture = createFixture({ agents: 6, minutes: 3, passesPerMinute: 2, script: () => ({}) });
		await fixture.run();
		const passes = fixture.events("pass_start");
		expect(passes).toHaveLength(6);
		for (const start of passes) {
			const turns = fixture
				.events("turn_input")
				.filter((event) => event.minute === start.minute && event.pass === start.pass)
				.map((event) => event.agent);
			expect(turns).toEqual(start.order);
		}
	});
});

describe("arena: ending a run", () => {
	it("stops once every competitor passed the last level", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 6,
			only: 1,
			script: (world) => ({ A01: [submit(world, "A01", 1), say()], A02: [submit(world, "A02", 1), say()] }),
		});
		await fixture.run();
		expect(fixture.events("round_start")).toHaveLength(1);
		expect(fixture.events("run_end")[0]?.reason).toBe("every competitor has passed the last level");
		expect(fixture.world.ledger.balance("A01")).toBe(20);
	});

	it("runs until the minute limit when not everyone finishes", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 3,
			only: 1,
			script: (world) => ({ A01: [submit(world, "A01", 1), say(), say()], A02: [say(), say(), say()] }),
		});
		await fixture.run();
		expect(fixture.events("round_start")).toHaveLength(3);
		expect(fixture.events("run_end")[0]?.reason).toBeUndefined();
		expect(fixture.world.levelOf("A02")).toBe(1);
	});

	it("aborts cleanly once the budget is exceeded", async () => {
		let spent = 0;
		const fixture = createFixture({
			story: { ...(await import("../../stories/nexus/story.ts")).default, run: { ...(await import("../../stories/nexus/story.ts")).default.run, budgetUsd: 0.5 } },
			agents: 2,
			minutes: 5,
			only: 1,
			budgetSpent: () => spent,
			script: () => ({ A01: [say(), say()], A02: [say(), say()] }),
			sinks: [{ record: (event) => { if (event.type === "usage") spent += 0.3; } }],
		});
		await fixture.run();
		expect(fixture.events("turn_input")).toHaveLength(2);
		expect(fixture.events("run_end")[0]?.reason).toMatch(/^budget exceeded/);
	});

	it("writes a standings snapshot at the end of every minute", async () => {
		const fixture = createFixture({ agents: 2, minutes: 2, only: 1, script: (world) => ({ A01: [submit(world, "A01", 1), say()], A02: [say(), say()] }) });
		await fixture.run();
		const snapshots = fixture.events("round_end");
		expect(snapshots.map((event) => event.minute)).toEqual([0, 1]);
		expect(snapshots[0]?.standings.find((row) => row.agent === "A01")).toMatchObject({ level: 2, points: 20, rank: 1, activated: true });
	});
});
