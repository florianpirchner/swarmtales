// SPDX-License-Identifier: Apache-2.0
/** The scripted match of tic-tac-toe teams replays equal from its log alone, refusals and retro windows included. */
import { play, replay } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { goldenGame, ofType, ticTacToePlayer } from "./support.ts";

describe("tictactoe-teams, replayed", () => {
	it("the replay of the scripted match equals its log", async () => {
		const game = goldenGame({ brain: true });
		const { events } = await play(game, { drivers: { resident: ticTacToePlayer() } });
		expect(ofType(events, "tool_refused").length).toBeGreaterThan(0);
		const again = await replay({ game, log: events });
		expect(again.firstDifference).toBeUndefined();
		expect([again.equal, again.log.length]).toEqual([true, events.length]);
	});
});
