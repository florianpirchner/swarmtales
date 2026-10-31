/**
 * The rules of resident names, copied from packages/engine/src/names.ts (`NameBook`) as functions
 * over the mechanic's state: what a name may look like, who may still choose, how a text shows
 * names instead of ids and how a name or an id resolves to a resident.
 */

export type NameError = "NAME_INVALID" | "NAME_ID" | "NAME_RESERVED" | "NAME_TAKEN" | "NAME_CHOSEN" | "NAME_CLOSED";

export interface NameEntry {
	readonly agent: string;
	readonly name: string;
	readonly fallback: boolean;
}

/** The names of a run; `settled` once the choice closed and every resident has a name. */
export interface NamesState {
	readonly ids: readonly string[];
	readonly entries: Map<string, NameEntry>;
	settled: boolean;
	/** False in a run that plays without names (a resumed run whose snapshot kept none): nothing is named, shown or chosen. */
	readonly active: boolean;
}

/** 3 to 16 characters: letters, digits and hyphens, starting with a letter. */
const NAME = /^[A-Za-z][A-Za-z0-9-]{2,15}$/;
/** A resident ID, e.g. `A07` (any case). */
const ID = /^a\d+$/i;
/** City handles a name must not imitate: a tribunal group (`GT1`) or a receipt (`R-0042`). */
const HANDLE = /^(?:gt\d+|r-?\d+)$/i;
/** A resident ID inside a text: not part of a longer word, a code or a piece reference like `L8-counter-A02`. */
const ID_IN_TEXT = /(?<![A-Za-z0-9-])A\d{2,}(?![A-Za-z0-9-])/g;
/** The city's own announcement keeps the ID it renames. */
const ANNOUNCED = " is now called ";

export function nameOf(state: NamesState, agent: string): string | undefined {
	return state.entries.get(agent)?.name;
}

function holderOf(state: NamesState, name: string): string | undefined {
	return [...state.entries.values()].find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.agent;
}

/** Whether the choice is open: the city offers `chooseName`. */
export function isOpen(state: NamesState, untilMinute: number, minute: number): boolean {
	return state.active && !state.settled && minute < untilMinute;
}

/** Whether `agent` may still choose: it has no name and the choice is open. */
export function canChoose(state: NamesState, untilMinute: number, minute: number, agent: string): boolean {
	return isOpen(state, untilMinute, minute) && !state.entries.has(agent) && state.ids.includes(agent);
}

/** Why `name` is not available to anyone; undefined when it is. */
export function refusal(state: NamesState, reserved: ReadonlySet<string>, name: string): { readonly error: NameError; readonly detail: string } | undefined {
	if (!NAME.test(name)) return { error: "NAME_INVALID", detail: "3 to 16 characters: letters, digits and hyphens, starting with a letter" };
	if (HANDLE.test(name)) return { error: "NAME_ID", detail: "a name must not look like a group or receipt of the city, such as GT1 or R-0042" };
	if (name.split("-").some((part) => ID.test(part))) return { error: "NAME_ID", detail: "a name must not look like a resident ID (the letter A followed by digits, alone or as a part between hyphens)" };
	if (reserved.has(name.toLowerCase())) return { error: "NAME_RESERVED", detail: `${name} belongs to the city or its cast` };
	const holder = holderOf(state, name);
	if (holder !== undefined) return { error: "NAME_TAKEN", detail: `another resident is called ${nameOf(state, holder) ?? name}` };
	return undefined;
}

/** The resident a name or an ID stands for (any case); undefined when nobody is called so. */
export function resolve(state: NamesState, nameOrId: string): string | undefined {
	if (!state.active) return undefined;
	const trimmed = nameOrId.trim().toLowerCase();
	return holderOf(state, trimmed) ?? state.ids.find((id) => id.toLowerCase() === trimmed);
}

/** `text` as residents read it: every resident ID replaced by its name; `keep` spares a token that is something else as well. */
export function display(state: NamesState, text: string, keep: (token: string) => boolean): string {
	if (state.entries.size === 0) return text;
	return text.replace(ID_IN_TEXT, (token: string, offset: number) => {
		const name = nameOf(state, token);
		if (name === undefined || keep(token) || text.startsWith(ANNOUNCED, offset + token.length)) return token;
		return name;
	});
}

/** `Mira (A03)` for reports; the bare ID without a name. */
export function label(state: NamesState, agent: string): string {
	const name = nameOf(state, agent);
	return name === undefined ? agent : `${name} (${agent})`;
}
