/**
 * Garbochess-JS (BSD-3-Clause, vendored unmodified under `third_party/garbochess/`) as the reference engine for
 * chess runs, in this process. It is a dev tool for the lab only: no mechanic and no published package imports it,
 * the residents never see it, and it is never part of a live run.
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
import { readFileSync } from "node:fs";
import { compileFunction, createContext } from "node:vm";
import { Type } from "typebox";
import { Check } from "typebox/value";

/** Which ruler measured: written into the header of every `analysis.json`. */
export const ENGINE = {
	engine: "garbochess-js",
	commit: "4ff0f9e49a0041545b645e25d3d2da7af3b36a90",
	sha256: "b0ebcf80e7bc7c5c9dd08e57f96a07af0a655f6138590243028d6b98717c938c",
} as const;

/** The search depth of `pnpm lab:chess`, calibrated once on the recorded runs (stories/chess/runs/REANALYSIS.md); never raised after the baseline. */
export const DEFAULT_DEPTH = 10;

export const ENGINE_FILE = new URL("../third_party/garbochess/garbochess.js", import.meta.url);

/** An evaluation from the side to move: centipawns, or a mate in `mate` moves (negative: being mated; 0: mated now). */
export type Score = { readonly cp: number } | { readonly mate: number };

export interface Analysis {
	readonly score: Score;
	/** The engine's best move in UCI (`e2e4`, `e7e8q`), or "" when the side to move has none. */
	readonly best: string;
	/** Nodes searched (main search plus quiescence); 0 when no search was needed. The same number proves the same search tree. */
	readonly nodes: number;
}

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

const SearchResult = Type.Object({ move: Type.String(), value: Type.Integer(), depth: Type.Integer(), nodes: Type.Integer() });

let api: unknown;

/** The SHA-256 of the vendored engine file as it is on disk. */
export function engineFileHash(): string {
	return createHash("sha256").update(readFileSync(ENGINE_FILE)).digest("hex");
}

function load(): unknown {
	if (api !== undefined) return api;
	const source = readFileSync(ENGINE_FILE);
	const hash = createHash("sha256").update(source).digest("hex");
	if (hash !== ENGINE.sha256) throw new Error(`third_party/garbochess/garbochess.js was changed: sha256 ${hash}, expected ${ENGINE.sha256}`);
	const build = compileFunction(source.toString("utf8") + TAIL, ["self", "postMessage"], { parsingContext: createContext({}), filename: "garbochess.js" });
	api = Reflect.apply(build, undefined, [{}, () => undefined]);
	return api;
}

function call(name: string, args: readonly unknown[]): unknown {
	const engine = load();
	if (typeof engine !== "object" || engine === null) throw new Error("garbochess.js did not load");
	const member: unknown = Reflect.get(engine, name);
	if (typeof member !== "function") throw new Error(`garbochess.js has no ${name}`);
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
 */
export function analyseSync(fen: string, depth: number): Analysis {
	if (!Number.isInteger(depth) || depth < 1 || depth > 64) throw new Error(`depth must be an integer from 1 to 64, got ${String(depth)}`);
	if (!/^[pnbrqkPNBRQK1-8/]+ [wb] (-|[KQkq]+) (-|[a-h][36])( \d+ \d+)?$/.test(fen.trim())) throw new Error(`not a FEN: ${fen}`);
	call("reset", []);
	// The engine answers "" for a playable position, "Checkmate" or "Stalemate" for a finished one, and an "Invalid FEN" text otherwise.
	const message: unknown = call("load", [fen.trim()]);
	if (message !== "" && message !== "Checkmate" && message !== "Stalemate") throw new Error(`the engine refused the position (${String(message)}): ${fen}`);
	const legal = String(call("moves", [])).split(" ").filter((move) => move !== "");
	if (legal.length === 0) return { score: call("inCheck", []) === true ? { mate: 0 } : { cp: 0 }, best: "", nodes: 0 };
	const result: unknown = call("search", [depth]);
	if (!Check(SearchResult, result)) throw new Error(`the engine gave no result for: ${fen}`);
	if (result.depth !== depth) throw new Error(`the engine stopped at depth ${String(result.depth)} instead of ${String(depth)}: ${fen}`);
	if (!legal.includes(result.move)) throw new Error(`the engine's move "${result.move}" is not legal in: ${fen}`);
	return { score: scoreOf(result.value), best: result.move, nodes: result.nodes };
}

/** The engine's evaluation of `fen` at `depth` plies (the search itself is synchronous; the promise keeps the call sites as they were). */
export function analyse(fen: string, depth: number): Promise<Analysis> {
	try {
		return Promise.resolve(analyseSync(fen, depth));
	} catch (error) {
		return Promise.reject(error instanceof Error ? error : new Error(String(error)));
	}
}

/** Mate scores as centipawns, capped as analysis sites do: a mate is worth `cap`, shrinking slightly with its distance. */
export function centipawns(score: Score, cap = 1000): number {
	if ("cp" in score) return Math.max(-cap, Math.min(cap, score.cp));
	if (score.mate === 0) return -cap;
	return score.mate > 0 ? cap - score.mate : -cap - score.mate;
}
