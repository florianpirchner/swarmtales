/**
 * Marks: a per-level message allowance (SPEC §7), copied from packages/engine/src/marks.ts
 * (`MarksBook`) as functions over the mechanic's state. Not points, not transferable; the balance
 * resets whenever a resident changes level. A level range may set its own allowance, prices and a
 * refill of `marks` every `everyMinutes`. The refill is booked lazily whenever the allowance is
 * read or spent, in whole intervals, so it needs no clock event; capped at the allowance, the
 * result does not depend on when it is read. A run-wide allowance (`perRun`, Whispers) is one
 * balance for the whole run: it never resets on a new level and never refills.
 */

/** What marks pay for: a message channel, or a receipt shown with `showReceipt`. */
export type Channel = "board" | "group" | "dm" | "receipt";
type Message = "board" | "group" | "dm";

/** Marks a shown receipt costs where marks apply and the story sets no `prices.receipt` (v05). */
export const DEFAULT_RECEIPT_PRICE = 1;

export interface Prices {
	readonly board: number;
	readonly group: number;
	readonly dm: number;
	readonly receipt?: number | undefined;
}

export interface Refill {
	readonly marks: number;
	readonly everyMinutes: number;
}

export interface Range {
	readonly fromLevel: number;
	readonly perLevel?: number | undefined;
	readonly prices?: Prices | undefined;
	readonly refill?: Refill | undefined;
}

export interface Rules {
	readonly fromLevel: number;
	readonly perLevel?: number | undefined;
	readonly perRun?: number | undefined;
	readonly prices: Prices;
	readonly ranges?: readonly Range[] | undefined;
}

export interface Status {
	readonly remaining: number;
	readonly budget: number;
}

/** The marks that apply on one level. */
export interface Terms {
	readonly budget: number;
	readonly prices: Readonly<Record<Channel, number>>;
	/** Marks regained, up to `budget`; absent for none. */
	readonly refill?: Refill;
}

export interface Allowance {
	level: number;
	remaining: number;
	/** Minute up to which the refill is booked (whole intervals); only on levels with a refill. */
	since?: number;
}

export interface MarksState {
	readonly allowances: Map<string, Allowance>;
}

/** What the book reads from the options: the rules and the per-level overrides of the story's levels. */
export interface Book {
	readonly rules: Rules | undefined;
	readonly overrides: ReadonlyMap<number, number>;
	/** The resident's level now (`ProgressionApi.levelOf`); the book keeps no copy. */
	readonly levelOf: (agent: string) => number;
	readonly minute: number;
}

const refills = (refill: Refill | undefined): refill is Refill => refill !== undefined && refill.marks > 0 && refill.everyMinutes > 0;

function rangeOf(book: Book, level: number): Range | undefined {
	return (book.rules?.ranges ?? []).filter((range) => range.fromLevel <= level).at(-1);
}

export function runWide(book: Book): boolean {
	return book.rules?.perRun !== undefined;
}

/** Whether marks apply on `level`. */
export function activeOn(book: Book, level: number): boolean {
	return book.rules !== undefined && level >= book.rules.fromLevel;
}

/** Allowance, prices and refill of `level`: its range's, the base rules' where the range leaves a field out. */
export function termsOn(book: Book, level: number): Terms {
	const rules = book.rules;
	const range = rangeOf(book, level);
	const prices = range?.prices ?? rules?.prices;
	const refill = range?.refill;
	const messages: Readonly<Record<Message, number>> = prices ?? { board: 0, group: 0, dm: 0 };
	return {
		budget: rules?.perRun ?? book.overrides.get(level) ?? range?.perLevel ?? rules?.perLevel ?? 0,
		prices: { board: messages.board, group: messages.group, dm: messages.dm, receipt: prices?.receipt ?? DEFAULT_RECEIPT_PRICE },
		...(refills(refill) ? { refill } : {}),
	};
}

export function priceOf(book: Book, level: number, channel: Channel): number {
	return activeOn(book, level) ? termsOn(book, level).prices[channel] : 0;
}

function allowanceOf(state: MarksState, book: Book, agent: string, level: number): Allowance {
	const terms = termsOn(book, level);
	const refill = terms.refill;
	const now = book.minute;
	const current = state.allowances.get(agent);
	// A run-wide allowance keeps its balance on every level.
	if (current !== undefined && runWide(book)) return current;
	if (current?.level === level) {
		if (refill !== undefined) {
			const since = current.since ?? now;
			const intervals = Math.max(0, Math.floor((now - since) / refill.everyMinutes));
			current.remaining = Math.min(terms.budget, current.remaining + intervals * refill.marks);
			current.since = Math.max(since, since + intervals * refill.everyMinutes);
		}
		return current;
	}
	const fresh: Allowance = { level, remaining: terms.budget, ...(refill === undefined ? {} : { since: now }) };
	state.allowances.set(agent, fresh);
	return fresh;
}

/** Current allowance; `undefined` when marks do not apply on the resident's level. */
export function statusOf(state: MarksState, book: Book, agent: string): Status | undefined {
	const level = book.levelOf(agent);
	if (!activeOn(book, level)) return undefined;
	return { remaining: allowanceOf(state, book, agent, level).remaining, budget: termsOn(book, level).budget };
}

export function canAfford(state: MarksState, book: Book, agent: string, channel: Channel): boolean {
	const status = statusOf(state, book, agent);
	return status === undefined || status.remaining >= priceOf(book, book.levelOf(agent), channel);
}

/** Books the price; returns the new status, or `undefined` when marks do not apply. */
export function spend(state: MarksState, book: Book, agent: string, channel: Channel): Status | undefined {
	const level = book.levelOf(agent);
	if (!activeOn(book, level)) return undefined;
	const price = priceOf(book, level, channel);
	const allowance = allowanceOf(state, book, agent, level);
	allowance.remaining = Math.max(0, allowance.remaining - price);
	return { remaining: allowance.remaining, budget: termsOn(book, level).budget };
}
