/**
 * Loading a story's mechanics: the load order from the `requires` graph (ties keep the story's
 * order), one port per mechanic, and the checks that make a bad combination fail at start instead
 * of in the middle of a run (missing or doubled providers, clashing tool or event names, grants of
 * unknown tools).
 */
import { Check } from "typebox/value";
import { CORE_EVENTS, type CoreStory, type MechanicInstance, type MechanicPort, type MechanicUse, type PromptLookup, type ProvidedApi } from "@swarmtales/contracts";
import { createRng, deriveSeed } from "../random.ts";
import type { AccessControl } from "./access.ts";
import { servesOverlap, toolFor, type LoadedTool, type ToolCatalog } from "./catalog.ts";
import type { EventBus } from "./log.ts";
import type { ResidentRegistry } from "./residents.ts";
import type { Scheduler } from "./scheduler.ts";
import type { StagingQueue } from "./staging.ts";

/** Sorts the uses so every mechanic comes after the providers of the APIs it requires. */
export function loadOrder(uses: readonly MechanicUse[]): readonly MechanicUse[] {
	const ids = uses.map((use) => use.mechanic.id);
	const doubled = ids.find((id, index) => ids.indexOf(id) !== index);
	if (doubled !== undefined) throw new Error(`story: mechanic "${doubled}" is loaded twice`);
	const providers = new Map<string, string>();
	for (const use of uses) {
		for (const api of use.mechanic.provides) {
			const other = providers.get(api.name);
			if (other !== undefined) throw new Error(`story: "${other}" and "${use.mechanic.id}" both provide "${api.name}"; load only one`);
			providers.set(api.name, use.mechanic.id);
		}
	}
	const needs = new Map<string, readonly string[]>();
	for (const use of uses) {
		needs.set(
			use.mechanic.id,
			use.mechanic.requires.map((api) => {
				const provider = providers.get(api.name);
				if (provider === undefined) throw new Error(`story: "${use.mechanic.id}" requires "${api.name}", which no loaded mechanic provides`);
				return provider;
			}),
		);
	}
	const placed: MechanicUse[] = [];
	const done = new Set<string>();
	while (placed.length < uses.length) {
		const ready = uses.find((use) => !done.has(use.mechanic.id) && (needs.get(use.mechanic.id) ?? []).every((id) => done.has(id)));
		if (ready === undefined) throw new Error(`story: the requires of ${uses.filter((use) => !done.has(use.mechanic.id)).map((use) => use.mechanic.id).join(", ")} form a cycle`);
		placed.push(ready);
		done.add(ready.mechanic.id);
	}
	return placed;
}

export interface LoaderParts {
	readonly story: CoreStory;
	readonly bus: EventBus;
	readonly residents: ResidentRegistry;
	readonly scheduler: Scheduler;
	readonly access: AccessControl;
	readonly prompts: PromptLookup | undefined;
	readonly minute: () => number;
	readonly staging: StagingQueue;
}

export interface Loaded {
	readonly order: readonly string[];
	readonly instances: ReadonlyMap<string, MechanicInstance>;
	/** By name; one entry per role-disjoint variant. */
	readonly tools: ToolCatalog;
}

export function loadMechanics(parts: LoaderParts): Loaded {
	const { story, bus } = parts;
	const order = loadOrder(story.mechanics);
	const instances = new Map<string, MechanicInstance>();
	const services = new Map<string, ProvidedApi>();
	const tools = new Map<string, readonly LoadedTool[]>();
	const owners = new Map<string, string>();
	for (const use of order) {
		const definition = use.mechanic;
		for (const type of Object.keys(definition.events)) {
			if (Object.hasOwn(CORE_EVENTS, type)) throw new Error(`${definition.id}: event "${type}" is reserved by the core`);
			const owner = owners.get(type);
			if (owner !== undefined) throw new Error(`${definition.id}: event "${type}" is declared by "${owner}" too`);
			owners.set(type, definition.id);
		}
		let jobs: readonly string[] = [];
		const port = portFor(parts, definition.id, use, services, () => jobs, tools);
		const instance = definition.instantiate(port, use.options);
		jobs = instance.jobs;
		for (const service of instance.services) services.set(service.api.name, service);
		for (const tool of instance.tools) {
			const others = tools.get(tool.name) ?? [];
			const clash = others.find((other) => servesOverlap(other.tool.serves, tool.serves));
			if (clash !== undefined) throw new Error(`${definition.id}: tool "${tool.name}" is defined by "${clash.owner}" too, for the same role`);
			tools.set(tool.name, [...others, { owner: definition.id, tool }]);
		}
		instances.set(definition.id, instance);
		bus.listen(instance.listeners);
	}
	checkListeners(order, instances);
	const named = [...Object.values(story.grants).flat(), ...(story.locked ?? []), ...Object.keys(story.tools ?? {})];
	for (const name of named) if (!tools.has(name)) throw new Error(`story: tool "${name}" is granted, locked or configured, but no loaded mechanic defines it`);
	return { order: order.map((use) => use.mechanic.id), instances, tools };
}

/** A listener of a loaded mechanic's event must read it with the schema that mechanic declares (the frozen shared one). */
function checkListeners(order: readonly MechanicUse[], instances: ReadonlyMap<string, MechanicInstance>): void {
	const declared = new Map(order.map((use) => [use.mechanic.id, use.mechanic.events]));
	for (const [id, instance] of instances) {
		for (const listener of instance.listeners) {
			const events = declared.get(listener.source);
			if (events === undefined) continue;
			const schema = events[listener.type];
			if (schema === undefined) throw new Error(`${id}: listens to ${listener.source}.${listener.type}, which ${listener.source} does not declare`);
			if (schema !== listener.schema) throw new Error(`${id}: listens to ${listener.source}.${listener.type} with another schema than ${listener.source} declares; both must use the shared declaration`);
		}
	}
}

function portFor(
	parts: LoaderParts,
	id: string,
	use: MechanicUse,
	services: ReadonlyMap<string, ProvidedApi>,
	jobs: () => readonly string[],
	tools: ToolCatalog,
): MechanicPort {
	const isTool = (tool: string): boolean => tools.has(tool);
	const { bus, story } = parts;
	const definition = use.mechanic;
	let drawSeq = -1;
	let draws = 0;
	return {
		id,
		seed: story.seed,
		minute: parts.minute,
		emit(type, payload) {
			const schema = definition.events[type];
			if (schema === undefined) throw new Error(`${id}: event "${type}" is not declared`);
			if (!Check(schema, payload)) throw new Error(`${id}: the payload of "${type}" does not match its schema`);
			bus.emit(id, type, payload);
		},
		call(apiName, method, input) {
			const api = definition.requires.find((required) => required.name === apiName);
			if (api === undefined) throw new Error(`${id}: calls "${apiName}" without requiring it`);
			const provider = services.get(apiName);
			const spec = api.methods[method];
			if (provider === undefined || spec === undefined) throw new Error(`${id}: "${apiName}.${method}" is not available`);
			if (spec.kind === "query") return provider.call(method, input, id);
			const frame = bus.frame();
			return bus.run(frame, () => {
				const called = bus.emit("core", "service_called", { api: apiName, method, caller: id, input });
				return bus.run({ actor: frame.actor, cause: called.seq }, () => provider.call(method, input, id));
			});
		},
		render(prompt, variables, declared) {
			if (parts.prompts === undefined) throw new Error(`${id}: renders "${prompt}" but the host has no prompt lookup`);
			return parts.prompts.render(id, prompt, variables, declared);
		},
		random() {
			if (drawSeq !== bus.lastSeq) {
				drawSeq = bus.lastSeq;
				draws = 0;
			}
			draws += 1;
			return createRng(deriveSeed(story.seed, id, drawSeq, draws));
		},
		rng: (...labels) => createRng(deriveSeed(story.seed, ...labels)),
		stage(ref, params, options) {
			const tool = ref.name;
			const then = options?.then;
			if (then !== undefined && !jobs().includes(then)) throw new Error(`${id}: stages ${tool} with "then" job "${then}", which it does not declare`);
			if (!isTool(tool)) throw new Error(`${id}: stages "${tool}", which no loaded mechanic defines`);
			const variant = toolFor(tools, tool, "script");
			if (variant !== undefined && variant.tool.parameters !== ref.parameters) throw new Error(`${id}: stages "${tool}" with another parameter schema than ${variant.owner} defines; both must use the shared declaration`);
			parts.staging.push({ owner: id, tool, params, cause: bus.frame().cause, then });
		},
		residents: parts.residents.portFor(id),
		schedule: parts.scheduler.portFor(id, { has: (job) => jobs().includes(job) }, parts.minute),
		access: parts.access.portFor(id, isTool),
		log: bus,
	};
}
