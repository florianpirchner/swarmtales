// SPDX-License-Identifier: Apache-2.0
/** The open points of the kernel review that the assembly closes (errata O10 to O14). */
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { EnvelopeSchema, envelopeLogIssues, SwtError } from "@swarmtales/contracts";
import type { OpenActivation, ResolvedPlugin } from "@swarmtales/contracts";
import { createKernel } from "../src/index.ts";
import { A, added, adder, broken, caught, codeOf, counter, definition, keeper, scheduled, types } from "./sample.ts";

describe("createKernel: a call from outside (O11)", () => {
	it("refuses a `causedBy` or a `basis` that names no event of the log, before the lane, and the run goes on", async () => {
		const kernel = createKernel(definition());
		kernel.start();
		const length = kernel.log.length;
		for (const more of [{ causedBy: 0 }, { causedBy: length + 1 }, { causedBy: 1.5 }, { basis: -1 }, { basis: length + 1 }]) {
			expect(await caught(() => kernel.submit({ actor: A, as: "plus", params: 1, ...more }))).toBeInstanceOf(RangeError);
		}
		expect(kernel.log.length).toBe(length);
		expect(await kernel.submit({ actor: A, as: "plus", params: 1, causedBy: length, basis: 0 })).toEqual({ ok: true, reply: "now 1" });
		expect(kernel.ended).toBeUndefined();
		expect(envelopeLogIssues(kernel.log.all())).toEqual([]);
	});
});

describe("createKernel: a call of an actor that is not in the definition (3.3, row 2)", () => {
	it.each(["resident:nobody", "script"] as const)("writes the call of %s and refuses it at the stage `lock` with TOOL_NOT_GRANTED", async (actor) => {
		const kernel = createKernel(definition());
		kernel.start();
		const length = kernel.log.length;
		expect(await kernel.submit({ actor, as: "plus", params: 1 })).toEqual({ ok: false, code: "TOOL_NOT_GRANTED" });
		const written = kernel.log.since(length);
		expect(written.map((event) => [event.type, event.actor])).toEqual([["tool_called", actor], ["tool_refused", actor]]);
		expect(written[1]).toMatchObject({ causedBy: length + 1, payload: { as: "plus", stage: "lock", code: "TOOL_NOT_GRANTED" } });
		expect(kernel.ended).toBeUndefined();
		expect(kernel.fact("counter.count")).toBe(0);
	});
});

describe("createKernel: after a failure (O12, O13)", () => {
	it("refuses the call of an activation with `SWT-R001` and the first failure, also one that was waiting in the lane", async () => {
		const late: unknown[] = [];
		const scheduler = scheduled(async (port) => {
			await port.beginTick();
			const open = port.open(A, [], {});
			const waiting = open.call("plus", 1);
			const failed = await caught(() => port.hasNews(A));
			late.push(await caught(() => waiting), await caught(() => open.call("plus", 2)));
			throw failed;
		});
		const kernel = createKernel(definition({ scheduler, plugins: [counter(100, { news: broken })] }));
		const first = await caught(() => kernel.run({}));
		expect(codeOf(first)).toBe("SWT-R003");
		expect(late.map(codeOf)).toEqual(["SWT-R001", "SWT-R001"]);
		expect(late.every((error) => error instanceof SwtError && error.cause === first)).toBe(true);
		expect(types(kernel.log.all()).slice(-2)).toEqual(["activation_opened", "run_ended"]);
	});

	it("ends the run with the error when the scheduler itself rejects", async () => {
		const sink = keeper();
		const thrown = new SwtError({ code: "SWT-R010", summary: "the order is no permutation", why: "Every actor is activated once.", fix: "Return every id once." });
		const scheduler = scheduled(async (port) => {
			await port.beginTick();
			throw thrown;
		});
		const kernel = createKernel(definition({ scheduler }), { sinks: [sink] });
		expect(await caught(() => kernel.run({}))).toBe(thrown);
		expect(kernel.log.all().at(-1)).toMatchObject({ type: "run_ended", payload: { reason: "error", detail: "SWT-R010: the order is no permutation" } });
		expect(kernel.ended).toEqual({ reason: "error", tick: 0 });
		expect(sink.ends).toEqual([{ reason: "error", tick: 0 }]);
		expect(await caught(() => kernel.run({}))).toMatchObject({ cause: thrown });
	});
});

describe("createKernel: names of `Object.prototype` (O14)", () => {
	it("gives an event `toString` no audience and knows no fact `constructor`", () => {
		const hooks = (port: Parameters<ResolvedPlugin["create"]>[0]) => ({ runStarted: [{ run: () => { port.emit("toString", { by: 1 }); } }] });
		const odd: ResolvedPlugin = { ...counter(100), id: "odd", events: { toString: added }, audiences: {}, create: (port) => ({ ...counter(100).create(port), tools: [], facts: {}, hooks: hooks(port) }) };
		const kernel = createKernel(definition({ plugins: [counter(100), odd] }));
		kernel.start();
		const [event] = kernel.log.ofType("@sample/counter/odd", "toString");
		expect(event).toBeDefined();
		expect(event).not.toHaveProperty("audience");
		expect(Check(EnvelopeSchema, event)).toBe(true);
		expect(() => kernel.fact("counter.constructor")).toThrow(/SWT-R015/);
		expect(() => kernel.fact("odd.toString")).toThrow(/SWT-R015/);
	});
});

describe("createKernel: after a normal end, and inside a run (O10)", () => {
	it("refuses a scheduler that keeps ticking after the end, and keeps the end", async () => {
		const sink = keeper();
		const scheduler = scheduled(async (port) => {
			for (;;) {
				await port.beginTick();
				await port.endTick(true);
			}
		});
		const kernel = createKernel(definition({ scheduler, maxTicks: 2 }), { sinks: [sink] });
		expect(await caught(() => kernel.run({}))).toBeInstanceOf(RangeError);
		const end = { reason: "ticks", tick: 2 };
		expect(kernel.ended).toEqual(end);
		expect(types(kernel.log.all()).filter((type) => type === "run_ended" || type === "tick_started")).toEqual(["tick_started", "tick_started", "run_ended"]);
		expect(kernel.log.all().at(-1)).toMatchObject({ type: "run_ended", payload: { reason: "ticks" } });
		expect(sink.ends).toEqual([end]);
		expect(await kernel.run({})).toEqual(end);
		expect(kernel.snapshot().ended).toEqual(end);
	});

	it("refuses the call of an activation that is still held after the end, and a snapshot inside a run", async () => {
		const held: OpenActivation[] = [];
		const inside: unknown[] = [];
		const scheduler = scheduled(async (port) => {
			await port.beginTick();
			const open = port.open(A, [], {});
			held.push(open);
			await adder(open);
			inside.push(await caught(() => kernel.snapshot()));
			open.close(false);
			return port.endTick(false);
		});
		const kernel = createKernel(definition({ scheduler, maxTicks: 1 }));
		expect(await kernel.run({})).toEqual({ reason: "ticks", tick: 1 });
		expect(inside[0]).toBeInstanceOf(RangeError);
		const length = kernel.log.length;
		expect(await caught(async () => held[0]?.call("plus", 1))).toBeInstanceOf(RangeError);
		expect(kernel.log.length).toBe(length);
		expect(kernel.fact("counter.count")).toBe(1);
		expect(kernel.snapshot().ended).toEqual({ reason: "ticks", tick: 1 });
	});
});
