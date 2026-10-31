/**
 * The loaded tools by name. A name may have several variants when the roles they serve do not
 * overlap (a resident's tool and the gamemaker's of one name); a call finds the variant of its role.
 */
import type { GrantRole, MechanicTool } from "@swarmtales/contracts";

export interface LoadedTool {
	readonly owner: string;
	readonly tool: MechanicTool;
}

/** By name; one entry per role-disjoint variant. */
export type ToolCatalog = ReadonlyMap<string, readonly LoadedTool[]>;

/** Whether two tools of one name would serve a role twice (undefined: every role). */
export function servesOverlap(a: readonly GrantRole[] | undefined, b: readonly GrantRole[] | undefined): boolean {
	if (a === undefined || b === undefined) return true;
	return a.some((role) => b.includes(role));
}

/** The variant of a tool that serves `role`. */
export function toolFor(tools: ToolCatalog, name: string, role: GrantRole): LoadedTool | undefined {
	return tools.get(name)?.find((loaded) => loaded.tool.serves === undefined || loaded.tool.serves.includes(role));
}
