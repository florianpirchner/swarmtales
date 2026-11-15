// SPDX-License-Identifier: Apache-2.0
/**
 * The hooks and the stage handlers of one mechanic instance, bound to its context and turned into the kernel's
 * forms. A hook that takes a resident runs only for an actor of that kind and answers with bare ids; a stage
 * handler sees the call under the tool's bare name.
 */
import type { ActorId, Answerable, InputLine, Ordered, PluginHooks, Refusal, ReviewQuestion, RunEnd, StageHandlers, ToolCall, ToolOutcome } from "@swarmtales/contracts";
import { actorOf, contextFor, residentOf } from "./context.ts";
import type { MechanicContext, MechanicShape } from "./context-types.ts";
import type { InstanceParts } from "./parts.ts";
import type { HookSlot, MechanicHooks, MechanicPipeline, MechanicReview, StageCall } from "./types.ts";

function isList<F>(slot: HookSlot<F>): slot is readonly (F | Ordered<F>)[] {
	return Array.isArray(slot);
}

function isOrdered<F>(entry: F | Ordered<F>): entry is Ordered<F> {
	return typeof entry === "object" && entry !== null && "run" in entry;
}

// A hook slot as the kernel's registrations, each bound by `bound`; `after` is kept.
function registrations<F, G>(slot: HookSlot<F> | undefined, bound: (run: F) => G): readonly Ordered<G>[] {
	if (slot === undefined) return [];
	return (isList(slot) ? slot : [slot]).map((entry) => {
		if (!isOrdered(entry)) return { run: bound(entry) };
		return entry.after === undefined ? { run: bound(entry.run) } : { run: bound(entry.run), after: entry.after };
	});
}

/**
 * Binds the lifecycle hooks of a mechanic to its context.
 *
 * @param parts - The parts of the instance.
 * @param hooks - The hooks of the body; undefined: none.
 * @returns The kernel's hooks. `news` and `toAct` are set only when the mechanic has them.
 *
 * @public
 */
export function bindHooks<M extends MechanicShape>(parts: InstanceParts<M>, hooks: MechanicHooks<M> | undefined): PluginHooks {
	const ctx: MechanicContext<M> = contextFor(parts);
	const { news, toAct, ...slots } = hooks ?? {};
	const plain = (run: (ctx: MechanicContext<M>) => void) => (): void => {
		run(ctx);
	};
	const forResident = (run: (resident: string, ctx: MechanicContext<M>) => void) => (actor: ActorId): void => {
		const resident = residentOf(actor);
		if (resident !== undefined) run(resident, ctx);
	};
	return {
		runStarted: registrations(slots.runStarted, plain),
		tickStarted: registrations(slots.tickStarted, plain),
		inputs: registrations(slots.turnInputs, (run) => (actor: ActorId): readonly InputLine[] => {
			const resident = residentOf(actor);
			return resident === undefined ? [] : run(resident, ctx);
		}),
		activationOpened: registrations(slots.activationOpened, forResident),
		activationClosed: registrations(slots.activationClosed, forResident),
		tickEnded: registrations(slots.tickEnded, plain),
		runEnded: registrations(slots.runEnded, (run) => (end: RunEnd): void => {
			run(end, ctx);
		}),
		...(news === undefined
			? {}
			: {
					news(actor: ActorId): boolean {
						const resident = residentOf(actor);
						return resident !== undefined && news(resident, ctx);
					},
				}),
		...(toAct === undefined ? {} : { toAct: (): readonly ActorId[] => toAct(ctx).map(actorOf) }),
	};
}

/**
 * Binds a review of a mechanic to one call, in the kernel's form: the question carries the answerer and `decide`.
 *
 * @param review - The review of a tool or of the pipeline.
 * @param input - What the review gets: the checked arguments of a tool's own review, the call for one in the pipeline.
 * @param ctx - The context.
 * @param answerable - Whether an answerer of the run answers to a name.
 * @returns The question, a refusal, or undefined (a skip).
 *
 * @public
 */
export function bindReview<Input, Ctx>(review: MechanicReview<Input, Ctx>, input: Input, ctx: Ctx, answerable: Answerable): ReviewQuestion | Refusal | undefined {
	const asked = review.ask(input, ctx, answerable(review.answerer));
	return asked === undefined || "ok" in asked ? asked : { answerer: review.answerer, question: asked.question, decide: (answer) => review.decide?.(answer, input, ctx) };
}

// A call as the author of a stage handler sees it: `tool` is the bare name.
function viewOf(call: ToolCall): StageCall {
	return { tool: call.name, canonical: call.tool, owner: call.owner, actor: call.actor, resident: residentOf(call.actor), params: call.params, seq: call.seq };
}

/**
 * Binds the pipeline handlers of a mechanic to its context.
 *
 * @param parts - The parts of the instance.
 * @param pipeline - The pipeline of the body; undefined: none.
 * @returns The kernel's stage handlers; a stage the mechanic does not handle is left out.
 *
 * @public
 */
export function bindStages<M extends MechanicShape>(parts: InstanceParts<M>, pipeline: MechanicPipeline<M> | undefined): StageHandlers {
	if (pipeline === undefined) return {};
	const ctx: MechanicContext<M> = contextFor(parts);
	return {
		...("lock" in pipeline ? { lock: (call: ToolCall) => pipeline.lock?.(viewOf(call), ctx) } : {}),
		...("rule" in pipeline ? { rule: (call: ToolCall) => pipeline.rule?.(viewOf(call), ctx) } : {}),
		...("review" in pipeline ? { review: (call: ToolCall, answerable: Answerable) => (pipeline.review === undefined ? undefined : bindReview(pipeline.review, viewOf(call), ctx, answerable)) } : {}),
		...("after" in pipeline
			? {
					after(call: ToolCall, outcome: ToolOutcome): void {
						pipeline.after?.(viewOf(call), outcome, ctx);
					},
				}
			: {}),
	};
}
