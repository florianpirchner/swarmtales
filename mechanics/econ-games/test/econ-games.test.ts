// SPDX-License-Identifier: Apache-2.0
/**
 * The econ-games mechanic alone: a scripted match, the timer, the locks and its conformance (offline). The cases are
 * the mechanic's part of the old `test/stories/econ-lab.test.ts`; the game's part (the brain, the briefings) is the
 * test of the game `econ-lab`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { econGames } from "../src/index.ts";
import { econGame, field, ofType, player } from "./support.ts";

const players = { drivers: { resident: player } };
const HUMAN = JSON.stringify(["human"]);

describe("a match", () => {
	it("plays the three games in order with sealed decisions and payoffs, and ends the run", async () => {
		const run = await play(econGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "econ-games.match" });
		expect(ofType(run.events, "block_ended").map((event) => field(event, "game"))).toEqual(["ultimatum", "public-goods", "dilemma"]);
		expect(ofType(run.events, "round_resolved")).toHaveLength(18);
		expect(ofType(run.events, "decision_made")).toHaveLength(72);
		expect(ofType(run.events, "decision_made").every((event) => JSON.stringify(event.audience) === HUMAN)).toBe(true);
		expect(ofType(run.events, "block_scored").every((event) => JSON.stringify(event.audience) === HUMAN)).toBe(true);

		// Ultimatum: every offer is 4 of 10 and accepted. Public goods: two seats put in 8, two put in 2. A-or-B: two A seats, two B seats.
		const [ultimatum, fund, choice] = ofType(run.events, "block_scored").map((event) => field(event, "reference"));
		expect(ultimatum).toMatchObject({ meanOffer: 0.4, rejectionRate: 0, efficiency: 1, missed: 0 });
		expect(fund).toMatchObject({ cooperation: 0.5, missed: 0 });
		expect(choice).toMatchObject({ cooperation: 0.5, missed: 0 });
		const firstFund = ofType(run.events, "round_resolved").find((event) => field(event, "game") === "public-goods");
		expect(firstFund === undefined ? undefined : field(firstFund, "pool")).toBe(20);
		// A free rider earns more in the fund than a contributor: 10 - 2 + 8 = 16 against 10 - 8 + 8 = 10.
		const [, fundScores] = ofType(run.events, "block_ended").map((event) => field(event, "scores"));
		expect(fundScores).toEqual({ A01: 70, A02: 70, A03: 112, A04: 112 });
		const totals = ofType(run.events, "match_ended").map((event) => field(event, "scores"));
		expect(totals).toHaveLength(1);
		expect(run.kernel.fact("econ-games.scores")).toEqual(totals[0]);
	});

	it("takes the defaults for missed decisions and still ends the match", async () => {
		const run = await play(econGame(), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "econ-games.match" });
		expect(ofType(run.events, "decision_made")).toHaveLength(0);
		// Ultimatum: 6 rounds x 2 proposers miss; the fund: 7 x 4 seats; the A-or-B game: 5 x 4 seats.
		// Points: nothing from the split offers, 10 kept per fund round, 1 per round of B against B.
		const missed = ofType(run.events, "block_scored").map((event): unknown => {
			const reference = field(event, "reference");
			return typeof reference === "object" && reference !== null ? Reflect.get(reference, "missed") : undefined;
		});
		expect(missed).toEqual([12, 28, 20]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 75, A02: 75, A03: 75, A04: 75 }]);
	});

	it("opens a decision only for the seat that owes it and refuses everything else", async () => {
		const test = testKernel(econGame({ blocks: [{ game: "ultimatum", rounds: 2 }] }));
		// Round 1: A01 proposes to A04, A02 to A03 (circle pairing); responders have nothing open yet.
		expect(test.openTools("A01")).toContain("offer");
		expect(test.openTools("A04")).not.toContain("respond");
		expect(await test.call("A04", "offer", { amount: 5 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "offer", { amount: 11 })).toMatchObject({ ok: false, code: "OUT_OF_RANGE" });
		expect(await test.call("A01", "offer", { amount: 3 })).toEqual({ ok: true, reply: "Decision sealed for round 1. Wait for the others." });
		expect(await test.call("A01", "offer", { amount: 4 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A02", "offer", { amount: 5 })).toMatchObject({ ok: true });
		expect(test.openTools("A04")).toContain("respond");
		expect(await test.call("A04", "respond", { accept: false })).toMatchObject({ ok: true });
		expect(await test.call("A03", "respond", { accept: true })).toEqual({ ok: true, reply: "Decision sealed. Round 1 is resolved; use viewTable for the result." });
		const outcomes = ofType(test.kernel.log.all(), "round_resolved").map((event) => field(event, "outcomes"))[0];
		expect(outcomes).toEqual(expect.arrayContaining([expect.objectContaining({ resident: "A01", offer: 3, accepted: false, payoff: 0 }), expect.objectContaining({ resident: "A03", offer: 5, accepted: true, payoff: 5 })]));
		const view = await test.call("A04", "viewTable", {});
		expect(view.ok && view.reply).toContain("you rejected");
	});
});

describe("module conformance", () => {
	it("agrees with its package.json and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(econGames, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(econGames)).toEqual([]);
	});

	it("is deterministic and survives a snapshot round trip inside a game and between two games", async () => {
		expect(await checkDeterminism(econGame(), () => player)).toEqual([]);
		for (const cut of [1, 3, 5]) expect(await checkSnapshotRoundTrip(econGame(), () => player, cut)).toEqual([]);
	});
});
