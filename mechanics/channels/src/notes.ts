// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The note desk of the Directors (old `notes.ts` and `privacy.ts` `nearlySame`): the checks of a note's text that
 * `channels` owns, the budgets as a sliding window per reader (a note at tick 9 and one at tick 10 to the same
 * resident fall in one window of 10, a note to A01 and one to A02 do not), and the log line `gamemaker_note`. The
 * old desk also refused a dealt secret, a private thought, a core motive or goal and a secret role; those checks are
 * the `rule` handlers of their owners on the note tools (section 2.3 of `12-m5-spec.md`).
 */
import type { Refusal } from "@swarmtales/contracts";
import { refuse } from "@swarmtales/sdk";
import type { Ctx } from "./head.ts";

/** What a check of a note's text says: the text that may go, or the refusal's code and detail (`""` for none). */
export type Checked = { readonly ok: true; readonly text: string } | Failed;

/** A failed check: the refusal's code and detail (`""` for none). */
export interface Failed {
	/** Always false. */
	readonly ok: false;
	/** The refusal code. */
	readonly code: string;
	/** The detail, `""` for none. */
	readonly detail: string;
}

// Lower-case word tokens of a note, for `nearlySame`.
function tokens(text: string): ReadonlySet<string> {
	return new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

/**
 * Whether two notes say nearly the same: more than `share` of the longer note's distinct words appear in the other.
 *
 * @param a - One note.
 * @param b - The other.
 * @param share - The share of words above which they are the same.
 * @returns True when they are nearly the same; two notes without a word are.
 */
export function nearlySame(a: string, b: string, share = 0.8): boolean {
	const x = tokens(a);
	const y = tokens(b);
	const longer = Math.max(x.size, y.size);
	if (longer === 0) return true;
	let shared = 0;
	for (const word of x) if (y.has(word)) shared += 1;
	return shared / longer > share;
}

/**
 * Splits `CODE: detail` of a prompt into the refusal's two fields.
 *
 * @param text - The rendered prompt.
 * @returns The code and the detail, `""` when there is none.
 */
function refusalOf(text: string): Failed {
	const split = text.indexOf(": ");
	return split < 0 ? { ok: false, code: text, detail: "" } : { ok: false, code: text.slice(0, split), detail: text.slice(split + 2) };
}

/**
 * The refusal a failed check becomes, with the old words.
 *
 * @param failed - The code and the detail (`""` for none).
 * @returns The refusal; without a detail when it is `""`.
 */
export function refusalFor(failed: Failed): Refusal {
	return failed.detail === "" ? refuse(failed.code) : refuse(failed.code, failed.detail);
}

/**
 * A prompt of the note desk as a refusal (`EXILED: ...`, `BUDGET: ...`).
 *
 * @param text - The rendered prompt.
 * @returns The refusal.
 */
export function refusalOfText(text: string): Refusal {
	return refusalFor(refusalOf(text));
}

// A note's text without its signature or a `<author|CITY|city> minute N:` heading, trimmed.
function stripped(ctx: Ctx, raw: string): string {
	const author = ctx.options.noteAuthor;
	const names = [author, "CITY", ...(ctx.options.city === undefined ? [] : [ctx.options.city])].join("|");
	return raw
		.trim()
		.replace(new RegExp(`^${author}\\s*[:,-]\\s*`, "i"), "")
		.replace(new RegExp(`^(?:(?:${names})\\s+)?minute\\s+\\d+\\s*[:,-]\\s*`, "i"), "")
		.trim();
}

// The numbers of a line: the lines of a tribunal repeat their shape from vote to vote, and one with other numbers is new.
const numbersOf = (line: string): string => (line.match(/\d+/g) ?? []).join(",");

/**
 * Checks a note's text in the old order of the checks `channels` keeps: the length, then the repeat to `as`.
 *
 * @param ctx - The context.
 * @param raw - The text as the Director wrote it.
 * @param as - Whom the repeat is counted under: a resident id, `board` or `tribunal`.
 * @returns The stripped text, or `INVALID_TEXT` or `REPEATED` in the old words.
 */
export function checkNote(ctx: Ctx, raw: string, as: string): Checked {
	const text = stripped(ctx, raw);
	if (text.length === 0 || text.length > ctx.options.noteMaxLength) return refusalOf(ctx.prompt("channels/notes/invalid-text", { max: ctx.options.noteMaxLength }));
	const earlier = ctx.state.notes.find((note) => note.to === as && nearlySame(note.text, text) && (as !== "tribunal" || numbersOf(note.text) === numbersOf(text)));
	if (earlier !== undefined) return refusalOf(ctx.prompt("channels/notes/repeated", { to: as === "board" ? "the board" : as, minute: earlier.tick }));
	return { ok: true, text };
}

/**
 * The budget of a reader: its notes within the current window and its limit (`boardPosts` for the board, else `notesPerAgent`).
 *
 * @param ctx - The context.
 * @param to - The reader.
 * @returns The notes used and the limit.
 */
export function noteBudget(ctx: Ctx, to: string): { readonly used: number; readonly limit: number } {
	const used = ctx.state.notes.filter((note) => note.to === to && ctx.tick - note.tick < ctx.options.windowMinutes).length;
	return { used, limit: to === "board" ? ctx.options.boardPosts : ctx.options.notesPerAgent };
}

/**
 * The refusal of a spent budget, in the old words.
 *
 * @param ctx - The context.
 * @param to - The reader.
 * @returns `BUDGET`, or undefined while the budget holds.
 */
export function budgetRefusal(ctx: Ctx, to: string): Refusal | undefined {
	const { used, limit } = noteBudget(ctx, to);
	if (used < limit) return undefined;
	const window = ctx.options.windowMinutes;
	return refusalOfText(to === "board" ? ctx.prompt("channels/notes/budget-posts", { posts: limit, window }) : ctx.prompt("channels/notes/budget-notes", { notes: limit, window }));
}

/**
 * Records a note under `to` (its budget and repeats) and writes `gamemaker_note` as shown to `shown`.
 *
 * @param ctx - The context.
 * @param to - Whom it is recorded under.
 * @param text - The stripped text.
 * @param number - The message number of the note or the post.
 * @param shown - Whom it was shown to; the board for the lines of a tribunal.
 */
export function recordNote(ctx: Ctx, to: string, text: string, number: number, shown: string = to): void {
	ctx.state.notes.push({ tick: ctx.tick, to, text });
	ctx.emit("gamemaker_note", { to: shown, author: ctx.options.noteAuthor, text, number });
}
