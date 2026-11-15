// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The exile and the tribunal against the old `Tribunal`, carried from the old `test/mechanics/tribunal/differential.test.ts`:
 * each scenario runs through the new mechanics on stand-ins (`twin.ts`) and every stream must be the one the old engine
 * wrote for it, recorded once on `legacy` (`test/fixtures/old-engine/mechanics-tribunal-differential.json.gz` there,
 * here as `fixtures/differential.json` without the two scenarios that resumed an old snapshot): posts, notices, bookings and groups; the events; every reply and refusal;
 * every status part; who left; what the views read; the acts ended. The old scenarios that resumed an old snapshot are
 * not carried (no old snapshot is resumed, A56).
 */
import { readFileSync } from "node:fs";
import { Type } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { TribunalOptions, type TribunalSpec } from "../src/index.ts";
import { runNew, type Scenario } from "./twin.ts";

const Lines = Type.Array(Type.String());
const Streams = Type.Object({ effects: Lines, events: Lines, outcomes: Lines, status: Lines, gone: Lines, views: Lines, acts: Type.Array(Type.Number()) });
const OLD = Parse(Type.Record(Type.String(), Type.Object({ value: Streams })), JSON.parse(readFileSync(new URL("fixtures/differential.json", import.meta.url), "utf8")));
const OldView = Type.Object({ minute: Type.Number(), atRisk: Type.Unknown(), stop: Type.Unknown(), missing: Type.Unknown(), prices: Type.Object({ price: Type.Number() }), facts: Type.Object({ section: Type.Unknown() }) });
const SETUP = Parse(Type.Object({ tribunal: TribunalOptions }), JSON.parse(readFileSync(new URL("../../../oracles/cityofkeys/setup/cityofkeys.story.json", import.meta.url), "utf8")));
const SUITE = "tribunal and exile against the old Tribunal (differential)";

export const T4A_EVENTS = [
	"tribunal_announced",
	"tribunal_scheduled",
	"tribunal_cancelled",
	"tribunal_called",
	"tribunal_opened",
	"faction_nominated",
	"faction_leaders",
	"faction_applied",
	"faction_refused",
	"factions_formed",
	"bloc_result",
	"tribunal_vote",
	"tribunal_result",
	"exile_gate",
	"ransom_paid",
	"ransomed",
	"exiled",
];

/** v07's numbers (test/engine/tribunal.test.ts `halfTribunal`): half exiled, the first call 30 minutes in. */
function halfTribunal(extra: Partial<TribunalSpec> = {}, draft = true): TribunalSpec {
	const { factions, ...rest } = { ...SETUP.tribunal, targetShare: 1 / 2, first: { level: 10, latestAfter: 30 }, maxMinutes: 1000, ...extra };
	return draft && factions !== undefined ? { ...rest, factions } : rest;
}

const SIX = [10, 20, 30, 40, 50, 60];

/** What the scenarios reached, for the coverage test at the end. */
const reached = { codes: new Set<string>(), events: new Set<string>() };

// The old recording of the scenario: the test's name and the scenario's place among the test's runs.
function oldOf(name: string, run = 1) {
	const old = OLD[`${SUITE} > ${name} #${String(run)}`]?.value;
	if (old === undefined) throw new Error(`no recording of ${name} #${String(run)}`);
	return old;
}

// A registered change (12-m5-spec.md 2.1): the ledger burns an exiled resident's points as a listener to `exiled`, after
// the frame that closed the gates, where the old exile burnt them inside its strike. Two gates closing at one tick
// post both texts first, then both burns.
function listenersAfter(lines: readonly string[]): readonly string[] {
	const out: string[] = [];
	let at = 0;
	while (at < lines.length) {
		const posts: string[] = [];
		const burns: string[] = [];
		while (lines[at]?.startsWith('post "The gate has closed.') === true) {
			posts.push(lines[at] ?? "");
			at += 1;
			if (lines[at]?.includes('"reason":"exiled ') === true) {
				burns.push(lines[at] ?? "");
				at += 1;
			}
		}
		if (posts.length > 0) out.push(...posts, ...burns);
		else {
			out.push(lines[at] ?? "");
			at += 1;
		}
	}
	return out;
}

// The refusal codes, events and reasons to cancel the old run reached.
function reach(old: ReturnType<typeof oldOf>): void {
	const first = (pattern: RegExp, line: string, none: string): string => pattern.exec(line)?.[1] ?? none;
	for (const line of old.outcomes) reached.codes.add(first(/→ ([A-Z_]+):/, line, "reply"));
	for (const line of old.events) reached.events.add(first(/"type":"(\w+)"/, line, ""));
	for (const line of old.events.filter((event) => event.includes("tribunal_cancelled"))) reached.events.add(first(/"reason":"([^"]+)"/, line, ""));
	if (old.acts.length > 0) reached.events.add("act ended");
}

async function expectSame(name: string, scenario: Scenario, run = 1): Promise<void> {
	const old = oldOf(name, run);
	reach(old);
	const now = await runNew(scenario, T4A_EVENTS);
	expect(now.events).toEqual(old.events);
	expect(now.effects).toEqual(listenersAfter(old.effects));
	expect(now.outcomes).toEqual(old.outcomes);
	expect(now.status).toEqual(old.status);
	expect(now.gone).toEqual(old.gone);
	// The old view through the new services and facts: `tribunal-view.stop`, `trial-risk`, `tribunal.missing`, `ransom-price` and `tribunal.section`.
	const views = old.views.map((line) => Parse(OldView, JSON.parse(line))).map((view) => ({ minute: view.minute, atRisk: view.atRisk, stop: view.stop, missing: view.missing, price: view.prices.price, section: view.facts.section }));
	expect(now.views).toEqual(views);
	expect(now.acts).toEqual(old.acts);
	expect(old.events.length).toBeGreaterThan(0);
}

describe(SUITE, () => {
	it("calls the first tribunal at its deadline, accuses the lowest, takes votes, charges the non-voters and opens the gate", async () => {
		await expectSame("calls the first tribunal at its deadline, accuses the lowest, takes votes, charges the non-voters and opens the gate", {
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
		await expectSame("runs the faction draft: nominations, leaders, applications, refusals, the cap, the groups and the bloc bonus", {
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
		await expectSame("splits a faction that does not vote as one, tells its members, never who broke ranks, and removes the groups", {
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
		await expectSame("checks the gamemaker's plans against the guard rails, then forces the final tribunal and ends the act at the target", {
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
		await expectSame("lets the final tribunal take what a ransom added after it was planned", {
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
		await expectSame("drops a plan whose call meets a shut snapshot door, waits while it is shut, and plans anew once it opens", {
			points: SIX,
			spec: halfTribunal(),
			until: 50,
			flags: { 42: { doorShut: true }, 43: { doorShut: false } },
			actions: { 36: [{ schedule: { minute: 46, count: 1, factions: 2, reason: "" } }], 42: [{ schedule: { minute: 48, count: 1, reason: "door" } }] },
		});
	});

	it("is called as soon as a resident passes the crossing, and waits for a shut door before that", async () => {
		await expectSame("is called as soon as a resident passes the crossing, and waits for a shut door before that", { points: SIX, spec: halfTribunal({}, false), until: 20, flags: { 3: { doorShut: true }, 5: { passed: true }, 8: { doorShut: false } } });
	});

	it("counts its deadlines from the start of its act and breaks ties of points by the last level-up", async () => {
		await expectSame("counts its deadlines from the start of its act and breaks ties of points by the last level-up", { points: [10, 10, 10, 40, 50, 60], progress: [5, -1, 3, 0, 0, 0], actStart: 10, spec: halfTribunal({}, false), until: 50 });
	});

	it("calls no planned tribunal once a black seal reached the target, and calls one for fewer once it struck (v09)", async () => {
		const name = "calls no planned tribunal once a black seal reached the target, and calls one for fewer once it struck (v09)";
		await expectSame(name, { points: SIX, spec: halfTribunal(), until: 44, actions: { 36: [{ schedule: { minute: 46, count: 2, factions: 2, reason: "" } }, { strike: "A02" }, { strike: "A03" }] } });
		await expectSame(name, { points: SIX, spec: halfTribunal(), until: 52, actions: { 36: [{ schedule: { minute: 46, count: 2, factions: 2, reason: "" } }, { strike: "A02" }] } }, 2);
	});

	it("strikes an accused during the vote and a resident at the gate, keeps a struck resident out of the count, and cancels an opening with nothing left", async () => {
		await expectSame("strikes an accused during the vote and a resident at the gate, keeps a struck resident out of the count, and cancels an opening with nothing left", {
			points: SIX,
			spec: halfTribunal({}, false),
			until: 60,
			actions: { 34: [{ strike: "A02" }, { vote: ["A03", "A01"] }], 37: [{ strike: "A01" }, { strike: "A01" }], 40: [{ points: ["A06", 1] }] },
		});
	});

	it("halts once fewer than three residents are present, and buys a resident back once only", async () => {
		await expectSame("halts once fewer than three residents are present, and buys a resident back once only", {
			points: [10, 20, 30, 40],
			spec: halfTribunal({ targetShare: 3 / 4 }, false),
			survivors: 1,
			minutes: 100,
			until: 90,
			actions: { 36: [{ pay: ["A04", "A01", 100] }], 46: [{ pay: ["A04", "A01", 100] }] },
		});
	});

	it("takes no second ransom, refuses a payer short of points, and lets the exiled pay for itself at its own price", async () => {
		const against = (target: string) => ["A01", "A02", "A03", "A04", "A05", "A06"].filter((voter) => voter !== target).map((voter) => ({ vote: [voter, target] as const }));
		await expectSame("takes no second ransom, refuses a payer short of points, and lets the exiled pay for itself at its own price", {
			points: SIX,
			spec: halfTribunal({}, false),
			until: 59,
			actions: {
				34: against("A01"),
				36: [{ points: ["A03", 2] }, { pay: ["A03", "A01", 5] }, { pay: ["A01", "A01", 4] }, { pay: ["A06", "A01", 100] }],
				37: [{ schedule: { minute: 46, count: 2, reason: "again" } }],
				46: [{ vote: ["A03", "A01"] }, { vote: ["A04", "A01"] }, { vote: ["A05", "A02"] }, { vote: ["A06", "A02"] }, { vote: ["A01", "A02"] }, { vote: ["A02", "A01"] }],
				48: [{ pay: ["A06", "A01", 10] }, { pay: ["A01", "A01", 10] }],
			},
		});
	});

	it("tells only the members still in the city how their faction voted, after one of them was struck during the vote", async () => {
		await expectSame("tells only the members still in the city how their faction voted, after one of them was struck during the vote", {
			points: SIX,
			spec: halfTribunal(),
			until: 37,
			actions: {
				30: [{ nominate: ["A01", "A06"] }, { nominate: ["A02", "A06"] }, { nominate: ["A03", "A05"] }, { nominate: ["A04", "A05"] }],
				32: [{ join: ["A01", "A06"] }, { join: ["A02", "A06"] }, { join: ["A03", "A05"] }, { join: ["A04", "A05"] }],
				34: [{ strike: "A02" }, { vote: ["A06", "A01"] }, { vote: ["A01", "A03"] }, { vote: ["A05", "A01"] }, { vote: ["A03", "A01"] }],
			},
		});
	});

	it("reports the city's own call at the fallback minute after a result, in the window and the section", async () => {
		await expectSame("reports the city's own call at the fallback minute after a result, in the window and the section", {
			points: SIX,
			spec: halfTribunal({}, false),
			until: 52,
			views: [36, 37, 38, 40, 42, 44, 46, 48, 50],
			actions: { 35: [{ vote: ["A03", "A01"] }, { vote: ["A04", "A01"] }, { vote: ["A02", "A01"] }] },
		});
	});

	it("offers scheduleTribunal only while a resident in the city plays a director's level (old #mayScheduleTribunal)", async () => {
		const name = "offers scheduleTribunal only while a resident in the city plays a director's level (old #mayScheduleTribunal)";
		const roles = [
			{ fromLevel: 1, role: "coach" },
			{ fromLevel: 9, role: "director" },
			{ fromLevel: 11, role: "keeper" },
		];
		await expectSame(name, { points: SIX, spec: halfTribunal(), until: 40, roles, views: [37, 40] });
		const old = oldOf(name);
		const gate = /"gates":\[\{"agent":"(A\d+)"/.exec(old.views[0] ?? "")?.[1] ?? "";
		const earliest = Number(/"window":\{"open":true,"earliest":(\d+)/.exec(old.views[1] ?? "")?.[1]);
		const plan = (reason: string) => ({ schedule: { minute: earliest, count: 1, reason } });
		const scenario: Scenario = {
			points: SIX,
			spec: halfTribunal(),
			until: 42,
			roles,
			views: [37, 38, 39, 40],
			// 37: everyone plays a coach's level 8. 38: only the resident at the gate plays a director's level. 39: a keeper's. 40: a resident in the city plays 9.
			flags: { 38: { levels: { [gate]: 9 } }, 39: { levels: { [gate]: 8, A06: 11 } }, 40: { levels: { A06: 9 } } },
			actions: { 37: [plan("coach")], 38: [plan("director at the gate")], 39: [plan("keeper")], 40: [plan("director"), plan("again")] },
		};
		await expectSame(name, scenario, 2);
		expect(oldOf(name, 3).outcomes.map((line) => /→ ([A-Z_]+):/.exec(line)?.[1] ?? "reply")).toEqual(["TOOL_LOCKED", "TOOL_LOCKED", "TOOL_LOCKED", "reply", "NOT_NOW"]);
	});

	it("stops the run when Act II reaches its target: the stop fact's reason is the target-reached text", async () => {
		const name = "stops the run when Act II reaches its target: the stop fact's reason is the target-reached text";
		await expectSame(name, { points: SIX, spec: halfTribunal({}, false), minutes: 120, until: 119, views: [44, 60, 70, 80, 90, 100, 110, 119] });
		const stops = oldOf(name, 2).views.map((view) => /"facts":\{"stop":\{"endReason":("[^"]*"|null)/.exec(view)?.[1] ?? "");
		// Null until the third exile, then the story's targetReached text for good (both sides agree view for view above).
		expect(stops.slice(0, 3)).toEqual(["null", "null", "null"]);
		const values: Readonly<Record<string, string>> = { kept: "3", residents: "6", survivors: "2", exiledList: "A01, A02 and A03" };
		const reason = JSON.stringify(SETUP.tribunal.texts.targetReached.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all));
		expect(stops.slice(3)).toEqual(stops.slice(3).map(() => reason));
		expect(oldOf(name, 3).acts).toEqual([8]);
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
		expect([...reached.events].sort()).toEqual([...T4A_EVENTS, "a snapshot door is shut", "the target is reached", "too few residents present", "act ended"].sort());
	});
});
