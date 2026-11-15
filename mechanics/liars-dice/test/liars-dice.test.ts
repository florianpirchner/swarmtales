// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The liars-dice mechanic alone: a scripted match, the move timer, the locks, a fake run and its conformance (offline).
 * The cases are the mechanic's part of the old `test/stories/liars-dice.test.ts`; the game's part (the brain, the
 * briefings, the variant names) is the test of the game `liars-dice`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Envelope } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { liarsDice } from "../src/index.ts";
import { Bid, countFor, SeatStats } from "../src/rules.ts";
import { diceGame, field, ofType, player, WILD } from "./support.ts";

const players = { drivers: { resident: player } };
const HUMAN = JSON.stringify(["human"]);
const Dice = Type.Record(Type.String(), Type.Array(Type.Integer()), { description: "The dice of each seat." });
const Stats = Type.Record(Type.String(), SeatStats, { description: "The statistics of each seat." });
const sorted = (dice: Readonly<Record<string, readonly number[]>>): Record<string, number[]> =>
	Object.fromEntries(Object.entries(dice).filter(([, own]) => own.length > 0).map(([seat, own]) => [seat, [...own].sort((a, b) => a - b)]));

// The dice a call shows are the roll of its round, and the count and the loser follow from them.
function expectHonest(call: Envelope, rolls: readonly Envelope[]): void {
	const roll = rolls.find((event) => field(event, "game") === field(call, "game") && field(event, "round") === field(call, "round"));
	const shown = Value.Parse(Dice, field(call, "dice"));
	expect(shown).toEqual(sorted(Value.Parse(Dice, roll === undefined ? undefined : field(roll, "dice"))));
	const bid = Value.Parse(Bid, field(call, "bid"));
	const count = countFor(Object.values(shown).flat(), bid.face, WILD);
	expect(field(call, "count")).toBe(count);
	expect(field(call, "loser")).toBe(count >= bid.quantity ? field(call, "seat") : field(call, "bidder"));
}

describe("a match", () => {
	it("plays three games with secret rolls, checked bids, liar calls and places", async () => {
		const run = await play(diceGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "liars-dice.match" });
		const ended = ofType(run.events, "dice_game_ended");
		expect(ended).toHaveLength(3);
		for (const type of ["dice_rolled", "dice_decision_scored", "dice_game_scored"]) expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === HUMAN)).toBe(true);
		for (const type of ["dice_bid", "dice_called", "dice_round_started"]) expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) !== HUMAN)).toBe(true);
		// A reason never reaches a public event; the remark does.
		expect(ofType(run.events, "dice_bid").some((event) => field(event, "reason") !== undefined)).toBe(false);
		expect(ofType(run.events, "dice_bid").some((event) => typeof field(event, "say") === "string")).toBe(true);
		expect(ofType(run.events, "dice_decision_scored").every((event) => field(event, "missed") === false)).toBe(true);

		// Every call takes one die and the dice shown match the roll.
		const calls = ofType(run.events, "dice_called");
		expect(calls.length).toBeGreaterThan(0);
		for (const call of calls) expectHonest(call, ofType(run.events, "dice_rolled"));
		// Places score 3, 2, 1, 0 in every game, and the match totals are their sum.
		for (const event of ended) expect(Object.values(Value.Parse(Type.Record(Type.String(), Type.Number()), field(event, "points"))).sort()).toEqual([0, 1, 2, 3]);
		expect([run.kernel.fact("liars-dice.scores")]).toEqual(ended.slice(2).map((event) => field(event, "totals")));
		const stats = ofType(run.events, "dice_game_scored").map((event) => Object.values(Value.Parse(Stats, field(event, "stats"))));
		expect(stats).toHaveLength(3);
		// Each seat out lost all four dice, the winner fewer; the calls of a game are the dice lost.
		for (const [index, seats] of stats.entries()) {
			for (const seat of seats) expect(seat.diceLost).toBe(seat.place === 1 ? seat.diceLost : 4);
			expect(seats.find((seat) => seat.place === 1)?.diceLost).toBeLessThan(4);
			expect(calls.filter((call) => field(call, "game") === index + 1)).toHaveLength(seats.reduce((sum, seat) => sum + seat.diceLost, 0));
		}
	});

	it("opens with the lowest bid or calls liar for a seat that does not act, and still ends the match", async () => {
		const run = await play(diceGame({ games: 1 }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "liars-dice.match" });
		const decisions = ofType(run.events, "dice_decision_scored");
		expect(decisions.length).toBeGreaterThan(0);
		expect(decisions.every((event) => field(event, "missed") === true)).toBe(true);
		expect(ofType(run.events, "dice_bid").every((event) => field(event, "quantity") === 1 && field(event, "face") === 2)).toBe(true);
	});

	it("opens the tools only for the seat to act and refuses illegal bids", async () => {
		const test = testKernel(diceGame({}, 2), { prompts: { render: (_owner, id) => id } });
		expect(test.openTools("A01")).toContain("bid");
		expect(test.openTools("A01")).not.toContain("liar");
		expect(test.openTools("A02")).not.toContain("bid");
		expect(await test.call("A02", "bid", { quantity: 1, face: 3 })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "bid", { quantity: 1, face: 1 })).toMatchObject({ ok: false, code: "ILLEGAL_BID" });
		expect(await test.call("A01", "bid", { quantity: 9, face: 3 })).toMatchObject({ ok: false, code: "ILLEGAL_BID" });
		expect(await test.call("A01", "bid", { quantity: 2, face: 3, say: "lots of threes here", reason: "a bluff" })).toEqual({ ok: true, reply: "You bid 2 x 3. A02 is to act, not you: end your turn now; you will be told when it is yours.", endsTurn: true });
		expect(test.openTools("A02")).toContain("liar");
		expect(await test.call("A02", "bid", { quantity: 2, face: 2 })).toMatchObject({ ok: false, code: "ILLEGAL_BID" });
		const view = await test.call("A02", "viewTable", {});
		expect(view.ok && view.reply).toContain('A01 bids 2 x 3 ("lots of threes here")');
		expect(view.ok && view.reply).not.toContain("a bluff");
		expect(await test.call("A02", "liar", {})).toMatchObject({ ok: true });
		const call = ofType(test.kernel.log.all(), "dice_called")[0];
		expect(call === undefined ? undefined : field(call, "bidder")).toBe("A01");
		// The loser opens round 2.
		const loser = call === undefined ? "" : String(field(call, "loser"));
		expect(test.openTools(loser)).toContain("bid");
	});

	it("plays to the end of the match in a fake run, with every tool sampled and accepted", async () => {
		expect(liarsDice.head.tools.map((tool) => [tool.name, tool.sampled])).toEqual([["viewTable", true], ["bid", true], ["liar", true]]);
		const run = await play(diceGame({ games: 1, dice: 2 }), { drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(run.end).toMatchObject({ reason: "limit", limit: "liars-dice.match" });
		const accepted = run.events.filter((event) => event.type === "tool_result").map((event) => field(event, "as"));
		for (const tool of ["viewTable", "bid", "liar"]) expect(accepted).toContain(tool);
		expect(ofType(run.events, "dice_decision_scored").some((event) => field(event, "missed") === false)).toBe(true);
	});
});

describe("module conformance", () => {
	it("agrees with its package.json and documents every option", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(liarsDice, packageJson)).toEqual([]);
		expect(checkOptionsDocumented(liarsDice)).toEqual([]);
	});

	it("is deterministic and survives a snapshot round trip inside a game", async () => {
		const small = { games: 2, dice: 2 };
		expect(await checkDeterminism(diceGame(small), () => player)).toEqual([]);
		for (const cut of [0, 2, 5]) expect(await checkSnapshotRoundTrip(diceGame(small), () => player, cut)).toEqual([]);
	});
});
