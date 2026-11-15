// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its oracles: every file of `oracles/quarry/` is played from its inputs under the game's own
 * scheduler and compared at level 3 (rules, texts, scheduling); the cut file up to its cut. The old name grammar is
 * not carried, so this table holds the params of the game family behind each `variant` of a file (specification of
 * M2, section 7.2), and nothing else does.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { arm } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "quarry");

const VARIANTS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
	quarry: {},
	"quarry-nobrain": { brain: false },
	"quarry-open": { openHands: true },
	"quarry-burn": { burns: true },
};

const FILES = ["quarry-burn-s13-probes.json", "quarry-nobrain-s41.json", "quarry-open-s59.json", "quarry-s13-silent.json", "quarry-s41.json", "quarry-s61.json"];

const gameOf = (oracle: Oracle) => arm(VARIANTS[oracle.variant]);

describe("quarry against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	});
});
