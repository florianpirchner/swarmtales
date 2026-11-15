// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the chess analysis needs of a reference engine: a synchronous evaluation of one position at a depth, and the
 * name of the ruler. The lab loads no engine itself; the command line hands in the vendored Garbochess-JS
 * (`apps/cli/src/chess-engine.ts`), and a test may hand in its own.
 */

/**
 * An evaluation from the side to move: centipawns, or a mate in `mate` moves (negative: being mated; 0: mated now).
 *
 * @public
 */
export type Score = { readonly cp: number } | { readonly mate: number };

/**
 * The engine's answer for one position.
 *
 * @public
 */
export interface Analysis {
	/** The evaluation from the side to move. */
	readonly score: Score;
	/** The engine's best move in UCI (`e2e4`, `e7e8q`), or "" when the side to move has none. */
	readonly best: string;
	/** Nodes searched (main search plus quiescence); 0 when no search was needed. The same number proves the same search tree. */
	readonly nodes: number;
}

/**
 * A chess reference engine as the analysis takes it.
 *
 * @example
 * ```ts
 * const engine: ChessEngine = { title: "Garbochess-JS", licence: "BSD-3-Clause", ruler: { engine: "garbochess-js", commit: "4ff0f9e…", sha256: "b0ebcf80…" }, analyse: analyseSync };
 * ```
 *
 * @public
 */
export interface ChessEngine {
	/** The engine's name as `ANALYSIS.md` writes it, for example "Garbochess-JS". */
	readonly title: string;
	/** The SPDX id of the engine's licence. */
	readonly licence: string;
	/** Which ruler measured: written into the header of every `analysis.json`. */
	readonly ruler: { readonly engine: string; readonly commit: string; readonly sha256: string };
	/** The evaluation of `fen` at `depth` plies, from the side to move; a position without a legal move is answered without a search. */
	readonly analyse: (fen: string, depth: number) => Analysis;
}

/**
 * Mate scores as centipawns, capped as analysis sites do: a mate is worth `cap`, shrinking slightly with its distance.
 *
 * @param score - The engine's score.
 * @param cap - The cap in centipawns; 1000 when left out.
 * @returns The score in centipawns, from -cap to cap.
 *
 * @public
 */
export function centipawns(score: Score, cap = 1000): number {
	if ("cp" in score) return Math.max(-cap, Math.min(cap, score.cp));
	if (score.mate === 0) return -cap;
	return score.mate > 0 ? cap - score.mate : -cap - score.mate;
}
