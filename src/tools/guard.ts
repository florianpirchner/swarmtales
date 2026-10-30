/**
 * Tool guards (SPEC 20, docs/ideas/monorepo.md §3d): a preHook in the tool
 * gateway. Before a guarded tool runs, every rule of the story that names the
 * tool checks the call's text: first the city's own check (a run of the
 * author's secrets in the text blocks at once, without a model), then the
 * guard's judge. A blocked call never runs, so nothing is posted or charged.
 * A judge that fails or answers nothing usable lets the call through (fail
 * open), so a run never stalls on its guard. Every verdict is logged
 * (`guard_verdict`). Only residents' tool calls pass the gateway; the city's
 * own posts are never guarded.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { ArenaEvent } from "../engine/events.ts";
import type { GuardJudge, GuardSecret } from "../interpret/guard.ts";
import { GUARDABLE_TOOLS, type GuardableTool, type GuardRule, type GuardsSpec } from "../story/types.ts";
import type { ToolName } from "./catalog.ts";

/** The error code of a blocked call. */
export const GUARD_BLOCKED = "GUARD_BLOCKED";

export type GuardVerdictEvent = Extract<ArenaEvent, { readonly type: "guard_verdict" }>;

export type GuardDecision = { readonly allowed: true } | { readonly allowed: false; readonly rule: string; readonly reason: string };

export interface GuardPorts {
	readonly spec: GuardsSpec;
	/** The guard's model; without one only the city's own check runs (offline runs, no key). */
	readonly judge?: GuardJudge;
	/** What `agent` holds that the city keeps from the others: its fragments, the passwords it plays for. */
	readonly secretsOf: (agent: CompetitorId) => readonly GuardSecret[];
	readonly emit: (event: GuardVerdictEvent) => void;
}

function isGuardable(tool: ToolName): tool is GuardableTool {
	return Object.hasOwn(GUARDABLE_TOOLS, tool);
}

/** The text a guardable tool's parameters carry, if any. */
export function guardedText(tool: ToolName, params: unknown): string | undefined {
	if (!isGuardable(tool) || typeof params !== "object" || params === null) return undefined;
	const key = GUARDABLE_TOOLS[tool];
	if (!(key in params)) return undefined;
	const value = params[key];
	return typeof value === "string" ? value : undefined;
}

/** The first run of `minRun` characters of a secret that `text` carries (case-sensitive), if any. */
export function leakedRun(text: string, secrets: readonly GuardSecret[], minRun: number): GuardSecret | undefined {
	for (const secret of secrets) {
		for (let start = 0; start + minRun <= secret.value.length; start++) {
			if (text.includes(secret.value.slice(start, start + minRun))) return secret;
		}
	}
	return undefined;
}

export class ToolGuard {
	readonly #ports: GuardPorts;

	constructor(ports: GuardPorts) {
		this.#ports = ports;
	}

	/** Whether some rule guards `tool`; the gateway asks the guard only then. */
	guards(tool: ToolName): boolean {
		return isGuardable(tool) && this.#rulesFor(tool).length > 0;
	}

	/** Checks `text` against every rule for `tool`, in order; the first rule it breaks blocks it. */
	async review(agent: CompetitorId, tool: ToolName, text: string): Promise<GuardDecision> {
		if (!isGuardable(tool)) return { allowed: true };
		for (const rule of this.#rulesFor(tool)) {
			const decision = await this.#check(agent, tool, rule, text);
			if (!decision.allowed) return decision;
		}
		return { allowed: true };
	}

	#rulesFor(tool: GuardableTool): readonly GuardRule[] {
		return this.#ports.spec.rules.filter((rule) => rule.tools.includes(tool));
	}

	async #check(agent: CompetitorId, tool: GuardableTool, rule: GuardRule, text: string): Promise<GuardDecision> {
		const verdict = (allowed: boolean, reason: string, by: GuardVerdictEvent["by"], error?: string): GuardDecision => {
			this.#ports.emit({ type: "guard_verdict", tool, agent, rule: rule.id, allowed, reason, by, ...(error === undefined ? {} : { error }) });
			return allowed ? { allowed: true } : { allowed: false, rule: rule.id, reason };
		};
		const secrets = rule.secrets === undefined ? [] : this.#ports.secretsOf(agent);
		if (rule.secrets !== undefined) {
			const leaked = leakedRun(text, secrets, rule.secrets.minRun);
			if (leaked !== undefined) return verdict(false, `the text carries part of ${leaked.label}`, "check");
		}
		const judge = this.#ports.judge;
		if (judge === undefined) return verdict(true, "no guard model in this run; only the city's own check ran", "none");
		try {
			const answer = await judge.judge({ agent, tool, rule: rule.rule, text, secrets });
			if (!answer.ok) return verdict(true, "the guard could not decide; let through", "model", answer.error);
			return verdict(answer.allowed, answer.reason, "model");
		} catch (error) {
			return verdict(true, "the guard could not decide; let through", "model", error instanceof Error ? error.message : String(error));
		}
	}
}
