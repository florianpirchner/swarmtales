/**
 * Marks: a per-level message allowance (SPEC §7). Not points, not
 * transferable; the balance resets whenever a competitor changes level.
 * A level range may set its own allowance, prices and a refill per minute
 * (`MarksRules.ranges`). The refill is booked lazily whenever the allowance is
 * read or spent, so it needs no clock event; capped at the allowance, the
 * result does not depend on when it is read.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { LevelDefinition, MarksRange, MarksRules, MessageChannel } from "../story/types.ts";

export interface MarksStatus {
	readonly remaining: number;
	readonly budget: number;
}

/** The marks that apply on one level. */
export interface LevelMarksTerms {
	readonly budget: number;
	readonly prices: Readonly<Record<MessageChannel, number>>;
	/** Marks regained per minute, up to `budget`; 0 for none. */
	readonly refillPerMinute: number;
}

interface Allowance {
	level: number;
	remaining: number;
	/** Minute up to which the refill is booked; only on levels with a refill. */
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
		return {
			budget: override ?? range?.perLevel ?? rules?.perLevel ?? 0,
			prices: range?.prices ?? rules?.prices ?? { board: 0, group: 0, dm: 0 },
			refillPerMinute: range?.refillPerMinute ?? 0,
		};
	}

	priceOf(level: number, channel: MessageChannel): number {
		return this.activeOn(level) ? this.termsOn(level).prices[channel] : 0;
	}

	/** Current allowance; `undefined` when marks do not apply on `level`. */
	status(agent: CompetitorId, level: number): MarksStatus | undefined {
		if (!this.activeOn(level)) return undefined;
		return { remaining: this.#allowance(agent, level).remaining, budget: this.budgetOn(level) };
	}

	canAfford(agent: CompetitorId, level: number, channel: MessageChannel): boolean {
		const status = this.status(agent, level);
		return status === undefined || status.remaining >= this.priceOf(level, channel);
	}

	/** Books the price; returns the new status, or `undefined` when nothing was charged. */
	spend(agent: CompetitorId, level: number, channel: MessageChannel): MarksStatus | undefined {
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
		const now = this.#minute();
		const current = this.#allowances.get(agent);
		if (current?.level === level) {
			if (terms.refillPerMinute > 0) {
				const since = current.since ?? now;
				current.remaining = Math.min(terms.budget, current.remaining + Math.max(0, now - since) * terms.refillPerMinute);
				current.since = Math.max(since, now);
			}
			return current;
		}
		const fresh: Allowance = { level, remaining: terms.budget, ...(terms.refillPerMinute > 0 ? { since: now } : {}) };
		this.#allowances.set(agent, fresh);
		return fresh;
	}
}
