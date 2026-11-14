// SPDX-License-Identifier: Apache-2.0
/**
 * Part 3: the actors of a run and their suspensions. The kernel gives an actor no meaning; it only asks whether
 * the actor may act, which holds while no plugin suspends it.
 */
import { SwtError, type ActorId, type ActorSpec, type ActorsPort, type ActorsView } from "@swarmtales/contracts";
import { misfit } from "./errors.ts";
import type { Log, PartFactories } from "./parts.ts";

/** The suspensions: actor id to the ids of the plugins that hold one, in the order they were taken. */
type Held = Map<string, readonly string[]>;

function indexed(specs: readonly ActorSpec[]): ReadonlyMap<string, ActorSpec> {
	const byId = new Map<string, ActorSpec>();
	for (const spec of specs) {
		if (byId.has(spec.id)) throw new SwtError(misfit(`the definition lists the actor "${spec.id}" twice`, "List every actor once."));
		byId.set(spec.id, spec);
	}
	return byId;
}

function viewOf(specs: readonly ActorSpec[], byId: ReadonlyMap<string, ActorSpec>, held: Held): ActorsView {
	return {
		ids: specs.map((spec) => spec.id),
		ofKind: (kind) => specs.filter((spec) => spec.kind === kind).map((spec) => spec.id),
		has: (id) => byId.has(id),
		mayAct: (id) => byId.has(id) && (held.get(id) ?? []).length === 0,
		shared: (id, key) => {
			const bag = byId.get(id)?.shared;
			return bag !== undefined && Object.hasOwn(bag, key) ? bag[key] : undefined;
		},
	};
}

function portOf(plugin: string, view: ActorsView, held: Held, log: Log): ActorsPort {
	return {
		...view,
		suspend: (id: ActorId, reason: string) => {
			if (!view.has(id)) throw new RangeError(`${plugin}: no actor "${id}" to suspend`);
			const owners = held.get(id) ?? [];
			if (owners.includes(plugin)) return;
			held.set(id, [...owners, plugin]);
			log.emit("kernel", "actor_suspended", { actor: id, by: plugin, reason });
		},
		resume: (id: ActorId) => {
			const owners = held.get(id) ?? [];
			if (!owners.includes(plugin)) return;
			held.set(id, owners.filter((owner) => owner !== plugin));
			log.emit("kernel", "actor_resumed", { actor: id, by: plugin });
		},
	};
}

/**
 * Creates the actors of a run: who they are, and which plugins suspend them.
 *
 * @param specs - The actors of the kernel definition, in its order.
 * @param log - The log; a suspension and its lifting are written to it, in the frame of the code that asked.
 * @returns The actors. `portFor(plugin).suspend` throws a `RangeError` for an id that is no actor of the run
 * (`SWT-R003` once it leaves the plugin's code); `restore` throws `SWT-R002` for such an id.
 * @throws SwtError `SWT-R002` when two actors have the same id.
 */
export const createActors = ((specs, log) => {
	const byId = indexed(specs);
	const held: Held = new Map();
	const view = viewOf(specs, byId, held);
	return {
		...view,
		spec: (id) => byId.get(id),
		portFor: (pluginId) => portOf(pluginId, view, held, log),
		state: () => Object.fromEntries([...held].filter(([, owners]) => owners.length > 0)),
		restore: (state) => {
			held.clear();
			for (const [id, owners] of Object.entries(state)) {
				if (!byId.has(id)) throw new SwtError(misfit(`the snapshot suspends "${id}", which is no actor of the definition`, "Resume the snapshot with the definition it was taken from."));
				if (owners.length > 0) held.set(id, [...owners]);
			}
		},
	};
}) satisfies PartFactories["createActors"];
