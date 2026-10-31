/**
 * Sums the usage events of a run; written to `usage.json`. A resumed run
 * (SPEC 17) keeps the prefix's spend apart from its own: the budget counts
 * only its own, the file and the console show both.
 */
import type { CompetitorId } from "@swarmtales/kernel";
import type { EventSink, RecordedEvent } from "@swarmtales/engine";

export interface UsageTotals {
	readonly requests: number;
	readonly input: number;
	readonly output: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
	readonly costUsd: number;
}

export interface AgentUsage extends UsageTotals {
	readonly agent: CompetitorId;
}

/** Totals and per-agent sums of one part of the spend. */
export interface UsageReport {
	readonly totals: UsageTotals;
	readonly perAgent: readonly AgentUsage[];
}

const EMPTY: UsageTotals = { requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 };

export class UsageCollector implements EventSink {
	/** Spend of the snapshot's prefix, replayed by a resumed run. */
	readonly #prefix = new Map<CompetitorId, UsageTotals>();
	/** Spend of this run's own model calls. */
	readonly #own = new Map<CompetitorId, UsageTotals>();

	record(event: RecordedEvent): void {
		add(this.#own, event);
	}

	replay(event: RecordedEvent): void {
		add(this.#prefix, event);
	}

	/** Cumulative: the prefix and this run. */
	perAgent(): readonly AgentUsage[] {
		const agents = [...new Set([...this.#prefix.keys(), ...this.#own.keys()])];
		return sorted(agents.map((agent) => ({ agent, ...sum(this.#prefix.get(agent) ?? EMPTY, this.#own.get(agent) ?? EMPTY) })));
	}

	/** Cumulative: the prefix and this run. */
	totals(): UsageTotals {
		return this.perAgent().reduce<UsageTotals>(sum, EMPTY);
	}

	/** What the snapshot's prefix spent; nothing for a run that is not resumed. */
	prefix(): UsageReport {
		return report(this.#prefix);
	}

	/** What this run spent itself; the budget counts this. */
	own(): UsageReport {
		return report(this.#own);
	}

	/** The content of `usage.json`: cumulative, then split into the prefix and this run. */
	toJSON(): UsageReport & { readonly prefix: UsageReport; readonly own: UsageReport } {
		return { totals: this.totals(), perAgent: this.perAgent(), prefix: this.prefix(), own: this.own() };
	}

	summary(): string {
		const own = this.own().totals;
		const prefix = this.prefix().totals;
		const cost =
			prefix.requests === 0
				? `cost: ${own.costUsd.toFixed(4)} USD`
				: `cost: ${own.costUsd.toFixed(4)} USD this run + ${prefix.costUsd.toFixed(4)} USD before the snapshot = ${this.totals().costUsd.toFixed(4)} USD`;
		return (
			`${cost} · ${own.requests} requests · ` +
			`in ${formatTokens(own.input)} / out ${formatTokens(own.output)} · cache ${formatTokens(own.cacheRead)}`
		);
	}
}

function add(into: Map<CompetitorId, UsageTotals>, event: RecordedEvent): void {
	if (event.type !== "usage") return;
	into.set(event.agent, sum(into.get(event.agent) ?? EMPTY, { ...event, requests: 1 }));
}

function sum(a: UsageTotals, b: UsageTotals): UsageTotals {
	return {
		requests: a.requests + b.requests,
		input: a.input + b.input,
		output: a.output + b.output,
		cacheRead: a.cacheRead + b.cacheRead,
		cacheWrite: a.cacheWrite + b.cacheWrite,
		costUsd: a.costUsd + b.costUsd,
	};
}

function report(perAgent: ReadonlyMap<CompetitorId, UsageTotals>): UsageReport {
	const entries = sorted([...perAgent.entries()].map(([agent, totals]) => ({ agent, ...totals })));
	return { totals: entries.reduce<UsageTotals>(sum, EMPTY), perAgent: entries };
}

function sorted(entries: readonly AgentUsage[]): readonly AgentUsage[] {
	return [...entries].sort((a, b) => a.agent.localeCompare(b.agent));
}

function formatTokens(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
	return String(value);
}
