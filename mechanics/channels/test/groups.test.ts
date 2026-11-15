// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Groups and treasuries of `channels`, carried from the old `test/mechanics/channels/groups.test.ts`: with the real
 * ledger, a stand-in for the provider of `receipt-source` and a stand-in for the mechanic that founds the city's
 * groups (the old script driver). The marks of a group post and the names of residents wait for M5-14 and M5-17.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { ReceiptSourceService } from "@swarmtales/mechanic-contracts";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, defineHead, defineMechanic, reply, type Game } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, idleDriver, testKernel, type TestKernel } from "@swarmtales/testkit";
import { ChannelsEvents, ChannelsService } from "../src/contract.ts";
import { channels } from "../src/index.ts";
import { withoutGroups } from "../src/state.ts";
import { payloads, say } from "./support.ts";

const receiptId = (count: number): string => `R-${String(count).padStart(4, "0")}`;

/** Stands in for `receipts`: it names the coming receipt of a booking and issues it in its listener, as A64 says. */
const receipts = defineMechanic(
	defineHead({
		id: "receipts",
		package: "@test/receipts",
		summary: "Test: stands in for the provider of receipt-source.",
		state: Type.Object({ issued: Type.Integer({ description: "Receipts issued." }) }, { description: "The count." }),
		start: () => ({ issued: 0 }),
		provides: [ReceiptSourceService],
	}),
	{
		services: { "receipt-source": { ofTransfer: (_input, ctx) => receiptId(ctx.state.issued + 1), ofMessage: () => null } },
		listeners: (kit) => [
			kit.listen(ChannelsEvents, "treasury_deposit", (_payload, ctx) => {
				ctx.state.issued += 1;
			}),
			kit.listen(ChannelsEvents, "treasury_withdrawal", (_payload, ctx) => {
				ctx.state.issued += 1;
			}),
		],
	},
);

/** Stands in for the mechanic that founds, posts in and removes the city's groups (the old script driver). */
const city = defineMechanic(
	defineHead({
		id: "hall",
		package: "@test/hall",
		summary: "Test: founds the city's groups.",
		requires: [ChannelsService],
		tools: {
			found: { description: "Found a city group.", params: Type.Object({ name: Type.String(), members: Type.Array(Type.String()) }), for: ["resident"] },
			speak: { description: "Post in a city group.", params: Type.Object({ group: Type.String(), text: Type.String() }), for: ["resident"] },
			dissolve: { description: "Remove a city group.", params: Type.Object({ group: Type.String() }), for: ["resident"] },
			look: { description: "Read a group and a post.", params: Type.Object({ group: Type.String(), number: Type.Integer() }), for: ["resident"] },
		},
	}),
	{
		tools: {
			found: { run: (params, ctx) => reply(JSON.stringify(ctx.call(ChannelsService, "createCityGroup", params))) },
			speak: { run: (params, ctx) => reply(JSON.stringify(ctx.call(ChannelsService, "postGroupAsCity", params))) },
			dissolve: { run: (params, ctx) => reply(JSON.stringify(ctx.call(ChannelsService, "removeCityGroup", params))) },
			look: {
				run: (params, ctx) => {
					const seen = [ctx.call(ChannelsService, "group", { group: params.group }), ctx.call(ChannelsService, "groupPost", { number: params.number })];
					return reply(JSON.stringify([...seen, ctx.call(ChannelsService, "couldRead", { group: params.group, reader: "A03", number: params.number })]));
				},
			},
		},
	},
);

function game(ticks = 4, activation = "always"): Game {
	return defineGame({
		id: "groups-test",
		seed: 7,
		residents: 3,
		mechanics: [ledger({ startPoints: 10 }), channels(), receipts(), city()],
		scheduler: { id: "turns", options: { order: "roster", activation } },
		end: { ticks },
	});
}

const CIRCLE = "id: G1 · name: Circle · members: A01 · treasury: 0 · treasurer: A01 (you) · role: founder";
const events = (test: TestKernel, type: string): readonly unknown[] => payloads(test.kernel.log.all(), type);
const bookings = (test: TestKernel): readonly unknown[] =>
	test.kernel.log.all().flatMap((event) => (event.type === "ledger_entry" && JSON.stringify(event.payload).includes("GROUP:") ? [event.payload] : []));

describe("groups", () => {
	it("founds a group that only members know of", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "createGroup", { name: "  Circle  " })).toBe(`created · ${CIRCLE}`);
		expect(events(test, "group_created")).toEqual([{ group: "G1", founder: "A01", name: "Circle" }]);
		expect(await say(test, "A02", "postGroup", { groupId: "G1", message: "hello" })).toBe("GROUP_NOT_VISIBLE");
		expect(await say(test, "A02", "readGroup", { groupId: "G1" })).toBe("GROUP_NOT_VISIBLE");
		expect(await say(test, "A02", "listMyGroups", {})).toBe("no groups");
		expect(await say(test, "A01", "listMyGroups", {})).toBe(CIRCLE);
		expect(await say(test, "A01", "createGroup", { name: "Two" })).toContain("G2");
		expect(await say(test, "A01", "createGroup", { name: "Three" })).toContain("G3");
		expect(await say(test, "A01", "createGroup", { name: "Four" })).toBe("GROUP_LIMIT: at most 3 founded groups");
	});

	it("adds members, who hear of it and read only what comes after they joined", async () => {
		const test = testKernel(game());
		await say(test, "A01", "createGroup", { name: "Circle" });
		await say(test, "A01", "postGroup", { groupId: "G1", message: "before" });
		expect(await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A99" })).toBe("UNKNOWN_AGENT: A99");
		expect(await say(test, "A02", "addGroupMember", { groupId: "G1", agent: "A03" })).toBe("GROUP_NOT_VISIBLE");
		expect(await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A02" })).toContain("members: A01, A02");
		expect(await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A02" })).toBe("ALREADY_MEMBER: A02");
		expect(events(test, "notice")).toEqual([{ to: "A02", author: "CITY", text: "A01 added you to group G1 (Circle)." }]);
		expect(events(test, "group_membership")).toEqual([{ group: "G1", agent: "A02", change: "added", by: "A01" }]);
		expect(await say(test, "A01", "postGroup", { groupId: "G1", message: "after" })).toBe("posted · G1 #2");
		expect(await say(test, "A02", "readGroup", { groupId: "G1" })).toBe("#2 A01: after");
		expect(await say(test, "A02", "readGroup", { groupId: "G1", afterSeq: 0 })).toContain("#2 A01: after");
		expect(events(test, "group_post")).toEqual([
			{ group: "G1", author: "A01", postSeq: 1, text: "before" },
			{ group: "G1", author: "A01", postSeq: 2, text: "after" },
		]);
		// The tool's own rule refuses an empty post before any later stage; the hint names older posts.
		expect(await say(test, "A01", "postGroup", { groupId: "G1", message: "   " })).toBe("INVALID_TEXT: 1-800 characters");
		expect(await say(test, "A01", "readGroup", { groupId: "G1", afterSeq: 2 })).toBe(
			"Note: 2 older post(s) lie before afterSeq 2. Read without afterSeq for unread posts, or with afterSeq 0 for the full history.\n\nno new posts",
		);
	});

	it("keeps the treasurer in the group and lets only the treasurer withdraw, with the coming receipt", async () => {
		const test = testKernel(game());
		await say(test, "A01", "createGroup", { name: "Circle" });
		await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A02" });
		expect(await say(test, "A01", "leaveGroup", { groupId: "G1" })).toBe("TREASURER_ACTIVE: hand over the treasury first");
		expect(await say(test, "A02", "depositGroup", { groupId: "G1", amount: 4 })).toBe("id: G1 · name: Circle · members: A01, A02 · treasury: 4 · treasurer: A01 · role: member · receipt R-0001");
		expect(await say(test, "A02", "depositGroup", { groupId: "G1", amount: 99 })).toBe("INSUFFICIENT_FUNDS");
		expect(await say(test, "A02", "withdrawGroup", { groupId: "G1", target: "A02", amount: 1 })).toBe("NOT_TREASURER");
		expect(await say(test, "A01", "withdrawGroup", { groupId: "G1", target: "A03", amount: 1 })).toBe("NOT_MEMBER: A03");
		expect(await say(test, "A01", "withdrawGroup", { groupId: "G1", target: "A02", amount: 3 })).toContain("treasury: 1 ·");
		expect(await say(test, "A01", "setTreasurer", { groupId: "G1", agent: "A02" })).toContain("treasurer: A02");
		expect(await say(test, "A01", "leaveGroup", { groupId: "G1" })).toContain("members: A02");
		expect(events(test, "treasury_deposit")).toEqual([{ group: "G1", agent: "A02", amount: 4, receipt: "R-0001" }]);
		expect(events(test, "treasury_withdrawal")).toEqual([{ group: "G1", treasurer: "A01", to: "A02", amount: 3, receipt: "R-0002" }]);
		expect(events(test, "treasurer_set")).toEqual([{ group: "G1", treasurer: "A02", by: "A01" }]);
		expect(bookings(test)).toHaveLength(2);
	});

	it("names no receipt without a provider of receipt-source", async () => {
		const test = testKernel(defineGame({ id: "plain", seed: 7, residents: 2, mechanics: [ledger({ startPoints: 10 }), channels()], end: { ticks: 1 } }));
		await say(test, "A01", "createGroup", { name: "Circle" });
		expect(await say(test, "A01", "depositGroup", { groupId: "G1", amount: 2 })).toBe("id: G1 · name: Circle · members: A01 · treasury: 2 · treasurer: A01 (you) · role: founder");
		expect(events(test, "treasury_deposit")).toEqual([{ group: "G1", agent: "A01", amount: 2, receipt: "" }]);
	});

	it("pays every treasury out at the end of the run, the remainder to the treasurer", async () => {
		const test = testKernel(game(1));
		await say(test, "A01", "createGroup", { name: "Circle" });
		await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A02" });
		await say(test, "A01", "addGroupMember", { groupId: "G1", agent: "A03" });
		await say(test, "A01", "depositGroup", { groupId: "G1", amount: 7 });
		await test.playTicks(idleDriver, 1);
		expect(events(test, "treasury_settled")).toEqual([{ group: "G1", payouts: { A01: 3, A02: 2, A03: 2 } }]);
		expect(bookings(test).slice(-3)).toEqual([
			{ txId: "TX5", debit: "GROUP:G1", credit: "A01", amount: 3, reason: "settlement G1" },
			{ txId: "TX6", debit: "GROUP:G1", credit: "A02", amount: 2, reason: "settlement G1" },
			{ txId: "TX7", debit: "GROUP:G1", credit: "A03", amount: 2, reason: "settlement G1" },
		]);
	});
});

describe("the city's groups (a test mechanic stands in for the old script)", () => {
	it("founds a group for members, posts for free, and removes it with a payout", async () => {
		const test = testKernel(game());
		expect(await say(test, "A01", "found", { name: "Council", members: ["A02", "A03"] })).toBe('{"group":"G1"}');
		expect(events(test, "group_created")).toEqual([{ group: "G1", founder: "CITY", name: "Council" }]);
		expect(events(test, "group_membership")).toEqual([
			{ group: "G1", agent: "A02", change: "added", by: "CITY" },
			{ group: "G1", agent: "A03", change: "added", by: "CITY" },
		]);
		expect(events(test, "notice")[0]).toEqual({ to: "A02", author: "CITY", text: "The city added you to group G1 (Council). Posts there cost no marks." });
		expect(await say(test, "A02", "addGroupMember", { groupId: "G1", agent: "A01" })).toBe("NOT_FOUNDER");
		await say(test, "A01", "speak", { group: "G1", text: "  the list  " });
		expect(await say(test, "A03", "readGroup", { groupId: "G1" })).toBe("#1 CITY: the list");
		expect(await say(test, "A01", "look", { group: "G1", number: 1 })).toBe(
			'[{"id":"G1","name":"Council","founder":"CITY","treasurer":"CITY","members":["A02","A03"],"removed":false},{"number":1,"group":"G1","author":"CITY","text":"the list","tick":0},true]',
		);
		expect(await say(test, "A03", "depositGroup", { groupId: "G1", amount: 5 })).toContain("treasury: 5");
		await say(test, "A01", "dissolve", { group: "G1" });
		expect(events(test, "treasury_settled")).toEqual([{ group: "G1", payouts: { A02: 3, A03: 2 } }]);
		expect(events(test, "group_removed")).toEqual([{ group: "G1", members: ["A02", "A03"] }]);
		expect(await say(test, "A02", "listMyGroups", {})).toBe("no groups");
		expect(await say(test, "A01", "look", { group: "G1", number: 1 })).toContain('"removed":true');
	});
});

describe("groups in the snapshot", () => {
	it("replay and resume at every boundary equal under the fake driver, which founds, posts and books", async () => {
		const drivers = (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, 7) });
		const played = testKernel(game(8));
		await played.playTicks(fakeDriver(played.kernel, 7), 8);
		const types = new Set(played.kernel.log.all().map((event) => event.type));
		expect(["group_created", "group_membership", "group_post", "treasury_deposit"].filter((type) => !types.has(type))).toEqual([]);
		const count = (type: string): number => played.kernel.log.all().filter((event) => event.type === type).length;
		expect(count("tool_refused")).toBeLessThan(count("tool_called") / 4);
		expect(await checkReplay(game(8), drivers)).toEqual([]);
		expect(await checkResumeEveryBoundary(game(8), drivers)).toEqual([]);
	});

	it("reads a slice of version 1 as one without groups", () => {
		expect(withoutGroups({ messages: 3 })).toEqual({ messages: 3, groups: { groups: [], founded: [], seq: 0 } });
		expect(withoutGroups(null)).toBeNull();
	});
});
