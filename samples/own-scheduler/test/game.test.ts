// SPDX-License-Identifier: Apache-2.0
// Test 9 of section 3.7 of the M4 specification: the sample game ends with the same result lines under `turns` and
// under `parallel`, with scripted drivers, though the guesses arrive in another order.
import type { Envelope } from "@swarmtales/contracts";
import { turns } from "@swarmtales/engine";
import { play, replay, scriptedDriver } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import game from "../game.ts";
import { parallel } from "../src/index.ts";

const schedulers = { turns, parallel };
const underTurns = { ...game, scheduler: { id: "turns", options: { activation: "always" } } };

// The guess of each resident in rounds 0, 1 and 2, and how long it thinks first: A01 longest, so under `parallel`
// its guess arrives last.
const GUESSES: Readonly<Record<string, readonly number[]>> = { A01: [2, 9, 5], A02: [7, 4, 5], A03: [5, 1, 8] };
const THINK: Readonly<Record<string, number>> = { A01: 6, A02: 3, A03: 0 };
const guesser = scriptedDriver(async (activation) => {
	const name = activation.actor.replace("resident:", "");
	await new Promise((resolve) => {
		setTimeout(resolve, THINK[name] ?? 0);
	});
	return [{ tool: "guess", params: { number: GUESSES[name]?.[activation.tick] ?? 1 } }];
});

const results = (events: readonly Envelope[]): readonly unknown[] => events.filter((event) => event.type === "round_opened").map((event) => event.payload);
const arrivals = (events: readonly Envelope[]): readonly string[] => events.filter((event) => event.type === "guessed").map((event) => event.actor.replace("resident:", ""));

describe("the sample game in both modes", () => {
	it("ends with the same result lines under turns and under parallel, though the guesses arrive in another order", async () => {
		const straight = await play(underTurns, { schedulers, drivers: { resident: guesser } });
		const raced = await play(game, { schedulers, drivers: { resident: guesser } });
		expect(results(raced.events)).toEqual(results(straight.events));
		expect(raced.end).toEqual(straight.end);
		expect(results(raced.events)).toHaveLength(3);
		expect(results(raced.events).at(-1)).toMatchObject({ winners: ["A01", "A02"], score: { A01: 2, A02: 1, A03: 1 } });
		// Under `parallel` the guess that thinks least arrives first; under `turns` the order of the pass holds.
		expect(arrivals(raced.events).slice(0, 3)).toEqual(["A03", "A02", "A01"]);
		expect(arrivals(straight.events)).not.toEqual(arrivals(raced.events));
	});

	it("refuses a second guess in a round, and the race replays to itself", async () => {
		const twice = scriptedDriver(() => [{ tool: "guess", params: { number: 3 } }, { tool: "guess", params: { number: 4 } }]);
		const { events } = await play(game, { schedulers, drivers: { resident: twice } });
		const refused = events.filter((event) => event.type === "tool_refused" && JSON.stringify(event.payload).includes("ALREADY_GUESSED"));
		expect(refused).toHaveLength(9);
		expect((await replay({ game, log: events, schedulers })).issue).toBeUndefined();
	});
});
