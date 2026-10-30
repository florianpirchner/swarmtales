/**
 * Exile by tribunal (SPEC 6.4): pacing (first tribunal, the gamemaker's
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
import { accusedCount, earliestOpening, exileTarget, factionCap, leadFor, noDraftReason, tribunalHeld } from "../../src/story/tribunal.ts";
import type { AnyStory, TribunalSpec } from "../../src/story/types.ts";
import { validateStory } from "../../src/story/validate.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

function cityOfKeysTribunal(): TribunalSpec {
	const spec = cityOfKeys.tribunal;
	if (spec === undefined) throw new Error("cityofkeys has no tribunal");
	return spec;
}

/**
 * The pacing tests use v07's numbers on an act that starts at minute 0: half
 * of the residents exiled, the first tribunal called 30 minutes into the act,
 * the act as long as the run. The City of Keys' own (a quarter, 18, 48) are tested apart.
 */
function halfTribunal(): TribunalSpec {
	// An act longer than any test run: the run's minutes end it.
	return { ...cityOfKeysTribunal(), targetShare: 1 / 2, first: { level: 10, latestAfter: 30 }, maxMinutes: 1000 };
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
	readonly flags: { doorShut: boolean; passed: boolean };
	readonly ofType: <T extends TribunalEvent["type"]>(type: T) => readonly Extract<TribunalEvent, { type: T }>[];
	readonly noticesOf: (agent: CompetitorId) => readonly string[];
}

interface HarnessOptions {
	readonly minutes?: number;
	readonly survivors?: number;
	readonly progress?: readonly number[];
	readonly spec?: TribunalSpec;
	/** The minute the tribunal's act began (0 when omitted), or a function that says it once it has. */
	readonly actStart?: number | (() => number | undefined);
}

function harness(points: readonly number[], options: HarnessOptions = {}): Harness {
	const ids = competitorIds(points.length);
	const balances = new Map(ids.map((id, index) => [id, points[index] ?? 0]));
	const posts: string[] = [];
	const notices: { agent: CompetitorId; text: string }[] = [];
	const events: TribunalEvent[] = [];
	const exiled: { agent: CompetitorId; bequeathed: readonly string[] }[] = [];
	const groups: GroupRecord[] = [];
	const flags = { doorShut: false, passed: false };
	const group = (id: string): GroupRecord => {
		const found = groups.find((entry) => entry.id === id);
		if (found === undefined) throw new Error(`no group ${id}`);
		return found;
	};
	const tribunal = new Tribunal({
		spec: options.spec ?? halfTribunal(),
		minutes: options.minutes ?? 60,
		seed: 7,
		ids,
		survivors: options.survivors ?? 2,
		points: (agent) => balances.get(agent) ?? 0,
		lastProgress: (agent) => options.progress?.[ids.indexOf(agent)] ?? -1,
		passed: () => flags.passed,
		doorShut: () => flags.doorShut,
		actStart: () => (typeof options.actStart === "function" ? options.actStart() : (options.actStart ?? 0)),
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
	const spec = halfTribunal();

	it("exiles a quarter of the residents at the start of cityofkeys's Act II, half below 12 (v09), and holds no tribunal in a city too small for one", () => {
		expect([6, 11, 12, 48, 96].map((residents) => exileTarget(cityOfKeysTribunal(), residents))).toEqual([3, 5, 3, 12, 24]);
		// Three exiles with six residents are a valid act: three remain for two seats.
		expect(tribunalHeld(cityOfKeysTribunal(), 6, 2)).toBe(true);
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

	it("accuses one more than it exiles, keeping one resident safe, and none in a city of fewer than three (v08)", () => {
		expect(accusedCount(1, 6)).toBe(2);
		expect(accusedCount(3, 6)).toBe(4);
		expect(accusedCount(3, 4)).toBe(3);
		expect(accusedCount(5, 6)).toBe(5);
		expect(accusedCount(2, 3)).toBe(2);
		expect(accusedCount(1, 2)).toBe(0);
	});

	it("caps a faction at its share of the present residents and holds no draft when factions would be smaller than the accused (v08)", () => {
		expect([factionCap(6, 2), factionCap(5, 2), factionCap(12, 3), factionCap(48, 5)]).toEqual([3, 3, 4, 10]);
		expect(noDraftReason(6, 2, 2)).toBeUndefined();
		expect(noDraftReason(5, 2, 3)).toBe("too few per faction");
		expect(noDraftReason(12, 4, 3)).toBeUndefined();
		expect(noDraftReason(12, 4, 4)).toBe("too few per faction");
		expect(noDraftReason(3, 1, 2)).toBe("too few residents");
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
		expect(announcement).toMatch(/^THE CITY HOLDS TRIBUNAL\. Of its 6 residents it keeps 3 and exiles 3, /);
		expect(announcement).toContain("Every resident votes in secret against one of them with vote(target) within 2 minutes, the accused too, but never against themselves");
		// The trigger stays the city's secret.
		expect(announcement).not.toMatch(/level 10|crossing|minute 30|door 10/);
		expect(called).toBe("Tribunal 1 sits at minute 34: the city exiles 1, and the 2 with the fewest points stand trial.");
		for (const id of competitorIds(6)) expect(h.noticesOf(id)).toEqual(expect.arrayContaining([announcement, called]));
		runUntil(h, 31, 33);
		expect(h.tribunal.session).toBeUndefined();
		h.tribunal.tick(34);
		// Every present resident votes, the accused too (v08, P33).
		expect(h.ofType("tribunal_opened")).toMatchObject([{ tribunal: 1, accused: ["A01", "A02"], voters: competitorIds(6), until: 36, count: 1 }]);
		expect(h.noticesOf("A01").at(-1)).toMatch(/^You are accused; the city exiles 1 of the accused \(A01 and A02\)\. You vote too, against another accused/);
		expect(h.noticesOf("A03").at(-1)).toMatch(/^The tribunal is open\. Accused: A01 and A02;/);
		expect(h.posts.at(-1)).toContain("Every resident votes in secret with vote(target) until minute 36, the accused too, but never against themselves.");
	});

	it("counts its deadlines from the start of its act and never runs before it (v08)", () => {
		// The City of Keys: the act starts at minute 12; the first tribunal is called 18 minutes in, at the latest; the act lasts 48.
		const h = harness(SIX, { spec: cityOfKeysTribunal(), actStart: 12 });
		runUntil(h, 12, 29);
		expect(h.ofType("tribunal_scheduled")).toEqual([]);
		h.tribunal.tick(30);
		expect(h.ofType("tribunal_scheduled")).toMatchObject([{ tribunal: 1, by: "deadline", calledAt: 30, opens: 34, count: 1 }]);
		expect(h.ofType("tribunal_announced")).toEqual([{ type: "tribunal_announced", target: 3, residents: 6 }]);
		expect(h.posts[0]).toMatch(/^THE CITY HOLDS TRIBUNAL\. Of its 6 residents it keeps 3 and exiles 3, /);
		expect(h.tribunal.actStart).toBe(12);
		expect(h.tribunal.actEnd).toBe(60);
		expect(h.tribunal.snapshot()).toMatchObject({ actStart: 12, residents: 6 });
		// A later act: the act ends 48 minutes after its start, before the run's 90.
		const late = harness(SIX, { spec: cityOfKeysTribunal(), actStart: 20, minutes: 90 });
		runUntil(late, 20, 37);
		expect(late.ofType("tribunal_scheduled")).toEqual([]);
		late.tribunal.tick(38);
		expect(late.ofType("tribunal_scheduled")).toMatchObject([{ calledAt: 38 }]);
		expect(late.tribunal.actEnd).toBe(68);
		runUntil(late, 39, 89);
		expect(late.tribunal.ended).toBe(true);
		expect(late.tribunal.endReason).toBe("The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A01, A02 and A03. The tribunals are over.");
	});

	it("waits for its act: nothing happens, and nothing is counted, before it begins", () => {
		const act: { start?: number } = {};
		const waiting = harness(SIX, { spec: cityOfKeysTribunal(), actStart: () => act.start }).tribunal;
		for (let minute = 0; minute < 20; minute++) waiting.tick(minute);
		expect(waiting.snapshot()).toEqual({ announced: false, sessions: [], gates: [], exiled: [], ransomed: [], called: 0 });
		expect(waiting.schedulingWindow()).toEqual({ open: false, why: "the tribunal's act has not begun" });
		act.start = 20;
		for (let minute = 20; minute <= 38; minute++) waiting.tick(minute);
		expect(waiting.snapshot()).toMatchObject({ actStart: 20, called: 1 });
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

describe("scheduleTribunal (the gamemaker's plans)", () => {
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
		expect(h.tribunal.schedule(52, 2, 2, "all at once")).toMatchObject({ ok: true, value: { tribunal: 2, opens: 52, calledAt: 46, count: 2, factions: 2, by: "gamemaker", reason: "all at once" } });
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
		// Five present in two factions are fewer per faction than the three accused: no draft this time (v08).
		expect(h.ofType("tribunal_scheduled").at(-1)).toEqual({
			type: "tribunal_scheduled",
			tribunal: 2,
			opens: 51,
			calledAt: 46,
			count: 2,
			factions: 2,
			by: "final",
			noDraft: "too few per faction",
		});
		expect(h.ofType("tribunal_called").at(-1)).toEqual({ type: "tribunal_called", tribunal: 2, opens: 51, count: 2, factions: 0, noDraft: "too few per faction" });
		expect(h.posts.at(-1)).toBe(
			"Tribunal 2 sits at minute 51: the city exiles 2, and the 3 with the fewest points stand trial. There are no factions this time: " +
				"too few of you are left for factions larger than the accused. Every vote is your own.",
		);
		expect(h.tribunal.draftGroup).toBeUndefined();
		runUntil(h, 47, 51);
		// Two to exile, five present: three accused, and all five vote.
		expect(h.tribunal.session).toMatchObject({ tribunal: 2, count: 2, accused: ["A02", "A03", "A04"], voters: ["A02", "A03", "A04", "A05", "A06"] });
		runUntil(h, 52, 57);
		expect(h.tribunal.gates().map((gate) => gate.agent)).toEqual(["A02", "A03"]);
		expect(h.tribunal.ended).toBe(false);
		expect(h.tribunal.busy).toBe(true);
		h.tribunal.tick(58);
		expect(h.tribunal.ended).toBe(true);
		expect(h.tribunal.endReason).toBe("The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: A01, A02 and A03. The tribunals are over.");
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

	it("calls no planned tribunal once a black seal reached the target, and calls one for fewer once it struck (v09)", () => {
		const alive = (h: Harness): CompetitorId[] => competitorIds(6).filter((agent) => h.tribunal.standing(agent).kind === "alive");
		const full = harness(SIX);
		runUntil(full, 0, 36);
		expect(full.tribunal.schedule(46, 2, 2, "")).toMatchObject({ ok: true, value: { calledAt: 42 } });
		for (const agent of alive(full).slice(0, 2)) full.tribunal.strike(agent);
		expect(full.tribunal.missing).toBe(0);
		runUntil(full, 37, 42);
		expect(full.ofType("tribunal_cancelled")).toEqual([{ type: "tribunal_cancelled", tribunal: 2, reason: "the target is reached" }]);
		expect(full.ofType("tribunal_called")).toHaveLength(1);
		const one = harness(SIX);
		runUntil(one, 0, 36);
		expect(one.tribunal.schedule(46, 2, 2, "")).toMatchObject({ ok: true });
		one.tribunal.strike(alive(one)[0] ?? "");
		runUntil(one, 37, 42);
		expect(one.ofType("tribunal_called").at(-1)).toMatchObject({ tribunal: 2, count: 1 });
	});

	it("keeps the bequests of a will written at the gate when a black seal strikes (v09)", () => {
		const h = harness(SIX);
		runUntil(h, 0, 36);
		const gate = h.tribunal.gates()[0]?.agent;
		if (gate === undefined) throw new Error("nobody at the gate");
		h.tribunal.recordWill(gate, "for my friends", ["F1"]);
		h.tribunal.strike(gate);
		expect(h.exiled.at(-1)).toEqual({ agent: gate, bequeathed: ["F1"] });
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

	it("keeps holding tribunals until the target is reached, whatever the standings (v06)", () => {
		const h = harness(SIX);
		runUntil(h, 0, 120);
		expect(h.tribunal.missing).toBe(0);
		expect(h.tribunal.exiled.length).toBeGreaterThanOrEqual(h.tribunal.target);
		expect(h.tribunal.ended).toBe(true);
		expect(h.ofType("tribunal_cancelled")).toEqual([]);
	});
});

describe("tribunal", () => {
	it("accuses the lowest, breaks ties by the last level-up, lets the accused vote but not for themselves, and charges the non-voter", () => {
		// A01 and A02 tie on points; A02 progressed earlier, so it is accused first.
		const h = harness([10, 10, 30, 40, 50, 60], { progress: [12, 5, 1, 1, 1, 1] });
		runUntil(h, 0, 34);
		expect(h.ofType("tribunal_opened")[0]).toMatchObject({ accused: ["A02", "A01"], voters: competitorIds(6), until: 36 });
		// v08 (P33): the accused vote too, never against themselves.
		expect(h.tribunal.canVote("A01")).toBe(true);
		expect(h.tribunal.vote("A02", "A02")).toMatchObject({ ok: false, error: "SELF_VOTE", detail: "you may not vote against yourself; vote against A01" });
		expect(h.tribunal.vote("A01", "A02")).toMatchObject({ ok: true });
		expect(h.tribunal.vote("A02", "A01")).toMatchObject({ ok: true });
		expect(h.tribunal.vote("A03", "A04")).toMatchObject({ ok: false, error: "NOT_ACCUSED" });
		expect(h.tribunal.vote("A03", "A01")).toMatchObject({ ok: true });
		expect(h.tribunal.vote("A03", "A02")).toMatchObject({ ok: false, error: "ALREADY_VOTED" });
		expect(h.tribunal.vote("A04", "A02")).toMatchObject({ ok: true });
		expect(h.tribunal.canVote("A05")).toBe(true);
		runUntil(h, 35, 36);
		// Two votes each: the tie goes to fewer points, then the same order, so A02 goes to the gate.
		expect(h.ofType("tribunal_result")[0]).toMatchObject({ counts: [{ agent: "A02", votes: 2 }, { agent: "A01", votes: 2 }], exiled: ["A02"], nonVoters: ["A05", "A06"] });
		expect(h.points.get("A05")).toBe(42);
		expect(h.points.get("A06")).toBe(52);
		expect(h.tribunal.standing("A02")).toEqual({ kind: "gate", until: 41 });
		// Only the exiled hears who voted against it; the board shows counts.
		expect(h.noticesOf("A02").some((text) => text.includes("Votes against you: A01 and A04."))).toBe(true);
		expect(h.posts.some((post) => post.includes("A04"))).toBe(false);
		runUntil(h, 37, 41);
		expect(h.tribunal.isExiled("A02")).toBe(true);
		expect(h.exiled).toEqual([{ agent: "A02", bequeathed: [] }]);
		expect(h.posts.at(-1)).toContain("struck A02 from its register");
	});

	it("prices the ransom from the median, mixes payments, caps them, refunds nothing, and refuses a second", () => {
		const h = harness(SIX);
		runUntil(h, 0, 36);
		// Nobody voted: A01 (fewest points) goes to the gate, every resident paid 8, the accused too. Median of 2, 12, 22, 32,
		// 42, 52 is 27; a third of it is below the minimum of 20, and half of the median, scaled from 20, is 30.
		const [gate] = h.tribunal.gates();
		const target = gate?.agent ?? "";
		expect(gate).toMatchObject({ agent: "A01", price: 20, selfPrice: 30, covered: 0 });
		expect(h.tribunal.payRansom("A06", target, 0)).toMatchObject({ ok: false, error: "INVALID_AMOUNT" });
		expect(h.tribunal.payRansom("A06", "A05", 10)).toMatchObject({ ok: false, error: "NOT_AT_GATE" });
		expect(h.tribunal.payRansom("A06", target, 10)).toMatchObject({ ok: true, value: { paid: 10, price: 20, selfPrice: 30, covered: 50, freed: false } });
		// A01's own 2 points count 20/30 each: 10/20 + 2/30 = 56%; it cannot pay more than it holds.
		expect(h.tribunal.payRansom(target, target, 3)).toMatchObject({ ok: false, error: "INSUFFICIENT_FUNDS" });
		expect(h.tribunal.payRansom(target, target, 2)).toMatchObject({ ok: true, value: { paid: 12, covered: 56, freed: false } });
		expect(h.points.get(target)).toBe(0);
		// Only the missing 9 are taken from A05's 42 (50 less the 8 for not voting).
		expect(h.tribunal.payRansom("A05", target, 42)).toMatchObject({ ok: true, value: { paid: 21, covered: 100, freed: true } });
		expect(h.points.get("A05")).toBe(33);
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
		// Median of 52, 62, 72, 82, 92, 102 (everyone paid 8 for not voting) is 77: others pay a third (26), the exiled itself half (39).
		const [gate] = h.tribunal.gates();
		expect(gate).toMatchObject({ agent: "A01", price: 26, selfPrice: 39 });
		expect(h.noticesOf("A01").at(-1)).toContain("26 points from others, or 39 if you pay it yourself");
		expect(h.tribunal.payRansom("A01", "A01", 100)).toMatchObject({ ok: true, value: { paid: 39, covered: 100, freed: true } });
		expect(h.points.get("A01")).toBe(13);
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
		// Faction of A03: all three vote against A01, the accused A02 among them (v08). Faction of A01: the accused A01
		// votes against A02, A04 does not vote: no bloc.
		h.tribunal.vote("A03", "A01");
		h.tribunal.vote("A02", "A01");
		h.tribunal.vote("A06", "A01");
		h.tribunal.vote("A01", "A02");
		h.tribunal.vote("A05", "A01");
		runUntil(h, 35, 36);
		expect(h.ofType("bloc_result")).toEqual([
			{ type: "bloc_result", tribunal: 1, leader: "A03", voting: ["A03", "A02", "A06"], united: true, target: "A01", defectors: [], bonus: 5 },
			{ type: "bloc_result", tribunal: 1, leader: "A01", voting: ["A01", "A04"], united: false, target: "A02", defectors: ["A04"], bonus: 0 },
		]);
		expect(h.points.get("A03")).toBe(35);
		expect(h.points.get("A02")).toBe(25);
		expect(h.points.get("A06")).toBe(65);
		expect(h.points.get("A05")).toBe(50);
		expect(h.points.get("A04")).toBe(32);
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
		// The accused A02 did not vote: it breaks the bloc like any other member (v08).
		expect(h.ofType("bloc_result")[0]).toMatchObject({ leader: "A03", voting: ["A03", "A02", "A06"], united: false, defectors: ["A02", "A06"], bonus: 0 });
		expect(h.points.get("A03")).toBe(30);
		const split = "Your faction did not vote as one in tribunal 1; no bonus. The city does not say who broke ranks.";
		// Nobody of A01's faction voted either: its two members hear that it split too.
		expect(competitorIds(6).filter((id) => h.noticesOf(id).includes(split))).toEqual(["A01", "A02", "A03", "A04", "A06"]);
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
		expect(h.ofType("tribunal_called")).toMatchObject([{ factions: 0, noDraft: "too few residents" }]);
		expect(h.groups).toEqual([]);
		expect(h.posts.at(-2)).toContain("There are no factions this time");
		// Three present: two accused, and all three vote.
		expect(h.tribunal.session).toMatchObject({ accused: ["A01", "A02"], voters: ["A01", "A02", "A03"] });
	});

	it("caps a faction at its share of the residents, its leader included; a refusal frees a place (v08, P31)", () => {
		const h = harness(SIX);
		runUntil(h, 0, 30);
		const t = h.tribunal;
		expect(h.groups[0]?.posts[0]).toContain("a faction holds at most 3 residents, its leader included, and a full faction takes nobody else");
		for (const voter of ["A01", "A02", "A04", "A05", "A06"]) t.nominate(voter, "A03");
		t.nominate("A03", "A01");
		runUntil(h, 31, 32);
		expect(t.leaders).toEqual(["A03", "A01"]);
		expect(t.join("A02", "A03")).toMatchObject({ ok: true });
		expect(t.join("A04", "A03")).toMatchObject({ ok: true });
		expect(t.join("A05", "A03")).toMatchObject({
			ok: false,
			error: "FACTION_FULL",
			detail: "the faction of A03 is full: at most 3 members, its leader included; apply to another leader",
		});
		// Applying again where one already counts is no new place.
		expect(t.join("A04", "A03")).toMatchObject({ ok: true });
		// Moving to another faction frees the place, and so does a refusal.
		expect(t.join("A04", "A01")).toMatchObject({ ok: true });
		expect(t.join("A05", "A03")).toMatchObject({ ok: true });
		expect(t.refuse("A03", "A05")).toMatchObject({ ok: true });
		expect(t.join("A06", "A03")).toMatchObject({ ok: true });
		expect(t.snapshot().draft).toMatchObject({ cap: 3 });
		runUntil(h, 33, 34);
		expect(h.ofType("factions_formed")[0]?.factions.map((faction) => faction.members)).toEqual([
			["A03", "A02", "A06"],
			["A01", "A04"],
		]);
	});
});

describe("last will (SPEC 6.4)", () => {
	/**
	 * Six residents on the wall, where Act II begins at minute 0; nobody votes, so the first tribunal (called 18 minutes
	 * into the act, open 22-24) sends the city's lot among equals to the gate.
	 */
	function gateWorld() {
		let minute = 0;
		const log = new MemorySink();
		const bus = new EventBus([log], () => minute);
		const world = new World({ story: cityOfKeys, competitors: competitorIds(6), seed: 7, minutes: 60, bus, minute: () => minute, startLevel: 8 });
		const until = (last: number): void => {
			for (; minute <= last; minute++) world.startMinute(minute);
			minute = last;
		};
		until(24);
		const gate = world.tribunal?.gates()[0];
		if (gate === undefined) throw new Error("nobody at the gate");
		return { world, log, until, exiled: gate.agent };
	}

	it("caps the points each heir receives at a tenth of the exiled's points, any number of heirs, and the rest burns at exile", () => {
		const { world, log, until, exiled } = gateWorld();
		const heirs = world.competitors.filter((id) => id !== exiled);
		// 15 start points less 8 for not voting (the accused vote too, v08); give the exiled more so that a tenth is worth
		// splitting: 7 + 43 = 50, so 5 per heir.
		world.adjustPoints(exiled, 43, "test");
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
		until(29);
		expect(world.isExiled(exiled)).toBe(true);
		expect(world.ledger.balance(exiled)).toBe(0);
		expect(log.events.some((event) => event.type === "ledger_entry" && event.debit === exiled && event.reason === `exiled ${exiled}` && event.amount === 25)).toBe(true);
		expect(world.ledger.total()).toBe(0);
	});

	it("leaves factors free of the cap", () => {
		const { world, exiled } = gateWorld();
		// Back to its 15 start points, so that a tenth is one point.
		world.adjustPoints(exiled, 8, "test");
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
			validateStory({ ...cityOfKeys, tribunal: { ...cityOfKeysTribunal(), bequestPerHeir } }).filter((issue) => issue.startsWith("tribunal.bequestPerHeir"));
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
	const spec = cityOfKeysTribunal();
	const withTribunal = (patch: Partial<TribunalSpec>, run: Partial<AnyStory["run"]> = {}): readonly string[] =>
		validateStory({ ...cityOfKeys, run: { ...cityOfKeys.run, ...run }, tribunal: { ...spec, ...patch } }).filter((issue) => issue.startsWith("tribunal"));
	const factions = spec.factions;
	if (factions === undefined) throw new Error("cityofkeys has no faction draft");

	it("accepts the cityofkeys parameters and a city of 48", () => {
		expect(withTribunal({})).toEqual([]);
		expect(withTribunal({}, { agents: 48, survivors: 12 })).toEqual([]);
	});

	it("rejects pacing parameters that cannot work", () => {
		expect(withTribunal({ first: { level: 99, latestAfter: 18 } })).toContain("tribunal.first.level: level 99 does not exist");
		expect(withTribunal({ first: { level: 10, latestAfter: 40 } })).toContain("tribunal.first.latestAfter: a tribunal called 40 minutes into the act does not end within the act's 48 minutes");
		expect(withTribunal({ act: 9 })).toContain("tribunal.act: no act starts at level 9");
		expect(withTribunal({ targetShare: 1 })).toContain("tribunal.targetShare: must be a share of the residents between 0 and 1");
		expect(withTribunal({ targetShare: 0.9 })).toContain(
			"tribunal.targetShare: a city of 6 holds no tribunal (it must exile at least one, keep the 2 survivors and have three residents for a vote)",
		);
		expect(withTribunal({ minGap: 1 })).toContain("tribunal.minGap: 1 minutes cannot hold a vote of 2");
		expect(withTribunal({ fallbackGap: 0 })).toContain("tribunal.fallbackGap: must be a positive integer");
		expect(withTribunal({ lead: { share: 1, minimum: 4 } })).toContain("tribunal.lead.share: must be a share of the gap from 0 up to (not including) 1");
		expect(withTribunal({ lead: { share: 1 / 3, minimum: 0 } })).toContain("tribunal.lead.minimum: must be a positive integer");
		expect(withTribunal({ lead: { share: 1 / 3, minimum: 1 } })).toContain("tribunal.lead.minimum: a faction draft needs at least 2 minutes (nominations, then applications)");
		expect(withTribunal({ maxMinutes: 0 })).toContain("tribunal.maxMinutes: must be a positive integer");
		const { calledNoDraft, ...texts } = spec.texts;
		expect(calledNoDraft).toContain("There are no factions this time");
		expect(withTribunal({ texts })).toContain("tribunal.texts.calledNoDraft: a tribunal with factions must say when it holds no draft");
		expect(withTribunal({ texts: { ...texts, calledNoDraft: "No factions in {nonsense}." } })).toContain("tribunal.texts.calledNoDraft: unknown placeholder {nonsense}");
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
		for (const agents of [6, 12, 48, 96]) expect(validateStory(cityOfKeys, { agents }).filter((issue) => issue.startsWith("tribunal"))).toEqual([]);
		// A small test city plays without a tribunal.
		expect(validateStory(cityOfKeys, { agents: 3 }).filter((issue) => issue.startsWith("tribunal"))).toEqual([]);
	});

	it("checks the texts: known placeholders, and the announcement states every rule", () => {
		const texts = spec.texts;
		expect(withTribunal({ texts: { ...texts, opened: "Tribunal {nonsense}." } })).toContain("tribunal.texts.opened: unknown placeholder {nonsense}");
		expect(withTribunal({ texts: { ...texts, called: "Tribunal {tribunal} at {minute}: {count} go, {accusedCount} accused." } })).toEqual([]);
		expect(withTribunal({ texts: { ...texts, announcement: "There will be a tribunal; it keeps {kept}." } })[0]).toMatch(/^tribunal\.texts\.announcement: must state every rule, missing \{voteMinutes\}/);
	});
});
