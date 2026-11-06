/** The nine men's morris rules module: geometry, move numbers, mills and removals, flying and the end of a game. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	applyTurn,
	decodeStep,
	emptyBoard,
	hasLost,
	inMill,
	legalSteps,
	legalTurns,
	MILLS,
	morris,
	NEIGHBOURS,
	removable,
	renderBoard,
	startPosition,
	stepCode,
	type Cell,
	type Position,
} from "@swarmtales/mechanic-morris";
import { checkOptionsDocumented, checkSourceRules } from "@swarmtales/testkit";

/** A board from 1-based points per side. */
function boardOf(x: readonly number[], o: readonly number[]): Cell[] {
	const board = emptyBoard();
	for (const point of x) board[point - 1] = "X";
	for (const point of o) board[point - 1] = "O";
	return board;
}

const at = (x: readonly number[], o: readonly number[], side: "X" | "O", inHand = { X: 0, O: 0 }): Position => ({ board: boardOf(x, o), side, inHand });

describe("the morris board", () => {
	it("has 24 points, 16 mills with every point on two of them, and 32 symmetric lines", () => {
		expect(MILLS).toHaveLength(16);
		for (let point = 0; point < 24; point++) expect(MILLS.filter((mill) => mill.includes(point))).toHaveLength(2);
		expect(NEIGHBOURS.reduce((sum, list) => sum + list.length, 0)).toBe(64);
		NEIGHBOURS.forEach((list, point) => {
			for (const next of list) expect(NEIGHBOURS[next]).toContain(point);
		});
		// The corners have two neighbours, the joints in the middle of the sides three or four.
		expect(NEIGHBOURS[0]).toEqual([1, 9]);
		expect(NEIGHBOURS[4]).toEqual([1, 3, 5, 7]);
	});

	it("renders every point once, in number order", () => {
		const text = renderBoard(emptyBoard());
		expect(text.match(/\d+/g)?.map(Number)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
		expect(renderBoard(boardOf([1], [24]))).toMatch(/^ X-+ 2/);
	});

	it("numbers a placement by its point and a move by from * 100 + to", () => {
		expect(stepCode({ to: 4 })).toBe(5);
		expect(stepCode({ from: 9, to: 10 })).toBe(1011);
		expect(decodeStep(1011)).toEqual({ from: 9, to: 10 });
		expect(decodeStep(24)).toEqual({ to: 23 });
		for (const bad of [0, 25, 99, 1010, 2501, 125, 1.5]) expect(decodeStep(bad)).toBeUndefined();
	});
});

describe("mills and removals", () => {
	it("removes a piece outside a mill, and any piece when all are in mills", () => {
		const board = boardOf([], [1, 2, 3, 10]);
		expect(inMill(board, 0)).toBe(true);
		expect(removable(board, "O")).toEqual([9]);
		expect(removable(boardOf([], [1, 2, 3]), "O")).toEqual([0, 1, 2]);
	});

	it("lists one turn per removable piece for a step that closes a mill", () => {
		// X has 1 and 2 in hand placing; O has 10 and 24.
		const position = at([1, 2], [10, 24], "X", { X: 7, O: 7 });
		const closing = legalTurns(position, true).filter((turn) => turn.to === 2);
		expect(closing.map((turn) => turn.remove)).toEqual([9, 23]);
		const after = applyTurn(position, { to: 2, remove: 9 });
		expect(after.side).toBe("O");
		expect(after.board[9]).toBe(".");
		expect(after.inHand).toEqual({ X: 6, O: 7 });
	});
});

describe("moving, flying and the end", () => {
	it("moves to free neighbours only, and flies with three pieces", () => {
		const position = at([1, 5, 9, 13], [2, 10, 22, 24], "X");
		expect(legalSteps(position, true).map(stepCode).sort((a, b) => a - b)).toEqual([504, 506, 508, 908, 1314, 1318]);
		const three = at([1, 5, 9], [2, 10, 22, 24], "X");
		expect(legalSteps(three, true)).toHaveLength(3 * 17);
		expect(legalSteps(three, false).length).toBeLessThan(10);
	});

	it("loses with fewer than three pieces or blocked, never while placing", () => {
		expect(hasLost(at([1, 2], [5, 6, 7], "X"), "X", true)).toBe(true);
		// X on 1 is boxed in by O on 2 and 10, X on 3 by 2 and 15, X on 22 by 10 and 23.
		const boxed = at([1, 3, 22], [2, 10, 15, 23], "X");
		expect(hasLost(boxed, "X", false)).toBe(true);
		expect(hasLost(boxed, "X", true)).toBe(false);
		expect(hasLost(startPosition("X"), "X", true)).toBe(false);
	});

	it("documents its options and keeps the source rules", () => {
		expect(checkOptionsDocumented(morris)).toEqual([]);
		const files = ["index", "rules", "events", "search"].map((name) => ({ path: `mechanics/morris/src/${name}.ts`, text: readFileSync(`mechanics/morris/src/${name}.ts`, "utf8") }));
		expect(checkSourceRules(files)).toEqual([]);
	});
});
