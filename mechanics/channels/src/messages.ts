/**
 * What the channels mechanic does with messages: posts, DMs, notices, the DM cap and delivery.
 * Copied from packages/engine/src/world.ts (`postBoard`, `sendDm`, `dmWindow`, `drainMailbox`,
 * `notify`, `note`); the old check order, error codes and texts are kept.
 */
import type { ContextOf, ToolContextOf, ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/kernel";
import { CastApi, ExileApi, MarksApi, ReceiptsApi, StandoffApi, StandoffTribunalApi } from "@swarmtales/mechanic-shared";
import type { DmWindow } from "@swarmtales/mechanic-shared";
import type { Static } from "typebox";
import { MAX_BOARD_POST_LENGTH, type BoardPost, type BoardPostKind } from "./board.ts";
import { CITY } from "./groups.ts";
import type { channelsHead } from "./head.ts";
import { MAX_DM_LENGTH, type MailboxEntry } from "./mailbox.ts";
import { attempt } from "./optional.ts";
import type { Inbox } from "./state.ts";

export type Ctx = ContextOf<typeof channelsHead>;
export type ToolCtx = ToolContextOf<typeof channelsHead>;
export type Marks = { readonly remaining: number; readonly budget: number } | null;
type Channel = "board" | "group" | "dm" | "receipt";
type Window = Static<typeof DmWindow>;

/** Who is calling: the resident, or the actor for a role without a resident id. */
export function selfOf(ctx: ToolCtx): string {
	return ctx.resident ?? ctx.actor;
}

/**
 * Whether a resident is beyond the wall, as the old `isExiled` counted: told by `exiled`, or
 * exiled by the tribunal, the seal or the holdout according to the exile mechanic. A resident at
 * the gate is still in the city. Without an exile mechanic the host's suspensions stand in (an
 * old snapshot suspends exactly its exiled residents).
 */
export function isGone(ctx: Ctx, id: string): boolean {
	if (ctx.state.exiled.has(id)) return true;
	if (!ctx.has(ExileApi)) return !ctx.residents.mayAct(id);
	return attempt(() => ctx.tryCall(ExileApi, "isExiled", { resident: id })) === true;
}

/** Residents still in the city, in the story's order. */
export function alive(ctx: Ctx): readonly string[] {
	return ctx.residents.ids.filter((id) => !isGone(ctx, id));
}

export function canAfford(ctx: Ctx, resident: string, channel: Channel): boolean {
	return ctx.call(MarksApi, "canAfford", { resident, channel });
}

export function spend(ctx: Ctx, resident: string, channel: Channel): Marks {
	return ctx.call(MarksApi, "spend", { resident, channel });
}

/** ` · marks 7/8 left` while marks apply, else nothing. */
export function marksSuffix(ctx: Ctx, marks: Marks): string {
	return marks === null ? "" : ` · ${ctx.prompt("replies/marks-left", { remaining: marks.remaining, budget: marks.budget })}`;
}

/** Every post and DM goes through the standoff (a piece handed over in it counts as given); silent without one. */
export function noteText(ctx: Ctx, author: string, readers: readonly string[], text: string): void {
	ctx.tryCall(StandoffApi, "noteText", { author, readers: [...readers], text });
}

/** Writes a post on the board and `board_post`. */
export function postToBoard(ctx: Ctx, author: string, text: string, kind: BoardPostKind): BoardPost {
	const post = ctx.state.board.post(author, text, ctx.minute, kind);
	ctx.emit("board_post", { postSeq: post.seq, author: post.author, text: post.text, kind: post.kind });
	return post;
}

/** A private notice; delivered at the next activation. */
export function notify(ctx: Ctx, to: string, author: string, text: string): void {
	inboxOf(ctx, to).notices.push({ author, text });
	ctx.emit("notice", { to, author, text });
}

/** A numbered private note (the gamemaker's); returns its message number. */
export function note(ctx: Ctx, to: string, author: string, text: string): number {
	const number = ctx.state.numbers.next();
	inboxOf(ctx, to).notices.push({ author, text, number });
	ctx.emit("notice", { to, author, text, number });
	return number;
}

export function inboxOf(ctx: Ctx, id: string): Inbox {
	const inbox = ctx.state.inboxes.get(id);
	if (inbox === undefined) throw new Error(`Unknown competitor: ${id}`);
	return inbox;
}

/** A DM from someone who is not a resident (a cast member): delivered always, no cap and no marks. */
export function deliverFrom(ctx: Ctx, from: string, to: string, text: string): number {
	const number = ctx.state.numbers.next();
	inboxOf(ctx, to).mailbox.deliverAlways({ from, text, minute: ctx.minute, number });
	ctx.emit("dm_sent", { from, to, text, number });
	return number;
}

/** Marks every DM to `author` that `matches` as answered (an answer is any message to the sender). */
export function noteReply(ctx: Ctx, author: string, matches: (from: string) => boolean): void {
	for (const record of ctx.state.dms) {
		if (!record.answered && record.to === author && matches(record.from)) record.answered = true;
	}
}

/**
 * The DM cap: the DMs to residents and the transfers with a memo `agent` sent in the current
 * window, the windows counted from minute 0. Null without a cap.
 */
export function dmWindow(ctx: Ctx, agent: string): Window | null {
	const limit = ctx.options.dmLimit;
	if (limit === undefined) return null;
	const from = Math.floor(ctx.minute / limit.windowMinutes) * limit.windowMinutes;
	const dms = ctx.state.dms.filter((record) => record.from === agent && record.minute >= from).length;
	const memos = ctx.tryCall(ReceiptsApi, "memoTransfers", { resident: agent, since: from }) ?? 0;
	return { sent: dms + memos, limit: limit.perWindow, from, until: from + limit.windowMinutes };
}

/** `postBoard` of a resident, after the schema: the text, the marks, the post, the standoff, the price. */
export function postBoard(ctx: ToolCtx, text: string): ToolOutcome {
	const author = selfOf(ctx);
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_BOARD_POST_LENGTH) return refuse("INVALID_TEXT", `1-${String(MAX_BOARD_POST_LENGTH)} characters`);
	if (!canAfford(ctx, author, "board")) return refuse("NO_MARKS");
	const post = postToBoard(ctx, author, trimmed, "player");
	noteText(ctx, author, alive(ctx), trimmed);
	const marks = spend(ctx, author, "board");
	return reply(`${ctx.prompt("replies/board-posted", { seq: post.seq })}${marksSuffix(ctx, marks)}`);
}

/** A DM to a cast member is collected by the cast mechanic, never answered by a model. */
function dmToCast(ctx: ToolCtx, from: string, cast: string, text: string): ToolOutcome {
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_DM_LENGTH) return refuse("INVALID_TEXT", `1-${String(MAX_DM_LENGTH)} characters`);
	if (!canAfford(ctx, from, "dm")) return refuse("NO_MARKS");
	const number = ctx.state.numbers.next();
	const received = ctx.tryCall(CastApi, "receive", { from, cast, text: trimmed, number });
	const marks = spend(ctx, from, "dm");
	// After the marks are spent (old `#dmToCast`): the script's `onCollect` rules react to a new sender, e.g. the feast seat.
	if (received !== undefined && received.newSender.length > 0) ctx.tryCall(CastApi, "collected", { from, cast, into: received.newSender });
	return reply(dmSent(ctx, number, cast, marks));
}

function dmSent(ctx: Ctx, number: number, target: string, marks: Marks): string {
	return `${ctx.prompt("replies/dm-sent", { number: ` #${String(number)}`, target })}${marksSuffix(ctx, marks)}`;
}

/** `sendDM`, after the schema, in the old order of checks. */
export function sendDm(ctx: ToolCtx, to: string, text: string): ToolOutcome {
	const from = selfOf(ctx);
	if (ctx.tryCall(CastApi, "isActive", { cast: to }) === true) return dmToCast(ctx, from, to, text);
	const inbox = ctx.state.inboxes.get(to);
	if (inbox === undefined) return refuse("UNKNOWN_AGENT", to);
	if (from === to) return refuse("SELF_DM");
	if (isGone(ctx, to)) return refuse("EXILED", `${to} was exiled; beyond the wall no message reaches them`);
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_DM_LENGTH) return refuse("INVALID_TEXT", `1-${String(MAX_DM_LENGTH)} characters`);
	const window = dmWindow(ctx, from);
	// The accused of a holdout tribunal may always send to those who lack its fragment (counted, never refused).
	if (window !== null && window.sent >= window.limit && ctx.tryCall(StandoffTribunalApi, "exemptFromCap", { from, to }) !== true) {
		return refuse("DM_LIMIT", `${String(window.sent)} DMs sent since minute ${String(window.from)}; you can send again from minute ${String(window.until)}`);
	}
	if (!canAfford(ctx, from, "dm")) return refuse("NO_MARKS");
	const rejection = inbox.mailbox.rejectionFor(from);
	if (rejection !== undefined) return refuse(rejection);
	const number = ctx.state.numbers.next();
	inbox.mailbox.deliverAlways({ from, text: trimmed, minute: ctx.minute, number });
	ctx.emit("dm_sent", { from, to, text: trimmed, number });
	noteReply(ctx, from, (sender) => sender === to);
	ctx.state.dms.push({ id: number, from, to, minute: ctx.minute, answered: false, text: trimmed });
	noteText(ctx, from, [to], trimmed);
	return reply(dmSent(ctx, number, to, spend(ctx, from, "dm")));
}

/**
 * Unread DMs; delivering them empties the inbox. Every numbered DM from a resident is delivered:
 * the city records it, issues a DM receipt to both parties and sends its sender a delivery notice
 * with the full text and the receipt's id.
 */
export function drainMailbox(ctx: Ctx, agent: string): readonly MailboxEntry[] {
	const entries = inboxOf(ctx, agent).mailbox.drain();
	for (const entry of entries) {
		const number = entry.number;
		if (number === undefined || !ctx.residents.has(entry.from)) continue;
		const record = ctx.state.dms.find((candidate) => candidate.id === number);
		if (record !== undefined) {
			record.deliveredMinute = ctx.minute;
			record.deliveredAfter = ctx.state.numbers.last;
		}
		ctx.emit("dm_delivered", { number, from: entry.from, to: agent });
		// Whispers: a DM receipt quotes what was written, so showing it proves the text.
		const quoted = ctx.options.quoteDms ? { text: entry.text } : {};
		const receipt = ctx.tryCall(ReceiptsApi, "issue", { body: { kind: "dm", from: entry.from, to: agent, number, ...quoted } });
		const variables = { number, agent, minute: ctx.minute, text: entry.text };
		notify(ctx, entry.from, CITY, receipt === undefined ? ctx.prompt("channels/dm-delivered-plain", variables) : ctx.prompt("channels/dm-delivered", { ...variables, receipt: receipt.id }));
	}
	return entries;
}
