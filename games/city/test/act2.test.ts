// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Act II against `cityofkeys-act2-s7.json` and `cityofkeys-act2-seal-s7.json` by projection at level 1 (issue
 * M5-47, decision A56; the harness is `act2.ts`). From the act's first minute on, the events of the act's sources
 * (the act, the goals, the tribunals with their factions and votes, the exiles with the gates, ransoms and wills, the
 * seal, the pieces, the blames with the judge's questions, the ledger, the standings of every round and the end) are
 * compared whole, each with the minute it was written in, and source by source in the file's order; the calls of the
 * act are compared at level 1 (actor, tool, `ok`, code, stage), and so is the end.
 *
 * The registered changes applied to the file (the M5-47 rows of `12-m5-spec-errata.md`): its numbers of messages and
 * groups are those this run gave the same ones and the ledger's `txId` is counted from the act; the gamemaker's look
 * after round m + 1 is taken in the start slot of tick m + 1 (J126), so what it wrote carries the next minute; the
 * refusal of an unknown piece in a will comes at stage `rule` (J27); and when one tick exiles two residents, each
 * contraction of a level already leaves out both (the listener of `puzzles` runs after both `exiled`). The order
 * between two sources is not compared: after an exile the listeners follow in load order (the ledger's burn, the
 * contractions, the goal, the kept pieces, where the file has the kept pieces first), and a will's piece follows
 * `last_will` (J27).
 */
import { join } from "node:path";
import type { Envelope } from "@swarmtales/contracts";
import { answeringReview, checkResumeEveryBoundary, playStanding, projectOracle, readOracle, renumbered, timelineOf, type Oracle, type OracleEntry, type ProjectedEvent, type ProjectionSelector } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { CITY } from "../src/story.ts";
import { ACT2, ACT_START, actTwoDrivers, inRunNumbers } from "./act2.ts";
import { gameOf, ORACLES } from "./support.ts";

const SOURCES: Readonly<Record<string, readonly string[]>> = {
	progression: ["act_ended", "act_started"],
	goals: ["goal_dealt", "goal_resolved"],
	tribunal: ["tribunal_scheduled", "tribunal_announced", "tribunal_called", "tribunal_opened", "tribunal_vote", "tribunal_result", "faction_nominated", "faction_leaders", "faction_applied", "faction_refused", "factions_formed", "bloc_result"],
	exile: ["exile_gate", "exiled", "ransom_paid", "ransomed", "last_will"],
	seal: ["seal_auction_opened", "seal_bid", "seal_won", "seal_used", "seal_expired"],
	standoff: ["piece_given", "piece_kept"],
	puzzles: ["level_contracted"],
	receipts: ["blame"],
	ledger: ["ledger_entry"],
	arena: ["round_end", "run_end"],
	core: ["role_asked", "role_answered", "resident_suspended"],
};
const selectors = (source: string): readonly ProjectionSelector[] => (SOURCES[source] ?? []).map((type) => ({ source, type }));

const field = (value: unknown, name: string): unknown => (typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined);
const fromAct = (timeline: readonly OracleEntry[]): readonly OracleEntry[] => timeline.slice(timeline.findIndex((entry) => entry.k === "minute" && entry.minute === ACT_START));

// What the harness adds to bring the game into the snapshot's situation: levels 1 to 7 and their rewards.
const ofActOne = (entry: OracleEntry): boolean =>
	(entry.k === "event" && entry.type === "ledger_entry" && /^level [1-7] solved$/.test(String(field(entry.payload, "reason")))) || (entry.k === "call" && entry.tool === "submitSolution" && Number(field(entry.params, "level")) <= 7);

// Every event with the minute it was written in, as the field `at`; `shift` moves the minute of an actor's events.
function minuted(timeline: readonly OracleEntry[], shift: (actor: string) => number = () => 0): readonly OracleEntry[] {
	let minute = 0;
	return timeline.map((entry) => {
		if (entry.k === "minute") minute = entry.minute;
		const payload: object = entry.k === "event" && typeof entry.payload === "object" && entry.payload !== null ? entry.payload : {};
		return entry.k === "event" ? { ...entry, payload: { at: minute + shift(entry.actor), ...payload } } : entry;
	});
}

// Two exiles of one tick: each contraction of a level then leaves out everyone exiled in that tick (the last one's list).
function contracted(events: readonly ProjectedEvent[]): readonly ProjectedEvent[] {
	const last = (event: ProjectedEvent): unknown => events.findLast((other) => other.type === "level_contracted" && field(other.payload, "at") === field(event.payload, "at") && field(other.payload, "level") === field(event.payload, "level"))?.payload;
	return events.map((event) => (event.type === "level_contracted" ? { ...event, payload: last(event) } : event));
}

/** The file's projection of one source, with the registered changes, in this run's numbers. */
function ofFile(oracle: Oracle, log: readonly Envelope[], source: string): readonly ProjectedEvent[] {
	const inRun = inRunNumbers(oracle, log);
	const projected = projectOracle(minuted(fromAct(oracle.timeline), (actor) => (actor === "gamemaker" ? 1 : 0)), selectors(source));
	return renumbered(contracted(projected), ["txId"]).events.map((event) => ({ ...event, payload: inRun(event.payload) }));
}

const ofRun = (log: readonly Envelope[], source: string): readonly ProjectedEvent[] => renumbered(projectOracle(minuted(fromAct(timelineOf(log)).filter((entry) => !ofActOne(entry))), selectors(source)), ["txId"]).events;

// The calls of the act at level 1; the file's refusal of an unknown piece in a will comes at stage `rule` (J27).
function callsOf(timeline: readonly OracleEntry[], file: boolean): readonly unknown[] {
	return fromAct(timeline).flatMap((entry) => {
		if (entry.k !== "call" || entry.actor === "script" || ofActOne(entry)) return [];
		const stage = file && entry.code === "UNKNOWN_FACTOR" ? "rule" : entry.stage;
		return [{ actor: entry.actor, tool: entry.tool, ok: entry.ok, code: entry.code, stage }];
	});
}

// The judge of the files (old `JUDGE_SCRIPT`): the denial on the board denies the receipt, the thanks by message does not.
const review = answeringReview({ judge: (question) => ({ deniesReceipt: JSON.stringify(question).includes("never sent me anything") }) });

const playAct = (oracle: Oracle, story = ACT2) => playStanding(gameOf(oracle, story), actTwoDrivers(oracle), { seed: oracle.seed, review });
const ACT2_S7 = readOracle(join(ORACLES, "cityofkeys-act2-s7.json"));

describe("city: Act II by projection (A56)", () => {
	it.each(["cityofkeys-act2-s7.json", "cityofkeys-act2-seal-s7.json"])("%s: the act's events, calls and end are the file's", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		const { events, end } = await playAct(oracle);
		for (const source of Object.keys(SOURCES)) {
			expect(ofFile(oracle, events, source).length, source).toBeGreaterThan(0);
			expect(ofRun(events, source), source).toEqual(ofFile(oracle, events, source));
		}
		expect(callsOf(timelineOf(events), false)).toEqual(callsOf(oracle.timeline, true));
		expect({ reason: "referee", minute: end?.tick, limit: end?.limit }).toEqual(oracle.end);
	}, 120_000);

	it("finds a changed vote of the file", async () => {
		const { events } = await playAct(ACT2_S7);
		const at = ACT2_S7.timeline.findIndex((entry) => entry.k === "event" && entry.type === "tribunal_vote");
		const changed = { ...ACT2_S7, timeline: ACT2_S7.timeline.map((entry, index) => (index === at && entry.k === "event" ? { ...entry, payload: { voter: "A02", target: "A03" } } : entry)) };
		expect(ofRun(events, "tribunal")).not.toEqual(ofFile(changed, events, "tribunal"));
	}, 120_000);

	// The old `cityofkeys-tribunal.test.ts`, "resumes it into the current story": the shipped City (half of six, the
	// first tribunal at the latest 18 minutes into the act) played on from the same situation, without the gamemaker's plan.
	it("plays the shipped City's tribunals from the same situation", async () => {
		const oracle = { ...ACT2_S7, timeline: ACT2_S7.timeline.filter((entry) => !(entry.k === "call" && entry.actor === "gamemaker")) };
		const { events } = await playAct(oracle, CITY);
		const of = (source: string, type: string) => projectOracle(minuted(timelineOf(events)), [{ source, type }]).map((event) => event.payload);
		expect(of("tribunal", "tribunal_announced")).toEqual([{ at: 34, target: 3, residents: 6 }]);
		expect(of("tribunal", "tribunal_scheduled")[0]).toEqual({ at: 34, tribunal: 1, opens: 38, calledAt: 34, count: 1, factions: 2, by: "deadline" });
		expect(of("exile", "exiled")).toHaveLength(3);
		expect(field(of("arena", "run_end").at(-1), "reason")).toMatch(/^The city has kept 3 of 6 residents, and of them only 2 take a seat\. Exiled: A0\d, A0\d and A0\d\. The tribunals are over\.$/);
	}, 120_000);

	// The old "keeps a running faction draft through a snapshot file": resumed at the act's start, in the middle of the
	// nominations (minute 31) and at the gate with its will (minute 47), the run is the straight one.
	it("resumes inside the act to the straight log", async () => {
		expect(await checkResumeEveryBoundary(gameOf(ACT2_S7, ACT2), actTwoDrivers(ACT2_S7), { seed: ACT2_S7.seed, review, boundaries: [16, 31, 47] })).toEqual([]);
	}, 300_000);
});
