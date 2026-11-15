// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its oracle files (issue M5-38): each file is played from its inputs under the game's own
 * scheduler with the params of its dials (`setup.definition.effective`) and compared by `runOracle` up to level 3,
 * after the registered changes against the files (`support.ts`, `oracles/whispers/README.md`).
 *
 * No oracle file carries `call.endsTurn`, and no mechanic of the cluster sets it on `legacy` (`12-m5-spec.md` 2.5,
 * rule 3): the flag is `false` on both sides and needs no mapping. `whispers-holdout-s7.json` (addition 1) is issue
 * M5-39's.
 */
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { gameOf, ORACLES, registered } from "./support.ts";

describe("whispers against its oracles", () => {
	it.each(["whispers-s7.json", "whispers-s11.json", "whispers-rumours-s7.json"])("%s: runOracle finds no mismatch at level 3", async (file) => {
		const oracle = registered(readOracle(join(ORACLES, file)));
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	}, 120_000);
});
