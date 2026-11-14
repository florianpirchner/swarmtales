// SPDX-License-Identifier: Apache-2.0
/**
 * A listener of a plugin that is not loaded (erratum E59 of M1, rule of M1-38; M2 specification, 2.3): a plugin that
 * listens to two others loads with only one of them, and its listener of the present one runs.
 */
import { describe, expect, it } from "vitest";
import type { ResolvedPlugin } from "@swarmtales/contracts";
import { createKernel } from "../src/index.ts";
import { added, adder, caught, codeOf, counter, definition } from "./sample.ts";

/** A plugin without tools that listens to `added` of `counter` and of `grid`, which no test loads. */
function watcher(heard: string[], sources: readonly string[] = ["grid", "counter"]): ResolvedPlugin {
	const base = counter(100);
	return {
		...base,
		id: "watcher",
		package: "@sample/watcher",
		events: {},
		audiences: {},
		create: (port) => ({
			...base.create(port),
			tools: [],
			hooks: {},
			limits: [],
			facts: {},
			slice: undefined,
			listeners: sources.map((source) => ({ source, type: "added", schema: added, run: (event) => void heard.push(`${source}: ${event.source} ${JSON.stringify(event.payload)}`) })),
		}),
	};
}

describe("a plugin that listens to a plugin that is not loaded", () => {
	it("loads, skips that listener, and its listener of a loaded plugin runs", async () => {
		const heard: string[] = [];
		const kernel = createKernel(definition({ maxTicks: 2, plugins: [counter(100), watcher(heard)] }));
		expect(kernel.plugins).toEqual(["counter", "watcher"]);
		await kernel.run({ resident: adder });
		expect(heard).toEqual(['counter: @sample/counter/counter {"by":1}', 'counter: @sample/counter/counter {"by":2}']);
	});

	it("loads alone, with no listener left", async () => {
		const heard: string[] = [];
		const kernel = createKernel({ ...definition({ maxTicks: 1, plugins: [watcher(heard)] }), grants: {}, names: {} });
		expect(await kernel.run({ resident: () => Promise.resolve(undefined) })).toEqual({ reason: "ticks", tick: 1 });
		expect(heard).toEqual([]);
	});

	it("is still refused with SWT-R002 when a loaded plugin does not declare the event", async () => {
		const silent = { ...counter(100), events: {} };
		expect(codeOf(await caught(() => createKernel(definition({ plugins: [silent, watcher([])] }))))).toBe("SWT-R002");
	});
});
