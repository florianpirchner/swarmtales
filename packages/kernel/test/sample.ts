// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The hand-written game the tests of the assembly play: one actor, one plugin with a counter, a scheduler of a few lines. */
import { Type } from "typebox";
import { kindOf, SwtError } from "@swarmtales/contracts";
import type { ActorDriver, ActorId, Envelope, EventSink, KernelDefinition, PluginInstance, ResolvedPlugin, RunEnd, SchedulerDefinition, SchedulerInstance } from "@swarmtales/contracts";

/** The one actor. */
export const A: ActorId = "resident:a";
/** The canonical name of the tool shown as `plus`. */
export const ADD = "@sample/counter/counter/add";
/** The payload of the counter's event. */
export const added = Type.Object({ by: Type.Number({ description: "The amount" }) }, { description: "The counter grew" });

/**
 * A hand-written plugin: a counter with a tool that adds to it (and throws for 13), a free look, a run limit at
 * `full`, a fact, a line of input and a slice.
 */
export function counter(full: number, more: Partial<PluginInstance["hooks"]> = {}): ResolvedPlugin {
	return {
		id: "counter",
		package: "@sample/counter",
		version: "1.0.0",
		requires: [],
		provides: [],
		events: { added },
		audiences: { added: ["all"] },
		options: null,
		create(port): PluginInstance {
			let count = 0;
			const add = (by: number) => {
				if (by === 13) throw new RangeError("unlucky");
				count += by;
				port.emit("added", { by });
				return { ok: true, reply: `now ${String(count)}` } as const;
			};
			return {
				tools: [
					{ name: "add", description: "Adds to the counter", parameters: added, free: false, prepare: (raw) => ({ params: raw, rule: () => undefined, execute: () => add(Number(raw)) }), sample: (_actor, random) => random.int(1, 3) },
					{ name: "look", description: "Reads the counter", parameters: Type.Object({}, { description: "Nothing" }), free: true, prepare: (raw) => ({ params: raw, rule: () => undefined, execute: () => ({ ok: true, reply: String(count) }) }) },
				],
				services: [],
				listeners: [],
				hooks: { inputs: [{ run: () => [`count ${String(count)}`] }], ...more },
				stages: {},
				jobs: {},
				limits: [{ id: "full", summary: "The counter is full", check: () => (count >= full ? "full" : undefined) }],
				facts: { count: { output: Type.Number({ description: "The counter" }), compute: () => count } },
				slice: { version: 1, save: () => count, load: (data) => void (count = Number(data)) },
			};
		},
	};
}

/** The three-line scheduler: every tick it activates every actor once, in the order of the definition. */
export const each: SchedulerDefinition = {
	id: "@sample/each",
	revision: 1,
	determinism: "seeded",
	options: Type.Object({}, { description: "No options" }),
	events: {},
	create: () => ({
		async run(port, drivers, until) {
			for (let ticks = 0; until === undefined || ticks < until.ticks; ticks += 1) {
				await port.beginTick();
				for (const id of port.actors.ids.filter(() => !port.halted)) {
					const open = port.open(id, port.inputsFor(id), {});
					await drivers[kindOf(id)]?.(open);
					open.close(false);
				}
				const end = await port.endTick(false);
				if (end !== undefined) return end;
			}
			return undefined;
		},
	}),
};

/** The scheduler `each` with another `run`. */
export const scheduled = (run: SchedulerInstance["run"]): SchedulerDefinition => ({ ...each, create: () => ({ run }) });

/** The definition of the game. */
export function definition(options: { readonly full?: number; readonly maxTicks?: number; readonly plugins?: readonly ResolvedPlugin[]; readonly scheduler?: SchedulerDefinition } = {}): KernelDefinition {
	const plugins = options.plugins ?? [counter(options.full ?? 100)];
	return { game: { id: "sample", hash: "h1" }, seed: 11, actors: [{ id: A, kind: "resident", grant: "all", shared: {} }], plugins, scheduler: { definition: options.scheduler ?? each, options: {} }, grants: { all: [ADD, "@sample/counter/counter/look"] }, names: { [ADD]: "plus" }, startLocks: {}, replies: {}, limits: { maxTicks: options.maxTicks ?? 4 } };
}

/** A sink that keeps what it gets. */
export function keeper(): EventSink & { readonly events: Envelope[]; readonly ends: RunEnd[] } {
	const events: Envelope[] = [];
	const ends: RunEnd[] = [];
	return { events, ends, write: (event) => void events.push(event), close: (end) => void ends.push(end) };
}

/** Adds the tick plus one, so a later tick is told from an earlier one. */
export const adder: ActorDriver = async (activation) => {
	await activation.call("plus", activation.tick + 1);
};
/** Calls the tool with the argument it throws for. */
export const unlucky: ActorDriver = async (activation) => {
	await activation.call("plus", 13);
};
/** The types of the events. */
export const types = (events: readonly Envelope[]): readonly string[] => events.map((event) => event.type);
/** What the code throws or rejects with. */
export const caught = async (code: () => unknown): Promise<unknown> => {
	try {
		await code();
	} catch (error) {
		return error;
	}
	return undefined;
};
/** A hook that throws. */
export const broken = (): never => {
	throw new RangeError("the hook broke");
};
/** The code of a developer error. */
export const codeOf = (error: unknown): string | undefined => (error instanceof SwtError ? error.issues[0]?.code : undefined);
