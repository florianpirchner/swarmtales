/**
 * The tool gateway: every call runs through the fixed pipeline lock, parse, limit, afford, rule,
 * guard, consult, execute, settle, after (docs/ideas/monorepo.md §3d). Cheap stages first; only
 * `guard` and `consult` may wait for a model (`waits.ts`). A refusal at any stage is one
 * `tool_refused` event; the cost is settled only after `execute` succeeded. Calls are serialised,
 * so a model's wait never lets another call in; the calls mechanics staged meanwhile run right
 * after the call (or the code) that staged them, as actor `script`. Every caller reads its reply
 * through the mechanics' `display` (names for ids); the events keep what happened.
 */
import type { Actor, GrantRole, MechanicInstance, PipelineStage, PreparedCall, Refusal, StoryRule, ToolCall, ToolOutcome, ToolPolicies, ToolPolicy } from "@swarmtales/contracts";
import { convertArguments } from "./arguments.ts";
import { refuse } from "./define.ts";
import { residentOf, type AccessControl } from "./access.ts";
import { toolFor, type ToolCatalog } from "./catalog.ts";
import type { Names } from "./names.ts";
import type { Frame } from "./log.ts";
import type { ResidentRegistry } from "./residents.ts";
import { stagedData, type StagingQueue } from "./staging.ts";
import { consultStage, guardStage, type WaitParts } from "./waits.ts";

export const TOOL_UNKNOWN = "TOOL_UNKNOWN";
export const TOOL_NOT_GRANTED = "TOOL_NOT_GRANTED";
export const TOOL_LOCKED = "TOOL_LOCKED";
export const RESIDENT_INACTIVE = "RESIDENT_INACTIVE";
export const INVALID_ARGUMENTS = "INVALID_ARGUMENTS";
export const TEXT_TOO_LONG = "TEXT_TOO_LONG";
export { GUARD_BLOCKED } from "./waits.ts";

export interface GatewayParts extends WaitParts {
	/** By name, one entry per role-disjoint variant. */
	readonly tools: ToolCatalog;
	readonly instanceOf: (id: string) => MechanicInstance | undefined;
	/** The story's policies by role, then tool. */
	readonly policies: ToolPolicies<string, string>;
	readonly access: AccessControl;
	readonly residents: ResidentRegistry;
	readonly names: Names;
	readonly staging: StagingQueue;
	/** Told once when code of a call throws; the gateway takes no call after that. */
	readonly failed: (error: unknown) => void;
}

function field(params: unknown, name: string): unknown {
	if (typeof params !== "object" || params === null) return undefined;
	const found: unknown = Object.entries(params).find(([key]) => key === name)?.[1];
	return found;
}

function storyRule(rule: StoryRule, params: unknown, reply: (code: string) => string | undefined): Refusal | undefined {
	const value = field(params, rule.param);
	if (typeof value !== "string") return undefined;
	switch (rule.kind) {
		case "maxLength":
			return value.length > rule.max ? refuse(TEXT_TOO_LONG, reply(TEXT_TOO_LONG)) : undefined;
		case "forbid":
			return new RegExp(rule.pattern, "u").test(value) ? refuse(rule.code) : undefined;
		default:
			return rule satisfies never;
	}
}

interface Ran {
	readonly outcome: ToolOutcome;
	/** The `tool_called` event that opened the call. */
	readonly seq: number;
}

export class Gateway {
	readonly #parts: GatewayParts;
	#queue: Promise<unknown> = Promise.resolve();
	#broken = false;

	constructor(parts: GatewayParts) {
		this.#parts = parts;
	}

	/** `cause` is the event the call answers (the turn it belongs to). The reply is formatted for the caller. */
	call(actor: Actor, tool: string, raw: unknown, cause?: number): Promise<ToolOutcome> {
		return this.#serial(async () => {
			const { outcome } = await this.#run(actor, tool, raw, cause);
			await this.#drain();
			return this.#shown(outcome);
		});
	}

	/** Runs the calls staged outside any call (by jobs, hooks, listeners). */
	settle(): Promise<void> {
		return this.#serial(() => this.#drain());
	}

	/** A text as a caller reads it: every mechanic's `display`, in load order. */
	display(text: string): string {
		const { bus, instances } = this.#parts;
		return instances.reduce((shown, instance) => bus.run({ actor: "host" }, () => instance.display(shown)), text);
	}

	/**
	 * Runs one call (or drain) after the previous one. When its code throws, what it staged is
	 * dropped, the host is told (it ends the run with reason `error`) and every later call is refused.
	 */
	#serial<T>(code: () => Promise<T>): Promise<T> {
		const next = this.#queue.then(async () => {
			if (this.#broken) throw new Error("host: the run failed; no more calls");
			try {
				return await code();
			} catch (error) {
				this.#broken = true;
				this.#parts.staging.clear();
				this.#parts.failed(error);
				throw error;
			}
		});
		this.#queue = next.catch(() => undefined);
		return next;
	}

	#shown(outcome: ToolOutcome): ToolOutcome {
		if (outcome.ok) return { ok: true, reply: this.display(outcome.reply) };
		return outcome.detail === undefined ? outcome : { ok: false, code: outcome.code, detail: this.display(outcome.detail) };
	}

	async #drain(): Promise<void> {
		const { staging, bus } = this.#parts;
		for (let staged = staging.take(); staged !== undefined; staged = staging.take()) {
			// Depth first: what this call and its `then` job stage runs before the calls queued behind it.
			const behind = staging.takeAll();
			const { outcome, seq } = await this.#run("script", staged.tool, staged.params, staged.cause);
			const then = staged.then;
			if (then !== undefined) {
				const instance = this.#parts.instanceOf(staged.owner);
				if (instance === undefined) throw new Error(`staging: unknown mechanic "${staged.owner}"`);
				bus.run({ actor: "script", cause: seq }, () => {
					instance.runJob(then, stagedData(outcome));
				});
			}
			staging.restore(behind);
		}
	}

	async #run(actor: Actor, name: string, raw: unknown, cause: number | undefined): Promise<Ran> {
		const { bus, instances } = this.#parts;
		const opened: Frame = cause === undefined ? { actor } : { actor, cause };
		const called = bus.run(opened, () => bus.emit("core", "tool_called", { tool: name, params: raw }));
		const chain: Frame = { actor, cause: called.seq };
		const inChain = <T>(code: () => T): T => bus.run(chain, code);
		const refused = (stage: PipelineStage, refusal: Refusal): Ran => {
			const payload = refusal.detail === undefined ? { tool: name, stage, code: refusal.code } : { tool: name, stage, code: refusal.code, detail: refusal.detail };
			inChain(() => bus.emit("core", "tool_refused", payload));
			return { outcome: refusal, seq: called.seq };
		};
		const overStep = this.#parts.referee.step(actor, this.#parts.reply);
		if (overStep !== undefined) return refused("limit", overStep);
		if (!this.#parts.tools.has(name)) return refused("lock", this.#core(TOOL_UNKNOWN));
		const caller = this.#parts.names.callerOf(actor);
		const loaded = caller === undefined ? undefined : toolFor(this.#parts.tools, name, caller);
		if (caller === undefined || loaded === undefined) return refused("lock", this.#core(TOOL_NOT_GRANTED));
		const role = caller.name;
		const resident = residentOf(actor);
		const locked = this.#lock(role, name, resident);
		if (locked !== undefined) return refused("lock", locked);
		const call: ToolCall = { tool: name, owner: loaded.owner, actor, resident, params: raw, seq: called.seq };
		for (const instance of instances) {
			const veto = inChain(() => instance.hooks.lock(call));
			if (veto !== undefined) return refused("lock", veto);
		}
		// The old runtime converted the arguments before the tool resolved names (R2-D6).
		const converted = convertArguments(loaded.tool.parameters, raw);
		const resolved = instances.reduce((params, instance) => inChain(() => instance.resolve(name, actor, params)), converted);
		const prepared = inChain(() => loaded.tool.prepare(resolved, actor, resident));
		// The bare code, as the old tool wrapper answered (no detail).
		if (prepared === undefined) return refused("parse", refuse(INVALID_ARGUMENTS));
		const checked: ToolCall = { ...call, params: prepared.params };
		const limited = this.#parts.referee.admit(name, actor, this.#parts.reply);
		if (limited !== undefined) return refused("limit", limited);
		for (const instance of instances) {
			const poor = inChain(() => instance.hooks.afford(checked));
			if (poor !== undefined) return refused("afford", poor);
		}
		const own = this.#policy(role, name);
		const broken = this.#rules(prepared, checked, own, inChain);
		if (broken !== undefined) return refused("rule", broken);
		const policy = own?.guard;
		const blocked = policy === undefined ? undefined : await guardStage(this.#parts, policy, prepared, actor, name, chain);
		if (blocked !== undefined) return refused("guard", blocked);
		const declined = await consultStage(this.#parts, prepared, actor, name, chain);
		if (declined !== undefined) return refused("consult", declined);
		const outcome = inChain(() => prepared.execute());
		if (!outcome.ok) refused("execute", outcome);
		else {
			this.#parts.referee.count(name, actor);
			for (const instance of instances) {
				inChain(() => {
					instance.hooks.settle(checked, outcome);
				});
			}
		}
		for (const instance of instances) {
			inChain(() => {
				instance.hooks.after(checked, outcome);
			});
		}
		return { outcome, seq: called.seq };
	}

	#core(code: string): Refusal {
		return refuse(code, this.#parts.reply(code));
	}

	#lock(role: GrantRole, name: string, resident: string | undefined): Refusal | undefined {
		if (!this.#parts.access.granted(role, name)) return this.#core(TOOL_NOT_GRANTED);
		if (resident === undefined) return undefined;
		if (!this.#parts.residents.mayAct(resident)) return this.#core(RESIDENT_INACTIVE);
		if (this.#parts.access.isLocked(resident, name)) return this.#core(TOOL_LOCKED);
		return undefined;
	}

	/** The story's policy of a tool for the caller's grant name. */
	#policy(role: GrantRole, name: string): ToolPolicy | undefined {
		return this.#parts.policies[role]?.[name];
	}

	#rules(prepared: PreparedCall, call: ToolCall, policy: ToolPolicy | undefined, inChain: <T>(code: () => T) => T): Refusal | undefined {
		const own = inChain(() => prepared.rule());
		if (own !== undefined) return own;
		for (const rule of policy?.rules ?? []) {
			const broken = storyRule(rule, call.params, this.#parts.reply);
			if (broken !== undefined) return broken;
		}
		for (const instance of this.#parts.instances) {
			const broken = inChain(() => instance.hooks.rule(call));
			if (broken !== undefined) return broken;
		}
		return undefined;
	}
}
