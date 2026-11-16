// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its oracles: every file of `oracles/tictactoe/` is played from its inputs under the game's own
 * scheduler and compared at level 3 (rules, texts, scheduling). The old name grammar is not carried, so this table
 * holds the options behind each `variant` of a file (specification of M1, section 8.2), and nothing else does.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { tictactoeGame, type TicTacToeOptions } from "../game.ts";
import { RENAMED } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "tictactoe");

const VARIANTS: Readonly<Record<string, TicTacToeOptions>> = {
	"tictactoe-teams": {},
	"tictactoe-teams-nobrain": { brain: false },
	"tictactoe-teams-solo": { teamSize: 1 },
	"tictactoe-teams-4x4": { size: 4, line: 4 },
	"tictactoe-teams-5x5-nobrain-solo": { size: 5, line: 4, brain: false, teamSize: 1 },
};

// The seven files of the specification's table, and the two files of the default variant with the seed 13 (probes, silent).
const FILES = [
	"tictactoe-teams-4x4-s7.json",
	"tictactoe-teams-5x5-nobrain-solo-s1.json",
	"tictactoe-teams-5x5-nobrain-solo-s3.json",
	"tictactoe-teams-nobrain-s7.json",
	"tictactoe-teams-s11.json",
	"tictactoe-teams-s13-probes.json",
	"tictactoe-teams-s13-silent.json",
	"tictactoe-teams-s7.json",
	"tictactoe-teams-solo-s7.json",
];

const gameOf = (oracle: Oracle) => tictactoeGame(VARIANTS[oracle.variant]);

describe("tictactoe against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, gameOf(oracle), 3, { renamed: RENAMED })).toEqual([]);
	});
});
