// SPDX-License-Identifier: Apache-2.0
/** A FEN position as an 8x8 board (rank 8 first), for the `board-fen` view. Other fields of the FEN are read only as far as the board needs. */
export interface FenBoard {
	/** 64 squares, a8 first, then b8 ... h1; a piece is its FEN letter (uppercase white), an empty square undefined. */
	readonly squares: readonly (string | undefined)[];
	readonly turn: "w" | "b" | undefined;
}

const PIECES = "pnbrqkPNBRQK";

// The squares of one rank, or undefined when a character is no piece and no digit from 1 to 8.
function rankSquares(rank: string): readonly (string | undefined)[] | undefined {
	const squares: (string | undefined)[] = [];
	for (const char of rank) {
		if (char >= "1" && char <= "8") {
			for (let skip = Number(char); skip > 0; skip -= 1) squares.push(undefined);
		} else if (PIECES.includes(char)) squares.push(char);
		else return undefined;
	}
	return squares;
}

/**
 * Parses the piece placement (and the side to move) of a FEN.
 *
 * @param fen - The FEN text.
 * @returns The board, or `undefined` when the placement is not 8 ranks of 8 squares.
 */
export function parseFen(fen: string): FenBoard | undefined {
	const [placement, turn] = fen.trim().split(/\s+/);
	const ranks = placement?.split("/");
	if (ranks?.length !== 8) return undefined;
	const squares: (string | undefined)[] = [];
	for (const rank of ranks) {
		const row = rankSquares(rank);
		if (row?.length !== 8) return undefined;
		squares.push(...row);
	}
	return { squares, turn: turn === "w" || turn === "b" ? turn : undefined };
}

/**
 * The index in `squares` of a square name such as `e4`; undefined for anything else.
 *
 * @param name - The name of the square.
 * @returns The index, or `undefined`.
 */
export function squareIndex(name: string): number | undefined {
	const match = /^([a-h])([1-8])$/.exec(name);
	if (match?.[1] === undefined || match[2] === undefined) return undefined;
	return (8 - Number(match[2])) * 8 + (match[1].charCodeAt(0) - 97);
}

/**
 * The two squares of a coordinate move such as `e2e4` (a promotion suffix is ignored).
 *
 * @param move - The move in coordinates.
 * @returns The indexes of the two squares, or `undefined` when the move names none.
 */
export function moveSquares(move: string): readonly [number, number] | undefined {
	const from = squareIndex(move.slice(0, 2));
	const to = squareIndex(move.slice(2, 4));
	return from === undefined || to === undefined ? undefined : [from, to];
}

const GLYPHS: Readonly<Record<string, string>> = { k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F" };

/**
 * The Unicode symbol of a FEN letter: the solid glyph for both colours (the board fills them white or black), as text, not as an emoji.
 *
 * @param piece - The FEN letter of the piece.
 * @returns The symbol, or the letter itself when it is no piece.
 */
export function glyphOf(piece: string): string {
	const glyph = Object.entries(GLYPHS).find(([letter]) => letter === piece.toLowerCase())?.[1];
	return glyph === undefined ? piece : `${glyph}\uFE0E`;
}
