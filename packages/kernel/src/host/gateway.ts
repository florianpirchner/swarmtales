/**
 * The tool gateway: every call runs through the fixed pipeline lock, parse, limit, afford, rule,
 * guard, consult, execute, settle, after (docs/ideas/monorepo.md §3d). Cheap stages first; only
 * `guard` and `consult` may wait for a model (`waits.ts`). A refusal at any stage is one
 * `tool_refused` event; the cost is settled only after `execute` succeeded. Calls are serialised,
 * so a model's wait never lets another call in; the calls mechanics staged meanwhile run right
 * after the call (or the code) that staged them, as actor `script`. Every caller reads its reply
 * through the mechanics' `display` (names for ids); the events keep what happened.
 *
 * Overseers (docs/design/overseer-api.md §1.3): after every call and every drain the gateway runs
 * the overseers that events queued (`after`), still holding the line. While an overseer runs, its
 * own world-tool calls are let in (nested, like staged calls, `admit`); every other caller waits.
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
	/** Runs the overseers that events queued, after a call or a drain (holding the line). */
	readonly after?: () => Promise<void>;
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
	/** Nested calls of the running overseers, one after the other. */
	#nested: Promise<unknown> = Promise.resolve();
	/** The actors whose calls are let in while an overseer runs. */
	readonly #admitted = new Set<Actor>();
	#broken = false;

	constructor(parts: GatewayParts) {
		this.#parts = parts;
	}

	/** `cause` is the event the call answers (the turn it belongs to). The reply is formatted for the caller. */
	call(actor: Actor, tool: string, raw: unknown, cause?: number): Promise<ToolOutcome> {
		if (this.#admitted.has(actor)) return this.#inside(actor, tool, raw, cause);
		return this.#serial(async () => {
			const { outcome } = await this.#run(actor, tool, raw, cause);
			await this.#drain();
			const shown = this.#shown(outcome);
			const after = this.#parts.after;
			if (after !== undefined) await after();
			return shown;
		});
	}

	/** Runs the calls staged outside any call (by jobs, hooks, listeners). */
	settle(): Promise<void> {
		const after = this.#parts.after;
		if (after === undefined) return this.#serial(() => this.#drain());
		return this.#serial(async () => {
			await this.#drain();
			await after();
		});
	}

	/** Runs code holding the line, after the calls before it (the host's overseer slots). */
	exclusive(code: () => Promise<void>): Promise<void> {
		return this.#serial(code);
	}

	/** Lets the calls of `actors` in while `code` runs; the caller holds the line. */
	async admit<T>(actors: readonly Actor[], code: () => Promise<T>): Promise<T> {
		const added = actors.filter((actor) => !this.#admitted.has(actor));
		for (const actor of added) this.#admitted.add(actor);
		try {
			return await code();
		} finally {
			for (const actor of added) this.#admitted.delete(actor);
		}
	}

	/** Runs the staged calls now; the caller holds the line. */
	drain(): Promise<void> {
		return this.#drain();
	}

	/** A nested call of a running overseer: the pipeline and the drain, without waiting for the line it holds already. */
	#inside(actor: Actor, tool: string, raw: unknown, cause: number | undefined): Promise<ToolOutcome> {
		const next = this.#nested.then(async () => {
			if (this.#broken) throw new Error("host: the run failed; no more calls");
			try {
				const { outcome } = await this.#run(actor, tool, raw, cause);
				await this.#drain();
				return this.#shown(outcome);
			} catch (error) {
				this.#broken = true;
				this.#parts.staging.clear();
				this.#parts.failed(error);
				throw error;
			}
		});
		this.#nested = next.catch(() => undefined);
		return next;
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
		// A resident who may not act (suspended mid-block) is answered as the old engine answered a
		// resident with no open tools: the call is locked (docs/design/step18-decisions.md S18-1).
		if (!this.#parts.residents.mayAct(resident) || this.#parts.access.isLocked(resident, name)) return this.#core(TOOL_LOCKED);
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
