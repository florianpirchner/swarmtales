// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The cast members and their collections, carried from the old `mechanics/cast/src/registry.ts` (the class
 * `CastRegistry`) as functions over the JSON state: named figures the game declares and only the script drives. A
 * member is hidden, visible or retired and shows a public level. Direct messages to a member are recorded, never
 * answered by a model; while a collection is active they are collected into it.
 */
import { Type, type Static } from "typebox";

const SolveEnd = Type.Object({ level: Type.Integer({ description: "The level" }), minutes: Type.Integer({ description: "The ticks after its first solve" }) }, { description: "The end after a solve" });
const Member = Type.Object(
	{ id: Type.String({ description: "The member" }), level: Type.Integer({ description: "Its public level" }), hidden: Type.Boolean({ description: "Invisible until revealed" }), retired: Type.Boolean({ description: "Gone for good" }) },
	{ description: "One cast member" },
);
const Entry = Type.Object({ from: Type.String({ description: "The sender" }), text: Type.String({ description: "The text" }), minute: Type.Integer({ description: "The tick" }) }, { description: "A collected message" });
const Collection = Type.Object(
	{
		into: Type.String({ description: "Its name" }),
		cast: Type.String({ description: "The member it collects for" }),
		first: Type.Integer({ description: "How many entries it takes" }),
		untilMinute: Type.Integer({ description: "The tick it ends" }),
		distinctSenders: Type.Boolean({ description: "One entry per sender" }),
		entries: Type.Array(Entry, { description: "The entries, in order" }),
		afterSolve: Type.Optional(SolveEnd),
	},
	{ description: "One collection" },
);

/**
 * The state of the cast: the members in the game's order, the collections in the order they started, and the tick of
 * the first solve of each level, read from `progression.submission` (J73).
 *
 * @public
 */
export const CastSlice = Type.Object(
	{
		members: Type.Array(Member, { description: "The members, in the game's order" }),
		collections: Type.Array(Collection, { description: "The collections, in the order they started" }),
		solves: Type.Array(Type.Object({ level: Type.Integer({ description: "The level" }), tick: Type.Integer({ description: "Its first solve" }) }, { description: "A first solve" }), { description: "The first solve of each level" }),
	},
	{ description: "The cast" },
);

/**
 * The state of the cast.
 *
 * @public
 */
export type CastState = Static<typeof CastSlice>;
type Member = Static<typeof Member>;
type Collection = Static<typeof Collection>;
type Entry = Static<typeof Entry>;

/**
 * The name of a member's escrow account.
 *
 * @param cast - The member.
 * @returns `ESCROW:<cast>`.
 * @public
 */
export function escrowAccountId(cast: string): string {
	return `ESCROW:${cast}`;
}

/**
 * The state of a fresh run: every declared member, none retired.
 *
 * @param declared - The option `members`.
 * @returns The state.
 */
export function freshCast(declared: Readonly<Record<string, { readonly level: number; readonly hidden?: boolean }>>): CastState {
	return { members: Object.entries(declared).map(([id, member]) => ({ id, level: member.level, hidden: member.hidden === true, retired: false })), collections: [], solves: [] };
}

/**
 * A member by id.
 *
 * @param state - The state.
 * @param id - The member.
 * @returns It, or undefined.
 */
export function memberOf(state: CastState, id: string): Member | undefined {
	return state.members.find((member) => member.id === id);
}

/**
 * A collection by name.
 *
 * @param state - The state.
 * @param into - The name.
 * @returns It, or undefined.
 */
export function collectionOf(state: CastState, into: string): Collection | undefined {
	return state.collections.find((collection) => collection.into === into);
}

/**
 * The members that are declared, revealed and not retired, in the game's order, with their public level.
 *
 * @param state - The state.
 * @returns The active members.
 */
export function activeMembers(state: CastState): readonly { readonly id: string; readonly level: number }[] {
	return state.members.filter((member) => !member.hidden && !member.retired).map((member) => ({ id: member.id, level: member.level }));
}

/**
 * Starts a collection unless its name is taken or the member is unknown.
 *
 * @param state - The state.
 * @param spec - The collection without entries.
 * @returns Whether it started.
 */
export function startCollection(state: CastState, spec: Omit<Collection, "entries">): boolean {
	if (collectionOf(state, spec.into) !== undefined || memberOf(state, spec.cast) === undefined) return false;
	const { into, cast, first, untilMinute, distinctSenders, afterSolve } = spec;
	state.collections.push({ into, cast, first, untilMinute, distinctSenders, entries: [], ...(afterSolve === undefined ? {} : { afterSolve: { level: afterSolve.level, minutes: afterSolve.minutes } }) });
	return true;
}

/**
 * Moves a collection's end earlier: never later, never before `tick`.
 *
 * @param state - The state.
 * @param into - The collection.
 * @param untilMinute - The wanted end.
 * @param tick - Now.
 * @returns The new end, or undefined when nothing changed.
 */
export function shortenCollection(state: CastState, into: string, untilMinute: number, tick: number): number | undefined {
	const collection = collectionOf(state, into);
	const until = Math.max(tick, untilMinute);
	if (collection === undefined || until >= collection.untilMinute) return undefined;
	collection.untilMinute = until;
	return until;
}

/**
 * Records a message to `cast` into every collection that still takes it.
 *
 * @param state - The state.
 * @param cast - The member.
 * @param dm - The message.
 * @returns Every collection it went into, and those in which it is its sender's first entry.
 */
export function collect(state: CastState, cast: string, dm: Entry): { collections: string[]; newSender: string[] } {
	const collected: { collections: string[]; newSender: string[] } = { collections: [], newSender: [] };
	for (const collection of state.collections) {
		if (collection.cast !== cast || dm.minute >= collection.untilMinute || collection.entries.length >= collection.first) continue;
		const known = collection.entries.some((entry) => entry.from === dm.from);
		if (known && collection.distinctSenders) continue;
		collection.entries.push({ from: dm.from, text: dm.text, minute: dm.minute });
		collected.collections.push(collection.into);
		if (!known) collected.newSender.push(collection.into);
	}
	return collected;
}
