// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The chess reference engine of `swt analyse chess` (`src/chess-engine.ts`, carried from the old `test/stories/chess-engine.test.ts`): the vendored Garbochess-JS file is the one that
 * was pinned, and the same position at the same depth gives the same score, best move and node count everywhere.
 * A node count that matches proves the same search tree, not only the same answer.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";
import { SwtError } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { centipawns, type Score } from "@swarmtales/lab";
import { analyseSync, DEFAULT_DEPTH, ENGINE, engineFile } from "../src/index.ts";

const DEPTH = 6;

/** The code of the `SwtError` that `run` throws; "" when it throws none. */
function codeOf(run: () => unknown): string {
	try {
		run();
	} catch (error) {
		return error instanceof SwtError ? error.code : "";
	}
	return "";
}

/** Name, FEN, expected score (from the side to move), best move, nodes searched; all at depth 6. */
const GOLDEN: readonly (readonly [string, string, Score, string, number])[] = [
	["start position", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", { cp: 6 }, "d2d4", 38831],
	["open game, black to move", "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", { cp: -21 }, "b8c6", 37413],
	["Italian opening", "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", { cp: 8 }, "d2d3", 68302],
	["Sicilian, open", "rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5", { cp: -52 }, "e7e5", 73022],
	["hanging queen to take", "rnbqkbnr/ppp1pppp/3p4/8/4P1Q1/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2", { cp: 1191 }, "c8g4", 14779],
	["queen's gambit middlegame", "r1bq1rk1/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 8", { cp: -1 }, "h2h3", 169269],
	["middlegame, castled to opposite sides", "2kr3r/ppp1qppp/2n1bn2/3pp3/4P3/2NP1N2/PPPBQPPP/R4RK1 w - - 6 10", { cp: 25 }, "e4d5", 555421],
	["castling available both ways", "r3k2r/pppqbppp/2npbn2/4p3/4P3/2NPBN2/PPPQBPPP/R3K2R w KQkq - 6 9", { cp: 21 }, "d3d4", 72369],
	["castling available for black", "r3k2r/pppqbppp/2npbn2/4p3/4P3/2NPBN2/PPPQBPPP/R4RK1 b kq - 7 9", { cp: -8 }, "f6g4", 93322],
	["en passant available", "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3", { cp: 39 }, "d2d4", 33798],
	["en passant square set, king takes instead", "8/8/8/2k5/3Pp3/8/8/4K3 b - d3 0 1", { cp: 122 }, "c5d4", 2063],
	["promotion to a queen", "8/P6k/8/8/8/8/8/K7 w - - 0 1", { cp: 1280 }, "a7a8q", 7135],
	["promotion with a capture", "1r5k/P7/8/8/8/8/8/K7 w - - 0 1", { cp: 1284 }, "a7b8q", 25142],
	["black promotes", "7K/8/8/8/8/8/p7/7k b - - 0 1", { cp: 1287 }, "a2a1q", 11563],
	["promotion beside an enemy queen", "8/5P1k/8/8/8/8/3q4/K7 w - - 0 1", { cp: -5 }, "f7f8q", 25364],
	["knight underpromotion forks king and queen", "8/3q1P1k/8/8/8/8/8/K7 w - - 0 1", { cp: 491 }, "f7f8n", 42229],
	["rook endgame", "8/5pk1/6p1/8/R7/6P1/r4PK1/8 w - - 0 40", { cp: 673 }, "a4a2", 3356],
	["king and pawn endgame", "8/8/4k3/8/4P3/4K3/8/8 w - - 0 1", { cp: 122 }, "e3f4", 1429],
	["queen against king", "7k/8/8/8/8/8/8/KQ6 w - - 0 1", { cp: 1287 }, "b1b2", 31392],
	["in check with one escape", "4k3/8/8/8/8/8/4PP2/q3K3 w - - 0 1", { cp: -1090 }, "e1d2", 34215],
	["white mates in one", "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", { mate: 1 }, "a1a8", 132],
	["black mates in one", "r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1", { mate: 1 }, "a8a1", 132],
	["white mates in two", "7k/8/5K2/8/8/8/8/6R1 w - - 0 1", { mate: 2 }, "f6f7", 803],
	["black mates in two", "6r1/8/8/8/8/5k2/8/7K b - - 0 1", { mate: 2 }, "f3f2", 826],
	["white mates in three", "7k/8/8/5K2/8/8/8/6R1 w - - 0 1", { mate: 3 }, "f5g6", 4595],
	["black mates in three", "6r1/8/8/8/5k2/8/8/7K b - - 0 1", { mate: 3 }, "f4g3", 5159],
	["white is mated in one", "8/8/8/8/8/1k6/7r/K7 w - - 0 1", { mate: -1 }, "a1b1", 132],
	["black is mated in one", "k7/7R/1K6/8/8/8/8/8 b - - 0 1", { mate: -1 }, "a8b8", 132],
	["white is mated in three", "8/8/8/8/8/2k5/7r/K7 w - - 0 1", { mate: -3 }, "a1b1", 2032],
	["checkmated (fool's mate)", "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3", { mate: 0 }, "", 0],
	["checkmated on the back rank", "4k3/8/8/8/8/8/3PPP2/q3K3 w - - 0 1", { mate: 0 }, "", 0],
	["stalemated", "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1", { cp: 0 }, "", 0],
];

describe("the vendored engine file", () => {
	it("is the pinned Garbochess-JS file, byte for byte", () => {
		expect(createHash("sha256").update(readFileSync(new URL("../../../third_party/garbochess/garbochess.js", import.meta.url))).digest("hex")).toBe("b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c");
		expect(ENGINE).toEqual({ engine: "garbochess-js", commit: "4ff0f9e49a0041545b645e25d3d2da7af3b36a90", sha256: "b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c" });
		expect(DEFAULT_DEPTH).toBe(10);
		expect(engineFile()).toBe(fileURLToPath(new URL("../../../third_party/garbochess/garbochess.js", import.meta.url)));
	});
});

describe("the engine at a fixed depth", () => {
	it.each(GOLDEN)("%s: score, best move and node count", (_name, fen, score, best, nodes) => {
		expect(analyseSync(fen, DEPTH)).toEqual({ score, best, nodes });
	});

	it("gives a legal best move wherever there is one, and none where the game is over", () => {
		for (const [, fen, , best] of GOLDEN) {
			const position = new Chess(fen);
			if (position.isGameOver()) expect(best).toBe("");
			else expect(position.moves({ verbose: true }).map((move) => move.lan)).toContain(best);
		}
	});

	it("does not depend on what was searched before: every position gives the same result in reverse order and twice in a row", () => {
		const forward = GOLDEN.map(([, fen]) => analyseSync(fen, DEPTH));
		const backward = [...GOLDEN].reverse().map(([, fen]) => analyseSync(fen, DEPTH)).reverse();
		expect(backward).toEqual(forward);
		const [, fen] = GOLDEN[6] ?? ["", ""];
		expect(analyseSync(fen, DEPTH)).toEqual(analyseSync(fen, DEPTH));
	}, 120_000);

	it("answers a mated or stalemated position at once, at any depth, without a search (P118)", () => {
		const started = performance.now();
		expect(analyseSync("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3", 40)).toEqual({ score: { mate: 0 }, best: "", nodes: 0 });
		expect(analyseSync("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1", 40)).toEqual({ score: { cp: 0 }, best: "", nodes: 0 });
		expect(performance.now() - started).toBeLessThan(5000);
	});

	it("keeps a forced mate at a larger depth", () => {
		expect(analyseSync("7k/8/8/5K2/8/8/8/6R1 w - - 0 1", 9).score).toEqual({ mate: 3 });
		expect(analyseSync("8/8/8/8/8/2k5/7r/K7 w - - 0 1", 9).score).toEqual({ mate: -3 });
	});

	it("refuses what is not a position instead of searching it, with SWT-E008", () => {
		expect(() => analyseSync("not a fen", DEPTH)).toThrow("not a FEN");
		expect(codeOf(() => analyseSync("not a fen", DEPTH))).toBe("SWT-E008");
		expect(() => analyseSync("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 0)).toThrow("depth");
		// The side that is not to move stands in check: its king could be taken.
		expect(() => analyseSync("4k3/8/8/8/8/8/8/4K2r b - - 0 1", DEPTH)).toThrow("refused");
	});

	it("turns mate scores into capped centipawns", () => {
		expect(centipawns({ cp: 1500 })).toBe(1000);
		expect(centipawns({ cp: -40 })).toBe(-40);
		expect(centipawns({ mate: 2 })).toBe(998);
		expect(centipawns({ mate: -3 })).toBe(-997);
		expect(centipawns({ mate: 0 })).toBe(-1000);
	});
});
