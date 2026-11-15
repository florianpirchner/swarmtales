// SPDX-License-Identifier: Apache-2.0
/**
 * The fake run of Lanterns (`swt run --fake`, M4 specification 2.2 rule 2 and 4.11): the fake driver plays the match
 * to its end through the `sample` of every resident tool that a fake run can reach.
 */
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game, { lanternsGame } from "../game.ts";

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

const TOOLS = ["viewGrid", "giveClue", "guess", "endGuesses", "postTeam", "readTeam", "readBrain", "writeBrain"];

describe("Lanterns, played by the fake driver", () => {
	it.each([7, 11])("seed %i: ends by the match limit with an accepted call of every resident tool", async (seed) => {
		const { end, events } = await play(game, { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "clue-grid.match" });
		const counts = accepted(events);
		for (const tool of TOOLS) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		expect(ofType(events, "clue_game_ended")).toHaveLength(4);
		expect(ofType(events, "clue_given")).toHaveLength(counts.giveClue ?? 0);
		expect(ofType(events, "brain_written")).toHaveLength(counts.writeBrain ?? 0);
		expect(refused(events)).toEqual([]);
	});

	it("without a brain ends the match the same way, with no brain tool granted", async () => {
		const { end, events } = await play(lanternsGame({ brain: false }), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "clue-grid.match" });
		const counts = accepted(events);
		for (const tool of TOOLS.slice(0, 6)) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		expect([counts.readBrain, counts.writeBrain]).toEqual([undefined, undefined]);
	});
});
