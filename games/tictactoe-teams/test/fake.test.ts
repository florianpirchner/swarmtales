// SPDX-License-Identifier: Apache-2.0
/**
 * The fake run of tic-tac-toe teams (`swt run --fake`, M4 specification 4.11): the fake driver plays the match to
 * its end through the `sample` of every resident tool, and the captain plays the cell its team agreed on.
 */
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";

type Logged = Played["events"][number];

const field = (event: Logged, name: string): unknown => Reflect.get(Object(event.payload), name);
const ofType = (events: readonly Logged[], type: string): readonly Logged[] => events.filter((event) => event.type === type);

/** How many calls of each tool were carried out, by the tool's bare name. */
function accepted(events: readonly Logged[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const name of ofType(events, "tool_result").map((event) => event.tool?.split("/").at(-1) ?? "")) counts[name] = (counts[name] ?? 0) + 1;
	return counts;
}

/** The refusal codes of the run, without the limit of calls per tick: the fake driver calls on until its activation ends. */
const refused = (events: readonly Logged[]): readonly unknown[] => [...new Set(ofType(events, "tool_refused").map((event) => field(event, "code")))].filter((code) => code !== "STEP_LIMIT");

describe("tic-tac-toe teams, played by the fake driver", () => {
	it.each([7, 11])("seed %i: ends by the match limit with an accepted call of every tool, and every played move is the agreed one", async (seed) => {
		const { end, events } = await play(game, { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "grid-game.match" });
		const counts = accepted(events);
		for (const tool of ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", "readBrain", "writeBrain"]) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		// No call runs into the gate (`NO_CONSENSUS`, `CONSENSUS_MISMATCH`) or into a rule of its own tool.
		expect(refused(events)).toEqual([]);
		expect(ofType(events, "move_played").filter((event) => field(event, "forfeit") === false)).toHaveLength(counts.playMove ?? 0);
		expect(ofType(events, "consensus_reached").length).toBeGreaterThanOrEqual(counts.playMove ?? 0);
		expect(ofType(events, "brain_written")).toHaveLength(counts.writeBrain ?? 0);
	});
});
