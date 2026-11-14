// SPDX-License-Identifier: Apache-2.0
/** Direct messages: sending and delivery. The check order, the codes and the texts are the old platform's. */
import type { ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import type { Ctx, ToolCtx } from "./head.ts";
import { MAX_DM_LENGTH, type MailboxEntry } from "./mailbox.ts";
import { inboxOf, notify, selfOf } from "./messages.ts";

/** The name the city signs its notices with. */
const CITY = "CITY";

/**
 * Runs `sendDM`, after the schema, in the old order of checks: the receiver exists, is not the sender, may act
 * (a suspended resident is beyond the wall), the text, the receiver's mailbox.
 *
 * @param ctx - The context of the tool call.
 * @param to - The receiver as the caller wrote it.
 * @param text - The text as the caller wrote it.
 * @returns The answer with the message's number, or the refusal `UNKNOWN_AGENT`, `SELF_DM`, `EXILED`,
 * `INVALID_TEXT`, `MAILBOX_FULL` or `MAILBOX_SENDER_LIMIT`.
 */
export function sendDm(ctx: ToolCtx, to: string, text: string): ToolOutcome {
	const from = selfOf(ctx);
	const inbox = ctx.state.inboxes.get(to);
	if (inbox === undefined) return refuse("UNKNOWN_AGENT", to);
	if (from === to) return refuse("SELF_DM");
	if (!ctx.residents.mayAct(to)) return refuse("EXILED", `${to} was exiled; beyond the wall no message reaches them`);
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_DM_LENGTH) return refuse("INVALID_TEXT", `1-${String(MAX_DM_LENGTH)} characters`);
	const rejection = inbox.mailbox.rejectionFor(from);
	if (rejection !== undefined) return refuse(rejection);
	const number = ctx.state.numbers.next();
	inbox.mailbox.deliverAlways({ from, text: trimmed, tick: ctx.tick, number });
	ctx.emit("dm_sent", { from, to, text: trimmed, number });
	ctx.state.dms.push({ number, from, to, text: trimmed, tick: ctx.tick });
	return reply(ctx.prompt("channels/replies/dm-sent", { number: ` #${String(number)}`, target: to }));
}

/**
 * Empties the mailbox of a resident that is activated. Every message of a resident is delivered: the city writes
 * `dm_delivered` and leaves its sender a notice with the full text. A message of a sender that is no resident (a
 * Director with the grant) is shown without either.
 *
 * @param ctx - The context.
 * @param resident - The resident id.
 * @returns The messages, oldest first.
 * @throws RangeError when the id is no resident of the run.
 */
export function drainMailbox(ctx: Ctx, resident: string): readonly MailboxEntry[] {
	const entries = inboxOf(ctx, resident).mailbox.drain();
	for (const entry of entries) {
		if (!ctx.residents.has(entry.from)) continue;
		ctx.emit("dm_delivered", { number: entry.number, from: entry.from, to: resident });
		notify(ctx, entry.from, CITY, ctx.prompt("channels/notices/dm-delivered", { number: entry.number, agent: resident, minute: ctx.tick, text: entry.text }));
	}
	return entries;
}
