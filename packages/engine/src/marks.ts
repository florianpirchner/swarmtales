/**
 * Marks: a per-level message allowance (SPEC §7). Not points, not
 * transferable; the balance resets whenever a competitor changes level.
 * A level range may set its own allowance, prices and a refill of `marks`
 * every `everyMinutes` (`MarksRules.ranges`). The refill is booked lazily
 * whenever the allowance is read or spent, in whole intervals, so it needs no
 * clock event; capped at the allowance, the result does not depend on when it
 * is read.
 *
 * A run-wide allowance (`MarksRules.perRun`, Whispers) is one balance for the
 * whole run instead: it never resets on a new level and never refills.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { LevelDefinition, MarksChannel, MarksRange, MarksRefill, MarksRules, MessageChannel } from "../story/types.ts";

/** Marks a shown receipt costs where marks apply and the story sets no `prices.receipt` (v05). */
export const DEFAULT_RECEIPT_PRICE = 1;

export interface MarksStatus {
	readonly remaining: number;
	readonly budget: number;
}

/** The marks that apply on one level. */
export interface LevelMarksTerms {
	readonly budget: number;
	/** Every channel's price; a shown receipt costs 1 where the story names no price. */
	readonly prices: Readonly<Record<MarksChannel, number>>;
	/** Marks regained, up to `budget`; absent for none. */
	readonly refill?: MarksRefill;
}

interface Allowance {
	level: number;
	remaining: number;
	/** Minute up to which the refill is booked (whole intervals); only on levels with a refill. */
	since?: number;
}

/** Every allowance in use, for run snapshots (SPEC 17); `since` is absent where nothing refills. */
export type MarksSnapshot = readonly { readonly agent: CompetitorId; readonly level: number; readonly remaining: number; readonly since?: number }[];

export class MarksBook {
	readonly #rules: MarksRules | undefined;
	readonly #levels: readonly LevelDefinition[];
	readonly #minute: () => number;
	readonly #allowances = new Map<CompetitorId, Allowance>();

	constructor(rules: MarksRules | undefined, levels: readonly LevelDefinition[], minute: () => number = () => 0) {
		this.#rules = rules;
		this.#levels = levels;
		this.#minute = minute;
	}

	get rules(): MarksRules | undefined {
		return this.#rules;
	}

	/** Whether the allowance is one balance for the whole run (`perRun`). */
	get runWide(): boolean {
		return this.#rules?.perRun !== undefined;
	}

	/** Whether marks apply on `level`. */
	activeOn(level: number): boolean {
		return this.#rules !== undefined && level >= this.#rules.fromLevel;
	}

	budgetOn(level: number): number {
		return this.termsOn(level).budget;
	}

	/** Allowance, prices and refill of `level`: its range's, the base rules' where the range leaves a field out. */
	termsOn(level: number): LevelMarksTerms {
		const rules = this.#rules;
		const range = this.#rangeOf(level);
		const override = this.#levels.find((entry) => entry.number === level)?.marks?.perLevel;
		const prices = range?.prices ?? rules?.prices;
		const refill = range?.refill;
		const messages: Readonly<Record<MessageChannel, number>> = prices ?? { board: 0, group: 0, dm: 0 };
		return {
			budget: rules?.perRun ?? override ?? range?.perLevel ?? rules?.perLevel ?? 0,
			prices: { board: messages.board, group: messages.group, dm: messages.dm, receipt: prices?.receipt ?? DEFAULT_RECEIPT_PRICE },
			...(refills(refill) ? { refill } : {}),
		};
	}

	priceOf(level: number, channel: MarksChannel): number {
		return this.activeOn(level) ? this.termsOn(level).prices[channel] : 0;
	}

	/** Current allowance; `undefined` when marks do not apply on `level`. */
	status(agent: CompetitorId, level: number): MarksStatus | undefined {
		if (!this.activeOn(level)) return undefined;
		return { remaining: this.#allowance(agent, level).remaining, budget: this.budgetOn(level) };
	}

	canAfford(agent: CompetitorId, level: number, channel: MarksChannel): boolean {
		const status = this.status(agent, level);
		return status === undefined || status.remaining >= this.priceOf(level, channel);
	}

	/** Books the price; returns the new status, or `undefined` when nothing was charged. */
	spend(agent: CompetitorId, level: number, channel: MarksChannel): MarksStatus | undefined {
		if (!this.activeOn(level)) return undefined;
		const price = this.priceOf(level, channel);
		const allowance = this.#allowance(agent, level);
		allowance.remaining = Math.max(0, allowance.remaining - price);
		return { remaining: allowance.remaining, budget: this.budgetOn(level) };
	}

	snapshot(): MarksSnapshot {
		return [...this.#allowances].map(([agent, allowance]) => ({
			agent,
			level: allowance.level,
			remaining: allowance.remaining,
			...(allowance.since === undefined ? {} : { since: allowance.since }),
		}));
	}

	restore(state: MarksSnapshot): void {
		this.#allowances.clear();
		for (const entry of state) {
			this.#allowances.set(entry.agent, { level: entry.level, remaining: entry.remaining, ...(entry.since === undefined ? {} : { since: entry.since }) });
		}
	}

	#rangeOf(level: number): MarksRange | undefined {
		return (this.#rules?.ranges ?? []).filter((range) => range.fromLevel <= level).at(-1);
	}

	#allowance(agent: CompetitorId, level: number): Allowance {
		const terms = this.termsOn(level);
		const refill = terms.refill;
		const now = this.#minute();
		const current = this.#allowances.get(agent);
		// A run-wide allowance keeps its balance on every level.
		if (current !== undefined && this.runWide) return current;
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
		this.#allowances.set(agent, fresh);
		return fresh;
	}
}

/** Whether a range's refill gives anything back. */
function refills(refill: MarksRefill | undefined): refill is MarksRefill {
	return refill !== undefined && refill.marks > 0 && refill.everyMinutes > 0;
}
