// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Finding 4 of the challenger's review of M5 (`docs/M5-REVIEW.md`): section 3.4 of the M5 specification holds
 * addition 3 of issue 11, `cityofkeys-act1-classifier-s7.json`, to level 3 under done-when 2, and no decision row cut
 * it (J310). Played as `oracle.test.ts` plays the other Act I files, it differs at level 1: the setup names the
 * plugin `interpretations`, and the file's `classifier.interpretation` events are not written where the file has
 * them (the harness does not drive the Confessor, J278). Marked `it.fails` so that the check stays green; it turns
 * into `it` when the file matches or its differences are registered changes in `oracles/cityofkeys/README.md`.
 */
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { gameOf, ORACLES, registered } from "./support.ts";

describe("city against addition 3 of issue 11", () => {
	it.fails("cityofkeys-act1-classifier-s7.json: runOracle finds no mismatch at level 3", async () => {
		const oracle = registered(readOracle(join(ORACLES, "cityofkeys-act1-classifier-s7.json")));
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	}, 120_000);
});
