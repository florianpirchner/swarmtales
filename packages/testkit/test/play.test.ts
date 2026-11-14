// SPDX-License-Identifier: Apache-2.0
import { SwtError, type Envelope, type EventSink, type GameData } from "@swarmtales/contracts";
import { defineGame, defineHead, defineMechanic, reply } from "@swarmtales/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { fakeDriver, scriptedDriver } from "../src/drivers.ts";
import { play, testKernel } from "../src/play.ts";

const head = defineHead({
	id: "counter",
	package: "@test/counter",
	summary: "Counts to a target.",
	options: Type.Object({ target: Type.Integer({ default: 5, description: "The count that ends the run." }) }, { description: "The options." }),
	state: Type.Object({ count: Type.Integer() }),
	start: () => ({ count: 0 }),
	events: { counted: Type.Object({ count: Type.Integer() }) },
	tools: { add: { description: "Adds to the count.", params: Type.Object({ by: Type.Integer({ minimum: 1, maximum: 3 }) }), for: ["resident"] } },
});
const counter = defineMechanic(head, {
	tools: {
		add: {
			run(params, ctx) {
				ctx.state.count += params.by;
				ctx.emit("counted", { count: ctx.state.count });
				return reply(`Count: ${String(ctx.state.count)}`, { endsTurn: true });
			},
			sample: (_ctx, random) => ({ by: random.int(1, 3) }),
		},
	},
	facts: { total: { output: Type.Integer(), compute: (view) => view.state.count } },
	limits: { full: { summary: "Ends at the target.", breached: (view) => (view.state.count >= view.options.target ? "the count is full" : undefined) } },
});

const game = defineGame({ id: "count", residents: 2, mechanics: [counter({ target: 5 })], scheduler: { id: "turns", options: { order: "roster" } }, end: { ticks: 6 }, win: { fact: "counter.total" } });
const counts = (events: readonly Envelope[]): readonly unknown[] => events.filter((event) => event.type === "counted").map((event) => event.payload);
const lines = (events: readonly Envelope[]): readonly string[] => events.map((event) => `${String(event.seq)} ${String(event.tick)} ${event.actor} ${event.source} ${event.type}`);
const codeOf = async (run: Promise<unknown>): Promise<string> => run.then(() => "no error", (error: unknown) => (error instanceof SwtError ? error.code : String(error)));

describe("play", () => {
	it("plays a mechanic defined here to its limit through resolveGame, createKernel and turns", async () => {
		const { kernel, end, events } = await play(game, { script: { A01: [["add", { by: 2 }], ["add", { by: 9 }], ["add", { by: 2 }]], A02: [["add", { by: 1 }]] } });
		expect(end).toEqual({ reason: "limit", tick: 3, limit: "counter.full" });
		expect(kernel.ended).toEqual(end);
		expect(counts(events)).toEqual([{ count: 2 }, { count: 3 }, { count: 5 }]);
		expect(kernel.fact("counter.total")).toBe(5);
		expect(kernel.plugins).toEqual(["counter", "roster"]);
		expect([events[0]?.type, events.at(-1)?.type, events.at(-1)?.payload]).toEqual(["run_started", "run_ended", { reason: "limit" }]);
		expect(events.find((event) => event.type === "limit_reached")?.payload).toEqual({ limit: "counter.full", reason: "the count is full" });
		// The kernel's refusal text comes from `library/prompts` through the default lookup.
		const refused = events.find((event) => event.type === "tool_refused");
		expect(refused?.payload).toMatchObject({ code: "INVALID_ARGUMENTS", stage: "parse" });
		// Ticks count from 0; the limit is seen before A02's third activation, and the end names the clock after the tick.
		expect(events.filter((event) => event.type === "activation_opened").map((event) => [event.tick, event.actor])).toEqual([[0, "resident:A01"], [0, "resident:A02"], [1, "resident:A01"], [1, "resident:A02"], [2, "resident:A01"]]);
	});

	it("stops at `ticks` with the run open, and ends by ticks when nobody plays", async () => {
		const open = await play(game, { ticks: 2 });
		expect([open.end, open.kernel.ended, open.kernel.tick]).toEqual([undefined, undefined, 2]);
		expect((await play(game)).end).toEqual({ reason: "ticks", tick: 6 });
	});

	it("fails before the run when `win.fact` names no fact", async () => {
		const seen: Envelope[] = [];
		const sink: EventSink = { write: (event) => void seen.push(event) };
		const wrong = defineGame({ ...game, win: { fact: "counter.totl" } });
		expect(await codeOf(play(wrong, { sinks: [sink] }))).toBe("SWT-R015");
		expect(() => testKernel(wrong, { sinks: [sink] })).toThrow(/counter\.totl/);
		expect(seen).toEqual([]);
		await play(game, { sinks: [sink], ticks: 1 });
		expect(seen[0]?.type).toBe("run_started");
	});

	it("the fake driver plays it with the same events for the same seed", async () => {
		const fake = (seed: number) => play(game, { seed, drivers: (kernel) => ({ resident: fakeDriver(kernel, seed) }) });
		const [first, again, other] = [await fake(7), await fake(7), await fake(8)];
		expect(first.end).toMatchObject({ reason: "limit", limit: "counter.full" });
		expect(first.events.length).toBeGreaterThan(10);
		expect(again.events).toEqual(first.events);
		expect(counts(first.events).length).toBeGreaterThan(1);
		expect([lines(other.events), counts(other.events)]).not.toEqual([lines(first.events), counts(first.events)]);
	});

	it("resolves a game in its data form with the installed mechanics, and the seed option wins", async () => {
		const data: GameData = { schema: 1, id: "count", residents: 2, seed: 3, mechanics: [{ use: "counter" }], end: { ticks: 2 } };
		const { events, end } = await play(data, { installed: { counter }, seed: 11 });
		expect(end).toEqual({ reason: "ticks", tick: 2 });
		expect(events[0]?.payload).toMatchObject({ seed: 11 });
		expect(await codeOf(play(data))).toBe("SWT-G022");
	});

	it("resumes from a snapshot and its log: the rest plays as in the straight run", async () => {
		const script = { A01: [["add", { by: 1 }], ["add", { by: 1 }], ["add", { by: 3 }]] } as const;
		const straight = await play(game, { script });
		const cut = await play(game, { script, ticks: 1 });
		const resume = { snapshot: structuredClone(cut.kernel.snapshot()), log: structuredClone([...cut.events]) };
		const rest = await play(game, { resume, script: { A01: script.A01.slice(1) } });
		expect(rest.end).toEqual(straight.end);
		expect(rest.events).toEqual(straight.events);
	});
});

describe("testKernel", () => {
	it("gives a started kernel with the old host's helpers", async () => {
		const test = testKernel(game);
		expect(test.kernel.log.all().map((event) => event.type)).toContain("run_started");
		expect(test.openTools("A01")).toEqual(["add"]);
		expect(await test.call("A01", "add", { by: 2 })).toEqual({ ok: true, reply: "Count: 2", endsTurn: true });
		expect(await test.call("A01", "ad", {})).toMatchObject({ ok: false, code: "TOOL_UNKNOWN" });
		expect(test.fact("counter.total")).toBe(2);
		const add = scriptedDriver(() => [{ tool: "add", params: { by: 1 } }]);
		expect(await test.playTicks(add, 1)).toBeUndefined();
		expect([test.fact("counter.total"), test.kernel.tick]).toEqual([4, 1]);
		expect(await test.playTicks(add, 5)).toEqual({ reason: "limit", tick: 2, limit: "counter.full" });
	});
});

describe("play with what a live run gives the kernel", () => {
	const source = { id: "@test/driver", events: { noted: Type.Object({ text: Type.String() }) } };

	it("lets a driver record under turns when the record source is given, and refuses it otherwise", async () => {
		const noting = { resident: scriptedDriver((activation) => (activation.record(source.id, "noted", { text: "seen" }), [{ tool: "add", params: { by: 1 } }])) };
		const played = await play(game, { drivers: noting, records: [source] });
		expect(played.events.filter((event) => event.source === source.id).map((event) => [event.type, event.payload])).toContainEqual(["noted", { text: "seen" }]);
		expect(await codeOf(play(game, { drivers: noting }))).toBe("SWT-R017");
	});

	it("ends the run by a limit given from outside and redacts a record with the given function", async () => {
		let asked = 0;
		const limit = { id: "outside.budget", summary: "Ends at the third question.", check: () => (++asked >= 3 ? "the budget is spent" : undefined) };
		const noting = { resident: scriptedDriver((activation) => (activation.record(source.id, "noted", { text: "sent key-123" }), [{ tool: "add", params: { by: 1 } }])) };
		const played = await play(game, { drivers: noting, records: [source], limits: [limit], redact: (text) => text.replaceAll("key-123", "[redacted]") });
		expect(played.end).toMatchObject({ reason: "limit", limit: "outside.budget" });
		expect(played.events.find((event) => event.type === "noted")?.payload).toEqual({ text: "sent [redacted]" });
		expect(JSON.stringify(played.events)).not.toContain("key-123");
	});
});

