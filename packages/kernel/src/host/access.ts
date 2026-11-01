/**
 * Grants and locks, the two halves of stage `lock`. Grants come from the story and say which role
 * may use a tool at all. Locks close one tool for one resident (a story's `locked` list at start,
 * then whatever mechanics lock and unlock); every change is an event.
 */
import type { AccessPort, Actor, GrantRole, Grants, ResidentId } from "@swarmtales/contracts";

type Emit = (type: "tool_locked" | "tool_unlocked", payload: Readonly<Record<string, string>>) => void;

export function residentOf(actor: Actor): ResidentId | undefined {
	return actor.startsWith("resident:") ? actor.slice("resident:".length) : undefined;
}

export function residentActor(id: ResidentId): `resident:${ResidentId}` {
	return `resident:${id}`;
}

/** Whether every mechanic's `lock` handler lets a resident's call of a tool through (set by the host once the mechanics are loaded). */
export type LockProbe = (resident: ResidentId, tool: string) => boolean;

export class AccessControl {
	readonly #grants: Grants<string, string>;
	readonly #locks = new Map<ResidentId, Set<string>>();
	readonly #emit: Emit;
	#probe: LockProbe = () => true;
	/** The probes running now: a lock handler that asks `isOpen` of the tool it is deciding would loop. */
	readonly #probing = new Set<string>();

	constructor(grants: Grants<string, string>, emit: Emit) {
		this.#grants = grants;
		this.#emit = emit;
	}

	setProbe(probe: LockProbe): void {
		this.#probe = probe;
	}

	/** Granted to residents, a loaded tool, not locked, and no lock handler refuses it (R2-D13). */
	isOpen(resident: ResidentId, tool: string, isTool: (tool: string) => boolean): boolean {
		if (!this.granted("resident", tool) || !isTool(tool) || this.isLocked(resident, tool)) return false;
		const key = `${resident} ${tool}`;
		if (this.#probing.has(key)) throw new Error(`access: a lock handler asks whether ${tool} is open for ${resident} while it decides that very call`);
		this.#probing.add(key);
		try {
			return this.#probe(resident, tool);
		} finally {
			this.#probing.delete(key);
		}
	}

	/** Whether the story grants the tool to the grant name. */
	granted(role: GrantRole, tool: string): boolean {
		return (this.#grants[role] ?? []).includes(tool);
	}

	/** Tools granted to a grant name, in grant order. */
	grantsOf(role: GrantRole): readonly string[] {
		return this.#grants[role] ?? [];
	}

	isLocked(resident: ResidentId, tool: string): boolean {
		return this.#locks.get(resident)?.has(tool) ?? false;
	}

	/** The story's start locks: no events, they are part of the story. */
	lockAtStart(residents: readonly ResidentId[], tools: readonly string[]): void {
		for (const resident of residents) this.#locks.set(resident, new Set(tools));
	}

	portFor(owner: string, isTool: (tool: string) => boolean): AccessPort {
		const check = (tool: string): void => {
			if (!isTool(tool)) throw new Error(`${owner}: no tool "${tool}" to lock or unlock`);
		};
		return {
			lock: (resident, tool) => {
				check(tool);
				const set = this.#locks.get(resident) ?? new Set<string>();
				if (set.has(tool)) return;
				set.add(tool);
				this.#locks.set(resident, set);
				this.#emit("tool_locked", { resident, tool, by: owner });
			},
			unlock: (resident, tool) => {
				check(tool);
				const set = this.#locks.get(resident);
				if (set?.has(tool) !== true) return;
				set.delete(tool);
				this.#emit("tool_unlocked", { resident, tool, by: owner });
			},
			isLocked: (resident, tool) => this.isLocked(resident, tool),
			isOpen: (resident, tool) => this.isOpen(resident, tool, isTool),
			open: (resident) => this.grantsOf("resident").filter((tool) => this.isOpen(resident, tool, isTool)),
		};
	}

	save(): Readonly<Record<string, readonly string[]>> {
		return Object.fromEntries([...this.#locks].map(([resident, tools]) => [resident, [...tools].sort()]));
	}

	load(locks: Readonly<Record<string, readonly string[]>>): void {
		this.#locks.clear();
		for (const [resident, tools] of Object.entries(locks)) this.#locks.set(resident, new Set(tools));
	}
}
