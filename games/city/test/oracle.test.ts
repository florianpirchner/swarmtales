// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its Act I oracle file (issue M5-45): `cityofkeys-act1-s7.json` is played from its inputs under the
 * game's own scheduler with the params of its dials (`setup.definition.effective`) and compared by `runOracle` up to
 * level 3, after the registered changes against the file (`support.ts`, `oracles/cityofkeys/README.md`).
 *
 * No oracle file carries `call.endsTurn`, and no mechanic of the cluster sets it on `legacy` (`12-m5-spec.md` 2.5,
 * rule 3): the flag is `false` on both sides and needs no mapping. The other City files are issues M5-46 and M5-47.
 */
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { gameOf, ORACLES, registered } from "./support.ts";

describe("city against its oracles", () => {
	it("cityofkeys-act1-s7.json: runOracle finds no mismatch at level 3", async () => {
		const oracle = registered(readOracle(join(ORACLES, "cityofkeys-act1-s7.json")));
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	}, 120_000);
});
