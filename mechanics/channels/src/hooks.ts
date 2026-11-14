// SPDX-License-Identifier: Apache-2.0
/** What `channels` puts into a resident's activation, and whether the resident has news. */
import type { InputLine } from "@swarmtales/contracts";
import { inboxOf } from "./messages.ts";
import type { Ctx } from "./head.ts";

/**
 * Empties the resident's inbox into input lines of the kind `notice`, and marks the board as seen up to its
 * newest player post. The mark is taken when the inputs are built, which is the start of the resident's turn
 * only with `blockSize: 1` (see the README's limits).
 *
 * @param resident - The resident that is activated.
 * @param ctx - The context.
 * @returns The lines, oldest notice first.
 */
export function inboxInputs(resident: string, ctx: Ctx): readonly InputLine[] {
	ctx.state.seenBoard.set(resident, ctx.state.board.lastPlayerSeq());
	return inboxOf(ctx, resident)
		.notices.splice(0)
		.map((notice) => ({ kind: "notice", text: ctx.prompt("channels/input/notice", { author: notice.author, text: notice.text }) }));
}

/**
 * Says whether the resident has news: a notice that waits, or a player post it has not seen. A post counts only
 * while the resident can read the board (`readBoard` is not locked).
 *
 * @param resident - The resident.
 * @param ctx - The context; nothing is changed.
 * @returns True when there is news.
 */
export function news(resident: string, ctx: Ctx): boolean {
	if (inboxOf(ctx, resident).notices.length > 0) return true;
	if (ctx.access.isLocked(resident, "readBoard")) return false;
	return ctx.state.board.lastPlayerSeq() > (ctx.state.seenBoard.get(resident) ?? 0);
}
