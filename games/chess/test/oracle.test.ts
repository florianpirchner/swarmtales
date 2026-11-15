// SPDX-License-Identifier: Apache-2.0
/**
 * The game against the five oracle files of the default, the fresh context and the compact board: each file is
 * played from its inputs under the game's own scheduler and compared at level 3 (rules, texts, scheduling); a cut
 * file up to its cut. The other seven files of `oracles/chess/` are those of the variants (the lists, the threats,
 * the coach, the teams, no brain, the cap). The old name grammar is not carried, so `VARIANTS` holds the options
 * behind each `variant` of a file (M4 specification 2.2, rule 9); `carried.test.ts` pins it against the old parser.
 *
 * One declared mapping, as for liar's dice: no file of `oracles/` holds `call.endsTurn`, although the old mechanic
 * set it on every accepted `playMove` and `resign` (old `mechanics/chess/src/index.ts`, lines 449 and 578), and so
 * does the port. `withEndsTurn` writes the flag back into those call entries before the comparison.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readOracle, runOracle, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { chessGame } from "../game.ts";
import { VARIANTS } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "chess");

const FILES = ["chess-compact-g4-p80-s41.json", "chess-fresh-compact-g4-p80-s47.json", "chess-g4-p80-s41.json", "chess-s13-silent.json", "chess-s13.json"];

const gameOf = (oracle: Oracle) => chessGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });

const ENDS_TURN = new Set(["playMove", "resign"]);
/** The oracle with `endsTurn: true` on every accepted `playMove` and `resign`. */
const withEndsTurn = (oracle: Oracle): Oracle => ({ ...oracle, timeline: oracle.timeline.map((entry) => (entry.k === "call" && entry.ok && ENDS_TURN.has(entry.tool) ? { ...entry, endsTurn: true } : entry)) });

describe("chess against its oracles", () => {
	it("covers every file of the folder whose variant this game carries, each with the options of its variant", () => {
		const files = readdirSync(ORACLES).filter((file) => file.endsWith(".json"));
		expect(files.filter((file) => Object.hasOwn(VARIANTS, readOracle(join(ORACLES, file)).variant)).sort()).toEqual(FILES);
		expect(files).toHaveLength(12);
	});

	it.each(FILES)("%s: runOracle at level 3 finds no mismatch", async (file) => {
		const oracle = readOracle(join(ORACLES, file));
		expect(oracle.timeline.some((entry) => entry.k === "call" && entry.endsTurn === true)).toBe(false);
		expect(await runOracle(withEndsTurn(oracle), gameOf(oracle), 3)).toEqual([]);
	});

	it("needs the mapping only for the flag: without it the first difference is a call that ends its turn", async () => {
		const oracle = readOracle(join(ORACLES, "chess-s13.json"));
		const mismatches = await runOracle(oracle, gameOf(oracle), 3);
		const endsTurn = (actual: unknown): unknown => Reflect.get(Object(actual), "endsTurn");
		expect(mismatches.map(({ level, at, actual }) => [level, at, endsTurn(actual)])).toEqual([[2, "call", true]]);
	});
});
