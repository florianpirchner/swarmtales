/**
 * What channels puts in a resident's turn (carve plan step 18, `Arena#inputsFor`): the DM cap's
 * window as a status part, the DMs and notices that arrived, the digest of unread posts; and the
 * resident's novelty (the old arena's `#hasNovelty` and `#markSeen`, board and mail part).
 */
import type { TurnLine } from "@swarmtales/contracts";
import { STATUS_ORDER } from "@swarmtales/mechanic-shared";
import { groupUnread } from "./treasury.ts";
import { dmWindow, drainMailbox, inboxOf, type Ctx } from "./messages.ts";

/** `[DM #41 from A01] ...`; the number is the city's message number (absent for DMs written before numbering). */
function dmLine(ctx: Ctx, from: string, text: string, number: number | undefined): string {
	return number === undefined ? ctx.prompt("competitor/input/dm", { from, text }) : ctx.prompt("competitor/input/dm-numbered", { number, from, text });
}

/** `[CITY] ...`, or `[COURIER #57] ...` for a numbered note of the gamemaker. */
function noticeLine(ctx: Ctx, author: string, text: string, number: number | undefined): string {
	return number === undefined ? ctx.prompt("competitor/input/notice", { author, text }) : ctx.prompt("competitor/input/notice-numbered", { author, number, text });
}

function digestLine(ctx: Ctx, agent: string): string {
	const board = ctx.access.isLocked(agent, "readBoard") ? 0 : ctx.state.board.unreadCount(agent);
	const parts = [...(board > 0 ? [`board ${String(board)}`] : []), ...groupUnread(ctx, agent).map((entry) => `group ${entry.group} ${String(entry.unread)}`)];
	return parts.length > 0 ? ctx.prompt("competitor/input/unread", { parts: parts.join(" · ") }) : ctx.prompt("competitor/input/unread-nothing", {});
}

/** The lines of one resident's turn, in the old order: window, DMs (delivered now), notices, digest. */
export function turnInputs(resident: string, ctx: Ctx): readonly TurnLine[] {
	// Taken before any member of the block acts: what the block's start looked like.
	ctx.state.blockStart.set(resident, ctx.state.board.lastPlayerSeq());
	const lines: TurnLine[] = [];
	const window = dmWindow(ctx, resident);
	if (window !== null) {
		lines.push({ kind: "status", order: STATUS_ORDER.dmWindow, text: ctx.prompt("competitor/status/dm-window", { sent: window.sent, limit: window.limit, from: window.from, until: window.until }) });
	}
	for (const entry of drainMailbox(ctx, resident)) lines.push({ kind: "dm", text: dmLine(ctx, entry.from, entry.text, entry.number) });
	for (const notice of inboxOf(ctx, resident).notices.splice(0)) lines.push({ kind: "notice", text: noticeLine(ctx, notice.author, notice.text, notice.number) });
	lines.push({ kind: "digest", text: digestLine(ctx, resident) });
	return lines;
}

/**
 * Novelty (SPEC §3): a DM, an unread group post, a notice, or a new player post on the board.
 * Unread DMs, notices and group posts count until they are read; board and group posts count only
 * while the resident can read them (readBoard, readGroup).
 */
export function news(resident: string, ctx: Ctx): boolean {
	const inbox = inboxOf(ctx, resident);
	if (inbox.mailbox.size > 0 || inbox.notices.length > 0) return true;
	if (groupUnread(ctx, resident).length > 0) return true;
	if (ctx.access.isLocked(resident, "readBoard")) return false;
	return ctx.state.board.lastPlayerSeq() > (ctx.state.seenBoard.get(resident) ?? 0);
}

export function turnOpened(resident: string, ctx: Ctx): void {
	ctx.state.turnStart.set(resident, ctx.state.board.lastPlayerSeq());
}

/**
 * After a turn, the resident has seen the block's start plus its own doing. What earlier members of
 * its block did meanwhile is still new: a board that grew before its turn stays unread.
 */
export function turnEnded(resident: string, ctx: Ctx): void {
	const start = ctx.state.blockStart.get(resident) ?? 0;
	const turn = ctx.state.turnStart.get(resident) ?? start;
	const end = ctx.state.board.lastPlayerSeq();
	ctx.state.seenBoard.set(resident, turn === start ? end : start);
}
