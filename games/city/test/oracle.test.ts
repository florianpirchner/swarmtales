// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its oracle files (issues M5-45 and M5-46): `cityofkeys-act1-s7.json`, `cityofkeys-act1-s11.json`
 * and `cityofkeys-burn-s7.json` are played from their inputs under the game's own scheduler with the params of their
 * dials (`setup.definition.effective`) and compared by `runOracle` up to level 3, after the registered changes against
 * the files (`support.ts`, `oracles/cityofkeys/README.md`). The burn file is played by the reduced City of its setup
 * (`burn.ts`); the resumed file is `resumed.test.ts`'s; the Act II files are issue M5-47.
 *
 * No oracle file carries `call.endsTurn`, and no mechanic of the cluster sets it on `legacy` (`12-m5-spec.md` 2.5,
 * rule 3): the flag is `false` on both sides and needs no mapping.
 */
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { BURN } from "./burn.ts";
import { gameOf, ORACLES, registered } from "./support.ts";

const FILES = [
	{ file: "cityofkeys-act1-s7.json", story: undefined },
	{ file: "cityofkeys-act1-s11.json", story: undefined },
	{ file: "cityofkeys-burn-s7.json", story: BURN },
];

describe("city against its oracles", () => {
	it.each(FILES)("$file: runOracle finds no mismatch at level 3", async ({ file, story }) => {
		const oracle = registered(readOracle(join(ORACLES, file)));
		expect(await runOracle(oracle, gameOf(oracle, story), 3)).toEqual([]);
	}, 120_000);
});
