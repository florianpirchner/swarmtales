/**
 * Cast members (SPEC 4), copied from packages/engine/src/cast.ts: named NPCs declared by the
 * story and driven only by the script. A cast member is hidden, visible or retired and shows a
 * public level. DMs sent to a cast member are recorded, never answered by a model; while a
 * collection is active they are collected into it.
 */
import { Type, type Static } from "typebox";

export const SolveEnd = Type.Object({ level: Type.Integer(), minutes: Type.Integer() });
export type SolveEnd = Static<typeof SolveEnd>;

export const MemberRecord = Type.Object({ id: Type.String(), level: Type.Integer(), hidden: Type.Boolean(), retired: Type.Boolean() });
export type MemberRecord = Static<typeof MemberRecord>;

export const CollectedDm = Type.Object({ from: Type.String(), text: Type.String(), minute: Type.Integer() });
export type CollectedDm = Static<typeof CollectedDm>;

export const CollectionRecord = Type.Object({
	into: Type.String(),
	cast: Type.String(),
	first: Type.Integer(),
	untilMinute: Type.Integer(),
	distinctSenders: Type.Boolean(),
	entries: Type.Array(CollectedDm),
	afterSolve: Type.Optional(SolveEnd),
});
export type CollectionRecord = Static<typeof CollectionRecord>;

/** Where a DM to a cast member was collected. */
export interface Collected {
	/** Every collection the DM was recorded into. */
	readonly collections: string[];
	/** The collections in which this is the sender's first entry. */
	readonly newSender: string[];
}

export function escrowAccountId(cast: string): string {
	return `ESCROW:${cast}`;
}

export class CastRegistry {
	readonly members = new Map<string, MemberRecord>();
	readonly collections = new Map<string, CollectionRecord>();

	constructor(declared: Readonly<Record<string, { readonly level: number; readonly hidden?: boolean }>>) {
		for (const [id, member] of Object.entries(declared)) {
			this.members.set(id, { id, level: member.level, hidden: member.hidden === true, retired: false });
		}
	}

	has(id: string): boolean {
		return this.members.has(id);
	}

	/** Declared, revealed and not retired: may speak, receive DMs and appear in `listAgents`. */
	isActive(id: string): boolean {
		const member = this.members.get(id);
		return member !== undefined && !member.hidden && !member.retired;
	}

	active(): readonly MemberRecord[] {
		return [...this.members.values()].filter((member) => !member.hidden && !member.retired);
	}

	setLevel(id: string, level: number): boolean {
		const member = this.members.get(id);
		if (member === undefined) return false;
		member.level = level;
		return true;
	}

	/** Returns whether anything changed. */
	reveal(id: string): boolean {
		const member = this.members.get(id);
		if (member === undefined || !member.hidden || member.retired) return false;
		member.hidden = false;
		return true;
	}

	/** Returns whether anything changed. Retirement is final. */
	retire(id: string): boolean {
		const member = this.members.get(id);
		if (member === undefined || member.retired) return false;
		member.retired = true;
		return true;
	}

	startCollection(into: string, cast: string, first: number, untilMinute: number, distinctSenders: boolean, afterSolve?: SolveEnd): boolean {
		if (this.collections.has(into) || !this.members.has(cast)) return false;
		this.collections.set(into, { into, cast, first, untilMinute, distinctSenders, entries: [], ...(afterSolve === undefined ? {} : { afterSolve }) });
		return true;
	}

	/** Moves a collection's end earlier (never later, never before `minute`); returns whether it changed. */
	shortenCollection(into: string, untilMinute: number, minute: number): boolean {
		const collection = this.collections.get(into);
		const until = Math.max(minute, untilMinute);
		if (collection === undefined || until >= collection.untilMinute) return false;
		collection.untilMinute = until;
		return true;
	}

	/** Records a DM to `cast` into every collection that still accepts it. */
	collect(cast: string, dm: CollectedDm): Collected {
		const collected: Collected = { collections: [], newSender: [] };
		for (const collection of this.collections.values()) {
			if (collection.cast !== cast || dm.minute >= collection.untilMinute || collection.entries.length >= collection.first) continue;
			const known = collection.entries.some((entry) => entry.from === dm.from);
			if (known && collection.distinctSenders) continue;
			collection.entries.push(dm);
			collected.collections.push(collection.into);
			if (!known) collected.newSender.push(collection.into);
		}
		return collected;
	}

	/**
	 * Restores member states and collections. Members the story no longer declares are dropped
	 * with their collections; members the snapshot does not know keep the story's initial state.
	 */
	restore(members: readonly MemberRecord[], collections: readonly CollectionRecord[]): void {
		for (const member of members) {
			const current = this.members.get(member.id);
			if (current === undefined) continue;
			current.level = member.level;
			current.hidden = member.hidden;
			current.retired = member.retired;
		}
		this.collections.clear();
		for (const collection of collections) {
			if (!this.members.has(collection.cast)) continue;
			this.collections.set(collection.into, { ...collection, entries: collection.entries.map((entry) => ({ ...entry })) });
		}
	}
}
