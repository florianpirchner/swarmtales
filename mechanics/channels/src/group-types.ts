// SPDX-License-Identifier: Apache-2.0
/** The words of the groups of `channels`: the limits, the shapes a group is read and saved in, and its ledger account. */

/** The founder and treasurer of the city's own groups, and the name its notices are signed with. */
export const CITY = "CITY";
/** The longest group name, in characters. */
export const MAX_GROUP_NAME_LENGTH = 60;
/** The longest group post, in characters. */
export const MAX_GROUP_POST_LENGTH = 800;
/** How many groups one resident may found. */
export const MAX_FOUNDED_GROUPS = 3;

/** Why the registry refuses. */
export type GroupErrorCode =
	| "GROUP_NOT_VISIBLE"
	| "GROUP_LIMIT"
	| "NOT_FOUNDER"
	| "NOT_TREASURER"
	| "ALREADY_MEMBER"
	| "NOT_MEMBER"
	| "TREASURER_ACTIVE"
	| "INVALID_NAME"
	| "INVALID_TEXT"
	| "INVALID_AMOUNT"
	| "INSUFFICIENT_FUNDS";

/** A group without its treasury, which lives in the ledger. */
export interface GroupInfo {
	/** `G1`, `G2`, in the order founded. */
	readonly id: string;
	/** The name, trimmed. */
	readonly name: string;
	/** Who founded it: a resident id or `CITY`. */
	readonly founder: string;
	/** Who may withdraw: a resident id or `CITY`. */
	readonly treasurer: string;
	/** The members, in join order. */
	readonly members: readonly string[];
}

/** One post in a group. */
export interface GroupPost {
	/** The city's message number (shared with direct messages and board posts). */
	readonly seq: number;
	/** Who wrote it. */
	readonly author: string;
	/** The text, trimmed. */
	readonly text: string;
	/** The tick it was posted in. */
	readonly tick: number;
}

/** A refusal of the registry, with its detail where the code has one. */
export interface GroupFailure {
	/** Never true. */
	readonly ok: false;
	/** The code. */
	readonly error: string;
	/** What the caller reads after the code. */
	readonly detail?: string;
}

/** What a registry call gives: the value, or why not. */
export type GroupResult<T> = { readonly ok: true; readonly value: T } | (GroupFailure & { readonly error: GroupErrorCode });

/** One group as the snapshot slice keeps it; members in join order. */
export interface GroupStateSnapshot {
	/** The id. */
	readonly id: string;
	/** The name. */
	readonly name: string;
	/** The founder. */
	readonly founder: string;
	/** The treasurer. */
	readonly treasurer: string;
	/** The members with the message number at their join. */
	readonly members: { readonly agent: string; readonly joinedAtSeq: number }[];
	/** How far each member has read. */
	readonly reads: { readonly agent: string; readonly seq: number }[];
	/** The posts, oldest first. */
	readonly posts: GroupPost[];
	/** Removed by the city; absent for a live group. */
	readonly removed?: true;
}

/** Every group, the founder counts and the last message number. */
export interface GroupsSnapshot {
	/** The groups, `G1` first. */
	readonly groups: GroupStateSnapshot[];
	/** How many groups each resident founded. */
	readonly founded: { readonly agent: string; readonly count: number }[];
	/** The city's last message number. */
	readonly seq: number;
}

/**
 * Names the ledger account of a group's treasury.
 *
 * @param groupId - The group.
 * @returns `GROUP:<id>`.
 */
export function groupAccountId(groupId: string): string {
	return `GROUP:${groupId}`;
}
