// SPDX-License-Identifier: Apache-2.0
/**
 * Groups, carried from the old platform (`minute` is `tick` here).
 *
 * Groups are private: non-members learn neither existence nor name nor members (`GROUP_NOT_VISIBLE`, no existence
 * leak). New members only read posts from their join on. The treasury is the ledger account `GROUP:<id>`; the
 * mechanic books it through the service of `ledger`, the registry only decides who may. The city may found groups
 * itself: their founder and treasurer is the city, so no resident adds, removes or withdraws, and the city removes
 * them again. A removed group keeps its id and its posts (for blames), but nobody sees it any more.
 */
import { CITY, MAX_FOUNDED_GROUPS, MAX_GROUP_NAME_LENGTH, MAX_GROUP_POST_LENGTH, type GroupErrorCode, type GroupFailure, type GroupInfo, type GroupPost, type GroupResult, type GroupsSnapshot } from "./group-types.ts";
import type { MessageNumbers } from "./numbers.ts";

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

function ok<T>(value: T): GroupResult<T> {
	return { ok: true, value };
}

function err(error: GroupErrorCode, detail?: string): GroupFailure & { readonly error: GroupErrorCode } {
	return detail === undefined ? { ok: false, error } : { ok: false, error, detail };
}

/** Every group of one run. */
export class GroupRegistry {
	readonly #groups = new Map<string, GroupState>();
	readonly #founded = new Map<string, number>();
	readonly #numbers: MessageNumbers;

	/**
	 * Builds an empty registry.
	 *
	 * @param numbers - The city's shared message counter.
	 */
	constructor(numbers: MessageNumbers) {
		this.#numbers = numbers;
	}

	get #seq(): number {
		return this.#numbers.last;
	}

	/**
	 * Founds a group; the founder is its first member and its treasurer.
	 *
	 * @param founder - The resident.
	 * @param name - The name as written.
	 * @returns The group, or `INVALID_NAME`, `GROUP_LIMIT`.
	 */
	create(founder: string, name: string): GroupResult<GroupInfo> {
		const trimmed = name.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_GROUP_NAME_LENGTH) return err("INVALID_NAME", `1-${String(MAX_GROUP_NAME_LENGTH)} characters`);
		const founded = this.#founded.get(founder) ?? 0;
		if (founded >= MAX_FOUNDED_GROUPS) return err("GROUP_LIMIT", `at most ${String(MAX_FOUNDED_GROUPS)} founded groups`);
		const group = this.#add(trimmed, founder, [founder]);
		this.#founded.set(founder, founded + 1);
		return ok(info(group));
	}

	/**
	 * Founds a group of the city; the city is its founder and treasurer and counts against no limit.
	 *
	 * @param name - The name; cut to the longest name.
	 * @param members - The members.
	 * @returns The group.
	 */
	createForCity(name: string, members: readonly string[]): GroupInfo {
		return info(this.#add(name.trim().slice(0, MAX_GROUP_NAME_LENGTH), CITY, members));
	}

	#add(name: string, founder: string, members: readonly string[]): GroupState {
		const id = `G${String(this.#groups.size + 1)}`;
		const group: GroupState = { id, name, founder, treasurer: founder, joinedAtSeq: new Map(members.map((member) => [member, this.#seq])), readSeq: new Map(), posts: [], removed: false };
		this.#groups.set(id, group);
		return group;
	}

	/**
	 * Says whether the city founded the group.
	 *
	 * @param groupId - The group.
	 * @returns True for a group of the city.
	 */
	isCityGroup(groupId: string): boolean {
		return this.#groups.get(groupId)?.founder === CITY;
	}

	/**
	 * Posts as the city in one of its groups; no member check and no length limit.
	 *
	 * @param groupId - The group.
	 * @param text - The text.
	 * @param tick - The current tick.
	 * @returns The post, or `GROUP_NOT_VISIBLE` for a group that is gone or no group of the city.
	 */
	postAsCity(groupId: string, text: string, tick: number): GroupResult<GroupPost> {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || group.founder !== CITY) return err("GROUP_NOT_VISIBLE");
		// The city's own texts are never cut: a faction list of 96 residents runs past a resident's limit.
		const post: GroupPost = { seq: this.#numbers.next(), author: CITY, text: text.trim(), tick };
		group.posts.push(post);
		return ok(post);
	}

	/**
	 * Lists the members of a city group that is still there.
	 *
	 * @param groupId - The group.
	 * @returns The members in join order; undefined for any other group.
	 */
	cityGroupMembers(groupId: string): string[] | undefined {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || group.founder !== CITY) return undefined;
		return [...group.joinedAtSeq.keys()];
	}

	/**
	 * Marks a group removed (its treasury was paid out first).
	 *
	 * @param groupId - The group.
	 */
	markRemoved(groupId: string): void {
		const group = this.#groups.get(groupId);
		if (group !== undefined) group.removed = true;
	}

	/**
	 * Adds a member; only the founder may.
	 *
	 * @param groupId - The group.
	 * @param actor - Who adds.
	 * @param agent - The new member.
	 * @returns The group, or `GROUP_NOT_VISIBLE`, `NOT_FOUNDER`, `ALREADY_MEMBER`.
	 */
	addMember(groupId: string, actor: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#founderGroup(groupId, actor);
		if (!group.ok) return group;
		if (group.value.joinedAtSeq.has(agent)) return err("ALREADY_MEMBER", agent);
		group.value.joinedAtSeq.set(agent, this.#seq);
		group.value.readSeq.delete(agent);
		return ok(info(group.value));
	}

	/**
	 * Removes a member; only the founder may, and never the treasurer.
	 *
	 * @param groupId - The group.
	 * @param actor - Who removes.
	 * @param agent - The member.
	 * @returns The group, or `GROUP_NOT_VISIBLE`, `NOT_FOUNDER`, `NOT_MEMBER`, `TREASURER_ACTIVE`.
	 */
	removeMember(groupId: string, actor: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#founderGroup(groupId, actor);
		if (!group.ok) return group;
		if (!group.value.joinedAtSeq.has(agent)) return err("NOT_MEMBER", agent);
		if (group.value.treasurer === agent) return err("TREASURER_ACTIVE", "hand over the treasury first");
		group.value.joinedAtSeq.delete(agent);
		return ok(info(group.value));
	}

	/**
	 * Leaves a group; the treasurer must hand over first.
	 *
	 * @param groupId - The group.
	 * @param agent - The member.
	 * @returns The group, or `GROUP_NOT_VISIBLE`, `TREASURER_ACTIVE`.
	 */
	leave(groupId: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#visible(groupId, agent);
		if (!group.ok) return group;
		if (group.value.treasurer === agent) return err("TREASURER_ACTIVE", "hand over the treasury first");
		group.value.joinedAtSeq.delete(agent);
		return ok(info(group.value));
	}

	/**
	 * Hands the treasury to another member; only the treasurer may.
	 *
	 * @param groupId - The group.
	 * @param actor - The treasurer.
	 * @param agent - The new treasurer.
	 * @returns The group, or `GROUP_NOT_VISIBLE`, `NOT_TREASURER`, `NOT_MEMBER`.
	 */
	setTreasurer(groupId: string, actor: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#visible(groupId, actor);
		if (!group.ok) return group;
		if (group.value.treasurer !== actor) return err("NOT_TREASURER");
		if (!group.value.joinedAtSeq.has(agent)) return err("NOT_MEMBER", agent);
		group.value.treasurer = agent;
		return ok(info(group.value));
	}

	/**
	 * Lists the groups a resident is in.
	 *
	 * @param agent - The resident.
	 * @returns The groups that are not removed, in order.
	 */
	listFor(agent: string): readonly GroupInfo[] {
		return [...this.#groups.values()].filter((group) => !group.removed && group.joinedAtSeq.has(agent)).map(info);
	}

	/**
	 * Says whether a resident is a member of a group that is not removed.
	 *
	 * @param groupId - The group.
	 * @param agent - The resident.
	 * @returns True for a member.
	 */
	isMember(groupId: string, agent: string): boolean {
		const group = this.#groups.get(groupId);
		return group !== undefined && !group.removed && group.joinedAtSeq.has(agent);
	}

	/**
	 * Checks whether `author` may post `text`, without posting.
	 *
	 * @param groupId - The group.
	 * @param author - The member.
	 * @param text - The text as written.
	 * @returns The trimmed text, or `GROUP_NOT_VISIBLE`, `INVALID_TEXT`.
	 */
	checkPost(groupId: string, author: string, text: string): GroupResult<string> {
		const group = this.#visible(groupId, author);
		if (!group.ok) return group;
		const trimmed = text.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_GROUP_POST_LENGTH) return err("INVALID_TEXT", `1-${String(MAX_GROUP_POST_LENGTH)} characters`);
		return ok(trimmed);
	}

	/**
	 * Posts in a group.
	 *
	 * @param groupId - The group.
	 * @param author - The member.
	 * @param text - The text as written.
	 * @param tick - The current tick.
	 * @returns The post, or the refusal of `checkPost`.
	 */
	post(groupId: string, author: string, text: string, tick: number): GroupResult<GroupPost> {
		const checked = this.checkPost(groupId, author, text);
		if (!checked.ok) return checked;
		const group = this.#groups.get(groupId);
		if (group === undefined) return err("GROUP_NOT_VISIBLE");
		const post: GroupPost = { seq: this.#numbers.next(), author, text: checked.value, tick };
		group.posts.push(post);
		return ok(post);
	}

	/**
	 * Reads posts after `afterSeq`, but never before the reader joined. Moves the cursor only over what was delivered.
	 *
	 * @param groupId - The group.
	 * @param reader - The member.
	 * @param afterSeq - Only posts with a higher number.
	 * @returns The posts, or `GROUP_NOT_VISIBLE`.
	 */
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

	/**
	 * Reads the unread posts by others since the last fetch and moves the cursor to the end.
	 *
	 * @param groupId - The group.
	 * @param reader - The member.
	 * @returns The posts, or `GROUP_NOT_VISIBLE`.
	 */
	readNew(groupId: string, reader: string): GroupResult<readonly GroupPost[]> {
		const group = this.#visible(groupId, reader);
		if (!group.ok) return group;
		const cursor = this.#cursor(group.value, reader);
		const posts = group.value.posts.filter((post) => post.seq > cursor && post.author !== reader);
		this.#setCursor(group.value, reader, this.#seq);
		return ok(posts);
	}

	/**
	 * Counts the visible posts at or before `seq` for the reader (for the history hint).
	 *
	 * @param groupId - The group.
	 * @param reader - The member.
	 * @param seq - A message number.
	 * @returns The count; 0 for no member.
	 */
	olderThan(groupId: string, reader: string, seq: number): number {
		const group = this.#groups.get(groupId);
		if (group?.joinedAtSeq.has(reader) !== true) return 0;
		const joinedAt = group.joinedAtSeq.get(reader) ?? this.#seq;
		return group.posts.filter((post) => post.seq > joinedAt && post.seq <= seq).length;
	}

	/**
	 * Finds the group post with message number `seq`, removed groups included.
	 *
	 * @param seq - The message number.
	 * @returns The post with its group, or undefined.
	 */
	postByNumber(seq: number): { readonly group: string; readonly post: GroupPost } | undefined {
		for (const group of this.#groups.values()) {
			const post = group.posts.find((candidate) => candidate.seq === seq);
			if (post !== undefined) return { group: group.id, post };
		}
		return undefined;
	}

	/**
	 * Says whether `reader` is a member of the group and joined before post `seq`, so it could read it.
	 *
	 * @param groupId - The group.
	 * @param reader - The resident.
	 * @param seq - The message number of the post.
	 * @returns True when it could read it.
	 */
	couldRead(groupId: string, reader: string, seq: number): boolean {
		const joinedAt = this.#groups.get(groupId)?.joinedAtSeq.get(reader);
		return joinedAt !== undefined && seq > joinedAt;
	}

	/**
	 * Counts the unread posts by others.
	 *
	 * @param groupId - The group.
	 * @param reader - The member.
	 * @returns The count; 0 for a removed group or no member.
	 */
	unreadCount(groupId: string, reader: string): number {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || !group.joinedAtSeq.has(reader)) return 0;
		const cursor = this.#cursor(group, reader);
		return group.posts.filter((post) => post.seq > cursor && post.author !== reader).length;
	}

	/**
	 * Says whether `agent` may deposit into the group.
	 *
	 * @param groupId - The group.
	 * @param agent - The member.
	 * @returns The group, or `GROUP_NOT_VISIBLE`.
	 */
	checkDeposit(groupId: string, agent: string): GroupResult<GroupInfo> {
		const group = this.#visible(groupId, agent);
		return group.ok ? ok(info(group.value)) : group;
	}

	/**
	 * Says whether `actor` may pay `target` out of the treasury.
	 *
	 * @param groupId - The group.
	 * @param actor - The treasurer.
	 * @param target - The member paid.
	 * @returns The group, or `GROUP_NOT_VISIBLE`, `NOT_TREASURER`, `NOT_MEMBER`.
	 */
	checkWithdraw(groupId: string, actor: string, target: string): GroupResult<GroupInfo> {
		const group = this.#visible(groupId, actor);
		if (!group.ok) return group;
		if (group.value.treasurer !== actor) return err("NOT_TREASURER");
		if (!group.value.joinedAtSeq.has(target)) return err("NOT_MEMBER", target);
		return ok(info(group.value));
	}

	/**
	 * Gives one group, removed or not.
	 *
	 * @param groupId - The group.
	 * @returns The group, or undefined.
	 */
	info(groupId: string): GroupInfo | undefined {
		const group = this.#groups.get(groupId);
		return group === undefined ? undefined : info(group);
	}

	/**
	 * Lists the groups that are not removed.
	 *
	 * @returns Their ids, in order.
	 */
	liveIds(): readonly string[] {
		return [...this.#groups.values()].filter((group) => !group.removed).map((group) => group.id);
	}

	/**
	 * Splits a treasury of `total` points equally among the members; the remainder goes to the treasurer, or to the
	 * first member of a city group (in id order).
	 *
	 * @param groupId - The group.
	 * @param total - The points of the treasury.
	 * @returns Member to points; undefined when nothing is to pay.
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

	/**
	 * Copies every group.
	 *
	 * @returns The data of the snapshot slice.
	 */
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

	/**
	 * Replaces every group. Group ids must run G1, G2, ...
	 *
	 * @param state - The data of a snapshot slice.
	 * @throws RangeError when the ids do not run G1, G2, ...
	 */
	restore(state: GroupsSnapshot): void {
		this.#groups.clear();
		this.#founded.clear();
		state.groups.forEach((group, index) => {
			if (group.id !== `G${String(index + 1)}`) throw new RangeError(`channels: group snapshot: group ${String(index + 1)} has id ${group.id}`);
			this.#groups.set(group.id, {
				id: group.id,
				name: group.name,
				founder: group.founder,
				treasurer: group.treasurer,
				joinedAtSeq: new Map(group.members.map((member) => [member.agent, member.joinedAtSeq])),
				readSeq: new Map(group.reads.map((read) => [read.agent, read.seq])),
				// Each post is written field by field: a snapshot file holds its keys sorted (A43).
				posts: group.posts.map(({ seq, author, text, tick }) => ({ seq, author, text, tick })),
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
