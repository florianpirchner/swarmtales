// SPDX-License-Identifier: Apache-2.0
/**
 * The game's part of the old `test/stories/blind-bid.test.ts`: a scripted match of the game file with a brain per
 * seat, the control arm, and the timer for seats that never bid. The lots, the prices, the sealed bids and the
 * refusals are proven by the mechanic's own tests (`mechanics/sealed-auction/test/`).
 */
import { idleDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { field, ofType, player, rosterGame } from "./support.ts";

const HUMAN = JSON.stringify(["human"]);

describe("blind-bid, scripted match", () => {
	it("plays three games of six sealed lots with purses, a public result per lot and a brain per seat", async () => {
		const run = await play(rosterGame(), { drivers: { resident: player } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "sealed-auction.match" });
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		const resolved = ofType(run.events, "lot_resolved");
		expect(resolved).toHaveLength(18);
		for (const type of ["lots_dealt", "bid_placed", "game_scored"]) expect(ofType(run.events, type).every((event) => JSON.stringify(event.audience) === HUMAN)).toBe(true);
		// A04 always passes and never wins.
		expect(resolved.some((event) => field(event, "winner") === "A04")).toBe(false);
		// A first brain before game 1 and a new one after each game, for each seat.
		expect(ofType(run.events, "brain_written")).toHaveLength(12);
		expect(ofType(run.events, "match_ended")).toHaveLength(1);
		const totals = ofType(run.events, "game_ended").at(-1);
		expect(run.kernel.fact("sealed-auction.scores")).toEqual(totals === undefined ? undefined : field(totals, "totals"));
	});

	it("without a brain writes no brain and opens no retro", async () => {
		const run = await play(rosterGame({ brain: false, games: 1 }), { drivers: { resident: player } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "sealed-auction.match" });
		expect(ofType(run.events, "lot_resolved")).toHaveLength(6);
		expect([...ofType(run.events, "brain_written"), ...ofType(run.events, "retro_started")]).toEqual([]);
	});

	it("counts missed bids as passes and still ends the match", async () => {
		const run = await play(rosterGame({ brain: false }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "sealed-auction.match" });
		const references = ofType(run.events, "game_scored").map((event) => field(event, "reference"));
		expect(references.map((reference): unknown => (typeof reference === "object" && reference !== null ? Reflect.get(reference, "missed") : undefined))).toEqual([24, 24, 24]);
		expect(ofType(run.events, "match_ended").map((event) => field(event, "scores"))).toEqual([{ A01: 0, A02: 0, A03: 0, A04: 0 }]);
	});
});
