// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its five oracle files: each file is played from its inputs under the game's own scheduler, with
 * the Referee loaded, and compared at level 3 (rules, texts, scheduling); the cut file up to its cut. The old name
 * grammar is not carried, so `VARIANTS` holds the options behind each `variant` of a file (M4 specification 2.2,
 * rule 9); `carried.test.ts` pins it against the old parser.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { morrisGame } from "../game.ts";
import { RENAMED, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "morris-teams");

const FILES = ["morris-teams-nobrain-solo-s13.json", "morris-teams-nobrain-solo-vs-engine3-s31.json", "morris-teams-nobrain-solo-vs-engine3-s33.json", "morris-teams-s13-silent.json", "morris-teams-solo-vs-engine3-s33.json"];

const gameOf = (oracle: Oracle) => morrisGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });

describe("nine men's morris against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, gameOf(oracle), 3, { renamed: RENAMED })).toEqual([]);
	});
});
