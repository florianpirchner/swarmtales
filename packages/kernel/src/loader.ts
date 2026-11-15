// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Part 5: loading the plugins of a definition, in its order, with the checks that only a loaded body shows or that
 * protect the kernel (3.2). Whatever does not fit is `SWT-R002`; the one thing left out is a listener of a plugin that
 * is not loaded (decision 10 of section 11).
 */
import { closest, KERNEL_EVENTS, SwtError, type CanonicalTool, type KernelDefinition, type Ordered, type PluginHooks, type PluginInstance, type Refusal, type ReviewAnswer, type ReviewQuestion, type RunLimit, type StageHandlers } from "@swarmtales/contracts";
import { guarded, misfit, twoToAct } from "./errors.ts";
import { ordered } from "./order.ts";
import type { LoadedTool, LoaderParts, OrderedHook } from "./parts.ts";
import { portFor } from "./plugin-port.ts";

type Instances = ReadonlyMap<string, PluginInstance>;
type Hooked<K extends OrderedHook> = readonly { readonly plugin: string; readonly run: NonNullable<PluginHooks[K]>[number]["run"] }[];
type HookTable = { readonly [K in OrderedHook]: Hooked<K> };
type StageTable = { readonly [K in Extract<keyof StageHandlers, string>]: readonly NonNullable<StageHandlers[K]>[] };

const bad = (summary: string, fix: string): SwtError => new SwtError(misfit(summary, fix));

function checkEvents(definition: KernelDefinition): void {
	const owners = new Map<string, string>();
	for (const { id, events } of [...definition.plugins, definition.scheduler.definition]) {
		for (const type of Object.keys(events)) {
			if (Object.hasOwn(KERNEL_EVENTS, type)) throw bad(`"${id}" declares the event "${type}", which is an event of the kernel`, "Give the event another name.");
			const owner = owners.get(type);
			if (owner !== undefined) throw bad(`"${owner}" and "${id}" both declare the event "${type}"`, "Give one of the two events another name.");
			owners.set(type, id);
		}
	}
}

function createInstances(definition: KernelDefinition, parts: LoaderParts): Instances {
	const instances = new Map<string, PluginInstance>();
	const portParts = { ...parts, definition, hasJob: (id: string, job: string): boolean => Object.hasOwn(instances.get(id)?.jobs ?? {}, job) };
	for (const plugin of definition.plugins) {
		if (instances.has(plugin.id)) throw bad(`the plugin "${plugin.id}" is listed twice`, "List every plugin id once.");
		const instance = guarded(plugin.id, () => plugin.create(portFor(plugin, portParts)));
		instances.set(plugin.id, instance);
		for (const service of instance.services) parts.services.provide(plugin.id, service);
		const provided = instance.services.map((service) => service.service.name);
		if ([...provided].sort().join() !== [...plugin.provides].sort().join()) {
			throw bad(`"${plugin.id}" declares the services [${plugin.provides.join(", ")}] and provides [${provided.join(", ")}]`, "Provide exactly the declared services.");
		}
	}
	for (const plugin of definition.plugins) {
		const missing = plugin.requires.find((service) => !parts.services.has(service));
		if (missing !== undefined) throw bad(`"${plugin.id}" requires the service "${missing}", which no loaded plugin provides`, `Load a plugin that provides "${missing}".`);
	}
	return instances;
}

function loadTools(definition: KernelDefinition, instances: Instances): { readonly tools: ReadonlyMap<CanonicalTool, LoadedTool>; readonly byShownName: ReadonlyMap<string, readonly LoadedTool[]> } {
	const tools = new Map<CanonicalTool, LoadedTool>();
	const byShownName = new Map<string, readonly LoadedTool[]>();
	for (const plugin of definition.plugins) {
		for (const tool of instances.get(plugin.id)?.tools ?? []) {
			const loaded = { canonical: `${plugin.package}/${plugin.id}/${tool.name}`, owner: plugin.id, tool };
			if (tools.has(loaded.canonical)) throw bad(`"${plugin.id}" has two tools "${tool.name}"`, "Give one of the two tools another name.");
			tools.set(loaded.canonical, loaded);
			const shown = definition.names[loaded.canonical] ?? tool.name;
			byShownName.set(shown, [...(byShownName.get(shown) ?? []), loaded]);
		}
	}
	const named = [...Object.values(definition.grants).flat(), ...Object.keys(definition.names), ...Object.values(definition.startLocks).flat()];
	const unknown = named.find((name) => !tools.has(name));
	if (unknown !== undefined) {
		const near = closest(unknown, [...tools.keys()]);
		throw bad(`the tool "${unknown}" is granted, named or locked at the start, and no loaded plugin has it`, near === undefined ? "Name a tool of a loaded plugin, as `<package>/<plugin id>/<tool>`." : `Did you mean "${near}"?`);
	}
	return { tools, byShownName };
}

// A listener of a plugin that is not loaded is left out, so a plugin stays loadable without the one it listens to
// (decision 10). Checks every other listener against the plugin that declares its event, then gives the listeners of each event to the log in their final order.
function addListeners(definition: KernelDefinition, instances: Instances, parts: LoaderParts): void {
	const declaring = new Map(definition.plugins.map((plugin) => [plugin.id, plugin]));
	const entries = [...instances].flatMap(([plugin, instance]) =>
		instance.listeners.flatMap((listener) => {
			const event = `${listener.source}.${listener.type}`;
			const owner = declaring.get(listener.source);
			if (owner === undefined) return [];
			if (!Object.hasOwn(owner.events, listener.type)) throw bad(`"${plugin}" listens to ${event}, which "${listener.source}" does not declare`, "Listen to a declared event.");
			if (owner.events[listener.type] !== listener.schema) throw bad(`"${plugin}" listens to ${event} with another schema than "${listener.source}" declares`, "Use the shared declaration of the event in both.");
			return [{ ...listener, plugin, event, from: `${owner.package}/${owner.id}` }];
		}),
	);
	for (const event of new Set(entries.map((entry) => entry.event))) {
		for (const entry of ordered(entries.filter((other) => other.event === event))) {
			parts.log.listen(entry.from, entry.type, (envelope) => {
				guarded(entry.plugin, () => {
					entry.run(envelope);
				});
			});
		}
	}
}

function placeHooks<A extends readonly unknown[], R>(instances: Instances, pick: (hooks: PluginHooks) => readonly Ordered<(...args: A) => R>[] | undefined): readonly { readonly plugin: string; readonly run: (...args: A) => R }[] {
	return ordered([...instances].flatMap(([plugin, instance]) => (pick(instance.hooks) ?? []).map((hook) => ({ ...hook, plugin, run: (...args: A): R => guarded(plugin, () => hook.run(...args)) }))));
}

/**
 * Runs the review of a plugin like `guarded`, and guards the `decide` of the question it gives too.
 *
 * @param plugin - The id of the plugin the review belongs to.
 * @param review - The review.
 * @returns The question with a guarded `decide`, a refusal, or undefined.
 * @throws SwtError `SWT-R003` as `guarded`.
 */
export const guardedReview = (plugin: string, review: () => ReviewQuestion | Refusal | undefined): ReviewQuestion | Refusal | undefined => [guarded(plugin, review)].map((asked) => (asked === undefined || "ok" in asked ? asked : { ...asked, decide: (answer: ReviewAnswer) => guarded(plugin, () => asked.decide?.(answer)) }))[0];

function stageTable(instances: Instances): StageTable {
	const all = [...instances].map(([plugin, instance]) => ({ plugin, stages: instance.stages }));
	return {
		lock: all.flatMap(({ plugin, stages }) => (stages.lock === undefined ? [] : [(call) => guarded(plugin, () => stages.lock?.(call))])),
		rule: all.flatMap(({ plugin, stages }) => (stages.rule === undefined ? [] : [(call) => guarded(plugin, () => stages.rule?.(call))])),
		review: all.flatMap(({ plugin, stages }) => (stages.review === undefined ? [] : [(call, answerable) => guardedReview(plugin, () => stages.review?.(call, answerable))])),
		after: all.flatMap(({ plugin, stages }) => (stages.after === undefined ? [] : [(call, outcome) => guarded(plugin, () => stages.after?.(call, outcome))])),
	};
}

/**
 * Loads the plugins in the order of the definition, which is `order`: creates the instances, registers their services, tools and
 * listeners, and places the hooks. A function it hands on without its owner (a hook, a stage handler, a listener,
 * `create`) is wrapped so that its throw is `SWT-R003`.
 *
 * @param definition - The kernel definition.
 * @param parts - The log, the actors, the access, the services and the clock.
 * @returns What was loaded: the instances and the tools by canonical name and by shown name (one shown name may
 * stand for tools of different grants), `hooks(hook)` with the registrations of one hook in the final order (load
 * order plus `after`), `stages(stage)` with the handlers of one stage in load order, and the run limits in load
 * order, each with the id `<plugin id>.<limit id>`.
 * @throws SwtError `SWT-R002` for a check of loading that fails, `SWT-R013` for two `toAct` hooks, `SWT-R016` for a cycle of `after`, `SWT-R003` when a plugin's `create` throws.
 */
export function loadPlugins(definition: KernelDefinition, parts: LoaderParts) {
	checkEvents(definition);
	const instances = createInstances(definition, parts);
	const order: readonly string[] = [...instances.keys()];
	const acting = order.filter((id) => instances.get(id)?.hooks.toAct !== undefined);
	if (acting.length > 1) throw new SwtError(twoToAct(acting));
	const catalogue = loadTools(definition, instances);
	addListeners(definition, instances, parts);
	const hooks: HookTable = {
		runStarted: placeHooks(instances, (all) => all.runStarted),
		tickStarted: placeHooks(instances, (all) => all.tickStarted),
		inputs: placeHooks(instances, (all) => all.inputs),
		activationOpened: placeHooks(instances, (all) => all.activationOpened),
		activationClosed: placeHooks(instances, (all) => all.activationClosed),
		tickEnded: placeHooks(instances, (all) => all.tickEnded),
		runEnded: placeHooks(instances, (all) => all.runEnded),
	};
	const stages = stageTable(instances);
	const limits: readonly { readonly id: string; readonly limit: RunLimit }[] = [...instances].flatMap(([plugin, instance]) => instance.limits.map((limit) => ({ id: `${plugin}.${limit.id}`, limit })));
	return { order, instances, ...catalogue, hooks: <K extends OrderedHook>(hook: K): Hooked<K> => hooks[hook], stages: <K extends keyof StageTable>(stage: K): StageTable[K] => stages[stage], limits };
}
