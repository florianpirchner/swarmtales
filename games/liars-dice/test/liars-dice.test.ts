// SPDX-License-Identifier: Apache-2.0
/**
 * The game's part of the old `test/stories/liars-dice.test.ts`: a scripted match of the game file with a brain per
 * seat, and the timer for seats that never act. The rules, the locks and the refusals are proven by the mechanic's
 * own tests (`mechanics/liars-dice/test/`).
 */
import { idleDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { field, ofType, player, rosterGame } from "./support.ts";

describe("liar's dice, scripted match", () => {
	it("plays three games with a brain per seat, written before game 1 and after each game", async () => {
		const run = await play(rosterGame(), { drivers: { resident: player } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "liars-dice.match" });
		expect(ofType(run.events, "dice_game_ended")).toHaveLength(3);
		expect(ofType(run.events, "brain_written")).toHaveLength(12);
		expect(ofType(run.events, "dice_decision_scored").every((event) => field(event, "missed") === false)).toBe(true);
		// The win line is the match totals of the last game.
		expect([run.kernel.fact("liars-dice.scores")]).toEqual(ofType(run.events, "dice_game_ended").slice(2).map((event) => field(event, "totals")));
	});

	it("opens with the lowest bid or calls liar for a seat that does not act, and still ends the match", async () => {
		const run = await play(rosterGame({ brain: false, games: 1 }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "liars-dice.match" });
		const decisions = ofType(run.events, "dice_decision_scored");
		expect(decisions.length).toBeGreaterThan(0);
		expect(decisions.every((event) => field(event, "missed") === true)).toBe(true);
		expect(ofType(run.events, "dice_bid").every((event) => field(event, "quantity") === 1 && field(event, "face") === 2)).toBe(true);
		expect(ofType(run.events, "brain_written")).toEqual([]);
	});
});
