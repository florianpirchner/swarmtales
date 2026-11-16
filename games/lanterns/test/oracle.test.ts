// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its oracles: every file of `oracles/lanterns/` is played from its inputs under the game's own
 * scheduler and compared at level 3 (rules, texts, scheduling); the cut files up to their cut. The old name grammar
 * is not carried, so this table holds the options behind each `variant` of a file (M4 specification 2.2, rule 9),
 * and nothing else does.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { lanternsGame, type LanternsOptions } from "../game.ts";
import { RENAMED } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "lanterns");

/** The variants the oracle files use, with the options that give them. */
export const VARIANTS: Readonly<Record<string, LanternsOptions>> = {
	lanterns: {},
	"lanterns-nobrain": { brain: false },
	"lanterns-g1": { games: 1 },
};

const FILES = ["lanterns-g1-s13-silent.json", "lanterns-nobrain-s67.json", "lanterns-s107.json", "lanterns-s73.json"];

const gameOf = (oracle: Oracle) => lanternsGame(VARIANTS[oracle.variant]);

describe("lanterns against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, gameOf(oracle), 3, { renamed: RENAMED })).toEqual([]);
	});
});
