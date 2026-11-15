// SPDX-License-Identifier: Apache-2.0
/** The head of hold'em: the start state fits the state schema, the snapshot round-trips, and a table seats 2 to 10. */
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { HoldemSlice, holdemHead, type HoldemState } from "../src/index.ts";
import { defined } from "./support.ts";

const snapshot = defined(holdemHead.snapshot, "snapshot");
const options = defined(holdemHead.options, "options");

function setupOf(count: number) {
	const residents = Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(2, "0")}`);
	return { options: Value.Parse(options, Value.Default(options, {})), residents, actors: [], seed: 1, rng: () => expect.unreachable("the head draws no random number") };
}

const startWith = (count: number): HoldemState => defined(holdemHead.start?.(setupOf(count)), "start");

describe("holdem head", () => {
	it("starts a state that fits its schema and survives the snapshot", () => {
		const state = startWith(4);
		expect(Value.Check(HoldemSlice, state)).toBe(true);
		expect(state).toMatchObject({ seats: ["A01", "A02", "A03", "A04"], game: 0, scores: { A01: 0, A02: 0, A03: 0, A04: 0 }, running: false, finished: false });
		expect(snapshot.load(snapshot.save(state), setupOf(4))).toEqual(state);
	});

	it("seats 2 to 10 players", () => {
		expect(() => startWith(1)).toThrow(RangeError);
		expect(() => startWith(11)).toThrow("holdem: a table seats 2 to 10 players");
		expect(startWith(2).seats).toHaveLength(2);
		expect(startWith(10).seats).toHaveLength(10);
	});
});
