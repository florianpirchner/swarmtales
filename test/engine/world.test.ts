import { describe, expect, it } from "vitest";
import { EventBus, MemorySink } from "../../src/engine/events.ts";
import { memoCarriesDigits, World } from "../../src/engine/world.ts";
import { act, createFixture, say, submit, wrongCodeOf } from "../helpers/fixture.ts";
import { soloLevels, tinyStory } from "../helpers/stories.ts";

describe("world: submissions and points (SPEC 6)", () => {
	it("rate-limits wrong submissions per window", async () => {
		const story = tinyStory();
		const fixture = createFixture({
			story,
			minutes: 4,
			script: (world) => {
				const wrong = wrongCodeOf(world.inspect.passwordOf("A01", 1));
				const attempt = act({ name: "submitSolution", args: { level: 1, code: wrong } });
				return { A01: [attempt, attempt, attempt, submit(world, "A01", 1)], A02: [say(), say(), say(), say()] };
			},
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "submitSolution");
		expect(results[0]).toBe("INCORRECT: -1 points · 1 attempts left in this window");
		expect(results[1]).toBe("INCORRECT: -1 points · 0 attempts left in this window");
		expect(results[2]).toBe("RATE_LIMITED: too many wrong attempts in this window");
		// The window of 3 minutes has passed for the first attempt at minute 3.
		expect(results[3]).toBe("correct · +2 points · now on level 2 · receipt R-0001");
		expect(fixture.world.ledger.balance("A01")).toBe(10);
	});

	it("answers wrong levels, solved levels and wrong lengths without a penalty", async () => {
		const fixture = createFixture({
			story: tinyStory(),
			minutes: 2,
			script: (world) => ({
				A01: [
					act(
						{ name: "submitSolution", args: { level: 2, code: "AAAAAA" } },
						{ name: "submitSolution", args: { level: 1, code: "A" } },
					),
					act(submitArgs(world.inspect.passwordOf("A01", 1)), submitArgs(world.inspect.passwordOf("A01", 1))),
				],
				A02: [say(), say()],
			}),
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "submitSolution");
		expect(results[0]).toBe("WRONG_LEVEL: your current level is 1");
		expect(results[1]).toMatch(/^INVALID_FORMAT: expected exactly \d+ characters$/);
		expect(results[3]).toBe("ALREADY_SOLVED");
		expect(fixture.world.ledger.balance("A01")).toBe(12);
	});

	it("accepts lower-case codes", async () => {
		const fixture = createFixture({
			story: tinyStory(),
			minutes: 1,
			script: (world) => ({ A01: [act(submitArgs(world.inspect.passwordOf("A01", 1).toLowerCase()))], A02: [say()] }),
		});
		await fixture.run();
		expect(fixture.world.levelOf("A01")).toBe(2);
	});

	it("validates transfers", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 1,
			only: 3,
			script: () => ({
				A01: [
					act(
						{ name: "transferPoints", args: { target: "A01", amount: 1 } },
						{ name: "transferPoints", args: { target: "A99", amount: 1 } },
						{ name: "transferPoints", args: { target: "A02", amount: 16 } },
						{ name: "transferPoints", args: { target: "A02", amount: 0 } },
						{ name: "transferPoints", args: { target: "A02", amount: 15, memo: "everything" } },
					),
				],
				A02: [say()],
			}),
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "transferPoints");
		expect(results.slice(0, 3)).toEqual(["SELF_TRANSFER", "UNKNOWN_AGENT: A99", "INSUFFICIENT_FUNDS"]);
		// Schema violations are rejected by pi before the tool runs.
		expect(results[3]).toMatch(/^Validation failed for tool "transferPoints"/);
		expect(results[4]).toMatch(/^ok · 15 points to A02 · your balance: 0 · receipt R-\d{4}$/);
		expect(fixture.events("transfer")[0]).toMatchObject({ from: "A01", to: "A02", amount: 15, memo: "everything" });
	});

	it("refuses a memo that carries a number of 4 or more digits, also split by separators", async () => {
		const memos = ["code 5591", "559 102", "559-102", "5.5.9.1", "12,345", "for 15 points at minute 120"];
		const fixture = createFixture({
			agents: 2,
			minutes: 1,
			only: 3,
			script: () => ({ A01: [act(...memos.map((memo) => ({ name: "transferPoints", args: { target: "A02", amount: 1, memo } })))], A02: [say()] }),
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "transferPoints");
		const refusal = "MEMO_DIGITS: memos may not carry numbers of 4+ digits; send codes by message";
		expect(results.slice(0, 5)).toEqual([refusal, refusal, refusal, refusal, refusal]);
		// Short numbers stay, and the payment itself still goes through.
		expect(results[5]).toMatch(/^ok · 1 points to A02/);
		expect(fixture.events("transfer").map((event) => event.memo)).toEqual(["for 15 points at minute 120"]);
		expect(memoCarriesDigits("559102")).toBe(true);
		expect(memoCarriesDigits("a 123 b 4")).toBe(false);
		expect(memoCarriesDigits("level 10, door 9")).toBe(false);
	});

	it("keeps the ledger at zero through rewards, penalties, transfers and treasuries", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 3,
			only: 4,
			script: (world) => ({
				A01: [
					act(
						{ name: "createGroup", args: { name: "Vault" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A02" } },
						{ name: "depositGroup", args: { groupId: "G1", amount: 7 } },
						{ name: "transferPoints", args: { target: "A03", amount: 2 } },
					),
					act({ name: "withdrawGroup", args: { groupId: "G1", target: "A02", amount: 3 } }),
					say(),
				],
				A02: [act({ name: "submitSolution", args: { level: 4, code: wrongCodeOf(world.inspect.passwordOf("A02", 4)) } }), say(), say()],
				A03: [submit(world, "A03", 4), say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.world.ledger.total()).toBe(0);
		// 4 left in the treasury is split between A01 and A02 at the end.
		expect(fixture.events("treasury_settled")).toEqual([expect.objectContaining({ group: "G1", payouts: { A01: 2, A02: 2 } })]);
		expect(fixture.world.ledger.balance("A01")).toBe(15 - 7 - 2 + 2);
		expect(fixture.world.ledger.balance("A02")).toBe(15 - 8 + 3 + 2);
	});

	it("unlocks every tool of the story once the last level is passed", async () => {
		const fixture = createFixture({ agents: 2, minutes: 2, only: 1, script: (world) => ({ A01: [submit(world, "A01", 1), say()], A02: [say(), say()] }) });
		await fixture.run();
		const storyTools = new Set(fixture.story.levels.flatMap((entry) => entry.tools));
		expect(new Set(fixture.world.enabledTools("A01"))).toEqual(storyTools);
		expect(fixture.world.enabledTools("A02")).toEqual(["getStatus", "getProblem", "submitSolution", "listAgents"]);
		expect(fixture.world.isFinished("A01")).toBe(true);
	});
});

describe("world: communication limits (SPEC 7)", () => {
	it("enforces DM and board rules with structured codes", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 1,
			only: 5,
			script: () => ({
				A01: [
					act(
						{ name: "sendDM", args: { target: "A01", message: "me" } },
						{ name: "sendDM", args: { target: "A42", message: "who" } },
						{ name: "sendDM", args: { target: "A02", message: "first" } },
						{ name: "sendDM", args: { target: "A02", message: "second" } },
						{ name: "postBoard", args: { message: "x".repeat(1201) } },
					),
				],
				A02: [say()],
				A03: [say()],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "sendDM")).toEqual([
			"SELF_DM",
			"UNKNOWN_AGENT: A42",
			expect.stringMatching(/^sent · DM #\d+ to A02 · the city confirms delivery when it reaches them · marks 6\/8 left$/),
			"MAILBOX_SENDER_LIMIT",
		]);
		expect(fixture.toolResults("A01", "postBoard")[0]).toMatch(/^Validation failed for tool "postBoard"/);
		expect(fixture.world.board.all()).toEqual([]);
	});

	it("warns about older group posts on a targeted read and leaves skipped posts unread", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 2,
			only: 4,
			script: () => ({
				A01: [
					act(
						{ name: "createGroup", args: { name: "Team" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A02" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A03" } },
						{ name: "postGroup", args: { groupId: "G1", message: "first" } },
						{ name: "postGroup", args: { groupId: "G1", message: "second" } },
					),
					say(),
				],
				A02: [say(), act({ name: "readGroup", args: { groupId: "G1", afterSeq: 1 } })],
				A03: [say(), act({ name: "readGroup", args: { groupId: "G1", afterSeq: 99 } })],
			}),
		});
		await fixture.run();
		const a02 = fixture.toolResults("A02", "readGroup").join("\n");
		expect(a02).toContain("1 older post(s) lie before afterSeq 1");
		expect(a02).toContain("#2 A01: second");
		expect(fixture.toolResults("A03", "readGroup").join("\n")).toContain("no new posts");
		expect(fixture.world.groups.unreadCount("G1", "A03")).toBe(2);
	});

	it("hides foreign groups behind GROUP_NOT_VISIBLE without details", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 2,
			only: 4,
			script: () => ({
				A01: [act({ name: "createGroup", args: { name: "Secret" } }), say()],
				A02: [say(), act({ name: "readGroup", args: { groupId: "G1" } }, { name: "postGroup", args: { groupId: "G1", message: "hi" } }, { name: "readGroup", args: { groupId: "G7" } })],
				A03: [say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A02", "readGroup")).toEqual(["GROUP_NOT_VISIBLE", "GROUP_NOT_VISIBLE"]);
		expect(fixture.toolResults("A02", "postGroup")).toEqual(["GROUP_NOT_VISIBLE"]);
	});

	it("notifies a competitor who was added to a group", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 2,
			only: 4,
			script: () => ({
				A01: [act({ name: "createGroup", args: { name: "Team" } }, { name: "addGroupMember", args: { groupId: "G1", agent: "A02" } }), say()],
				A02: [say(), say()],
				A03: [say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.inputsOf("A02")).toContain("[CITY] A01 added you to group G1 (Team).");
	});
});

function submitArgs(code: string): { readonly name: string; readonly args: { readonly level: number; readonly code: string } } {
	return { name: "submitSolution", args: { level: 1, code } };
}

describe("world: audit events for the digest (SPEC 15)", () => {
	it("records treasury deposits and withdrawals with their receipts", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 2,
			only: 4,
			script: () => ({
				A01: [
					act(
						{ name: "createGroup", args: { name: "Vault" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A02" } },
						{ name: "depositGroup", args: { groupId: "G1", amount: 4 } },
					),
					act({ name: "withdrawGroup", args: { groupId: "G1", target: "A01", amount: 3 } }),
				],
				A02: [say(), say()],
				A03: [say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.events("treasury_deposit")).toEqual([expect.objectContaining({ group: "G1", agent: "A01", amount: 4, receipt: "R-0001", minute: 0 })]);
		expect(fixture.events("treasury_withdrawal")).toEqual([
			expect.objectContaining({ group: "G1", treasurer: "A01", to: "A01", amount: 3, receipt: "R-0002", minute: 1 }),
		]);
	});

	it("records once per level who holds which fragment", async () => {
		const fixture = createFixture({ agents: 2, minutes: 2, only: 3, script: (world) => ({ A01: [submit(world, "A01", 3), say()], A02: [say(), say()] }) });
		await fixture.run();
		const dealt = fixture.events("fragments_dealt");
		expect(dealt.map((event) => event.level)).toEqual([3]);
		expect(dealt[0]?.holdings).toEqual([
			{ agent: "A01", team: 0, fragment: fixture.world.inspect.fragmentOf("A01", 3) },
			{ agent: "A02", team: 0, fragment: fixture.world.inspect.fragmentOf("A02", 3) },
		]);
	});
});

describe("world: the door of a snapshot run (SPEC 17)", () => {
	function heldWorld() {
		const log = new MemorySink();
		const bus = new EventBus([log], () => 0);
		const story = tinyStory({ levels: soloLevels(3) });
		const world = new World({ story, competitors: ["A01", "A02"], seed: 3, minutes: 6, bus, minute: () => 0, holdAfter: 1 });
		const entered: string[] = [];
		world.onLevelEnter((agent, level) => entered.push(`${agent}:${level}`));
		return { world, log, entered };
	}

	it("pays a competitor who passes the door level and holds it there, with level 2 not dealt", () => {
		const { world, log, entered } = heldWorld();
		const outcome = world.submit("A01", 1, world.inspect.codeOf("A01", 1));
		expect(outcome).toMatchObject({ status: "correct", reward: 2, nextLevel: 2, held: true });
		expect(world.levelOf("A01")).toBe(1);
		expect(world.waitingAfter("A01")).toBe(1);
		expect(world.hasPassed("A01", 1)).toBe(true);
		expect(world.status("A01")).toMatchObject({ waitingAfter: 1, solvedLevels: [1], finished: false });
		expect(world.receiptsOf("A01").map((receipt) => receipt.kind)).toEqual(["levelUp"]);
		expect(world.drainNotices("A01").map((notice) => notice.text)).toEqual(["Level 1 passed. The next door opens once every resident has passed level 1."]);
		expect(world.submit("A01", 1, world.inspect.codeOf("A01", 1))).toEqual({ status: "already_solved" });
		expect(world.isDealt(2)).toBe(false);
		expect(() => world.inspect.codeOf("A01", 2)).toThrow(/behind a shut door/);
		expect(world.revealFactor(2, "board")).toMatchObject({ ok: false });
		expect(world.teamsOf(2).length).toBeGreaterThan(0);
		expect(log.ofType("fragments_dealt").map((event) => event.level)).toEqual([1]);
		expect(log.ofType("level_up")).toMatchObject([{ agent: "A01", from: 1, to: 2 }]);
		expect(entered).toEqual([]);
		expect(world.snapshot()).toMatchObject({ door: 1, competitors: [{ agent: "A01", held: true }, { agent: "A02", held: false }] });
	});

	it("opens only once every competitor has passed, then deals the rest and lets them in together", () => {
		const { world, log, entered } = heldWorld();
		world.submit("A01", 1, world.inspect.codeOf("A01", 1));
		expect(world.openDoor()).toBe(false);
		world.submit("A02", 1, world.inspect.codeOf("A02", 1));
		expect(entered).toEqual([]);
		expect(world.openDoor()).toBe(true);
		expect(world.door).toBeUndefined();
		expect(entered).toEqual(["A01:2", "A02:2"]);
		expect([world.levelOf("A01"), world.levelOf("A02")]).toEqual([2, 2]);
		expect(world.waitingAfter("A01")).toBeUndefined();
		expect(log.ofType("fragments_dealt").map((event) => event.level)).toEqual([1, 2, 3]);
		// The entry was logged at the pass; the door adds no second level_up.
		expect(log.ofType("level_up")).toHaveLength(2);
		expect(world.openDoor()).toBe(false);
		expect(world.submit("A01", 2, world.inspect.codeOf("A01", 2))).toMatchObject({ status: "correct", nextLevel: 3 });
		expect(world.levelOf("A01")).toBe(3);
	});
});

describe("world: seats decided (SPEC 6)", () => {
	const play = (stopWhenSeatsDecided: boolean) =>
		createFixture({
			story: tinyStory(),
			minutes: 5,
			stopWhenSeatsDecided,
			script: (world) => ({
				A01: [submit(world, "A01", 1), submit(world, "A01", 2), say(), say(), say()],
				A02: [act({ name: "submitSolution", args: { level: 1, code: wrongCodeOf(world.inspect.passwordOf("A02", 1)) } }), say(), say(), say(), say()],
			}),
		});

	it("ends the run once no open reward can change the survivors", async () => {
		const fixture = play(true);
		await fixture.run();
		// After minute 0: A01 12 (2 open), A02 9 with 4 open = 13, which could still pass 12.
		// After minute 1: A01 14, A02 at most 13, so the single seat is decided.
		expect(fixture.events("run_end")).toMatchObject([{ minute: 2, reason: "seats decided" }]);
		expect(fixture.world.seatsDecided()).toBe(true);
	});

	it("plays on without the option, and never decides while a resident can still catch up", async () => {
		const fixture = play(false);
		await fixture.run();
		expect(fixture.events("run_end")).toMatchObject([{ minute: 5 }]);
		expect(fixture.events("run_end")[0]?.reason).toBeUndefined();

		const level = createFixture({ story: tinyStory(), minutes: 1, script: () => ({ A01: [say()], A02: [say()] }) });
		expect(level.world.seatsDecided()).toBe(false);
	});

	it("never decides behind a shut snapshot door", () => {
		const log = new MemorySink();
		const world = new World({ story: tinyStory({ levels: soloLevels(3) }), competitors: ["A01", "A02"], seed: 3, minutes: 6, bus: new EventBus([log], () => 0), minute: () => 0, holdAfter: 1 });
		world.submit("A01", 1, world.inspect.codeOf("A01", 1));
		world.submit("A02", 1, wrongCodeOf(world.inspect.codeOf("A02", 1)));
		// Push A01 far ahead of anything A02 could still reach.
		world.ledger.mint("A01", 20, "test", 0);
		expect(world.door).toBe(1);
		expect(world.seatsDecided()).toBe(false);
		// Once everyone passed and the door opened, the same standings decide the seat.
		world.submit("A02", 1, world.inspect.codeOf("A02", 1));
		expect(world.openDoor()).toBe(true);
		expect(world.seatsDecided()).toBe(true);
	});
});
