/**
 * The referee: the run's hard limits plus the limits mechanics and the story register. It always
 * wins: its tool limits run before any mechanic code (stage `limit`), and its run limits are checked
 * after every minute whatever the hooks did. Limits only add up, so a story can tighten a mechanic's
 * limit but never lift it.
 */
import type { Actor, GrantRole, LimitWindow, Refusal, RunLimit, RunLimits, ToolLimit } from "@swarmtales/contracts";
import { roleOf } from "./access.ts";
import { refuse } from "./define.ts";

export const STEP_LIMIT = "STEP_LIMIT";
export const TOOL_LIMIT = "TOOL_LIMIT";

interface CountedLimit {
	readonly key: string;
	readonly max: number;
	readonly per: LimitWindow;
	/** Only callers in these roles count (a tool variant's own limit). */
	readonly serves?: readonly GrantRole[];
}

export interface RefereeState {
	readonly counts: Readonly<Record<string, number>>;
	readonly costUsd: number;
}

export interface Breach {
	readonly limit: string;
	readonly reason: string;
}

export class Referee {
	readonly #run: RunLimits;
	readonly #tools = new Map<string, CountedLimit[]>();
	readonly #checks: RunLimit[] = [];
	readonly #counts = new Map<string, number>();
	#costUsd = 0;

	constructor(run: RunLimits = {}) {
		this.#run = run;
	}

	/** A tool limit, from the tool itself (only for the roles its variant serves) or the story's policy. */
	addToolLimit(tool: string, limit: ToolLimit, serves?: readonly GrantRole[]): void {
		if (!Number.isInteger(limit.max) || limit.max < 0) throw new RangeError(`referee: invalid limit for ${tool}`);
		const list = this.#tools.get(tool) ?? [];
		list.push({ key: `${tool}#${String(list.length)}`, max: limit.max, per: limit.per, ...(serves === undefined ? {} : { serves }) });
		this.#tools.set(tool, list);
	}

	#limitsFor(tool: string, actor: Actor): readonly CountedLimit[] {
		const role = roleOf(actor);
		return (this.#tools.get(tool) ?? []).filter((limit) => limit.serves === undefined || (role !== undefined && limit.serves.includes(role)));
	}

	addRunLimits(limits: readonly RunLimit[]): void {
		this.#checks.push(...limits);
	}

	/**
	 * A resident's every call is a step, counted as the call opens, before `lock`: calls to locked
	 * or unknown tools and calls with bad arguments count too. Over `maxStepsPerMinute` the call is
	 * refused at stage `limit` before any other check.
	 */
	step(actor: Actor, detail: (code: string) => string | undefined): Refusal | undefined {
		const max = this.#run.maxStepsPerMinute;
		if (max === undefined || !actor.startsWith("resident:")) return undefined;
		const key = `steps|${actor}`;
		const steps = (this.#counts.get(key) ?? 0) + 1;
		this.#counts.set(key, steps);
		return steps > max ? refuse(STEP_LIMIT, detail(STEP_LIMIT)) : undefined;
	}

	/** Stage `limit`: every limit of the tool for this caller. */
	admit(tool: string, actor: Actor, detail: (code: string) => string | undefined): Refusal | undefined {
		const hit = this.#limitsFor(tool, actor).find((limit) => (this.#counts.get(`${limit.key}|${actor}`) ?? 0) >= limit.max);
		return hit === undefined ? undefined : refuse(TOOL_LIMIT, detail(TOOL_LIMIT));
	}

	/** Stage `settle`: a successful call counts against the tool's limits. */
	count(tool: string, actor: Actor): void {
		for (const limit of this.#limitsFor(tool, actor)) {
			const key = `${limit.key}|${actor}`;
			this.#counts.set(key, (this.#counts.get(key) ?? 0) + 1);
		}
	}

	minuteStarted(): void {
		this.#reset((per) => per === "minute");
		for (const key of [...this.#counts.keys()]) if (key.startsWith("steps|")) this.#counts.delete(key);
	}

	/** Every event passes here, for windows that end with an event type. */
	observe(type: string): void {
		this.#reset((per) => typeof per === "object" && per.resetOn === type);
	}

	recordCost(usd: number): void {
		if (!Number.isFinite(usd) || usd < 0) throw new RangeError(`referee: invalid cost ${String(usd)}`);
		this.#costUsd += usd;
	}

	/** The first breached run limit: the cost cap, then the mechanics' limits in load order. */
	breach(): Breach | undefined {
		const cap = this.#run.maxCostUsd;
		if (cap !== undefined && this.#costUsd >= cap) return { limit: "core.maxCostUsd", reason: `cost ${this.#costUsd.toFixed(2)} USD reached the cap of ${cap.toFixed(2)} USD` };
		for (const check of this.#checks) {
			const reason = check.check();
			if (reason !== undefined) return { limit: check.id, reason };
		}
		return undefined;
	}

	save(): RefereeState {
		return { counts: Object.fromEntries(this.#counts), costUsd: this.#costUsd };
	}

	load(state: RefereeState): void {
		this.#counts.clear();
		for (const [key, value] of Object.entries(state.counts)) this.#counts.set(key, value);
		this.#costUsd = state.costUsd;
	}

	#reset(matches: (per: LimitWindow) => boolean): void {
		for (const list of this.#tools.values()) {
			for (const limit of list) {
				if (!matches(limit.per)) continue;
				for (const key of [...this.#counts.keys()]) if (key.startsWith(`${limit.key}|`)) this.#counts.delete(key);
			}
		}
	}
}
