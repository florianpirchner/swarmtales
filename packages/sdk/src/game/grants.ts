// SPDX-License-Identifier: Apache-2.0
/**
 * Step 7 of game resolution: the tools of each grant name and the tools that start locked. Without an entry in the
 * game a grant name gets every tool whose `for` names it, in load order (the old `grants: "auto"`); a list replaces
 * that, a tweak changes it. The game writes bare tool names, as the old platform did; the result holds canonical ones.
 */
import type { CanonicalTool, GameData, SwtIssue } from "@swarmtales/contracts";
import { toolNotDefined } from "../errors.ts";
import { shownNameClashes, type NamedTool } from "./tool-names.ts";

/**
 * What {@link resolveGrants} takes.
 *
 * @public
 */
export interface GrantsInput {
	/** The tools of the game in load order, from `toolNames`. */
	readonly tools: readonly NamedTool[];
	/** The game's `grants`. */
	readonly grants?: GameData["grants"] | undefined;
	/** The game's `locked`. */
	readonly locked?: GameData["locked"] | undefined;
}

/**
 * The result of {@link resolveGrants}.
 *
 * @public
 */
export interface ResolvedGrants {
	/** Grant name to its tools, in the order a caller sees them: `KernelDefinition.grants`. */
	readonly grants: Readonly<Record<string, readonly CanonicalTool[]>>;
	/** The game's `locked` under the grant name `resident`: `KernelDefinition.startLocks`. Empty when nothing is locked. */
	readonly startLocks: Readonly<Record<string, readonly CanonicalTool[]>>;
	/** One `SWT-G012` per name that no mechanic defines, then the `SWT-G013` clashes of the finished grants. */
	readonly issues: readonly SwtIssue[];
}

/** Turns the bare names a game wrote into canonical ones and collects the names that stand for no tool. */
interface Lookup {
	/** The canonical names of a bare name; a bare name that two mechanics declare stands for both. */
	find(names: readonly string[], place: "granted" | "locked", path: string): readonly CanonicalTool[];
	readonly issues: SwtIssue[];
}

function lookupOf(tools: readonly NamedTool[]): Lookup {
	const byName = new Map<string, CanonicalTool[]>();
	for (const tool of tools) byName.set(tool.name, [...(byName.get(tool.name) ?? []), tool.canonical]);
	const issues: SwtIssue[] = [];
	const find: Lookup["find"] = (names, place, path) =>
		names.flatMap((name, index) => {
			const found = byName.get(name);
			if (found === undefined) issues.push(toolNotDefined({ tool: name, place, path: `${path}[${String(index)}]`, defined: [...byName.keys()] }));
			return found ?? [];
		});
	return { find, issues };
}

/**
 * Derives the grants from the `for` lists alone.
 *
 * @param tools - The tools in load order.
 * @returns Grant name to the tools that name it, in load order.
 */
function derivedGrants(tools: readonly NamedTool[]): Map<string, readonly CanonicalTool[]> {
	const derived = new Map<string, readonly CanonicalTool[]>();
	for (const tool of tools) {
		for (const grant of tool.for) derived.set(grant, [...(derived.get(grant) ?? []), tool.canonical]);
	}
	return derived;
}

/**
 * Derives the grants of a game and its start locks.
 *
 * @param input - The named tools and the game's `grants` and `locked`.
 * @returns The grants and the start locks by canonical name, and every issue found.
 * @example
 * ```ts
 * const { tools } = toolNames(sources);
 * resolveGrants({ tools, grants: { resident: { drop: ["resign"] } }, locked: ["playMove"] });
 * ```
 *
 * @public
 */
export function resolveGrants(input: GrantsInput): ResolvedGrants {
	const lookup = lookupOf(input.tools);
	const grants = derivedGrants(input.tools);
	for (const [grant, entry] of Object.entries(input.grants ?? {})) {
		const path = `grants.${grant}`;
		if (Array.isArray(entry)) {
			grants.set(grant, [...new Set(lookup.find(entry, "granted", path))]);
			continue;
		}
		const dropped = new Set(lookup.find(entry.drop ?? [], "granted", `${path}.drop`));
		const kept = (grants.get(grant) ?? []).filter((tool) => !dropped.has(tool));
		grants.set(grant, [...new Set([...kept, ...lookup.find(entry.add ?? [], "granted", `${path}.add`)])]);
	}
	const locked = [...new Set(lookup.find(input.locked ?? [], "locked", "locked"))];
	const resolved = Object.fromEntries(grants);
	return {
		grants: resolved,
		startLocks: locked.length === 0 ? {} : { resident: locked },
		issues: [...lookup.issues, ...shownNameClashes(resolved, input.tools)],
	};
}
