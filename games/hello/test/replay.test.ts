// SPDX-License-Identifier: Apache-2.0
/** The Hello Game replays equal from its log alone: no fake driver takes part in the second run. */
import { fakeDriver, play, replay } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";

describe("the Hello Game, replayed", () => {
	it.each([1, 2, 3])("seed %i: the replay of the log equals the log", async (seed) => {
		const { events } = await play(game, { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		const again = await replay({ game, log: events });
		expect(again.firstDifference).toBeUndefined();
		expect([again.equal, again.log.length]).toEqual([true, events.length]);
	});
});
