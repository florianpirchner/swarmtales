// SPDX-License-Identifier: Apache-2.0
/** Pure text checks of the strategy brain: words, a hash and the replay detector. */

/**
 * Counts the whitespace-separated words.
 *
 * @param text - The text.
 * @returns The number of words.
 *
 * @public
 */
export function wordCount(text: string): number {
	const trimmed = text.trim();
	return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/**
 * A 53-bit string hash (cyrb53), hex; enough to tell versions apart in the log, not a security hash.
 *
 * @param text - The text.
 * @returns The hash, 14 hex digits.
 *
 * @public
 */
export function hashText(text: string): string {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);
		h1 = Math.imul(h1 ^ code, 2654435761);
		h2 = Math.imul(h2 ^ code, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

function matchesAt(tokens: readonly number[], position: number, moves: readonly number[], index: number): boolean {
	if (index === moves.length) return true;
	if (tokens[position] === moves[index] && matchesAt(tokens, position + 1, moves, index + 1)) return true;
	// "move 3: 4": the ordinal of the move may stand before its cell.
	return tokens[position] === index + 1 && tokens[position + 1] === moves[index] && matchesAt(tokens, position + 2, moves, index + 1);
}

/**
 * Whether `text` spells out the full move list of one game: its numbers, read in order, contain the
 * moves as one run (move ordinals in between are skipped). Rules keyed to positions, and words, pass;
 * a replay in words ("corner, then the opposite corner") also passes: this is a floor, not a proof.
 *
 * @param text - The text.
 * @param moves - The moves of one game.
 * @param minMoves - A game with fewer moves is too short to count.
 * @returns True when the text replays the game.
 *
 * @public
 */
export function replaysMoves(text: string, moves: readonly number[], minMoves: number): boolean {
	if (moves.length < minMoves) return false;
	const tokens = (text.match(/\d+/g) ?? []).map(Number);
	for (let start = 0; start < tokens.length; start++) {
		if (matchesAt(tokens, start, moves, 0)) return true;
	}
	return false;
}

// A move as written in a text: check and mate signs, `!` and `?` and a trailing comma or dot dropped, upper and lower case kept.
function moveToken(word: string): string {
	return word.replace(/^\d+\.(\.\.)?/, "").replace(/[+#!?,;.)]+$/, "").replace(/^\(/, "");
}

// Whether the tokens from `position` on spell the `minRun` moves of `line` from `start` on.
function runsAt(tokens: readonly string[], position: number, line: readonly (readonly string[])[], start: number, minRun: number): boolean {
	if (!(line[start] ?? []).includes(tokens[position] ?? "")) return false;
	let length = 1;
	while (length < minRun && (line[start + length] ?? []).includes(tokens[position + length] ?? "")) length += 1;
	return length === minRun;
}

/**
 * Whether `text` spells out `minRun` half-moves of one game in a row, for games whose moves are text
 * (chess). `line` holds every move's accepted spellings (SAN and from-to, say); move numbers such as
 * `12.` or `12...` between the moves are skipped. An opening named in words passes; this is a floor.
 *
 * @param text - The text.
 * @param line - The moves of one game, each with its accepted spellings.
 * @param minRun - The number of half-moves in a row that count as a replay.
 * @returns True when the text replays a run of the game.
 *
 * @public
 */
export function replaysLine(text: string, line: readonly (readonly string[])[], minRun: number): boolean {
	if (line.length < minRun) return false;
	const tokens = text
		.split(/\s+/)
		.map(moveToken)
		.filter((token) => token !== "" && !/^\d+\.*$/.test(token));
	for (let start = 0; start + minRun <= line.length; start++) {
		for (let position = 0; position + minRun <= tokens.length; position++) {
			if (runsAt(tokens, position, line, start, minRun)) return true;
		}
	}
	return false;
}
