// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Garbochess-JS (BSD-3-Clause, vendored unmodified under `third_party/garbochess/`) as the reference engine for
 * chess runs, in this process, for `swt analyse chess`: the lab's analysis takes it as its `ChessEngine`. No
 * mechanic imports it, the residents never see it, and it is never part of a live run.
 *
 * The vendored file is a classic web-worker script. It is compiled once with `node:vm` as the body of one function
 * in an empty context (no `process`, no `require`), with `self` and a no-op `postMessage` as parameters, and a short
 * tail appended in memory that hands out its top-level functions. The file on disk is never edited; a test hashes
 * it. (Evaluated as a plain script in a vm context the engine is about fifty times slower, because every one of its
 * top-level variables is then a property of the context's global object.)
 *
 * The same position at the same depth gives the same score, best move and node count on every machine: the engine
 * state is reset before every search, the engine's only clock check is put out of reach, its Zobrist keys come
 * from a generator with a constant seed, and the search is single-threaded integer code.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { compileFunction, createContext } from "node:vm";
import { SwtError } from "@swarmtales/contracts";
import type { Analysis, ChessEngine, Score } from "@swarmtales/lab";
import { Type } from "typebox";
import { Check } from "typebox/value";

/**
 * Which ruler measured: written into the header of every `analysis.json`.
 *
 * @public
 */
export const ENGINE = {
	engine: "garbochess-js",
	commit: "4ff0f9e49a0041545b645e25d3d2da7af3b36a90",
	sha256: "b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c",
} as const;

/**
 * The search depth of `swt analyse chess`, calibrated once on the recorded runs of the old platform; never raised after the baseline.
 *
 * @public
 */
export const DEFAULT_DEPTH = 10;

/** The engine file, relative to the root of the repository. */
const ENGINE_PATH = join("third_party", "garbochess", "garbochess.js");

/** A pawn is 800 engine units (`materialTable` in the engine). */
const UNITS_PER_CENTIPAWN = 8;
/** `maxEval` of the engine; a value within `MATE_BUFFER` of it is a mate, and the difference is its distance in plies. */
const MAX_EVAL = 2_000_000;
const MATE_BUFFER = 2000;

/** Appended in memory after the engine source, inside the same function: the engine's own top-level functions, nothing else. */
const TAIL = `
return {
	reset: function () {
		ResetGame();
		g_globalPly = 0;
		g_moveCount = 0;
		g_repMoveStack = new Array();
		g_timeout = 9007199254740991;
	},
	load: function (fen) { return InitializeFromFen(fen); },
	moves: function () { return GenerateValidMoves().map(FormatMove).join(" "); },
	inCheck: function () { return g_inCheck ? true : false; },
	search: function (depth) {
		var out = null;
		Search(function (move, value, time, reached) {
			out = { move: move ? FormatMove(move) : "", value: value, depth: reached, nodes: g_nodeCount + g_qNodeCount };
		}, depth, null);
		return out;
	}
};`;

const SearchResult = Type.Object(
	{
		move: Type.String({ description: "The best move in UCI" }),
		value: Type.Integer({ description: "The value in engine units" }),
		depth: Type.Integer({ description: "The depth reached" }),
		nodes: Type.Integer({ description: "Nodes searched" }),
	},
	{ description: "What the engine's search callback reports" },
);

/**
 * `SWT-E008`: the reference engine cannot measure: its file changed or is missing, or it refused a position or a depth.
 *
 * @param problem - What went wrong, as a sentence.
 * @returns The error.
 */
function engineFault(problem: string): SwtError {
	return new SwtError({
		code: "SWT-E008",
		summary: `the chess reference engine cannot measure: ${problem}`,
		why: "The engine is a measuring instrument: only the pinned file, a legal position and a depth from 1 to 64 give numbers that compare with the baseline.",
		fix: "Restore third_party/garbochess/garbochess.js from the repository, and analyse only the positions of a chess run at a depth from 1 to 64.",
	});
}

/**
 * The engine file of the repository, found upwards from this module (the same from `src` and from `dist`).
 *
 * @returns The absolute path of `third_party/garbochess/garbochess.js`.
 * @throws SwtError `SWT-E008` when no folder above this module holds it.
 *
 * @public
 */
export function engineFile(): string {
	let folder = import.meta.dirname;
	for (;;) {
		const file = join(folder, ENGINE_PATH);
		if (existsSync(file)) return file;
		const parent = dirname(folder);
		if (parent === folder) throw engineFault(`no ${ENGINE_PATH} above ${import.meta.dirname}`);
		folder = parent;
	}
}

let api: unknown;

function load(): unknown {
	if (api !== undefined) return api;
	const source = readFileSync(engineFile());
	const hash = createHash("sha256").update(source).digest("hex");
	if (hash !== ENGINE.sha256) throw engineFault(`${ENGINE_PATH} was changed: sha256 ${hash}, expected ${ENGINE.sha256}`);
	const build = compileFunction(source.toString("utf8") + TAIL, ["self", "postMessage"], { parsingContext: createContext({}), filename: "garbochess.js" });
	api = Reflect.apply(build, undefined, [{}, () => undefined]);
	return api;
}

function call(name: string, args: readonly unknown[]): unknown {
	const engine = load();
	if (typeof engine !== "object" || engine === null) throw engineFault("garbochess.js did not load");
	const member: unknown = Reflect.get(engine, name);
	if (typeof member !== "function") throw engineFault(`garbochess.js has no ${name}`);
	return Reflect.apply(member, undefined, args);
}

function scoreOf(value: number): Score {
	if (value >= MAX_EVAL - MATE_BUFFER) return { mate: Math.ceil((MAX_EVAL - value) / 2) };
	if (value <= -MAX_EVAL + MATE_BUFFER) return { mate: -Math.floor((MAX_EVAL + value) / 2) };
	const cp = Math.round(value / UNITS_PER_CENTIPAWN);
	return { cp: cp === 0 ? 0 : cp };
}

/**
 * The engine's evaluation of `fen` at `depth` plies, synchronously. A position without a legal move is answered
 * without a search (mate 0 when the side to move is mated, 0 centipawns for a stalemate), so it can never hang (P118).
 * The halfmove clock and the game history are not part of a FEN search: the engine knows repetitions inside its own
 * search tree only.
 *
 * @param fen - The position.
 * @param depth - The search depth in plies, from 1 to 64.
 * @returns The score from the side to move, the best move in UCI and the nodes searched.
 * @throws SwtError `SWT-E008` for a depth out of range, a text that is no FEN, a position the engine refuses, a
 * search that stops short or answers an illegal move, and a changed engine file.
 * @example
 * ```ts
 * analyseSync("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 6); // { score: { cp: 6 }, best: "d2d4", nodes: 38831 }
 * ```
 *
 * @public
 */
export function analyseSync(fen: string, depth: number): Analysis {
	if (!Number.isInteger(depth) || depth < 1 || depth > 64) throw engineFault(`depth must be an integer from 1 to 64, got ${String(depth)}`);
	if (!/^[pnbrqkPNBRQK1-8/]+ [wb] (-|[KQkq]+) (-|[a-h][36])( \d+ \d+)?$/.test(fen.trim())) throw engineFault(`not a FEN: ${fen}`);
	call("reset", []);
	// The engine answers "" for a playable position, "Checkmate" or "Stalemate" for a finished one, and an "Invalid FEN" text otherwise.
	const message: unknown = call("load", [fen.trim()]);
	if (message !== "" && message !== "Checkmate" && message !== "Stalemate") throw engineFault(`the engine refused the position (${String(message)}): ${fen}`);
	const legal = String(call("moves", [])).split(" ").filter((move) => move !== "");
	if (legal.length === 0) return { score: call("inCheck", []) === true ? { mate: 0 } : { cp: 0 }, best: "", nodes: 0 };
	return searched(fen, depth, legal);
}

// The search of a position with legal moves, checked: the depth asked for and a legal move.
function searched(fen: string, depth: number, legal: readonly string[]): Analysis {
	const result: unknown = call("search", [depth]);
	if (!Check(SearchResult, result)) throw engineFault(`the engine gave no result for: ${fen}`);
	if (result.depth !== depth) throw engineFault(`the engine stopped at depth ${String(result.depth)} instead of ${String(depth)}: ${fen}`);
	if (!legal.includes(result.move)) throw engineFault(`the engine's move "${result.move}" is not legal in: ${fen}`);
	return { score: scoreOf(result.value), best: result.move, nodes: result.nodes };
}

/**
 * Garbochess-JS as the lab's `ChessEngine`: the ruler of every `analysis.json` and the evaluation of `analyseSync`.
 *
 * @public
 */
export const GARBOCHESS: ChessEngine = { title: "Garbochess-JS", licence: "BSD-3-Clause", ruler: ENGINE, analyse: analyseSync };
