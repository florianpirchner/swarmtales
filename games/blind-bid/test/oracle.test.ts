// SPDX-License-Identifier: Apache-2.0
/**
 * The game against its oracles: the five files of `oracles/blind-bid/` are played from their inputs under the game's
 * own scheduler and compared at level 3 (rules, texts, scheduling). The old names are not carried, so the table of
 * `support.ts` holds the options behind each `variant` of a file (M4 specification 2.2, rule 9).
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { blindBidGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "blind-bid");

const FILES = ["blind-bid-nobrain-s7.json", "blind-bid-s11.json", "blind-bid-s13-silent.json", "blind-bid-s31-live.json", "blind-bid-s7.json"];

const gameOf = (oracle: Oracle) => blindBidGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });

describe("blind-bid against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(oracle, gameOf(oracle), 3)).toEqual([]);
	});

	it("finds the difference when a file is played with the other arm or another lot order", async () => {
		const oracle = readOracle(join(ORACLES, "blind-bid-nobrain-s7.json"));
		expect((await runOracle(oracle, blindBidGame({ seed: 7 }), 3)).map(({ level, at }) => [level, at])).toContainEqual([1, "setup"]);
		const brain = readOracle(join(ORACLES, "blind-bid-s7.json"));
		expect(await runOracle(brain, blindBidGame({ seed: 7, lots: ["common", "first-price", "second-price", "first-price", "common", "second-price"] }), 3)).not.toEqual([]);
	});
});
