// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Marks: a per-level message allowance, carried from the old `mechanics/marks/src/book.ts` (functions over the
 * mechanic's state). Not points, not transferable; the balance resets whenever a resident changes level. A level range
 * may set its own allowance, prices and a refill of `marks` every `everyMinutes`. The refill is booked lazily whenever
 * the allowance is read or spent, in whole intervals, so it needs no job; capped at the allowance, the result does not
 * depend on when it is read. A run-wide allowance (`perRun`, Whispers) is one balance for the whole run: it never
 * resets on a new level and never refills.
 */

/**
 * What marks pay for: a message channel, or a receipt shown with `showReceipt`.
 *
 * @public
 */
export type Channel = "board" | "group" | "dm" | "receipt";
type Message = "board" | "group" | "dm";

/**
 * Marks a shown receipt costs where marks apply and the game sets no `prices.receipt`.
 *
 * @public
 */
export const DEFAULT_RECEIPT_PRICE = 1;

/**
 * Marks per channel.
 *
 * @public
 */
export interface Prices {
	/** A board post. */
	readonly board: number;
	/** A group post. */
	readonly group: number;
	/** A direct message. */
	readonly dm: number;
	/** A shown receipt; {@link DEFAULT_RECEIPT_PRICE} when left out. */
	readonly receipt?: number | undefined;
}

/**
 * Marks regained on a level, up to its allowance.
 *
 * @public
 */
export interface Refill {
	/** Marks that come back. */
	readonly marks: number;
	/** Ticks between two refills. */
	readonly everyMinutes: number;
}

/**
 * A later level range with its own allowance, prices and refill.
 *
 * @public
 */
export interface Range {
	/** The first level of the range. */
	readonly fromLevel: number;
	/** The range's allowance; the base rules' when left out. */
	readonly perLevel?: number | undefined;
	/** The range's prices; the base rules' when left out. */
	readonly prices?: Prices | undefined;
	/** The range's refill; none when left out. */
	readonly refill?: Refill | undefined;
}

/**
 * The game's message allowance.
 *
 * @public
 */
export interface Rules {
	/** The first level marks apply on. */
	readonly fromLevel: number;
	/** The allowance per level. */
	readonly perLevel?: number | undefined;
	/** One allowance for the whole run instead. */
	readonly perRun?: number | undefined;
	/** The prices. */
	readonly prices: Prices;
	/** Later level ranges, ascending. */
	readonly ranges?: readonly Range[] | undefined;
}

/**
 * The marks left and the allowance.
 *
 * @public
 */
export interface Status {
	/** The marks left. */
	readonly remaining: number;
	/** The allowance of the level, or of the run. */
	readonly budget: number;
}

/**
 * The marks that apply on one level.
 *
 * @public
 */
export interface Terms {
	/** The allowance. */
	readonly budget: number;
	/** The price of each channel. */
	readonly prices: Readonly<Record<Channel, number>>;
	/** Marks regained, up to `budget`; absent for none. */
	readonly refill?: Refill;
}

/**
 * One resident's allowance.
 *
 * @public
 */
export interface Allowance {
	/** The level it is the allowance of. */
	level: number;
	/** The marks left. */
	remaining: number;
	/** Tick up to which the refill is booked (whole intervals); only on levels with a refill. */
	since?: number;
}

/**
 * The state of the marks: the allowances, and the level whose task each resident last read.
 *
 * @public
 */
export interface MarksState {
	/** The allowance of each resident that has one. */
	readonly allowances: Map<string, Allowance>;
	/** The level whose task each resident was last shown (the terms go under the task once per level). */
	readonly shown: Map<string, number>;
}

/**
 * What the book reads: the rules, the per-level overrides, the level of a resident and the tick.
 *
 * @public
 */
export interface Book {
	/** The game's rules; marks apply nowhere without them. */
	readonly rules: Rules | undefined;
	/** The allowance of single levels. */
	readonly overrides: ReadonlyMap<number, number>;
	/** The resident's level now (`levelOf` of `progression`); the book keeps no copy. */
	readonly levelOf: (agent: string) => number;
	/** The tick now. */
	readonly tick: number;
}

const refills = (refill: Refill | undefined): refill is Refill => refill !== undefined && refill.marks > 0 && refill.everyMinutes > 0;

function rangeOf(book: Book, level: number): Range | undefined {
	return (book.rules?.ranges ?? []).filter((range) => range.fromLevel <= level).at(-1);
}

/**
 * Whether the allowance is one for the whole run.
 *
 * @param book - The book.
 * @returns True with `perRun`.
 * @public
 */
export function runWide(book: Book): boolean {
	return book.rules?.perRun !== undefined;
}

/**
 * Whether marks apply on `level`.
 *
 * @param book - The book.
 * @param level - The level.
 * @returns True from `rules.fromLevel` on.
 * @public
 */
export function activeOn(book: Book, level: number): boolean {
	return book.rules !== undefined && level >= book.rules.fromLevel;
}

/**
 * Allowance, prices and refill of `level`: its range's, the base rules' where the range leaves a field out.
 *
 * @param book - The book.
 * @param level - The level.
 * @returns The terms.
 * @public
 */
export function termsOn(book: Book, level: number): Terms {
	const range = rangeOf(book, level);
	const refill = range?.refill;
	return { budget: budgetOn(book, level, range), prices: pricesOf(range?.prices ?? book.rules?.prices), ...(refills(refill) ? { refill } : {}) };
}

// The allowance: the run's, else the level's own, else the range's, else the base rules'.
function budgetOn(book: Book, level: number, range: Range | undefined): number {
	const rules = book.rules;
	return rules?.perRun ?? book.overrides.get(level) ?? range?.perLevel ?? rules?.perLevel ?? 0;
}

function pricesOf(prices: Prices | undefined): Readonly<Record<Channel, number>> {
	const messages: Readonly<Record<Message, number>> = prices ?? { board: 0, group: 0, dm: 0 };
	return { board: messages.board, group: messages.group, dm: messages.dm, receipt: prices?.receipt ?? DEFAULT_RECEIPT_PRICE };
}

/**
 * The price of a channel on `level`; 0 where marks do not apply.
 *
 * @param book - The book.
 * @param level - The level.
 * @param channel - The channel.
 * @returns The price.
 * @public
 */
export function priceOf(book: Book, level: number, channel: Channel): number {
	return activeOn(book, level) ? termsOn(book, level).prices[channel] : 0;
}

function allowanceOf(state: MarksState, book: Book, agent: string, level: number): Allowance {
	const terms = termsOn(book, level);
	const refill = terms.refill;
	const now = book.tick;
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

/**
 * The current allowance; books the refill due and a fresh allowance on a new level.
 *
 * @param state - The state.
 * @param book - The book.
 * @param agent - The resident.
 * @returns The status, or `undefined` when marks do not apply on the resident's level.
 * @public
 */
export function statusOf(state: MarksState, book: Book, agent: string): Status | undefined {
	const level = book.levelOf(agent);
	if (!activeOn(book, level)) return undefined;
	return { remaining: allowanceOf(state, book, agent, level).remaining, budget: termsOn(book, level).budget };
}

/**
 * Whether the resident may send on the channel now; true where marks do not apply.
 *
 * @param state - The state.
 * @param book - The book.
 * @param agent - The resident.
 * @param channel - The channel.
 * @returns True when the marks left pay the price.
 * @public
 */
export function canAfford(state: MarksState, book: Book, agent: string, channel: Channel): boolean {
	const status = statusOf(state, book, agent);
	return status === undefined || status.remaining >= priceOf(book, book.levelOf(agent), channel);
}

/**
 * Books the price.
 *
 * @param state - The state.
 * @param book - The book.
 * @param agent - The resident.
 * @param channel - The channel.
 * @returns The new status, or `undefined` when marks do not apply.
 * @public
 */
export function spend(state: MarksState, book: Book, agent: string, channel: Channel): Status | undefined {
	const level = book.levelOf(agent);
	if (!activeOn(book, level)) return undefined;
	const price = priceOf(book, level, channel);
	const allowance = allowanceOf(state, book, agent, level);
	allowance.remaining = Math.max(0, allowance.remaining - price);
	return { remaining: allowance.remaining, budget: termsOn(book, level).budget };
}
