// SPDX-License-Identifier: Apache-2.0
/**
 * Step 5 of game resolution: the providers of the services and the load order of the mechanics. The order decides
 * the order of the tools a model sees and of tied hooks, so the algorithm is the one of the old platform, unchanged.
 */
import type { SwtIssue } from "@swarmtales/contracts";
import { noProvider, requiresCycle, twoProviders } from "../errors.ts";

/**
 * What the load order reads of a mechanic: the head's id and the names of its services.
 *
 * @public
 */
export interface LoadOrderEntry {
	/** The mechanic id. */
	readonly id: string;
	/** The services it cannot run without. */
	readonly requires?: readonly { readonly name: string }[];
	/** The services it provides. */
	readonly provides?: readonly { readonly name: string }[];
	/** The services it calls when they are loaded. */
	readonly uses?: readonly { readonly name: string }[];
}

/**
 * The result of {@link loadOrder}.
 *
 * @public
 */
export interface LoadOrder<T extends LoadOrderEntry> {
	/** Every entry once, in load order. With a `SWT-G032` issue, the entries of the cycle come last, in the game's order. */
	readonly order: readonly T[];
	/** `SWT-G031`, `SWT-G030` and `SWT-G032`, in this order; empty when the game loads. */
	readonly issues: readonly SwtIssue[];
}

type Edges = ReadonlyMap<string, readonly string[]>;

/**
 * Finds the provider of each service.
 *
 * @param entries - The mechanics in the game's order.
 * @returns The provider of each service (the first one stands), and one `SWT-G031` per service with several.
 */
function providersOf(entries: readonly LoadOrderEntry[]): { readonly providers: ReadonlyMap<string, string>; readonly issues: readonly SwtIssue[] } {
	const all = new Map<string, string[]>();
	for (const entry of entries) {
		for (const service of entry.provides ?? []) all.set(service.name, [...(all.get(service.name) ?? []), entry.id]);
	}
	const providers = new Map([...all].map(([service, ids]) => [service, ids[0] ?? ""]));
	const issues = [...all].filter(([, ids]) => ids.length > 1).map(([service, ids]) => twoProviders({ service, providers: ids }));
	return { providers, issues };
}

/**
 * Places the entries one by one: the first in the game's order whose edges are all placed; when only `wants`
 * block, the first whose `needs` are placed.
 *
 * @param entries - The mechanics in the game's order.
 * @param needs - Per id, the providers of what it requires.
 * @param wants - Per id, the providers of the loaded services it uses.
 * @returns The placed entries in load order, and the entries a cycle of `needs` holds back.
 */
function place<T extends LoadOrderEntry>(entries: readonly T[], needs: Edges, wants: Edges): { readonly placed: readonly T[]; readonly cycle: readonly T[] } {
	const placed: T[] = [];
	const done = new Set<string>();
	const placedAll = (edges: Edges, id: string): boolean => (edges.get(id) ?? []).every((other) => done.has(other));
	while (placed.length < entries.length) {
		const open = entries.filter((entry) => !done.has(entry.id));
		const ready =
			open.find((entry) => placedAll(needs, entry.id) && placedAll(wants, entry.id)) ??
			// Only optional uses block: they form a cycle, and the game's order breaks it.
			open.find((entry) => placedAll(needs, entry.id));
		if (ready === undefined) return { placed, cycle: open };
		placed.push(ready);
		done.add(ready.id);
	}
	return { placed, cycle: [] };
}

/**
 * Sorts the mechanics of a game so that each comes after the providers of the services it requires and of the
 * loaded services it uses. When only `uses` edges hold the rest back (a cycle of optional uses), the first of them
 * in the game's order whose requires are placed loads next. A port of the old `loadOrder`, unchanged; it collects
 * issues where the old one threw at the first.
 *
 * @param entries - The mechanics in the game's order. Ids are unique (step 4 reports `SWT-G021`); of a doubled
 * id only the first entry is placed. The position in this list is the index in the data path of an issue. The
 * `roster` plugin that resolution adds is not passed in (an entry without edges would load before the mechanics
 * of a cycle of uses); its service is named in `given`, and resolution places the plugin afterwards.
 * @param given - The services a plugin outside the list provides (resolution passes `roster`). A listed provider
 * of such a service stands; without one, a mechanic that requires it gets no issue and no edge.
 * @returns The load order and the issues: a service with two providers (`SWT-G031`, the first stands), a
 * required service without a provider (`SWT-G030`, the edge is dropped), a cycle of `requires` (`SWT-G032`).
 * @example
 * ```ts
 * const { order, issues } = loadOrder([consensus, gridGame]);
 * // consensus requires what gridGame provides: order is [gridGame, consensus], issues is []
 * ```
 *
 * @public
 */
export function loadOrder<T extends LoadOrderEntry>(entries: readonly T[], given: readonly string[] = []): LoadOrder<T> {
	const unique = entries.filter((entry, index) => entries.findIndex((other) => other.id === entry.id) === index);
	const { providers, issues: doubled } = providersOf(unique);
	const missing: SwtIssue[] = [];
	const needs = new Map<string, readonly string[]>();
	const wants = new Map<string, readonly string[]>();
	for (const entry of unique) {
		const path = `mechanics[${entries.indexOf(entry)}]`;
		needs.set(
			entry.id,
			(entry.requires ?? []).flatMap((service) => {
				const provider = providers.get(service.name);
				if (provider === undefined && !given.includes(service.name)) missing.push(noProvider({ mechanic: entry.id, service: service.name, path }));
				return provider ?? [];
			}),
		);
		const loaded = (entry.uses ?? []).flatMap((service) => providers.get(service.name) ?? []);
		wants.set(entry.id, loaded.filter((id) => id !== entry.id));
	}
	const { placed, cycle } = place(unique, needs, wants);
	const cyclic = cycle.length === 0 ? [] : [requiresCycle({ mechanics: cycle.map((entry) => entry.id) })];
	return { order: [...placed, ...cycle], issues: [...doubled, ...missing, ...cyclic] };
}
