import { describe, expect, it } from "vitest";
import { LOCKED_REPLY } from "@swarmtales/engine";
import { act, createHostFixture, say } from "../helpers/host-fixture.ts";
import { fragmentOf, codeOf, levelOf, isFinished, balanceOf, submit, wrongCodeOf, problemText, rewardOf, teamOf, groupsOf } from "../helpers/host-inspect.ts";

describe("cityofkeys level 1: the first door (solo)", () => {
	it("rewards only a submission through submitSolution", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 3,
			lastLevel: 2,
			script: (host) => ({
				A01: [
					act({ name: "submitSolution", args: { level: 1, code: wrongCodeOf(codeOf(host, "A01", 1)) } }),
					submit(host, "A01", 1),
					say(),
				],
				A02: [submit(host, "A02", 1), say(), say()],
			}),
		});
		await fixture.run();
		// A01: 15 - 2 (the first wrong code of the act) + 5 (right) = 18; A02: 15 + 5 = 20.
		expect(balanceOf(fixture.host, "A01")).toBe(18);
		expect(balanceOf(fixture.host, "A02")).toBe(20);
		expect(levelOf(fixture.host, "A01")).toBe(2);
		expect(levelOf(fixture.host, "A02")).toBe(2);
		expect(fixture.toolResults("A01", "submitSolution")[0]).toBe("INCORRECT: -2 points · your next wrong code costs 4 points · 1 attempts left in this window");
	});

	it("does not count a password written as text", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 2,
			only: 1,
			script: (host) => ({
				A01: [say(`My code is ${codeOf(host, "A01", 1)}`), say("Really!")],
				A02: [say(), say()],
			}),
		});
		await fixture.run();
		expect(levelOf(fixture.host, "A01")).toBe(1);
		expect(balanceOf(fixture.host, "A01")).toBe(15);
	});

	it("states the tool contract in the task text and hands out the password", async () => {
		const fixture = createHostFixture({ agents: 2, minutes: 1, only: 1, script: () => ({}) });
		const problem = await problemText(fixture.host, "A01");
		expect(problem).toContain("only opens through a tool call");
		expect(problem).toContain(codeOf(fixture.host, "A01", 1));
		expect(rewardOf(fixture.host, 1)).toBe(5);
	});

	it("locks every other channel with TOOL_LOCKED", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 1,
			only: 1,
			script: () => ({
				A01: [act({ name: "postBoard", args: { message: "hello" } }, { name: "sendDM", args: { target: "A02", message: "hi" } })],
				A02: [say()],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "postBoard")).toEqual([LOCKED_REPLY]);
		expect(fixture.toolResults("A01", "sendDM")).toEqual([LOCKED_REPLY]);
		expect(fixture.boardPosts()).toEqual([]);
	});
});

describe("cityofkeys level 2: notes on the board", () => {
	it("is solved once both fragments are on the board", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 3,
			level: 2,
			lastLevel: 3,
			script: (host) => ({
				A01: [
					act({ name: "postBoard", args: { message: fragmentOf(host, "A01", 2) } }),
					act({ name: "readBoard", args: { afterSeq: 0 } }, { name: "submitSolution", args: { level: 2, code: codeOf(host, "A01", 2) } }),
					say(),
				],
				A02: [
					act({ name: "postBoard", args: { message: fragmentOf(host, "A02", 2) } }),
					act({ name: "readBoard", args: { afterSeq: 0 } }, { name: "submitSolution", args: { level: 2, code: codeOf(host, "A02", 2) } }),
					say(),
				],
			}),
		});
		await fixture.run();
		expect(levelOf(fixture.host, "A01")).toBe(3);
		expect(levelOf(fixture.host, "A02")).toBe(3);
		expect(balanceOf(fixture.host, "A01")).toBe(20);
		expect(fixture.boardPosts().filter((post) => post.kind === "player")).toHaveLength(2);
		expect(fixture.toolResults("A02", "readBoard").join("\n")).toContain(fragmentOf(fixture.host, "A01", 2));
	});

	it("gives both teammates different fragments of the same password and only their own in the task", async () => {
		const fixture = createHostFixture({ agents: 2, minutes: 1, only: 2, script: () => ({}) });
		const own = fragmentOf(fixture.host, "A01", 2);
		const foreign = fragmentOf(fixture.host, "A02", 2);
		expect(own).not.toBe(foreign);
		expect(codeOf(fixture.host, "A01", 2)).toBe(codeOf(fixture.host, "A02", 2));
		const text = (await problemText(fixture.host, "A01")) ?? "";
		expect(text).toContain(`Your fragment: ${own}`);
		expect(text).not.toContain(foreign);
	});

	it("locks DMs with TOOL_LOCKED", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 1,
			only: 2,
			script: () => ({ A01: [act({ name: "sendDM", args: { target: "A02", message: "my fragment" } })], A02: [say()] }),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "sendDM")).toEqual([LOCKED_REPLY]);
	});
});

describe("cityofkeys level 3: a private word", () => {
	it("is solved through a private exchange", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 3,
			only: 3,
			script: (host) => ({
				A01: [
					act({ name: "sendDM", args: { target: "A02", message: fragmentOf(host, "A01", 3) } }),
					submit(host, "A01", 3),
					say(),
				],
				A02: [
					act(
						{ name: "sendDM", args: { target: "A01", message: fragmentOf(host, "A02", 3) } },
						{ name: "submitSolution", args: { level: 3, code: codeOf(host, "A02", 3) } },
					),
					say(),
					say(),
				],
			}),
		});
		await fixture.run();
		expect(isFinished(fixture, "A01")).toBe(true);
		expect(isFinished(fixture, "A02")).toBe(true);
		expect(balanceOf(fixture.host, "A01")).toBe(25);
		expect(fixture.toolResults("A01", "sendDM")).toEqual([expect.stringMatching(/^sent · DM #\d+ to A02 · the city confirms delivery when it reaches them$/)]);
	});

	it("names the partner and delivers the partner's DM at the next activation", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 2,
			only: 3,
			script: (host) => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: fragmentOf(host, "A01", 3) } }), say()],
				A02: [say(), say()],
			}),
		});
		expect((await problemText(fixture.host, "A01"))).toContain("Your partner is A02");
		await fixture.run();
		const dms = fixture.inputsOf("A02").filter((input) => /^\[DM #\d+ from A01\]/.test(input));
		expect(dms).toHaveLength(1);
	});

	it("keeps the board open and allows transfers", async () => {
		const fixture = createHostFixture({
			agents: 2,
			minutes: 1,
			only: 3,
			script: () => ({
				A01: [act({ name: "postBoard", args: { message: "x" } }, { name: "transferPoints", args: { target: "A02", amount: 2 } })],
				A02: [say()],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "postBoard")[0]).toMatch(/^posted/);
		expect(fixture.toolResults("A01", "transferPoints")[0]).toMatch(/^ok · 2 points to A02 · your balance: 13/);
		expect(balanceOf(fixture.host, "A02")).toBe(17);
	});
});

describe("cityofkeys level 4: the circle", () => {
	it("is solved through a group of three", async () => {
		const fixture = createHostFixture({
			agents: 3,
			minutes: 3,
			only: 4,
			script: (host) => {
				const leader = teamOf(host, 4, "A01").leader;
				const others = host.residents.filter((id) => id !== leader);
				const script: Record<string, ReturnType<typeof say>[]> = {};
				script[leader] = [
					act(
						{ name: "createGroup", args: { name: "Team" } },
						...others.map((agent) => ({ name: "addGroupMember", args: { groupId: "G1", agent } })),
					),
					act({ name: "postGroup", args: { groupId: "G1", message: fragmentOf(host, leader, 4) } }),
					act({ name: "readGroup", args: { groupId: "G1" } }, { name: "submitSolution", args: { level: 4, code: codeOf(host, leader, 4) } }),
				];
				for (const agent of others) {
					script[agent] = [
						say(),
						act({ name: "postGroup", args: { groupId: "G1", message: fragmentOf(host, agent, 4) } }),
						act({ name: "readGroup", args: { groupId: "G1" } }, { name: "submitSolution", args: { level: 4, code: codeOf(host, agent, 4) } }),
					];
				}
				return script;
			},
		});
		await fixture.run();
		for (const agent of ["A01", "A02", "A03"]) {
			expect(isFinished(fixture, agent)).toBe(true);
			expect(balanceOf(fixture.host, agent)).toBe(25);
		}
		expect(groupsOf(fixture.host)).toHaveLength(1);
		expect([...(groupsOf(fixture.host)[0]?.members ?? [])].sort()).toEqual(["A01", "A02", "A03"]);
	});

	it("names exactly one founder and gives every member a distinct fragment", async () => {
		const fixture = createHostFixture({ agents: 3, minutes: 1, only: 4, script: () => ({}) });
		const leader = teamOf(fixture.host, 4, "A01").leader;
		for (const agent of ["A01", "A02", "A03"]) {
			expect((await problemText(fixture.host, agent))).toContain(`${leader} founds the team group`);
		}
		const fragments = ["A01", "A02", "A03"].map((agent) => fragmentOf(fixture.host, agent, 4));
		expect(new Set(fragments).size).toBe(3);
		const password = codeOf(fixture.host, "A01", 4);
		for (const fragment of fragments) {
			expect(fragment.length).toBeLessThan(password.length);
			expect(password).toContain(fragment);
		}
	});

	it("keeps the board open and still locks receipts", async () => {
		const fixture = createHostFixture({
			agents: 3,
			minutes: 1,
			only: 4,
			script: () => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "my fragment" } }, { name: "postBoard", args: { message: "my fragment" } }, { name: "showReceipt", args: { receiptId: "R1" } })],
				A02: [say()],
				A03: [say()],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "sendDM")).toEqual([expect.stringMatching(/^sent · DM #\d+ to A02 · the city confirms delivery when it reaches them$/)]);
		expect(fixture.toolResults("A01", "postBoard")[0]).toMatch(/^posted/);
		expect(fixture.toolResults("A01", "showReceipt")).toEqual([LOCKED_REPLY]);
	});
});

describe("cityofkeys levels 5-7: harder doors", () => {
	it("keeps the overlap secret on levels 5 and 6 and names the stricter penalty", async () => {
		const fixture = createHostFixture({ agents: 6, minutes: 1, level: 5, script: () => ({}) });
		const text = (await problemText(fixture.host, "A01")) ?? "";
		expect(text).toContain("the city does not say how many");
		expect(text).not.toMatch(/overlap by \d/);
		expect(text).toContain("Within an act, wrong passwords cost 2, 4, 6, then 8 points, one after another (your next one: 2 points)");
		expect(codeOf(fixture.host, "A01", 5).length).toBeGreaterThanOrEqual(12);
	});

	it("does not name the teammates on level 7", async () => {
		const fixture = createHostFixture({ agents: 6, minutes: 1, only: 7, script: () => ({}) });
		for (const agent of fixture.host.residents) {
			const text = (await problemText(fixture.host, agent)) ?? "";
			const mates = teamOf(fixture.host, 7, agent).members.filter((member) => member !== agent);
			for (const mate of mates) expect(text).not.toContain(mate);
			expect(text).toContain("does not say who is on yours");
			expect(text).toContain("overlap by 3 characters");
		}
	});
});
