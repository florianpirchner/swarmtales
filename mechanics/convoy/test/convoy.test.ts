// SPDX-License-Identifier: Apache-2.0
/**
 * The mechanic alone (offline): the refusals of the old test "refuses bad crews, ... out-of-turn votes", a lost vote
 * of confidence, the talk, the cards with the cooldown, the audit, the accusations and the reference of the report,
 * the timer against the oracle file in which no resident ever acts, the checks of the table and a fake run.
 */
import { resolve } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { fakeDriver, idleDriver, play, readOracle, testKernel, type TestKernel } from "@swarmtales/testkit";
import { convoyGame, ofType, SEATS } from "./support.ts";

const SILENT = resolve(import.meta.dirname, "../../../oracles/convoy/convoy-g1-s13-silent.json");
const events = (test: TestKernel, type?: string): readonly unknown[] => ofType(test.kernel.log.all(), type).map((event) => event.payload);

describe("a crew and its vote", () => {
	it("refuses bad crews and out-of-turn calls, takes a sealed vote during the talk once, and sends the crew out", async () => {
		const test = testKernel(convoyGame());
		expect(await test.call("A02", "proposeCrew", { crew: ["A02", "A03"] })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "proposeCrew", { crew: ["A01", "A02", "A03"] })).toMatchObject({ ok: false, code: "CREW_SIZE", detail: "Stage 1 needs a crew of exactly 2 seats; you named 3." });
		expect(await test.call("A01", "proposeCrew", { crew: ["A01", "A01"] })).toMatchObject({ ok: false, code: "CREW_REPEATS" });
		expect(await test.call("A01", "proposeCrew", { crew: ["A01", "Z9"] })).toMatchObject({ ok: false, code: "NOT_A_SEAT", detail: "Z9 is not a seat. The seats: A01, A02, A03, A04, A05, A06." });
		expect(await test.call("A01", "audit", { seat: "A01", stage: 1 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "proposeCrew", { crew: ["a01", "A02"] })).toEqual({ ok: true, reply: "You proposed A01, A02. The table talks now, then votes; end your turn now." });
		expect(await test.call("A03", "speak", { text: "  Why A02?  " })).toEqual({ ok: true, reply: "Said. You may speak 1 more time this stage. End your turn now; you will see the replies at your next turn." });
		// A vote during the talk is taken (sealed), once.
		expect(await test.call("A03", "voteConfidence", { vote: "yes" })).toEqual({ ok: true, reply: "You voted yes (sealed). You may still speak while the talk is open; the votes are shown once all are in. End your turn now." });
		expect(await test.call("A03", "voteConfidence", { vote: "no" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(events(test, "convoy_votes_revealed")).toEqual([]);
		await test.playTicks(idleDriver, 2);
		// The talk closed; the other seats vote.
		expect(await test.call("A03", "speak", { text: "Too late." })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		// Three no of six is no strict majority: confidence holds.
		for (const seat of SEATS.filter((id) => id !== "A03")) expect(await test.call(seat, "voteConfidence", { vote: seat > "A03" ? "no" : "yes" })).toEqual({ ok: true, reply: `You voted ${seat > "A03" ? "no" : "yes"}. The votes are shown once all are in; end your turn now.` });
		expect(events(test, "convoy_crew_proposed")).toEqual([{ game: 1, stage: 1, lead: "A01", crew: ["A01", "A02"], proposal: 1, missed: false }]);
		expect(events(test, "convoy_spoken")).toEqual([{ game: 1, stage: 1, from: "A03", text: "Why A02?" }]);
		expect(events(test, "convoy_votes_revealed")).toEqual([{ game: 1, stage: 1, lead: "A01", crew: ["A01", "A02"], votes: { A01: "yes", A02: "yes", A03: "yes", A04: "no", A05: "no", A06: "no" }, missed: [], confidence: true }]);
		// The crew owes its cards, and nobody else does.
		expect(SEATS.filter((seat) => test.openTools(seat).includes("playCrewCard"))).toEqual(["A01", "A02"]);
		const view = await test.call("A04", "viewConvoy", {});
		expect(view.ok ? view.reply : "").toMatch(/^Game 1 of 1, stage 1 of 8: the crew of stage 1 \(A01, A02\) is playing its cards\. Damaged stages: 0 of 3\. Audit unused\.\nThe game: [^\n]+\nYour role in this game: you are A04 [^\n]+\nNo stage played yet\.\nNothing for you to do right now: end your turn\.$/);
		expect(await test.call("A04", "voteConfidence", { vote: "yes" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
	});

	it("ends the lead's term on a strict majority of no: the next seat's crew goes out without a vote", async () => {
		const test = testKernel(convoyGame());
		await test.call("A01", "proposeCrew", { crew: ["A01", "A02"] });
		// The fourth no of six is the strict majority.
		for (const seat of SEATS) expect(await test.call(seat, "voteConfidence", { vote: seat <= "A04" ? "no" : "yes" })).toMatchObject({ ok: true });
		await test.playTicks(idleDriver, 2);
		expect(events(test, "convoy_votes_revealed")).toMatchObject([{ lead: "A01", votes: { A01: "no", A04: "no", A05: "yes" }, missed: [], confidence: false }]);
		expect(SEATS.filter((seat) => test.openTools(seat).includes("proposeCrew"))).toEqual(["A02"]);
		expect(await test.call("A03", "speak", { text: "Again?" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A02", "proposeCrew", { crew: ["A05", "A06"] })).toEqual({ ok: true, reply: "You proposed A05, A06. It goes out without a vote; end your turn now unless you are on the crew and asked to play." });
		expect(events(test, "convoy_crew_proposed").at(-1)).toEqual({ game: 1, stage: 1, lead: "A02", crew: ["A05", "A06"], proposal: 2, missed: false });
		expect(SEATS.filter((seat) => test.openTools(seat).includes("playCrewCard"))).toEqual(["A05", "A06"]);
		expect(SEATS.filter((seat) => test.openTools(seat).includes("voteConfidence"))).toEqual([]);
	});

	it("lets a seat speak its lines of the stage, each cut at the longest length", async () => {
		const test = testKernel(convoyGame({ talkPosts: 2, maxTalkLength: 20 }));
		await test.call("A01", "proposeCrew", { crew: ["A01", "A02"] });
		expect(await test.call("A04", "speak", { text: "A line that is longer than twenty characters" })).toMatchObject({ ok: true });
		expect(await test.call("A04", "speak", { text: "Second." })).toEqual({ ok: true, reply: "Said. That was your last line this stage. End your turn now; you will see the replies at your next turn." });
		expect(await test.call("A04", "speak", { text: "Third." })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(events(test, "convoy_spoken")).toMatchObject([{ from: "A04", text: "A line that is longe" }, { from: "A04", text: "Second." }]);
	});
});

describe("the cards, the audit and the accusations", () => {
	// The lead's crew, six sealed votes of yes during the talk, and the tick that closes the talk and shows them.
	async function sendOut(test: TestKernel, lead: string, crew: readonly string[]): Promise<void> {
		expect(await test.call(lead, "proposeCrew", { crew })).toMatchObject({ ok: true });
		for (const seat of SEATS) await test.call(seat, "voteConfidence", { vote: "yes" });
		await test.playTicks(idleDriver, 1);
	}

	it("holds a saboteur to the cooldown, shows one audited card, seals the suspects and scores the game", async () => {
		const test = testKernel(convoyGame({ crews: [2, 2, 2], damageToLose: 2, cooldown: 2 }));
		const roles = Value.Parse(Type.Object({ roles: Type.Record(Type.String(), Type.String()) }), events(test, "convoy_game_started")[0]).roles;
		const [bad = "", partner = ""] = SEATS.filter((seat) => roles[seat] === "saboteur");
		const [good = "", ...others] = SEATS.filter((seat) => roles[seat] === "loyal");
		await sendOut(test, "A01", [bad, good]);
		expect(await test.call(good, "playCrewCard", { card: "damage" })).toMatchObject({ ok: false, code: "LOYAL_PLAYS_SAFE" });
		expect(await test.call(partner, "playCrewCard", { card: "damage" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call(bad, "playCrewCard", { card: "damage" })).toEqual({ ok: true, reply: "You played damage. Only the number of damage cards is revealed; end your turn now." });
		expect(await test.call(good, "playCrewCard", { card: "safe" })).toMatchObject({ ok: true });
		expect(events(test, "convoy_stage_revealed")).toEqual([{ stage: 1, lead: "A01", crew: [bad, good], votes: Object.fromEntries(SEATS.map((seat) => [seat, "yes"])), damage: 1, damaged: true }]);
		// Stage 2: the lead A02 holds the audit, once.
		expect(await test.call("A03", "audit", { seat: bad, stage: 1 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A02", "audit", { seat: partner, stage: 1 })).toMatchObject({ ok: false, code: "NOT_ON_CREW", detail: `${partner} was not on the crew of stage 1 (${bad}, ${good}).` });
		expect(await test.call("A02", "audit", { seat: bad, stage: 2 })).toMatchObject({ ok: false, code: "NO_SUCH_STAGE", detail: "Stage 2 has not been played. Played: 1." });
		expect(await test.call("A02", "audit", { seat: bad.toLowerCase(), stage: 1 })).toEqual({ ok: true, reply: `Audit: ${bad} played damage in stage 1. The whole table sees it. Now propose your crew.` });
		expect(await test.call("A02", "audit", { seat: good, stage: 1 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		await sendOut(test, "A02", [bad, good]);
		expect(await test.call(bad, "playCrewCard", { card: "damage" })).toMatchObject({ ok: false, code: "COOLDOWN", detail: "You played damage in stage 1; your next damage card is allowed from stage 3. Play safe." });
		for (const seat of [bad, good]) await test.call(seat, "playCrewCard", { card: "safe" });
		// Stage 3: the second damaged stage stops the convoy; the loyal seats name their suspects.
		await sendOut(test, "A03", [bad, good]);
		for (const seat of [bad, good]) await test.call(seat, "playCrewCard", { card: seat === bad ? "damage" : "safe" });
		expect(await test.call(bad, "accuse", { seats: [good, partner] })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call(good, "accuse", { seats: [good, bad] })).toMatchObject({ ok: false, code: "NOT_A_SEAT", detail: `Name other seats: ${SEATS.filter((seat) => seat !== good).join(", ")}.` });
		expect(await test.call(good, "accuse", { seats: [bad] })).toMatchObject({ ok: false, code: "ACCUSE_COUNT" });
		expect(await test.call(good, "accuse", { seats: [bad, partner] })).toEqual({ ok: true, reply: "Noted (sealed). The roles are revealed when every loyal seat has named its suspects; end your turn now." });
		expect(events(test, "convoy_game_ended")).toEqual([]);
		// The timer fills in the three loyal seats that named nobody.
		await test.playTicks(idleDriver, 2);
		expect(events(test, "convoy_accused")).toEqual([{ game: 1, seat: good, accused: [bad, partner], missed: false }, ...others.map((seat) => ({ game: 1, seat, accused: [], missed: true }))]);
		expect(events(test, "convoy_game_ended")).toMatchObject([{ winner: "saboteurs", damaged: 2, stages: 3, totals: Object.fromEntries(SEATS.map((seat) => [seat, roles[seat] === "saboteur" ? 1 : 0])) }]);
		const scored = events(test, "convoy_game_scored");
		expect(scored).toMatchObject([{ game: 1, posterior: { [bad]: 1 }, seats: { [good]: { role: "loyal", accused: [bad, partner], hits: 2, rightVotes: 0, votes: 3, missed: 0 }, [bad]: { role: "saboteur", chances: 2, damage: 2, rightVotes: 0 }, [others[0] ?? ""]: { accused: [], hits: 0, missed: 1 } } }]);
		// The audited damage card puts the saboteur on top of the tracker's list.
		expect(Value.Parse(Type.Object({ tracker: Type.Array(Type.String()) }), scored[0]).tracker[0]).toBe(bad);
		expect(events(test, "convoy_match_ended")).toEqual([{ scores: Object.fromEntries(SEATS.map((seat) => [seat, roles[seat] === "saboteur" ? 1 : 0])) }]);
		expect(test.kernel.fact("convoy.scores")).toMatchObject({ [bad]: 1, [good]: 0 });
	});
});

describe("the timer and the table", () => {
	it("deals the seeded roles, names the crew and counts the votes of the oracle file in which nobody acts", async () => {
		const oracle = readOracle(SILENT);
		const recorded = oracle.timeline.flatMap((entry) => (entry.k === "event" && entry.source === "convoy" ? [{ type: entry.type, payload: entry.payload }] : []));
		// The crew is named at the end of tick 1, the talk closes at the end of tick 2 (every seat had a turn in it), the votes at the end of tick 4.
		const run = await play(convoyGame({}, { seed: oracle.seed }), { ticks: 5 });
		expect(recorded.slice(0, 3).map((event) => event.type)).toEqual(["convoy_game_started", "convoy_crew_proposed", "convoy_votes_revealed"]);
		expect(ofType(run.events)).toEqual(recorded.slice(0, 3));
		expect(ofType((await play(convoyGame({}, { seed: oracle.seed }), { ticks: 4 })).events)).toHaveLength(2);
	});

	it("refuses a table that the rules do not fit", () => {
		expect(() => testKernel(convoyGame({ crews: [2, 2, 4] }, { seats: SEATS.slice(0, 4) }))).toThrow("convoy: every crew must be smaller than the table");
		expect(() => testKernel(convoyGame({ saboteurs: 3 }))).toThrow("convoy: the saboteurs must be fewer than half the table");
		expect(() => testKernel(convoyGame({ crews: [2, 2], damageToLose: 3 }))).toThrow("convoy: damageToLose is more than the stages");
	});

	it("plays a fake run to the end of the match", async () => {
		const run = await play(convoyGame({}, { seed: 7 }), { drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		const accepted = run.events.flatMap((event) => (event.type === "tool_result" && JSON.stringify(event.payload).includes('"reply"') ? [JSON.stringify(event.payload)] : []));
		for (const tool of ["viewConvoy", "proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse"]) expect(accepted.some((payload) => payload.includes(`"as":"${tool}"`)), tool).toBe(true);
		expect(run.end).toMatchObject({ reason: "limit", limit: "convoy.match" });
		expect(ofType(run.events, "convoy_match_ended")).toHaveLength(1);
	});
});
