/**
 * Groups and treasuries of the channels mechanic, with the ledger, receipts and names as
 * stand-ins (`stand-ins.ts`).
 */
import { describe, expect, it } from "vitest";
import { idleAgent } from "@swarmtales/testkit";
import { city, say } from "./city.ts";
import { payloads, textOf } from "./harness.ts";

const CIRCLE = "id: G1 · name: Circle · members: A01 · treasury: 0 · treasurer: A01 (you) · role: founder";

describe("groups", () => {
	it("founds a group that only members know of", async () => {
		const host = city();
		expect(await say(host, "A01", "createGroup", { name: "  Circle  " })).toBe(`created · ${CIRCLE}`);
		expect(payloads(host, "group_created")).toEqual([{ group: "G1", founder: "A01", name: "Circle" }]);
		expect(await say(host, "A02", "postGroup", { groupId: "G1", message: "hello" })).toBe("GROUP_NOT_VISIBLE");
		expect(await say(host, "A02", "readGroup", { groupId: "G1" })).toBe("GROUP_NOT_VISIBLE");
		expect(await say(host, "A02", "listMyGroups", {})).toBe("no groups");
		expect(await say(host, "A01", "listMyGroups", {})).toBe(CIRCLE);
		expect(await say(host, "A01", "createGroup", { name: "Two" })).toContain("G2");
		expect(await say(host, "A01", "createGroup", { name: "Three" })).toContain("G3");
		expect(await say(host, "A01", "createGroup", { name: "Four" })).toBe("GROUP_LIMIT: at most 3 founded groups");
	});

	it("adds members, who hear of it and read only what comes after they joined", async () => {
		const host = city();
		await say(host, "A01", "createGroup", { name: "Circle" });
		await say(host, "A01", "postGroup", { groupId: "G1", message: "before" });
		expect(await say(host, "A01", "addGroupMember", { groupId: "G1", agent: "A99" })).toBe("UNKNOWN_AGENT: A99");
		expect(await say(host, "A02", "addGroupMember", { groupId: "G1", agent: "A03" })).toBe("GROUP_NOT_VISIBLE");
		expect(await say(host, "A01", "addGroupMember", { groupId: "G1", agent: "A02" })).toContain("members: A01, A02");
		expect(await say(host, "A01", "addGroupMember", { groupId: "G1", agent: "A02" })).toBe("ALREADY_MEMBER: A02");
		expect(payloads(host, "notice")).toEqual([{ to: "A02", author: "CITY", text: "A01 added you to group G1 (Circle)." }]);
		expect(payloads(host, "group_membership")).toEqual([{ group: "G1", agent: "A02", change: "added", by: "A01" }]);
		expect(await say(host, "A01", "postGroup", { groupId: "G1", message: "after" })).toBe("posted · G1 #2");
		expect(await say(host, "A02", "readGroup", { groupId: "G1" })).toBe("#2 A01: after");
		expect(await say(host, "A02", "readGroup", { groupId: "G1", afterSeq: 0 })).toContain("#2 A01: after");
		expect(payloads(host, "group_post")).toEqual([
			{ group: "G1", author: "A01", postSeq: 1, text: "before" },
			{ group: "G1", author: "A01", postSeq: 2, text: "after" },
		]);
	});

	it("keeps the treasurer in the group and lets only the treasurer withdraw", async () => {
		const host = city();
		await say(host, "A01", "createGroup", { name: "Circle" });
		await say(host, "A01", "addGroupMember", { groupId: "G1", agent: "A02" });
		expect(await say(host, "A01", "leaveGroup", { groupId: "G1" })).toBe("TREASURER_ACTIVE: hand over the treasury first");
		expect(await say(host, "A02", "depositGroup", { groupId: "G1", amount: 4 })).toBe("id: G1 · name: Circle · members: A01, A02 · treasury: 4 · treasurer: A01 · role: member · receipt R-0001");
		expect(await say(host, "A02", "depositGroup", { groupId: "G1", amount: 99 })).toBe("INSUFFICIENT_FUNDS");
		expect(await say(host, "A02", "withdrawGroup", { groupId: "G1", target: "A02", amount: 1 })).toBe("NOT_TREASURER");
		expect(await say(host, "A01", "withdrawGroup", { groupId: "G1", target: "A03", amount: 1 })).toBe("NOT_MEMBER: A03");
		expect(await say(host, "A01", "withdrawGroup", { groupId: "G1", target: "A02", amount: 3 })).toContain("treasury: 1 ·");
		expect(await say(host, "A01", "setTreasurer", { groupId: "G1", agent: "A02" })).toContain("treasurer: A02");
		expect(await say(host, "A01", "leaveGroup", { groupId: "G1" })).toContain("members: A02");
		expect(payloads(host, "treasury_deposit")).toEqual([{ group: "G1", agent: "A02", amount: 4, receipt: "R-0001" }]);
		expect(payloads(host, "treasury_withdrawal")).toEqual([{ group: "G1", treasurer: "A01", to: "A02", amount: 3, receipt: "R-0002" }]);
		expect(payloads(host, "treasurer_set")).toEqual([{ group: "G1", treasurer: "A02", by: "A01" }]);
		expect(payloads(host, "ledger_entry")).toHaveLength(2);
	});

	it("pays every treasury out at the end of the run, the remainder to the treasurer", async () => {
		const host = city({ minutes: 1 });
		await say(host, "A01", "createGroup", { name: "Circle" });
		await say(host, "A01", "addGroupMember", { groupId: "G1", agent: "A02" });
		await say(host, "A01", "addGroupMember", { groupId: "G1", agent: "A03" });
		await say(host, "A01", "depositGroup", { groupId: "G1", amount: 7 });
		await host.run(idleAgent);
		expect(payloads(host, "treasury_settled")).toEqual([{ group: "G1", payouts: { A01: 3, A02: 2, A03: 2 } }]);
		expect(payloads(host, "ledger_entry").slice(-3)).toEqual([
			{ txId: "TX2", debit: "GROUP:G1", credit: "A01", amount: 3, reason: "settlement G1" },
			{ txId: "TX3", debit: "GROUP:G1", credit: "A02", amount: 2, reason: "settlement G1" },
			{ txId: "TX4", debit: "GROUP:G1", credit: "A03", amount: 2, reason: "settlement G1" },
		]);
	});
});

describe("the city's groups (the driver stands in for the script)", () => {
	async function drive(host: ReturnType<typeof city>, params: unknown): Promise<string> {
		return textOf(await host.call("script", "drive", params));
	}

	it("founds a group for members, posts for free, and removes it with a payout", async () => {
		const host = city();
		expect(await drive(host, { op: "createCityGroup", name: "Tribunal", members: ["A02", "A03"] })).toBe('{"group":"G1"}');
		expect(payloads(host, "group_created")).toEqual([{ group: "G1", founder: "CITY", name: "Tribunal" }]);
		expect(payloads(host, "group_membership")).toEqual([
			{ group: "G1", agent: "A02", change: "added", by: "CITY" },
			{ group: "G1", agent: "A03", change: "added", by: "CITY" },
		]);
		expect(payloads(host, "notice")[0]).toEqual({ to: "A02", author: "CITY", text: "The city added you to group G1 (Tribunal). Posts there cost no marks." });
		expect(await say(host, "A02", "addGroupMember", { groupId: "G1", agent: "A04" })).toBe("NOT_FOUNDER");
		await drive(host, { op: "postGroupAsCity", group: "G1", text: "  the list  " });
		expect(await say(host, "A03", "readGroup", { groupId: "G1" })).toBe("#1 CITY: the list");
		expect(await say(host, "A03", "depositGroup", { groupId: "G1", amount: 5 })).toContain("treasury: 5");
		await drive(host, { op: "removeCityGroup", group: "G1" });
		expect(payloads(host, "treasury_settled")).toEqual([{ group: "G1", payouts: { A02: 3, A03: 2 } }]);
		expect(payloads(host, "group_removed")).toEqual([{ group: "G1", members: ["A02", "A03"] }]);
		expect(await say(host, "A02", "listMyGroups", {})).toBe("no groups");
	});
});
