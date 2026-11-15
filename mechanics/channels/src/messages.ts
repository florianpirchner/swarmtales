// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** What `channels` does with messages: posts and notices. The check order, the codes and the texts are the old platform's. */
import type { ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import { MAX_BOARD_POST_LENGTH, type BoardPost, type BoardPostKind } from "./board.ts";
import type { Ctx, ToolCtx } from "./head.ts";
import type { Inbox } from "./state.ts";

/**
 * Names who is calling.
 *
 * @param ctx - The context of the tool call.
 * @returns The resident id, or the actor id for a caller that is no resident.
 */
export function selfOf(ctx: ToolCtx): string {
	return ctx.resident ?? ctx.actor;
}

/**
 * Writes a post on the board and `board_post`.
 *
 * @param ctx - The context.
 * @param author - Who writes.
 * @param text - The text.
 * @param kind - Who the post comes from.
 * @returns The post with its number.
 */
export function postToBoard(ctx: Ctx, author: string, text: string, kind: BoardPostKind): BoardPost {
	const post = ctx.state.board.post(author, text, ctx.tick, kind);
	ctx.emit("board_post", { postSeq: post.seq, author: post.author, text: post.text, kind: post.kind });
	return post;
}

/**
 * Finds the inbox of a resident.
 *
 * @param ctx - The context.
 * @param id - The resident id.
 * @returns The inbox.
 * @throws RangeError when the id is no resident of the run.
 */
export function inboxOf(ctx: Ctx, id: string): Inbox {
	const inbox = ctx.state.inboxes.get(id);
	if (inbox === undefined) throw new RangeError(`channels: ${id} is no resident of the run`);
	return inbox;
}

/**
 * Leaves a private notice; it is shown at the resident's next activation.
 *
 * @param ctx - The context.
 * @param to - The resident id.
 * @param author - The name the notice is signed with.
 * @param text - The text.
 * @throws RangeError when `to` is no resident of the run.
 */
export function notify(ctx: Ctx, to: string, author: string, text: string): void {
	inboxOf(ctx, to).notices.push({ author, text });
	ctx.emit("notice", { to, author, text });
}

/**
 * Runs `postBoard`, after the schema. A resident's post is a `player` post and the only kind that is news; the
 * post of another caller (a Director) is a `city` post signed with its actor id.
 *
 * The author has seen its own post, but only when it had seen everything before it: a post that somebody else
 * wrote since the author's inputs were built stays news.
 *
 * @param ctx - The context of the tool call.
 * @param text - The text as the caller wrote it.
 * @returns The answer with the post's number, or the refusal `INVALID_TEXT`.
 */
export function postBoard(ctx: ToolCtx, text: string): ToolOutcome {
	const author = selfOf(ctx);
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_BOARD_POST_LENGTH) return refuse("INVALID_TEXT", `1-${String(MAX_BOARD_POST_LENGTH)} characters`);
	const before = ctx.state.board.lastPlayerSeq();
	const post = postToBoard(ctx, author, trimmed, ctx.resident === undefined ? "city" : "player");
	if (post.kind === "player" && (ctx.state.seenBoard.get(author) ?? 0) >= before) ctx.state.seenBoard.set(author, post.seq);
	return reply(ctx.prompt("channels/replies/board-posted", { seq: post.seq }));
}

/**
 * Runs `readBoard`: without `afterSeq` the posts of others since the caller's last read, else the posts after that number.
 *
 * @param ctx - The context of the tool call.
 * @param afterSeq - Read after this number; undefined: since the last read.
 * @param limit - At most this many posts of a read with `afterSeq`; 50 when left out.
 * @returns The posts, one line each, or the line that says there are none.
 */
export function readBoard(ctx: ToolCtx, afterSeq: number | undefined, limit: number | undefined): ToolOutcome {
	const self = selfOf(ctx);
	const result = afterSeq === undefined ? ctx.state.board.takeUnread(self) : ctx.state.board.readFrom(self, afterSeq, limit ?? 50);
	const lines = result.posts.map((post) => `#${String(post.seq)} ${post.author}: ${post.text}`);
	if (result.skipped > 0) lines.push(ctx.prompt("channels/replies/board-hidden", { count: result.skipped }));
	return reply(lines.length === 0 ? ctx.prompt("channels/replies/board-none", {}) : lines.join("\n"));
}
