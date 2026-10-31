/**
 * Groups and group treasuries (SPEC §7).
 *
 * Groups are private: non-members learn neither existence nor name nor
 * members (`GROUP_NOT_VISIBLE`, no existence leak). New members only read
 * posts from their join on. The treasury is the ledger account `GROUP:<id>`.
 * The city may found groups itself (the tribunal's, SPEC 6.4): their founder
 * and treasurer is the city, so no resident adds, removes or withdraws, and
 * the city removes them again. A removed group keeps its id and its posts
 * (for blames), but nobody sees it any more.
 */
import { CITY, type CompetitorId } from "../core/ids.ts";
import { LedgerError, type PointsLedger } from "../core/ledger.ts";
import { err, ok, type Result } from "../core/result.ts";
import { MessageNumbers } from "./numbers.ts";

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

export interface GroupSummary {
	readonly id: string;
	readonly name: string;
	readonly founder: CompetitorId;
	readonly treasurer: CompetitorId;
	readonly treasury: number;
	readonly members: readonly CompetitorId[];
}

export interface GroupPost {
	/** The city's message number (shared with DMs and board posts). */
	readonly seq: number;
	readonly author: CompetitorId;
	readonly text: string;
	readonly minute: number;
}

interface GroupState {
	readonly id: string;
	readonly name: string;
	readonly founder: CompetitorId;
	treasurer: CompetitorId;
	/** Member to the city's last message number at join time. */
	readonly joinedAtSeq: Map<CompetitorId, number>;
	/** Member to the highest sequence read. */
	readonly readSeq: Map<CompetitorId, number>;
	readonly posts: GroupPost[];
	/** Removed by the city: invisible to everyone, its treasury paid out. */
	removed: boolean;
}

export type GroupResult<T> = Result<T, GroupErrorCode>;

/** One group as a run snapshot keeps it (SPEC 17); members in join order. */
export interface GroupStateSnapshot {
	readonly id: string;
	readonly name: string;
	readonly founder: CompetitorId;
	readonly treasurer: CompetitorId;
	readonly members: readonly { readonly agent: CompetitorId; readonly joinedAtSeq: number }[];
	readonly reads: readonly { readonly agent: CompetitorId; readonly seq: number }[];
	readonly posts: readonly GroupPost[];
	/** Removed by the city; absent for a live group. */
	readonly removed?: true;
}

/** Every group, the founder counts and the last message number; treasuries live in the ledger. */
export interface GroupsSnapshot {
	readonly groups: readonly GroupStateSnapshot[];
	readonly founded: readonly { readonly agent: CompetitorId; readonly count: number }[];
	readonly seq: number;
}

export function groupAccountId(groupId: string): string {
	return `GROUP:${groupId}`;
}

export class GroupRegistry {
	readonly #groups = new Map<string, GroupState>();
	readonly #founded = new Map<CompetitorId, number>();
	readonly #ledger: PointsLedger;
	readonly #minute: () => number;
	readonly #numbers: MessageNumbers;

	/** `numbers` is the city's shared message counter; a registry of its own numbers its posts 1, 2, 3, ... */
	constructor(ledger: PointsLedger, minute: () => number, numbers: MessageNumbers = new MessageNumbers()) {
		this.#ledger = ledger;
		this.#minute = minute;
		this.#numbers = numbers;
	}

	get #seq(): number {
		return this.#numbers.last;
	}

	create(founder: CompetitorId, name: string): GroupResult<GroupSummary> {
		const trimmed = name.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_GROUP_NAME_LENGTH) {
			return err("INVALID_NAME", `1-${MAX_GROUP_NAME_LENGTH} characters`);
		}
		const founded = this.#founded.get(founder) ?? 0;
		if (founded >= MAX_FOUNDED_GROUPS) return err("GROUP_LIMIT", `at most ${MAX_FOUNDED_GROUPS} founded groups`);
		const id = `G${this.#groups.size + 1}`;
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
		this.#ledger.open(groupAccountId(id));
		return ok(this.#summary(group));
	}

	/** A group the city founds with `members`; the city is its founder and treasurer and counts against no limit. */
	createForCity(name: string, members: readonly CompetitorId[]): GroupSummary {
		const id = `G${this.#groups.size + 1}`;
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
		this.#ledger.open(groupAccountId(id));
		return this.#summary(group);
	}

	/** Whether the city founded the group. */
	isCityGroup(groupId: string): boolean {
		return this.#groups.get(groupId)?.founder === CITY;
	}

	/** A post of the city in one of its groups; no member check and no length limit. */
	postAsCity(groupId: string, text: string): GroupResult<GroupPost> {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || group.founder !== CITY) return err("GROUP_NOT_VISIBLE");
		// The city's own texts are never cut: a faction list of 96 residents runs past a resident's limit.
		const post: GroupPost = { seq: this.#numbers.next(), author: CITY, text: text.trim(), minute: this.#minute() };
		group.posts.push(post);
		return ok(post);
	}

	/**
	 * Removes a group of the city: its treasury is split among its members
	 * as at run end, then nobody sees it any more. Returns the members and the payouts.
	 */
	removeCityGroup(groupId: string): { readonly members: readonly CompetitorId[]; readonly payouts?: Readonly<Record<string, number>> } | undefined {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || group.founder !== CITY) return undefined;
		const members = [...group.joinedAtSeq.keys()];
		const payouts = this.#settle(group);
		group.removed = true;
		return { members, ...(payouts === undefined ? {} : { payouts }) };
	}

	addMember(groupId: string, actor: CompetitorId, agent: CompetitorId): GroupResult<GroupSummary> {
		const group = this.#founderGroup(groupId, actor);
		if (!group.ok) return group;
		if (group.value.joinedAtSeq.has(agent)) return err("ALREADY_MEMBER", agent);
		group.value.joinedAtSeq.set(agent, this.#seq);
		group.value.readSeq.delete(agent);
		return ok(this.#summary(group.value));
	}

	removeMember(groupId: string, actor: CompetitorId, agent: CompetitorId): GroupResult<GroupSummary> {
		const group = this.#founderGroup(groupId, actor);
		if (!group.ok) return group;
		if (!group.value.joinedAtSeq.has(agent)) return err("NOT_MEMBER", agent);
		if (group.value.treasurer === agent) return err("TREASURER_ACTIVE", "hand over the treasury first");
		group.value.joinedAtSeq.delete(agent);
		return ok(this.#summary(group.value));
	}

	leave(groupId: string, agent: CompetitorId): GroupResult<GroupSummary> {
		const group = this.#visible(groupId, agent);
		if (!group.ok) return group;
		if (group.value.treasurer === agent) return err("TREASURER_ACTIVE", "hand over the treasury first");
		group.value.joinedAtSeq.delete(agent);
		return ok(this.#summary(group.value));
	}

	setTreasurer(groupId: string, actor: CompetitorId, agent: CompetitorId): GroupResult<GroupSummary> {
		const group = this.#visible(groupId, actor);
		if (!group.ok) return group;
		if (group.value.treasurer !== actor) return err("NOT_TREASURER");
		if (!group.value.joinedAtSeq.has(agent)) return err("NOT_MEMBER", agent);
		group.value.treasurer = agent;
		return ok(this.#summary(group.value));
	}

	listFor(agent: CompetitorId): readonly GroupSummary[] {
		return [...this.#groups.values()]
			.filter((group) => !group.removed && group.joinedAtSeq.has(agent))
			.map((group) => this.#summary(group));
	}

	isMember(groupId: string, agent: CompetitorId): boolean {
		const group = this.#groups.get(groupId);
		return group !== undefined && !group.removed && group.joinedAtSeq.has(agent);
	}

	/** Checks whether `author` may post `text`, without posting. */
	checkPost(groupId: string, author: CompetitorId, text: string): GroupResult<string> {
		const group = this.#visible(groupId, author);
		if (!group.ok) return group;
		const trimmed = text.trim();
		if (trimmed.length === 0 || trimmed.length > MAX_GROUP_POST_LENGTH) {
			return err("INVALID_TEXT", `1-${MAX_GROUP_POST_LENGTH} characters`);
		}
		return ok(trimmed);
	}

	post(groupId: string, author: CompetitorId, text: string): GroupResult<GroupPost> {
		const checked = this.checkPost(groupId, author, text);
		if (!checked.ok) return checked;
		const group = this.#groups.get(groupId);
		if (group === undefined) return err("GROUP_NOT_VISIBLE");
		const post: GroupPost = { seq: this.#numbers.next(), author, text: checked.value, minute: this.#minute() };
		group.posts.push(post);
		return ok(post);
	}

	/** Posts after `afterSeq`, but never before the reader joined. Moves the cursor only over what was delivered. */
	read(groupId: string, reader: CompetitorId, afterSeq: number): GroupResult<readonly GroupPost[]> {
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
	readNew(groupId: string, reader: CompetitorId): GroupResult<readonly GroupPost[]> {
		const group = this.#visible(groupId, reader);
		if (!group.ok) return group;
		const cursor = this.#cursor(group.value, reader);
		const posts = group.value.posts.filter((post) => post.seq > cursor && post.author !== reader);
		this.#setCursor(group.value, reader, this.#seq);
		return ok(posts);
	}

	/** Visible posts at or before `seq` for the reader (for the history hint). */
	olderThan(groupId: string, reader: CompetitorId, seq: number): number {
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
	couldRead(groupId: string, reader: CompetitorId, seq: number): boolean {
		const joinedAt = this.#groups.get(groupId)?.joinedAtSeq.get(reader);
		return joinedAt !== undefined && seq > joinedAt;
	}

	unreadCount(groupId: string, reader: CompetitorId): number {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || !group.joinedAtSeq.has(reader)) return 0;
		const cursor = this.#cursor(group, reader);
		return group.posts.filter((post) => post.seq > cursor && post.author !== reader).length;
	}

	deposit(groupId: string, agent: CompetitorId, amount: number): GroupResult<GroupSummary> {
		const group = this.#visible(groupId, agent);
		if (!group.ok) return group;
		const booked = this.#book(agent, groupAccountId(groupId), amount, `deposit ${groupId}`);
		return booked.ok ? ok(this.#summary(group.value)) : booked;
	}

	withdraw(groupId: string, actor: CompetitorId, target: CompetitorId, amount: number): GroupResult<GroupSummary> {
		const group = this.#visible(groupId, actor);
		if (!group.ok) return group;
		if (group.value.treasurer !== actor) return err("NOT_TREASURER");
		if (!group.value.joinedAtSeq.has(target)) return err("NOT_MEMBER", target);
		const booked = this.#book(groupAccountId(groupId), target, amount, `withdrawal ${groupId}`);
		return booked.ok ? ok(this.#summary(group.value)) : booked;
	}

	/**
	 * Run end: every treasury is split equally among its current members; the
	 * remainder goes to the treasurer. Returns the payouts per group.
	 */
	settle(): readonly { readonly group: string; readonly payouts: Readonly<Record<string, number>> }[] {
		const settled: { group: string; payouts: Readonly<Record<string, number>> }[] = [];
		for (const group of this.#groups.values()) {
			if (group.removed) continue;
			const payouts = this.#settle(group);
			if (payouts !== undefined) settled.push({ group: group.id, payouts });
		}
		return settled;
	}

	/** Splits a treasury among the members; the remainder goes to the treasurer, or to the first member of a city group. */
	#settle(group: GroupState): Readonly<Record<string, number>> | undefined {
		const account = groupAccountId(group.id);
		const total = this.#ledger.balance(account);
		if (total <= 0) return undefined;
		const members = [...group.joinedAtSeq.keys()].sort((a, b) => a.localeCompare(b));
		const rest = group.treasurer === CITY ? members[0] : group.treasurer;
		if (rest === undefined) return undefined;
		const share = Math.floor(total / members.length);
		const payouts: Record<string, number> = {};
		for (const member of members) payouts[member] = share;
		payouts[rest] = (payouts[rest] ?? 0) + (total - share * members.length);
		for (const [member, amount] of Object.entries(payouts)) {
			if (amount > 0) this.#ledger.transfer(account, member, amount, `settlement ${group.id}`, this.#minute());
		}
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

	/** Replaces every group; the treasury accounts come back with the ledger. Group ids must run G1, G2, ... */
	restore(state: GroupsSnapshot): void {
		this.#groups.clear();
		this.#founded.clear();
		state.groups.forEach((group, index) => {
			if (group.id !== `G${index + 1}`) throw new Error(`Group snapshot: group ${index + 1} has id ${group.id}`);
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
			this.#ledger.open(groupAccountId(group.id));
		});
		for (const entry of state.founded) this.#founded.set(entry.agent, entry.count);
		this.#numbers.raiseTo(state.seq);
	}

	/** Every group with members, removed ones too; for observers and tests, never for competitors. */
	inspect(): readonly GroupSummary[] {
		return [...this.#groups.values()].map((group) => this.#summary(group));
	}

	/** Whether the city removed the group. */
	isRemoved(groupId: string): boolean {
		return this.#groups.get(groupId)?.removed === true;
	}

	#book(debit: string, credit: string, amount: number, reason: string): GroupResult<undefined> {
		if (!Number.isInteger(amount) || amount <= 0) return err("INVALID_AMOUNT");
		try {
			this.#ledger.transfer(debit, credit, amount, reason, this.#minute());
			return ok(undefined);
		} catch (error) {
			if (error instanceof LedgerError && error.code === "INSUFFICIENT_FUNDS") return err("INSUFFICIENT_FUNDS");
			throw error;
		}
	}

	#visible(groupId: string, agent: CompetitorId): GroupResult<GroupState> {
		const group = this.#groups.get(groupId);
		if (group === undefined || group.removed || !group.joinedAtSeq.has(agent)) return err("GROUP_NOT_VISIBLE");
		return ok(group);
	}

	#founderGroup(groupId: string, actor: CompetitorId): GroupResult<GroupState> {
		const group = this.#visible(groupId, actor);
		if (!group.ok) return group;
		return group.value.founder === actor ? group : err("NOT_FOUNDER");
	}

	#cursor(group: GroupState, reader: CompetitorId): number {
		const joinedAt = group.joinedAtSeq.get(reader) ?? this.#seq;
		return Math.max(joinedAt, group.readSeq.get(reader) ?? 0);
	}

	#setCursor(group: GroupState, reader: CompetitorId, seq: number): void {
		group.readSeq.set(reader, Math.max(group.readSeq.get(reader) ?? 0, seq));
	}

	#summary(group: GroupState): GroupSummary {
		return {
			id: group.id,
			name: group.name,
			founder: group.founder,
			treasurer: group.treasurer,
			treasury: this.#ledger.balance(groupAccountId(group.id)),
			members: [...group.joinedAtSeq.keys()],
		};
	}
}
