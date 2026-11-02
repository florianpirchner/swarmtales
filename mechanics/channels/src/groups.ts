/**
 * Groups (copied from packages/engine/src/groups.ts, without the ledger).
 *
 * Groups are private: non-members learn neither existence nor name nor members
 * (`GROUP_NOT_VISIBLE`, no existence leak). New members only read posts from their join on. The
 * treasury is the ledger account `GROUP:<id>`; the mechanic books it through `LedgerApi`, the
 * registry only decides who may. The city may found groups itself (the tribunal's): their founder
 * and treasurer is the city, so no resident adds, removes or withdraws, and the city removes them
 * again. A removed group keeps its id and its posts (for blames), but nobody sees it any more.
 */
import type { MessageNumbers } from "./numbers.ts";

export const CITY = "CITY";
export const MAX_GROUP_NAME_LENGTH = 60;
export const MAX_GROUP_POST_LENGTH = 800;
export const MAX_FOUNDED_GROUPS = 3;

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
	readonly id: string;
	readonly name: string;
	readonly founder: string;
	readonly treasurer: string;
	readonly members: readonly string[];
}

export interface GroupPost {
	/** The city's message number (shared with DMs and board posts). */
	readonly seq: number;
	readonly author: string;
	readonly text: string;
	readonly minute: number;
}

interface GroupState {
	readonly id: string;
	readonly name: string;
	readonly founder: string;
	treasurer: string;
	/** Member to the city's last message number at join time. */
	readonly joinedAtSeq: Map<string, number>;
	/** Member to the highest sequence read. */
	readonly readSeq: Map<string, number>;
	readonly posts: GroupPost[];
	/** Removed by the city: invisible to everyone, its treasury paid out. */
	removed: boolean;
}

export type GroupResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: GroupErrorCode; readonly detail?: string };

function ok<T>(value: T): GroupResult<T> {
	return { ok: true, value };
}

function err(error: GroupErrorCode, detail?: string): { readonly ok: false; readonly error: GroupErrorCode; readonly detail?: string } {
	return detail === undefined ? { ok: false, error } : { ok: false, error, detail };
}

/** One group as the snapshot slice keeps it; members in join order. */
export interface GroupStateSnapshot {
	readonly id: string;
	readonly name: string;
	readonly founder: string;
	readonly treasurer: string;
	readonly members: { readonly agent: string; readonly joinedAtSeq: number }[];
	readonly reads: { readonly agent: string; readonly seq: number }[];
	readonly posts: GroupPost[];
	/** Removed by the city; absent for a live group. */
	readonly removed?: true;
}

/** Every group, the founder counts and the last message number. */
export interface GroupsSnapshot {
	readonly groups: GroupStateSnapshot[];
	readonly founded: { readonly agent: string; readonly count: number }[];
	readonly seq: number;
}

export function groupAccountId(groupId: string): string {
	return `GROUP:${groupId}`;
}

export class GroupRegistry {
	readonly #groups = new Map<string, GroupState>();
	readonly #founded = new Map<string, number>();
	readonly #numbers: MessageNumbers;

	constructor(numbers: MessageNumbers) {
		this.#numbers = numbers;
	}

	get #seq(): number {
		return this.#numbers.last;
	}

	create(founder: string, name: string): GroupResult<GroupInfo> {
		const trimmed = name.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_GROUP_NAME_LENGTH) {
			return err("INVALID_NAME", `1-${String(MAX_GROUP_NAME_LENGTH)} characters`);
		}
		const founded = this.#founded.get(founder) ?? 0;
		if (founded >= MAX_FOUNDED_GROUPS) return err("GROUP_LIMIT", `at most ${String(MAX_FOUNDED_GROUPS)} founded groups`);
		const id = `G${String(this.#groups.size + 1)}`;
		const group: GroupState = {
			id,
			name: trimmed,
			founder,
			treasurer: founder,
			joinedAtSeq: new Map([[founder, this.#seq]]),
			readSeq: new Map(),
			posts: [],
			removed: false,
		};
		this.#groups.set(id, group);
		this.#founded.set(founder, founded + 1);
		return ok(info(group));
	}

	/** A group the city founds with `members`; the city is its founder and treasurer and counts against no limit. */
	createForCity(name: string, members: readonly string[]): GroupInfo {
		const id = `G${String(this.#groups.size + 1)}`;
		const group: GroupState = {
			id,
			name: name.trim().slice(0, MAX_GROUP_NAME_LENGTH),
			founder: CITY,
			treasurer: CITY,
			joinedAtSeq: new Map(members.map((member) => [member, this.#seq])),
			readSeq: new Map(),
			posts: [],
			removed: false,
		};
		this.#groups.set(id, group);
		return info(group);
	}

	/** Whether the city founded the group. */
	isCityGroup(groupId: string): boolean {
		return this.#groups.get(groupId)?.founder === CITY;
	}

	/** A post of the city in one of its groups; no member check and no length limit. */
	postAsCity(groupId: string, text: string, minute: number): GroupResult<GroupPost> {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || group.founder !== CITY) return err("GROUP_NOT_VISIBLE");
		// The city's own texts are never cut: a faction list of 96 residents runs past a resident's limit.
		const post: GroupPost = { seq: this.#numbers.next(), author: CITY, text: text.trim(), minute };
		group.posts.push(post);
		return ok(post);
	}

	/** The members of a city group that is still there, in join order; undefined for any other group. */
	cityGroupMembers(groupId: string): string[] | undefined {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || group.founder !== CITY) return undefined;
		return [...group.joinedAtSeq.keys()];
	}

	/** Marks a city group removed (its treasury was paid out first). */
	markRemoved(groupId: string): void {
		const group = this.#groups.get(groupId);
		if (group !== undefined) group.removed = true;
	}

	addMember(groupId: string, actor: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#founderGroup(groupId, actor);
		if (!group.ok) return group;
		if (group.value.joinedAtSeq.has(agent)) return err("ALREADY_MEMBER", agent);
		group.value.joinedAtSeq.set(agent, this.#seq);
		group.value.readSeq.delete(agent);
		return ok(info(group.value));
	}

	removeMember(groupId: string, actor: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#founderGroup(groupId, actor);
		if (!group.ok) return group;
		if (!group.value.joinedAtSeq.has(agent)) return err("NOT_MEMBER", agent);
		if (group.value.treasurer === agent) return err("TREASURER_ACTIVE", "hand over the treasury first");
		group.value.joinedAtSeq.delete(agent);
		return ok(info(group.value));
	}

	leave(groupId: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#visible(groupId, agent);
		if (!group.ok) return group;
		if (group.value.treasurer === agent) return err("TREASURER_ACTIVE", "hand over the treasury first");
		group.value.joinedAtSeq.delete(agent);
		return ok(info(group.value));
	}

	setTreasurer(groupId: string, actor: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#visible(groupId, actor);
		if (!group.ok) return group;
		if (group.value.treasurer !== actor) return err("NOT_TREASURER");
		if (!group.value.joinedAtSeq.has(agent)) return err("NOT_MEMBER", agent);
		group.value.treasurer = agent;
		return ok(info(group.value));
	}

	listFor(agent: string): readonly GroupInfo[] {
		return [...this.#groups.values()].filter((group) => !group.removed && group.joinedAtSeq.has(agent)).map(info);
	}

	isMember(groupId: string, agent: string): boolean {
		const group = this.#groups.get(groupId);
		return group !== undefined && !group.removed && group.joinedAtSeq.has(agent);
	}

	/** Checks whether `author` may post `text`, without posting. */
	checkPost(groupId: string, author: string, text: string): GroupResult<string> {
		const group = this.#visible(groupId, author);
		if (!group.ok) return group;
		const trimmed = text.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_GROUP_POST_LENGTH) {
			return err("INVALID_TEXT", `1-${String(MAX_GROUP_POST_LENGTH)} characters`);
		}
		return ok(trimmed);
	}

	post(groupId: string, author: string, text: string, minute: number): GroupResult<GroupPost> {
		const checked = this.checkPost(groupId, author, text);
		if (!checked.ok) return checked;
		const group = this.#groups.get(groupId);
		if (group === undefined) return err("GROUP_NOT_VISIBLE");
		const post: GroupPost = { seq: this.#numbers.next(), author, text: checked.value, minute };
		group.posts.push(post);
		return ok(post);
	}

	/** Posts after `afterSeq`, but never before the reader joined. Moves the cursor only over what was delivered. */
	read(groupId: string, reader: string, afterSeq: number): GroupResult<readonly GroupPost[]> {
		const group = this.#visible(groupId, reader);
		if (!group.ok) return group;
		const joinedAt = group.value.joinedAtSeq.get(reader) ?? this.#seq;
		const posts = group.value.posts.filter((post) => post.seq > Math.max(afterSeq, joinedAt));
		const last = posts.at(-1);
		if (afterSeq <= this.#cursor(group.value, reader) && last !== undefined) {
			this.#setCursor(group.value, reader, last.seq);
		}
		return ok(posts);
	}

	/** Unread posts by others since the last fetch; moves the cursor to the end. */
	readNew(groupId: string, reader: string): GroupResult<readonly GroupPost[]> {
		const group = this.#visible(groupId, reader);
		if (!group.ok) return group;
		const cursor = this.#cursor(group.value, reader);
		const posts = group.value.posts.filter((post) => post.seq > cursor && post.author !== reader);
		this.#setCursor(group.value, reader, this.#seq);
		return ok(posts);
	}

	/** Visible posts at or before `seq` for the reader (for the history hint). */
	olderThan(groupId: string, reader: string, seq: number): number {
		const group = this.#groups.get(groupId);
		if (group?.joinedAtSeq.has(reader) !== true) return 0;
		const joinedAt = group.joinedAtSeq.get(reader) ?? this.#seq;
		return group.posts.filter((post) => post.seq > joinedAt && post.seq <= seq).length;
	}

	/** The group post with message number `seq`, with its group. */
	postByNumber(seq: number): { readonly group: string; readonly post: GroupPost } | undefined {
		for (const group of this.#groups.values()) {
			const post = group.posts.find((candidate) => candidate.seq === seq);
			if (post !== undefined) return { group: group.id, post };
		}
		return undefined;
	}

	/** Whether `reader` is a member of the group and joined before post `seq`, so it could read it. */
	couldRead(groupId: string, reader: string, seq: number): boolean {
		const joinedAt = this.#groups.get(groupId)?.joinedAtSeq.get(reader);
		return joinedAt !== undefined && seq > joinedAt;
	}

	unreadCount(groupId: string, reader: string): number {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || !group.joinedAtSeq.has(reader)) return 0;
		const cursor = this.#cursor(group, reader);
		return group.posts.filter((post) => post.seq > cursor && post.author !== reader).length;
	}

	/** Whether `agent` may deposit into the group, and the group's treasurer check for a withdrawal (`actor` is the treasurer). */
	checkDeposit(groupId: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#visible(groupId, agent);
		return group.ok ? ok(info(group.value)) : group;
	}

	checkWithdraw(groupId: string, actor: string, target: string): GroupResult<GroupInfo> {
		const group = this.#visible(groupId, actor);
		if (!group.ok) return group;
		if (group.value.treasurer !== actor) return err("NOT_TREASURER");
		if (!group.value.joinedAtSeq.has(target)) return err("NOT_MEMBER", target);
		return ok(info(group.value));
	}

	info(groupId: string): GroupInfo | undefined {
		const group = this.#groups.get(groupId);
		return group === undefined ? undefined : info(group);
	}

	/** Ids of the groups that are not removed, in order. */
	liveIds(): readonly string[] {
		return [...this.#groups.values()].filter((group) => !group.removed).map((group) => group.id);
	}

	/**
	 * How a treasury of `total` points splits: equally among the members; the remainder goes to the
	 * treasurer, or to the first member of a city group. Undefined when nothing is to pay.
	 */
	split(groupId: string, total: number): Readonly<Record<string, number>> | undefined {
		const group = this.#groups.get(groupId);
		if (group === undefined || total <= 0) return undefined;
		const members = [...group.joinedAtSeq.keys()].sort((a, b) => a.localeCompare(b));
		const rest = group.treasurer === CITY ? members[0] : group.treasurer;
		if (rest === undefined) return undefined;
		const share = Math.floor(total / members.length);
		const payouts: Record<string, number> = {};
		for (const member of members) payouts[member] = share;
		payouts[rest] = (payouts[rest] ?? 0) + (total - share * members.length);
		return payouts;
	}

	snapshot(): GroupsSnapshot {
		return {
			groups: [...this.#groups.values()].map((group) => ({
				id: group.id,
				name: group.name,
				founder: group.founder,
				treasurer: group.treasurer,
				members: [...group.joinedAtSeq].map(([agent, joinedAtSeq]) => ({ agent, joinedAtSeq })),
				reads: [...group.readSeq].map(([agent, seq]) => ({ agent, seq })),
				posts: [...group.posts],
				...(group.removed ? { removed: true as const } : {}),
			})),
			founded: [...this.#founded].map(([agent, count]) => ({ agent, count })),
			seq: this.#seq,
		};
	}

	/** Replaces every group. Group ids must run G1, G2, ... */
	restore(state: GroupsSnapshot): void {
		this.#groups.clear();
		this.#founded.clear();
		state.groups.forEach((group, index) => {
			if (group.id !== `G${String(index + 1)}`) throw new Error(`Group snapshot: group ${String(index + 1)} has id ${group.id}`);
			this.#groups.set(group.id, {
				id: group.id,
				name: group.name,
				founder: group.founder,
				treasurer: group.treasurer,
				joinedAtSeq: new Map(group.members.map((member) => [member.agent, member.joinedAtSeq])),
				readSeq: new Map(group.reads.map((read) => [read.agent, read.seq])),
				posts: [...group.posts],
				removed: group.removed === true,
			});
		});
		for (const entry of state.founded) this.#founded.set(entry.agent, entry.count);
		this.#numbers.raiseTo(state.seq);
	}

	#visible(groupId: string, agent: string): GroupResult<GroupState> {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || !group.joinedAtSeq.has(agent)) return err("GROUP_NOT_VISIBLE");
		return ok(group);
	}

	#founderGroup(groupId: string, actor: string): GroupResult<GroupState> {
		const group = this.#visible(groupId, actor);
		if (!group.ok) return group;
		return group.value.founder === actor ? group : err("NOT_FOUNDER");
	}

	#cursor(group: GroupState, reader: string): number {
		const joinedAt = group.joinedAtSeq.get(reader) ?? this.#seq;
		return Math.max(joinedAt, group.readSeq.get(reader) ?? 0);
	}

	#setCursor(group: GroupState, reader: string, seq: number): void {
		group.readSeq.set(reader, Math.max(group.readSeq.get(reader) ?? 0, seq));
	}
}

function info(group: GroupState): GroupInfo {
	return { id: group.id, name: group.name, founder: group.founder, treasurer: group.treasurer, members: [...group.joinedAtSeq.keys()] };
}
