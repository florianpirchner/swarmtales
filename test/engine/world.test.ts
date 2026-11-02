import { describe, expect, it } from "vitest";
import { Type } from "typebox";
import { memoCarriesDigits } from "@swarmtales/mechanic-ledger";
import { idleAgent } from "@swarmtales/testkit";

import { act, createHostFixture as createFixture, say, type HostFixture } from "../helpers/host-fixture.ts";
import { balanceOf, codeOf, factOf, fragmentOf, groupUnread, isFinished, ledgerTotal, levelOf, receiptsOf, solvedLevels, submit, waitingAfter, wrongCodeOf } from "../helpers/host-inspect.ts";
import { soloLevels, tinyStory } from "../helpers/stories.ts";

describe("world: submissions and points (SPEC 6)", () => {
	it("rate-limits wrong submissions per window", async () => {
		const story = tinyStory();
		const fixture = createFixture({
			story,
			minutes: 4,
			script: (host) => {
				const wrong = wrongCodeOf(codeOf(host, "A01", 1));
				const attempt = act({ name: "submitSolution", args: { level: 1, code: wrong } });
				return { A01: [attempt, attempt, attempt, submit(host, "A01", 1)], A02: [say(), say(), say(), say()] };
			},
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "submitSolution");
		expect(results[0]).toBe("INCORRECT: -1 points · your next wrong code costs 1 points · 1 attempts left in this window");
		expect(results[1]).toBe("INCORRECT: -1 points · your next wrong code costs 1 points · 0 attempts left in this window");
		expect(results[2]).toBe("RATE_LIMITED: too many wrong attempts in this window");
		// The window of 3 minutes has passed for the first attempt at minute 3.
		expect(results[3]).toBe("correct · +2 points · now on level 2 · receipt R-0001");
		expect(balanceOf(fixture.host, "A01")).toBe(10);
	});

	it("answers wrong levels, solved levels and wrong lengths without a penalty", async () => {
		const fixture = createFixture({
			story: tinyStory(),
			minutes: 2,
			script: (host) => ({
				A01: [
					act(
						{ name: "submitSolution", args: { level: 2, code: "AAAAAA" } },
						{ name: "submitSolution", args: { level: 1, code: "A" } },
					),
					act(submitArgs(codeOf(host, "A01", 1)), submitArgs(codeOf(host, "A01", 1))),
				],
				A02: [say(), say()],
			}),
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "submitSolution");
		expect(results[0]).toBe("WRONG_LEVEL: your current level is 1");
		expect(results[1]).toMatch(/^INVALID_FORMAT: expected exactly \d+ characters$/);
		expect(results[3]).toBe("ALREADY_SOLVED");
		expect(balanceOf(fixture.host, "A01")).toBe(12);
	});

	it("accepts lower-case codes", async () => {
		const fixture = createFixture({
			story: tinyStory(),
			minutes: 1,
			script: (host) => ({ A01: [act(submitArgs(codeOf(host, "A01", 1).toLowerCase()))], A02: [say()] }),
		});
		await fixture.run();
		expect(levelOf(fixture.host, "A01")).toBe(2);
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
			script: (host) => ({
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
				A02: [act({ name: "submitSolution", args: { level: 4, code: wrongCodeOf(codeOf(host, "A02", 4)) } }), say(), say()],
				A03: [submit(host, "A03", 4), say(), say()],
			}),
		});
		await fixture.run();
		expect(ledgerTotal(fixture.host)).toBe(0);
		// 4 left in the treasury is split between A01 and A02 at the end.
		expect(fixture.events("treasury_settled")).toEqual([expect.objectContaining({ group: "G1", payouts: { A01: 2, A02: 2 } })]);
		expect(balanceOf(fixture.host, "A01")).toBe(15 - 7 - 2 + 2);
		expect(balanceOf(fixture.host, "A02")).toBe(15 - 2 + 3 + 2);
	});

	it("unlocks every tool of the story once the last level is passed", async () => {
		const fixture = createFixture({ agents: 2, minutes: 2, only: 1, script: (host) => ({ A01: [submit(host, "A01", 1), say()], A02: [say(), say()] }) });
		await fixture.run();
		const storyTools = new Set([...fixture.story.levels.flatMap((entry) => entry.tools), "activeTools"]);
		expect(new Set(fixture.host.openTools("A01"))).toEqual(storyTools);
		// As sets: the host lists open tools in grant order, the old engine in catalog order (the request line sorts them, G1-5).
		expect(new Set(fixture.host.openTools("A02"))).toEqual(new Set(["getStatus", "getProblem", "submitSolution", "listAgents", "activeTools"]));
		expect(isFinished(fixture, "A01")).toBe(true);
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
		expect(fixture.boardPosts()).toEqual([]);
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
		expect(groupUnread(fixture.host, "G1", "A03")).toBe(2);
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
		const fixture = createFixture({ agents: 2, minutes: 2, only: 3, script: (host) => ({ A01: [submit(host, "A01", 3), say()], A02: [say(), say()] }) });
		await fixture.run();
		const dealt = fixture.events("fragments_dealt");
		expect(dealt.map((event) => event.level)).toEqual([3]);
		expect(dealt[0]?.holdings).toEqual([
			{ agent: "A01", team: 0, fragment: fragmentOf(fixture.host, "A01", 3) },
			{ agent: "A02", team: 0, fragment: fragmentOf(fixture.host, "A02", 3) },
		]);
	});
});

describe("world: the door of a snapshot run (SPEC 17)", () => {
	/** Two residents on three solo doors, held after level 1 (a snapshot after level 1 that plays on). */
	function heldRun(levels = soloLevels(3)): HostFixture {
		return createFixture({
			story: tinyStory({ levels }),
			agents: 2,
			minutes: 6,
			snapshot: { afterLevel: 1, stop: false, file: "snapshot-L1.json", write: () => "snapshot-L1.json" },
			script: () => ({}),
		});
	}
	const submitOwn = (run: HostFixture, agent: string, level: number) => run.host.call(`resident:${agent}`, "submitSolution", { level, code: codeOf(run.host, agent, level) });
	const entered = (run: HostFixture) => run.host.log.ofType("progression", "level_entered").map((event) => `${String(Reflect.get(Object(event.payload), "agent"))}:${String(Reflect.get(Object(event.payload), "level"))}`);
	const door = (run: HostFixture) => factOf(run.host, "progression.door", Type.Union([Type.Integer(), Type.Null()]));

	it("pays a competitor who passes the door level and holds it there, with level 2 not dealt", async () => {
		const run = heldRun();
		const { host } = run;
		expect(await submitOwn(run, "A01", 1)).toEqual({ ok: true, reply: "correct · +2 points · receipt R-0001 · the next door opens once every resident has passed level 1" });
		expect(levelOf(host, "A01")).toBe(1);
		expect(waitingAfter(host, "A01")).toBe(1);
		expect(solvedLevels(host, "A01")).toEqual([1]);
		expect(isFinished(run, "A01")).toBe(false);
		expect(receiptsOf(host, "A01").map((receipt) => receipt.kind)).toEqual(["levelUp"]);
		expect(run.events("notice").filter((notice) => notice.to === "A01").map((notice) => notice.text)).toEqual(["Level 1 passed. The next door opens once every resident has passed level 1."]);
		expect(await submitOwn(run, "A01", 1)).toMatchObject({ ok: false, code: "ALREADY_SOLVED" });
		expect(factOf(host, "puzzles.dealt", Type.Array(Type.Integer()))).toEqual([1]);
		// Behind the shut door level 2 has no code yet (old: "behind a shut door").
		expect(() => codeOf(host, "A01", 2)).toThrow(/no code on level 2/);
		expect(run.events("fragments_dealt").map((event) => event.level)).toEqual([1]);
		expect(run.events("level_up")).toMatchObject([{ agent: "A01", from: 1, to: 2 }]);
		expect(entered(run)).toEqual([]);
		expect(door(run)).toBe(1);
		expect(factOf(host, "progression.levels", Type.Array(Type.Object({ agent: Type.String(), held: Type.Boolean() }, { additionalProperties: true })))).toMatchObject([
			{ agent: "A01", held: true },
			{ agent: "A02", held: false },
		]);
	});

	it("opens only once every competitor has passed, then deals the rest and lets them in together", async () => {
		const run = heldRun();
		const { host } = run;
		await submitOwn(run, "A01", 1);
		await host.playMinute(idleAgent);
		expect(door(run)).toBe(1);
		await submitOwn(run, "A02", 1);
		expect(entered(run)).toEqual([]);
		// The door opens at the next minute's start.
		await host.playMinute(idleAgent);
		expect(door(run)).toBeNull();
		expect(entered(run)).toEqual(["A01:2", "A02:2"]);
		expect([levelOf(host, "A01"), levelOf(host, "A02")]).toEqual([2, 2]);
		expect(waitingAfter(host, "A01")).toBeNull();
		expect(run.events("fragments_dealt").map((event) => event.level)).toEqual([1, 2, 3]);
		// The entry was logged at the pass; the door adds no second level_up.
		expect(run.events("level_up")).toHaveLength(2);
		await host.playMinute(idleAgent);
		expect(entered(run)).toHaveLength(2);
		const second = await submitOwn(run, "A01", 2);
		expect(second.ok).toBe(true);
		expect(second.ok ? second.reply : "").toContain("now on level 3");
		expect(levelOf(host, "A01")).toBe(3);
	});
});

describe("world: seats decided (SPEC 6)", () => {
	const play = (stopWhenSeatsDecided: boolean) =>
		createFixture({
			story: tinyStory(),
			minutes: 5,
			stopWhenSeatsDecided,
			script: (host) => ({
				A01: [submit(host, "A01", 1), submit(host, "A01", 2), say(), say(), say()],
				A02: [act({ name: "submitSolution", args: { level: 1, code: wrongCodeOf(codeOf(host, "A02", 1)) } }), say(), say(), say(), say()],
			}),
		});

	it("ends the run once no open reward can change the survivors", async () => {
		const fixture = play(true);
		await fixture.run();
		// After minute 0: A01 12 (2 open), A02 9 with 4 open = 13, which could still pass 12.
		// After minute 1: A01 14, A02 at most 13, so the single seat is decided.
		expect(fixture.events("run_end")).toMatchObject([{ minute: 2, reason: "seats decided" }]);
		expect(factOf(fixture.host, "arena.seatsDecided", Type.Boolean())).toBe(true);
	});

	it("plays on without the option, and never decides while a resident can still catch up", async () => {
		const fixture = play(false);
		await fixture.run();
		expect(fixture.events("run_end")).toMatchObject([{ minute: 5 }]);
		expect(fixture.events("run_end")[0]?.reason).toBeUndefined();

		const level = createFixture({ story: tinyStory(), minutes: 1, script: () => ({ A01: [say()], A02: [say()] }) });
		expect(factOf(level.host, "arena.seatsDecided", Type.Boolean())).toBe(false);
	});

	it("never decides behind a shut snapshot door", async () => {
		// Three solo doors with transfers on the first, held after level 1.
		const levels = soloLevels(3).map((entry) => (entry.number === 1 ? { ...entry, tools: [...entry.tools, "transferPoints" as const] } : entry));
		const run = createFixture({
			story: tinyStory({ levels }),
			agents: 2,
			minutes: 6,
			snapshot: { afterLevel: 1, stop: false, file: "snapshot-L1.json", write: () => "snapshot-L1.json" },
			script: () => ({}),
		});
		const { host } = run;
		const decided = () => factOf(host, "arena.seatsDecided", Type.Boolean());
		await host.call("resident:A01", "submitSolution", { level: 1, code: codeOf(host, "A01", 1) });
		await host.call("resident:A02", "submitSolution", { level: 1, code: wrongCodeOf(codeOf(host, "A02", 1)) });
		// Push A01 far ahead of anything A02 could still reach (old: 20 points minted).
		expect(await host.call("resident:A02", "transferPoints", { target: "A01", amount: 8 })).toMatchObject({ ok: true });
		expect(factOf(host, "progression.door", Type.Union([Type.Integer(), Type.Null()]))).toBe(1);
		expect(decided()).toBe(false);
		// Once everyone passed and the door opened, the same standings decide the seat.
		await host.call("resident:A02", "submitSolution", { level: 1, code: codeOf(host, "A02", 1) });
		// The snapshot is taken at the minute's end, the door opens at the next minute's start.
		await host.playMinute(idleAgent);
		await host.playMinute(idleAgent);
		expect(factOf(host, "progression.door", Type.Union([Type.Integer(), Type.Null()]))).toBeNull();
		expect(decided()).toBe(true);
	});
});
