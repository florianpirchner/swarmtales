/**
 * Tools and the tool pipeline (docs/ideas/monorepo.md §3d). Every call, from a resident, the
 * gamemaker or the script, runs through the same fixed chain of stages; cheap stages come first,
 * and a call is charged only after it executed.
 */
import type { TSchema } from "typebox";
import type { Actor, ResidentId } from "./values.ts";

/**
 * The stages in their fixed order. `parse` (the arguments against the tool's schema) sits between
 * `lock` and `limit`, after the presentation's `resolve`; the paper folded it into the gateway.
 * `consult` asks a role (a judge) and waits for it, after the guard and before `execute`.
 */
export const PIPELINE_STAGES = ["lock", "parse", "limit", "afford", "rule", "guard", "consult", "execute", "settle", "after"] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** A refused or failed call. `code` is a structured code (`TOOL_LOCKED`), `detail` the reply text. */
export interface Refusal {
	readonly ok: false;
	readonly code: string;
	readonly detail?: string;
}

export interface ToolSuccess {
	readonly ok: true;
	/** The text the caller reads. */
	readonly reply: string;
	/**
	 * The call ends the caller's turn (it has nothing more to do until news comes): its answer alone wakes no new step
	 * (`activation: "onNews"`), so no model call is spent on answering "end your turn"; the reply stays in
	 * the context and the next news comes after it. Runtime revision 2.
	 */
	readonly endsTurn?: boolean;
}

export type ToolOutcome = ToolSuccess | Refusal;

/**
 * The window a limit counts in: the current minute, the whole run, aligned windows of `minutes`
 * minutes (`{ minutes: 4 }` counts in minutes 0-3, 4-7, ...), or the time since the last event of a
 * type (`{ resetOn: "<mechanic event>" }` gives "8 per resident between two such events" without
 * the core knowing what the event means).
 */
export type LimitWindow = "minute" | "run" | { readonly minutes: number } | { readonly resetOn: string };

/** At most `max` successful calls per actor and window. */
export interface ToolLimit {
	readonly max: number;
	readonly per: LimitWindow;
	/**
	 * A counter shared with every other limit of the same key: one cap over several tools (messages
	 * and transfers with a note count together). Limits of one key must have the same window; each checks its own `max`.
	 */
	readonly key?: string;
}

/** One call as the pipeline's stage handlers see it; `params` is raw at `lock` and checked from `limit` on. */
export interface ToolCall {
	readonly tool: string;
	/** The mechanic that owns the tool. */
	readonly owner: string;
	readonly actor: Actor;
	/** Set when a resident calls. */
	readonly resident: ResidentId | undefined;
	readonly params: unknown;
	/** The `tool_called` event that opened the call. */
	readonly seq: number;
}

/**
 * A tool's name and parameter schema, declared apart from the mechanic that defines it
 * (`defineTool`), so another mechanic can stage it typed (`ctx.stage(ref, params)`) without a value
 * import of that mechanic. Every `MechanicTool` is one; the loaded tool must use the same schema.
 */
export interface ToolRef<N extends string = string, P extends TSchema = TSchema> {
	readonly name: N;
	readonly parameters: P;
}

/** What an agent runner binds: every granted tool, locked or not, so the request prefix stays stable (P46). */
export interface ToolSpec {
	readonly name: string;
	/** Rendered from the tool's description prompt, or the prompt id when the host has no lookup. */
	readonly description: string;
	readonly parameters: TSchema;
}

/** A program-checkable rule from the story's data (stage `rule`); the expression language (§3a) replaces it. */
export type StoryRule =
	| { readonly kind: "maxLength"; readonly param: string; readonly max: number }
	| { readonly kind: "forbid"; readonly param: string; readonly pattern: string; readonly code: string };

/** A soft rule checked by the guard model (stage `guard`). Only `block` exists so far. */
export interface GuardPolicy {
	/** Names the rule in `guard_verdict`; the rule's text when left out. */
	readonly id?: string;
	readonly rule: string;
	readonly on: "block";
	/**
	 * Keep the author's secrets off the text: mechanics contribute them per resident (`guard`
	 * handlers), their check without a model blocks a run of `minRun` characters, and the model is
	 * asked with the secrets in the question.
	 */
	readonly secrets?: { readonly minRun: number };
}

/** What a story sets per tool. Limits add to the mechanic's own: a story can tighten, never lift. */
export interface ToolPolicy {
	readonly limit?: ToolLimit;
	readonly rules?: readonly StoryRule[];
	readonly guard?: GuardPolicy;
}
