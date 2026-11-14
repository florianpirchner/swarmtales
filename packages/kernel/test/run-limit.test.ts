// SPDX-License-Identifier: Apache-2.0
/** Run limits from outside the plugins (M2 specification, 2.3): `KernelPorts.limits`, checked before the plugins' limits. */
import { describe, expect, it } from "vitest";
import type { RunLimit } from "@swarmtales/contracts";
import { createKernel } from "../src/index.ts";
import { adder, caught, definition, keeper, types } from "./sample.ts";

/** A limit that is reached once `reached()` says so; `asked` counts its checks. */
function cap(id: string, reached: () => boolean): RunLimit & { asked: number } {
	const limit = {
		id,
		summary: `The cap ${id}`,
		asked: 0,
		check: (): string | undefined => {
			limit.asked += 1;
			return reached() ? `${id} is spent` : undefined;
		},
	};
	return limit;
}

describe("KernelPorts.limits", () => {
	it("ends the run with the id as given, before a plugin's limit that is reached too", async () => {
		const sink = keeper();
		const budget = cap("outside.budget", () => true);
		// The counter is full from the start (`full` is 0), so both limits answer a reason at the first check.
		const kernel = createKernel(definition({ full: 0 }), { sinks: [sink], limits: [budget] });
		expect(await kernel.run({ resident: adder })).toEqual({ reason: "limit", tick: 1, limit: "outside.budget" });
		expect(kernel.log.ofType("kernel", "limit_reached").map((event) => event.payload)).toEqual([{ limit: "outside.budget", reason: "outside.budget is spent" }]);
		expect(types(kernel.log.all()).slice(-2)).toEqual(["limit_reached", "run_ended"]);
		expect(sink.ends).toEqual([{ reason: "limit", tick: 1, limit: "outside.budget" }]);
		// The same game without the port ends by the plugin's limit: the port is what came first.
		expect(await createKernel(definition({ full: 0 })).run({ resident: adder })).toMatchObject({ limit: "counter.full" });
	});

	it("checks them in the order given, and the first that is reached names the end", async () => {
		const first = cap("a.first", () => false);
		const second = cap("b.second", () => true);
		const third = cap("c.third", () => true);
		expect(await createKernel(definition(), { limits: [first, second, third] }).run({ resident: adder })).toMatchObject({ limit: "b.second" });
		expect(first.asked).toBeGreaterThan(0);
		expect(third.asked).toBe(0);
	});

	it("halts the run inside the tick in which it is reached, and lets a run play that stays under it", async () => {
		let spent = 0;
		const budget = cap("outside.budget", () => spent >= 2);
		const kernel = createKernel(definition({ maxTicks: 9 }), { limits: [budget] });
		const end = await kernel.run({
			resident: async (activation) => {
				spent += 1;
				await activation.call("plus", 1);
			},
		});
		expect(end).toEqual({ reason: "limit", tick: 2, limit: "outside.budget" });
		expect(kernel.log.ofType("kernel", "activation_opened")).toHaveLength(2);
		expect(await createKernel(definition({ maxTicks: 2 }), { limits: [cap("outside.budget", () => false)] }).run({ resident: adder })).toEqual({ reason: "ticks", tick: 2 });
	});

	it("ends the run with what a check throws", async () => {
		const broken: RunLimit = { id: "outside.broken", summary: "It throws", check: () => { throw new RangeError("no reading"); } };
		const kernel = createKernel(definition(), { limits: [broken] });
		expect(await caught(() => kernel.run({ resident: adder }))).toBeInstanceOf(RangeError);
		expect(kernel.log.all().at(-1)?.payload).toEqual({ reason: "error", detail: "no reading" });
	});
});
