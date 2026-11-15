// SPDX-License-Identifier: Apache-2.0
/**
 * The game against its oracles: the four files of `oracles/salt-market/` are played from their inputs under the
 * game's own scheduler and compared at level 3 (rules, texts, scheduling); a cut file up to its cut. The old names are
 * not carried, so `VARIANTS` holds the options behind each `variant` of a file (M4 specification 2.2, rule 9).
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { saltMarketGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "salt-market");
const FILES = ["salt-market-nobrain-s45.json", "salt-market-s13-silent.json", "salt-market-s45.json", "salt-market-s46.json"];

describe("salt-market against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, saltMarketGame(VARIANTS[oracle.variant]), 3)).toEqual([]);
	});
});
