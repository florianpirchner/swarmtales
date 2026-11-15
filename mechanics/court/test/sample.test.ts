// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The `sample` of `vote`: what the fake driver (`--fake`) may call. One vote per resident and session, never against itself or a banished resident, and a resident that has votes against it is drawn more often. */
import { describe, expect, it } from "vitest";
import type { RandomSource } from "@swarmtales/contracts";
import { defineGame } from "@swarmtales/sdk";
import { idleDriver, testKernel } from "@swarmtales/testkit";
import { channels } from "@swarmtales/mechanic-channels";
import { decisions } from "@swarmtales/mechanic-decisions";
import { exile } from "@swarmtales/mechanic-exile";
import { court } from "../src/index.ts";

/** A random source that picks the last item and notes every list it was given. */
function last(draws: unknown[][]): RandomSource {
	const pick = <T>(items: readonly T[]): T => {
		draws.push([...items]);
		const item = items.at(-1);
		if (item === undefined) throw new RangeError("an empty draw");
		return item;
	};
	return { next: () => 0, int: (_min, max) => max, pick, shuffle: (items) => [...items] };
}

describe("the sample of vote", () => {
	it("gives a vote only in the open session and only once, draws a named resident more often, leaves out a banished one and writes nothing", async () => {
		const test = testKernel(defineGame({ id: "court-sample", seed: 7, residents: 4, mechanics: [channels(), exile(), decisions({ holders: ["human"] }), court({ opensAt: 1, closesAt: 3, window: 0 })], scheduler: { id: "turns", options: { order: "roster" } }, end: { ticks: 6 } }));
		const draws: unknown[][] = [];
		const sample = (resident: string): unknown => test.kernel.sample(`resident:${resident}`, "vote", last(draws));
		expect(sample("A01")).toBeUndefined();
		await test.playTicks(idleDriver, 2);
		expect(sample("A01")).toEqual({ target: "A04" });
		expect(await test.call("A01", "vote", { target: "A03" })).toMatchObject({ ok: true });
		expect(await test.call("A02", "vote", { target: "A03" })).toMatchObject({ ok: true });
		const lines = test.kernel.log.all().length;
		expect([sample("A01"), sample("A02"), sample("A04"), sample("A03")]).toEqual([undefined, undefined, { target: "A03" }, { target: "A04" }]);
		expect(draws).toEqual([["A02", "A03", "A04"], ["A01", "A02", "A03", "A03", "A03"], ["A01", "A02", "A04"]]);
		expect(test.kernel.log.all()).toHaveLength(lines);
		// The session closes with two votes against A03: A03 is banished, and no vote is sampled any more.
		await test.playTicks(idleDriver, 2);
		expect(test.kernel.log.all().filter((event) => event.type === "verdict").map((event) => event.payload)).toEqual([{ exiled: "A03" }]);
		expect(sample("A04")).toBeUndefined();
	});
});
