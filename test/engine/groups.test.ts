import { describe, expect, it } from "vitest";
import { PointsLedger } from "../../src/core/ledger.ts";
import { groupAccountId, GroupRegistry, MAX_FOUNDED_GROUPS, type GroupResult } from "../../src/engine/groups.ts";

function setup() {
	const ledger = new PointsLedger();
	for (const agent of ["A01", "A02", "A03"]) ledger.open(agent);
	const groups = new GroupRegistry(ledger, () => 5);
	return { ledger, groups };
}

function value<T>(result: GroupResult<T>): T {
	if (!result.ok) throw new Error(`unexpected ${result.error}`);
	return result.value;
}

function errorOf<T>(result: GroupResult<T>): string | undefined {
	return result.ok ? undefined : result.error;
}

describe("GroupRegistry", () => {
	it("creates a group and adds members", () => {
		const { groups } = setup();
		expect(value(groups.create("A01", "Cartel"))).toMatchObject({ id: "G1", members: ["A01"], treasurer: "A01" });
		value(groups.addMember("G1", "A01", "A02"));
		expect(groups.listFor("A02").map((group) => group.id)).toEqual(["G1"]);
		expect(groups.listFor("A03")).toEqual([]);
	});

	it("hides a group from non-members without leaking its existence", () => {
		const { groups } = setup();
		value(groups.create("A01", "Cartel"));
		expect(errorOf(groups.read("G1", "A03", 0))).toBe("GROUP_NOT_VISIBLE");
		expect(errorOf(groups.post("G1", "A03", "hello"))).toBe("GROUP_NOT_VISIBLE");
		expect(errorOf(groups.read("G99", "A03", 0))).toBe("GROUP_NOT_VISIBLE");
		const missing = groups.read("G99", "A03", 0);
		const foreign = groups.read("G1", "A03", 0);
		expect(missing).toEqual(foreign);
	});

	it("only lets the founder manage members", () => {
		const { groups } = setup();
		value(groups.create("A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		expect(errorOf(groups.addMember("G1", "A02", "A03"))).toBe("NOT_FOUNDER");
		expect(errorOf(groups.addMember("G1", "A01", "A02"))).toBe("ALREADY_MEMBER");
	});

	it("shows new members no posts from before they joined", () => {
		const { groups } = setup();
		value(groups.create("A01", "Cartel"));
		value(groups.post("G1", "A01", "secret before joining"));
		value(groups.addMember("G1", "A01", "A02"));
		value(groups.post("G1", "A01", "after joining"));
		expect(value(groups.read("G1", "A02", 0)).map((post) => post.text)).toEqual(["after joining"]);
		expect(value(groups.read("G1", "A01", 0)).map((post) => post.text)).toEqual([
			"secret before joining",
			"after joining",
		]);
	});

	it("keeps the treasurer until the role is handed over", () => {
		const { groups } = setup();
		value(groups.create("A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		expect(errorOf(groups.removeMember("G1", "A01", "A01"))).toBe("TREASURER_ACTIVE");
		value(groups.setTreasurer("G1", "A01", "A02"));
		expect(errorOf(groups.removeMember("G1", "A01", "A02"))).toBe("TREASURER_ACTIVE");
		expect(errorOf(groups.leave("G1", "A02"))).toBe("TREASURER_ACTIVE");
		value(groups.setTreasurer("G1", "A02", "A01"));
		expect(value(groups.removeMember("G1", "A01", "A02")).members).toEqual(["A01"]);
	});

	it("does not count own posts as unread and reads everything new without afterSeq", () => {
		const { groups } = setup();
		value(groups.create("A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		value(groups.post("G1", "A02", "mine"));
		value(groups.post("G1", "A01", "one"));
		value(groups.post("G1", "A01", "two"));
		expect(groups.unreadCount("G1", "A02")).toBe(2);
		expect(groups.unreadCount("G1", "A01")).toBe(1);
		expect(value(groups.readNew("G1", "A02")).map((post) => post.text)).toEqual(["one", "two"]);
		expect(groups.unreadCount("G1", "A02")).toBe(0);
	});

	it("limits founded groups per agent", () => {
		const { groups } = setup();
		for (let index = 0; index < MAX_FOUNDED_GROUPS; index++) value(groups.create("A01", `Group ${index}`));
		expect(errorOf(groups.create("A01", "One too many"))).toBe("GROUP_LIMIT");
		expect(errorOf(groups.create("A02", ""))).toBe("INVALID_NAME");
	});

	it("books treasury deposits and withdrawals through the ledger", () => {
		const { ledger, groups } = setup();
		ledger.mint("A01", 20, "start", 0);
		value(groups.create("A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		expect(value(groups.deposit("G1", "A01", 8)).treasury).toBe(8);
		expect(ledger.balance("A01")).toBe(12);
		expect(ledger.balance(groupAccountId("G1"))).toBe(8);
		expect(errorOf(groups.deposit("G1", "A02", 1))).toBe("INSUFFICIENT_FUNDS");
		value(groups.setTreasurer("G1", "A01", "A02"));
		expect(errorOf(groups.withdraw("G1", "A01", "A01", 4))).toBe("NOT_TREASURER");
		expect(value(groups.withdraw("G1", "A02", "A01", 4)).treasury).toBe(4);
		expect(ledger.balance("A01")).toBe(16);
		expect(ledger.total()).toBe(0);
	});

	it("splits the treasury equally at the end, remainder to the treasurer", () => {
		const { ledger, groups } = setup();
		ledger.mint("A01", 20, "start", 0);
		value(groups.create("A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		value(groups.addMember("G1", "A01", "A03"));
		value(groups.deposit("G1", "A01", 11));
		value(groups.setTreasurer("G1", "A01", "A03"));
		expect(groups.settle()).toEqual([{ group: "G1", payouts: { A01: 3, A02: 3, A03: 5 } }]);
		expect(ledger.balance(groupAccountId("G1"))).toBe(0);
		expect(ledger.balance("A01")).toBe(12);
		expect(ledger.total()).toBe(0);
	});
});
