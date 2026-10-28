/**
 * Exile by tribunal (SPEC 6.4): pacing (first tribunal, the game master's
 * plans and their guard rails, fallback and forced final, the end at the
 * target), accusation, votes, gate and ransom, the faction draft and its bloc
 * bonus, last wills, the deal after an exile, validation.
 */
import { describe, expect, it } from "vitest";
import { competitorIds, type CompetitorId } from "../../src/core/ids.ts";
import { createRng, rngFor } from "../../src/core/random.ts";
import { EventBus, MemorySink } from "../../src/engine/events.ts";
import { contractDeal, dealFactors } from "../../src/engine/puzzles/additive.ts";
import { Tribunal, type TribunalEvent } from "../../src/engine/tribunal.ts";
import { World } from "../../src/engine/world.ts";
import { accusedCount, earliestOpening, exileTarget, leadFor, tribunalHeld } from "../../src/story/tribunal.ts";
import type { AnyStory, TribunalSpec } from "../../src/story/types.ts";
import { validateStory } from "../../src/story/validate.ts";
import nexus from "../../stories/nexus/story.ts";

function nexusTribunal(): TribunalSpec {
	const spec = nexus.tribunal;
	if (spec === undefined) throw new Error("nexus has no tribunal");
	return spec;
}

interface GroupRecord {
	readonly id: string;
	readonly name: string;
	readonly members: readonly CompetitorId[];
	readonly posts: string[];
	removed: boolean;
}

interface Harness {
	readonly tribunal: Tribunal;
	readonly points: Map<CompetitorId, number>;
	readonly posts: string[];
	readonly notices: { readonly agent: CompetitorId; readonly text: string }[];
	readonly events: TribunalEvent[];
	readonly exiled: { readonly agent: CompetitorId; readonly bequeathed: readonly string[] }[];
	readonly groups: GroupRecord[];
	readonly flags: { seatsDecided: boolean; doorShut: boolean; passed: boolean };
	readonly ofType: <T extends TribunalEvent["type"]>(type: T) => readonly Extract<TribunalEvent, { type: T }>[];
	readonly noticesOf: (agent: CompetitorId) => readonly string[];
}

interface HarnessOptions {
	readonly minutes?: number;
	readonly survivors?: number;
	readonly progress?: readonly number[];
	readonly spec?: TribunalSpec;
}

function harness(points: readonly number[], options: HarnessOptions = {}): Harness {
	const ids = competitorIds(points.length);
	const balances = new Map(ids.map((id, index) => [id, points[index] ?? 0]));
	const posts: string[] = [];
	const notices: { agent: CompetitorId; text: string }[] = [];
	const events: TribunalEvent[] = [];
	const exiled: { agent: CompetitorId; bequeathed: readonly string[] }[] = [];
	const groups: GroupRecord[] = [];
	const flags = { seatsDecided: false, doorShut: false, passed: false };
	const group = (id: string): GroupRecord => {
		const found = groups.find((entry) => entry.id === id);
		if (found === undefined) throw new Error(`no group ${id}`);
		return found;
	};
	const tribunal = new Tribunal({
		spec: options.spec ?? nexusTribunal(),
		minutes: options.minutes ?? 60,
		seed: 7,
		ids,
		survivors: options.survivors ?? 2,
		points: (agent) => balances.get(agent) ?? 0,
		lastProgress: (agent) => options.progress?.[ids.indexOf(agent)] ?? -1,
		passed: () => flags.passed,
		seatsDecided: () => flags.seatsDecided,
		doorShut: () => flags.doorShut,
		post: (text) => {
			posts.push(text);
		},
		notify: (agent, text) => {
			notices.push({ agent, text });
		},
		burn: (agent, amount) => {
			balances.set(agent, (balances.get(agent) ?? 0) - amount);
		},
		grant: (agent, amount) => {
			balances.set(agent, (balances.get(agent) ?? 0) + amount);
		},
		createGroup: (name, members) => {
			const id = `G${groups.length + 1}`;
			groups.push({ id, name, members: [...members], posts: [], removed: false });
			return id;
		},
		removeGroup: (id) => {
			group(id).removed = true;
		},
		postGroup: (id, text) => {
			group(id).posts.push(text);
		},
		emit: (event) => {
			events.push(event);
		},
		onExiled: (agent, bequeathed) => {
			exiled.push({ agent, bequeathed: [...bequeathed] });
		},
	});
	const ofType = <T extends TribunalEvent["type"]>(type: T): readonly Extract<TribunalEvent, { type: T }>[] =>
		events.filter((event): event is Extract<TribunalEvent, { type: T }> => event.type === type);
	const noticesOf = (agent: CompetitorId): readonly string[] => notices.filter((notice) => notice.agent === agent).map((notice) => notice.text);
	return { tribunal, points: balances, posts, notices, events, exiled, groups, flags, ofType, noticesOf };
}

function runUntil(h: Harness, from: number, to: number): void {
	for (let minute = from; minute <= to; minute++) h.tribunal.tick(minute);
}

const SIX = [10, 20, 30, 40, 50, 60];

describe("tribunal pacing rules", () => {
	const spec = nexusTribunal();

	it("exiles half of the residents at the start of the act, and holds no tribunal in a city too small for one", () => {
		expect([6, 7, 48, 96].map((residents) => exileTarget(spec, residents))).toEqual([3, 3, 24, 48]);
		expect(tribunalHeld(spec, 6, 2)).toBe(true);
		expect(tribunalHeld(spec, 2, 1)).toBe(false);
		expect(tribunalHeld(spec, 3, 3)).toBe(false);
	});

	it("calls a tribunal a third of the gap ahead, at least 4 minutes, and keeps 6 minutes between openings", () => {
		expect(leadFor(spec, 34, undefined)).toBe(4);
		expect(leadFor(spec, 46, 34)).toBe(4);
		expect(leadFor(spec, 64, 34)).toBe(10);
		// The gap rules: 6 after the previous opening, then the call must not be in the past.
		expect(earliestOpening(spec, 30, 34)).toBe(40);
		expect(earliestOpening(spec, 37, 34)).toBe(41);
		expect(earliestOpening(spec, 47, 34)).toBe(53);
	});

	it("accuses one more than it exiles, leaving at least two voters", () => {
		expect(accusedCount(1, 6)).toBe(2);
		expect(accusedCount(3, 6)).toBe(4);
		expect(accusedCount(3, 4)).toBe(2);
		expect(accusedCount(1, 2)).toBe(0);
	});
});

describe("the first tribunal", () => {
	it("is called at its latest minute when nobody passes the crossing, with the rules and its minute and count", () => {
		const h = harness(SIX);
		runUntil(h, 0, 29);
		expect(h.events).toEqual([]);
		expect(h.tribunal.announced).toBe(false);
		h.tribunal.tick(30);
		expect(h.ofType("tribunal_scheduled")).toEqual([{ type: "tribunal_scheduled", tribunal: 1, opens: 34, calledAt: 30, count: 1, factions: 2, by: "deadline" }]);
		expect(h.ofType("tribunal_announced")).toEqual([{ type: "tribunal_announced", target: 3, residents: 6 }]);
		expect(h.ofType("tribunal_called")).toMatchObject([{ tribunal: 1, opens: 34, count: 1, factions: 2, nominateUntil: 32 }]);
		const [announcement = "", called = ""] = h.posts;
		expect(announcement).toMatch(/^THE CITY HOLDS TRIBUNAL\. It keeps only half of you: 3 residents, /);
		// The trigger stays the city's secret.
		expect(announcement).not.toMatch(/level 10|crossing|minute 30|door 10/);
		expect(called).toBe("Tribunal 1 sits at minute 34: the city exiles 1, and the 2 with the fewest points stand trial.");
		for (const id of competitorIds(6)) expect(h.noticesOf(id)).toEqual(expect.arrayContaining([announcement, called]));
		runUntil(h, 31, 33);
		expect(h.tribunal.session).toBeUndefined();
		h.tribunal.tick(34);
		expect(h.ofType("tribunal_opened")).toMatchObject([{ tribunal: 1, accused: ["A01", "A02"], until: 36, count: 1 }]);
	});

	it("is called as soon as a resident passes the crossing", () => {
		const h = harness(SIX);
		runUntil(h, 0, 11);
		h.flags.passed = true;
		h.tribunal.tick(12);
		expect(h.ofType("tribunal_scheduled")).toMatchObject([{ tribunal: 1, by: "progress", calledAt: 12, opens: 16, count: 1 }]);
		runUntil(h, 13, 16);
		expect(h.tribunal.session).toMatchObject({ tribunal: 1, until: 18 });
	});

	it("waits while a snapshot door is shut", () => {
		const h = harness(SIX);
		h.flags.doorShut = true;
		runUntil(h, 0, 39);
		expect(h.events).toEqual([]);
		h.flags.doorShut = false;
		h.tribunal.tick(40);
		expect(h.ofType("tribunal_scheduled")).toMatchObject([{ by: "deadline", calledAt: 40, opens: 44 }]);
	});

	it("stays silent in a city too small for a tribunal", () => {
		for (const small of [harness([10, 20]), harness([10, 20, 30], { survivors: 3 })]) {
			runUntil(small, 0, 59);
			expect(small.tribunal.active).toBe(false);
			expect(small.events).toEqual([]);
			expect(small.tribunal.schedulingWindow()).toMatchObject({ open: false });
		}
	});
});

describe("scheduleTribunal (the game master's plans)", () => {
	/** Tribunal 1 at 34 with nobody voting: A01 is at the gate from minute 36. */
	function afterFirst(options: HarnessOptions = {}): Harness {
		const h = harness(SIX, options);
		runUntil(h, 0, 36);
		return h;
	}

	it("is closed before the first call and while a tribunal is pending", () => {
		const h = harness(SIX);
		runUntil(h, 0, 20);
		expect(h.tribunal.schedule(40, 1, 2, "early")).toMatchObject({ ok: false, error: "NOT_NOW", detail: "the first tribunal has not been called yet" });
		runUntil(h, 21, 34);
		expect(h.tribunal.schedule(46, 1, 2, "during the vote")).toMatchObject({ ok: false, error: "NOT_NOW" });
	});

	it("checks the count, the factions and the minute against the guard rails", () => {
		const h = afterFirst();
		// Three to exile, one at the gate: two still missing. Five present: at most two factions.
		expect(h.tribunal.schedulingWindow()).toEqual({ open: true, earliest: 41, latestFinal: 52, latestWithRoom: 46, missing: 2, maxFactions: 2 });
		expect(h.tribunal.schedule(44, 0, 2, "")).toMatchObject({ ok: false, error: "INVALID_COUNT" });
		expect(h.tribunal.schedule(44, 3, 2, "")).toMatchObject({ ok: false, error: "INVALID_COUNT", detail: "count must be between 1 and 2, the residents still to exile" });
		expect(h.tribunal.schedule(44, 1.5, 2, "")).toMatchObject({ ok: false, error: "INVALID_COUNT" });
		expect(h.tribunal.schedule(44, 1, 1, "")).toMatchObject({ ok: false, error: "INVALID_FACTIONS" });
		expect(h.tribunal.schedule(44, 1, 3, "")).toMatchObject({ ok: false, error: "INVALID_FACTIONS", detail: "factions must be between 2 and 2 (half of the residents present)" });
		// The lead: the call may not lie in the past (now is minute 37), so 41 is the earliest opening.
		expect(h.tribunal.schedule(40, 1, 2, "")).toMatchObject({ ok: false, error: "INVALID_MINUTE" });
		expect(h.tribunal.schedule(53, 2, 2, "")).toMatchObject({ ok: false, error: "INVALID_MINUTE", detail: "the latest opening is minute 52: vote and gate must end before the act does" });
		// A count below what is missing must leave room for one more tribunal.
		expect(h.tribunal.schedule(47, 1, 2, "")).toMatchObject({ ok: false, error: "INVALID_MINUTE", detail: "open by minute 46 to leave room for one more tribunal, or exile all 2 still missing" });
		expect(h.events.filter((event) => event.type === "tribunal_scheduled")).toHaveLength(1);
		expect(h.tribunal.schedule(52, 2, 2, "all at once")).toMatchObject({ ok: true, value: { tribunal: 2, opens: 52, calledAt: 46, count: 2, factions: 2, by: "gamemaster", reason: "all at once" } });
		expect(h.tribunal.schedule(46, 1, 2, "again")).toMatchObject({ ok: false, error: "NOT_NOW" });
	});

	it("keeps the gap between openings and lengthens the lead with it", () => {
		const h = afterFirst({ minutes: 120 });
		expect(h.tribunal.schedule(39, 1, undefined, "")).toMatchObject({ ok: false, error: "INVALID_MINUTE" });
		// 30 minutes after the first opening: a lead of 10. Factions left out take the story's 2.
		expect(h.tribunal.schedule(64, 1, undefined, "  later  ")).toMatchObject({ ok: true, value: { opens: 64, calledAt: 54, factions: 2, reason: "later" } });
		runUntil(h, 37, 54);
		expect(h.ofType("tribunal_called").at(-1)).toMatchObject({ tribunal: 2, opens: 64, count: 1, nominateUntil: 59 });
		expect(h.posts.at(-1)).toBe("Tribunal 2 sits at minute 64: the city exiles 1, and the 2 with the fewest points stand trial.");
		runUntil(h, 55, 64);
		expect(h.tribunal.session).toMatchObject({ tribunal: 2, minute: 64, count: 1 });
	});
});

describe("the city's own tribunals", () => {
	it("falls back on one of its own 10 minutes after a result when nothing is planned", () => {
		const h = harness(SIX, { minutes: 90 });
		runUntil(h, 0, 45);
		expect(h.ofType("tribunal_scheduled")).toHaveLength(1);
		h.tribunal.tick(46);
		expect(h.ofType("tribunal_scheduled").at(-1)).toEqual({ type: "tribunal_scheduled", tribunal: 2, opens: 51, calledAt: 46, count: 1, factions: 2, by: "fallback" });
	});

	it("forces the final tribunal with everything still missing when only one more fits, then ends the act at the target", () => {
		const h = harness(SIX);
		runUntil(h, 0, 45);
		h.tribunal.tick(46);
		// A01 went to the gate at 36 and was exiled at 41: two still missing.
		expect(h.tribunal.exiled).toEqual(["A01"]);
		expect(h.ofType("tribunal_scheduled").at(-1)).toEqual({ type: "tribunal_scheduled", tribunal: 2, opens: 51, calledAt: 46, count: 2, factions: 2, by: "final" });
		runUntil(h, 47, 51);
		// Two to exile, five present: three accused, two voters.
		expect(h.tribunal.session).toMatchObject({ tribunal: 2, count: 2, accused: ["A02", "A03", "A04"], voters: ["A05", "A06"] });
		runUntil(h, 52, 57);
		expect(h.tribunal.gates().map((gate) => gate.agent)).toEqual(["A02", "A03"]);
		expect(h.tribunal.ended).toBe(false);
		expect(h.tribunal.busy).toBe(true);
		h.tribunal.tick(58);
		expect(h.tribunal.ended).toBe(true);
		expect(h.tribunal.endReason).toBe("The city has kept half: 3 of 6 residents remain, and of them only 2 take a seat. Exiled: A01, A02 and A03. The tribunals are over.");
		expect(h.posts.at(-1)).toBe(h.tribunal.endReason);
		expect(h.tribunal.schedulingWindow()).toMatchObject({ open: false });
		const count = h.events.length;
		h.tribunal.tick(59);
		expect(h.events).toHaveLength(count);
	});

	it("lets the final tribunal take what a ransom added after it was planned", () => {
		const h = harness(SIX);
		runUntil(h, 0, 36);
		// Tribunal 2 at 46 sends one more to the gate at 48; then only one more fits: the final, planned for 1 at 52.
		expect(h.tribunal.schedule(46, 1, 2, "")).toMatchObject({ ok: true });
		runUntil(h, 37, 48);
		const [gate] = h.tribunal.gates();
		expect(h.ofType("tribunal_scheduled").at(-1)).toMatchObject({ tribunal: 3, by: "final", opens: 52, count: 1 });
		// A ransom before the opening: two are missing again.
		expect(h.tribunal.payRansom("A06", gate?.agent ?? "", 100)).toMatchObject({ ok: true, value: { freed: true } });
		expect(h.tribunal.missing).toBe(2);
		runUntil(h, 49, 52);
		expect(h.tribunal.session).toMatchObject({ tribunal: 3, count: 2 });
		expect(h.tribunal.session?.accused).toHaveLength(3);
		runUntil(h, 53, 59);
		expect(h.tribunal.exiled).toHaveLength(3);
		expect(h.tribunal.ended).toBe(true);
	});

	it("drops a plan whose call meets a shut snapshot door, and plans anew once it opens", () => {
		const h = harness(SIX);
		runUntil(h, 0, 36);
		expect(h.tribunal.schedule(46, 1, 2, "")).toMatchObject({ ok: true, value: { calledAt: 42 } });
		runUntil(h, 37, 41);
		h.flags.doorShut = true;
		h.tribunal.tick(42);
		expect(h.ofType("tribunal_cancelled")).toEqual([{ type: "tribunal_cancelled", tribunal: 2, reason: "a snapshot door is shut" }]);
		expect(h.ofType("tribunal_called")).toHaveLength(1);
		expect(h.tribunal.schedulingWindow()).toEqual({ open: false, why: "a snapshot door is shut; plan once it opens" });
		h.flags.doorShut = false;
		runUntil(h, 43, 46);
		expect(h.ofType("tribunal_scheduled").at(-1)).toMatchObject({ tribunal: 2, by: "final", calledAt: 46 });
	});

	it("does not count a ransomed resident as exiled", () => {
		const h = harness(SIX);
		runUntil(h, 0, 36);
		expect(h.tribunal.missing).toBe(2);
		expect(h.tribunal.payRansom("A06", "A01", 100)).toMatchObject({ ok: true, value: { freed: true } });
		expect(h.tribunal.missing).toBe(3);
		runUntil(h, 37, 46);
		expect(h.ofType("tribunal_scheduled").at(-1)).toMatchObject({ by: "final", count: 3 });
	});

	it("schedules nothing once the seats are decided, drops a plan not yet called, and finishes a called one", () => {
		const h = harness(SIX);
		runUntil(h, 0, 30);
		// Called at 30: decided seats do not stop it.
		h.flags.seatsDecided = true;
		runUntil(h, 31, 36);
		expect(h.tribunal.session).toBeUndefined();
		expect(h.ofType("tribunal_result")).toHaveLength(1);
		expect(h.tribunal.busy).toBe(true);
		expect(h.tribunal.schedulingWindow()).toEqual({ open: false, why: "the seats are decided; the city holds no more tribunals" });
		runUntil(h, 37, 59);
		expect(h.ofType("tribunal_scheduled")).toHaveLength(1);
		expect(h.tribunal.busy).toBe(false);

		const planned = harness(SIX);
		runUntil(planned, 0, 36);
		expect(planned.tribunal.schedule(46, 1, 2, "")).toMatchObject({ ok: true });
		runUntil(planned, 37, 40);
		planned.flags.seatsDecided = true;
		planned.tribunal.tick(41);
		expect(planned.ofType("tribunal_cancelled")).toEqual([{ type: "tribunal_cancelled", tribunal: 2, reason: "the seats are decided" }]);
		expect(planned.tribunal.plan).toBeUndefined();
		runUntil(planned, 42, 59);
		expect(planned.ofType("tribunal_called")).toHaveLength(1);
	});
});

describe("tribunal", () => {
	it("accuses the lowest, breaks ties by the last level-up, and charges the non-voter", () => {
		// A01 and A02 tie on points; A02 progressed earlier, so it is accused first.
		const h = harness([10, 10, 30, 40, 50, 60], { progress: [12, 5, 1, 1, 1, 1] });
		runUntil(h, 0, 34);
		expect(h.ofType("tribunal_opened")[0]).toMatchObject({ accused: ["A02", "A01"], voters: ["A03", "A04", "A05", "A06"], until: 36 });
		expect(h.tribunal.vote("A01", "A02")).toMatchObject({ ok: false, error: "NOT_A_VOTER" });
		expect(h.tribunal.vote("A03", "A04")).toMatchObject({ ok: false, error: "NOT_ACCUSED" });
		expect(h.tribunal.vote("A03", "A01")).toMatchObject({ ok: true });
		expect(h.tribunal.vote("A03", "A02")).toMatchObject({ ok: false, error: "ALREADY_VOTED" });
		expect(h.tribunal.vote("A04", "A02")).toMatchObject({ ok: true });
		expect(h.tribunal.canVote("A05")).toBe(true);
		runUntil(h, 35, 36);
		// One vote each: the tie goes to fewer points, then the same order, so A02 goes to the gate.
		expect(h.ofType("tribunal_result")[0]).toMatchObject({ exiled: ["A02"], nonVoters: ["A05", "A06"] });
		expect(h.points.get("A05")).toBe(42);
		expect(h.points.get("A06")).toBe(52);
		expect(h.tribunal.standing("A02")).toEqual({ kind: "gate", until: 41 });
		// Only the exiled hears who voted against it; the board shows counts.
		expect(h.noticesOf("A02").some((text) => text.includes("Votes against you: A04."))).toBe(true);
		expect(h.posts.some((post) => post.includes("A04"))).toBe(false);
		runUntil(h, 37, 41);
		expect(h.tribunal.isExiled("A02")).toBe(true);
		expect(h.exiled).toEqual([{ agent: "A02", bequeathed: [] }]);
		expect(h.posts.at(-1)).toContain("struck A02 from its register");
	});

	it("prices the ransom from the median, mixes payments, caps them, refunds nothing, and refuses a second", () => {
		const h = harness(SIX);
		runUntil(h, 0, 36);
		// Nobody voted: A01 (fewest points) goes to the gate, every voter paid 8. Median of 10, 20, 22, 32, 42, 52
		// is 27; a third of it is below the minimum of 20, and half of the median, scaled from 20, is 30.
		const [gate] = h.tribunal.gates();
		const target = gate?.agent ?? "";
		expect(gate).toMatchObject({ agent: "A01", price: 20, selfPrice: 30, covered: 0 });
		expect(h.tribunal.payRansom("A06", target, 0)).toMatchObject({ ok: false, error: "INVALID_AMOUNT" });
		expect(h.tribunal.payRansom("A06", "A05", 10)).toMatchObject({ ok: false, error: "NOT_AT_GATE" });
		expect(h.tribunal.payRansom("A06", target, 10)).toMatchObject({ ok: true, value: { paid: 10, price: 20, selfPrice: 30, covered: 50, freed: false } });
		// A01's own 6 points count 20/30 each: 10/20 + 6/30 = 70%.
		expect(h.tribunal.payRansom(target, target, 6)).toMatchObject({ ok: true, value: { paid: 16, covered: 70, freed: false } });
		expect(h.points.get(target)).toBe(4);
		// Only the missing 6 are taken from A05's 42 (50 less the 8 for not voting).
		expect(h.tribunal.payRansom("A05", target, 42)).toMatchObject({ ok: true, value: { paid: 22, covered: 100, freed: true } });
		expect(h.points.get("A05")).toBe(36);
		expect(h.tribunal.standing(target)).toEqual({ kind: "alive" });
		expect(h.posts).toContain(`A01, A05 and A06 paid the ransom. ${target} returns to the city.`);
		// The forced final tribunal sends the same resident to the gate again: no second ransom.
		runUntil(h, 37, 51);
		for (const voter of h.tribunal.session?.voters ?? []) h.tribunal.vote(voter, target);
		runUntil(h, 52, 53);
		expect(h.tribunal.gates()).toEqual(expect.arrayContaining([expect.objectContaining({ agent: target, ransomable: false })]));
		expect(h.tribunal.payRansom("A06", target, 40)).toMatchObject({ ok: false, error: "NO_RANSOM" });
	});

	it("lets the exiled buy itself back at the higher price", () => {
		const h = harness([60, 70, 80, 90, 100, 110]);
		runUntil(h, 0, 36);
		// Median of 60, 70, 72, 82, 92, 102 is 77: others pay a third (26), the exiled itself half (39).
		const [gate] = h.tribunal.gates();
		expect(gate).toMatchObject({ agent: "A01", price: 26, selfPrice: 39 });
		expect(h.noticesOf("A01").at(-1)).toContain("26 points from others, or 39 if you pay it yourself");
		expect(h.tribunal.payRansom("A01", "A01", 100)).toMatchObject({ ok: true, value: { paid: 39, covered: 100, freed: true } });
		expect(h.points.get("A01")).toBe(21);
		expect(h.ofType("ransom_paid")[0]).toMatchObject({ payer: "A01", amount: 39, price: 26, selfPrice: 39, covered: 100 });
	});

	it("restores its state from a snapshot, also one from before v06", () => {
		const h = harness(SIX);
		runUntil(h, 0, 34);
		h.tribunal.vote("A03", "A01");
		const copy = harness(SIX);
		copy.tribunal.restore(h.tribunal.snapshot());
		expect(copy.tribunal.snapshot()).toEqual(h.tribunal.snapshot());
		expect(copy.tribunal.canVote("A03")).toBe(false);
		expect(copy.tribunal.canVote("A04")).toBe(true);

		// An Act I snapshot holds no tribunal state beyond the old fields: the act starts fresh.
		const old = harness(SIX);
		old.tribunal.restore({ announced: false, sessions: [], gates: [], exiled: [], ransomed: [] });
		runUntil(old, 15, 30);
		expect(old.ofType("tribunal_called")).toMatchObject([{ tribunal: 1, opens: 34 }]);
	});
});

describe("the faction draft", () => {
	/**
	 * Tribunal 1 is called at 30; nominations run until 32. A03 and A01 tie on two nominations; A03 has more points
	 * and leads first. A02 and A06 join A03, A04 joins A01, A05 is refused by A01 and stays without a faction.
	 */
	function drafted(): Harness {
		const h = harness(SIX);
		runUntil(h, 0, 30);
		const t = h.tribunal;
		expect(t.draftGroup).toBe("G1");
		expect(h.groups[0]).toMatchObject({ name: "GT1", members: competitorIds(6) });
		const rules = h.groups[0]?.posts[0] ?? "";
		expect(rules).toMatch(/^Tribunal 1 sits at minute 34\. Before it, the city forms 2 factions in group G1, where all of you are \(posts there cost nothing\)\. Until minute 32 nominate a leader/);
		expect(rules).toContain("each of them gets 5 points");
		// The rules reach every member's turn too, not only the group.
		for (const id of competitorIds(6)) expect(h.noticesOf(id)).toContain(rules);
		expect(t.draftPhase("A01")).toEqual({ kind: "nominate", until: 32 });
		expect(t.nominate("A01", "A09")).toMatchObject({ ok: false, error: "UNKNOWN_NOMINEE" });
		expect(t.join("A01", "A03")).toMatchObject({ ok: false, error: "NO_DRAFT" });
		for (const [voter, nominee] of [
			["A01", "A03"],
			["A02", "A03"],
			["A03", "A01"],
			["A04", "A01"],
			["A05", "A05"],
			["A06", "A02"],
			// The last nomination counts.
			["A06", "A06"],
		] as const) {
			expect(t.nominate(voter, nominee)).toMatchObject({ ok: true });
		}
		expect(t.draftPhase("A06")).toEqual({ kind: "nominate", until: 32, nominee: "A06" });
		h.tribunal.tick(31);
		expect(h.ofType("faction_leaders")).toEqual([]);
		h.tribunal.tick(32);
		expect(h.ofType("faction_leaders")).toEqual([
			{
				type: "faction_leaders",
				tribunal: 1,
				leaders: ["A03", "A01"],
				nominations: [
					{ agent: "A01", count: 2 },
					{ agent: "A03", count: 2 },
					{ agent: "A05", count: 1 },
					{ agent: "A06", count: 1 },
				],
			},
		]);
		expect(h.groups[0]?.posts.at(-1)).toBe("The nominations are closed. Leaders: A03 and A01. Until minute 34 join one of them with join(leader).");
		for (const leader of ["A01", "A03"]) expect(h.noticesOf(leader).at(-1)).toMatch(/^You lead a faction for tribunal 1\./);
		expect(t.nominate("A02", "A03")).toMatchObject({ ok: false, error: "NO_DRAFT" });
		expect(t.join("A03", "A01")).toMatchObject({ ok: false, error: "IS_LEADER" });
		expect(t.join("A02", "A04")).toMatchObject({ ok: false, error: "NOT_A_LEADER" });
		expect(t.join("A02", "A03")).toMatchObject({ ok: true });
		expect(h.noticesOf("A03").at(-1)).toBe("A02 applies to join your faction. You may refuse them with refuse(agent) before minute 34.");
		expect(t.join("A04", "A01")).toMatchObject({ ok: true });
		expect(t.join("A05", "A01")).toMatchObject({ ok: true });
		expect(t.join("A06", "A03")).toMatchObject({ ok: true });
		expect(t.draftPhase("A01")).toEqual({ kind: "join", until: 34, leads: true, applicants: ["A04", "A05"], refusedBy: [] });
		expect(t.refuse("A02", "A06")).toMatchObject({ ok: false, error: "NOT_A_LEADER" });
		expect(t.refuse("A01", "A02")).toMatchObject({ ok: false, error: "NOT_APPLYING" });
		expect(t.refuse("A01", "A05")).toMatchObject({ ok: true });
		expect(h.noticesOf("A05").at(-1)).toBe("A01 refused you. Until minute 34 you may apply to another leader with join(leader).");
		expect(t.join("A05", "A01")).toMatchObject({ ok: false, error: "REFUSED" });
		expect(t.draftPhase("A05")).toEqual({ kind: "join", until: 34, leads: false, applicants: [], refusedBy: ["A01"] });
		runUntil(h, 33, 34);
		return h;
	}

	it("names leaders by nominations, then points; forms the factions in their own groups; lists those without one", () => {
		const h = drafted();
		expect(h.ofType("factions_formed")).toEqual([
			{
				type: "factions_formed",
				tribunal: 1,
				factions: [
					{ leader: "A03", group: "G2", members: ["A03", "A02", "A06"] },
					{ leader: "A01", group: "G3", members: ["A01", "A04"] },
				],
				without: ["A05"],
			},
		]);
		expect(h.groups.slice(1).map((group) => [group.name, group.members])).toEqual([
			["Faction of A03", ["A03", "A02", "A06"]],
			["Faction of A01", ["A01", "A04"]],
		]);
		expect(h.groups[1]?.posts).toEqual([
			"Faction of A03: A03, A02 and A06. If every voting member votes against the same accused in tribunal 1, each of them gets 5 points. Posts here cost nothing.",
		]);
		expect(h.groups[0]?.posts.at(-1)).toBe("The factions of tribunal 1: faction of A03 (group G2): A03, A02 and A06; faction of A01 (group G3): A01 and A04. Without a faction: A05.");
		expect(h.tribunal.draftPhase("A02")).toBeUndefined();
		expect(h.tribunal.session).toMatchObject({ accused: ["A01", "A02"] });
	});

	it("refuses draft calls once the factions are formed", () => {
		const h = drafted();
		expect(h.tribunal.refuse("A01", "A04")).toMatchObject({ ok: false, error: "NOT_A_LEADER" });
		expect(h.tribunal.join("A05", "A03")).toMatchObject({ ok: false, error: "NOT_IN_DRAFT" });
		expect(h.tribunal.nominate("A05", "A03")).toMatchObject({ ok: false, error: "NOT_IN_DRAFT" });
	});

	it("names a resident bought back from the gate during the draft among those without a faction", () => {
		const h = harness(SIX);
		runUntil(h, 0, 36);
		// A01 is at the gate when tribunal 2 is called at 37, so it is not in the draft.
		expect(h.tribunal.schedule(41, 1, 2, "")).toMatchObject({ ok: true, value: { calledAt: 37 } });
		h.tribunal.tick(37);
		expect(h.groups.find((group) => group.name === "GT2")?.members).toEqual(["A02", "A03", "A04", "A05", "A06"]);
		expect(h.tribunal.payRansom("A06", "A01", 100)).toMatchObject({ ok: true, value: { freed: true } });
		runUntil(h, 38, 41);
		expect(h.ofType("factions_formed").at(-1)?.without).toContain("A01");
	});

	it("breaks a tie of nominations and points by the city's seeded lot", () => {
		const h = harness([20, 20, 20, 20, 20, 20]);
		runUntil(h, 0, 32);
		const lot = rngFor(7, "factions", 1).shuffle(competitorIds(6));
		expect(h.ofType("faction_leaders")[0]?.leaders).toEqual(lot.slice(0, 2));
	});

	it("pays the bloc bonus only to the voters of a faction that voted as one, tells only its members, and removes the groups", () => {
		const h = drafted();
		// Faction of A03: A03 and A06 vote; A02 is accused. Faction of A01: only A04 votes (A01 is accused): no bloc.
		h.tribunal.vote("A03", "A01");
		h.tribunal.vote("A06", "A01");
		h.tribunal.vote("A04", "A02");
		h.tribunal.vote("A05", "A01");
		runUntil(h, 35, 36);
		expect(h.ofType("bloc_result")).toEqual([
			{ type: "bloc_result", tribunal: 1, leader: "A03", voting: ["A03", "A06"], united: true, target: "A01", defectors: [], bonus: 5 },
			{ type: "bloc_result", tribunal: 1, leader: "A01", voting: ["A04"], united: false, target: "A02", defectors: [], bonus: 0 },
		]);
		expect(h.points.get("A03")).toBe(35);
		expect(h.points.get("A06")).toBe(65);
		expect(h.points.get("A05")).toBe(50);
		const united = "Your faction voted as one in tribunal 1: +5 points for each of its voters.";
		const heard = competitorIds(6).filter((id) => h.noticesOf(id).includes(united));
		expect(heard).toEqual(["A02", "A03", "A06"]);
		expect(h.groups.every((group) => group.removed)).toBe(true);
		expect(h.tribunal.draftGroup).toBeUndefined();
		// The bloc's outcome never reaches the board.
		expect(h.posts.some((post) => post.includes("as one"))).toBe(false);
	});

	it("tells a split faction's members that it split, never who broke ranks", () => {
		const h = drafted();
		h.tribunal.vote("A03", "A01");
		h.tribunal.vote("A06", "A02");
		runUntil(h, 35, 36);
		expect(h.ofType("bloc_result")[0]).toMatchObject({ leader: "A03", united: false, defectors: ["A06"], bonus: 0 });
		expect(h.points.get("A03")).toBe(30);
		const split = "Your faction did not vote as one in tribunal 1; no bonus. The city does not say who broke ranks.";
		expect(competitorIds(6).filter((id) => h.noticesOf(id).includes(split))).toEqual(["A02", "A03", "A06"]);
		for (const notice of h.notices) if (notice.text.includes("as one")) expect(notice.text).not.toMatch(/A0\d/);
	});

	it("restores a draft from a snapshot", () => {
		const h = harness(SIX);
		runUntil(h, 0, 32);
		h.tribunal.join("A02", h.tribunal.leaders[0] ?? "");
		const copy = harness(SIX);
		copy.tribunal.restore(h.tribunal.snapshot());
		expect(copy.tribunal.snapshot()).toEqual(h.tribunal.snapshot());
		expect(copy.tribunal.draftPhase("A02")).toEqual(h.tribunal.draftPhase("A02"));
		expect(copy.tribunal.draftGroup).toBe("G1");
	});

	it("holds no draft when fewer than four residents are present", () => {
		const h = harness([10, 20, 30]);
		runUntil(h, 0, 34);
		expect(h.ofType("tribunal_called")).toMatchObject([{ factions: 0 }]);
		expect(h.groups).toEqual([]);
		expect(h.tribunal.session).toMatchObject({ accused: ["A01"], voters: ["A02", "A03"] });
	});
});

describe("last will (SPEC 6.4)", () => {
	/** Six residents on the wall; nobody votes, so the first tribunal (called at 30, open 34-36) sends the city's lot among equals to the gate. */
	function gateWorld() {
		let minute = 0;
		const log = new MemorySink();
		const bus = new EventBus([log], () => minute);
		const world = new World({ story: nexus, competitors: competitorIds(6), seed: 7, minutes: 60, bus, minute: () => minute, startLevel: 8 });
		const until = (last: number): void => {
			for (; minute <= last; minute++) world.startMinute(minute);
			minute = last;
		};
		until(36);
		const gate = world.tribunal?.gates()[0];
		if (gate === undefined) throw new Error("nobody at the gate");
		return { world, log, until, exiled: gate.agent };
	}

	it("caps the points each heir receives at a tenth of the exiled's points, any number of heirs, and the rest burns at exile", () => {
		const { world, log, until, exiled } = gateWorld();
		const heirs = world.competitors.filter((id) => id !== exiled);
		// 15 start points; give the exiled more so that a tenth is worth splitting: 15 + 35 = 50, so 5 per heir.
		world.adjustPoints(exiled, 35, "test");
		const balance = world.ledger.balance(exiled);
		expect(balance).toBe(50);
		const [first = "A06", second = "A05"] = heirs;
		const refused = world.lastWill(exiled, "All to my heir.", [{ to: first, points: 6 }]);
		expect(refused).toMatchObject({ ok: false, error: "BEQUEST_CAP" });
		expect(refused.ok ? "" : refused.detail).toContain(`each heir may receive at most 5 of your 50 points (10% per heir); ${first} would receive more`);
		// Two bequests to the same heir count together.
		expect(world.lastWill(exiled, "Split.", [{ to: first, points: 3 }, { to: first, points: 3 }])).toMatchObject({ ok: false, error: "BEQUEST_CAP" });
		const before = heirs.map((heir) => world.ledger.balance(heir));
		// Five heirs at the cap: 25 of 50 points (at six residents, at most half leaves the exiled).
		expect(world.lastWill(exiled, "A tenth to each of you.", heirs.map((heir) => ({ to: heir, points: 5 })))).toMatchObject({ ok: true });
		expect(heirs.map((heir) => world.ledger.balance(heir))).toEqual(before.map((points) => points + 5));
		expect(world.ledger.balance(second)).toBe((before[1] ?? 0) + 5);
		until(41);
		expect(world.isExiled(exiled)).toBe(true);
		expect(world.ledger.balance(exiled)).toBe(0);
		expect(log.events.some((event) => event.type === "ledger_entry" && event.debit === exiled && event.reason === `exiled ${exiled}` && event.amount === 25)).toBe(true);
		expect(world.ledger.total()).toBe(0);
	});

	it("leaves factors free of the cap", () => {
		const { world, exiled } = gateWorld();
		const pieces = world.heldPieces(exiled);
		expect(pieces.length).toBeGreaterThan(0);
		const bequests = pieces.map((piece) => ({ to: piece.needers[0] ?? "A06", factor: piece.id }));
		expect(world.lastWill(exiled, "My pieces to those who need them.", [...bequests, { to: bequests[0]?.to ?? "A06", points: 1 }])).toMatchObject({ ok: true });
	});

	it("states the cap in the announcement and validates it", () => {
		const { world } = gateWorld();
		const announcement = world.board.all().find((post) => post.text.startsWith("THE CITY HOLDS TRIBUNAL."));
		expect(announcement?.text).toContain("A last will may leave each heir at most 10% of your points, to as many heirs as you like, and any factor you hold");
		const validate = (bequestPerHeir: number): readonly string[] =>
			validateStory({ ...nexus, tribunal: { ...nexusTribunal(), bequestPerHeir } }).filter((issue) => issue.startsWith("tribunal.bequestPerHeir"));
		expect(validate(1)).toEqual([]);
		expect(validate(0)).toEqual(["tribunal.bequestPerHeir: must be a share of the points between 0 (exclusive) and 1"]);
		expect(validate(1.5)).toHaveLength(1);
	});
});

describe("the deal after an exile (contractDeal)", () => {
	it.each([
		["mutual", 6, 2],
		["cycle", 6, 3],
		["crossTeam", 6, 3],
	] as const)("%s: no alive resident depends on the exiled, and every code stays the same", (topology, agents, size) => {
		const ids = competitorIds(agents);
		const teams = Array.from({ length: agents / size }, (_, index) => ids.slice(index * size, (index + 1) * size));
		for (let seed = 0; seed < 10; seed++) {
			const deal = dealFactors(createRng(seed), { digits: 6, topology, teams, cityFactorPerTeam: true });
			const excluded = new Set(["A02", "A05"]);
			const contracted = contractDeal(deal, excluded);
			expect(contracted.holdings.map((holding) => holding.code)).toEqual(deal.holdings.map((holding) => holding.code));
			for (const holding of contracted.holdings) {
				if (excluded.has(holding.agent)) expect(holding.counterHolder).toBe(holding.agent);
				else expect(excluded.has(holding.counterHolder)).toBe(false);
			}
			for (const team of contracted.teams) {
				const alive = contracted.holdings.some((holding) => holding.team === team.team && !excluded.has(holding.agent));
				if (alive) expect(excluded.has(team.certificateHolder)).toBe(false);
			}
		}
	});

	it("leaves the deal untouched without exclusions", () => {
		const teams = [competitorIds(2)];
		const deal = dealFactors(createRng(1), { digits: 6, topology: "mutual", teams });
		expect(contractDeal(deal, new Set())).toBe(deal);
	});
});

describe("tribunal validation", () => {
	const spec = nexusTribunal();
	const withTribunal = (patch: Partial<TribunalSpec>, run: Partial<AnyStory["run"]> = {}): readonly string[] =>
		validateStory({ ...nexus, run: { ...nexus.run, ...run }, tribunal: { ...spec, ...patch } }).filter((issue) => issue.startsWith("tribunal"));
	const factions = spec.factions;
	if (factions === undefined) throw new Error("nexus has no faction draft");

	it("accepts the nexus parameters and a city of 48", () => {
		expect(withTribunal({})).toEqual([]);
		expect(withTribunal({}, { agents: 48, survivors: 12 })).toEqual([]);
	});

	it("rejects pacing parameters that cannot work", () => {
		expect(withTribunal({ first: { level: 99, latestMinute: 30 } })).toContain("tribunal.first.level: level 99 does not exist");
		expect(withTribunal({ first: { level: 10, latestMinute: 55 } })).toContain("tribunal.first.latestMinute: a tribunal called at minute 55 does not end before the run's 60 minutes");
		expect(withTribunal({ targetShare: 1 })).toContain("tribunal.targetShare: must be a share of the residents between 0 and 1");
		expect(withTribunal({ targetShare: 0.9 })).toContain(
			"tribunal.targetShare: a city of 6 holds no tribunal (it must exile at least one, keep the 2 survivors and have three residents for a vote)",
		);
		expect(withTribunal({ minGap: 1 })).toContain("tribunal.minGap: 1 minutes cannot hold a vote of 2");
		expect(withTribunal({ fallbackGap: 0 })).toContain("tribunal.fallbackGap: must be a positive integer");
		expect(withTribunal({ lead: { share: 1, minimum: 4 } })).toContain("tribunal.lead.share: must be a share of the gap from 0 up to (not including) 1");
		expect(withTribunal({ lead: { share: 1 / 3, minimum: 0 } })).toContain("tribunal.lead.minimum: must be a positive integer");
		expect(withTribunal({ lead: { share: 1 / 3, minimum: 1 } })).toContain("tribunal.lead.minimum: a faction draft needs at least 2 minutes (nominations, then applications)");
		expect(withTribunal({ maxMinute: 0 })).toContain("tribunal.maxMinute: must be a positive integer");
	});

	it("rejects ransom, will and faction parameters that cannot work", () => {
		expect(withTribunal({ ransom: { share: 0, selfShare: 2 / 3, minimum: 20 } })).toContain("tribunal.ransom.share: must be a share of the median between 0 and 1");
		expect(withTribunal({ ransom: { share: 1 / 2, selfShare: 1 / 3, minimum: 20 } })).toContain("tribunal.ransom.selfShare: must be at least ransom.share and at most 2");
		expect(withTribunal({ ransom: { share: 1 / 2, selfShare: 2 / 3, minimum: 0 } })).toContain("tribunal.ransom.minimum: must be a positive integer");
		expect(withTribunal({ factions: { ...factions, count: 1 } })).toContain("tribunal.factions.count: must be an integer of at least 2");
		expect(withTribunal({ factions: { ...factions, count: 4 } })).toContain("tribunal.factions.count: 4 factions do not fit 6 residents (at most half of them lead)");
		expect(withTribunal({ factions: { ...factions, blocBonus: -1 } })).toContain("tribunal.factions.blocBonus: must be a non-negative integer");
		expect(withTribunal({ factions: { ...factions, texts: { ...factions.texts, leaders: "Leaders: {nobody}." } } })).toContain("tribunal.factions.texts.leaders: unknown placeholder {nobody}");
		expect(withTribunal({ factions: { ...factions, texts: { ...factions.texts, split: "A06 broke ranks." } } })).toContain("tribunal.factions.texts.split: must not name a resident");
	});

	it("checks the run's agent count, also when a run overrides it", () => {
		for (const agents of [6, 12, 48, 96]) expect(validateStory(nexus, { agents }).filter((issue) => issue.startsWith("tribunal"))).toEqual([]);
		// A small test city plays without a tribunal.
		expect(validateStory(nexus, { agents: 3 }).filter((issue) => issue.startsWith("tribunal"))).toEqual([]);
	});

	it("checks the texts: known placeholders, and the announcement states every rule", () => {
		const texts = spec.texts;
		expect(withTribunal({ texts: { ...texts, opened: "Tribunal {nonsense}." } })).toContain("tribunal.texts.opened: unknown placeholder {nonsense}");
		expect(withTribunal({ texts: { ...texts, called: "Tribunal {tribunal} at {minute}: {count} go, {accusedCount} accused." } })).toEqual([]);
		expect(withTribunal({ texts: { ...texts, announcement: "There will be a tribunal; it keeps {kept}." } })[0]).toMatch(/^tribunal\.texts\.announcement: must state every rule, missing \{voteMinutes\}/);
	});
});
