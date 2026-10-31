/**
 * The gamemaker's note desk (carve step 17, decisions D-7), copied from packages/roles/src/gamemaker/
 * gamemaker.ts (`#checked`, `#deliver`, `#used`): the text checks in their old order, the budgets as
 * a sliding window per recipient (not a host limit: a note at minute 9 and one at minute 10 to the
 * same resident fall in one 10-minute window, a note to A01 and one to A02 do not), and the
 * `gamemaker_note` line. The checks read other mechanics through their APIs (secrets, cores, goals)
 * and the app's `interpretation` events through the log.
 */
import { Type } from "typebox";
import { Parse } from "typebox/value";
import type { Refusal } from "@swarmtales/contracts";
import { refuse } from "@swarmtales/kernel";
import { CoresApi, GoalsApi, NamesApi, ProgressionApi, PuzzlesApi, WhispersEvents } from "@swarmtales/mechanic-shared";
import type { Ctx } from "./messages.ts";
import { attempt } from "./optional.ts";
import { characterLeaks, nearlySame, privateLeaks, roleLeaks, type CharacterFacts, type PrivateLabels } from "./privacy.ts";
import { SecretGuard } from "./secret-guard.ts";

export type Checked = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly code: string; readonly detail: string };

const Interpretation = Type.Object({ agent: Type.String(), source: Type.String(), labels: Type.Array(Type.String()) });

/** The events of the gamemaker's current look: since the look before it, up to its `gamemaker_turn`. */
function lookWindow(ctx: Ctx): ReturnType<Ctx["log"]["all"]> {
	const turns = ctx.log.ofType("app", "gamemaker_turn");
	const last = turns.at(-1);
	if (last === undefined) return ctx.log.all();
	const previous = turns.at(-2);
	return ctx.log.since(previous?.seq ?? 0).filter((event) => event.seq < last.seq);
}

/** Labels of thoughts and asides, plus every lie (read against a thought): old `privateLabelsOf`. */
function privateLabels(ctx: Ctx): PrivateLabels {
	const labels = new Map<string, Set<string>>();
	for (const event of lookWindow(ctx)) {
		if (event.source !== "app" || event.type !== "interpretation") continue;
		const read = Parse(Interpretation, event.payload);
		for (const label of read.labels) {
			if (read.source !== "thought" && read.source !== "aside" && label !== "lie") continue;
			const set = labels.get(read.agent) ?? new Set<string>();
			set.add(label);
			labels.set(read.agent, set);
		}
	}
	return labels;
}

/** Every dealt password, fragment and factor, as far as the puzzles API shows them. */
function secretGuard(ctx: Ctx): SecretGuard {
	const passwords: string[] = [];
	const numbers: string[] = [];
	const bounds = attempt(() => ctx.tryCall(ProgressionApi, "bounds", {}));
	for (let level = bounds?.startLevel ?? 1; level <= (bounds?.lastLevel ?? 0); level++) {
		if (attempt(() => ctx.tryCall(PuzzlesApi, "isDealt", { level })) !== true) continue;
		for (const resident of ctx.residents.ids) {
			const solution = attempt(() => ctx.tryCall(PuzzlesApi, "solutionOf", { resident, level }));
			if (typeof solution === "string") passwords.push(solution);
			const values = attempt(() => ctx.tryCall(PuzzlesApi, "taskValues", { resident, level }));
			if (values !== undefined) {
				if (values.fragment !== "") passwords.push(values.fragment);
				numbers.push(...(`${values.digits} ${values.factors}`.match(/\d+/g) ?? []));
			}
			for (const held of attempt(() => ctx.tryCall(PuzzlesApi, "holders", { resident, level })) ?? []) numbers.push(...(held.value.match(/\d+/g) ?? []));
		}
	}
	return new SecretGuard(passwords, numbers);
}

/** Every resident's drive cues and running goal, for the privacy guard (v09). */
function characters(ctx: Ctx): readonly CharacterFacts[] {
	return ctx.residents.ids.map((agent) => {
		const cues = attempt(() => ctx.tryCall(CoresApi, "cuesOf", { resident: agent })) ?? [];
		const goal = attempt(() => ctx.tryCall(GoalsApi, "goalOf", { resident: agent })) ?? null;
		return { agent, cues, ...(goal === null ? {} : { goal: { kind: goal.kind, ...(goal.target === undefined ? {} : { target: goal.target }) } }) };
	});
}

/** The whisperer of the run, told by `whisperer_chosen` in the log. */
function whispererOf(ctx: Ctx): string | undefined {
	const chosen = ctx.log.ofType("whispers", "whisperer_chosen").at(0);
	return chosen === undefined ? undefined : Parse(WhispersEvents.events.whisperer_chosen, chosen.payload).agent;
}

/** `CODE: detail` of a prompt, as the refusal's two fields. */
export function refusalOf(text: string): { readonly code: string; readonly detail: string } {
	const split = text.indexOf(": ");
	return split < 0 ? { code: text, detail: "" } : { code: text.slice(0, split), detail: text.slice(split + 2) };
}

/** The refusal a failed check becomes, with the old words. */
export function refusalFor(failed: { readonly code: string; readonly detail: string }): Refusal {
	return failed.detail === "" ? refuse(failed.code) : refuse(failed.code, failed.detail);
}

function fail(text: string): Checked {
	return { ok: false, ...refusalOf(text) };
}

/**
 * Old `#checked`: trims the text, strips a signature or `<author|CITY|city> minute N:` heading, and
 * refuses an empty or long text, a dealt secret, a private thought, a core or goal, the whisperer's
 * role, or a repeat to `as` (default `to`). `to` is the reader the privacy checks apply to.
 */
export function checkNote(ctx: Ctx, raw: string, to: string, as: string = to): Checked {
	const author = ctx.options.noteAuthor;
	const names = [author, "CITY", ...(ctx.options.city === undefined ? [] : [ctx.options.city])].join("|");
	const trimmed = raw
		.trim()
		.replace(new RegExp(`^${author}\\s*[:,-]\\s*`, "i"), "")
		.replace(new RegExp(`^(?:(?:${names})\\s+)?minute\\s+\\d+\\s*[:,-]\\s*`, "i"), "")
		.trim();
	if (trimmed.length === 0 || trimmed.length > ctx.options.noteMaxLength) return fail(ctx.prompt("gamemaker/replies/invalid-text", { max: ctx.options.noteMaxLength }));
	if (secretGuard(ctx).leaks(trimmed).length > 0) return fail(ctx.prompt("gamemaker/replies/leak-blocked", {}));
	const nameOf = (agent: string): string | undefined => attempt(() => ctx.call(NamesApi, "nameOf", { resident: agent })) ?? undefined;
	const exposed = privateLeaks(trimmed, to, privateLabels(ctx), nameOf);
	if (exposed.length > 0) return fail(ctx.prompt("gamemaker/replies/private-thoughts", { who: exposed.join(", ") }));
	const revealed = characterLeaks(trimmed, to, characters(ctx), nameOf);
	if (revealed.length > 0) return fail(ctx.prompt("gamemaker/replies/private-core", { who: revealed.join(", ") }));
	// Whispers v3: the whisperer stays secret, also from hints.
	const whisperer = whispererOf(ctx);
	if (whisperer !== undefined && roleLeaks(trimmed, to, whisperer, nameOf)) return fail(ctx.prompt("gamemaker/replies/private-role", {}));
	// v09: a director says something new or nothing; the same line twice to the same reader is refused.
	// A tribunal's lines repeat their shape from vote to vote; one with other numbers (a vote, a count, a minute) is new.
	const numbers = (line: string): string => (line.match(/\d+/g) ?? []).join(",");
	const earlier = ctx.state.notes.find((note) => note.to === as && nearlySame(note.text, trimmed) && (as !== "tribunal" || numbers(note.text) === numbers(trimmed)));
	if (earlier !== undefined) return fail(ctx.prompt("gamemaker/replies/repeated", { to: as === "board" ? "the board" : as, minute: earlier.minute }));
	return { ok: true, text: trimmed };
}

/** Notes to `to` within the current window (old `#used`). */
export function notesUsed(ctx: Ctx, to: string): number {
	return ctx.state.notes.filter((note) => note.to === to && ctx.minute - note.minute < ctx.options.windowMinutes).length;
}

/** What `to` may still receive: a resident gets `notesPerAgent`, the board `boardPosts`. */
export function noteBudget(ctx: Ctx, to: string): { readonly used: number; readonly limit: number } {
	return { used: notesUsed(ctx, to), limit: to === "board" ? ctx.options.boardPosts : ctx.options.notesPerAgent };
}

/** The refusal of a spent budget, in the old words. */
export function budgetRefusal(ctx: Ctx, to: string): Refusal | undefined {
	const { used, limit } = noteBudget(ctx, to);
	if (used < limit) return undefined;
	const text = to === "board" ? ctx.prompt("gamemaker/replies/budget-posts", { posts: limit, window: ctx.options.windowMinutes }) : ctx.prompt("gamemaker/replies/budget-notes", { notes: limit, window: ctx.options.windowMinutes });
	return refusalFor(refusalOf(text));
}

/** Records a note under `to` (its budget and repeats) and logs it as sent to `shown` (the board for a tribunal's lines). */
export function recordNote(ctx: Ctx, to: string, text: string, number: number, shown: string = to): void {
	ctx.state.notes.push({ minute: ctx.minute, to, text });
	ctx.emit("gamemaker_note", { to: shown, author: ctx.options.noteAuthor, text, number });
}
