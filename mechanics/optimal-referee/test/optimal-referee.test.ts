// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The optimal-referee mechanic: minimax classes on known positions, the events it writes and who may read them.
 * Carried from `test/mechanics/optimal-referee/optimal-referee.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { emptyBoard, type Cell } from "@swarmtales/mechanic-grid-game/rules";
import { play, testKernel } from "@swarmtales/testkit";
import { scoreMove } from "../src/minimax.ts";
import { field, matchGame, scriptedPlayer } from "./support.ts";

/** A 3x3 board from text: X, O, anything else is free. */
const board = (text: string): Cell[] => Array.from(text, (c): Cell => (c === "X" || c === "O" ? c : "."));

describe("the minimax classes", () => {
	it("scores nothing where no error is possible", () => {
		// Every first move draws with best play.
		expect(scoreMove(emptyBoard(3), 3, 3, "X", 4, 9)).toBeUndefined();
		// One free cell left: no choice.
		expect(scoreMove(board("XOXOXOOX."), 3, 3, "X", 8, 9)).toBeUndefined();
		// Too many free cells for the configured depth.
		expect(scoreMove(board("X........"), 3, 3, "O", 4, 7)).toBeUndefined();
	});

	it("calls the only saving reply optimal and any other one a blunder", () => {
		// X took a corner: only the centre holds the draw.
		expect(scoreMove(board("X........"), 3, 3, "O", 4, 9)).toEqual({ valueBefore: 0, valueAfter: 0, class: "optimal" });
		expect(scoreMove(board("X........"), 3, 3, "O", 1, 9)).toEqual({ valueBefore: 0, valueAfter: -1, class: "blunder" });
	});

	it("finds a missed win", () => {
		// X X . / O O . / . . . with X to move: cell 2 wins at once.
		const position = board("XX.OO....");
		expect(scoreMove(position, 3, 3, "X", 2, 9)).toEqual({ valueBefore: 1, valueAfter: 1, class: "optimal" });
		expect(scoreMove(position, 3, 3, "X", 8, 9)).toEqual({ valueBefore: 1, valueAfter: -1, class: "missed_win" });
	});

	it("finds a missed block", () => {
		// X X . / . O . / . . . with O to move: X threatens cell 2.
		const position = board("XX..O....");
		expect(scoreMove(position, 3, 3, "O", 2, 9)).toEqual({ valueBefore: 0, valueAfter: 0, class: "optimal" });
		expect(scoreMove(position, 3, 3, "O", 8, 9)).toEqual({ valueBefore: 0, valueAfter: -1, class: "missed_block" });
	});

	it("scores nothing in a lost position where every move loses", () => {
		// X X . / O . . / . . . with O to move: blocking cell 2 still loses to the fork, so no choice matters.
		const position = board("XX.O.....");
		expect(scoreMove(position, 3, 3, "O", 2, 9)).toBeUndefined();
		expect(scoreMove(position, 3, 3, "O", 8, 9)).toBeUndefined();
	});
});

describe("the mechanic in a match", () => {
	const only = { 1: [0, 1, 2, 4, 6, 3, 5, 7, 8] } as const;
	const players = { drivers: { resident: scriptedPlayer(only) } };
	const SOURCE = "@swarmtales/mechanic-optimal-referee/optimal-referee";

	it("writes move_scored for the moves where an error was possible, with an audience of the human only", async () => {
		// X0 (all first moves draw: unscored), O1 (blunder), X4 (optimal), O2 (blunder: X wins with 8 or 3...), X6.
		const run = await play(matchGame(), players);
		const scored = run.events.filter((event) => event.type === "move_scored");
		expect(scored.length).toBeGreaterThan(0);
		expect(scored.every((event) => event.source === SOURCE)).toBe(true);
		expect(scored.every((event) => JSON.stringify(event.audience) === JSON.stringify(["human"]))).toBe(true);
		const first = scored[0]?.payload;
		expect(first).toEqual({ game: 1, moveNo: 2, side: "O", value_before: 0, value_after: -1, class: "blunder" });
		// No move 1 score (nothing to get wrong), and every payload is complete.
		expect(scored.map((event) => field(event, "moveNo"))).not.toContain(1);
	});

	it("has no tools and writes nothing but move_scored", async () => {
		const run = await play(matchGame(), players);
		expect(new Set(run.events.filter((event) => event.source === SOURCE).map((event) => event.type))).toEqual(new Set(["move_scored"]));
		const test = testKernel(matchGame());
		expect(test.kernel.toolSpecs("resident").map((spec) => spec.name).sort()).toEqual(["playMove", "viewBoard"]);
		expect(test.kernel.toolSpecs("gamemaker")).toEqual([]);
	});

	// M1-30 builds `checkOptionsDocumented`, `checkDeterminism`, `checkSnapshotRoundTrip` and `checkPackage` in
	// parallel; the integrator swaps the hand-written checks below for them and adds the other two.
	it("is deterministic and survives a snapshot round trip mid-game", async () => {
		const straight = await play(matchGame(), players);
		expect((await play(matchGame(), players)).events).toEqual(straight.events);
		const first = await play(matchGame(), { ...players, ticks: 2 });
		expect(first.events.some((event) => event.type === "move_scored")).toBe(true);
		const resumed = await play(matchGame(), { ...players, resume: { snapshot: structuredClone(first.kernel.snapshot()), log: first.events } });
		expect(resumed.events).toEqual(straight.events);
	});
});

describe("the minimax on 4x4 with four in a row", () => {
	it("calls every opening move optimal because the empty board is a draw", () => {
		expect(scoreMove(emptyBoard(4), 4, 4, "X", 5, 16)).toBeUndefined();
		expect(scoreMove(emptyBoard(4), 4, 4, "X", 0, 16)).toBeUndefined();
	});

	it("finds a missed win and a missed block", () => {
		// X X X . / O O . . / . . . . with X to move: cell 3 wins at once.
		const win = board("XXX.OO..........");
		expect(scoreMove(win, 4, 4, "X", 3, 16)).toMatchObject({ valueBefore: 1, valueAfter: 1, class: "optimal" });
		expect(scoreMove(win, 4, 4, "X", 15, 16)).toMatchObject({ valueBefore: 1, valueAfter: 0, class: "missed_win" });
		// O to move against the open three X X X . : only cell 3 holds.
		const threat = board("XXX.O.O.........");
		expect(scoreMove(threat, 4, 4, "O", 3, 16)?.class).toBe("optimal");
		expect(scoreMove(threat, 4, 4, "O", 15, 16)).toMatchObject({ valueAfter: -1, class: "missed_block" });
	});

	it("scores a whole game from the empty board fast", () => {
		const moves = [5, 6, 9, 10, 0, 15, 3, 12, 1, 2, 4, 8, 7, 11, 13, 14];
		const play = emptyBoard(4);
		const started = performance.now();
		let side: "X" | "O" = "X";
		for (const cell of moves) {
			scoreMove(play, 4, 4, side, cell, 16);
			play[cell] = side;
			side = side === "X" ? "O" : "X";
		}
		expect(performance.now() - started).toBeLessThan(10_000);
	});
});
