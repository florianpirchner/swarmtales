/**
 * The two stages that may wait for a model: `guard` (the story's soft rule, checked by the guard
 * model with the secrets mechanics contribute) and `consult` (a tool's question to a role, a judge
 * for example). Both log what they asked and what came back; both record the model's cost with the
 * referee; the guard fails open, a failed consult reaches `execute` as `{ ok: false }`.
 */
import type { Actor, GuardedSecret, GuardModel, GuardPolicy, MechanicInstance, PreparedCall, Refusal, RoleCaller, RoleReply } from "@swarmtales/contracts";
import { refuse } from "./define.ts";
import { residentOf } from "./access.ts";
import type { EventBus, Frame } from "./log.ts";
import type { Consultant } from "./overseers.ts";
import type { Referee } from "./referee.ts";

export const GUARD_BLOCKED = "GUARD_BLOCKED";
/** Reply ids of the guard's own reasons (`replies/core/...`). */
export const GUARD_NONE = "GUARD_NONE";
export const GUARD_FAILED = "GUARD_FAILED";

export interface WaitParts {
	readonly bus: EventBus;
	/** In load order. */
	readonly instances: readonly MechanicInstance[];
	readonly referee: Referee;
	readonly guard: GuardModel | undefined;
	readonly roles: Readonly<Record<string, RoleCaller | undefined>>;
	/** An overseer with a consult trigger under the role's name (docs/design/overseer-api.md §1.4), when the app has no caller for it. */
	readonly consultant?: (role: string) => Consultant | undefined;
	readonly reply: (code: string) => string | undefined;
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function costOf(usage: readonly { readonly costUsd: number }[]): number {
	return usage.reduce((sum, entry) => sum + (Number.isFinite(entry.costUsd) && entry.costUsd > 0 ? entry.costUsd : 0), 0);
}

/**
 * Stage `guard`, for residents' calls of a tool with a guard policy and a guarded text. With
 * `secrets`, the mechanics' check without a model runs first; then the model, asked with the
 * secrets. Fails open: a model that errs lets the call pass and says so in the verdict.
 */
export async function guardStage(parts: WaitParts, policy: GuardPolicy, prepared: PreparedCall, actor: Actor, tool: string, chain: Frame): Promise<Refusal | undefined> {
	const { bus, instances } = parts;
	const resident = residentOf(actor);
	const text = prepared.guardText();
	if (resident === undefined || text === undefined) return undefined;
	const inChain = <T>(code: () => T): T => bus.run(chain, code);
	const rule = policy.id ?? policy.rule;
	const verdict = (allowed: boolean, reason: string, by: "check" | "model" | "none", error?: string): Refusal | undefined => {
		inChain(() => bus.emit("core", "guard_verdict", { tool, rule, allowed, reason, by, ...(error === undefined ? {} : { error }) }));
		return allowed ? undefined : refuse(GUARD_BLOCKED, reason);
	};
	const minRun = policy.secrets?.minRun;
	const secrets: readonly GuardedSecret[] = minRun === undefined ? [] : instances.flatMap((instance) => inChain(() => instance.guardSecrets(resident, minRun)));
	if (minRun !== undefined) {
		for (const instance of instances) {
			const leak = inChain(() => instance.guardLeak(text, secrets, minRun));
			if (leak !== undefined) return verdict(false, leak, "check");
		}
	}
	const judge = parts.guard;
	if (judge === undefined) return minRun === undefined ? undefined : verdict(true, parts.reply(GUARD_NONE) ?? "no guard model in this run; only the check ran", "none");
	const failed = parts.reply(GUARD_FAILED) ?? "the guard could not decide; let through";
	try {
		const answer = await judge.judge({ resident, tool, rule: policy.rule, text, secrets });
		parts.referee.recordCost(costOf(answer.usage));
		if (!answer.ok) return verdict(true, failed, "model", answer.error);
		return verdict(answer.allowed, answer.reason, "model");
	} catch (error) {
		return verdict(true, failed, "model", message(error));
	}
}

/**
 * Stage `consult`: the tool's `ask` may refuse or skip the role (nothing is asked or logged);
 * otherwise its role is asked (`role_asked`), the
 * call waits for the answer (`role_answered`, with the cost), and `read` checks it for `execute`.
 * A run without that role gives `{ ok: false, reason: "absent" }` and logs nothing.
 */
export async function consultStage(parts: WaitParts, prepared: PreparedCall, actor: Actor, tool: string, chain: Frame): Promise<Refusal | undefined> {
	const consult = prepared.consult;
	if (consult === undefined) return undefined;
	const { bus } = parts;
	const inChain = <T>(code: () => T): T => bus.run(chain, code);
	const asked = inChain(() => consult.ask());
	if ("skipped" in asked) {
		consult.skip(asked.skipped);
		return undefined;
	}
	if (!("question" in asked)) return asked;
	const caller = parts.roles[consult.role];
	const overseer = caller === undefined ? parts.consultant?.(consult.role) : undefined;
	let reply: RoleReply | undefined;
	let settle: ((answered: number) => void) | undefined;
	if (caller !== undefined || overseer !== undefined) {
		inChain(() => bus.emit("core", "role_asked", { role: consult.role, tool, question: asked.question }));
		const question = { role: consult.role, tool, actor, question: asked.question };
		if (overseer !== undefined) {
			// Fails open inside; only the overseer's own code throwing ends the run.
			({ reply, settle } = await overseer.ask(question, chain));
		} else if (caller !== undefined) {
			try {
				reply = await caller.ask(question);
			} catch (error) {
				reply = { ok: false, error: message(error), costUsd: 0 };
			}
		}
		if (reply === undefined) throw new Error(`consult: no reply of ${consult.role}`);
		const costUsd = Number.isFinite(reply.costUsd) && reply.costUsd > 0 ? reply.costUsd : 0;
		parts.referee.recordCost(costUsd);
		const answered = reply.ok ? { role: consult.role, ok: true, answer: reply.answer, costUsd } : { role: consult.role, ok: false, error: reply.error, costUsd };
		const written = inChain(() => bus.emit("core", "role_answered", answered));
		settle?.(written.seq);
	}
	inChain(() => consult.read(reply));
	return undefined;
}
