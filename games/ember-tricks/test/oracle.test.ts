// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its oracles: the four files of `oracles/ember-tricks/` are played from their inputs under the
 * game's own scheduler and compared at level 3 (rules, texts, scheduling); the two cut files up to their cut. The old
 * name grammar is not carried: `VARIANTS` of the support holds the params behind each `variant` of a file. The fifth
 * file of the plan (addition 11, the no-brain arm) was not recorded: its first test failed (`oracles/ember-tricks/README.md`).
 * No mapping of `call.endsTurn` is needed: no tool of trick play ends a turn, old or new.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "ember-tricks");

const FILES = ["ember-tricks-calib-g4-s32.json", "ember-tricks-g1-s31.json", "ember-tricks-mcbid-g4-s32.json", "ember-tricks-s13-silent.json"];

const gameOf = (oracle: Oracle) => arm(VARIANTS[oracle.variant]);

describe("Ember Tricks against its oracles", () => {
	it("knows every oracle file of the folder and the params of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	});

	it("tells the levers apart: the bid-aid file played on the calibration arm differs from its setup on", async () => {
		const oracle = readOracle(join(ORACLES, "ember-tricks-mcbid-g4-s32.json"));
		const mismatches = await runOracle(oracle, arm(VARIANTS["ember-tricks-calib-g4"]), 3);
		expect(mismatches.slice(0, 1).map(({ level, at }) => [level, at])).toEqual([[1, "setup"]]);
	});
});
