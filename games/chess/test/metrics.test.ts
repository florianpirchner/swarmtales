// SPDX-License-Identifier: Apache-2.0
/**
 * The metrics of `chess` over the new log of an oracle replay (M4 specification, issue 32): each equals the number
 * computed by hand from the same oracle file, and a metric without its events is absent, never 0.
 */
import { join } from "node:path";
import { readOracle, timelineOf, type Oracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { chessGame } from "../game.ts";
import { metricsOf, replay, VARIANTS, withEndsTurn } from "./support.ts";

const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "chess");

type Row = readonly [file: string, plies: number, refused: number];

/**
 * Read by hand in each oracle file: its `move_played` entries (forfeit moves included) and its `move_refused` entries.
 * The three live files are cut after game 1; in the silent file all eight half-moves are forfeit moves.
 */
const HAND: readonly Row[] = [
	["chess-compact-g4-p80-s41.json", 44, 1],
	["chess-fresh-compact-g4-p80-s47.json", 73, 3],
	["chess-g4-p80-s41.json", 74, 2],
	["chess-moves-coach-s13.json", 11, 0],
	["chess-moves-s13.json", 8, 2],
	["chess-nobrain-s13.json", 8, 2],
	["chess-p12-s13.json", 24, 0],
	["chess-s13-silent.json", 8, 0],
	["chess-s13.json", 8, 2],
	["chess-settle-p12-s13.json", 24, 0],
	["chess-teams-s13.json", 11, 0],
	["chess-threats-s13.json", 11, 0],
];

// The file's events of one type, in file order.
const eventsIn = (oracle: Oracle, type: string) => oracle.timeline.filter((entry) => entry.k === "event" && entry.type === type);
// The plies of the file's `game_ended` entries, summed: the half-moves of every game the file finished.
const endedPlies = (oracle: Oracle): number => oracle.timeline.reduce((total, entry) => total + (entry.k === "event" && entry.type === "game_ended" ? Number(Reflect.get(Object(entry.payload), "plies")) : 0), 0);

describe("the metrics of chess over an oracle replay", () => {
	it.each(HAND)("%s: every metric equals the number read by hand in the file", async (file, plies, refused) => {
		const oracle = readOracle(join(ORACLES, file));
		const game = chessGame({ ...VARIANTS[oracle.variant], seed: oracle.seed });
		const events = await replay(oracle, game);
		// The replay is the run of the file: its timeline is the file's (a cut file up to its cut).
		expect(timelineOf(events).slice(0, oracle.timeline.length)).toEqual(withEndsTurn(oracle).timeline);
		expect([eventsIn(oracle, "move_played").length, eventsIn(oracle, "move_refused").length, endedPlies(oracle)]).toEqual([plies, refused, plies]);
		expect(metricsOf(game, "chess", events)).toEqual({ plies, refusedMoves: refused });
	});

	it("reads absent, not 0, for every metric of a run without its events", async () => {
		const oracle = readOracle(join(ORACLES, "chess-s13.json"));
		const game = chessGame({ seed: oracle.seed });
		// The same run stopped before its first tick: no move was played.
		const events = await replay({ ...oracle, truncated: { afterMinute: -1, reason: "no tick" } }, game);
		expect(events.length).toBeGreaterThan(0);
		expect(metricsOf(game, "chess", events)).toEqual({ plies: "absent", refusedMoves: "absent" });
	});
});
