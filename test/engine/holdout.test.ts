/**
 * The holdout tribunal (Whispers v3, SPEC 20; LH10, P62): who blocks a door,
 * the tribunal's rules (grace, unanimous votes, at most three, then a lot),
 * the strike and the fragments it releases, played on the Whispers story
 * itself with the world's own clock.
 */
import { describe, expect, it } from "vitest";
import { competitorIds, type CompetitorId } from "../../src/core/ids.ts";
import { rngFor } from "../../src/core/random.ts";
import { EventBus, MemorySink } from "../../src/engine/events.ts";
import { World, type WorldSnapshot } from "../../src/engine/world.ts";
import { validateStory } from "../../src/story/validate.ts";
import type { AnyStory } from "../../src/story/types.ts";
import whispers, { whispersStory } from "../../stories/whispers/story.ts";

const IDS = competitorIds(6);
const AUTHOR = "COURIER";

interface City {
	readonly world: World;
	readonly log: MemorySink;
	/** Plays the city's minutes up to and including `minute`. */
	readonly at: (minute: number) => void;
	readonly minute: () => number;
}

/** The Whispers city of six with IDs, its clock at minute 0; `restore` resumes a world snapshot at `from`. */
function city(options: { readonly story?: AnyStory; readonly seed?: number; readonly restore?: WorldSnapshot; readonly from?: number; readonly holdout?: boolean } = {}): City {
	let minute = options.from ?? 0;
	const log = new MemorySink();
	const bus = new EventBus([log], () => minute);
	const world = new World({
		story: options.story ?? whispers,
		competitors: IDS,
		seed: options.seed ?? 11,
		minutes: 45,
		bus,
		minute: () => minute,
		names: false,
		...(options.holdout === undefined ? {} : { holdout: options.holdout }),
		...(options.restore === undefined ? {} : { restore: options.restore }),
	});
	if (options.restore === undefined) world.startMinute(0);
	return {
		world,
		log,
		minute: () => minute,
		at: (last) => {
			while (minute < last) {
				minute += 1;
				world.startMinute(minute);
			}
		},
	};
}

function fragment(world: World, agent: CompetitorId, door: number): string {
	return world.inspect.fragmentOf(agent, door);
}

/** A DM the recipient reads at once (a mailbox holds one unread DM per sender). */
function dm(world: World, from: CompetitorId, to: CompetitorId, text: string): void {
	expect(world.sendDm(from, to, text)).toMatchObject({ ok: true });
	world.drainMailbox(to);
}

/** `from` sends its door fragment by DM to each of `to`. */
function give(world: World, from: CompetitorId, door: number, to: readonly CompetitorId[]): void {
	for (const target of to) dm(world, from, target, `My door ${door} fragment: ${fragment(world, from, door)}`);
}

const othersThan = (...agents: readonly CompetitorId[]): readonly CompetitorId[] => IDS.filter((id) => !agents.includes(id));

/** Every resident but `holdout` sends its door fragment to everyone; `holdout` passes the door at minute 1 with what it got. */
function holdoutAtDoorOne(holdout: CompetitorId = "A01", seed = 11): City {
	const played = city({ seed });
	for (const agent of othersThan(holdout)) give(played.world, agent, 1, othersThan(agent));
	played.at(1);
	expect(played.world.submit(holdout, 1, played.world.inspect.passwordOf(holdout, 1))).toMatchObject({ status: "correct" });
	return played;
}

/**
 * The Wren case at minute 3, with a tribunal called on A01 (as the gamemaker calls, after the residents' turns of
 * minute 3): the grace is minutes 4 and 5, the first vote opens at 6.
 */
function calledOnA01(seed = 11): City {
	const played = holdoutAtDoorOne("A01", seed);
	played.at(3);
	expect(played.world.callHoldoutTribunal(["A01"], "A01 keeps the city waiting.", AUTHOR)).toMatchObject({ ok: true, value: { accused: "A01", door: 1, until: 6 } });
	return played;
}

/** Every voter but `against` (who votes no) votes yes in the running vote. */
function voteYes(world: World, against?: CompetitorId): void {
	for (const agent of othersThan("A01")) expect(world.tribunalVote(agent, agent !== against)).toMatchObject({ ok: true });
}

describe("blockers (Whispers v3)", () => {
	it("names the resident who passed a door alone and kept its fragment, never the five who have not reached the next door", () => {
		const { world, log, at } = holdoutAtDoorOne();
		at(2);
		// The door has been open two minutes: no blocker yet.
		expect(world.holdout?.blockers).toEqual([]);
		at(3);
		expect(world.holdout?.blockers).toEqual([{ door: 1, blocker: "A01", lacking: othersThan("A01"), passed: true, since: 3 }]);
		expect(log.ofType("blocker_found")).toMatchObject([{ minute: 3, door: 1, blocker: "A01", lacking: othersThan("A01") }]);
		// Door 2 opened at 6: A01 stands before it without the others' fragments, but none of them has reached it, so none blocks.
		at(10);
		expect(world.holdout?.blockers.map((blocker) => [blocker.door, blocker.blocker])).toEqual([[1, "A01"]]);
		expect(world.lackingFragment(2, "A02")).toEqual([]);
		expect(world.lackingFragment(2, "A01")).toEqual([]);
	});

	it("names both residents who wait on each other", () => {
		const { world, at } = city();
		for (const agent of ["A01", "A02", "A03", "A04"]) give(world, agent, 1, othersThan(agent));
		give(world, "A05", 1, othersThan("A05", "A06"));
		give(world, "A06", 1, othersThan("A06", "A05"));
		at(3);
		expect(world.holdout?.blockers).toEqual([
			{ door: 1, blocker: "A05", lacking: ["A06"], passed: false, since: 3 },
			{ door: 1, blocker: "A06", lacking: ["A05"], passed: false, since: 3 },
		]);
	});

	it("waits until both the holder and the one who lacks its fragment have stood at the door for the stall", () => {
		const { world, at } = city();
		// Everyone passes door 1 at minute 1 but A06, who passes it at minute 8 and so reaches door 2 (open at 6) late.
		for (const agent of IDS) give(world, agent, 1, othersThan(agent));
		at(1);
		for (const agent of othersThan("A06")) expect(world.submit(agent, 1, world.inspect.passwordOf(agent, 1))).toMatchObject({ status: "correct" });
		at(6);
		// At door 2 everyone but A01 sends its fragment to all.
		for (const agent of othersThan("A01")) give(world, agent, 2, othersThan(agent));
		at(8);
		expect(world.submit("A06", 1, world.inspect.passwordOf("A06", 1))).toMatchObject({ status: "correct" });
		at(9);
		// A01 and A02-A05 have stood at door 2 since minute 6; A06 only since 9.
		expect(world.lackingFragment(2, "A01")).toEqual(othersThan("A01"));
		expect(world.holdout?.blockers).toEqual([{ door: 2, blocker: "A01", lacking: ["A02", "A03", "A04", "A05"], passed: false, since: 9 }]);
		at(12);
		expect(world.holdout?.blockers).toEqual([{ door: 2, blocker: "A01", lacking: othersThan("A01"), passed: false, since: 9 }]);
	});

	it("counts a fragment written in lower case, with dashes, or split across two DMs", () => {
		// A seed whose door-1 fragment of A01 holds no digit, so the plain text is all letters.
		const seed = Array.from({ length: 200 }, (_, index) => index + 1).find((candidate) => !/\d/.test(city({ seed: candidate }).world.inspect.fragmentOf("A01", 1)));
		if (seed === undefined) throw new Error("no seed with a digit-free fragment");
		const { world, at } = city({ seed });
		const piece = fragment(world, "A01", 1);
		for (const agent of othersThan("A01")) give(world, agent, 1, othersThan(agent));
		dm(world, "A01", "A02", `mine, in small letters: ${piece.toLowerCase()}`);
		dm(world, "A01", "A03", `mine: ${piece.split("").join("-")}`);
		const half = Math.ceil(piece.length / 2);
		dm(world, "A01", "A04", piece.slice(0, half));
		at(1);
		dm(world, "A01", "A04", piece.slice(half));
		at(3);
		expect(world.lackingFragment(1, "A01")).toEqual(["A05", "A06"]);
		expect(world.holdout?.blockers.find((blocker) => blocker.blocker === "A01")?.lacking).toEqual(["A05", "A06"]);
	});

	it("counts a fragment forwarded by someone else, and clears a blocker once its fragment arrives", () => {
		const { world, log, at } = city();
		for (const agent of othersThan("A01")) give(world, agent, 1, othersThan(agent));
		// A01 tells only A02; A02 passes it on, spelled out, to the other four.
		give(world, "A01", 1, ["A02", "A03"]);
		const spelled = fragment(world, "A01", 1).split("").join("-");
		for (const target of ["A04", "A05"]) dm(world, "A02", target, `A01's piece, as A01 wrote it: ${spelled}`);
		at(3);
		expect(world.holdout?.blockers).toEqual([{ door: 1, blocker: "A01", lacking: ["A06"], passed: false, since: 3 }]);
		dm(world, "A03", "A06", `from A01: ${fragment(world, "A01", 1)}`);
		at(4);
		expect(world.holdout?.blockers).toEqual([]);
		expect(log.ofType("blocker_cleared")).toMatchObject([{ minute: 4, door: 1, blocker: "A01" }]);
	});
});

describe("calling a holdout tribunal", () => {
	it("is allowed only on a reported blocker, one at a time", () => {
		const { world, at, log } = holdoutAtDoorOne();
		expect(world.callHoldoutTribunal(["A01"], "Too early.", AUTHOR)).toMatchObject({ ok: false, error: "NOT_A_BLOCKER" });
		at(3);
		const notABlocker = world.callHoldoutTribunal(["A03"], "A03 blocks.", AUTHOR);
		expect(notABlocker).toMatchObject({ ok: false, error: "NOT_A_BLOCKER" });
		if (!notABlocker.ok) expect(notABlocker.detail).toContain("the city reports as blockers: A01");
		expect(world.callHoldoutTribunal(["A99"], "Nobody.", AUTHOR)).toMatchObject({ ok: false, error: "UNKNOWN_AGENT" });
		expect(world.callHoldoutTribunal([], "Nobody.", AUTHOR)).toMatchObject({ ok: false, error: "INVALID_ACCUSED" });
		expect(world.callHoldoutTribunal(["A01", "A01"], "Twice.", AUTHOR)).toMatchObject({ ok: false, error: "INVALID_ACCUSED" });
		const called = world.callHoldoutTribunal(["A01"], "A01 keeps the city waiting.", AUTHOR);
		expect(called).toMatchObject({ ok: true, value: { accused: "A01", door: 1, lacking: othersThan("A01"), until: 6 } });
		expect(world.callHoldoutTribunal(["A01"], "Again.", AUTHOR)).toMatchObject({ ok: false, error: "NOT_NOW" });
		// The announcement and the procedure go on the board and to every resident, with the minutes filled in.
		const post = world.board.snapshot().posts.at(-1);
		expect(post).toMatchObject({ author: AUTHOR });
		expect(post?.text).toContain("A01 keeps the city waiting.\nTHE TRIBUNAL: A01 has reached door 1 and still holds back its fragment from A02, A03, A04, A05 and A06.");
		expect(post?.text).toContain("until minute 6");
		expect(post?.text).toContain("never count against its DM cap");
		expect(log.ofType("notice").filter((notice) => notice.author === AUTHOR).map((notice) => notice.to)).toEqual(IDS);
		expect(log.ofType("holdout_called")).toMatchObject([{ tribunal: 1, accused: "A01", door: 1, until: 6 }]);
	});

	it("waits the stall after a tribunal ended before the next may be called", () => {
		const { world, at } = calledOnA01();
		at(4);
		give(world, "A01", 1, ["A02"]);
		at(5);
		give(world, "A01", 1, othersThan("A01", "A02"));
		at(6);
		expect(world.holdout?.session).toBeUndefined();
		expect(world.holdout?.cooldownUntil).toBe(9);
		expect(world.callHoldoutTribunal(["A01"], "Again.", AUTHOR)).toMatchObject({ ok: false, error: "NOT_NOW" });
	});

	it("lets the accused send to those who lack its fragment past the DM cap, and nobody else", () => {
		const { world, at } = calledOnA01();
		at(4);
		// A01 spends its 8 DMs of the window on A02 (read at once), which carry nothing.
		for (let index = 0; index < 8; index++) dm(world, "A01", "A02", `hello ${index}`);
		expect(world.dmWindow("A01")).toMatchObject({ sent: 8, limit: 8 });
		expect(world.holdout?.lackingNow()).toEqual(othersThan("A01"));
		expect(world.sendDm("A01", "A03", `mine: ${fragment(world, "A01", 1)}`)).toMatchObject({ ok: true });
		expect(world.dmWindow("A01")).toMatchObject({ sent: 9 });
		// A03 has it now: the exemption is for those who still lack it.
		world.drainMailbox("A03");
		expect(world.sendDm("A01", "A03", "and hello")).toMatchObject({ ok: false, error: "DM_LIMIT" });
		// Anyone else stays capped: A02 sent 5 DMs at minute 0.
		for (let index = 0; index < 3; index++) dm(world, "A02", "A04", `chat ${index}`);
		expect(world.sendDm("A02", "A05", "one more")).toMatchObject({ ok: false, error: "DM_LIMIT" });
	});

	it("draws the accused by lot among every reported blocker, whomever the gamemaker names, with the run's seed", () => {
		const draw = (seed: number, named: readonly CompetitorId[] = ["A06", "A05"]) => {
			const { world, at, log } = city({ seed });
			for (const agent of ["A01", "A02", "A03", "A04"]) give(world, agent, 1, othersThan(agent));
			give(world, "A05", 1, othersThan("A05", "A06"));
			give(world, "A06", 1, othersThan("A06", "A05"));
			at(3);
			const called = world.callHoldoutTribunal(named, "Two hold out.", AUTHOR);
			if (!called.ok) throw new Error(called.error);
			expect(called.value.candidates).toEqual(["A05", "A06"]);
			expect(log.ofType("lot_drawn")).toEqual([expect.objectContaining({ tribunal: 1, purpose: "accused", candidates: ["A05", "A06"], drawn: called.value.accused })]);
			expect(world.board.snapshot().posts.at(-1)?.text).toContain(`the lot fell on ${called.value.accused}`);
			return called.value.accused;
		};
		// The draw is code: the first lot of a run is always the same for its seed.
		expect(draw(11)).toBe(rngFor(11, "holdout-lot", 1).pick(["A05", "A06"]));
		expect(draw(11)).toBe(draw(11));
		expect(draw(12)).toBe(rngFor(12, "holdout-lot", 1).pick(["A05", "A06"]));
		// Naming one of two blockers does not choose it: the lot runs among both.
		const seeds = Array.from({ length: 30 }, (_, index) => index + 1);
		const otherwise = seeds.find((seed) => rngFor(seed, "holdout-lot", 1).pick(["A05", "A06"]) === "A06");
		if (otherwise === undefined) throw new Error("no seed draws A06");
		expect(draw(otherwise, ["A05"])).toBe("A06");
		// The accused is not drawn in advance any more.
		const { world } = city();
		expect(world.drawHoldoutLot(["A05", "A06"])).toMatchObject({ ok: false, error: "NOT_NOW" });
	});
});

describe("the tribunal's rules", () => {
	it("drops the tribunal when the accused sends its fragment in its grace, and lets the gamemaker announce it", () => {
		const { world, at, log } = calledOnA01();
		at(4);
		expect(world.holdout?.session?.stage).toBe("grace");
		give(world, "A01", 1, othersThan("A01"));
		at(5);
		expect(world.holdout?.session).toBeUndefined();
		expect(log.ofType("holdout_ended")).toMatchObject([{ tribunal: 1, outcome: "dropped" }]);
		expect(log.ofType("holdout_vote_opened")).toEqual([]);
		expect(world.holdout?.pending).toMatchObject({ kind: "dropped", due: 6 });
		expect(world.announceHoldout("A01 gave in time; the tribunal is over.", AUTHOR)).toMatchObject({ ok: true, value: "dropped" });
		expect(world.announceHoldout("Again.", AUTHOR)).toMatchObject({ ok: false, error: "NOTHING_TO_ANNOUNCE" });
		expect(log.ofType("holdout_announced")).toMatchObject([{ kind: "dropped", by: "gamemaker" }]);
		// A new tribunal may be called after one ended.
		expect(world.holdout?.blockers).toEqual([]);
	});

	it("posts the city's plain line when the gamemaker stays silent", () => {
		const { world, at, log } = calledOnA01();
		at(5);
		expect(world.holdout?.session?.stage).toBe("grace");
		at(6);
		expect(world.holdout?.pending).toMatchObject({ kind: "graceFailed", due: 7 });
		at(7);
		expect(world.holdout?.pending).toBeUndefined();
		expect(log.ofType("holdout_announced")).toMatchObject([{ minute: 7, kind: "graceFailed", by: "city", text: "A01 has not sent its fragment in time. The vote on its banishment is open until minute 8." }]);
	});

	it("banishes after a unanimous vote: permaDeath only on the accused, the struck keeps its points, everyone gets its fragments", () => {
		const { world, at, log } = calledOnA01();
		at(6);
		expect(world.isToolEnabled("A02", "tribunalVote")).toBe(true);
		expect(world.isToolEnabled("A01", "tribunalVote")).toBe(false);
		expect(world.tribunalVote("A01", false)).toMatchObject({ ok: false, error: "NOT_A_VOTER" });
		expect(world.holdoutPermaDeath("A01", "Too early.", AUTHOR)).toMatchObject({ ok: false, error: "NOT_NOW" });
		// A voter changes its mind; the last ballot counts.
		voteYes(world, "A02");
		expect(world.tribunalVote("A02", true)).toMatchObject({ ok: true });
		at(8);
		expect(log.ofType("holdout_vote_result")).toMatchObject([{ vote: 1, yes: 5, no: 0, unanimous: true }]);
		expect(world.holdout?.session?.stage).toBe("banish");
		expect(world.holdoutPermaDeath("A02", "Wrong one.", AUTHOR)).toMatchObject({ ok: false, error: "NOT_ALLOWED" });
		const points = world.ledger.balance("A01");
		expect(world.holdoutPermaDeath("A01", "The city has spoken: A01 is banished.", AUTHOR)).toMatchObject({ ok: true, value: { agent: "A01", by: "banished" } });
		expect(world.isExiled("A01")).toBe(true);
		expect(world.alive).toEqual(othersThan("A01"));
		expect(world.ledger.balance("A01")).toBe(points);
		expect(world.ranking().at(-1)?.agent).toBe("A01");
		expect(world.enabledTools("A01")).toEqual([]);
		expect(world.sendDm("A02", "A01", "hello")).toMatchObject({ ok: false, error: "EXILED" });
		expect(log.ofType("exiled")).toMatchObject([{ agent: "A01", by: "holdout" }]);
		expect(log.ofType("holdout_ended")).toMatchObject([{ outcome: "banished", struck: "A01", by: "gamemaker" }]);
		// Everyone still before door 1 hears A01's fragment of it at once.
		const released = log.ofType("notice").filter((notice) => notice.text.startsWith("A01 was struck from the city"));
		expect(released.map((notice) => notice.to)).toEqual(othersThan("A01"));
		expect(released[0]?.text).toContain(`door 1: ${fragment(world, "A01", 1)}`);
		// A struck resident never blocks, and nobody lacks its fragment any more.
		expect(world.lackingFragment(1, "A01")).toEqual([]);
		expect(world.holdout?.blockers).toEqual([]);
	});

	it("leaves every door solvable by the five after a banishment", () => {
		const { world, at } = calledOnA01();
		at(6);
		voteYes(world);
		at(8);
		expect(world.holdoutPermaDeath("A01", "Banished.", AUTHOR)).toMatchObject({ ok: true });
		const five = othersThan("A01");
		for (let door = 1; door <= 7; door++) {
			at(Math.max(world.opensAt(door), 8));
			// The struck resident's fragment of every later door shows in each task as one the resident holds.
			for (const agent of five) {
				if (door > 1) expect(world.currentProblem(agent)?.text).toContain(`you also hold the fragment of A01, who was exiled: ${fragment(world, "A01", door)}`);
				expect(world.lackingFragment(door, "A01")).toEqual([]);
			}
			for (const agent of five) give(world, agent, door, five.filter((other) => other !== agent));
			at(world.minute + 1);
			expect(world.holdout?.blockers.filter((blocker) => blocker.door === door)).toEqual([]);
			for (const agent of five) expect(world.submit(agent, door, world.inspect.passwordOf(agent, door))).toMatchObject({ status: "correct" });
		}
		for (const agent of five) expect(world.isFinished(agent)).toBe(true);
	});

	it("repeats a vote that is not unanimous up to three times, then strikes only the resident the lot drew", () => {
		const { world, at, log } = calledOnA01();
		at(6);
		voteYes(world, "A03");
		at(8);
		expect(world.holdout?.session).toMatchObject({ stage: "vote", vote: 2, until: 10, lastResult: { vote: 1, yes: 4, no: 1 } });
		expect(world.holdout?.pending).toMatchObject({ kind: "voteFailed" });
		expect(world.holdout?.pending?.facts).toContain("4 yes, 1 no");
		// The ballots of the vote before do not count: A03 alone does not vote, and that is a no too.
		for (const agent of othersThan("A01", "A03")) expect(world.tribunalVote(agent, true)).toMatchObject({ ok: true });
		at(10);
		voteYes(world, "A04");
		at(12);
		expect(log.ofType("holdout_vote_result").map((result) => [result.vote, result.yes, result.no, result.unanimous])).toEqual([
			[1, 4, 1, false],
			[2, 4, 1, false],
			[3, 4, 1, false],
		]);
		expect(log.ofType("holdout_announced").map((announced) => [announced.minute, announced.kind, announced.by])).toEqual([
			[7, "graceFailed", "city"],
			[9, "voteFailed", "city"],
			[11, "voteFailed", "city"],
		]);
		expect(world.holdout?.session?.stage).toBe("lot");
		expect(world.holdoutPermaDeath("A01", "Struck.", AUTHOR)).toMatchObject({ ok: false, error: "NO_LOT" });
		expect(world.drawHoldoutLot(["A01", "A02"])).toMatchObject({ ok: false, error: "INVALID_CANDIDATES" });
		const drawn = world.drawHoldoutLot([...IDS].reverse());
		if (!drawn.ok) throw new Error(drawn.error);
		expect(drawn.value).toEqual({ drawn: rngFor(11, "holdout-lot", 1).pick([...IDS]) });
		expect(world.drawHoldoutLot([...IDS])).toMatchObject({ ok: false, error: "ALREADY_DRAWN" });
		const other = IDS.find((id) => id !== drawn.value.drawn) ?? "A01";
		expect(world.holdoutPermaDeath(other, "Not this one.", AUTHOR)).toMatchObject({ ok: false, error: "NOT_ALLOWED" });
		expect(world.holdoutPermaDeath(drawn.value.drawn, "The lot has spoken.", AUTHOR)).toMatchObject({ ok: true, value: { by: "lot" } });
		expect(world.isExiled(drawn.value.drawn)).toBe(true);
		expect(log.ofType("holdout_ended")).toMatchObject([{ outcome: "lot", struck: drawn.value.drawn, by: "gamemaker" }]);
	});

	it("strikes by lot at most once per door: the next tribunal there ends with nobody struck", () => {
		// A seed whose first lot falls on someone other than A01, so A01 still blocks door 1 after the strike.
		const seed = Array.from({ length: 50 }, (_, index) => index + 1).find((candidate) => rngFor(candidate, "holdout-lot", 1).pick([...IDS]) !== "A01");
		if (seed === undefined) throw new Error("no seed draws someone else");
		const { world, at, log } = calledOnA01(seed);
		const failAll = (from: number): void => {
			for (let vote = 0; vote < 3; vote++) at(from + 2 * vote);
			at(from + 6);
		};
		failAll(6);
		expect(world.holdout?.session?.stage).toBe("lot");
		at(13);
		const struck = log.ofType("holdout_ended")[0]?.struck;
		expect(struck).toBeDefined();
		expect(struck).not.toBe("A01");
		expect(world.holdout?.blockers.map((blocker) => blocker.blocker)).toEqual(["A01"]);
		// The stall after the strike, then a second tribunal on door 1 whose votes all fail.
		at(16);
		expect(world.callHoldoutTribunal(["A01"], "A01 still keeps the city waiting.", AUTHOR)).toMatchObject({ ok: true, value: { until: 19 } });
		failAll(19);
		expect(log.ofType("holdout_ended").map((ended) => ended.outcome)).toEqual(["lot", "spared"]);
		expect(world.holdout?.session).toBeUndefined();
		expect(world.alive).toHaveLength(5);
		expect(world.holdout?.pending).toMatchObject({ kind: "spared" });
	});

	it("strikes by itself when the gamemaker does not act after a result, so a run never hangs", () => {
		const { world, at, log } = calledOnA01();
		at(6);
		voteYes(world);
		at(9);
		expect(world.isExiled("A01")).toBe(true);
		expect(log.ofType("holdout_ended")).toMatchObject([{ minute: 9, outcome: "banished", struck: "A01", by: "city" }]);
		expect(world.board.snapshot().posts.some((post) => post.text === "Every voter said yes (5): A01 is banished.")).toBe(true);
	});

	it("keeps a tribunal across a snapshot in its grace and in its vote", () => {
		const roundTrip = (played: City): City =>
			city({ restore: structuredClone(played.world.snapshot()), from: played.minute() });
		// In the grace: the resumed city still drops it when the accused gives.
		const grace = roundTrip(calledOnA01());
		expect(grace.world.holdout?.session).toMatchObject({ accused: "A01", stage: "grace", until: 6 });
		expect(grace.world.holdout?.blockers).toEqual([{ door: 1, blocker: "A01", lacking: othersThan("A01"), passed: true, since: 3 }]);
		give(grace.world, "A01", 1, othersThan("A01"));
		grace.at(5);
		expect(grace.log.ofType("holdout_ended")).toMatchObject([{ outcome: "dropped" }]);
		// In the vote: the ballots cast before the snapshot still count.
		const before = calledOnA01();
		before.at(6);
		for (const agent of ["A02", "A03", "A04"]) expect(before.world.tribunalVote(agent, true)).toMatchObject({ ok: true });
		before.at(7);
		const vote = roundTrip(before);
		expect(vote.world.holdout?.session).toMatchObject({ stage: "vote", vote: 1, until: 8 });
		expect(vote.world.isToolEnabled("A05", "tribunalVote")).toBe(true);
		expect(vote.world.holdout?.ballotOf("A02")).toBe(true);
		for (const agent of ["A05", "A06"]) expect(vote.world.tribunalVote(agent, true)).toMatchObject({ ok: true });
		vote.at(8);
		expect(vote.log.ofType("holdout_vote_result")).toMatchObject([{ vote: 1, yes: 5, unanimous: true }]);
		// After the strike, a snapshot keeps the struck out and its fragments released.
		expect(vote.world.holdoutPermaDeath("A01", "Banished.", AUTHOR)).toMatchObject({ ok: true });
		const after = roundTrip(vote);
		expect(after.world.isExiled("A01")).toBe(true);
		expect(after.world.lackingFragment(1, "A01")).toEqual([]);
		after.at(12);
		expect(after.world.currentProblem("A02")?.text).toContain(`you also hold the fragment of A01, who was exiled: ${fragment(after.world, "A01", 1)}`);
	});
});

describe("the holdout tribunal in a story", () => {
	it("states its rule in every task only where it plays, and is absent without the gamemaker", () => {
		const rule = whispers.holdout?.texts.rule ?? "";
		expect(rule).toContain("may be put on trial");
		expect(city().world.currentProblem("A01")?.text).toContain(rule);
		const without = city({ holdout: false });
		expect(without.world.holdout).toBeUndefined();
		expect(without.world.currentProblem("A01")?.text).not.toContain("put on trial");
		expect(without.world.enabledTools("A02")).not.toContain("tribunalVote");
	});

	it("is valid in both Whispers variants and refused without a gamemaker or with broken texts", () => {
		expect(validateStory(whispers)).toEqual([]);
		expect(validateStory(whispersStory(false))).toEqual([]);
		const spec = whispers.holdout;
		if (spec === undefined) throw new Error("Whispers has no holdout tribunal");
		const { gamemaker, ...withoutGamemaker } = whispers;
		expect(gamemaker).toBeDefined();
		expect(validateStory(withoutGamemaker)).toContain("holdout: the gamemaker calls its tribunals; the story needs a gamemaker");
		const broken: AnyStory = { ...whispers, holdout: { ...spec, maxVotes: 0, texts: { ...spec.texts, called: "{accused} is accused {nope}." } } };
		expect(validateStory(broken)).toEqual(
			expect.arrayContaining([
				"holdout.maxVotes: must be a positive integer",
				"holdout.texts.called: unknown placeholder {nope}",
				"holdout.texts.called: must state the procedure with {grace}",
			]),
		);
	});
});
