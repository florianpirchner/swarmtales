/**
 * The loaded tools by name. A name may have several variants when the roles they serve do not
 * overlap (a resident's tool and the gamemaker's of one name); a call finds the variant of its role.
 */
import type { MechanicTool } from "@swarmtales/contracts";
import { serves, type Caller } from "./names.ts";

export interface LoadedTool {
	readonly owner: string;
	readonly tool: MechanicTool;
}

/** By name; one entry per role-disjoint variant. */
export type ToolCatalog = ReadonlyMap<string, readonly LoadedTool[]>;

/** The variant of a tool that serves the caller (by its grant name or its overseer's definition id). */
export function toolFor(tools: ToolCatalog, name: string, caller: Caller): LoadedTool | undefined {
	return tools.get(name)?.find((loaded) => serves(loaded.tool.serves, caller));
}
