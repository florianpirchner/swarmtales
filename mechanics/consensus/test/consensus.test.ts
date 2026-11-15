// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The consensus gate with scripted residents on a toy game: offline, no model. Carried from the old `consensus.test.ts`. */
import { describe, expect, it } from "vitest";
import type { Envelope } from "@swarmtales/contracts";
import type { CallRecord } from "@swarmtales/testkit";
import { consensus } from "../src/index.ts";
import { move, playToy, propose, roundTrips, vote, type Script } from "./toy.ts";

function payload(event: Envelope): Readonly<Record<string, unknown>> {
	const value = event.payload;
	return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : {};
}

const refusals = (events: readonly Envelope[]): string[] =>
	events.filter((event) => event.type === "tool_refused").map((event) => `${String(event.tick)} ${event.actor.slice(9)} ${String(payload(event).as)} ${String(payload(event).stage)} ${String(payload(event).code)}`);

const ofType = (events: readonly Envelope[], type: string): Envelope[] => events.filter((event) => event.type === type);

/** Red agrees on 4 in tick 0 and its captain plays it in pass 2. */
const AGREED: Script = { "0:1:A01": [propose(4)], "0:1:A02": [vote(true)], "0:1:A03": [vote(true)], "0:2:A01": [move(4)] };

describe("consensus", () => {
	it("releases the move the team agreed on", async () => {
		const record: CallRecord[] = [];
		const run = await playToy({}, AGREED, record);
		expect(refusals(run.events)).toEqual([]);
		expect(ofType(run.events, "move_proposed").map(payload)).toEqual([{ team: "red", captain: "A01", cell: 4, reason: "because" }]);
		expect(ofType(run.events, "vote_cast").map((event) => payload(event).outcome)).toEqual(["pending", "reached"]);
		expect(ofType(run.events, "consensus_reached").map(payload)).toEqual([{ team: "red", cell: 4, agree: 2, disagree: 0 }]);
		expect(ofType(run.events, "move_played").map(payload)[0]).toEqual({ team: "red", cell: 4, forfeit: false });
		// Not in the old test: the replies a model reads come from the carried prompt files.
		expect(record.map((entry) => (entry.outcome.ok ? entry.outcome.reply : entry.outcome.code))).toEqual([
			"Proposed 4. Wait for your team's votes.",
			"Your vote is recorded. The vote is still open.",
			"The team agreed on 4. The captain plays exactly that move.",
			"Played 4.",
		]);
	});

	it("refuses a played cell that differs from the voted one, and a play before any vote", async () => {
		const script: Script = { ...AGREED, "0:2:A01": [move(5), move(4)], "1:1:A04": [move(0)], "2:1:A04": [propose(0)] };
		const run = await playToy({ maxRounds: 9 }, script);
		expect(refusals(run.events)).toEqual(["0 A01 playMove rule CONSENSUS_MISMATCH", "1 A04 playMove rule NO_CONSENSUS"]);
		expect(ofType(run.events, "move_played").map((event) => payload(event).cell)).toEqual([4]);
	});

	it("treats a tie of two voters as no consensus; the captain cannot override", async () => {
		const script: Script = { "0:1:A01": [propose(4)], "0:1:A02": [vote(true)], "0:1:A03": [vote(false)], "0:2:A01": [move(4)], "0:3:A01": [propose(0)] };
		const run = await playToy({ maxRounds: 9 }, script);
		expect(ofType(run.events, "vote_cast").map((event) => payload(event).outcome)).toEqual(["pending", "rejected"]);
		expect(ofType(run.events, "consensus_reached")).toHaveLength(0);
		expect(refusals(run.events)).toEqual(["0 A01 playMove rule NO_CONSENSUS"]);
		expect(ofType(run.events, "move_played")).toHaveLength(0);
		// The captain may propose again after a rejection.
		expect(ofType(run.events, "move_proposed")).toHaveLength(2);
	});

	it("rejects a proposal once a majority is out of reach, so a late vote has nothing to vote on", async () => {
		// One against one of two voters is a tie: the proposal is gone before the second voter acts.
		const script: Script = { "0:1:A01": [propose(4)], "0:1:A02": [vote(false)], "0:1:A03": [vote(true)] };
		const run = await playToy({ maxRounds: 9 }, script);
		expect(refusals(run.events)).toEqual(["0 A03 castVote rule NO_OPEN_PROPOSAL"]);
	});

	it("refuses non-members, the waiting team, non-captains and captain votes", async () => {
		const script: Script = {
			"0:1:A01": [propose(4)],
			"0:1:A02": [propose(1), vote(true), vote(true)],
			"0:1:A04": [propose(1), vote(true), move(1)],
			"0:1:A07": [propose(1), vote(true), move(1)],
			"0:2:A01": [vote(true), propose(4), move(4)],
		};
		const run = await playToy({ maxRounds: 9 }, script);
		expect(refusals(run.events)).toEqual([
			"0 A02 proposeMove rule NOT_CAPTAIN",
			"0 A02 castVote rule ALREADY_VOTED",
			"0 A04 proposeMove rule NOT_ON_MOVE",
			"0 A04 castVote rule NOT_ON_MOVE",
			"0 A04 playMove rule NOT_ON_MOVE",
			"0 A07 proposeMove rule NOT_TEAM_MEMBER",
			"0 A07 castVote rule NOT_TEAM_MEMBER",
			"0 A07 playMove rule NOT_TEAM_MEMBER",
			"0 A01 castVote rule CAPTAIN_CANNOT_VOTE",
			"0 A01 playMove rule NO_CONSENSUS",
		]);
	});

	it("forfeits a seeded random legal move when the team does not move in time, and counts it", async () => {
		const first = await playToy({ maxRounds: 2 }, {});
		const forfeits = ofType(first.events, "consensus_forfeited").map(payload);
		expect(forfeits.map((entry) => entry.team)).toEqual(["red", "blue"]);
		expect(ofType(first.events, "move_played").map((event) => payload(event).forfeit)).toEqual([true, true]);
		expect(ofType(first.events, "move_played").map((event) => payload(event).cell)).toEqual(forfeits.map((entry) => entry.cell));
		expect(first.kernel.fact("consensus.forfeits")).toEqual({ red: 1, blue: 1 });
		// The forfeit is part of the seeded stream: the same seed deals the same cells.
		const again = await playToy({ maxRounds: 2 }, {});
		expect(ofType(again.events, "consensus_forfeited").map(payload)).toEqual(forfeits);
		const other = await playToy({ maxRounds: 2, seed: 99 }, {});
		expect(other.events.filter((event) => event.type === "consensus_forfeited")).toHaveLength(2);
	});

	it("counts only whole ticks the team was on move: a team that went on move mid-tick starts counting the next tick", async () => {
		// Red plays in tick 0 (pass 2), so blue is on move from the middle of tick 0: its rounds are ticks 1 and 2.
		const run = await playToy({ maxRounds: 2, ticks: 5 }, AGREED);
		expect(ofType(run.events, "consensus_forfeited").map((event) => [event.tick, payload(event).team, payload(event).rounds])).toEqual([
			[2, "blue", 2],
			[4, "red", 2],
		]);
		// And the forfeit of blue (mid-tick 2, in the tick's end) gives red whole ticks 3 and 4 only.
		for (const cut of [1, 2, 3, 4]) expect(await roundTrips({ maxRounds: 2, ticks: 5 }, AGREED, cut)).toBe(true);
	});

	it("with onDeadlock refuse keeps the gate shut and writes consensus_deadlocked once", async () => {
		const run = await playToy({ maxRounds: 2, onDeadlock: "refuse", ticks: 5 }, { "3:1:A01": [move(4)] });
		expect(ofType(run.events, "consensus_deadlocked").map(payload)).toEqual([{ team: "red", rounds: 2 }]);
		expect(ofType(run.events, "move_played")).toHaveLength(0);
		expect(refusals(run.events)).toEqual(["3 A01 playMove rule NO_CONSENSUS"]);
	});

	it("is deterministic and survives a snapshot round trip at every cut", async () => {
		const script: Script = { ...AGREED, "1:1:A04": [propose(0)], "1:1:A05": [vote(false)], "1:1:A06": [vote(true)] };
		const gate = { maxRounds: 2, ticks: 5 };
		expect((await playToy(gate, script)).events).toEqual((await playToy(gate, script)).events);
		for (const cut of [1, 2, 3, 4]) expect(await roundTrips(gate, script, cut)).toBe(true);
	});

	it("ends the run as invalid after maxConsecutiveForfeits forfeits with no agreed move", async () => {
		const gate = { maxRounds: 1, maxConsecutiveForfeits: 3, ticks: 12 };
		const run = await playToy(gate, {});
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(3);
		expect(ofType(run.events, "match_invalid").map((event) => [payload(event).forfeits, String(payload(event).reason).startsWith("3 forfeits in a row")])).toEqual([[3, true]]);
		expect(run.end).toMatchObject({ reason: "limit", limit: "toy.match" });
		expect((await playToy(gate, {})).events).toEqual(run.events);
		for (const cut of [1, 2]) expect(await roundTrips(gate, {}, cut)).toBe(true);
	});

	it("an agreed move resets the forfeit streak, and 0 turns the check off", async () => {
		const reset = await playToy({ maxRounds: 1, maxConsecutiveForfeits: 2, ticks: 3 }, { "1:1:A04": [propose(0)], "1:1:A05": [vote(true)], "1:1:A06": [vote(true)], "1:2:A04": [move(0)] });
		expect(ofType(reset.events, "match_invalid")).toHaveLength(0);
		const off = await playToy({ maxRounds: 1, ticks: 8 }, {});
		expect(ofType(off.events, "consensus_forfeited").length).toBeGreaterThan(3);
		expect(ofType(off.events, "match_invalid")).toHaveLength(0);
	});

	it("documents every option", () => {
		const properties = Object.entries(consensus.options.properties);
		expect(properties.filter(([, schema]) => !("description" in schema && typeof schema.description === "string"))).toEqual([]);
		expect(properties.map(([key]) => key)).toEqual(["tool", "param", "rule", "maxRounds", "onDeadlock", "maxConsecutiveForfeits", "teams"]);
	});
});
