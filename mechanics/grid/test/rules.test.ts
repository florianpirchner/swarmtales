// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The board rules of the grid game (carried from `test/mechanics/grid-game/grid.test.ts`, "the board rules"),
 * and the proof that the carried contract, events and state schemas are what the old platform had.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GridGameEvents, GridGameService } from "../src/contract.ts";
import { GameResultSchema, GridSlice, renderBoard } from "../src/model.ts";
import { emptyBoard, freeCells, linesOf, other, winnerOf, type Cell } from "../src/rules.ts";

/** The id this platform renamed (M6-06), from the id the old platform wrote to the id here. */
const RENAMED = { "grid-game": "grid" } as const;
/** A carried text as the old platform wrote it: the new id back to the old one where it names the mechanic (`"<id>"`, `"<id>/...`, `"<id>.`). */
const asOld = (text: string): string => Object.entries(RENAMED).reduce((done, [old, now]) => done.replace(new RegExp(`(?<=^id: |")${now}(?=["./])`, "gm"), old), text);
const sha256 = (value: unknown): string => createHash("sha256").update(asOld(JSON.stringify(value))).digest("hex");

describe("the board rules", () => {
	it("finds rows, columns and both diagonals", () => {
		const board = (text: string): Cell[] => Array.from(text, (c): Cell => (c === "X" || c === "O" ? c : "."));
		const lines = linesOf(3, 3);
		expect(lines).toHaveLength(8);
		expect(winnerOf(board("XXX......"), lines)).toEqual({ side: "X", cells: [0, 1, 2] });
		expect(winnerOf(board("O..O..O.."), lines)).toEqual({ side: "O", cells: [0, 3, 6] });
		expect(winnerOf(board("..X.X.X.."), lines)?.cells).toEqual([2, 4, 6]);
		expect(winnerOf(board("XOXOXOOXO"), lines)).toBeUndefined();
	});

	it("shows every cell as its mark plus its number, so a taken cell keeps its number", () => {
		const board: Cell[] = [".", ".", "X", ".", "O", ".", ".", ".", "."];
		expect(renderBoard(board, 3)).toBe(" 0  1 X2\n 3 O4  5\n 6  7  8");
		expect(renderBoard(Array.from({ length: 16 }, (_, index) => (index === 10 ? "X" : ".")), 4)).toBe("  0   1   2   3\n  4   5   6   7\n  8   9 X10  11\n 12  13  14  15");
	});

	it("supports other board sizes and line lengths", () => {
		const lines = linesOf(4, 3);
		expect(lines).toHaveLength(2 * 4 * 2 + 2 * 2 * 2);
		const board = (Array.from({ length: 16 }, (): Cell => ".")).map((cell, index): Cell => (index === 1 || index === 6 || index === 11 ? "O" : cell));
		expect(winnerOf(board, lines)).toEqual({ side: "O", cells: [1, 6, 11] });
	});

	it("starts with a free board and lists the free cells in ascending order", () => {
		const board = emptyBoard(3);
		expect(board).toHaveLength(9);
		board[4] = other("O");
		board[0] = other("X");
		expect(freeCells(board)).toEqual([1, 2, 3, 5, 6, 7, 8]);
	});
});

describe("the carried contract", () => {
	// The sha256 of JSON.stringify of each definition, generated on the old platform (commit 9765702).
	it("is byte-identical to the old platform: service, events, state schemas", () => {
		expect(sha256(GridGameService)).toBe("d7b7200db5a5dc8e41a671ca109728acf9e4286b035eae093e2bd16c233be0e9");
		expect(sha256(GridGameEvents)).toBe("ca9ea3d7f58123b1d03f434ae84be9e51f92a20668a13e6487d2aa894be8c2a9");
		expect(sha256(GridSlice)).toBe("bd70ccc2aadd0e977355fc8fadbffa8b5ea61e535316a3c9c61d84073005ce50");
		expect(sha256(GameResultSchema)).toBe("d2806f84ece377e3c04513a20452200748b1f466e80375cef9ef9c9c8268ee09");
	});
});
