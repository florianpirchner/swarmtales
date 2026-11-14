// SPDX-License-Identifier: Apache-2.0
/** The `sample` of `transferPoints`: what the fake driver (`--fake`) may call. Now and then, 1 to 5 points that the balance covers, to another resident that may act. */
import { describe, expect, it } from "vitest";
import type { RandomSource } from "@swarmtales/contracts";
import { testKernel } from "@swarmtales/testkit";
import { ledgerGame } from "./support.ts";

/** A random source with a fixed `next` that takes the highest integer and notes every list it picks the first item of. */
function fixed(next: number, draws: unknown[][] = []): RandomSource {
	const pick = <T>(items: readonly T[]): T => {
		draws.push([...items]);
		const item = items[0];
		if (item === undefined) throw new RangeError("an empty draw");
		return item;
	};
	return { next: () => next, int: (_min, max) => max, pick, shuffle: (items) => [...items] };
}

describe("the sample of transferPoints", () => {
	it("gives a transfer one time in eight, to a resident that may act, of at most 5 points and never more than the balance, and writes nothing", async () => {
		const test = testKernel(ledgerGame());
		const draws: unknown[][] = [];
		const sample = (next: number): unknown => test.kernel.sample("resident:A01", "transferPoints", fixed(next, draws));
		expect([sample(0.125), sample(0.9)]).toEqual([undefined, undefined]);
		// A04 is exiled (the stand-in suspends it) and A01 is the caller: neither is drawn.
		expect(sample(0.124)).toEqual({ target: "A02", amount: 5 });
		expect(draws).toEqual([["A02", "A03"]]);
		expect(await test.call("A01", "transferPoints", { target: "A02", amount: 8 })).toMatchObject({ ok: true });
		const lines = test.kernel.log.all().length;
		const most = sample(0);
		expect(most).toEqual({ target: "A02", amount: 2 });
		expect(await test.call("A01", "transferPoints", most)).toMatchObject({ ok: true });
		expect(test.kernel.log.all().length).toBeGreaterThan(lines);
		expect(sample(0)).toBeUndefined();
		expect(test.kernel.sample("resident:A04", "transferPoints", fixed(0))).toEqual({ target: "A01", amount: 5 });
	});
});
