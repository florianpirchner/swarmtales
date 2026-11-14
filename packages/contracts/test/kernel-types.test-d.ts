// SPDX-License-Identifier: Apache-2.0
/**
 * The type test of the kernel-facing contracts (M1 specification, 2.1 to 2.8). `tsc -b` compiles this file: the
 * hand-written values must fit the interfaces. Nothing here runs. The lines that must not compile are in
 * `kernel-types.test.ts`.
 */
import { Type } from "typebox";
import type { JsonValue, RunEnd } from "../src/values.ts";
import {
	actorId,
	type ActorDriver,
	type ActorId,
	type DriverTable,
	type Envelope,
	type Kernel,
	type KernelDefinition,
	type KernelSnapshot,
	type KernelTool,
	type PluginInstance,
	type PluginPort,
	type ResolvedPlugin,
	type SchedulerDefinition,
	type SchedulerInstance,
	type SchedulerPort,
	type Stage,
	type Submission,
	type ToolOutcome,
} from "../src/kernel/index.ts";

const SOURCE = "@example/mechanic-counter/counter";
const TOOL = `${SOURCE}/add`;
const AddParameters = Type.Object({ by: Type.Number({ description: "The amount" }) }, { description: "The arguments of add" });

function addTool(port: PluginPort, state: { total: number }): KernelTool {
	return {
		name: "add",
		description: "Adds to the counter.",
		parameters: AddParameters,
		free: false,
		prepare: (raw) => {
			if (typeof raw !== "number") return undefined;
			return {
				params: { by: raw },
				rule: () => (raw < 0 ? { ok: false, code: "NEGATIVE", detail: "Only up." } : undefined),
				execute: (): ToolOutcome => {
					state.total += raw;
					port.emit("added", { by: raw });
					return { ok: true, reply: `Total ${state.total}`, endsTurn: true };
				},
			};
		},
		sample: (_actor, random): JsonValue => random.int(1, 3),
	};
}

/** A hand-written plugin instance with every member of the shape. */
export function createCounter(port: PluginPort): PluginInstance {
	const state = { total: 0 };
	const seen: Envelope[] = [];
	return {
		tools: [addTool(port, state)],
		services: [
			{
				service: {
					name: "counter",
					summary: "Reads the counter.",
					methods: { total: { kind: "query", input: Type.Object({}), output: Type.Number(), summary: "The total." } },
				},
				call: (method) => (method === "total" ? state.total : undefined),
			},
		],
		listeners: [
			{
				source: "other",
				type: "reset",
				schema: Type.Object({}),
				run: (event) => {
					seen.push(event);
				},
				after: ["other"],
			},
		],
		hooks: {
			runStarted: [
				{
					run: () => {
						port.schedule.at(port.tick() + 1, "decay", 1);
					},
				},
			],
			tickStarted: [{ run: () => undefined, after: ["other"] }],
			inputs: [{ run: (actor) => [`Total for ${actor}: ${state.total}`, { kind: "status", text: "open", order: 1 }] }],
			tickEnded: [{ run: () => undefined }],
			news: (actor) => port.actors.mayAct(actor) && state.total > 0,
			toAct: () => port.actors.ofKind("worker"),
		},
		stages: {
			lock: (call) => (port.access.isLocked(call.actor, call.tool) ? { ok: false, code: "TOOL_LOCKED" } : undefined),
			rule: (call) => (call.name === "add" && call.as !== "" ? undefined : { ok: false, code: "NO" }),
			after: (call, outcome) => {
				if (outcome.ok && outcome.endsTurn === true) port.actors.suspend(call.actor, "done");
			},
		},
		jobs: { decay: (data) => (state.total -= typeof data === "number" ? data : 0) },
		limits: [{ id: "full", summary: "The counter is full.", check: () => (state.total > 9 ? "full" : undefined) }],
		facts: { total: { output: Type.Number(), compute: () => state.total } },
		slice: {
			version: 1,
			save: () => ({ total: state.total }),
			load: (data, version) => {
				if (version === 1 && typeof data === "number") state.total = data;
			},
		},
	};
}

/** A hand-written resolved plugin. */
export const counter: ResolvedPlugin = {
	id: "counter",
	package: "@example/mechanic-counter",
	version: "1.0.0",
	requires: [],
	provides: ["counter"],
	events: { added: Type.Object({ by: Type.Number() }) },
	audiences: { added: ["human"] },
	options: { start: 0 },
	create: createCounter,
};

const instance: SchedulerInstance = {
	run: async (port: SchedulerPort, drivers: DriverTable, until): Promise<RunEnd | undefined> => {
		await port.beginTick();
		for (const actor of port.toAct() ?? port.actors.ids) {
			const notes = port.inputsFor(actor).map(({ source, text }) => ({ source, text }));
			const open = port.open(actor, notes, { reason: port.hasNews(actor) ? "news" : "first" });
			const result = await drivers[actor]?.(open);
			open.close(result?.pending === true && !open.quietEnd);
		}
		const end = await port.endTick(false);
		return until !== undefined && port.tick >= until.ticks ? undefined : end;
	},
};

/** A hand-written scheduler definition. */
export const scheduler: SchedulerDefinition<{ readonly order: string }> = {
	id: "@example/scheduler",
	revision: 1,
	determinism: "seeded",
	options: Type.Object({ order: Type.String() }),
	events: { pause: Type.Object({}) },
	create: () => instance,
};

const worker: ActorId = actorId("worker", "A01");

/** A hand-written kernel definition. */
export const definition: KernelDefinition = {
	game: { id: "counting", hash: "sha256:00" },
	seed: 7,
	actors: [{ id: worker, kind: "worker", grant: "worker", shared: { name: "Ada" } }],
	plugins: [counter],
	scheduler: { definition: scheduler, options: { order: "seeded" } },
	grants: { worker: [TOOL] },
	names: { [TOOL]: "add" },
	startLocks: { worker: [] },
	replies: { TOOL_LOCKED: "This tool is locked." },
	limits: { maxTicks: 3, maxCallsPerTick: 8 },
};

/** Drivers may return a result, undefined or nothing. */
export const drivers: DriverTable = {
	worker: async (activation) => {
		await activation.call("add", 1);
		return { pending: false };
	},
	[worker]: () => Promise.resolve(undefined),
	script: async () => {
		await Promise.resolve();
	},
};

/** A kernel is used through its twelve members. */
export async function play(kernel: Kernel, driver: ActorDriver): Promise<KernelSnapshot> {
	kernel.start();
	const call: Submission = { actor: "script", as: "add", params: 1, basis: kernel.log.length };
	const outcome = await kernel.submit(call);
	if (!outcome.ok) return kernel.snapshot();
	await kernel.run({ worker: driver }, { ticks: kernel.tick + 1 });
	const names: readonly string[] = [...kernel.plugins, ...kernel.openTools(worker), ...kernel.toolSpecs("worker").map((spec) => spec.name)];
	return names.length > 0 && kernel.ended === undefined && kernel.fact("counter.total") !== 0 ? kernel.snapshot() : kernel.snapshot();
}

/** A stage name is one of the ten. */
export const stage: Stage = "guard";
