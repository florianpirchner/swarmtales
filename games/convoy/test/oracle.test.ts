// SPDX-License-Identifier: Apache-2.0
/**
 * The game against its oracles: the four files of `oracles/convoy/` are played from their inputs under the game's own
 * scheduler and compared at level 3 (rules, texts, scheduling); a cut file up to its cut. The old names are not
 * carried, so `VARIANTS` holds the options behind each `variant` of a file (M4 specification 2.2, rule 9).
 *
 * No mapping of `call.endsTurn` is needed: the old mechanic never set the flag (no tool of `mechanics/convoy` of the
 * old platform ends a turn), so the files and today's calls agree on its absence.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { convoyGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "convoy");
const FILES = ["convoy-g1-s13-silent.json", "convoy-nobrain-s104.json", "convoy-s101.json", "convoy-s104.json"];

describe("convoy against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, convoyGame(VARIANTS[oracle.variant]), 3)).toEqual([]);
	});
});
