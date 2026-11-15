// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game's part of the old `test/stories/holdem.test.ts`: a scripted match of the game file with a brain per seat,
 * the timer for seats that never act, the lock of `act` through the game's lists, the brain seats of a mixed table
 * and the aid seats. The cards and the betting are proven by the mechanic's own tests (`mechanics/holdem/test/`).
 */
import { nameOf, type ActorDriver } from "@swarmtales/contracts";
import { idleDriver, play, testKernel } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { field, ofType, player, rosterGame } from "./support.ts";

/** The value of `seat` in a record field of an event, untyped. */
const seatOf = (value: unknown, seat: string): unknown => (typeof value === "object" && value !== null ? Reflect.get(value, seat) : undefined);

describe("holdem, scripted match", () => {
	it("plays four games of eight duplicate hands with private cards, scored decisions and a brain per seat", async () => {
		const run = await play(rosterGame(), { drivers: { resident: player } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "holdem.match" });
		const ended = ofType(run.events, "hand_ended");
		expect(ended).toHaveLength(32);
		for (const event of ended) expect(["A01", "A02", "A03", "A04"].reduce((sum, seat) => sum + Number(seatOf(field(event, "net"), seat) ?? 0), 0)).toBe(0);
		for (const type of ["cards_dealt", "decision_scored", "game_scored"]) expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		expect(ofType(run.events, "decision_scored").every((event) => field(event, "missed") === false)).toBe(true);
		expect(ofType(run.events, "action_taken").some((event) => field(event, "reason") !== undefined)).toBe(false);
		// Duplicate: game 2 hand 1 deals the button's cards of game 1 hand 1 to the next seat, and the same board.
		const dealt = (game: number, hand: number, key: string): unknown => {
			const event = ofType(run.events, "cards_dealt").find((each) => field(each, "game") === game && field(each, "hand") === hand);
			return event === undefined ? undefined : field(event, key);
		};
		expect(seatOf(dealt(1, 1, "holes"), "A01")).toHaveLength(2);
		expect(seatOf(dealt(2, 1, "holes"), "A02")).toEqual(seatOf(dealt(1, 1, "holes"), "A01"));
		expect(seatOf(dealt(4, 1, "holes"), "A04")).toEqual(seatOf(dealt(1, 1, "holes"), "A01"));
		expect(dealt(3, 5, "runout")).toEqual(dealt(1, 5, "runout"));
		// A03 never puts a chip in voluntarily; A01 raises whenever it may.
		const stats = ofType(run.events, "game_scored").map((event) => field(event, "stats"));
		expect(stats).toHaveLength(4);
		for (const game of stats) expect(game).toMatchObject({ A03: { vpip: 0, pfr: 0 }, A01: { vpip: 1, pfr: 1 } });
		// The match totals are the sum of the games, and the win line is the totals.
		const games = ofType(run.events, "game_ended").map((event) => field(event, "scores"));
		const sum = (seat: string): number => games.reduce<number>((total, scores) => total + Number(seatOf(scores, seat) ?? 0), 0);
		const totals = { A01: sum("A01"), A02: sum("A02"), A03: sum("A03"), A04: sum("A04") };
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([totals]);
		expect(run.kernel.fact("holdem.scores")).toEqual(totals);
		// A first brain before game 1 and a new one after games 1 to 3, for each seat.
		expect(ofType(run.events, "brain_written")).toHaveLength(16);
	});

	it("checks or folds for a seat that does not act and still ends the match", async () => {
		const run = await play(rosterGame({ brain: false }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "holdem.match" });
		const decisions = ofType(run.events, "decision_scored");
		expect(decisions.length).toBeGreaterThan(0);
		expect(decisions.every((event) => field(event, "missed") === true && field(event, "done") === "fold")).toBe(true);
		// Everyone folds to the big blind, which wins the small blind: each seat is each blind twice a game, so all end on 0.
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 0, A02: 0, A03: 0, A04: 0 }]);
		expect(ofType(run.events, "brain_written")).toEqual([]);
	});

	it("opens act only for the seat to act and refuses illegal actions", async () => {
		const test = testKernel(rosterGame({ seats: 2, brain: false }));
		// Hand 1: the button A01 posts the small blind and acts first.
		expect(test.openTools("A01")).toContain("act");
		expect(test.openTools("A02")).not.toContain("act");
		expect(await test.call("A02", "act", { action: "call" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "act", { action: "check" })).toMatchObject({ ok: false, code: "ILLEGAL_ACTION" });
		expect(await test.call("A01", "act", { action: "raise", reason: "a bluff" })).toMatchObject({ ok: true });
		expect(test.openTools("A02")).toContain("act");
		expect(await test.call("A02", "act", { action: "fold" })).toMatchObject({ ok: true });
		const result = ofType(test.kernel.log.all(), "hand_ended")[0];
		expect(result === undefined ? undefined : field(result, "net")).toEqual({ A01: 2, A02: -2 });
		// Hand 2: the button moved to A02.
		expect(test.openTools("A02")).toContain("act");
		const view = await test.call("A01", "viewTable", {});
		expect(view.ok && view.reply).toContain("Hand 1 result: everyone else folded on the preflop, A01 (you) won the pot of 6; your points +2.");
	});

	it("keeps a brain only for the brain seats of a mixed table", async () => {
		const run = await play(rosterGame({ brainSeats: ["A01", "A03"], games: 2, hands: 2 }), { drivers: { resident: player } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "holdem.match" });
		const authors = new Set(ofType(run.events, "brain_written").map((event) => field(event, "author")));
		expect(authors).toEqual(new Set(["A01", "A03"]));
		expect(ofType(run.events, "brain_written")).toHaveLength(4);
	});

	it("keeps the brain tools closed to the seats without a brain (P138)", async () => {
		const test = testKernel(rosterGame({ brainSeats: ["A01", "A03"] }));
		expect(test.openTools("A01")).toContain("readBrain");
		expect(test.openTools("A02")).not.toContain("readBrain");
		expect(test.openTools("A04")).not.toContain("writeBrain");
		expect(await test.call("A02", "readBrain", {})).toMatchObject({ ok: false });
	});

	it("tells only the aid seats their range equity and pot odds at the decision (P430)", async () => {
		const seen = new Map<string, string[]>();
		const recorder: ActorDriver = async (turn) => {
			const lines = seen.get(nameOf(turn.actor)) ?? [];
			lines.push(...turn.inputs.map((note) => note.text));
			seen.set(nameOf(turn.actor), lines);
			await player(turn);
		};
		const run = await play(rosterGame({ brain: false, aidSeats: ["A01", "A03"], games: 1, hands: 4 }), { drivers: { resident: recorder } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "holdem.match" });
		const aided = (seat: string): number => (seen.get(seat) ?? []).filter((text) => text.includes("Referee's estimate: you win")).length;
		expect(aided("A01")).toBeGreaterThan(0);
		expect(aided("A03")).toBeGreaterThan(0);
		expect(aided("A02") + aided("A04")).toBe(0);
		expect((seen.get("A01") ?? []).some((text) => /a call needs \d+ % to pay|a call needs nothing/.test(text))).toBe(true);
	});
});
