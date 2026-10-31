/**
 * Tool guards (SPEC 20, docs/ideas/monorepo.md §3d): a preHook in the tool
 * gateway. Before a guarded tool runs (and after its own cheap checks), every
 * rule of the story that names the tool checks the call's text: first the
 * city's own check (a run of the author's secrets in the text, or in its
 * code-like forms, blocks at once without a model), then the guard's judge.
 * The secrets are only what the author legitimately knows: its own
 * fragments and what it sent or received by DM, never a whole password, so
 * the guard is no oracle. A blocked call never runs, so nothing is posted or
 * charged, and the city's check gives one reason whatever matched. A judge
 * that fails or answers nothing usable lets the call through (fail open), so
 * a run never stalls on its guard. Every verdict is logged
 * (`guard_verdict`). Only residents' tool calls pass the gateway; the city's
 * own posts are never guarded.
 */
import type { CompetitorId } from "../core/ids.ts";
import type { ArenaEvent } from "../engine/events.ts";
import { carriesRun } from "../engine/secrets.ts";
import type { GuardJudge, GuardSecret } from "../interpret/guard.ts";
import { GUARDABLE_TOOLS, type GuardableTool, type GuardRule, type GuardsSpec } from "../story/types.ts";
import { text } from "../prompts/library.ts";
import type { ToolName } from "./catalog.ts";

/** The error code of a blocked call. */
export const GUARD_BLOCKED = "GUARD_BLOCKED";

/** The city's own check says the same whatever it matched, so a block teaches nothing about any secret. */
export const CHECK_REASON = text("replies/guard-check");

export type GuardVerdictEvent = Extract<ArenaEvent, { readonly type: "guard_verdict" }>;

export type GuardDecision = { readonly allowed: true } | { readonly allowed: false; readonly rule: string; readonly reason: string };

export interface GuardPorts {
	readonly spec: GuardsSpec;
	/** The guard's model; without one only the city's own check runs (offline runs, no key). */
	readonly judge?: GuardJudge;
	/**
	 * What `agent` legitimately knows that the city keeps from the others: its
	 * own fragments, and the runs of `minRun` or more password characters in
	 * DMs it sent or received. Never a whole password.
	 */
	readonly secretsOf: (agent: CompetitorId, minRun: number) => readonly GuardSecret[];
	readonly emit: (event: GuardVerdictEvent) => void;
}

function isGuardable(tool: ToolName): tool is GuardableTool {
	return Object.hasOwn(GUARDABLE_TOOLS, tool);
}

/** The text a guardable tool's parameters carry, if any. */
export function guardedText(tool: ToolName, params: unknown): string | undefined {
	if (!isGuardable(tool) || typeof params !== "object" || params === null) return undefined;
	const key = GUARDABLE_TOOLS[tool];
	const value: unknown = Reflect.get(params, key);
	return typeof value === "string" ? value : undefined;
}

/** The first secret of which `text` carries `minRun` characters in a row (as written, or in a code-like form), if any. */
export function leakedRun(text: string, secrets: readonly GuardSecret[], minRun: number): GuardSecret | undefined {
	return secrets.find((secret) => carriesRun(text, secret.value, minRun));
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

	/**
	 * The run length of the first rule with secrets that guards board posts:
	 * a receipt shown on the board must not carry such a run of a fragment
	 * either (SPEC 20). Undefined when no rule keeps fragments off the board.
	 */
	boardMinRun(): number | undefined {
		return this.#rulesFor("postBoard").find((rule) => rule.secrets !== undefined)?.secrets?.minRun;
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
		const secrets = rule.secrets === undefined ? [] : this.#ports.secretsOf(agent, rule.secrets.minRun);
		if (rule.secrets !== undefined && leakedRun(text, secrets, rule.secrets.minRun) !== undefined) return verdict(false, CHECK_REASON, "check");
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
