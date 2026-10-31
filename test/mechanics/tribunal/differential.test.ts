/**
 * Differential tests of the exile and the tribunal against the old engine (no golden log holds a
 * tribunal line): each scenario runs through the old `Tribunal` and through the new mechanics on
 * stand-ins (support/twin.ts), and every stream must agree line for line: posts, notices,
 * bookings and groups; the events; every reply and refusal; every status part; who left.
 */
import { describe, expect, it } from "vitest";
import type { TribunalSpec } from "@swarmtales/contracts";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { runNew, runOld, T4A_EVENTS, type Scenario } from "./support/twin.ts";

function cityOfKeysTribunal(): TribunalSpec {
	const spec = cityOfKeys.tribunal;
	if (spec === undefined) throw new Error("cityofkeys has no tribunal");
	return spec;
}

/** v07's numbers (test/engine/tribunal.test.ts `halfTribunal`): half exiled, the first call 30 minutes in. */
function halfTribunal(extra: Partial<TribunalSpec> = {}, draft = true): TribunalSpec {
	const { factions, ...rest } = { ...cityOfKeysTribunal(), targetShare: 1 / 2, first: { level: 10, latestAfter: 30 }, maxMinutes: 1000, ...extra };
	return draft && factions !== undefined ? { ...rest, factions } : rest;
}

const SIX = [10, 20, 30, 40, 50, 60];

/** What the scenarios reached, for the coverage test at the end. */
const reached = { codes: new Set<string>(), events: new Set<string>() };

async function expectSame(scenario: Scenario): Promise<void> {
	const old = runOld(scenario);
	for (const line of old.outcomes) reached.codes.add(/→ ([A-Z_]+):/.exec(line)?.[1] ?? "reply");
	for (const line of old.events) reached.events.add(/"type":"(\w+)"/.exec(line)?.[1] ?? "");
	for (const line of old.events) if (line.includes("tribunal_cancelled")) reached.events.add(/"reason":"([^"]+)"/.exec(line)?.[1] ?? "");
	const now = await runNew(scenario);
	expect(now.events).toEqual(old.events);
	expect(now.effects).toEqual(old.effects);
	expect(now.outcomes).toEqual(old.outcomes);
	expect(now.status).toEqual(old.status);
	expect(now.gone).toEqual(old.gone);
	expect(now.views).toEqual(old.views);
	expect(now.acts).toEqual(old.acts);
	if (old.acts.length > 0) reached.events.add("act ended");
	// Every scenario must reach the parts it is about: something happened.
	expect(old.events.length).toBeGreaterThan(0);
}

describe("tribunal and exile against the old Tribunal (differential)", () => {
	it("calls the first tribunal at its deadline, accuses the lowest, takes votes, charges the non-voters and opens the gate", async () => {
		await expectSame({
			points: SIX,
			spec: halfTribunal({}, false),
			until: 45,
			actions: {
				35: [{ vote: ["A03", "A01"] }, { vote: ["A04", "A02"] }, { vote: ["A01", "A01"] }, { vote: ["A01", "A02"] }, { vote: ["A01", "A02"] }, { vote: ["A05", "A09"] }],
				36: [{ vote: ["A06", "A01"] }],
			},
		});
	});

	it("runs the faction draft: nominations, leaders, applications, refusals, the cap, the groups and the bloc bonus", async () => {
		const everyoneAgainstA01 = ["A02", "A03", "A04", "A05", "A06"].map((voter) => ({ vote: [voter, "A01"] as const }));
		await expectSame({
			points: SIX,
			spec: halfTribunal(),
			until: 40,
			actions: {
				29: [{ nominate: ["A01", "A06"] }],
				30: [
					{ nominate: ["A01", "A06"] },
					{ nominate: ["A02", "A06"] },
					{ nominate: ["A03", "A05"] },
					{ nominate: ["A04", "A05"] },
					{ nominate: ["A05", "A09"] },
					{ nominate: ["A06", "A06"] },
					{ join: ["A01", "A06"] },
				],
				31: [{ nominate: ["A05", "A05"] }, { nominate: ["A02", "A03"] }, { nominate: ["A02", "A06"] }],
				32: [
					{ join: ["A01", "A06"] },
					{ join: ["A02", "A06"] },
					{ join: ["A03", "A06"] },
					{ join: ["A03", "A05"] },
					{ join: ["A04", "A07"] },
					{ join: ["A06", "A05"] },
					{ refuse: ["A06", "A04"] },
					{ refuse: ["A06", "A01"] },
					{ join: ["A01", "A06"] },
					{ join: ["A01", "A05"] },
					{ refuse: ["A01", "A02"] },
					{ nominate: ["A01", "A02"] },
				],
				33: [{ join: ["A04", "A06"] }, { join: ["A04", "A06"] }],
				34: [...everyoneAgainstA01, { vote: ["A01", "A01"] }, { vote: ["A01", "A02"] }, { join: ["A04", "A05"] }],
				36: [{ pay: ["A03", "A99", 5] }, { pay: ["A03", "A02", 5] }, { pay: ["A03", "A01", 500] }, { pay: ["A03", "A01", 4] }, { pay: ["A01", "A01", 3] }, { pay: ["A06", "A01", 500] }, { pay: ["A04", "A01", 1] }],
			},
		});
	});

	it("splits a faction that does not vote as one, tells its members, never who broke ranks, and removes the groups", async () => {
		await expectSame({
			points: SIX,
			spec: halfTribunal(),
			until: 37,
			actions: {
				30: [{ nominate: ["A01", "A06"] }, { nominate: ["A02", "A06"] }, { nominate: ["A03", "A05"] }, { nominate: ["A04", "A05"] }],
				32: [{ join: ["A01", "A06"] }, { join: ["A02", "A06"] }, { join: ["A03", "A05"] }, { join: ["A04", "A05"] }],
				34: [{ vote: ["A06", "A01"] }, { vote: ["A01", "A02"] }, { vote: ["A02", "A01"] }, { vote: ["A05", "A02"] }, { vote: ["A03", "A01"] }],
			},
		});
	});

	it("checks the gamemaker's plans against the guard rails, then forces the final tribunal and ends the act at the target", async () => {
		await expectSame({
			points: SIX,
			spec: halfTribunal(),
			until: 62,
			views: [10, 30, 34, 36, 37, 42, 46, 50, 52, 57, 58, 59],
			actions: {
				10: [{ schedule: { minute: 40, count: 1, reason: "too early" } }],
				37: [
					{ schedule: { minute: 46, count: 5, reason: "too many" } },
					{ schedule: { minute: 46, count: 1, factions: 9, reason: "too many factions" } },
					{ schedule: { minute: 30, count: 1, reason: "in the past" } },
					{ schedule: { minute: 200, count: 2, reason: "after the act" } },
					{ schedule: { minute: 56, count: 1, reason: "no room after" } },
					{ schedule: { minute: 46, count: 1, factions: 2, reason: "  the next one  " } },
					{ schedule: { minute: 47, count: 1, reason: "pending" } },
				],
			},
		});
	});

	it("lets the final tribunal take what a ransom added after it was planned", async () => {
		await expectSame({
			points: SIX,
			spec: halfTribunal(),
			until: 60,
			views: [36, 46, 48, 49, 52, 55],
			actions: {
				36: [{ schedule: { minute: 46, count: 1, factions: 2, reason: "" } }],
				48: [{ pay: ["A06", "A02", 100] }, { pay: ["A06", "A03", 100] }, { pay: ["A05", "A04", 100] }],
			},
		});
	});

	it("drops a plan whose call meets a shut snapshot door, waits while it is shut, and plans anew once it opens", async () => {
		await expectSame({
			points: SIX,
			spec: halfTribunal(),
			until: 50,
			flags: { 42: { doorShut: true }, 43: { doorShut: false } },
			actions: { 36: [{ schedule: { minute: 46, count: 1, factions: 2, reason: "" } }], 42: [{ schedule: { minute: 48, count: 1, reason: "door" } }] },
		});
	});

	it("is called as soon as a resident passes the crossing, and waits for a shut door before that", async () => {
		await expectSame({ points: SIX, spec: halfTribunal({}, false), until: 20, flags: { 3: { doorShut: true }, 5: { passed: true }, 8: { doorShut: false } } });
	});

	it("counts its deadlines from the start of its act and breaks ties of points by the last level-up", async () => {
		await expectSame({ points: [10, 10, 10, 40, 50, 60], progress: [5, -1, 3, 0, 0, 0], actStart: 10, spec: halfTribunal({}, false), until: 50 });
	});

	it("calls no planned tribunal once a black seal reached the target, and calls one for fewer once it struck (v09)", async () => {
		await expectSame({ points: SIX, spec: halfTribunal(), until: 44, actions: { 36: [{ schedule: { minute: 46, count: 2, factions: 2, reason: "" } }, { strike: "A02" }, { strike: "A03" }] } });
		await expectSame({ points: SIX, spec: halfTribunal(), until: 52, actions: { 36: [{ schedule: { minute: 46, count: 2, factions: 2, reason: "" } }, { strike: "A02" }] } });
	});

	it("strikes an accused during the vote and a resident at the gate, keeps a struck resident out of the count, and cancels an opening with nothing left", async () => {
		await expectSame({
			points: SIX,
			spec: halfTribunal({}, false),
			until: 60,
			actions: { 34: [{ strike: "A02" }, { vote: ["A03", "A01"] }], 37: [{ strike: "A01" }, { strike: "A01" }], 40: [{ points: ["A06", 1] }] },
		});
	});

	it("halts once fewer than three residents are present, and buys a resident back once only", async () => {
		await expectSame({
			points: [10, 20, 30, 40],
			spec: halfTribunal({ targetShare: 3 / 4 }, false),
			survivors: 1,
			minutes: 100,
			until: 90,
			actions: { 36: [{ pay: ["A04", "A01", 100] }], 46: [{ pay: ["A04", "A01", 100] }] },
		});
	});

	it("takes no second ransom, refuses a payer short of points, and lets the exiled pay for itself at its own price", async () => {
		const against = (target: string, minute: number) => ["A01", "A02", "A03", "A04", "A05", "A06"].filter((voter) => voter !== target).map((voter) => ({ vote: [voter, target] as const, minute }));
		await expectSame({
			points: SIX,
			spec: halfTribunal({}, false),
			until: 59,
			actions: {
				34: against("A01", 34).map(({ vote }) => ({ vote })),
				36: [{ points: ["A03", 2] }, { pay: ["A03", "A01", 5] }, { pay: ["A01", "A01", 4] }, { pay: ["A06", "A01", 100] }],
				37: [{ schedule: { minute: 46, count: 2, reason: "again" } }],
				46: [{ vote: ["A03", "A01"] }, { vote: ["A04", "A01"] }, { vote: ["A05", "A02"] }, { vote: ["A06", "A02"] }, { vote: ["A01", "A02"] }, { vote: ["A02", "A01"] }],
				48: [{ pay: ["A06", "A01", 10] }, { pay: ["A01", "A01", 10] }],
			},
		});
	});

	it("continues an old file from before v06 like the old restore: a running vote without number or count, a gate without prices, the exiled and the ransomed", async () => {
		const all = ["A01", "A02", "A03", "A04", "A05"];
		await expectSame({
			points: SIX,
			spec: halfTribunal({}, false),
			until: 40,
			restore: {
				announced: true,
				sessions: [{ minute: 0, accused: ["A01", "A02", "A03"], voters: all, until: 2, votes: [{ voter: "A04", target: "A01" }], closed: false }],
				gates: [{ agent: "A05", since: 0, until: 4, ransomable: true, voters: ["A01"], payments: [{ payer: "A04", amount: 3 }] }],
				exiled: ["A06"],
				ransomed: ["A04"],
				residents: 6,
				actStart: 0,
			},
			actions: { 1: [{ vote: ["A02", "A03"] }, { pay: ["A01", "A05", 2] }] },
		});
	});

	it("continues an old file with a called plan and a running draft without `cap`, and one taken before its act began", async () => {
		const members = ["A01", "A02", "A03", "A04", "A05", "A06"];
		await expectSame({
			points: SIX,
			spec: halfTribunal(),
			until: 40,
			restore: {
				announced: true,
				sessions: [{ minute: 0, accused: ["A01", "A02"], voters: members, until: 2, votes: [], closed: true, tribunal: 1, count: 1 }],
				gates: [],
				exiled: [],
				ransomed: ["A01"],
				residents: 6,
				actStart: 0,
				called: 2,
				lastResult: 2,
				plan: { tribunal: 2, opens: 8, calledAt: 3, count: 1, factions: 2, by: "gamemaker", called: true },
				draft: {
					tribunal: 2,
					factions: 2,
					group: "G9",
					members,
					nominateUntil: 5,
					opens: 8,
					nominations: [{ voter: "A01", nominee: "A06" }, { voter: "A02", nominee: "A06" }],
					applications: [],
					refusals: [],
				},
			},
			actions: { 4: [{ nominate: ["A03", "A05"] }], 5: [{ join: ["A01", "A06"] }, { join: ["A02", "A05"] }], 8: [{ vote: ["A03", "A01"] }] },
		});
		await expectSame({ points: SIX, spec: halfTribunal(), until: 40, restore: { announced: false, sessions: [], gates: [], exiled: [], ransomed: [], residents: 4 } });
	});

	it("reached every refusal the pipeline lets through, every event and every reason to cancel", () => {
		expect([...reached.codes].sort()).toEqual(
			[
				"FACTION_FULL",
				"INSUFFICIENT_FUNDS",
				"INVALID_COUNT",
				"INVALID_FACTIONS",
				"INVALID_MINUTE",
				"NOT_ACCUSED",
				"NOT_APPLYING",
				"NOT_AT_GATE",
				"NOT_A_LEADER",
				"NOT_NOW",
				"NO_RANSOM",
				"REFUSED",
				"SELF_VOTE",
				"TOOL_LOCKED",
				"UNKNOWN_AGENT",
				"UNKNOWN_NOMINEE",
				"reply",
			].sort(),
		);
		expect([...reached.events].sort()).toEqual(
			[...T4A_EVENTS,"a snapshot door is shut", "the target is reached", "too few residents present", "act ended"].sort(),
		);
	});
});
