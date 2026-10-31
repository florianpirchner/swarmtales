/**
 * The tool gateway: every call runs through the fixed pipeline lock, parse, limit, afford, rule,
 * guard, execute, settle, after (docs/ideas/monorepo.md §3d). Cheap stages first; only `guard` may
 * wait for a model. A refusal at any stage is one `tool_refused` event; the cost is settled only
 * after `execute` succeeded. Calls are serialised, so a guard's wait never lets another call in.
 */
import type {
	Actor,
	GuardJudge,
	MechanicInstance,
	MechanicTool,
	PipelineStage,
	PreparedCall,
	Refusal,
	StoryRule,
	ToolCall,
	ToolOutcome,
	ToolPolicy,
} from "@swarmtales/contracts";
import { refuse } from "./define.ts";
import { residentOf, roleOf, type AccessControl } from "./access.ts";
import type { EventBus, Frame } from "./log.ts";
import type { Referee } from "./referee.ts";
import type { ResidentRegistry } from "./residents.ts";

export const TOOL_UNKNOWN = "TOOL_UNKNOWN";
export const TOOL_NOT_GRANTED = "TOOL_NOT_GRANTED";
export const TOOL_LOCKED = "TOOL_LOCKED";
export const RESIDENT_INACTIVE = "RESIDENT_INACTIVE";
export const INVALID_ARGUMENTS = "INVALID_ARGUMENTS";
export const TEXT_TOO_LONG = "TEXT_TOO_LONG";
export const GUARD_BLOCKED = "GUARD_BLOCKED";

export interface LoadedTool {
	readonly owner: string;
	readonly tool: MechanicTool;
}

export interface GatewayParts {
	readonly bus: EventBus;
	readonly tools: ReadonlyMap<string, LoadedTool>;
	/** In load order. */
	readonly instances: readonly MechanicInstance[];
	readonly policies: Readonly<Record<string, ToolPolicy | undefined>>;
	readonly access: AccessControl;
	readonly residents: ResidentRegistry;
	readonly referee: Referee;
	readonly guard: GuardJudge | undefined;
	/** The fixed reply text of a core refusal code. */
	readonly reply: (code: string) => string | undefined;
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

export class Gateway {
	readonly #parts: GatewayParts;
	#queue: Promise<unknown> = Promise.resolve();

	constructor(parts: GatewayParts) {
		this.#parts = parts;
	}

	/** `cause` is the event the call answers (the turn it belongs to). */
	call(actor: Actor, tool: string, raw: unknown, cause?: number): Promise<ToolOutcome> {
		const next = this.#queue.then(() => this.#run(actor, tool, raw, cause));
		this.#queue = next.catch(() => undefined);
		return next;
	}

	async #run(actor: Actor, name: string, raw: unknown, cause: number | undefined): Promise<ToolOutcome> {
		const { bus, instances } = this.#parts;
		const opened: Frame = cause === undefined ? { actor } : { actor, cause };
		const called = bus.run(opened, () => bus.emit("core", "tool_called", { tool: name, params: raw }));
		const chain: Frame = { actor, cause: called.seq };
		const inChain = <T>(code: () => T): T => bus.run(chain, code);
		const refused = (stage: PipelineStage, refusal: Refusal): Refusal => {
			const payload = refusal.detail === undefined ? { tool: name, stage, code: refusal.code } : { tool: name, stage, code: refusal.code, detail: refusal.detail };
			inChain(() => bus.emit("core", "tool_refused", payload));
			return refusal;
		};
		const loaded = this.#parts.tools.get(name);
		if (loaded === undefined) return refused("lock", this.#core(TOOL_UNKNOWN));
		const resident = residentOf(actor);
		const locked = this.#lock(actor, name, resident);
		if (locked !== undefined) return refused("lock", locked);
		const call: ToolCall = { tool: name, owner: loaded.owner, actor, resident, params: raw, seq: called.seq };
		for (const instance of instances) {
			const veto = inChain(() => instance.hooks.lock(call));
			if (veto !== undefined) return refused("lock", veto);
		}
		const prepared = inChain(() => loaded.tool.prepare(raw, actor, resident));
		if (prepared === undefined) return refused("parse", this.#core(INVALID_ARGUMENTS));
		const checked: ToolCall = { ...call, params: prepared.params };
		const limited = this.#parts.referee.admit(name, actor, this.#parts.reply);
		if (limited !== undefined) return refused("limit", limited);
		for (const instance of instances) {
			const poor = inChain(() => instance.hooks.afford(checked));
			if (poor !== undefined) return refused("afford", poor);
		}
		const broken = this.#rules(prepared, checked, inChain);
		if (broken !== undefined) return refused("rule", broken);
		const blocked = await this.#guard(prepared, actor, name, chain);
		if (blocked !== undefined) return refused("guard", blocked);
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
		return outcome;
	}

	#core(code: string): Refusal {
		return refuse(code, this.#parts.reply(code));
	}

	#lock(actor: Actor, name: string, resident: string | undefined): Refusal | undefined {
		const role = roleOf(actor);
		if (role === undefined || !this.#parts.access.granted(role, name)) return this.#core(TOOL_NOT_GRANTED);
		if (resident === undefined) return undefined;
		if (!this.#parts.residents.mayAct(resident)) return this.#core(RESIDENT_INACTIVE);
		if (this.#parts.access.isLocked(resident, name)) return this.#core(TOOL_LOCKED);
		return undefined;
	}

	#rules(prepared: PreparedCall, call: ToolCall, inChain: <T>(code: () => T) => T): Refusal | undefined {
		const own = inChain(() => prepared.rule());
		if (own !== undefined) return own;
		for (const rule of this.#parts.policies[call.tool]?.rules ?? []) {
			const broken = storyRule(rule, call.params, this.#parts.reply);
			if (broken !== undefined) return broken;
		}
		for (const instance of this.#parts.instances) {
			const broken = inChain(() => instance.hooks.rule(call));
			if (broken !== undefined) return broken;
		}
		return undefined;
	}

	/** Fails open: a guard that errs lets the call pass and says so in its verdict. */
	async #guard(prepared: PreparedCall, actor: Actor, name: string, chain: Frame): Promise<Refusal | undefined> {
		const policy = this.#parts.policies[name]?.guard;
		const judge = this.#parts.guard;
		if (policy === undefined || judge === undefined) return undefined;
		const text = prepared.guardText();
		if (text === undefined) return undefined;
		const answer = await judge.judge({ agent: residentOf(actor) ?? actor, tool: name, rule: policy.rule, text, secrets: [] });
		const allowed = !answer.ok || answer.allowed;
		const reason = answer.ok ? answer.reason : `guard failed: ${answer.error}`;
		const { bus } = this.#parts;
		bus.run(chain, () => bus.emit("core", "guard_verdict", { tool: name, rule: policy.rule, allowed, reason }));
		return allowed ? undefined : refuse(GUARD_BLOCKED, reason);
	}
}
