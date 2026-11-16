// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The fake run of nine men's morris (`swt run --fake`, M4 specification 2.2, rule 2): the fake driver plays the match
 * to its end through the `sample` of every resident tool, with an accepted call of each tool the game grants, and the
 * captain plays the move its team agreed on.
 */
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { morrisGame } from "../game.ts";
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

const TOOLS = ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", "readBrain", "writeBrain"];

describe("nine men's morris, played by the fake driver", () => {
	it.each([7, 11])("seed %i: ends by the match limit with an accepted call of every granted tool, every played move agreed", async (seed) => {
		const { end, events } = await play(morrisGame(), { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "morris.match" });
		const counts = accepted(events);
		for (const tool of TOOLS) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		expect(refused(events)).toEqual([]);
		expect(ofType(events, "game_ended")).toHaveLength(3);
		expect(ofType(events, "move_played").filter((event) => field(event, "forfeit") === false)).toHaveLength(counts.playMove ?? 0);
		expect(ofType(events, "consensus_reached").length).toBeGreaterThanOrEqual(counts.playMove ?? 0);
	});

	it("one resident against the search: the match ends and no call is refused", async () => {
		const { end, events } = await play(morrisGame({ teamSize: 1, engineDepth: 2, games: 1 }), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "morris.match" });
		expect(refused(events)).toEqual([]);
		expect(ofType(events, "move_played").filter((event) => field(event, "side") === "O").every((event) => field(event, "by") === "engine")).toBe(true);
	});
});
