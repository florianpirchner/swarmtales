// SPDX-License-Identifier: Apache-2.0
/**
 * The chess analysis of the lab (no model, no money, never part of a run): replays every game of a finished chess
 * run and scores each half-move with a reference engine (`ChessEngine` of `engine.ts`; the command line hands in
 * Garbochess-JS) as centipawn loss against the engine's best move.
 * It is the engine reference of P111: the live `move_scored` baseline is a one-ply material check; this is the
 * number to quote for move quality. `swt analyse chess <run dir> [--depth 10]` writes `analysis.json` (every
 * half-move) and `ANALYSIS.md` (per game and side: average centipawn loss, inaccuracies 50+, mistakes 100+,
 * blunders 300+, missed mates) into the run folder.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EVENTS_FILE } from "@swarmtales/chain";
import { verifyRun } from "@swarmtales/runlog";
import { Chess } from "chess.js";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { badRunFolder } from "../errors.ts";
import { centipawns, type ChessEngine, type Score } from "./engine.ts";

const Colour = Type.Union([Type.Literal("white"), Type.Literal("black")], { description: "The side" });

const MovePlayed = Type.Object(
	{
		game: Type.Integer({ description: "The game of the match, from 1" }),
		ply: Type.Integer({ description: "The half-move's number in its game, from 1" }),
		colour: Colour,
		by: Type.String({ description: "The resident who moved" }),
		san: Type.String({ description: "The move in SAN" }),
		forfeit: Type.Boolean({ description: "The move was played for a seat that forfeited its turn" }),
	},
	{ description: "What the analysis reads of a `move_played` payload of the chess mechanic" },
);
/**
 * One half-move of the chess mechanic as the analysis reads it from `move_played`.
 *
 * @public
 */
export type ChessMove = Static<typeof MovePlayed>;

const GameStarted = Type.Object(
	{ game: Type.Integer({ description: "The game of the match, from 1" }), white: Type.String({ description: "Who plays White" }), black: Type.String({ description: "Who plays Black" }) },
	{ description: "What the analysis reads of a `game_started` payload of the chess mechanic" },
);

const Line = Type.Object(
	{ source: Type.String({ description: "The plugin that wrote the event, `<package>/<id>`" }), type: Type.String({ description: "The event type" }), payload: Type.Unknown({ description: "The payload" }) },
	{ description: "What the analysis reads of a line of the log" },
);

/**
 * What the analysis reads of one line of the log.
 *
 * @public
 */
export type ChessLine = Static<typeof Line>;

/** The plugin id of the chess mechanic: an event is read as chess only when its source is `<package>/chess`. */
const CHESS = "chess";

const isChess = (source: string): boolean => source.includes("/") && source.slice(source.lastIndexOf("/") + 1) === CHESS;

/**
 * How a half-move is classed by its centipawn loss.
 *
 * @public
 */
export type MoveClass = "good" | "inaccuracy" | "mistake" | "blunder";

/**
 * One half-move of a game as the engine scored it.
 *
 * @public
 */
export interface ScoredPly {
	/** The half-move's number in its game, from 1. */
	readonly ply: number;
	/** The side that moved. */
	readonly colour: "white" | "black";
	/** The resident who moved. */
	readonly by: string;
	/** The move in SAN. */
	readonly san: string;
	/** The move was played for a seat that forfeited its turn; left out of the sums. */
	readonly forfeit: boolean;
	/** The engine's best move (SAN), or "" when the game was over. */
	readonly best: string;
	/** The evaluation before the move, in centipawns from the mover's side (mates capped). */
	readonly before: number;
	/** The evaluation after the move, in centipawns from the mover's side (mates capped). */
	readonly after: number;
	/** The centipawn loss: `before - after`, at least 0; 0 for the engine's own move. */
	readonly loss: number;
	/** The class of the loss. */
	readonly class: MoveClass;
	/** The mover had a forced mate and the move gave it up. */
	readonly missedMate: boolean;
}

/**
 * The sums of one side of one game; forfeit moves are left out.
 *
 * @public
 */
export interface SideSummary {
	/** The side's own half-moves. */
	readonly moves: number;
	/** The average centipawn loss, rounded. */
	readonly acpl: number;
	/** Half-moves with a loss of 50 to 99. */
	readonly inaccuracies: number;
	/** Half-moves with a loss of 100 to 299. */
	readonly mistakes: number;
	/** Half-moves with a loss of 300 or more. */
	readonly blunders: number;
	/** Half-moves that gave up a forced mate. */
	readonly missedMates: number;
}

/**
 * The analysis of one game of a run.
 *
 * @public
 */
export interface GameAnalysis {
	/** The game of the match, from 1. */
	readonly game: number;
	/** Who played White ("" when the log has no `game_started`). */
	readonly white: string;
	/** Who played Black ("" when the log has no `game_started`). */
	readonly black: string;
	/** Every half-move, in order. */
	readonly plies: readonly ScoredPly[];
	/** The sums of White. */
	readonly white_: SideSummary;
	/** The sums of Black. */
	readonly black_: SideSummary;
}

/**
 * The class of a centipawn loss: a blunder from 300, a mistake from 100, an inaccuracy from 50.
 *
 * @param loss - The centipawn loss.
 * @returns The class.
 *
 * @public
 */
export function classOf(loss: number): MoveClass {
	if (loss >= 300) return "blunder";
	if (loss >= 100) return "mistake";
	if (loss >= 50) return "inaccuracy";
	return "good";
}

function summary(plies: readonly ScoredPly[]): SideSummary {
	const own = plies.filter((ply) => !ply.forfeit);
	const total = own.reduce((sum, ply) => sum + ply.loss, 0);
	return {
		moves: own.length,
		acpl: own.length === 0 ? 0 : Math.round(total / own.length),
		inaccuracies: own.filter((ply) => ply.class === "inaccuracy").length,
		mistakes: own.filter((ply) => ply.class === "mistake").length,
		blunders: own.filter((ply) => ply.class === "blunder").length,
		missedMates: own.filter((ply) => ply.missedMate).length,
	};
}

const mates = (score: Score): boolean => "mate" in score && score.mate > 0;

// One engine call per position. A finished position needs no search (P118): a mate is mate 0, and a draw by the rules (stalemate, repetition, fifty moves, material) is 0.
function evaluate(engine: ChessEngine, fen: string, depth: number): { readonly score: Score; readonly best: string } {
	const position = new Chess(fen);
	if (position.isCheckmate()) return { score: { mate: 0 }, best: "" };
	if (position.isGameOver()) return { score: { cp: 0 }, best: "" };
	return engine.analyse(fen, depth);
}

/**
 * Scores one game's half-moves (SAN, in order) at `depth`; one engine call per position.
 *
 * @param engine - The reference engine.
 * @param moves - The half-moves of the game, in order of `ply`.
 * @param depth - The search depth in plies.
 * @returns Every half-move with its evaluations, loss and class.
 * @throws Whatever the engine throws; a move that is not legal on the board throws the error of chess.js.
 * @example
 * ```ts
 * const plies = analyseGame(engine, [{ ply: 1, colour: "white", by: "A01", san: "e4", forfeit: false }], 6);
 * ```
 *
 * @public
 */
export function analyseGame(engine: ChessEngine, moves: readonly Pick<ChessMove, "ply" | "colour" | "by" | "san" | "forfeit">[], depth: number): ScoredPly[] {
	const chess = new Chess();
	const fens = [chess.fen()];
	for (const move of moves) {
		chess.move(move.san);
		fens.push(chess.fen());
	}
	const results = fens.map((fen) => evaluate(engine, fen, depth));
	const replay = new Chess();
	return moves.map((move, index) => scored(move, replay, results[index] ?? NONE, results[index + 1] ?? NONE));
}

const NONE = { score: { cp: 0 }, best: "" } as const;

// One half-move against the evaluations before and after it; `replay` stands before the move and is moved on.
function scored(move: Pick<ChessMove, "ply" | "colour" | "by" | "san" | "forfeit">, replay: Chess, at: { readonly score: Score; readonly best: string }, next: { readonly score: Score }): ScoredPly {
	const uci = at.best;
	const best = uci === "" ? "" : (replay.moves({ verbose: true }).find((candidate) => candidate.lan === uci)?.san ?? uci);
	replay.move(move.san);
	const beforeCp = centipawns(at.score);
	// The position after the move is evaluated from the opponent's side.
	const afterCp = -centipawns(next.score);
	// Two searches of neighbouring positions disagree a little; the engine's own move loses nothing by definition.
	const loss = move.san === best ? 0 : Math.max(0, beforeCp - afterCp);
	const missedMate = mates(at.score) && !("mate" in next.score && next.score.mate <= 0);
	return { ...move, best, before: beforeCp, after: afterCp, loss, class: classOf(loss), missedMate };
}

function eventsOf(directory: string): readonly ChessLine[] {
	const verdict = verifyRun(directory);
	const first = verdict.issues[0];
	if (first !== undefined) throw badRunFolder(directory, `the run does not verify (${verdict.issues.length} issues, the first: ${first.code} ${first.summary})`);
	return readFileSync(join(directory, EVENTS_FILE), "utf8")
		.split("\n")
		.filter((line) => line.trim() !== "")
		.flatMap((line) => {
			const event: unknown = JSON.parse(line);
			return Check(Line, event) ? [event] : [];
		});
}

/**
 * The games and half-moves of the chess mechanic in the lines of a log: `game_started` and `move_played` of a source
 * `<package>/chess` only, so an event of the same type of another mechanic is never read as chess.
 *
 * @param lines - The lines of the log, in order.
 * @returns The players by game, and the half-moves by game in order of `ply`.
 *
 * @public
 */
export function chessGamesOf(lines: readonly ChessLine[]): { readonly games: ReadonlyMap<number, { readonly white: string; readonly black: string }>; readonly moves: ReadonlyMap<number, readonly ChessMove[]> } {
	const games = new Map<number, { white: string; black: string }>();
	const moves = new Map<number, ChessMove[]>();
	for (const { type, payload } of lines.filter((line) => isChess(line.source))) {
		if (type === "game_started" && Check(GameStarted, payload)) games.set(payload.game, { white: payload.white, black: payload.black });
		else if (type === "move_played" && Check(MovePlayed, payload)) {
			const { game, ply, colour, by, san, forfeit } = payload;
			moves.set(game, [...(moves.get(game) ?? []), { game, ply, colour, by, san, forfeit }]);
		}
	}
	for (const list of moves.values()) list.sort((a, b) => a.ply - b.ply);
	return { games, moves };
}

/**
 * Analyses every game of a chess run folder, in the order of the games.
 *
 * @param engine - The reference engine.
 * @param directory - The run folder; its log must verify (an unfinished run is analysed as far as it goes).
 * @param depth - The search depth in plies.
 * @returns One analysis per game that has a half-move.
 * @throws SwtError `SWT-E006` when the folder does not verify or its log holds no `move_played`, and whatever the engine throws.
 * @example
 * ```ts
 * const games = analyseRun(engine, "runs/chess-001", 10);
 * writeFileSync("runs/chess-001/ANALYSIS.md", analysisMarkdown(engine, games, 10));
 * ```
 *
 * @public
 */
export function analyseRun(engine: ChessEngine, directory: string, depth: number): GameAnalysis[] {
	const { games, moves } = chessGamesOf(eventsOf(directory));
	if (moves.size === 0) throw badRunFolder(directory, "its log holds no `move_played` of a chess game");
	return [...moves]
		.sort(([a], [b]) => a - b)
		.map(([game, list]) => {
			const plies = analyseGame(engine, list, depth);
			const sides = games.get(game) ?? { white: "", black: "" };
			return { game, white: sides.white, black: sides.black, plies, white_: summary(plies.filter((ply) => ply.colour === "white")), black_: summary(plies.filter((ply) => ply.colour === "black")) };
		});
}

const row = (label: string, side: SideSummary): string =>
	`| ${label} | ${String(side.moves)} | ${String(side.acpl)} | ${String(side.inaccuracies)} | ${String(side.mistakes)} | ${String(side.blunders)} | ${String(side.missedMates)} |`;

/**
 * `ANALYSIS.md` of a run: the table per game and side, then every blunder and missed mate.
 *
 * @param engine - The engine that measured.
 * @param analyses - The analyses of the games.
 * @param depth - The depth they were searched at.
 * @returns The Markdown text, ending with a newline.
 *
 * @public
 */
export function analysisMarkdown(engine: ChessEngine, analyses: readonly GameAnalysis[], depth: number): string {
	const lines = [
		"# Engine analysis",
		"",
		`${engine.title} at depth ${String(depth)} (\`swt analyse chess\`; commit ${engine.ruler.commit.slice(0, 7)}, ${engine.licence}), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.`,
		"",
		"| Game, side | Moves | ACPL | Inaccuracies (50+) | Mistakes (100+) | Blunders (300+) | Missed mates |",
		"|---|---:|---:|---:|---:|---:|---:|",
	];
	for (const game of analyses) {
		lines.push(row(`${String(game.game)} White ${game.white}`, game.white_));
		lines.push(row(`${String(game.game)} Black ${game.black}`, game.black_));
	}
	lines.push("", "## Blunders and missed mates", "");
	for (const game of analyses) {
		for (const ply of game.plies) {
			if (ply.class !== "blunder" && !ply.missedMate) continue;
			lines.push(`- game ${String(game.game)}, move ${String(Math.floor((ply.ply - 1) / 2) + 1)}${ply.colour === "black" ? "..." : "."} ${ply.san} (${ply.by}): ${String(ply.before)} to ${String(ply.after)}, best ${ply.best}${ply.missedMate ? ", missed a forced mate" : ""}`);
		}
	}
	return `${lines.join("\n")}\n`;
}
