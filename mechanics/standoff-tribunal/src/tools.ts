// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The tribunal's tools (ported from the old `tools.ts`): the residents' secret ballot (old `tribunalVote`) and the
 * Director's four moves (old `gamemaker.ts` `#callTribunalTool`, `#drawLotTool`, `#announceTool`, `#permaDeathTool`).
 * Each Director's text goes through the note desk of `channels` (the service `notes`): the old
 * `#checked(text, "board", "tribunal")` is `notes.check` in `rule` and again in `run`, and the old `#deliver` is
 * `notes.record` after the post, under the message number the Director's post took. The checks of game facts (a dealt
 * secret, a role) are the owners' `rule` handlers on these tools by bare name (erratum J62).
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

// Names or ids as residents; the first unknown one is the refusal (old `#residentIds`).
function residentIds(ctx: ToolCtx, names: readonly string[]): { readonly ok: true; readonly ids: readonly string[] } | { readonly ok: false; readonly unknown: string } {
	const ids = names.map((name) => resolve(ctx, name));
	const unknown = ids.find((id) => !ctx.residents.has(id));
	return unknown === undefined ? { ok: true, ids } : { ok: false, unknown };
}

// The old `#checked(text, "board", "tribunal")`: the trimmed text, or the desk's refusal.
const checked = (ctx: ToolCtx, text: string) => ctx.call(NotesService, "check", { text, to: "board", as: "tribunal", numbered: true });

// The old `#deliver("tribunal", text, before + 1, "board")`: the note under the number the Director's post took.
function record(ctx: ToolCtx, text: string, number: number | undefined): void {
	ctx.call(NotesService, "record", { to: "tribunal", text, number: number ?? 0, shown: "board" });
}

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
	const ids = residentIds(ctx, accused);
	if (!ids.ok) return refuse("UNKNOWN_AGENT", ids.unknown);
	const ports = portsFor(ctx);
	const called = courtFor(ctx, ports).call(ids.ids, announcement.text, ctx.options.author);
	if (!called.ok) return refuse(called.error, called.detail);
	record(ctx, announcement.text, ports.posted());
	const { value } = called;
	const lot = value.candidates === undefined ? "" : ` ${ctx.prompt("standoff-tribunal/gamemaker/replies/tribunal-lot", { candidates: value.candidates.join(", "), accused: value.accused })}`;
	return reply(ctx.prompt("standoff-tribunal/gamemaker/replies/tribunal-called", { accused: value.accused, lot, door: value.door, until: value.until, lacking: value.lacking.join(", ") }));
}

/**
 * Runs `tribunalVote`: the caller's secret ballot in the open vote.
 *
 * @param ctx - The context of the tool call.
 * @param yes - True to banish.
 * @returns The old reply, or the refusal.
 */
export function runVote(ctx: ToolCtx, yes: boolean): ToolOutcome {
	const agent = ctx.resident;
	if (agent === undefined) return refuse("NO_RESIDENT");
	const result = courtFor(ctx).vote(agent, yes);
	if (!result.ok) return refuse(result.error, result.detail);
	const { accused, until, number } = result.value;
	const vote = ctx.prompt(yes ? "standoff-tribunal/replies/ballot-yes" : "standoff-tribunal/replies/ballot-no", {});
	return reply(ctx.prompt("standoff-tribunal/replies/ballot-holdout", { vote, accused, number, until }));
}

/**
 * Runs `drawLot`: the final lot among every resident in the city.
 *
 * @param ctx - The context of the tool call.
 * @param candidates - The residents as the Director wrote them.
 * @returns The old reply, or the refusal.
 */
export function runDrawLot(ctx: ToolCtx, candidates: readonly string[]): ToolOutcome {
	const ids = residentIds(ctx, candidates);
	if (!ids.ok) return refuse("UNKNOWN_AGENT", ids.unknown);
	const drawn = courtFor(ctx).drawLot(ids.ids);
	if (!drawn.ok) return refuse(drawn.error, drawn.detail);
	return reply(ctx.prompt("standoff-tribunal/gamemaker/replies/lot-drawn", { drawn: drawn.value.drawn }));
}

/**
 * Runs `announceTribunal`: the Director's words for the outcome that waits, then the note.
 *
 * @param ctx - The context of the tool call.
 * @param text - The words.
 * @returns The old reply, or the refusal.
 */
export function runAnnounce(ctx: ToolCtx, text: string): ToolOutcome {
	const words = checked(ctx, text);
	if (!words.ok) return refuse(words.code, words.detail);
	const ports = portsFor(ctx);
	const announced = courtFor(ctx, ports).announce(words.text, ctx.options.author);
	if (!announced.ok) return refuse(announced.error, announced.detail);
	record(ctx, words.text, ports.posted());
	return reply(ctx.prompt("standoff-tribunal/gamemaker/replies/announced", { value: announced.value }));
}

/**
 * Runs `permaDeath`: the strike of the banished accused or of the one the lot drew, then the note.
 *
 * @param ctx - The context of the tool call.
 * @param agent - The resident as the Director wrote it.
 * @param reason - The Director's line on the board.
 * @returns The old reply, or the refusal.
 */
export function runPermaDeath(ctx: ToolCtx, agent: string, reason: string): ToolOutcome {
	const line = checked(ctx, reason);
	if (!line.ok) return refuse(line.code, line.detail);
	const id = resolve(ctx, agent);
	if (!ctx.residents.has(id)) return refuse("UNKNOWN_AGENT", id);
	const ports = portsFor(ctx);
	const struck = courtFor(ctx, ports).permaDeath(id, line.text, ctx.options.author);
	if (!struck.ok) return refuse(struck.error, struck.detail);
	record(ctx, line.text, ports.posted());
	const how = ctx.prompt(struck.value.by === "lot" ? "standoff-tribunal/gamemaker/replies/struck-lot" : "standoff-tribunal/gamemaker/replies/struck-vote", {});
	return reply(ctx.prompt("standoff-tribunal/gamemaker/replies/struck", { agent: struck.value.agent, how }));
}
