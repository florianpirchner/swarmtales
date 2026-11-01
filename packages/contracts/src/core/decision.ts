/**
 * The decision gate (docs/design/overseer-api.md §3): a mechanic proposes an outcome
 * (`ctx.decide`), the names that hold the right may amend it until a deadline (the core tool
 * `amendDecision`), and the proposal that stands then commits. Nobody holds the right, or the
 * window is 0: the commit runs at once, inside `decide`, and nothing is logged.
 */
import { Type, type Static, type TSchema } from "typebox";
import type { GrantName } from "./values.ts";

/** A mechanic's decision kinds: kind (`verdict`) to the schema of its proposal. */
export type DecisionSchemas = Readonly<Record<string, TSchema>>;

/** The core tool every holder calls. */
export const DECISION_TOOL = "amendDecision";

/** The tools the core itself defines (owner `core`); the human's own arrive with the human hand. */
export type CoreTool = typeof DECISION_TOOL | "instruct" | "pause" | "resume" | "step";

/** How long `decide` keeps a decision open, and a narrower schema for this one decision. */
export interface DecideOptions {
	/** Minutes until the deadline; 0 commits at once. */
	readonly window: number;
	/** Narrows the kind's schema ("only these residents, at most N"); stored as it is (plain JSON). */
	readonly schema?: TSchema;
}

/** `committed`: the commit ran inside `decide`; `open`: the id (the seq of `decision_proposed`). */
export type DecisionOutcome = { readonly committed: true } | { readonly open: number };

/** What the commit learns about how its proposal came to stand. */
export interface Settlement {
	/** The decision's id; absent when it committed at once. */
	readonly decision?: number;
	/** Whether an amendment changed the proposal. */
	readonly changed: boolean;
	/** The grant name whose amendment stood. */
	readonly by?: string;
	readonly reason?: string;
}

/** An open decision as mechanics and overseers see it. */
export interface OpenDecision {
	readonly id: number;
	/** `<mechanic>.<kind>`. */
	readonly kind: string;
	readonly owner: string;
	/** The proposal standing now (the priority rule applied to the amendments so far). */
	readonly proposal: unknown;
	readonly deadline: number;
	readonly holders: readonly string[];
}

export interface DecisionsView {
	/** Open decisions in the order they were opened, of one full kind (`court.verdict`) or all. */
	pending(kind?: string): readonly OpenDecision[];
}

/** A story's narrowing of one kind: who holds it (each must be granted `amendDecision`) and its window. */
export interface DecisionPolicy<N extends string = never> {
	readonly holders?: readonly GrantName<N>[];
	/** Replaces the window the mechanic asks for. */
	readonly window?: number;
}

/** Keyed by full kind (`court.verdict`). */
export type DecisionPolicies<N extends string = never> = Partial<Readonly<Record<string, DecisionPolicy<N>>>>;

/** The parameters of `amendDecision`. */
export const AmendDecisionParams = Type.Object({
	decision: Type.Integer({ description: "The id of the open decision, as `decision_proposed` names it" }),
	proposal: Type.Unknown({ description: "The whole proposal that should stand instead, in the decision's schema" }),
	reason: Type.String({ description: "Why; logged and shown in the report", maxLength: 500 }),
});

export type AmendDecisionInput = Static<typeof AmendDecisionParams>;

/** An open decision in the host's snapshot, written only while one is open. */
export const DecisionSnapshotSchema = Type.Object({
	id: Type.Integer({ minimum: 1 }),
	kind: Type.String(),
	owner: Type.String(),
	commit: Type.String(),
	proposal: Type.Unknown(),
	schema: Type.Optional(Type.Unknown()),
	opened: Type.Integer({ minimum: 0 }),
	deadline: Type.Integer({ minimum: 0 }),
	holders: Type.Array(Type.String()),
	amendments: Type.Array(Type.Object({ by: Type.String(), seq: Type.Integer({ minimum: 1 }), proposal: Type.Unknown(), reason: Type.String() })),
});

export type DecisionSnapshot = Static<typeof DecisionSnapshotSchema>;
