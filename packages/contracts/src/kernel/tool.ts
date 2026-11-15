// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Tools: definition, call, result and refusal, as the kernel sees them. */
import type { TSchema } from "typebox";
import type { JsonValue, RandomSource } from "../values.ts";
import type { ActorId } from "./actor.ts";

/**
 * The stages of a tool call, in order. Handlers exist for `lock`, `rule`, `after` and the stage `review`, which
 * stands where `guard` and `consult` stand: a refusal of a review handler is logged at `guard`, one of a tool's own
 * review at `consult`.
 *
 * @public
 */
export const STAGES = ["lock", "parse", "limit", "afford", "rule", "guard", "consult", "execute", "settle", "after"] as const;

/**
 * The name of one stage of a tool call.
 *
 * @public
 */
export type Stage = (typeof STAGES)[number];

/**
 * A canonical tool name: `<package>/<plugin id>/<tool>`, with the full npm name as the package.
 *
 * @public
 */
export type CanonicalTool = string;

/**
 * What a caller may be shown as a tool name; the sdk checks it at load.
 *
 * @public
 */
export const TOOL_NAME_PATTERN = "^[a-zA-Z0-9_-]{1,64}$";

/**
 * A refused tool call.
 *
 * @public
 */
export interface Refusal {
	/** Always false. */
	readonly ok: false;
	/** The refusal code, for example `TOOL_LOCKED` or a code of the refusing plugin; callers read it, so it never changes. */
	readonly code: string;
	/** The text for the caller: why, and what to do instead. A kernel code takes it from `KernelDefinition.replies`. */
	readonly detail?: string;
}

/**
 * A tool call that ran.
 *
 * @public
 */
export interface ToolSuccess {
	/** Always true. */
	readonly ok: true;
	/** The answer the caller reads. */
	readonly reply: string;
	/** True when the call ends the caller's activation; left out otherwise. */
	readonly endsTurn?: boolean;
}

/**
 * The result of a tool call.
 *
 * @public
 */
export type ToolOutcome = ToolSuccess | Refusal;

/**
 * One call as stage handlers see it; `params` is raw at `lock` and checked from `rule` on.
 *
 * @public
 */
export interface ToolCall {
	/** The canonical name of the tool. */
	readonly tool: CanonicalTool;
	/** The bare name as the plugin declared it. */
	readonly name: string;
	/** The name the caller used: the shown name, which a game may set apart from the bare name. */
	readonly as: string;
	/** The id of the plugin that owns the tool. */
	readonly owner: string;
	/** Who calls. */
	readonly actor: ActorId;
	/** The arguments: as the caller sent them at `lock`, converted and checked (the `params` of the prepared call) at `rule` and `after`. */
	readonly params: unknown;
	/** The seq of the call's `tool_called` event. */
	readonly seq: number;
}

/**
 * A reference to a tool by its bare name and its parameters, for typed grants and calls.
 *
 * @public
 */
export interface ToolRef<N extends string = string, P extends TSchema = TSchema> {
	/** The bare name. */
	readonly name: N;
	/** The schema of the arguments. */
	readonly parameters: P;
}

/**
 * A tool as a caller is shown it.
 *
 * @public
 */
export interface ToolSpec {
	/** The shown name. */
	readonly name: string;
	/** The rendered description. */
	readonly description: string;
	/** The schema of the arguments. */
	readonly parameters: TSchema;
}

/**
 * The answer to a question of the stage `review`, as its asker gets it: the answer, or `ok: false` when the answerer
 * failed or gave an answer that does not fit.
 *
 * @public
 */
export type ReviewAnswer =
	| {
			/** The answerer answered, and the answer fits. */
			readonly ok: true;
			/** The answer. */
			readonly answer: unknown;
	  }
	| {
			/** There is no answer to go on. */
			readonly ok: false;
	  };

/**
 * A question of the stage `review`: it is asked before the call runs, answered by an actor that is not the caller,
 * and the lane is held until the answer is in. What a review returns instead of a question: `undefined`, the call
 * goes on and nothing is asked (a skip); a refusal, the call ends.
 *
 * @public
 */
export interface ReviewQuestion {
	/** Who answers: the name an answerer of the run answers to (`KernelPorts.review`). */
	readonly answerer: string;
	/** The question, as data. */
	readonly question: JsonValue;
	/** Decides on the answer; a refusal ends the call at the stage of the review. Left out: the call goes on. */
	decide?(answer: ReviewAnswer): Refusal | undefined;
}

/**
 * Says whether an answerer of the run answers to the name; a review that is told no can refuse or let the call go
 * on without a question.
 *
 * @public
 */
export type Answerable = (answerer: string) => boolean;

/**
 * A tool bound to one checked call: what `KernelTool.prepare` returns. The kernel calls `rule`, then the plugins'
 * `rule` handlers, then the review handlers and `review`, then `execute`, each as its own step.
 *
 * @public
 */
export interface PreparedCall {
	/** The converted and checked arguments. */
	readonly params: unknown;
	/** The tool's own rule; undefined: the call may run. */
	rule(): Refusal | undefined;
	/** The tool's own review, after the review handlers of the plugins; a refusal, or a `decide` that refuses, is logged at stage `consult`. Left out: none. */
	review?(answerable: Answerable): ReviewQuestion | Refusal | undefined;
	/** Runs the call; `answer` is the answer to the tool's own review, left out when it asked nothing. */
	execute(answer?: ReviewAnswer): ToolOutcome;
}

/**
 * A tool with its types erased, as the kernel holds it.
 *
 * @public
 */
export interface KernelTool {
	/** The bare name, as declared. */
	readonly name: string;
	/** The rendered description. */
	readonly description: string;
	/** The schema of the arguments. */
	readonly parameters: TSchema;
	/** True for a read-only look: no step is counted and its answer wakes nobody. */
	readonly free: boolean;
	/** The answerer of the tool's own review (`PreparedCall.review`); left out: it has none. A staged call of a tool with one is refused (`TOOL_NOT_GRANTED` at stage `lock`), since a staged call is not awaited. */
	readonly answerer?: string;
	/** Converts the raw arguments, checks them and binds the call; undefined: they do not fit the schema. */
	prepare(raw: unknown, actor: ActorId): PreparedCall | undefined;
	/** A legal call now, for the fake driver; undefined: none. It must not change state. */
	sample?(actor: ActorId, random: RandomSource): JsonValue | undefined;
}

/**
 * Refusal code of the kernel: no tool has the name the caller used. The string is read by callers.
 *
 * @public
 */
export const TOOL_UNKNOWN = "TOOL_UNKNOWN";

/**
 * Refusal code of the kernel: the tool exists, and the caller's grant does not hold it.
 *
 * @public
 */
export const TOOL_NOT_GRANTED = "TOOL_NOT_GRANTED";

/**
 * Refusal code of the kernel: the tool is locked for the caller.
 *
 * @public
 */
export const TOOL_LOCKED = "TOOL_LOCKED";

/**
 * Refusal code of the kernel: the arguments do not fit the tool's schema.
 *
 * @public
 */
export const INVALID_ARGUMENTS = "INVALID_ARGUMENTS";

/**
 * Refusal code of the kernel: the caller has used its calls of this tick.
 *
 * @public
 */
export const STEP_LIMIT = "STEP_LIMIT";
