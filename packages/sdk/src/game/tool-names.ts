// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Step 6 of game resolution: the canonical name and the shown name of every tool. A game names a tool by its bare
 * name; the log names it by its canonical name; a model reads its shown name, which is the bare name unless the
 * game renames it with `as` on the mechanic. The tools are read from the heads, so no handler runs.
 */
import { TOOL_NAME_PATTERN, type CanonicalTool, type SwtIssue } from "@swarmtales/contracts";
import { shownNameClash, shownNameMalformed, toolNotDefined } from "../errors.ts";

/**
 * One mechanic of the game as the tool steps read it. A `MechanicUse` with the place it was listed at fits.
 *
 * @public
 */
export interface ToolSource {
	/** What is read of the mechanic's definition: its id, its package and the tools of its head. */
	readonly mechanic: {
		readonly id: string;
		readonly package: string;
		readonly head: { readonly tools: readonly { readonly name: string; readonly for: readonly string[] }[] };
	};
	/** Bare tool name to the name a model sees. */
	readonly as?: Readonly<Record<string, string>> | undefined;
	/** The data path of the mechanic in the game: `mechanics[2]`. */
	readonly path: string;
}

/**
 * One tool of the game under its three names.
 *
 * @public
 */
export interface NamedTool {
	/** The canonical name: `<package>/<mechanic id>/<bare name>`. */
	readonly canonical: CanonicalTool;
	/** The bare name, as the mechanic declares it and as the game's `grants` and `locked` write it. */
	readonly name: string;
	/** The name a model sees. */
	readonly shown: string;
	/** The id of the mechanic that declares it. */
	readonly owner: string;
	/** The grant names that get the tool when the game lists no grants. */
	readonly for: readonly string[];
	/** The data path of its mechanic in the game. */
	readonly path: string;
}

/**
 * The result of {@link toolNames}.
 *
 * @public
 */
export interface ToolNames {
	/** Every tool, in load order and within a mechanic in the order its head lists them. */
	readonly tools: readonly NamedTool[];
	/** Canonical name to shown name: `KernelDefinition.names`. */
	readonly names: Readonly<Record<CanonicalTool, string>>;
	/** One `SWT-G014` per shown name that is no valid tool name, and one `SWT-G012` per key of `as` that names no tool of its mechanic. */
	readonly issues: readonly SwtIssue[];
}

// One `SWT-G012` per own key of `as` that is no tool of the mechanic: a rename that would change nothing.
function strayRenames(source: ToolSource): readonly SwtIssue[] {
	if (source.as === undefined) return [];
	const defined = source.mechanic.head.tools.map((tool) => tool.name);
	return Object.keys(source.as)
		.filter((key) => !defined.includes(key))
		.map((key) => toolNotDefined({ tool: key, place: "renamed", path: `${source.path}.as.${key}`, defined }));
}

/**
 * Names every tool of the game's mechanics.
 *
 * @param sources - The mechanics in load order.
 * @returns The tools, the shown name of each, and the `SWT-G014` and `SWT-G012` issues.
 * @example
 * ```ts
 * const { tools, names } = toolNames([{ mechanic: gridGame, as: { playMove: "place" }, path: "mechanics[0]" }]);
 * names["@swarmtales/mechanic-grid-game/grid-game/playMove"]; // "place"
 * ```
 *
 * @public
 */
export function toolNames(sources: readonly ToolSource[]): ToolNames {
	const pattern = new RegExp(TOOL_NAME_PATTERN);
	const tools: NamedTool[] = [];
	const issues: SwtIssue[] = [];
	for (const source of sources) {
		const { mechanic, as, path } = source;
		for (const tool of mechanic.head.tools) {
			const renamed = as !== undefined && Object.hasOwn(as, tool.name) ? as[tool.name] : undefined;
			const shown = renamed ?? tool.name;
			const canonical = `${mechanic.package}/${mechanic.id}/${tool.name}`;
			if (!pattern.test(shown)) issues.push(shownNameMalformed({ shown, tool: canonical, path: renamed === undefined ? path : `${path}.as.${tool.name}` }));
			tools.push({ canonical, name: tool.name, shown, owner: mechanic.id, for: tool.for, path });
		}
		issues.push(...strayRenames(source));
	}
	return { tools, names: Object.fromEntries(tools.map((tool) => [tool.canonical, tool.shown])), issues };
}

/**
 * Finds the shown names that stand for more than one tool of a grant: a caller could not say which one it means.
 *
 * @param grants - Grant name to its tools, by canonical name.
 * @param tools - The tools of the game, from {@link toolNames}.
 * @returns One `SWT-G013` per grant and shown name, at the mechanic of the last tool of the clash.
 *
 * @public
 */
export function shownNameClashes(grants: Readonly<Record<string, readonly CanonicalTool[]>>, tools: readonly NamedTool[]): readonly SwtIssue[] {
	const byCanonical = new Map(tools.map((tool) => [tool.canonical, tool]));
	const issues: SwtIssue[] = [];
	for (const [grant, granted] of Object.entries(grants)) {
		const byShown = new Map<string, NamedTool[]>();
		for (const canonical of new Set(granted)) {
			const tool = byCanonical.get(canonical);
			if (tool !== undefined) byShown.set(tool.shown, [...(byShown.get(tool.shown) ?? []), tool]);
		}
		for (const [shown, same] of byShown) {
			const last = same.at(-1);
			if (same.length > 1 && last !== undefined) issues.push(shownNameClash({ shown, grant, tools: same.map((tool) => tool.canonical), path: last.path }));
		}
	}
	return issues;
}
