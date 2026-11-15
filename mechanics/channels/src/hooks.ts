// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** What `channels` puts into a resident's activation, whether the resident has news, and what it has seen of the board. */
import type { InputLine } from "@swarmtales/contracts";
import { drainMailbox } from "./dms.ts";
import { inboxOf } from "./messages.ts";
import type { Ctx } from "./head.ts";
import { shownLines } from "./shown.ts";
import { groupUnread } from "./treasury.ts";
import { windowLine } from "./window.ts";

// `[unread] board 3 · group G1 2`: the unread posts of others on the board (while `readBoard` is open) and in groups.
function digestLine(ctx: Ctx, resident: string): InputLine {
	const board = ctx.access.isLocked(resident, "readBoard") ? 0 : ctx.state.board.unreadCount(resident);
	const parts = [...(board > 0 ? [`board ${String(board)}`] : []), ...groupUnread(ctx, resident).map((entry) => `group ${entry.group} ${String(entry.unread)}`)];
	return { kind: "digest", text: parts.length > 0 ? ctx.prompt("channels/input/unread", { parts: parts.join(" · ") }) : ctx.prompt("channels/input/unread-nothing", {}) };
}

/**
 * Builds the resident's lines in the old order: the window of the cap as a status part (read before anything is
 * emptied), the direct messages (kind `dm`, each delivered with `dm_delivered`), the notices (kind `notice`), and with
 * `digest` the line of unread posts (kind `digest`). It also takes the board's newest player post the activation
 * starts from, for the "seen" mark.
 *
 * @param resident - The resident that is activated.
 * @param ctx - The context.
 * @returns The lines, as the resident reads them (names with a provider of `identity`).
 */
export function inboxInputs(resident: string, ctx: Ctx): readonly InputLine[] {
	ctx.state.taken.set(resident, ctx.state.board.lastPlayerSeq());
	const status = windowLine(ctx, resident);
	const dms = drainMailbox(ctx, resident).map((entry) => ({ kind: "dm", text: ctx.prompt("channels/input/dm", { number: entry.number, from: entry.from, text: entry.text }) }));
	const notices = inboxOf(ctx, resident)
		.notices.splice(0)
		.map((notice) => ({ kind: "notice", text: ctx.prompt("channels/input/notice", { author: notice.author, text: notice.text }) }));
	return shownLines(ctx, [...status, ...dms, ...notices, ...(ctx.options.digest ? [digestLine(ctx, resident)] : [])]);
}

/**
 * Sets the "seen" mark when the activation ends (old `turnEnded`): the resident has seen the board as its inputs
 * showed it, plus its own doing. When nobody else posted since its inputs were built, that is the whole board; else
 * what earlier members of its block posted before its turn stays news, also after its own post. The scheduler runs the
 * calls of a block's members one after the other, so a post of another resident since the inputs came before this
 * resident's turn.
 *
 * @param resident - The resident.
 * @param ctx - The context.
 */
export function activationClosed(resident: string, ctx: Ctx): void {
	const start = ctx.state.taken.get(resident) ?? 0;
	const others = ctx.state.board.all(start).some((post) => post.kind === "player" && post.author !== resident);
	ctx.state.seenBoard.set(resident, others ? start : ctx.state.board.lastPlayerSeq());
}

/**
 * Says whether the resident has news: a direct message or a notice that waits, an unread post of another member in
 * one of its groups, or a player post it has not seen. A post counts only while the resident can read it (`readGroup`,
 * `readBoard` is not locked).
 *
 * @param resident - The resident.
 * @param ctx - The context; nothing is changed.
 * @returns True when there is news.
 */
export function news(resident: string, ctx: Ctx): boolean {
	const inbox = inboxOf(ctx, resident);
	if (inbox.mailbox.size > 0 || inbox.notices.length > 0) return true;
	if (groupUnread(ctx, resident).length > 0) return true;
	if (ctx.access.isLocked(resident, "readBoard")) return false;
	return ctx.state.board.lastPlayerSeq() > (ctx.state.seenBoard.get(resident) ?? 0);
}
