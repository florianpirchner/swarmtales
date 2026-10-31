/**
 * Grants and locks, the two halves of stage `lock`. Grants come from the story and say which role
 * may use a tool at all. Locks close one tool for one resident (a story's `locked` list at start,
 * then whatever mechanics lock and unlock); every change is an event.
 */
import type { AccessPort, Actor, GrantRole, Grants, ResidentId } from "@swarmtales/contracts";

type Emit = (type: "tool_locked" | "tool_unlocked", payload: Readonly<Record<string, string>>) => void;

/** The role an actor acts in; `host` holds no grants. */
export function roleOf(actor: Actor): GrantRole | undefined {
	if (actor.startsWith("resident:")) return "resident";
	if (actor === "gamemaker" || actor === "script") return actor;
	return undefined;
}

export function residentOf(actor: Actor): ResidentId | undefined {
	return actor.startsWith("resident:") ? actor.slice("resident:".length) : undefined;
}

export function residentActor(id: ResidentId): `resident:${ResidentId}` {
	return `resident:${id}`;
}

export class AccessControl {
	readonly #grants: Grants<string>;
	readonly #locks = new Map<ResidentId, Set<string>>();
	readonly #emit: Emit;

	constructor(grants: Grants<string>, emit: Emit) {
		this.#grants = grants;
		this.#emit = emit;
	}

	granted(role: GrantRole, tool: string): boolean {
		return (this.#grants[role] ?? []).includes(tool);
	}

	/** Tools granted to a role, in grant order. */
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
