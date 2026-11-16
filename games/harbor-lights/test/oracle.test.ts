// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its oracles: every file of the folder (the three arms, the aid, hard strikes and the silent file) is
 * played from its inputs under the game's own scheduler and compared at level 3 (rules, texts, scheduling); the cut
 * file up to its cut. The old name grammar is not carried: `VARIANTS` of the support holds the params of the game
 * family behind each `variant` of a file.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm, RENAMED, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "harbor-lights");

const FILES = ["harbor-lights-g1-s103.json", "harbor-lights-g1-s110.json", "harbor-lights-hard-strikes-s13.json", "harbor-lights-nobrain-aid-g1-s103.json", "harbor-lights-nobrain-g1-s103.json", "harbor-lights-nobrain-s37.json", "harbor-lights-s13-silent.json", "harbor-lights-solo-g1-s111.json"];

const gameOf = (oracle: Oracle) => arm(VARIANTS[oracle.variant]);

describe("Harbor Lights against its oracles", () => {
	it("knows every oracle file of the folder and the params of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	// The crew files and the silent file (the registry default) lock the quiet chat tools through `ctx.access` (M4-64),
	// which writes the lock events as the old platform wrote them; the cut file (`-nobrain-s37`) is compared up to its cut.
	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, gameOf(oracle), 3, { renamed: RENAMED })).toEqual([]);
	});
});
