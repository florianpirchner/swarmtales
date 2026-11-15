// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The chess analysis of the lab with an engine of its own: the analysis asks only the engine it is handed, reads
 * `move_played` and `game_started` of the chess mechanic only, and names the engine in the Markdown. The numbers of
 * Garbochess-JS are tested beside its loader in `apps/cli/test`.
 */
import { describe, expect, it } from "vitest";
import { analyseGame, analysisMarkdown, type ChessEngine, chessGamesOf, type ChessLine } from "../src/index.ts";

/** An engine that says 0 for every position and asks for the first move of a short list; it counts its calls. */
function stub(): ChessEngine & { readonly asked: string[] } {
	const asked: string[] = [];
	return { title: "Stub", licence: "MIT", ruler: { engine: "stub", commit: "0123456789", sha256: "00" }, asked, analyse: (fen) => (asked.push(fen), { score: { cp: 0 }, best: "e2e4", nodes: 1 }) };
}

const move = (ply: number, san: string) => ({ game: 1, ply, colour: ply % 2 === 1 ? ("white" as const) : ("black" as const), by: ply % 2 === 1 ? "A01" : "A02", san, written: san, fen: "", forfeit: false });

describe("the chess analysis with an engine handed in", () => {
	it("asks the engine once per position that is not over, and never about the mated one", () => {
		const engine = stub();
		const plies = analyseGame(engine, [move(1, "f3"), move(2, "e5"), move(3, "g4"), move(4, "Qh4#")], 3);
		expect(engine.asked).toHaveLength(4);
		expect(plies[0]).toMatchObject({ san: "f3", best: "e4", loss: 0, class: "good" });
		expect(plies[3]).toMatchObject({ san: "Qh4#", after: 1000 });
	});

	it("reads the events of the chess mechanic only, in order of the half-move", () => {
		const lines: ChessLine[] = [
			{ source: "@swarmtales/mechanic-chess/chess", type: "game_started", payload: { game: 1, white: "A01", black: "A02" } },
			{ source: "@swarmtales/mechanic-chess/chess", type: "move_played", payload: move(2, "e5") },
			{ source: "@swarmtales/mechanic-chess/chess", type: "move_played", payload: move(1, "e4") },
			{ source: "@swarmtales/mechanic-morris/morris", type: "move_played", payload: move(3, "Nf3") },
			{ source: "@swarmtales/mechanic-other/chess-clock", type: "game_started", payload: { game: 1, white: "X", black: "Y" } },
			{ source: "chess", type: "move_played", payload: move(3, "Nf3") },
			{ source: "@swarmtales/mechanic-chess/chess", type: "move_scored", payload: move(3, "Nf3") },
		];
		const { games, moves } = chessGamesOf(lines);
		expect(games.get(1)).toEqual({ white: "A01", black: "A02" });
		expect(moves.get(1)?.map((played) => played.san)).toEqual(["e4", "e5"]);
	});

	it("names the engine, its commit and its licence in the Markdown", () => {
		const engine = stub();
		const plies = analyseGame(engine, [move(1, "e4")], 2);
		const side = { moves: 1, acpl: 0, inaccuracies: 0, mistakes: 0, blunders: 0, missedMates: 0 };
		expect(analysisMarkdown(engine, [{ game: 1, white: "A01", black: "A02", plies, white_: side, black_: { ...side, moves: 0 } }], 2)).toContain("Stub at depth 2 (`swt analyse chess`; commit 0123456, MIT)");
	});
});
