// SPDX-License-Identifier: Apache-2.0
/**
 * The game against its oracles: every file of `oracles/liars-dice/` is played from its inputs under the game's own
 * scheduler and compared at level 3 (rules, texts, scheduling); a cut file up to its cut. The old name grammar is
 * not carried, so this table holds the options behind each `variant` of a file (M4 specification 2.2, rule 9);
 * `carried.test.ts` pins the same table against the old parser.
 *
 * One declared mapping: no file of `oracles/` holds `call.endsTurn`, although `oracles/README.md` names the field and
 * the old mechanic set it on every `bid` and `liar` that passed the turn on (old `mechanics/liars-dice/src/index.ts`,
 * lines 344 and 355). The flag follows from the reply, which level 2 compares: a reply that tells the caller to "end
 * your turn now" ends it. `withEndsTurn` writes the flag back into the file's call entries before the comparison.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, withEndsTurn, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { liarsDiceGame } from "../game.ts";
import { endsTurn, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "liars-dice");

const FILES = ["liars-dice-g1-s13-probes.json", "liars-dice-g1-s13-silent.json", "liars-dice-hu-quiet-g2-d5-s7.json", "liars-dice-nobrain-s7.json", "liars-dice-s11.json", "liars-dice-s7.json"];

const gameOf = (oracle: Oracle) => liarsDiceGame(VARIANTS[oracle.variant]);

describe("liars-dice against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(withEndsTurn(oracle, endsTurn), gameOf(oracle), 3)).toEqual([]);
	});

	it("needs the mapping only for the flag: without it the first difference is a call that ends its turn", async () => {
		const oracle = readOracle(join(ORACLES, "liars-dice-s7.json"));
		const mismatches = await runOracle(oracle, gameOf(oracle), 3);
		const endsTurn = (actual: unknown): unknown => Reflect.get(Object(actual), "endsTurn");
		expect(mismatches.map(({ level, at, actual }) => [level, at, endsTurn(actual)])).toEqual([[2, "call", true]]);
	});
});
