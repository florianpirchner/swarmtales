// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game against its oracles: the six files of `oracles/holdem/`, the decision aid at a mixed table
 * (`holdem-aid-mixed-s7.json`) among them, are played from their inputs under the game's own scheduler and compared
 * at level 3 (rules, texts, scheduling); a cut file up to its cut. The old names are not carried, so this
 * table holds the options behind each `variant` of a file (M4 specification 2.2, rule 9); `carried.test.ts` pins the
 * same table against the old naming.
 *
 * One declared mapping: no file of `oracles/` holds `call.endsTurn`, although `oracles/README.md` names the field and
 * the old mechanic set it on every `act` that passed the turn on or ended the hand (old
 * `mechanics/holdem/src/index.ts`, lines 291 and 292). The flag follows from the reply, which level 2 compares: a
 * reply that tells the caller to "end your turn now" ends it. `withEndsTurn` writes the flag back into the file's call
 * entries before the comparison.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, withEndsTurn as flagged, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { holdemGame } from "../game.ts";
import { endsTurn, VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "holdem");

const FILES = ["holdem-aid-mixed-s7.json", "holdem-hu-s13-silent.json", "holdem-hu-s7.json", "holdem-nobrain-s7.json", "holdem-s11.json", "holdem-s7.json"];

const gameOf = (oracle: Oracle) => holdemGame(VARIANTS[oracle.variant]);

/** The oracle with `endsTurn: true` on every accepted call whose reply tells the caller to end its turn. */
const withEndsTurn = (oracle: Oracle): Oracle => flagged(oracle, endsTurn);

describe("holdem against its oracles", () => {
	it("covers every oracle file of the folder, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual(FILES);
		expect(FILES.map((file) => readOracle(join(ORACLES, file)).variant).filter((variant) => !Object.hasOwn(VARIANTS, variant))).toEqual([]);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(await runOracle(withEndsTurn(oracle), gameOf(oracle), 3)).toEqual([]);
	});

	it("needs the mapping only for the flag: without it the first difference is a call that ends its turn", async () => {
		const oracle = readOracle(join(ORACLES, "holdem-s7.json"));
		const mismatches = await runOracle(oracle, gameOf(oracle), 3);
		const endsTurn = (actual: unknown): unknown => Reflect.get(Object(actual), "endsTurn");
		expect(mismatches.map(({ level, at, actual }) => [level, at, endsTurn(actual)])).toEqual([[2, "call", true]]);
	});

	it("needs the aid seats for the aid's file: without them the setup differs, and the first turn of an aid seat lacks the aid line", async () => {
		const oracle = readOracle(join(ORACLES, "holdem-aid-mixed-s7.json"));
		const mismatches = await runOracle(withEndsTurn(oracle), holdemGame({ brain: false }), 3);
		expect(mismatches.map(({ level, at }) => [level, at])).toEqual([[1, "setup"], [2, "inputs"], [2, "call"]]);
		expect(JSON.stringify(mismatches[1]?.expected)).toContain("Referee's estimate: you win");
		expect(JSON.stringify(mismatches[1]?.actual)).not.toContain("Referee's estimate: you win");
	});
});
