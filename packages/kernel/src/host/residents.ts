/**
 * The resident registry: ids, one attribute bag per resident and owning mechanic, and suspensions.
 * The core gives the attributes no meaning; it only asks whether a resident may act, which holds
 * while no mechanic suspends it.
 */
import type { JsonValue, ResidentId, ResidentsPort } from "@swarmtales/contracts";

export interface ResidentsState {
	readonly ids: readonly ResidentId[];
	/** resident -> owner -> key -> value */
	readonly attributes: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, JsonValue>>>>>>;
	/** resident -> owners that suspend it */
	readonly suspensions: Readonly<Record<string, readonly string[]>>;
}

type Emit = (type: "resident_suspended" | "resident_resumed", payload: Readonly<Record<string, string>>) => void;

/** Neutral resident ids `A01`..`Ann`. */
export function residentIds(count: number): readonly ResidentId[] {
	if (!Number.isInteger(count) || count < 0) throw new RangeError(`Invalid resident count: ${String(count)}`);
	const width = Math.max(2, String(count).length);
	return Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(width, "0")}`);
}

export class ResidentRegistry {
	readonly ids: readonly ResidentId[];
	readonly #attributes = new Map<string, Map<string, Map<string, JsonValue>>>();
	readonly #suspensions = new Map<string, string[]>();
	readonly #emit: Emit;

	constructor(ids: readonly ResidentId[], emit: Emit) {
		if (new Set(ids).size !== ids.length) throw new Error("residents: duplicate id");
		this.ids = ids;
		this.#emit = emit;
	}

	has(id: string): boolean {
		return this.ids.includes(id);
	}

	mayAct(id: ResidentId): boolean {
		return this.has(id) && (this.#suspensions.get(id) ?? []).length === 0;
	}

	attribute(id: ResidentId, key: string, owner: string): JsonValue | undefined {
		return this.#attributes.get(id)?.get(owner)?.get(key);
	}

	setAttribute(owner: string, id: ResidentId, key: string, value: JsonValue): void {
		this.#known(id);
		const byOwner = this.#attributes.get(id) ?? new Map<string, Map<string, JsonValue>>();
		const bag = byOwner.get(owner) ?? new Map<string, JsonValue>();
		bag.set(key, value);
		byOwner.set(owner, bag);
		this.#attributes.set(id, byOwner);
	}

	suspend(owner: string, id: ResidentId, reason: string): void {
		this.#known(id);
		const owners = this.#suspensions.get(id) ?? [];
		if (owners.includes(owner)) return;
		this.#suspensions.set(id, [...owners, owner]);
		this.#emit("resident_suspended", { resident: id, by: owner, reason });
	}

	resume(owner: string, id: ResidentId): void {
		const owners = this.#suspensions.get(id) ?? [];
		if (!owners.includes(owner)) return;
		this.#suspensions.set(
			id,
			owners.filter((name) => name !== owner),
		);
		this.#emit("resident_resumed", { resident: id, by: owner });
	}

	/** The port one mechanic gets: it writes only its own bag and its own suspensions. */
	portFor(owner: string): ResidentsPort {
		return {
			ids: this.ids,
			has: (id) => this.has(id),
			mayAct: (id) => this.mayAct(id),
			attribute: (id, key) => this.attribute(id, key, owner),
			setAttribute: (id, key, value) => {
				this.setAttribute(owner, id, key, value);
			},
			suspend: (id, reason) => {
				this.suspend(owner, id, reason);
			},
			resume: (id) => {
				this.resume(owner, id);
			},
		};
	}

	save(): ResidentsState {
		const attributes = Object.fromEntries(
			[...this.#attributes].map(([id, byOwner]) => [id, Object.fromEntries([...byOwner].map(([owner, bag]) => [owner, Object.fromEntries(bag)]))]),
		);
		return { ids: this.ids, attributes, suspensions: Object.fromEntries([...this.#suspensions].filter(([, owners]) => owners.length > 0)) };
	}

	load(state: ResidentsState): void {
		if (state.ids.join() !== this.ids.join()) throw new Error("residents: the snapshot has other residents than the story");
		for (const [id, byOwner] of Object.entries(state.attributes)) {
			for (const [owner, bag] of Object.entries(byOwner)) for (const [key, value] of Object.entries(bag)) this.setAttribute(owner, id, key, value);
		}
		for (const [id, owners] of Object.entries(state.suspensions)) this.#suspensions.set(id, [...owners]);
	}

	#known(id: string): void {
		if (!this.has(id)) throw new Error(`residents: unknown resident "${id}"`);
	}
}
