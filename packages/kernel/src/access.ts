// SPDX-License-Identifier: Apache-2.0
/**
 * Part 4: grants and locks, the two halves of the stage `lock`. A grant says which tools an actor may use at all.
 * A lock closes one tool for one actor: the start locks of the definition (no event, they are part of it), then
 * whatever plugins lock and unlock, each change an event.
 */
import { SwtError, type AccessPort, type ActorId, type CanonicalTool, type KernelDefinition } from "@swarmtales/contracts";
import { misfit } from "./errors.ts";
import type { Actors, Log } from "./parts.ts";

type Probe = (actor: ActorId, tool: CanonicalTool) => boolean;

/** What the ports and the part share. */
interface Shared {
	readonly definition: KernelDefinition;
	readonly actors: Actors;
	readonly log: Log;
	/** Actor id to its locked tools. */
	readonly locks: Map<string, Set<string>>;
	/** The probes that run now: a lock handler that asks `isOpen` of the call it decides would never return. */
	readonly probing: Set<string>;
	probe: Probe;
}

function listOf(record: Readonly<Record<string, readonly CanonicalTool[]>>, key: string | undefined): readonly CanonicalTool[] {
	return key !== undefined && Object.hasOwn(record, key) ? (record[key] ?? []) : [];
}

function isLocked(shared: Shared, actor: ActorId, tool: CanonicalTool): boolean {
	return shared.locks.get(actor)?.has(tool) ?? false;
}

function isOpen(shared: Shared, actor: ActorId, tool: CanonicalTool): boolean {
	const grant = shared.actors.spec(actor)?.grant;
	if (!listOf(shared.definition.grants, grant).includes(tool) || isLocked(shared, actor, tool)) return false;
	const key = `${actor} ${tool}`;
	if (shared.probing.has(key)) throw new RangeError(`a lock handler asks whether "${tool}" is open for "${actor}" while it decides that very call`);
	shared.probing.add(key);
	try {
		return shared.probe(actor, tool);
	} finally {
		shared.probing.delete(key);
	}
}

function portOf(plugin: string, shared: Shared): AccessPort {
	const { definition, locks, log } = shared;
	// A lock of an id that is no actor would be saved and then refused by `restore`.
	const known = (actor: ActorId, tool: CanonicalTool): void => {
		if (!shared.actors.has(actor)) throw new RangeError(`${plugin}: no actor "${actor}" to lock or unlock a tool for`);
		if (Object.hasOwn(definition.names, tool) || Object.values(definition.grants).some((tools) => tools.includes(tool))) return;
		throw new RangeError(`${plugin}: no tool "${tool}" to lock or unlock`);
	};
	return {
		lock: (actor, tool) => {
			known(actor, tool);
			const set = locks.get(actor) ?? new Set<string>();
			if (set.has(tool)) return;
			set.add(tool);
			locks.set(actor, set);
			log.emit("kernel", "tool_locked", { actor, tool, by: plugin });
		},
		unlock: (actor, tool) => {
			known(actor, tool);
			if (locks.get(actor)?.delete(tool) !== true) return;
			log.emit("kernel", "tool_unlocked", { actor, tool, by: plugin });
		},
		isLocked: (actor, tool) => isLocked(shared, actor, tool),
		isOpen: (actor, tool) => isOpen(shared, actor, tool),
		open: (actor) => listOf(definition.grants, shared.actors.spec(actor)?.grant).filter((tool) => isOpen(shared, actor, tool)),
	};
}

function startLocks(definition: KernelDefinition, actors: Actors): Map<string, Set<string>> {
	const locks = new Map<string, Set<string>>();
	for (const id of actors.ids) {
		const tools = listOf(definition.startLocks, actors.spec(id)?.grant);
		if (tools.length > 0) locks.set(id, new Set(tools));
	}
	return locks;
}

function restore(shared: Shared, state: Readonly<Record<string, readonly string[]>>): void {
	shared.locks.clear();
	for (const [id, tools] of Object.entries(state)) {
		if (!shared.actors.has(id)) throw new SwtError(misfit(`the snapshot locks tools of "${id}", which is no actor of the definition`, "Resume the snapshot with the definition it was taken from."));
		shared.locks.set(id, new Set(tools));
	}
}

/**
 * Creates the grants and the locks of a run. `grantsOf` gives the tools of a grant in the order a caller sees them,
 * empty for an unknown grant; `setProbe` sets the answer to "no lock handler refuses", given by dispatch, which
 * `isOpen` and `open` of the ports ask; `state` gives the locks, actor id to canonical tools, sorted. Every actor starts with the start locks of its grant; no event is
 * written for them.
 *
 * @param definition - The kernel definition; `grants`, `startLocks` and `names` are read.
 * @param actors - The actors; the grant of an actor is `actors.spec(id)?.grant`.
 * @param log - The log; a lock and its lifting are written to it, in the frame of the code that asked.
 * @returns The access part. Until `setProbe` is called, no lock handler refuses. A port's `lock` and `unlock`
 * throw a `RangeError` for an id that is no actor and for a tool the definition neither names nor grants, and `isOpen` throws one when a lock
 * handler asks about the call it decides (`SWT-R003` once it leaves the plugin's code); `restore` throws
 * `SWT-R002` for an id that is no actor of the definition.
 */
export function createAccess(definition: KernelDefinition, actors: Actors, log: Log) {
	const shared: Shared = { definition, actors, log, locks: startLocks(definition, actors), probing: new Set(), probe: () => true };
	return {
		granted: (grant: string, tool: CanonicalTool): boolean => listOf(definition.grants, grant).includes(tool),
		grantsOf: (grant: string): readonly CanonicalTool[] => listOf(definition.grants, grant),
		isLocked: (actor: ActorId, tool: CanonicalTool): boolean => isLocked(shared, actor, tool),
		setProbe: (probe: Probe): void => {
			shared.probe = probe;
		},
		portFor: (pluginId: string): AccessPort => portOf(pluginId, shared),
		state: (): Readonly<Record<string, readonly string[]>> => Object.fromEntries([...shared.locks].filter(([, tools]) => tools.size > 0).map(([id, tools]) => [id, [...tools].sort()])),
		restore: (state: Readonly<Record<string, readonly string[]>>): void => {
			restore(shared, state);
		},
	};
}
