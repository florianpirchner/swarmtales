// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against all twelve oracle files: the five of the default, the fresh context and the compact board
 * (M4-29), and the seven recorded for M4 (M4-17, the additions 1 to 7 of the M4 specification 2.4: the legal-move
 * list, the list with the coach, no brain, the cap of 12 plies plain and settled, the teams, the threats). Each file is
 * played from its inputs under the game's own scheduler and compared at level 3 (rules, texts, scheduling); a cut file
 * up to its cut. The old name grammar is not carried, so `VARIANTS` holds the options behind each `variant` of a file
 * (M4 specification 2.2, rule 9); `carried.test.ts` pins it against the old parser.
 *
 * One declared mapping, as for liar's dice: no file of `oracles/` holds `call.endsTurn`, although the old mechanic
 * set it on every accepted `playMove` and `resign` (old `mechanics/chess/src/index.ts`, lines 449 and 578), and so
 * does the port. `withEndsTurn` writes the flag back into those call entries before the comparison.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, withEndsTurn, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { chessGame } from "../game.ts";
import { endsTurn, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "chess");

const FILES = [
	"chess-compact-g4-p80-s41.json",
	"chess-fresh-compact-g4-p80-s47.json",
	"chess-g4-p80-s41.json",
	"chess-moves-coach-s13.json",
	"chess-moves-s13.json",
	"chess-nobrain-s13.json",
	"chess-p12-s13.json",
	"chess-s13-silent.json",
	"chess-s13.json",
	"chess-settle-p12-s13.json",
	"chess-teams-s13.json",
	"chess-threats-s13.json",
];

const gameOf = (oracle: Oracle) => chessGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });

describe("chess against its oracles", () => {
	it("covers every file of the folder, each with the options of its variant", () => {
		const files = readdirSync(ORACLES).filter((file) => file.endsWith(".json"));
		expect(files.filter((file) => Object.hasOwn(VARIANTS, readOracle(join(ORACLES, file)).variant)).sort()).toEqual(FILES);
		expect(files).toHaveLength(12);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(oracle.timeline.some((entry) => entry.k === "call" && entry.endsTurn === true)).toBe(false);
		expect(await runOracle(withEndsTurn(oracle, endsTurn), gameOf(oracle), 3)).toEqual([]);
	});

	it("needs the mapping only for the flag: without it the first difference is a call that ends its turn", async () => {
		const oracle = readOracle(join(ORACLES, "chess-s13.json"));
		const mismatches = await runOracle(oracle, gameOf(oracle), 3);
		const endsTurn = (actual: unknown): unknown => Reflect.get(Object(actual), "endsTurn");
		expect(mismatches.map(({ level, at, actual }) => [level, at, endsTurn(actual)])).toEqual([[2, "call", true]]);
	});
});
