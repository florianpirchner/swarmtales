// SPDX-License-Identifier: Apache-2.0
/**
 * Staged calls (12-m5-spec.md, 4.2; issue M5-02): a plugin stages a tool call, the kernel makes it as the actor
 * `script` after the outermost step that staged it, depth first, and runs the `then` job with the outcome.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { kindOf, type ActorDriver, type Envelope, type JsonValue, type KernelDefinition, type KernelTool, type PluginInstance, type PluginPort, type ResolvedPlugin } from "@swarmtales/contracts";
import { createKernel } from "../src/index.ts";
import { caught, codeOf, scheduled } from "./sample.ts";

const A = "resident:a";
const Empty = Type.Object({}, { description: "No arguments" });
const said = Type.Object({ what: Type.String({ description: "What" }) }, { description: "Something was said" });
const STAGER = "@test/stager/stager";
const tool = (name: string): string => `${STAGER}/${name}`;

/** What a test plugin does: its hooks, the tools it executes with the port, a fact. */
interface Plan {
	readonly id?: string;
	readonly hooks?: (port: PluginPort) => PluginInstance["hooks"];
	readonly tools?: Readonly<Record<string, (port: PluginPort) => string>>;
	readonly jobs?: (port: PluginPort) => PluginInstance["jobs"];
	readonly fact?: (port: PluginPort) => unknown;
}

function plugin(plan: Plan): ResolvedPlugin {
	const id = plan.id ?? "stager";
	return {
		id, package: `@test/${id}`, version: "1.0.0", requires: [], provides: [], events: { [`${id}_said`]: said }, audiences: {}, options: null,
		create(port): PluginInstance {
			const tools = Object.entries(plan.tools ?? {}).map(([name, run]): KernelTool => ({ name, description: name, parameters: Empty, free: false, prepare: (raw) => ({ params: raw, rule: () => undefined, execute: () => ({ ok: true, reply: run(port) }) }) }));
			const facts = plan.fact === undefined ? {} : { probe: { output: Type.Unknown({ description: "Anything" }), compute: () => plan.fact?.(port) } };
			return { tools, services: [], listeners: [], hooks: plan.hooks?.(port) ?? {}, stages: {}, jobs: plan.jobs?.(port) ?? {}, limits: [], facts, slice: undefined };
		},
	};
}

// One activation per tick for each resident; `script` is an actor of the definition and is never activated.
const residents = scheduled(async (port, drivers, until) => {
	for (let ticks = 0; until === undefined || ticks < until.ticks; ticks += 1) {
		await port.beginTick();
		for (const id of port.actors.ofKind("resident")) {
			const open = port.open(id, port.inputsFor(id), {});
			await drivers[kindOf(id)]?.(open);
			open.close(false);
		}
		const end = await port.endTick(false);
		if (end !== undefined) return end;
	}
	return undefined;
});

function game(plugins: readonly ResolvedPlugin[], grants: { readonly resident?: readonly string[]; readonly script?: readonly string[] }, maxTicks = 3): KernelDefinition {
	return {
		game: { id: "staged", hash: "h" }, seed: 3,
		actors: [{ id: A, kind: "resident", grant: "resident", shared: {} }, { id: "script", kind: "script", grant: "script", shared: {} }],
		plugins, scheduler: { definition: residents, options: {} }, grants: { resident: grants.resident ?? [], script: grants.script ?? [] },
		names: {}, startLocks: {}, replies: { TOOL_NOT_GRANTED: "not yours" }, limits: { maxTicks },
	};
}

const idle: ActorDriver = () => Promise.resolve();
const Called = Type.Object({ as: Type.String({ description: "The shown name" }) }, { description: "A call line" });
const asOf = (event: Envelope): string => (Value.Check(Called, event.payload) ? event.payload.as : "");
const payloads = (events: readonly Envelope[], type: string): readonly unknown[] => events.filter((event) => event.type === type).map((event) => event.payload);

// The order of one tick up to the first activation, as the oracle file writes it: plugin events, calls by actor, a turn.
function shapeOf(lines: readonly { readonly kind: string }[]): string {
	const kinds: string[] = [];
	for (const { kind } of lines) {
		if (kinds.at(-1) !== kind) kinds.push(kind);
		if (kind === "turn") break;
	}
	return kinds.join(" ");
}

// The shape of every tick of the new log.
function kernelShapes(events: readonly Envelope[]): readonly string[] {
	const ticks = events.filter((event) => event.type === "tick_started").map((event) => event.tick);
	return ticks.map((tick) =>
		shapeOf(events.filter((event) => event.tick === tick).flatMap((event) => {
			if (event.source === "kernel") return event.type === "tool_called" ? [{ kind: `call:${event.actor}` }] : event.type === "activation_opened" ? [{ kind: "turn" }] : [];
			return [{ kind: "event" }];
		})),
	);
}

// The shape of every minute of the oracle file.
function fileShapes(): readonly string[] {
	const file: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "../../../oracles/whispers/whispers-s7.json"), "utf8"));
	const Line = Type.Object({ k: Type.String({ description: "The kind" }), actor: Type.Optional(Type.String({ description: "The caller" })) }, { description: "A line of the file" });
	const timeline = Type.Object({ timeline: Type.Array(Line, { description: "The lines" }) }, { description: "The file" });
	if (!Value.Check(timeline, file)) throw new TypeError("not an oracle file");
	const minutes: { readonly kind: string }[][] = [];
	for (const line of file.timeline) {
		if (line.k === "minute") minutes.push([]);
		else minutes.at(-1)?.push({ kind: line.k === "call" ? `call:${line.actor ?? ""}` : line.k });
	}
	return minutes.map(shapeOf);
}

describe("staged calls: where a staged call lands", () => {
	it("first test: a call staged at tick start lands as in whispers-s7.json, after the tick-start events of the plugins before it and before the first turn", async () => {
		const shapes = fileShapes();
		expect(shapes).toHaveLength(20);
		// The minutes in which the file has events before the call of `script`.
		const busy = new Set(shapes.flatMap((shape, minute) => (shape.startsWith("event") ? [minute] : [])));
		expect([...busy]).toEqual([3, 4, 6, 10, 12, 16, 18]);
		const early = plugin({ id: "early", hooks: (port) => ({ tickStarted: [{ run: () => {
			if (busy.has(port.tick())) port.emit("early_said", { what: "news" });
		} }] }) });
		const seen: JsonValue[] = [];
		const stager = plugin({
			hooks: (port) => ({ tickStarted: [{ run: () => { port.stage("beat", {}, { then: "ran" }); } }] }),
			tools: { beat: (port) => `beat ${String(port.tick())}` },
			jobs: () => ({ ran: (data) => void seen.push(data ?? null) }),
		});
		const kernel = createKernel(game([early, stager], { script: [tool("beat")] }, 20));
		expect(await kernel.run({ resident: idle })).toEqual({ reason: "ticks", tick: 20 });
		expect(kernelShapes(kernel.log.all())).toEqual(shapes);
		const called = kernel.log.all().filter((event) => event.type === "tool_called");
		expect(called).toHaveLength(20);
		expect(called[0]).toMatchObject({ actor: "script", tool: tool("beat"), payload: { as: "beat", params: {} } });
		expect(called[0]?.causedBy).toBeUndefined();
		expect(seen).toEqual(Array.from({ length: 20 }, (_, tick) => ({ ok: true, reply: `beat ${String(tick)}` })));
	});

	it("runs depth first: what a call and its `then` job stage runs before the calls queued behind it", async () => {
		const order: string[] = [];
		const stager = plugin({
			hooks: (port) => ({
				tickStarted: [{
					run: () => {
						port.stage("one", {}, { then: "after" });
						port.stage("four", {});
					},
				}],
			}),
			tools: { one: (port) => {
					port.stage("two", {});
					return "1";
				}, two: () => "2", three: () => "3", four: () => "4" },
			jobs: (port) => ({
				after: () => {
					order.push("then of one");
					port.stage("three", {});
				},
			}),
		});
		const kernel = createKernel(game([stager], { script: ["one", "two", "three", "four"].map(tool) }, 1));
		await kernel.run({ resident: idle });
		const events = kernel.log.all();
		expect(payloads(events, "tool_result")).toEqual(["1", "2", "3", "4"].map((reply, index) => ({ as: ["one", "two", "three", "four"][index], reply })));
		expect(order).toEqual(["then of one"]);
		// The call staged inside `one` is caused by the `tool_called` of `one`; the job's call by the answer of `one`.
		const [one, two, three] = events.filter((event) => event.type === "tool_called");
		const answerOfOne = events.find((event) => event.type === "tool_result");
		expect(two?.causedBy).toBe(one?.seq);
		expect(three?.causedBy).toBe(answerOfOne?.seq);
	});

	it("hands a refused staged call to the `then` job as its data, with the code and the detail", async () => {
		const seen: JsonValue[] = [];
		const stager = plugin({
			hooks: (port) => ({ runStarted: [{ run: () => { port.stage("hidden", { x: 1 }, { then: "ran" }); } }] }),
			tools: { hidden: () => "never" },
			jobs: () => ({ ran: (data) => void seen.push(data ?? null) }),
		});
		const kernel = createKernel(game([stager], {}, 1));
		await kernel.run({ resident: idle });
		expect(seen).toEqual([{ ok: false, code: "TOOL_NOT_GRANTED", detail: "not yours" }]);
		expect(payloads(kernel.log.all(), "tool_refused")).toEqual([{ as: "hidden", stage: "lock", code: "TOOL_NOT_GRANTED", detail: "not yours" }]);
	});

	it("runs a call that a resident's call staged after that call's answer and listeners, before the resident's next call", async () => {
		const stager = plugin({ tools: { ask: (port) => {
			port.stage("beat", {});
			return "asked";
		}, beat: () => "beat", again: () => "again" } });
		const driver: ActorDriver = async (open) => {
			await open.call("ask", {});
			await open.call("again", {});
		};
		const kernel = createKernel(game([stager], { resident: [tool("ask"), tool("again")], script: [tool("beat")] }, 1));
		await kernel.run({ resident: driver });
		const calls = kernel.log.all().filter((event) => event.type === "tool_called" || event.type === "tool_result").map((event) => `${event.actor} ${event.type} ${asOf(event)}`);
		expect(calls).toEqual([`${A} tool_called ask`, `${A} tool_result ask`, "script tool_called beat", "script tool_result beat", `${A} tool_called again`, `${A} tool_result again`]);
	});

	it("runs a call staged by an activation hook right after that hook", async () => {
		const stager = plugin({ hooks: (port) => ({ activationOpened: [{ run: () => { port.stage("beat", {}); } }] }), tools: { beat: () => "beat" } });
		const kernel = createKernel(game([stager], { script: [tool("beat")] }, 1));
		await kernel.run({ resident: idle });
		const kinds = kernel.log.all().filter((event) => event.source === "kernel").map((event) => event.type);
		expect(kinds.slice(kinds.indexOf("activation_opened"), kinds.indexOf("activation_closed") + 1)).toEqual(["activation_opened", "tool_called", "tool_result", "activation_closed"]);
	});
});

describe("staged calls: failures and boundaries", () => {
	it("ends the run with SWT-R003 when a plugin stages with a `then` job it does not have", async () => {
		const stager = plugin({ hooks: (port) => ({ tickStarted: [{ run: () => { port.stage("beat", {}, { then: "missing" }); } }] }), tools: { beat: () => "beat" } });
		const kernel = createKernel(game([stager], { script: [tool("beat")] }));
		const error = await caught(() => kernel.run({ resident: idle }));
		expect(codeOf(error)).toBe("SWT-R003");
		expect(kernel.log.all().at(-1)).toMatchObject({ type: "run_ended", payload: { reason: "error" } });
	});

	it("ends the run with SWT-R003 when the code of a staged call throws", async () => {
		const stager = plugin({
			hooks: (port) => ({ tickStarted: [{ run: () => { port.stage("beat", {}); } }] }),
			tools: {
				beat: () => {
					throw new RangeError("the beat broke");
				},
			},
		});
		const kernel = createKernel(game([stager], { script: [tool("beat")] }));
		expect(codeOf(await caught(() => kernel.run({ resident: idle })))).toBe("SWT-R003");
		expect(kernel.log.all().at(-1)).toMatchObject({ type: "run_ended", payload: { reason: "error", detail: "SWT-R003: stager: the beat broke" } });
	});

	it("refuses a snapshot while a staged call waits, and takes one when every step drained its calls", async () => {
		const stager = plugin({ hooks: (port) => ({ tickStarted: [{ run: () => { port.stage("beat", {}); } }] }), tools: { beat: () => "beat" }, fact: (port) => { port.stage("beat", {}); } });
		const kernel = createKernel(game([stager], { script: [tool("beat")] }));
		await kernel.run({ resident: idle }, { ticks: 1 });
		expect(kernel.snapshot().tick).toBe(1);
		kernel.fact("stager.probe");
		expect(() => kernel.snapshot()).toThrow("a snapshot is refused while 1 staged calls wait to run");
	});

	it("resumes a run with staged calls to the same log as the run that was not cut", async () => {
		const stager = (): ResolvedPlugin => plugin({ hooks: (port) => ({ tickStarted: [{ run: () => { port.stage("beat", {}, { then: "ran" }); } }] }), tools: { beat: (port) => `beat ${String(port.tick())}` }, jobs: (port) => ({ ran: () => { port.emit("stager_said", { what: "ran" }); } }) });
		const whole = createKernel(game([stager()], { script: [tool("beat")] }, 4));
		await whole.run({ resident: idle });
		const first = createKernel(game([stager()], { script: [tool("beat")] }, 4));
		await first.run({ resident: idle }, { ticks: 2 });
		const resumed = createKernel(game([stager()], { script: [tool("beat")] }, 4), {}, { snapshot: first.snapshot(), log: first.log.all() });
		await resumed.run({ resident: idle });
		expect(resumed.log.all()).toEqual(whole.log.all());
		expect(payloads(whole.log.all(), "stager_said")).toHaveLength(4);
	});
});
