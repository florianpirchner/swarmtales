// SPDX-License-Identifier: Apache-2.0
/**
 * The game against its oracles: the files of the arms `solo` and `nobrain` and the silent file are played from their
 * inputs under the game's own scheduler and compared at level 3 (rules, texts, scheduling); the cut file up to its
 * cut. The old name grammar is not carried: `VARIANTS` of the support holds the params of the game family behind
 * each `variant` of a file. The files of the crew arm, the aid and hard strikes are issue M4-24's.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "harbor-lights");

const FILES = ["harbor-lights-g1-s103.json", "harbor-lights-g1-s110.json", "harbor-lights-hard-strikes-s13.json", "harbor-lights-nobrain-aid-g1-s103.json", "harbor-lights-nobrain-g1-s103.json", "harbor-lights-nobrain-s37.json", "harbor-lights-s13-silent.json", "harbor-lights-solo-g1-s111.json"];
const SILENT = "harbor-lights-s13-silent.json";
/** The files of the arms `solo` and `nobrain`; the cut one (`-nobrain-s37`) up to its cut. */
const ARMS = ["harbor-lights-nobrain-g1-s103.json", "harbor-lights-nobrain-s37.json", "harbor-lights-solo-g1-s111.json"];

const gameOf = (oracle: Oracle) => arm(VARIANTS[oracle.variant]);

describe("Harbor Lights against its oracles", () => {
	it("knows every oracle file of the folder and the params of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(ARMS)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	});

	// The silent file is the registry default, the crew arm: its quiet chat tools are locked through `ctx.access`
	// (M4-64), and the lock events are written as the old platform wrote them.
	it(`${SILENT}: runOracle at level 3 finds no mismatch`, async () => {
		const oracle = readOracle(join(ORACLES, SILENT));
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	});
});
