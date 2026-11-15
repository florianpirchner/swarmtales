// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `defy`: a resident refuses an order of a Director, for a reason of its own character. The reason goes to the log as
 * `gamemaker_defied`; no other resident learns of it. The tool is locked unless the game opens it to every resident
 * (`defiance`); a game mechanic that opens it to one resident only (the whisperer of Whispers) sets `defiance` and
 * locks it for the others in its own `lock` handler.
 */
import type { RandomSource, Refusal, ToolOutcome } from "@swarmtales/contracts";
import { refuse, reply } from "@swarmtales/sdk";
import type { Ctx, ToolCtx } from "./head.ts";

/** The length of a reason, in characters, after trimming; the tool's text names it. */
export const DEFY_REASON = { min: 20, max: 600 } as const;

/**
 * Runs `defy`, after the schema.
 *
 * @param ctx - The context of the tool call.
 * @param reason - The reason as the resident wrote it.
 * @param note - The number of the note it refuses, if it names one.
 * @returns The answer, or the refusal `INVALID_REASON`.
 */
export function defy(ctx: ToolCtx, reason: string, note: number | undefined): ToolOutcome {
	const text = reason.trim();
	if (text.length < DEFY_REASON.min || text.length > DEFY_REASON.max) return refuse("INVALID_REASON", `${String(DEFY_REASON.min)}-${String(DEFY_REASON.max)} characters`);
	ctx.emit("gamemaker_defied", { agent: ctx.resident ?? ctx.actor, reason: text, ...(note === undefined ? {} : { note }) });
	return reply(ctx.prompt("channels/replies/defy-recorded", {}));
}

/**
 * The `lock` handler of `defy`: closed to every resident unless the game sets `defiance`. Asked on every call, so a
 * resumed run needs nothing kept.
 *
 * @param tool - The bare name of the called tool.
 * @param owner - The mechanic that owns it.
 * @param ctx - The context.
 * @returns `TOOL_LOCKED` in the old words, or undefined.
 */
export function defyLock(tool: string, owner: string, ctx: Ctx): Refusal | undefined {
	return owner === ctx.mechanic && tool === "defy" && !ctx.options.defiance ? refuse("TOOL_LOCKED", ctx.prompt("channels/replies/locked", {})) : undefined;
}

/** The share of the times the sample of `defy` is asked in which it gives a call. */
const DEFY_RATE = 0.125;
const DEFY_REASONS = ["My character keeps its own counsel and will not follow this order.", "I do not take orders from a voice I cannot see; I refuse this one."];

/**
 * What the fake driver (`--fake`) may call of `defy`: now and then a short reason in the resident's voice, once a
 * Director has left the resident a note it could refuse. Without `defiance` or without such a note it gives nothing and
 * draws nothing, so a run in which `defy` cannot be taken plays as before. No sample changes state.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time, for a caller that is no resident and when there is no order to refuse.
 */
export function sampleDefy(ctx: ToolCtx, random: RandomSource): { reason: string } | undefined {
	const self = ctx.resident;
	if (self === undefined || !ctx.options.defiance || !ctx.state.notes.some((note) => note.to === self)) return undefined;
	return random.next() >= DEFY_RATE ? undefined : { reason: random.pick(DEFY_REASONS) };
}
