// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The `sample` of `readBoard`, `postBoard`, `sendDM` and `defy`: what the fake driver (`--fake`) may call. Each gives a call one time in eight; the texts are short, a message goes to another resident that may act, and `defy` answers a note of a Director. */
import { describe, expect, it } from "vitest";
import type { RandomSource } from "@swarmtales/contracts";
import { defineGame } from "@swarmtales/sdk";
import { fakeDriver, testKernel } from "@swarmtales/testkit";
import { channels } from "../src/index.ts";
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

// Three residents with `defy` open and a Director (`script`) that leaves notes.
const defiant = defineGame({ id: "channels-defy", seed: 7, residents: 3, mechanics: [channels({ defiance: true })], grants: { script: ["notify"] }, scheduler: { id: "turns", options: { order: "roster" } }, end: { ticks: 4 } });

describe("the sample of defy", () => {
	it("gives a reason one time in eight once a Director left the resident a note, draws nothing before or with defy closed, and the sampled call is taken", async () => {
		const closed = testKernel(game());
		const test = testKernel(defiant);
		let asked = 0;
		const counted = (next: number): RandomSource => ({ ...fixed(next), next: () => (asked++, next) });
		expect([closed.kernel.sample("resident:A02", "defy", counted(0)), test.kernel.sample("resident:A02", "defy", counted(0)), asked]).toEqual([undefined, undefined, 0]);
		expect((await test.kernel.submit({ actor: "script", as: "notify", params: { agent: "A02", text: "A02, give your points to A03." } })).ok).toBe(true);
		const lines = test.kernel.log.all().length;
		const reason = test.kernel.sample("resident:A02", "defy", counted(0));
		expect([test.kernel.sample("resident:A02", "defy", counted(0.125)), reason, test.kernel.sample("resident:A03", "defy", counted(0))]).toEqual([undefined, { reason: "My character keeps its own counsel and will not follow this order." }, undefined]);
		expect(test.kernel.log.all()).toHaveLength(lines);
		expect(await say(test, "A02", "defy", reason)).not.toMatch(/^[A-Z_]+:/);
	});
});
