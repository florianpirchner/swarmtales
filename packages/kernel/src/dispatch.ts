// SPDX-License-Identifier: Apache-2.0
/**
 * Part 4, dispatch: one lane and the fixed pipeline of a tool call. Every call is `tool_called`, then the stages
 * `limit`, `lock`, `parse`, `rule`, `execute` and `after`, then `tool_result`; a refusal at any stage is one
 * `tool_refused` and ends the call. Each step of plugin code runs in its own outermost frame, so the listeners of
 * what one step emitted run before the next step. A throw breaks the lane for good.
 */
import { INVALID_ARGUMENTS, STEP_LIMIT, SwtError, TOOL_LOCKED, TOOL_NOT_GRANTED, TOOL_UNKNOWN, type ActorId, type PreparedCall, type Refusal, type Stage, type Submission, type ToolCall, type ToolOutcome } from "@swarmtales/contracts";
import { guarded, kernelFailed } from "./errors.ts";
import type { Dispatch, DispatchParts, Frame, LoadedTool, PartFactories } from "./parts.ts";

/** What dispatch remembers of each actor's last call. */
interface Memory {
	/** The actors whose last call named a free tool of their grant. */
	readonly looked: Set<ActorId>;
	/** The actors whose last call succeeded and ended their activation. */
	readonly ended: Set<ActorId>;
	/** The seq of the answer to each actor's last finished call. */
	readonly answers: Map<ActorId, number>;
}

/** One call on its way through the stages. */
interface Running {
	readonly call: Submission;
	/** The seq of its `tool_called`. */
	readonly seq: number;
	/** Runs one step in the frame of the call. */
	inChain<T>(code: () => T): T;
}

/** A refusal with the stage that is reported for it. */
interface Stop {
	readonly stage: Stage;
	readonly refusal: Refusal;
}

/** A call that passed every check: what the handlers see, and the bound tool. */
interface Ready {
	readonly checked: ToolCall;
	readonly prepared: PreparedCall;
	readonly owner: string;
}

function frameOf(actor: ActorId, causedBy: number | undefined, found: LoadedTool | undefined): Frame {
	return { actor, ...(causedBy === undefined ? {} : { causedBy }), ...(found === undefined ? {} : { tool: found.canonical }) };
}

// The tool the shown name stands for in the caller's grant.
function resolve(parts: DispatchParts, actor: ActorId, as: string): LoadedTool | undefined {
	const grant = parts.actors.spec(actor)?.grant;
	if (grant === undefined) return undefined;
	return parts.loaded.byShownName.get(as)?.find((entry) => parts.access.granted(grant, entry.canonical));
}

function kernelRefusal(parts: DispatchParts, code: string): Refusal {
	const detail = parts.definition.replies[code];
	return detail === undefined ? { ok: false, code } : { ok: false, code, detail };
}

// The kernel's own checks of the stage `lock`.
function locked(parts: DispatchParts, call: Submission, found: LoadedTool | undefined): Refusal | undefined {
	if ((parts.loaded.byShownName.get(call.as)?.length ?? 0) === 0) return kernelRefusal(parts, TOOL_UNKNOWN);
	if (found === undefined) return kernelRefusal(parts, TOOL_NOT_GRANTED);
	if (!parts.actors.mayAct(call.actor) || parts.access.isLocked(call.actor, found.canonical)) return kernelRefusal(parts, TOOL_LOCKED);
	return undefined;
}

// The first refusal of the handlers of one stage, each in its own frame, in load order.
function vetoOf(parts: DispatchParts, stage: "lock" | "rule", run: Running, call: ToolCall): Refusal | undefined {
	for (const handler of parts.loaded.stages(stage)) {
		const veto = run.inChain(() => handler(call));
		if (veto !== undefined) return veto;
	}
	return undefined;
}

// The stages `parse` and `rule` of a call that passed `lock`.
function bind(parts: DispatchParts, run: Running, found: LoadedTool, call: ToolCall): Ready | Stop {
	const { owner, tool } = found;
	const prepared = run.inChain(() => guarded(owner, () => tool.prepare(run.call.params, call.actor)));
	// The bare code, without a detail.
	if (prepared === undefined) return { stage: "parse", refusal: { ok: false, code: INVALID_ARGUMENTS } };
	const checked: ToolCall = { ...call, params: prepared.params };
	const broken = run.inChain(() => guarded(owner, () => prepared.rule())) ?? vetoOf(parts, "rule", run, checked);
	return broken === undefined ? { checked, prepared, owner } : { stage: "rule", refusal: broken };
}

// The stages before `execute`. The step is counted before the name is looked at, so the same calls are refused with the same codes as before.
function checks(parts: DispatchParts, run: Running, found: LoadedTool | undefined): Ready | Stop {
	const { actor, as, params } = run.call;
	if (found?.tool.free !== true && !parts.steps.step(actor)) return { stage: "limit", refusal: kernelRefusal(parts, STEP_LIMIT) };
	const refusal = locked(parts, run.call, found);
	if (refusal !== undefined || found === undefined) return { stage: "lock", refusal: refusal ?? kernelRefusal(parts, TOOL_NOT_GRANTED) };
	const call: ToolCall = { tool: found.canonical, name: found.tool.name, as, owner: found.owner, actor, params, seq: run.seq };
	const veto = vetoOf(parts, "lock", run, call);
	return veto === undefined ? bind(parts, run, found, call) : { stage: "lock", refusal: veto };
}

// Runs one call through the pipeline.
function runCall(parts: DispatchParts, memory: Memory, call: Submission): ToolOutcome {
	const { log } = parts;
	const { actor, as } = call;
	const found = resolve(parts, actor, as);
	const basis = call.basis ?? log.length;
	const called = log.run(frameOf(actor, call.causedBy, found), () => log.emit("kernel", "tool_called", { as, params: call.params ?? null }, { basis }));
	const chain = frameOf(actor, called.seq, found);
	const run: Running = { call, seq: called.seq, inChain: (code) => log.run(chain, code) };
	if (found?.tool.free === true) memory.looked.add(actor);
	else memory.looked.delete(actor);
	memory.ended.delete(actor);
	const refused = (stage: Stage, refusal: Refusal): Refusal => {
		const payload = { as, stage, code: refusal.code, ...(refusal.detail === undefined ? {} : { detail: refusal.detail }) };
		memory.answers.set(actor, run.inChain(() => log.emit("kernel", "tool_refused", payload)).seq);
		return refusal;
	};
	const ready = checks(parts, run, found);
	if ("stage" in ready) return refused(ready.stage, ready.refusal);
	const outcome = run.inChain(() => guarded(ready.owner, () => ready.prepared.execute()));
	if (!outcome.ok) refused("execute", outcome);
	for (const handler of parts.loaded.stages("after")) {
		run.inChain(() => {
			handler(ready.checked, outcome);
		});
	}
	if (!outcome.ok) return outcome;
	const ends = outcome.endsTurn === true;
	const payload = { as, reply: outcome.reply, ...(ends ? { endsTurn: true } : {}) };
	memory.answers.set(actor, run.inChain(() => log.emit("kernel", "tool_result", payload)).seq);
	if (ends) memory.ended.add(actor);
	return outcome;
}

// The answer to "no lock handler refuses": the handlers get a call without arguments and must not emit.
function probeOf(parts: DispatchParts): (actor: ActorId, tool: string) => boolean {
	return (actor, tool) => {
		const found = parts.loaded.tools.get(tool);
		if (found === undefined) return false;
		const before = parts.log.length;
		const call: ToolCall = { tool, name: found.tool.name, as: parts.definition.names[tool] ?? found.tool.name, owner: found.owner, actor, params: undefined, seq: before };
		const open = parts.loaded.stages("lock").every((handler) => handler(call) === undefined);
		if (parts.log.length !== before) throw new TypeError(`a lock handler must not emit while it is only asked whether ${tool} is open for ${actor}`);
		return open;
	};
}

/**
 * Creates the lane and the pipeline of tool calls, and gives `access` its probe.
 *
 * @param parts - The log, the actors, the access, the step counter, what was loaded, and whom to tell a failure.
 * @returns The dispatch: `submit`, `quietEnd`, `answerSeq` and `broken`.
 * @throws SwtError Never from the factory. A promise of `submit` rejects with `SWT-R003` when plugin code of the
 * call threw (or with what kernel code threw), and with `SWT-R001`, the first failure as its cause, for every call
 * after that.
 */
export const createDispatch = ((parts: DispatchParts): Dispatch => {
	const memory: Memory = { looked: new Set(), ended: new Set(), answers: new Map() };
	let queue: Promise<unknown> = Promise.resolve();
	let failure: { readonly error: unknown } | undefined;
	parts.access.setProbe(probeOf(parts));
	return {
		submit(call) {
			const next = queue.then(() => {
				if (failure !== undefined) throw new SwtError(kernelFailed(), { cause: failure.error });
				try {
					return runCall(parts, memory, call);
				} catch (error) {
					failure = { error };
					parts.fail(error);
					throw error;
				}
			});
			queue = next.catch(() => undefined);
			return next;
		},
		quietEnd: (actor) => memory.looked.has(actor) || memory.ended.has(actor),
		answerSeq: (actor) => memory.answers.get(actor),
		get broken() {
			return failure !== undefined;
		},
	};
}) satisfies PartFactories["createDispatch"];
