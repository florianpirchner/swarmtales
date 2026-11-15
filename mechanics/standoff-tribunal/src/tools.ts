// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Director's tool `callTribunal` (old `gamemaker.ts` `#callTribunalTool`, ported from the old `tools.ts`). Its
 * text goes through the note desk of `channels` (the service `notes`): the old `#checked(text, "board", "tribunal")`
 * is `notes.check` in `rule` and again in `run`, and the old `#deliver` is `notes.record` after the post, under the
 * message number the post took. The checks of game facts (a dealt secret, a role) are the owners' `rule` handlers on
 * this tool by bare name (erratum J62).
 */
import type { Refusal, ToolOutcome } from "@swarmtales/contracts";
import { IdentityService } from "@swarmtales/mechanic-contracts";
import { NotesService } from "@swarmtales/mechanic-channels/contract";
import { refuse, reply } from "@swarmtales/sdk";
import type { ToolCtx } from "./head.ts";
import { courtFor, portsFor } from "./ports.ts";

// A name or id as the resident it stands for (old `resolveResident`), trimmed.
function resolve(ctx: ToolCtx, text: string): string {
	const trimmed = text.trim();
	return ctx.tryCall(IdentityService, "resolve", { text: trimmed }) ?? trimmed;
}

// The old `#checked(text, "board", "tribunal")`: the trimmed text, or the desk's refusal.
const checked = (ctx: ToolCtx, text: string) => ctx.call(NotesService, "check", { text, to: "board", as: "tribunal" });

/**
 * The rule of a Director's text of the tribunal: the length and the repeat of the note desk.
 *
 * @param ctx - The context of the tool call.
 * @param text - The text.
 * @returns The desk's refusal, or undefined.
 */
export function checkLine(ctx: ToolCtx, text: string): Refusal | undefined {
	const result = checked(ctx, text);
	return result.ok ? undefined : refuse(result.code, result.detail);
}

/**
 * Runs `callTribunal`: the text, the residents, the court's call, then the note under the post's number.
 *
 * @param ctx - The context of the tool call.
 * @param accused - The residents as the Director wrote them.
 * @param reason - The announcement.
 * @returns The old reply, or the refusal.
 */
export function runCallTribunal(ctx: ToolCtx, accused: readonly string[], reason: string): ToolOutcome {
	const announcement = checked(ctx, reason);
	if (!announcement.ok) return refuse(announcement.code, announcement.detail);
	const ids = accused.map((name) => resolve(ctx, name));
	const unknown = ids.find((id) => !ctx.residents.has(id));
	if (unknown !== undefined) return refuse("UNKNOWN_AGENT", unknown);
	const ports = portsFor(ctx);
	const called = courtFor(ctx, ports).call(ids, announcement.text, ctx.options.author);
	if (!called.ok) return refuse(called.error, called.detail);
	ctx.call(NotesService, "record", { to: "tribunal", text: announcement.text, number: ports.posted() ?? 0, shown: "board" });
	const { value } = called;
	const lot = value.candidates === undefined ? "" : ` ${ctx.prompt("standoff-tribunal/gamemaker/replies/tribunal-lot", { candidates: value.candidates.join(", "), accused: value.accused })}`;
	return reply(ctx.prompt("standoff-tribunal/gamemaker/replies/tribunal-called", { accused: value.accused, lot, door: value.door, until: value.until, lacking: value.lacking.join(", ") }));
}
