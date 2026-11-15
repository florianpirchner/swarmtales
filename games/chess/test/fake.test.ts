// SPDX-License-Identifier: Apache-2.0
/**
 * The fake run of chess (`swt run --fake`, M4 specification 2.2, rule 2): the fake driver plays the match to its end
 * through the `sample` of every resident tool, with an accepted call of each tool the game grants.
 */
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game, { chessGame } from "../game.ts";
import { field, ofType } from "./support.ts";

type Logged = Played["events"][number];

/** How many calls of each tool were carried out, by the tool's bare name. */
function accepted(events: readonly Logged[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const name of ofType(events, "tool_result").map((event) => event.tool?.split("/").at(-1) ?? "")) counts[name] = (counts[name] ?? 0) + 1;
	return counts;
}

/** The refusal codes of the run, without the limit of calls per tick: the fake driver calls on until its activation ends. */
const refused = (events: readonly Logged[]): readonly unknown[] => [...new Set(ofType(events, "tool_refused").map((event) => field(event, "code")))].filter((code) => code !== "STEP_LIMIT");

/**
 * Open: the brain tools the fake driver cannot reach today. The fake driver calls the first open tool that gives a
 * sample, in grant order, and `viewBoard` (granted first) samples whenever the caller is not on move, so in a retro
 * window a seat looks at the board until its calls of the tick run out and the window closes by timeout. The fix
 * belongs to the `sample` of `viewBoard` in `mechanics/chess/src/index.ts`; the list goes with it (the test fails
 * when a brain tool is reached).
 */
const UNREACHED = ["readBrain", "writeBrain"];

describe("chess, played by the fake driver", () => {
	it.each([7, 11])("seed %i: ends by the match limit with an accepted call of every granted tool it can reach", async (seed) => {
		const { end, events } = await play(game, { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "chess.match" });
		const counts = accepted(events);
		for (const tool of ["viewBoard", "playMove", "resign"]) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		expect(UNREACHED.filter((tool) => counts[tool] !== undefined)).toEqual([]);
		expect(ofType(events, "retro_closed").map((event) => field(event, "reason"))).toEqual(["timeout", "timeout", "timeout", "timeout"]);
		expect(refused(events)).toEqual([]);
		expect(ofType(events, "game_ended")).toHaveLength(2);
		expect(ofType(events, "move_played").filter((event) => field(event, "forfeit") === false)).toHaveLength(counts.playMove ?? 0);
	});

	it("with a fresh context and the compact board: the match ends and no call is refused", async () => {
		const { end, events } = await play(chessGame({ fresh: true, compact: true, games: 1, maxPlies: 80 }), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "chess.match" });
		expect(refused(events)).toEqual([]);
		expect(ofType(events, "game_ended")).toHaveLength(1);
	});
});
