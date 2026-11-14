// SPDX-License-Identifier: Apache-2.0
/**
 * The usability proof of the frozen contracts: a hand-written plugin, scheduler, driver and sink play one run on
 * the miniature kernel of `mini-kernel.ts`, written against the types of 2.1 to 2.8 alone, without a cast. The
 * scheduler follows 4.2 and 4.3 (wake rule, gated block, pending), the miniature 3.3 and 3.5.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { SwtError } from "../src/error.ts";
import {
	type ActorDriver,
	type ActorId,
	actorId,
	type DriverTable,
	type Envelope,
	type EventSink,
	type KernelDefinition,
	kindOf,
	type OpenActivation,
	type PluginPort,
	type ResolvedPlugin,
	type SchedulerDefinition,
	type SchedulerPort,
	type ToolOutcome,
} from "../src/kernel/index.ts";
import type { RunEnd } from "../src/values.ts";
import { createMiniKernel, schedulerPort } from "./mini-kernel.ts";

const PACKAGE = "@example/mechanic-counter";
const ADD = `${PACKAGE}/counter/add`;
const LOOK = `${PACKAGE}/counter/look`;
const Added = Type.Object({ by: Type.Number() });

/** A plugin with a tool that ends the activation, a free look, a listener on its own event, a rule and a limit. */
function createCounter(port: PluginPort): ReturnType<ResolvedPlugin["create"]> {
	const state = { total: 0, heard: 0 };
	return {
		tools: [
			{
				name: "add",
				description: "Adds to the counter.",
				parameters: Type.Object({ by: Type.Number() }),
				free: false,
				prepare: (raw) => {
					const by: unknown = typeof raw === "object" && raw !== null ? Reflect.get(raw, "by") : undefined;
					if (typeof by !== "number") return undefined;
					return {
						params: { by },
						rule: () => (by < 0 ? { ok: false, code: "NEGATIVE", detail: "Only up." } : undefined),
						execute: (): ToolOutcome => {
							state.total += by;
							port.emit("added", { by });
							return { ok: true, reply: `Total ${String(state.total)}`, endsTurn: true };
						},
					};
				},
				sample: () => ({ by: 1 }),
			},
			{ name: "look", description: "Reads the counter.", parameters: Type.Object({}), free: true, prepare: () => ({ params: {}, rule: () => undefined, execute: () => ({ ok: true, reply: String(state.total) }) }) },
		],
		services: [],
		listeners: [
			{
				source: "counter",
				type: "added",
				schema: Added,
				run: () => {
					state.heard += 1;
				},
			},
		],
		hooks: {
			inputs: [{ run: () => [`Total: ${String(state.total)}`, { kind: "status", text: `heard ${String(state.heard)}`, order: 1 }] }],
			news: () => state.total > 0,
		},
		stages: {
			after: (call, outcome) => {
				if (outcome.ok && call.name === "add") port.emit("noted", { heard: state.heard });
			},
		},
		jobs: {},
		limits: [{ id: "full", summary: "The counter is full.", check: () => (state.total >= 3 ? "full" : undefined) }],
		facts: { total: { output: Type.Number(), compute: () => state.total } },
		slice: { version: 1, save: () => state.total, load: () => undefined },
	};
}

const counter: ResolvedPlugin = { id: "counter", package: PACKAGE, version: "1.0.0", requires: [], provides: [], events: { added: Added, noted: Type.Object({ heard: Type.Number() }) }, audiences: { noted: ["human"] }, options: {}, create: createCounter };

/** One block of 4.3: every member is opened before any driver runs on, and member k calls only after member k-1 is closed. */
async function playBlock(port: SchedulerPort, drivers: DriverTable, block: readonly ActorId[], pending: Map<ActorId, boolean>): Promise<void> {
	let ready: Promise<void> = Promise.resolve();
	const turns: Promise<void>[] = [];
	for (const actor of block) {
		if (!port.actors.mayAct(actor)) continue;
		if (!(port.hasNews(actor) || pending.get(actor) === true || port.tick === 0)) {
			port.emit("activation_skipped", { actor });
			continue;
		}
		const driver = drivers[actor] ?? drivers[kindOf(actor)];
		if (driver === undefined) throw new SwtError({ code: "SWT-R011", summary: `no driver for ${actor}`, why: "An activated actor needs a driver.", fix: "Add a driver for the actor or its kind." });
		const open: OpenActivation = port.open(actor, port.inputsFor(actor).map(({ source, kind, text }) => (kind === undefined ? { source, text } : { source, kind, text })), { reason: "news" });
		const gate = ready;
		const gated = { ...open, call: async (as: string, params: unknown) => gate.then(() => open.call(as, params)) };
		const played = driver(gated).then(
			(result) => ({ failed: false, pending: result?.pending === true }),
			() => ({ failed: true, pending: false }),
		);
		const turn = Promise.all([gate, played]).then(([, end]) => {
			pending.set(actor, end.pending && !open.quietEnd);
			open.close(end.failed);
		});
		turns.push(turn);
		ready = turn;
	}
	await Promise.all(turns);
}

/** A scheduler with one pass per tick and one block of every actor of the kind `worker`. */
const scheduler: SchedulerDefinition = {
	id: "@example/scheduler",
	revision: 1,
	determinism: "seeded",
	options: Type.Object({}),
	events: { activation_skipped: Type.Object({ actor: Type.String() }) },
	create: () => {
		const pending = new Map<ActorId, boolean>();
		return {
			run: async (port, drivers, until): Promise<RunEnd | undefined> => {
				for (let played = 0; until === undefined || played < until.ticks; played += 1) {
					await port.beginTick();
					const may = port.actors.ids.filter((id) => kindOf(id) === "worker" && port.actors.mayAct(id));
					if (!port.halted) await playBlock(port, drivers, port.rng("order", port.tick).shuffle(may), pending);
					const end = await port.endTick(false);
					if (end !== undefined) return end;
				}
				return undefined;
			},
			slice: { version: 1, save: () => Object.fromEntries(pending), load: () => undefined },
		};
	},
};

const A01 = actorId("worker", "A01");
const A02 = actorId("worker", "A02");

const definition: KernelDefinition = {
	game: { id: "counting", hash: "0".repeat(64) },
	seed: 7,
	actors: [A01, A02].map((id) => ({ id, kind: "worker", grant: "worker", shared: {} })),
	plugins: [counter],
	scheduler: { definition: scheduler, options: {} },
	grants: { worker: [ADD, LOOK], watcher: [LOOK] },
	names: { [ADD]: "add", [LOOK]: "look" },
	startLocks: {},
	replies: { TOOL_UNKNOWN: "no such tool exists", STEP_LIMIT: "used up" },
	limits: { maxTicks: 5, maxCallsPerTick: 2 },
};

const adds: ActorDriver = async (activation) => {
	await activation.call("look", {});
	const outcome = await activation.call("add", { by: 1 });
	return { pending: !outcome.ok };
};

async function play(drivers: DriverTable): Promise<{ readonly end: RunEnd | undefined; readonly seen: readonly Envelope[]; readonly events: readonly Envelope[] }> {
	const seen: Envelope[] = [];
	const sink: EventSink = { write: (event) => void seen.push(event) };
	const kernel = createMiniKernel(definition, [sink]);
	const end = await scheduler.create(definition.scheduler.options).run(schedulerPort(kernel), drivers);
	return { end, seen, events: kernel.log.events };
}

describe("the kernel-facing contracts, used by hand", () => {
	it("carry a run from the definition to the end, through scheduler, driver, plugin and sink", async () => {
		const { end, seen, events } = await play({ worker: adds });
		expect(end).toEqual({ reason: "limit", tick: 2, limit: "counter.full" });
		expect(seen).toEqual(events);
		const tick0 = events.filter((event) => event.tick === 0).map((event) => `${event.actor} ${event.type}`);
		expect(tick0).toEqual([
			"kernel run_started",
			"kernel tick_started",
			"kernel activation_opened",
			"kernel activation_opened",
			...[A01, A02].flatMap((actor) => ["tool_called", "tool_result", "tool_called", "added", "noted", "tool_result", "activation_closed"].map((type) => `${actor} ${type}`)),
			"kernel tick_ended",
		]);
	});

	it("give every consequence of a call the canonical tool, the cause and the declared audience", async () => {
		const { events } = await play({ worker: adds });
		const called = events.find((event) => event.type === "tool_called" && event.tool === ADD);
		const noted = events.find((event) => event.type === "noted");
		expect(called).toMatchObject({ actor: A01, payload: { as: "add" } });
		expect(typeof called?.basis).toBe("number");
		expect(noted).toMatchObject({ source: `${PACKAGE}/counter`, tool: ADD, causedBy: called?.seq, audience: ["human"], payload: { heard: 1 } });
		expect(events.filter((event) => event.causedBy !== undefined && event.causedBy >= event.seq)).toEqual([]);
	});

	it("refuse with the kernel's codes and the stage, and count the calls of a tick", async () => {
		const outcomes: ToolOutcome[] = [];
		const driver: ActorDriver = async (activation) => {
			for (const [as, params] of [["nothing", {}], ["add", { by: "one" }], ["add", { by: -1 }]] as const) outcomes.push(await activation.call(as, params));
		};
		const { events } = await play({ [A01]: driver, worker: () => Promise.resolve(undefined) });
		expect(outcomes.slice(0, 3)).toEqual([{ ok: false, code: "TOOL_UNKNOWN", detail: "no such tool exists" }, { ok: false, code: "INVALID_ARGUMENTS" }, { ok: false, code: "STEP_LIMIT", detail: "used up" }]);
		expect(events.filter((event) => event.type === "tool_refused" && event.tick === 0).map((event) => event.payload)).toMatchObject([{ stage: "lock" }, { stage: "parse" }, { stage: "limit" }]);
		expect(events.find((event) => event.type === "activation_closed" && event.actor === A02)).toMatchObject({ payload: { calls: 0, outcome: "no-call" } });
	});

	it("end the run with an error an actor without a driver raises", async () => {
		await expect(play({})).rejects.toMatchObject({ code: "SWT-R011" });
	});
});
