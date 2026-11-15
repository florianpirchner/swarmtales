// SPDX-License-Identifier: Apache-2.0
/**
 * The mechanic against the four oracle files of Convoy, inside the test game of `support.ts`: each file is played
 * from its inputs under `turns` and compared at level 3 (rules, texts, scheduling). The game with its briefing
 * belongs to the game issue.
 */
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { convoyGame } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "convoy");
const FILES: readonly (readonly [string, number, boolean])[] = [
	["convoy-g1-s13-silent.json", 1, true],
	["convoy-s101.json", 3, true],
	["convoy-s104.json", 3, true],
	["convoy-nobrain-s104.json", 3, false],
];

describe("convoy against its oracle files", () => {
	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file, games, brain) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, convoyGame({ games }, { seed: oracle.seed, brain, order: "seeded" }), 3)).toEqual([]);
	});
});
