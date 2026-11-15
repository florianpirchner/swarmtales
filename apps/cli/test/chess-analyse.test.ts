// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The chess analysis of the lab (`packages/lab/src/chess/analyse.ts`) with Garbochess-JS: centipawn loss against the engine's best move, the classes,
 * a finished position scored without a search, and the Markdown of a run. The first two tests are carried from the
 * old `test/stories/chess.test.ts` ("the engine reference (lab)").
 */
import { describe, expect, it } from "vitest";
import { analyseGame, analysisMarkdown, classOf, type GameAnalysis } from "@swarmtales/lab";
import { GARBOCHESS } from "../src/index.ts";

const line = (sans: readonly string[]) => sans.map((san, index) => ({ ply: index + 1, colour: index % 2 === 0 ? ("white" as const) : ("black" as const), by: index % 2 === 0 ? "A01" : "A02", san, forfeit: false }));

describe("the engine reference (lab)", () => {
	it("scores a hanging queen as a blunder and the engine's own move as no loss", () => {
		const plies = analyseGame(GARBOCHESS, line(["e4", "d6", "Qg4", "Bxg4"]), 6);
		expect(plies[2]).toMatchObject({ san: "Qg4", class: "blunder" });
		expect(plies[3]).toMatchObject({ san: "Bxg4", best: "Bxg4", loss: 0 });
		expect(classOf(120)).toBe("mistake");
	}, 30_000);

	it("scores a game that ends in checkmate without asking the engine about the mated position", () => {
		const plies = analyseGame(GARBOCHESS, line(["f3", "e5", "g4", "Qh4#"]), 6);
		expect(plies[2]).toMatchObject({ san: "g4", class: "blunder" });
		expect(plies[3]).toMatchObject({ san: "Qh4#", loss: 0, after: 1000, missedMate: false });
	}, 30_000);

	it("classes a loss at the bounds 50, 100 and 300", () => {
		expect([0, 49, 50, 99, 100, 299, 300].map(classOf)).toEqual(["good", "good", "inaccuracy", "inaccuracy", "mistake", "mistake", "blunder"]);
	});

	it("flags a move that gives up a forced mate", () => {
		// After 3...Nf6 White mates with Qxf7#; 4. a3 lets it go.
		const missed = analyseGame(GARBOCHESS, line(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "a3"]), 4);
		expect(missed[6]).toMatchObject({ san: "a3", best: "Qxf7#", class: "blunder", missedMate: true });
		const mate = analyseGame(GARBOCHESS, line(["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"]), 4);
		expect(mate[6]).toMatchObject({ san: "Qxf7#", loss: 0, missedMate: false });
		expect(mate[5]).toMatchObject({ san: "Nf6", class: "blunder" });
	}, 30_000);
});

describe("the Markdown of a run", () => {
	it("writes the table per game and side and lists blunders and missed mates, forfeit moves left out of the sums", () => {
		const plies = analyseGame(GARBOCHESS, [...line(["f3", "e5"]), { ply: 3, colour: "white", by: "A01", san: "g4", forfeit: true }, { ply: 4, colour: "black", by: "A02", san: "Qh4#", forfeit: false }], 4);
		const side = (colour: "white" | "black") => plies.filter((ply) => ply.colour === colour && !ply.forfeit);
		const game: GameAnalysis = { game: 1, white: "A01", black: "A02", plies, white_: { moves: side("white").length, acpl: 0, inaccuracies: 0, mistakes: 0, blunders: 0, missedMates: 0 }, black_: { moves: side("black").length, acpl: 0, inaccuracies: 0, mistakes: 0, blunders: 0, missedMates: 0 } };
		const text = analysisMarkdown(GARBOCHESS, [game], 4);
		expect(text).toContain("Garbochess-JS at depth 4 (`swt analyse chess`; commit 4ff0f9e, BSD-3-Clause)");
		expect(text).toContain("| 1 White A01 | 1 | 0 | 0 | 0 | 0 | 0 |");
		expect(text).toContain("| 1 Black A02 | 2 | 0 | 0 | 0 | 0 | 0 |");
		expect(text).toContain("- game 1, move 2. g4 (A01): ");
		expect(text.endsWith("\n")).toBe(true);
	}, 30_000);
});
