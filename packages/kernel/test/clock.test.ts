// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { describe, expect, it } from "vitest";
import { createClock } from "../src/clock.ts";

describe("the clock", () => {
	it("starts at tick 0 and advances by one", () => {
		const clock = createClock();
		expect(clock.tick).toBe(0);
		clock.advance();
		clock.advance();
		expect(clock.tick).toBe(2);
	});

	it("takes the due jobs once, in the order they were scheduled, and keeps the later ones", () => {
		const clock = createClock();
		clock.at("b", 2, "late");
		clock.at("a", 1, "early", { n: 1 });
		clock.at("b", 3, "later");
		clock.at("a", 2, "due");
		expect(clock.take(0)).toEqual([]);
		expect(clock.take(2)).toEqual([
			{ id: 1, owner: "b", job: "late", next: 2 },
			{ id: 2, owner: "a", job: "early", next: 1, data: { n: 1 } },
			{ id: 4, owner: "a", job: "due", next: 2 },
		]);
		expect(clock.take(2)).toEqual([]);
		expect(clock.state()).toEqual([{ id: 3, owner: "b", job: "later", next: 3 }]);
	});

	it("refuses a tick in the past and a tick that is no integer; the running tick is taken", () => {
		const clock = createClock();
		clock.advance();
		clock.advance();
		expect(() => {
			clock.at("a", 1, "job");
		}).toThrow(RangeError);
		expect(() => {
			clock.at("a", 2.5, "job");
		}).toThrow(RangeError);
		expect(clock.state()).toEqual([]);
		clock.at("a", 2, "job");
		expect(clock.state()).toHaveLength(1);
	});

	it("runs a job for the running tick, scheduled after its jobs were taken, at the next tick", () => {
		const clock = createClock();
		expect(clock.take(clock.tick)).toEqual([]);
		clock.at("a", 0, "job");
		clock.advance();
		expect(clock.take(clock.tick).map((job) => job.job)).toEqual(["job"]);
	});

	it("restores the tick and the queue, in scheduling order, and numbers on from the highest id", () => {
		const clock = createClock();
		clock.restore(5, [
			{ id: 9, owner: "b", job: "second", next: 6 },
			{ id: 4, owner: "a", job: "first", next: 6 },
		]);
		expect(clock.tick).toBe(5);
		clock.at("c", 6, "third");
		expect(clock.take(6).map((job) => [job.id, job.job])).toEqual([[4, "first"], [9, "second"], [10, "third"]]);
		const state = clock.state();
		clock.at("c", 7, "kept apart");
		expect(state).toEqual([]);
	});
});
