// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The 4x4 variant (four in a row) through the real mechanics: one scripted match offline, with the briefing and the
 * referee at size 4. Carried from `test/stories/tictactoe-teams-4x4.test.ts`; the old name grammar is not carried, so
 * the combinations are named by their options.
 */
import { checkDeterminism, checkSnapshotRoundTrip, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { tictactoeGame, type TicTacToeOptions } from "../game.ts";
import { briefing, CELLS_4X4, field, goldenGame, ofType, ticTacToePlayer } from "./support.ts";

const game = () => goldenGame({ size: 4, line: 4 });
const player = () => ticTacToePlayer(CELLS_4X4, 4);

describe("tictactoe, 4x4 with four in a row", () => {
	it("plays a scripted match to the end: two wins and a full board", async () => {
		const run = await play(game(), { drivers: { resident: player() } });
		expect(run.end).toMatchObject({ reason: "limit", limit: "grid.match" });
		expect(ofType(run.events, "game_ended").map((event) => field(event, "result"))).toEqual(["X", "O", "draw"]);
		expect(ofType(run.events, "move_played")).toHaveLength(7 + 7 + 16);
		expect(ofType(run.events, "consensus_forfeited")).toHaveLength(0);
		expect(ofType(run.events, "brain_written").length).toBeGreaterThanOrEqual(6);
		// The referee scores on the 4x4 board: only legal values, and a missed win never appears in this script.
		const scored = ofType(run.events, "move_scored");
		for (const event of scored) expect(["optimal", "blunder", "missed_win", "missed_block"]).toContain(field(event, "class"));
	});

	it("is deterministic and survives a snapshot round trip", async () => {
		expect(await checkDeterminism(game(), player)).toEqual([]);
		// The old cut after 12 ticks came at the end of the run and resumed nothing; 11 is the last tick that is resumed.
		for (const cut of [1, 6, 11]) expect(await checkSnapshotRoundTrip(game(), player, cut)).toEqual([]);
	});

	it("derives the briefing and the length from the board", () => {
		const text = briefing({ size: 4, line: 4 }, "A01");
		expect(text).toContain("on a 4x4 board");
		expect(text).toContain("Cells are numbered 0-15, row by row. 4 marks in a row, column or diagonal win;");
		expect(briefing({}, "A01")).toContain("on a 3x3 board against the other team (6 residents in all). Cells are numbered 0-8, row by row. Marks in a row, column or diagonal win;");
		expect(briefing({ size: 4, line: 4, brain: false }, "A01")).not.toContain("strategy brain");
		expect(tictactoeGame({ games: 1 }).end.ticks).toBe(24);
		expect(tictactoeGame({ games: 1, size: 4, line: 4 }).end.ticks).toBe(36);
	});
});

describe("tictactoe, combinations of options", () => {
	it("gives solo and fixed-captain games their rosters and briefings", () => {
		const solo: TicTacToeOptions = { size: 5, line: 4, brain: false, maxRounds: 6, teamSize: 1 };
		const fixed: TicTacToeOptions = { maxRounds: 6, fixedCaptain: true };
		expect(tictactoeGame(solo).residents).toEqual(["A01", "A04"]);
		expect(briefing(solo, "A01")).toContain("playing tic-tac-toe alone for side X on a 5x5 board");
		expect(tictactoeGame(fixed).residents).toHaveLength(6);
		expect(briefing(fixed, "A01")).toContain("A01 is the captain of your team for the whole match");
		expect(briefing(fixed, "A01")).toContain("You are the captain: you propose and you play, you never vote.");
		expect(briefing(fixed, "A02")).not.toContain("You are the captain");
	});

	it("keeps one id for every variant and refuses what is not built", () => {
		expect(tictactoeGame({ size: 5, line: 4, maxRounds: 6, maxRules: 8 }).id).toBe("tictactoe");
		expect(() => tictactoeGame({ gamemaker: true })).toThrow("the gamemaker variant is not built yet");
		expect(() => tictactoeGame({ brainTeams: ["Z"] })).toThrow("brainTeams must name teams of X, O");
	});
});
