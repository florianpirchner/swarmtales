// SPDX-License-Identifier: Apache-2.0
/**
 * The fake run of liar's dice (`swt run --fake`, M4 specification 2.2, rule 2): the fake driver plays the match to
 * its end through the `sample` of every resident tool, with an accepted call of each tool the game grants.
 */
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game, { liarsDiceGame } from "../game.ts";
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

describe("liar's dice, played by the fake driver", () => {
	it.each([7, 11])("seed %i: ends by the match limit with an accepted call of every granted tool", async (seed) => {
		const { end, events } = await play(game, { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "liars-dice.match" });
		const counts = accepted(events);
		for (const tool of ["viewTable", "bid", "liar", "readBrain", "writeBrain"]) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		expect(refused(events)).toEqual([]);
		expect(ofType(events, "brain_written")).toHaveLength(counts.writeBrain ?? 0);
		expect(ofType(events, "dice_decision_scored").filter((event) => field(event, "missed") === false)).toHaveLength((counts.bid ?? 0) + (counts.liar ?? 0));
	});

	it("heads-up without talk and without a brain: every granted tool is accepted, none refused", async () => {
		const quiet = liarsDiceGame({ seats: 2, talk: false, brain: false, games: 1 });
		const { end, events } = await play(quiet, { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end?.reason).toBe("limit");
		expect(Object.keys(accepted(events)).sort()).toEqual(["bid", "liar", "viewTable"]);
		expect(refused(events)).toEqual([]);
	});
});
