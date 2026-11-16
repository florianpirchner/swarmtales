// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The fake run of the Econ Lab (`swt run --fake`, M4 specification 4.11): the fake driver plays the three games to
 * the end through the `sample` of every resident tool, each decision by the seat that owes it.
 */
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { econLabGame } from "../game.ts";

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

describe("the Econ Lab, played by the fake driver", () => {
	it("ends by the match limit with an accepted call of every tool, and no decision is refused or missed", async () => {
		const { end, events } = await play(econLabGame(), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "econ-lab.match" });
		const counts = accepted(events);
		for (const tool of ["viewTable", "contribute", "offer", "respond", "choose", "readBrain", "writeBrain"]) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		// Every decision of the log is a call of the fake driver: no round ran to its deadline.
		expect(ofType(events, "decision_made")).toHaveLength((counts.contribute ?? 0) + (counts.offer ?? 0) + (counts.respond ?? 0) + (counts.choose ?? 0));
		expect(ofType(events, "round_resolved").filter((event) => JSON.stringify(event.payload).includes('"missed":true'))).toEqual([]);
		expect(refused(events)).toEqual([]);
	});
});
