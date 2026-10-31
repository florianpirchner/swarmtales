/**
 * Asking the mechanics' `lock` handlers whether a resident could call a tool, without a call
 * (R2-D13): what `ctx.access.isOpen` and `open` add to the access locks, so a tool a phase closes
 * through a handler (a window of time, a phase) is not listed as open. A handler asked
 * this way gets a call with no arguments and the log's last seq, and must not emit.
 */
import type { MechanicInstance, ToolCall } from "@swarmtales/contracts";
import { residentActor, type LockProbe } from "./access.ts";
import { toolFor, type ToolCatalog } from "./catalog.ts";
import type { EventBus } from "./log.ts";

export function lockProbe(bus: EventBus, tools: ToolCatalog, instances: () => readonly MechanicInstance[]): LockProbe {
	return (resident, tool) => {
		const loaded = toolFor(tools, tool, "resident");
		if (loaded === undefined) return false;
		const before = bus.lastSeq;
		const call: ToolCall = { tool, owner: loaded.owner, actor: residentActor(resident), resident, params: undefined, seq: before };
		const open = instances().every((instance) => instance.hooks.lock(call) === undefined);
		if (bus.lastSeq !== before) throw new Error(`access: a lock handler must not emit while it is only asked whether ${tool} is open for ${resident}`);
		return open;
	};
}
