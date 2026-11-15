// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** What `channels` puts into a resident's activation, and whether the resident has news. */
import type { InputLine } from "@swarmtales/contracts";
import { drainMailbox } from "./dms.ts";
import { inboxOf } from "./messages.ts";
import type { Ctx } from "./head.ts";
import { groupUnread } from "./treasury.ts";

/**
 * Empties the resident's inbox into input lines, the direct messages (kind `dm`, each delivered with
 * `dm_delivered`) before the notices (kind `notice`), and marks the board as seen up to its newest player post. The mark is taken when the inputs are built, which is the start of the resident's turn
 * only with `blockSize: 1` (see the README's limits).
 *
 * @param resident - The resident that is activated.
 * @param ctx - The context.
 * @returns The lines, oldest first within each kind.
 */
export function inboxInputs(resident: string, ctx: Ctx): readonly InputLine[] {
	ctx.state.seenBoard.set(resident, ctx.state.board.lastPlayerSeq());
	const dms = drainMailbox(ctx, resident).map((entry) => ({ kind: "dm", text: ctx.prompt("channels/input/dm", { number: entry.number, from: entry.from, text: entry.text }) }));
	const notices = inboxOf(ctx, resident)
		.notices.splice(0)
		.map((notice) => ({ kind: "notice", text: ctx.prompt("channels/input/notice", { author: notice.author, text: notice.text }) }));
	return [...dms, ...notices];
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
