/** The morris-referee's search: known tactical positions and the classes of a turn. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptyBoard, type Cell, type Position } from "@swarmtales/mechanic-morris";
import { morrisReferee } from "@swarmtales/mechanic-morris-referee";
import { classify, scoreTurn } from "../../../mechanics/morris-referee/src/search.ts";
import { checkOptionsDocumented, checkSourceRules } from "@swarmtales/testkit";

function at(x: readonly number[], o: readonly number[], side: "X" | "O", inHand: { X: number; O: number }): Position {
	const board: Cell[] = emptyBoard();
	for (const point of x) board[point - 1] = "X";
	for (const point of o) board[point - 1] = "O";
	return { board, side, inHand };
}

describe("the morris reference search", () => {
	it("calls closing a mill best and passing it up a missed mill", () => {
		// X holds 1 and 2 with 3 free; O holds 22 and 24 with 23 free.
		const position = at([1, 2], [22, 24], "X", { X: 7, O: 7 });
		const close = scoreTurn(position, { to: 2, remove: 21 }, true, 2, 200_000);
		expect(close).toBeDefined();
		if (close !== undefined) expect(classify(close)).toBe("best");
		const elsewhere = scoreTurn(position, { to: 10 }, true, 2, 200_000);
		expect(elsewhere?.missedMill).toBe(true);
		if (elsewhere !== undefined) expect(["inaccuracy", "blunder"]).toContain(classify(elsewhere));
		// Not blocking O's open two and not closing its own mill loses a piece: a blunder.
		const blunder = scoreTurn(position, { to: 5 }, true, 2, 200_000);
		if (blunder !== undefined) expect(classify(blunder)).toBe("blunder");
	});

	it("finds the winning removal when the opponent is down to three pieces", () => {
		// Moving phase: X closes 1-2-3 by 5 to 2; O has three pieces, so any removal wins.
		const position = at([1, 3, 5, 9], [10, 22, 24], "X", { X: 0, O: 0 });
		const win = scoreTurn(position, { from: 4, to: 1, remove: 9 }, true, 2, 200_000);
		expect(win?.best).toBeGreaterThan(50_000);
		if (win !== undefined) expect(classify(win)).toBe("best");
		const miss = scoreTurn(position, { from: 8, to: 7 }, true, 2, 200_000);
		if (miss !== undefined) expect(classify(miss)).toBe("missed_win");
	});

	it("scores nothing for an illegal or a forced turn, and stops deepening when out of nodes", () => {
		expect(scoreTurn(at([1, 2], [22, 24], "X", { X: 7, O: 7 }), { to: 0 }, true, 2, 200_000)).toBeUndefined();
		const shallow = scoreTurn(at([], [], "X", { X: 9, O: 9 }), { to: 4 }, true, 6, 1_000);
		expect(shallow?.depth).toBe(2);
	});

	it("documents its options and keeps the source rules", () => {
		expect(checkOptionsDocumented(morrisReferee)).toEqual([]);
		const files = ["index", "search"].map((name) => ({ path: `mechanics/morris-referee/src/${name}.ts`, text: readFileSync(`mechanics/morris-referee/src/${name}.ts`, "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});
});
