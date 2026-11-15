// SPDX-License-Identifier: Apache-2.0
/**
 * The game against its oracles: the five files of `oracles/holdem/` without the aid are played from their inputs
 * under the game's own scheduler and compared at level 3 (rules, texts, scheduling); a cut file up to its cut. The
 * file of the aid at a mixed table (`holdem-aid-mixed-s7.json`) is M4-40's. The old names are not carried, so this
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
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { holdemGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "holdem");

const FILES = ["holdem-hu-s13-silent.json", "holdem-hu-s7.json", "holdem-nobrain-s7.json", "holdem-s11.json", "holdem-s7.json"];
/** The file of the decision aid at a mixed table, played by M4-40. */
const LATER = ["holdem-aid-mixed-s7.json"];

const gameOf = (oracle: Oracle) => holdemGame(VARIANTS[oracle.variant]);

const ENDS_TURN = /end your turn now/i;
/** The oracle with `endsTurn: true` on every accepted call whose reply tells the caller to end its turn. */
const withEndsTurn = (oracle: Oracle): Oracle => ({ ...oracle, timeline: oracle.timeline.map((entry) => (entry.k === "call" && entry.ok && ENDS_TURN.test(entry.reply ?? "") ? { ...entry, endsTurn: true } : entry)) });

describe("holdem against its oracles", () => {
	it("covers every oracle file of the folder but the aid's, each with the options of its variant", () => {
		expect(readdirSync(ORACLES).filter((file) => file.endsWith(".json")).sort()).toEqual([...LATER, ...FILES].sort());
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
});
