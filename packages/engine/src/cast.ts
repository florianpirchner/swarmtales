/**
 * Cast members (SPEC 4): named NPCs declared by the story and driven only by
 * the director. A cast member is hidden, visible or retired and shows a
 * public level. DMs sent to a cast member are recorded, never answered by a
 * model; while a collection is active they are collected into it.
 */
import type { CompetitorId } from "@swarmtales/kernel";
import type { CastMember } from "@swarmtales/contracts";

export interface CastView {
	readonly id: string;
	readonly level: number;
	readonly hidden: boolean;
	readonly retired: boolean;
	readonly escrowAccount: string;
}

interface CastState {
	readonly id: string;
	level: number;
	hidden: boolean;
	retired: boolean;
}

export interface CollectedDm {
	readonly from: CompetitorId;
	readonly text: string;
	readonly minute: number;
}

export interface CollectionView {
	readonly into: string;
	readonly cast: string;
	readonly first: number;
	/** DMs are collected while the minute is before `untilMinute`. */
	readonly untilMinute: number;
	/** Only the first DM of every sender is collected. */
	readonly distinctSenders: boolean;
	readonly entries: readonly CollectedDm[];
	/** The window also ends `minutes` after the first resident passes `level` (v09); absent before. */
	readonly afterSolve?: SolveEnd;
}

/** An earlier end of a collection's window: `minutes` after the first resident passed `level` (v09). */
export interface SolveEnd {
	readonly level: number;
	readonly minutes: number;
}

interface CollectionState {
	readonly into: string;
	readonly cast: string;
	readonly first: number;
	untilMinute: number;
	readonly distinctSenders: boolean;
	readonly entries: CollectedDm[];
	readonly afterSolve?: SolveEnd;
}

/** Where a DM to a cast member was collected. */
export interface Collected {
	/** Every collection the DM was recorded into. */
	readonly collections: readonly string[];
	/** The collections in which this is the sender's first entry. */
	readonly newSender: readonly string[];
}

/** Member states and collections, for run snapshots (SPEC 17). */
export interface CastSnapshot {
	readonly members: readonly { readonly id: string; readonly level: number; readonly hidden: boolean; readonly retired: boolean }[];
	readonly collections: readonly CollectionView[];
}

export function escrowAccountId(cast: string): string {
	return `ESCROW:${cast}`;
}

export class CastRegistry {
	readonly #members = new Map<string, CastState>();
	readonly #collections = new Map<string, CollectionState>();

	constructor(cast: Readonly<Record<string, CastMember>>) {
		for (const [id, member] of Object.entries(cast)) {
			this.#members.set(id, { id, level: member.level, hidden: member.hidden === true, retired: false });
		}
	}

	has(id: string): boolean {
		return this.#members.has(id);
	}

	/** Declared, revealed and not retired: may speak, receive DMs and appear in `listAgents`. */
	isActive(id: string): boolean {
		const member = this.#members.get(id);
		return member !== undefined && !member.hidden && !member.retired;
	}

	get(id: string): CastView | undefined {
		const member = this.#members.get(id);
		return member === undefined ? undefined : view(member);
	}

	all(): readonly CastView[] {
		return [...this.#members.values()].map(view);
	}

	active(): readonly CastView[] {
		return this.all().filter((member) => !member.hidden && !member.retired);
	}

	setLevel(id: string, level: number): boolean {
		const member = this.#members.get(id);
		if (member === undefined) return false;
		member.level = level;
		return true;
	}

	/** Returns whether anything changed. */
	reveal(id: string): boolean {
		const member = this.#members.get(id);
		if (member === undefined || !member.hidden || member.retired) return false;
		member.hidden = false;
		return true;
	}

	/** Returns whether anything changed. Retirement is final. */
	retire(id: string): boolean {
		const member = this.#members.get(id);
		if (member === undefined || member.retired) return false;
		member.retired = true;
		return true;
	}

	startCollection(into: string, cast: string, first: number, untilMinute: number, distinctSenders = false, afterSolve?: SolveEnd): boolean {
		if (this.#collections.has(into) || !this.#members.has(cast)) return false;
		this.#collections.set(into, { into, cast, first, untilMinute, distinctSenders, entries: [], ...(afterSolve === undefined ? {} : { afterSolve }) });
		return true;
	}

	/** Moves a collection's end earlier (never later, never before `minute`); returns whether it changed. */
	shortenCollection(into: string, untilMinute: number, minute: number): boolean {
		const collection = this.#collections.get(into);
		const until = Math.max(minute, untilMinute);
		if (collection === undefined || until >= collection.untilMinute) return false;
		collection.untilMinute = until;
		return true;
	}

	/** Records a DM to `cast` into every collection that still accepts it. */
	collect(cast: string, dm: CollectedDm): Collected {
		const collections: string[] = [];
		const newSender: string[] = [];
		for (const collection of this.#collections.values()) {
			if (collection.cast !== cast || dm.minute >= collection.untilMinute || collection.entries.length >= collection.first) continue;
			const known = collection.entries.some((entry) => entry.from === dm.from);
			if (known && collection.distinctSenders) continue;
			collection.entries.push(dm);
			collections.push(collection.into);
			if (!known) newSender.push(collection.into);
		}
		return { collections, newSender };
	}

	snapshot(): CastSnapshot {
		return {
			members: [...this.#members.values()].map((member) => ({ id: member.id, level: member.level, hidden: member.hidden, retired: member.retired })),
			collections: [...this.#collections.values()].map((collection) => ({ ...collection, entries: [...collection.entries] })),
		};
	}

	/**
	 * Restores member states and collections. Members the story no longer
	 * declares are dropped with their collections; members the snapshot does
	 * not know keep the story's initial state.
	 */
	restore(state: CastSnapshot): void {
		for (const member of state.members) {
			const current = this.#members.get(member.id);
			if (current === undefined) continue;
			current.level = member.level;
			current.hidden = member.hidden;
			current.retired = member.retired;
		}
		this.#collections.clear();
		for (const collection of state.collections) {
			if (!this.#members.has(collection.cast)) continue;
			this.#collections.set(collection.into, { ...collection, entries: [...collection.entries] });
		}
	}

	collection(into: string): CollectionView | undefined {
		const collection = this.#collections.get(into);
		return collection === undefined ? undefined : { ...collection, entries: [...collection.entries] };
	}
}

function view(member: CastState): CastView {
	return {
		id: member.id,
		level: member.level,
		hidden: member.hidden,
		retired: member.retired,
		escrowAccount: escrowAccountId(member.id),
	};
}
