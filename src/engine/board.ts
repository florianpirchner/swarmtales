/**
 * The public board: append-only, visible to everyone (SPEC §7).
 *
 * `player` posts come from competitors and count as novelty; `city` posts come
 * from the city, the courier or cast members; `system` posts are status lines
 * that read tools skip.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { BoardPostKind } from "./events.ts";
import { MessageNumbers } from "./numbers.ts";

export const MAX_BOARD_POST_LENGTH = 1200;

export interface BoardPost {
	/** The city's message number (shared with DMs and group posts), shown as `#seq`. */
	readonly seq: number;
	readonly author: string;
	readonly text: string;
	readonly minute: number;
	readonly kind: BoardPostKind;
}

export interface BoardRead {
	readonly posts: readonly BoardPost[];
	/** System posts in the read range that were skipped. */
	readonly skipped: number;
}

/** Every post and read cursor, for run snapshots (SPEC 17). */
export interface BoardSnapshot {
	readonly posts: readonly BoardPost[];
	readonly cursors: readonly { readonly reader: CompetitorId; readonly seq: number }[];
}

export class Board {
	readonly #posts: BoardPost[] = [];
	/** Highest sequence each reader has fetched. */
	readonly #cursor = new Map<CompetitorId, number>();
	readonly #onPost: ((post: BoardPost) => void) | undefined;
	readonly #numbers: MessageNumbers;

	/** `numbers` is the city's shared message counter; a board of its own numbers 1, 2, 3, ... */
	constructor(onPost?: (post: BoardPost) => void, numbers: MessageNumbers = new MessageNumbers()) {
		this.#onPost = onPost;
		this.#numbers = numbers;
	}

	post(author: string, text: string, minute: number, kind: BoardPostKind = "player"): BoardPost {
		const post: BoardPost = { seq: this.#numbers.next(), author, text, minute, kind };
		this.#posts.push(post);
		this.#onPost?.(post);
		return post;
	}

	snapshot(): BoardSnapshot {
		return { posts: [...this.#posts], cursors: [...this.#cursor].map(([reader, seq]) => ({ reader, seq })) };
	}

	/** Replaces every post and cursor; announces nothing. Numbers must ascend; they may leave gaps (other messages). */
	restore(state: BoardSnapshot): void {
		state.posts.forEach((post, index) => {
			const previous = state.posts[index - 1]?.seq ?? 0;
			if (post.seq <= previous) throw new Error(`Board snapshot: post ${index + 1} has number ${post.seq} after ${previous}`);
		});
		this.#posts.splice(0, this.#posts.length, ...state.posts);
		this.#numbers.raiseTo(state.posts.at(-1)?.seq ?? 0);
		this.#cursor.clear();
		for (const entry of state.cursors) this.#cursor.set(entry.reader, entry.seq);
	}

	/** The post with message number `seq`, if it is a board post. */
	get(seq: number): BoardPost | undefined {
		return this.#posts.find((post) => post.seq === seq);
	}

	/** Posts with a number greater than `afterSeq`, oldest first. */
	all(afterSeq = 0): readonly BoardPost[] {
		return this.#posts.filter((post) => post.seq > afterSeq);
	}

	lastSeq(): number {
		return this.#posts.at(-1)?.seq ?? 0;
	}

	/** Highest sequence of a player post; only those wake competitors. */
	lastPlayerSeq(): number {
		for (let index = this.#posts.length - 1; index >= 0; index--) {
			const post = this.#posts[index];
			if (post?.kind === "player") return post.seq;
		}
		return 0;
	}

	cursorOf(reader: CompetitorId): number {
		return this.#cursor.get(reader) ?? 0;
	}

	/** Unread readable posts by others (system posts excluded). */
	unreadCount(reader: CompetitorId): number {
		const cursor = this.cursorOf(reader);
		return this.#posts.filter((post) => post.seq > cursor && post.author !== reader && post.kind !== "system").length;
	}

	markRead(reader: CompetitorId, seq: number): void {
		this.#cursor.set(reader, Math.max(this.cursorOf(reader), seq));
	}

	/** Readable posts by others since the last fetch; moves the cursor to the end. */
	takeUnread(reader: CompetitorId): BoardRead {
		const range = this.all(this.cursorOf(reader)).filter((post) => post.author !== reader);
		const posts = range.filter((post) => post.kind !== "system");
		this.markRead(reader, this.lastSeq());
		return { posts, skipped: range.length - posts.length };
	}

	/**
	 * Targeted read from `afterSeq`. The cursor only moves when the read starts
	 * at or before it, so skipped posts stay unread.
	 */
	readFrom(reader: CompetitorId, afterSeq: number, limit: number): BoardRead {
		const range = this.all(afterSeq);
		const visible = range.filter((post) => post.kind !== "system").slice(0, limit);
		const skipped = range.filter((post) => post.kind === "system").length;
		const last = visible.at(-1);
		if (afterSeq <= this.cursorOf(reader) && last !== undefined) this.markRead(reader, last.seq);
		return { posts: visible, skipped };
	}
}
