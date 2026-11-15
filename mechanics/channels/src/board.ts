// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The public board: append-only, visible to everyone. Carried from the old platform (`minute` is `tick` here).
 *
 * `player` posts come from residents and count as news; `city` posts come from the city (another mechanic, a
 * Director); `system` posts are status lines that the read tool skips. The board does not write events: the
 * mechanic emits `board_post` after `post`.
 */
import type { MessageNumbers } from "./numbers.ts";

/** The longest text of a board post, in characters. */
export const MAX_BOARD_POST_LENGTH = 1200;

/** Who a post comes from: a resident, the city, or a status line. */
export type BoardPostKind = "player" | "city" | "system";

/** One post on the board. */
export interface BoardPost {
	/** The city's message number (shared with direct messages), shown as `#seq`. */
	readonly seq: number;
	/** Who wrote it. */
	readonly author: string;
	/** The text. */
	readonly text: string;
	/** The tick it was posted in. */
	readonly tick: number;
	/** Who it comes from. */
	readonly kind: BoardPostKind;
}

/** The result of a read. */
export interface BoardRead {
	/** The posts, oldest first. */
	readonly posts: BoardPost[];
	/** System posts in the read range that were skipped. */
	readonly skipped: number;
}

/** Every post and read cursor, for the snapshot slice. */
export interface BoardSnapshot {
	/** Every post, oldest first. */
	readonly posts: BoardPost[];
	/** The highest number each reader has fetched. */
	readonly cursors: { readonly reader: string; readonly seq: number }[];
}

/** The board of one run. */
export class Board {
	readonly #posts: BoardPost[] = [];
	/** Highest sequence each reader has fetched. */
	readonly #cursor = new Map<string, number>();
	readonly #numbers: MessageNumbers;

	/**
	 * Builds an empty board.
	 *
	 * @param numbers - The city's shared message counter.
	 */
	constructor(numbers: MessageNumbers) {
		this.#numbers = numbers;
	}

	/**
	 * Appends a post.
	 *
	 * @param author - Who writes.
	 * @param text - The text.
	 * @param tick - The current tick.
	 * @param kind - Who the post comes from.
	 * @returns The post with its number.
	 */
	post(author: string, text: string, tick: number, kind: BoardPostKind): BoardPost {
		const post: BoardPost = { seq: this.#numbers.next(), author, text, tick, kind };
		this.#posts.push(post);
		return post;
	}

	/**
	 * Copies every post and cursor.
	 *
	 * @returns The data of the snapshot slice.
	 */
	snapshot(): BoardSnapshot {
		return { posts: [...this.#posts], cursors: [...this.#cursor].map(([reader, seq]) => ({ reader, seq })) };
	}

	/**
	 * Replaces every post and cursor. Numbers must ascend; they may leave gaps (other messages).
	 *
	 * @param state - The data of a snapshot slice.
	 * @throws RangeError when the numbers of the posts do not ascend.
	 */
	restore(state: BoardSnapshot): void {
		state.posts.forEach((post, index) => {
			const previous = state.posts[index - 1]?.seq ?? 0;
			if (post.seq <= previous) throw new RangeError(`channels: board snapshot: post ${String(index + 1)} has number ${String(post.seq)} after ${String(previous)}`);
		});
		this.#posts.splice(0, this.#posts.length, ...state.posts);
		this.#numbers.raiseTo(state.posts.at(-1)?.seq ?? 0);
		this.#cursor.clear();
		for (const entry of state.cursors) this.#cursor.set(entry.reader, entry.seq);
	}

	/**
	 * Lists posts.
	 *
	 * @param afterSeq - Only posts with a greater number.
	 * @returns The posts, oldest first.
	 */
	all(afterSeq = 0): readonly BoardPost[] {
		return this.#posts.filter((post) => post.seq > afterSeq);
	}

	/**
	 * Gives the number of the newest post.
	 *
	 * @returns The number; 0 on an empty board.
	 */
	lastSeq(): number {
		return this.#posts.at(-1)?.seq ?? 0;
	}

	/**
	 * Gives the number of the newest player post; only those are news for residents.
	 *
	 * @returns The number; 0 when no resident has posted.
	 */
	lastPlayerSeq(): number {
		for (let index = this.#posts.length - 1; index >= 0; index--) {
			const post = this.#posts[index];
			if (post?.kind === "player") return post.seq;
		}
		return 0;
	}

	/**
	 * Gives the read cursor of a reader.
	 *
	 * @param reader - The reader.
	 * @returns The highest number the reader has fetched.
	 */
	cursorOf(reader: string): number {
		return this.#cursor.get(reader) ?? 0;
	}

	/**
	 * Counts the posts of others the reader has not fetched, status posts left out.
	 *
	 * @param reader - The reader.
	 * @returns The unread posts.
	 */
	unreadCount(reader: string): number {
		const cursor = this.cursorOf(reader);
		return this.#posts.filter((post) => post.seq > cursor && post.author !== reader && post.kind !== "system").length;
	}

	/**
	 * Moves the read cursor of a reader forward, never back.
	 *
	 * @param reader - The reader.
	 * @param seq - The number read up to.
	 */
	markRead(reader: string, seq: number): void {
		this.#cursor.set(reader, Math.max(this.cursorOf(reader), seq));
	}

	/**
	 * Reads the readable posts by others since the last fetch and moves the cursor to the end.
	 *
	 * @param reader - The reader.
	 * @returns The posts and the count of skipped system posts.
	 */
	takeUnread(reader: string): BoardRead {
		const range = this.all(this.cursorOf(reader)).filter((post) => post.author !== reader);
		const posts = range.filter((post) => post.kind !== "system");
		this.markRead(reader, this.lastSeq());
		return { posts, skipped: range.length - posts.length };
	}

	/**
	 * Reads from a number on. The cursor only moves when the read starts at or before it, so skipped posts stay unread.
	 *
	 * @param reader - The reader.
	 * @param afterSeq - Only posts with a greater number.
	 * @param limit - At most this many posts.
	 * @returns The posts and the count of skipped system posts.
	 */
	readFrom(reader: string, afterSeq: number, limit: number): BoardRead {
		const range = this.all(afterSeq);
		const visible = range.filter((post) => post.kind !== "system").slice(0, limit);
		const skipped = range.filter((post) => post.kind === "system").length;
		const last = visible.at(-1);
		if (afterSeq <= this.cursorOf(reader) && last !== undefined) this.markRead(reader, last.seq);
		return { posts: visible, skipped };
	}
}
