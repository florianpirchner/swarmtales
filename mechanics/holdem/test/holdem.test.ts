// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The holdem mechanic alone: a scripted match with duplicate deals, the move timer, the locks, the decision aid at a
 * mixed table, a fake run and its conformance (offline). The cases are the mechanic's part of the old
 * `test/stories/holdem.test.ts`; the game's part (the brain, the brain seats of a mixed table, the variant names) is
 * the test of the game `holdem`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { checkDeterminism, checkOptionsDocumented, checkPackage, checkSnapshotRoundTrip, fakeDriver, idleDriver, play, testKernel } from "@swarmtales/testkit";
import { holdem } from "../src/index.ts";
import { field, holdemGame, ofType, player } from "./support.ts";

const players = { drivers: { resident: player } };
const HUMAN = JSON.stringify(["human"]);
const Points = Type.Record(Type.String(), Type.Number(), { description: "Points per seat." });
const Holes = Type.Record(Type.String(), Type.Array(Type.String()), { description: "The hole cards of each seat." });
const points = (event: Envelope, key: string): Record<string, number> => Value.Parse(Points, field(event, key));

describe("a match", () => {
	it("plays four games of eight duplicate hands with private cards and scored decisions", async () => {
		const run = await play(holdemGame(), players);
		expect(run.end).toMatchObject({ reason: "limit", limit: "holdem.match" });
		const ended = ofType(run.events, "hand_ended");
		expect(ended).toHaveLength(32);
		for (const event of ended) expect(Object.values(points(event, "net")).reduce((sum, value) => sum + value, 0)).toBe(0);
		for (const type of ["cards_dealt", "decision_scored", "game_scored"]) expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === HUMAN)).toBe(true);
		expect(ofType(run.events, "action_taken").every((event) => JSON.stringify(event.audience) !== HUMAN)).toBe(true);
		// No decision missed; a reason never reaches a public event.
		expect(ofType(run.events, "decision_scored").every((event) => field(event, "missed") === false)).toBe(true);
		expect(ofType(run.events, "action_taken").some((event) => field(event, "reason") !== undefined)).toBe(false);

		// Duplicate: game 2 hand 1 deals the button's cards of game 1 hand 1 to the next seat, and the same board.
		const dealt = ofType(run.events, "cards_dealt");
		const at = (game: number, hand: number): Envelope | undefined => dealt.find((event) => field(event, "game") === game && field(event, "hand") === hand);
		const holes = (game: number, hand: number, seat: string): readonly string[] | undefined => {
			const event = at(game, hand);
			return event === undefined ? undefined : Value.Parse(Holes, field(event, "holes"))[seat];
		};
		const runoutOf = (game: number, hand: number): unknown => {
			const event = at(game, hand);
			return event === undefined ? undefined : field(event, "runout");
		};
		expect(holes(2, 1, "A02")).toEqual(holes(1, 1, "A01"));
		expect(holes(4, 1, "A04")).toEqual(holes(1, 1, "A01"));
		expect(runoutOf(3, 5)).toEqual(runoutOf(1, 5));

		// A03 never puts a chip in voluntarily; A01 raises whenever it may.
		const stats = ofType(run.events, "game_scored").map((event) => field(event, "stats"));
		expect(stats).toHaveLength(4);
		for (const game of stats) expect(game).toMatchObject({ A03: { vpip: 0, pfr: 0 }, A01: { vpip: 1, pfr: 1 } });
		// The match totals are the sum of the games, and the fact holds them.
		const games = ofType(run.events, "game_ended").map((event) => points(event, "scores"));
		const sum = (seat: string): number => games.reduce((acc, scores) => acc + (scores[seat] ?? 0), 0);
		const totals = { A01: sum("A01"), A02: sum("A02"), A03: sum("A03"), A04: sum("A04") };
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([totals]);
		expect(run.kernel.fact("holdem.scores")).toEqual(totals);
	});

	it("checks or folds for a seat that does not act and still ends the match", async () => {
		const run = await play(holdemGame(), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "holdem.match" });
		const decisions = ofType(run.events, "decision_scored");
		expect(decisions.length).toBeGreaterThan(0);
		expect(decisions.every((event) => field(event, "missed") === true && field(event, "done") === "fold")).toBe(true);
		// Everyone folds to the big blind, which wins the small blind: each seat is each blind twice a game, so all end on 0.
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 0, A02: 0, A03: 0, A04: 0 }]);
	});

	it("opens act only for the seat to act and refuses illegal actions", async () => {
		const test = testKernel(holdemGame({}, 2));
		// Hand 1: the button A01 posts the small blind and acts first.
		expect(test.openTools("A01")).toContain("act");
		expect(test.openTools("A02")).not.toContain("act");
		expect(await test.call("A02", "act", { action: "call" })).toMatchObject({ ok: false, code: "TOOL_LOCKED" });
		expect(await test.call("A01", "act", { action: "check" })).toMatchObject({ ok: false, code: "ILLEGAL_ACTION" });
		expect(await test.call("A01", "act", { action: "raise", reason: "a bluff" })).toEqual({ ok: true, reply: "You raised (preflop). A02 is to act, not you: end your turn now; you will be told when it is yours.", endsTurn: true });
		expect(test.openTools("A02")).toContain("act");
		expect(await test.call("A02", "act", { action: "fold" })).toEqual({ ok: true, reply: "You folded. Hand 1 is over: end your turn now; you will be told the result when you next play.", endsTurn: true });
		const result = ofType(test.kernel.log.all(), "hand_ended")[0];
		expect(result === undefined ? undefined : field(result, "net")).toEqual({ A01: 2, A02: -2 });
		// Hand 2: the button moved to A02.
		expect(test.openTools("A02")).toContain("act");
		const view = await test.call("A01", "viewTable", {});
		expect(view.ok && view.reply).toContain("Hand 1 result: everyone else folded on the preflop, A01 (you) won the pot of 6; your points +2.");
		expect(view.ok && view.reply).not.toContain("a bluff");
	});

	it("tells only the aid seats their range equity and pot odds at the decision (P430)", async () => {
		const seen = new Map<string, string[]>();
		const recorder: ActorDriver = async (turn) => {
			const lines = seen.get(nameOf(turn.actor)) ?? [];
			lines.push(...turn.inputs.map((note) => note.text));
			seen.set(nameOf(turn.actor), lines);
			await player(turn);
		};
		const run = await play(holdemGame({ aid: true, aidSeats: ["A01", "A03"], games: 1, hands: 4 }), { drivers: { resident: recorder } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "holdem.match" });
		const aided = (seat: string): number => (seen.get(seat) ?? []).filter((text) => text.includes("Referee's estimate: you win")).length;
		expect(aided("A01")).toBeGreaterThan(0);
		expect(aided("A03")).toBeGreaterThan(0);
		expect(aided("A02") + aided("A04")).toBe(0);
		expect((seen.get("A01") ?? []).some((text) => /a call needs \d+ % to pay|a call needs nothing/.test(text))).toBe(true);
	});

	it("gives every seat the aid when aid is on and no seats are named, and none when it is off", async () => {
		const count = async (options: Parameters<typeof holdem>[0]): Promise<number> => {
			let aided = 0;
			const recorder: ActorDriver = async (turn) => {
				aided += turn.inputs.filter((note) => note.text.includes("Referee's estimate: you win")).length > 0 ? 1 : 0;
				await player(turn);
			};
			await play(holdemGame({ games: 1, hands: 2, ...options }), { drivers: { resident: recorder } });
			return aided;
		};
		expect(await count({ aid: true })).toBeGreaterThan(0);
		expect(await count({ aidSeats: ["A01"] })).toBe(0);
	});

	it("plays to the end of the match in a fake run, with every tool sampled and accepted", async () => {
		expect(holdem.head.tools.map((tool) => [tool.name, tool.sampled])).toEqual([["viewTable", true], ["act", true]]);
		const run = await play(holdemGame({ games: 1, hands: 3 }), { drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(run.end).toMatchObject({ reason: "limit", limit: "holdem.match" });
		const accepted = run.events.filter((event) => event.type === "tool_result").map((event) => field(event, "as"));
		for (const tool of ["viewTable", "act"]) expect(accepted).toContain(tool);
		expect(ofType(run.events, "decision_scored").some((event) => field(event, "missed") === false)).toBe(true);
	});
});

describe("module conformance", () => {
	it("agrees with its package.json; two carried options have no description", () => {
		const packageJson: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
		expect(checkPackage(holdem, packageJson)).toEqual([]);
		// The old schema gave `smallBlind` and `bigBlind` none; the options are pinned byte for byte (carried.test.ts).
		expect(checkOptionsDocumented(holdem)).toEqual(['holdem: option "smallBlind" has no description', 'holdem: option "bigBlind" has no description']);
	});

	it("is deterministic and survives a snapshot round trip inside a hand", async () => {
		const small = { games: 2, hands: 3 };
		expect(await checkDeterminism(holdemGame(small), () => player)).toEqual([]);
		for (const cut of [0, 2, 5]) expect(await checkSnapshotRoundTrip(holdemGame(small), () => player, cut)).toEqual([]);
	});
});
