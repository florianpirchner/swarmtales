// SPDX-License-Identifier: Apache-2.0
/**
 * The referee against the five oracle files of nine men's morris: each file is played from its inputs under `turns`
 * inside the test game of `support.ts` and compared at level 3 (rules, texts, scheduling) as it was recorded, with
 * the referee's entry of the setup and every `move_scored` in its place. Nothing is taken out of the expectation
 * (`mechanics/morris/test/oracle.test.ts` takes exactly these lines out).
 */
import { join } from "node:path";
import { readOracle, runOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { scoredGame, type MorrisGameOptions } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "morris-teams");
// Each file with its variant and the number of turns the old referee scored in it.
const FILES: readonly (readonly [string, MorrisGameOptions, number])[] = [
	["morris-teams-s13-silent.json", {}, 6],
	["morris-teams-nobrain-solo-s13.json", { brain: false, teamSize: 1 }, 49],
	["morris-teams-nobrain-solo-vs-engine3-s31.json", { brain: false, teamSize: 1, engineDepth: 3 }, 73],
	["morris-teams-nobrain-solo-vs-engine3-s33.json", { brain: false, teamSize: 1, engineDepth: 3 }, 64],
	["morris-teams-solo-vs-engine3-s33.json", { teamSize: 1, engineDepth: 3 }, 105],
];

describe("morris with its referee against the oracle files", () => {
	it.each(FILES)("%s: runOracle at level 3 finds no mismatch, the referee's lines included", async (file, options, scored) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(oracle.setup.mechanics.map((mechanic) => mechanic.id)).toContain("morris-referee");
		expect(oracle.timeline.filter((entry) => entry.k === "event" && entry.source === "morris-referee" && entry.type === "move_scored")).toHaveLength(scored);
		expect(await runOracle(oracle, scoredGame({ ...options, seed: oracle.seed }), 3)).toEqual([]);
	});
});
