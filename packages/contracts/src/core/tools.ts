/**
 * Tools and the tool pipeline (docs/ideas/monorepo.md §3d). Every call, from a resident, the
 * gamemaker or the script, runs through the same fixed chain of stages; cheap stages come first,
 * and a call is charged only after it executed.
 */
import type { TSchema } from "typebox";
import type { Actor, ResidentId } from "./values.ts";

/**
 * The stages in their fixed order. `parse` (the arguments against the tool's schema) sits between
 * `lock` and `limit`; the paper folded it into the gateway.
 */
export const PIPELINE_STAGES = ["lock", "parse", "limit", "afford", "rule", "guard", "execute", "settle", "after"] as const;

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
}

export type ToolOutcome = ToolSuccess | Refusal;

/**
 * The window a limit counts in: the current minute, the whole run, or the time since the last
 * event of a type (`{ resetOn: "door_opened" }` gives "8 per resident between two door openings"
 * without the core knowing what a door is).
 */
export type LimitWindow = "minute" | "run" | { readonly resetOn: string };

/** At most `max` successful calls per actor and window. */
export interface ToolLimit {
	readonly max: number;
	readonly per: LimitWindow;
}

/** One call as the pipeline's stage handlers see it; `params` is already checked by `parse`. */
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
	readonly rule: string;
	readonly on: "block";
}

/** What a story sets per tool. Limits add to the mechanic's own: a story can tighten, never lift. */
export interface ToolPolicy {
	readonly limit?: ToolLimit;
	readonly rules?: readonly StoryRule[];
	readonly guard?: GuardPolicy;
}
