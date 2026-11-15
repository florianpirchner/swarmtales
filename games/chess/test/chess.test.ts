// SPDX-License-Identifier: Apache-2.0
/**
 * The game's part of the old `test/stories/chess.test.ts`: a scripted match of the game file with a brain per seat,
 * the same match with a fresh context per move and the compact board, and the timer for seats that never move. The
 * rules, the refused moves, the baseline and the views are proven by the mechanic's own tests (`mechanics/chess/test/`).
 */
import { idleDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { chessGame } from "../game.ts";
import { field, ofType, player } from "./support.ts";

describe("chess, scripted match", () => {
	it.each([
		["the default", {}],
		["a fresh context per move and the compact board", { fresh: true, compact: true }],
	])("%s: plays two games with alternating colours, a brain per seat, and ends on mate", async (_name, options) => {
		const run = await play(chessGame(options), { drivers: { resident: player } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "chess.match" });
		const ended = ofType(run.events, "game_ended");
		expect(ended.map((event) => [field(event, "white"), field(event, "result"), field(event, "reason"), field(event, "plies")])).toEqual([
			["A01", "1-0", "checkmate", 7],
			["A02", "0-1", "checkmate", 4],
		]);
		// A first brain before game 1 and a new one after game 1, for each seat; the win line is the match score.
		expect(ofType(run.events, "brain_written")).toHaveLength(4);
		expect(run.kernel.fact("chess.scores")).toEqual({ A01: 2, A02: 0 });
	});

	it("plays a seeded legal move for a seat that does not move and still ends the match", async () => {
		const run = await play(chessGame({ games: 1 }), { drivers: { resident: idleDriver } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "chess.match" });
		expect(ofType(run.events, "move_played").every((event) => field(event, "forfeit") === true)).toBe(true);
		expect(ofType(run.events, "game_ended").map((event) => field(event, "reason"))).toEqual(["forfeits"]);
	});
});
