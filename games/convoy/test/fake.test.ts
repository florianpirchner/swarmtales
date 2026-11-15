// SPDX-License-Identifier: Apache-2.0
/**
 * The fake run of Convoy (`swt run --fake`, M4 specification 2.2, rule 2): the fake driver plays the match to its end
 * through the `sample` of every resident tool, with an accepted call of each tool the game grants.
 */
import type { Envelope } from "@swarmtales/contracts";
import { fakeDriver, play } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game, { convoyGame } from "../game.ts";
import { field, ofType } from "./support.ts";

/** How many calls of each tool were carried out, by the tool's bare name. */
function accepted(events: readonly Envelope[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const name of ofType(events, "tool_result").map((event) => event.tool?.split("/").at(-1) ?? "")) counts[name] = (counts[name] ?? 0) + 1;
	return counts;
}

/** The refusal codes of the run, without the limit of calls per tick: the fake driver calls on until its activation ends. */
const refused = (events: readonly Envelope[]): readonly unknown[] => [...new Set(ofType(events, "tool_refused").map((event) => field(event, "code")))].filter((code) => code !== "STEP_LIMIT");

const TOOLS = ["viewConvoy", "proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse"];

describe("convoy, played by the fake driver", () => {
	it("seed 7: ends by the match limit with an accepted call of every granted tool", async () => {
		const { end, events } = await play(game, { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "convoy.match" });
		const counts = accepted(events);
		for (const tool of [...TOOLS, "readBrain", "writeBrain"]) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		expect(refused(events)).toEqual([]);
		expect(ofType(events, "brain_written")).toHaveLength(counts.writeBrain ?? 0);
		expect(ofType(events, "convoy_game_ended")).toHaveLength(3);
	});

	it("one game without a brain: every granted tool is accepted, none refused", async () => {
		const { end, events } = await play(convoyGame({ brain: false, games: 1 }), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "convoy.match" });
		expect(Object.keys(accepted(events)).sort()).toEqual([...TOOLS].sort());
		expect(refused(events)).toEqual([]);
	});
});
