// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The fake run of Quarry (`swt run --fake`, M4 specification 4.11): the fake driver plays the match to its end
 * through the `sample` of every resident tool; with burns allowed its picks burn a card now and then.
 */
import { fakeDriver, play, type Played } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { quarryGame } from "../game.ts";

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

describe("Quarry, played by the fake driver", () => {
	it("ends by the match limit with an accepted call of every tool, and every pick is made by its seat", async () => {
		const { end, events } = await play(quarryGame(), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end).toMatchObject({ reason: "limit", limit: "quarry.match" });
		const counts = accepted(events);
		for (const tool of ["viewTable", "readBrain", "writeBrain"]) expect(counts[tool] ?? 0, tool).toBeGreaterThan(0);
		// Four seats, three games, two packs of six cards: every pick is a call, none is taken by the deadline.
		expect(counts.pick).toBe(144);
		expect(ofType(events, "draft_card_picked").filter((event) => field(event, "missed") === true)).toEqual([]);
		expect(refused(events)).toEqual([]);
	});

	it("with burns allowed some picks burn a second card, and none is refused", async () => {
		const { end, events } = await play(quarryGame({ burns: true }), { seed: 7, drivers: (kernel) => ({ resident: fakeDriver(kernel, 7) }) });
		expect(end?.reason).toBe("limit");
		expect(ofType(events, "draft_card_picked").filter((event) => field(event, "burned") !== undefined).length).toBeGreaterThan(4);
		expect(refused(events)).toEqual([]);
	});
});
