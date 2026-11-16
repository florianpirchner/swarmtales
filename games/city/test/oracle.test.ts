// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its Act I oracle file (issue M5-45): `cityofkeys-act1-s7.json` is played from its inputs under the
 * game's own scheduler with the params of its dials (`setup.definition.effective`) and compared by `runOracle` up to
 * level 3, after the registered changes against the file (`support.ts`, `oracles/cityofkeys/README.md`).
 *
 * No oracle file carries `call.endsTurn`, and no mechanic of the cluster sets it on `legacy` (`12-m5-spec.md` 2.5,
 * rule 3): the flag is `false` on both sides and needs no mapping. The other City files are issues M5-46 and M5-47.
 *
 * One defect is pinned, not registered (erratum of M5-45): the `goal` status part of `goals` shows the target's id
 * where `legacy` showed its name (the notice of the deal shows the name). The fix is in `mechanics/goals`; when it
 * lands, this test fails and the pin goes.
 */
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { gameOf, ORACLES, registered } from "./support.ts";

// The status input lists with the goal part left out.
const withoutGoal = (inputs: unknown): string => JSON.stringify(inputs).replace(/ · your goal: [^·"]*/g, "");

describe("city against its oracles", () => {
	it("cityofkeys-act1-s7.json: runOracle finds no mismatch at level 3 but the pinned goal status name", async () => {
		const oracle = registered(readOracle(join(ORACLES, "cityofkeys-act1-s7.json")));
		const found = await runOracle(oracle, gameOf(oracle), 3);
		expect(found.map((mismatch) => mismatch.at)).toEqual(["inputs"]);
		expect(found.map((mismatch) => withoutGoal(mismatch.actual))).toEqual(found.map((mismatch) => withoutGoal(mismatch.expected)));
		expect(JSON.stringify(found[0]?.actual)).toContain("your goal: A03 is still in the city");
		expect(JSON.stringify(found[0]?.expected)).toContain("your goal: Slate-7306 is still in the city");
	}, 120_000);
});
