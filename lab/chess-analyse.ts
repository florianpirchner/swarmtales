/**
 * The chess analysis lab (not part of `pnpm check`'s live runs, no model, no money): replays every game
 * of a chess run and scores each half-move with Stockfish 10 (`lab/chess-engine.ts`) as centipawn loss
 * against the engine's best move. It is the engine reference of P111: the live `move_scored` baseline is a
 * one-ply material check; this is the number to quote for move quality.
 *
 * `lab/chess.ts` is its command line (`pnpm lab:chess <run-dir> [--depth 14]`), which writes `<run-dir>/analysis.json` (every half-move) and `<run-dir>/ANALYSIS.md` (per game and side:
 * average centipawn loss, inaccuracies 50+, mistakes 100+, blunders 300+, missed mates).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Chess } from "chess.js";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { analyse, centipawns, type Score } from "./chess-engine.ts";

const MovePlayed = Type.Object({
	type: Type.Literal("move_played"),
	game: Type.Integer(),
	ply: Type.Integer(),
	colour: Type.Union([Type.Literal("white"), Type.Literal("black")]),
	by: Type.String(),
	san: Type.String(),
	forfeit: Type.Boolean(),
});
type MovePlayed = Static<typeof MovePlayed>;

const GameStarted = Type.Object({ type: Type.Literal("game_started"), game: Type.Integer(), white: Type.String(), black: Type.String() });

export type MoveClass = "good" | "inaccuracy" | "mistake" | "blunder";

export interface ScoredPly {
	readonly ply: number;
	readonly colour: "white" | "black";
	readonly by: string;
	readonly san: string;
	readonly forfeit: boolean;
	/** The engine's best move (SAN) and the evaluations, all in centipawns from the mover's side (mates capped). */
	readonly best: string;
	readonly before: number;
	readonly after: number;
	readonly loss: number;
	readonly class: MoveClass;
	/** The mover had a forced mate and the move gave it up. */
	readonly missedMate: boolean;
}

export interface SideSummary {
	readonly moves: number;
	readonly acpl: number;
	readonly inaccuracies: number;
	readonly mistakes: number;
	readonly blunders: number;
	readonly missedMates: number;
}

export interface GameAnalysis {
	readonly game: number;
	readonly white: string;
	readonly black: string;
	readonly plies: readonly ScoredPly[];
	readonly white_: SideSummary;
	readonly black_: SideSummary;
}

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

/** Scores one game's half-moves (SAN, in order) at `depth`; one engine call per position. */
export async function analyseGame(moves: readonly Pick<MovePlayed, "ply" | "colour" | "by" | "san" | "forfeit">[], depth: number): Promise<ScoredPly[]> {
	const chess = new Chess();
	const fens = [chess.fen()];
	for (const move of moves) {
		chess.move(move.san);
		fens.push(chess.fen());
	}
	const scores: Score[] = [];
	const bests: string[] = [];
	for (const fen of fens) {
		const result = await analyse(fen, depth);
		scores.push(result.score);
		bests.push(result.best);
	}
	const replay = new Chess();
	return moves.map((move, index) => {
		const before = scores[index] ?? { cp: 0 };
		const after = scores[index + 1] ?? { cp: 0 };
		const uci = bests[index] ?? "";
		const best = uci === "" ? "" : (replay.moves({ verbose: true }).find((candidate) => candidate.lan === uci)?.san ?? uci);
		replay.move(move.san);
		const beforeCp = centipawns(before);
		// The position after the move is evaluated from the opponent's side.
		const afterCp = -centipawns(after);
		// Two searches of neighbouring positions disagree a little; the engine's own move loses nothing by definition.
		const loss = move.san === best ? 0 : Math.max(0, beforeCp - afterCp);
		const missedMate = mates(before) && !("mate" in after && after.mate <= 0);
		return { ...move, best, before: beforeCp, after: afterCp, loss, class: classOf(loss), missedMate };
	});
}

function readRun(dir: string): { readonly games: Map<number, { white: string; black: string }>; readonly moves: Map<number, MovePlayed[]> } {
	const games = new Map<number, { white: string; black: string }>();
	const moves = new Map<number, MovePlayed[]>();
	for (const line of readFileSync(join(dir, "events.jsonl"), "utf8").split("\n")) {
		if (line.trim() === "") continue;
		const event: unknown = JSON.parse(line);
		if (Check(GameStarted, event)) games.set(event.game, { white: event.white, black: event.black });
		else if (Check(MovePlayed, event)) moves.set(event.game, [...(moves.get(event.game) ?? []), event]);
	}
	for (const list of moves.values()) list.sort((a, b) => a.ply - b.ply);
	return { games, moves };
}

const row = (label: string, side: SideSummary): string =>
	`| ${label} | ${String(side.moves)} | ${String(side.acpl)} | ${String(side.inaccuracies)} | ${String(side.mistakes)} | ${String(side.blunders)} | ${String(side.missedMates)} |`;

export function markdown(analyses: readonly GameAnalysis[], depth: number): string {
	const lines = [
		"# Engine analysis",
		"",
		`Stockfish 10 at depth ${String(depth)} (\`pnpm lab:chess\`), centipawn loss per half-move against the engine's best move, mates capped at 1000. Forfeit moves are left out of the sums.`,
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

export async function analyseRun(dir: string, depth: number): Promise<GameAnalysis[]> {
	const { games, moves } = readRun(dir);
	const analyses: GameAnalysis[] = [];
	for (const [game, list] of [...moves].sort(([a], [b]) => a - b)) {
		const plies = await analyseGame(list, depth);
		const sides = games.get(game) ?? { white: "", black: "" };
		analyses.push({ game, white: sides.white, black: sides.black, plies, white_: summary(plies.filter((ply) => ply.colour === "white")), black_: summary(plies.filter((ply) => ply.colour === "black")) });
	}
	return analyses;
}
