import { describe, expect, it } from "vitest";
import { LedgerError, PointsLedger } from "@swarmtales/kernel";
import { groupAccountId, GroupRegistry, MAX_FOUNDED_GROUPS, MessageNumbers, type GroupResult } from "@swarmtales/mechanic-channels";

/**
 * The channels mechanic's registry decides who may; its treasuries live in the ledger and are booked
 * by `mechanics/channels/src/{group-actions,treasury}.ts` through `LedgerApi`. The helpers below book
 * a plain ledger the way those files do (open with the group, deposit, withdrawal, `split` then a
 * payout per member). The host runs of the same rules are `test/mechanics/channels/groups.test.ts`.
 */
const MINUTE = 5;

function setup() {
	const ledger = new PointsLedger();
	for (const agent of ["A01", "A02", "A03"]) ledger.open(agent);
	const groups = new GroupRegistry(new MessageNumbers());
	return { ledger, groups };
}

type Setup = ReturnType<typeof setup>;

function value<T>(result: GroupResult<T>): T {
	if (!result.ok) throw new Error(`unexpected ${result.error}`);
	return result.value;
}

function errorOf<T>(result: GroupResult<T>): string | undefined {
	return result.ok ? undefined : result.error;
}

/** `createGroup`: the registry founds it, the treasury account opens with it. */
function create({ ledger, groups }: Setup, founder: string, name: string): GroupResult<{ readonly id: string }> {
	const created = groups.create(founder, name);
	if (created.ok) ledger.open(groupAccountId(created.value.id));
	return created;
}

/** `createCityGroup`. */
function createForCity({ ledger, groups }: Setup, name: string, members: readonly string[]) {
	const created = groups.createForCity(name, members);
	ledger.open(groupAccountId(created.id));
	return created;
}

function book(ledger: PointsLedger, from: string, to: string, amount: number, reason: string): GroupResult<undefined> {
	try {
		ledger.transfer(from, to, amount, reason, MINUTE);
		return { ok: true, value: undefined };
	} catch (error) {
		if (error instanceof LedgerError && error.code === "INSUFFICIENT_FUNDS") return { ok: false, error: "INSUFFICIENT_FUNDS" };
		throw error;
	}
}

/** `depositGroup`: the registry's check, then the ledger move; the value is the treasury after it. */
function deposit({ ledger, groups }: Setup, group: string, agent: string, amount: number): GroupResult<{ readonly treasury: number }> {
	const checked = groups.checkDeposit(group, agent);
	if (!checked.ok) return checked;
	const booked = book(ledger, agent, groupAccountId(group), amount, `deposit ${group}`);
	return booked.ok ? { ok: true, value: { treasury: ledger.balance(groupAccountId(group)) } } : booked;
}

/** `withdrawGroup`. */
function withdraw({ ledger, groups }: Setup, group: string, actor: string, target: string, amount: number): GroupResult<{ readonly treasury: number }> {
	const checked = groups.checkWithdraw(group, actor, target);
	if (!checked.ok) return checked;
	const booked = book(ledger, groupAccountId(group), target, amount, `withdrawal ${group}`);
	return booked.ok ? { ok: true, value: { treasury: ledger.balance(groupAccountId(group)) } } : booked;
}

/** `payOut`: `split`, then a move per member. */
function payOut({ ledger, groups }: Setup, group: string): Readonly<Record<string, number>> | undefined {
	const payouts = groups.split(group, ledger.balance(groupAccountId(group)));
	for (const [member, amount] of Object.entries(payouts ?? {})) if (amount > 0) ledger.transfer(groupAccountId(group), member, amount, `settlement ${group}`, MINUTE);
	return payouts;
}

/** `settleTreasuries`. */
function settle(setup: Setup): readonly { readonly group: string; readonly payouts: Readonly<Record<string, number>> }[] {
	return setup.groups.liveIds().flatMap((group) => {
		const payouts = payOut(setup, group);
		return payouts === undefined ? [] : [{ group, payouts }];
	});
}

/** `removeCityGroup`; undefined for a group that is not the city's (or is gone). */
function removeCityGroup(setup: Setup, group: string): { readonly members: readonly string[]; readonly payouts?: Readonly<Record<string, number>> } | undefined {
	const members = setup.groups.cityGroupMembers(group);
	if (members === undefined) return undefined;
	const payouts = payOut(setup, group);
	setup.groups.markRemoved(group);
	return payouts === undefined ? { members } : { members, payouts };
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
		expect(errorOf(groups.post("G1", "A03", "hello", MINUTE))).toBe("GROUP_NOT_VISIBLE");
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
		value(groups.post("G1", "A01", "secret before joining", MINUTE));
		value(groups.addMember("G1", "A01", "A02"));
		value(groups.post("G1", "A01", "after joining", MINUTE));
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
		value(groups.post("G1", "A02", "mine", MINUTE));
		value(groups.post("G1", "A01", "one", MINUTE));
		value(groups.post("G1", "A01", "two", MINUTE));
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
		const city = setup();
		const { ledger, groups } = city;
		ledger.mint("A01", 20, "start", 0);
		value(create(city, "A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		expect(value(deposit(city, "G1", "A01", 8)).treasury).toBe(8);
		expect(ledger.balance("A01")).toBe(12);
		expect(ledger.balance(groupAccountId("G1"))).toBe(8);
		expect(errorOf(deposit(city, "G1", "A02", 1))).toBe("INSUFFICIENT_FUNDS");
		value(groups.setTreasurer("G1", "A01", "A02"));
		expect(errorOf(withdraw(city, "G1", "A01", "A01", 4))).toBe("NOT_TREASURER");
		expect(value(withdraw(city, "G1", "A02", "A01", 4)).treasury).toBe(4);
		expect(ledger.balance("A01")).toBe(16);
		expect(ledger.total()).toBe(0);
	});

	it("splits the treasury equally at the end, remainder to the treasurer", () => {
		const city = setup();
		const { ledger, groups } = city;
		ledger.mint("A01", 20, "start", 0);
		value(create(city, "A01", "Cartel"));
		value(groups.addMember("G1", "A01", "A02"));
		value(groups.addMember("G1", "A01", "A03"));
		value(deposit(city, "G1", "A01", 11));
		value(groups.setTreasurer("G1", "A01", "A03"));
		expect(settle(city)).toEqual([{ group: "G1", payouts: { A01: 3, A02: 3, A03: 5 } }]);
		expect(ledger.balance(groupAccountId("G1"))).toBe(0);
		expect(ledger.balance("A01")).toBe(12);
		expect(ledger.total()).toBe(0);
	});
});

describe("groups of the city (the faction draft, v06)", () => {
	it("are opened with their members, take the city's long posts, settle their treasury and vanish when removed", () => {
		const city = setup();
		const { ledger, groups } = city;
		const opened = createForCity(city, "GT1", ["A01", "A02"]);
		expect(opened).toMatchObject({ id: "G1", members: ["A01", "A02"] });
		expect(groups.isCityGroup("G1")).toBe(true);
		expect(groups.listFor("A01").map((group) => group.id)).toEqual(["G1"]);
		expect(groups.listFor("A03")).toEqual([]);
		const long = "x".repeat(1200);
		expect(value(groups.postAsCity("G1", long, MINUTE)).text).toHaveLength(1200);
		expect(groups.unreadCount("G1", "A01")).toBe(1);
		value(groups.post("G1", "A02", "with me?", MINUTE));
		ledger.mint("A02", 10, "test", 5);
		value(deposit(city, "G1", "A02", 3));
		expect(removeCityGroup(city, "G1")).toEqual({ members: ["A01", "A02"], payouts: { A01: 2, A02: 1 } });
		// The registry has no `isRemoved`: a removed group is no longer among the live ones.
		expect(groups.liveIds()).not.toContain("G1");
		expect(groups.listFor("A01")).toEqual([]);
		expect(groups.unreadCount("G1", "A01")).toBe(0);
		expect(errorOf(groups.read("G1", "A01", 0))).toBe("GROUP_NOT_VISIBLE");
		expect(errorOf(groups.postAsCity("G1", "again", MINUTE))).toBe("GROUP_NOT_VISIBLE");
		expect(removeCityGroup(city, "G1")).toBeUndefined();
		// A resident's group is not the city's to remove.
		value(create(city, "A03", "Cartel"));
		expect(removeCityGroup(city, "G2")).toBeUndefined();
		// Removed groups keep their ids.
		expect(createForCity(city, "GT2", ["A01"]).id).toBe("G3");
	});
});
