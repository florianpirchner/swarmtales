// SPDX-License-Identifier: Apache-2.0
/** The `sample` of `readBoard`, `postBoard` and `sendDM`: what the fake driver (`--fake`) may call. Each gives a call one time in eight; the texts are short, and a message goes to another resident that may act. */
import { describe, expect, it } from "vitest";
import type { RandomSource } from "@swarmtales/contracts";
import { fakeDriver, testKernel } from "@swarmtales/testkit";
import { game, payloads, say } from "./support.ts";

/** A random source with a fixed `next` that picks the first item and notes every list it was given. */
function fixed(next: number, draws: unknown[][] = []): RandomSource {
	const pick = <T>(items: readonly T[]): T => {
		draws.push([...items]);
		const item = items[0];
		if (item === undefined) throw new RangeError("an empty draw");
		return item;
	};
	return { next: () => next, int: (_min, max) => max, pick, shuffle: (items) => [...items] };
}

describe("the samples of channels", () => {
	it("give a call one time in eight, with a short text and a receiver that may act, and every sampled call succeeds", async () => {
		const test = testKernel(game());
		const draws: unknown[][] = [];
		const sample = (tool: string, next: number, resident = "A02"): unknown => test.kernel.sample(`resident:${resident}`, tool, fixed(next, draws));
		expect(["readBoard", "postBoard", "sendDM"].map((tool) => sample(tool, 0.125))).toEqual([undefined, undefined, undefined]);
		const lines = test.kernel.log.all().length;
		const calls = [["readBoard", sample("readBoard", 0)], ["postBoard", sample("postBoard", 0)], ["sendDM", sample("sendDM", 0)]] as const;
		expect(calls).toEqual([["readBoard", {}], ["postBoard", { message: "Who holds which fragment?" }], ["sendDM", { target: "A01", message: "Watch the board." }]]);
		expect(draws[1]).toEqual(["A01", "A03"]);
		expect(test.kernel.log.all()).toHaveLength(lines);
		for (const [tool, params] of calls) expect((await test.call("A02", tool, params)).ok).toBe(true);
		// A suspended resident gets no message: the draw leaves it out, and with nobody left there is no sample.
		await say(test, "A02", "cityExile", { resident: "A01" });
		expect(sample("sendDM", 0)).toEqual({ target: "A03", message: "Watch the board." });
		await say(test, "A02", "cityExile", { resident: "A03" });
		expect(sample("sendDM", 0)).toBeUndefined();
	});

	it("carry a run of the fake driver: residents post, read and write to each other, and a refusal is rare", async () => {
		const test = testKernel(game({ activation: "always" }));
		await test.playTicks(fakeDriver(test.kernel, 7), 4);
		const events = test.kernel.log.all();
		const called = events.filter((event) => event.type === "tool_called").length;
		expect([payloads(events, "board_post").length, payloads(events, "dm_sent").length].every((count) => count > 0)).toBe(true);
		expect(events.filter((event) => event.type === "tool_refused").length).toBeLessThan(called / 4);
	});
});
