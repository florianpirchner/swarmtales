// SPDX-License-Identifier: Apache-2.0
/**
 * A team of three against one resident alone (`soloSide`): the head-to-head test of what a team adds, played offline
 * by script. Carried from `test/stories/tictactoe-teams-mixed.test.ts`.
 */
import { play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { tictactoeGame, type TicTacToeOptions } from "../game.ts";
import { briefing, field, goldenGame, ofType, ticTacToePlayer } from "./support.ts";


describe("tictactoe-teams, a team against one resident alone", () => {
	it("plays a scripted match: the lone side agrees with itself and moves", async () => {
		const run = await play(goldenGame({ brain: false, soloSide: "O" }), { drivers: { resident: ticTacToePlayer() } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "grid-game.match" });
		expect(ofType(run.events, "game_ended")).toHaveLength(3);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);
		const players = new Set(ofType(run.events, "move_played").map((event) => field(event, "by")));
		expect(players.has("A04")).toBe(true);
		expect(players.has("A05") || players.has("A06")).toBe(false);
	});

	it("gives a lone O and a lone X the right rosters and briefings", () => {
		const loneO: TicTacToeOptions = { size: 5, line: 4, brain: false, maxRounds: 6, soloSide: "O" };
		const loneX: TicTacToeOptions = { size: 5, line: 4, soloSide: "X" };
		expect(tictactoeGame(loneO).residents).toEqual(["A01", "A02", "A03", "A04"]);
		expect(tictactoeGame(loneX).residents).toEqual(["A01", "A04", "A05", "A06"]);
		expect(briefing(loneO, "A04")).toContain("playing tic-tac-toe alone for side O on a 5x5 board against a team of three");
		expect(briefing(loneO, "A01")).toContain("against a single player");
		expect(briefing(loneO, "A01")).toContain("the other player's moves are not visible");
		expect(briefing(loneX, "A01")).toContain("strategy brain: a short text (readBrain). After each game you rewrite it");
		expect(briefing(loneX, "A05")).toContain("your team discusses in the chat");
	});
});
