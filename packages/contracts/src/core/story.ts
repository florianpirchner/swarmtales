/**
 * A story for the new core: a list of mechanics with options, the grants per role, tool policies
 * and run limits. Tool names are inferred from the mechanics, so granting or locking a tool whose
 * mechanic is not loaded does not compile. Named `CoreStory` until the old `StoryDefinition` is gone.
 */
import type { CoreTool, DecisionPolicies } from "./decision.ts";
import type { MechanicUse } from "./mechanic.ts";
import type { HumanPolicy, NameOf, OverseerUse } from "./overseer.ts";
import type { ToolPolicy } from "./tools.ts";
import type { TurnPolicy } from "./turns.ts";
import type { GrantName, ResidentId } from "./values.ts";

/** The tool names of a list of mechanics. */
export type ToolOf<Ms extends readonly MechanicUse[]> = NonNullable<Ms[number]["mechanic"]["toolNames"]>;

/** The tools per grant name: the built-ins and the names of the story's overseers (`N`). */
export type Grants<T extends string, N extends string = never> = Partial<Readonly<Record<GrantName<N>, readonly T[]>>>;

/**
 * The story's tool policies, keyed by the grant name they bind and then the tool: a limit or a rule
 * for residents does not touch the gamemaker's variant of the same name. A guard policy binds only
 * residents (the guard covers resident callers), so it is refused under another name.
 */
export type ToolPolicies<T extends string, N extends string = never> = Partial<Readonly<Record<GrantName<N>, Partial<Readonly<Record<T, ToolPolicy>>>>>>;

/** The referee's own limits. The run's length is `minutes`. */
export interface RunLimits {
	/** Tool calls per resident per minute, refused calls included. */
	readonly maxStepsPerMinute?: number;
	/** Stops the run once the recorded model cost reaches it. */
	readonly maxCostUsd?: number;
}

export interface CoreStory<Ms extends readonly MechanicUse[] = readonly MechanicUse[], Os extends readonly OverseerUse[] = readonly OverseerUse[]> {
	readonly id: string;
	readonly seed: number;
	readonly minutes: number;
	/** A count (ids `A01`..) or the ids themselves. */
	readonly residents: number | readonly ResidentId[];
	/** Loaded in the order of their `requires`; ties keep this order. */
	readonly mechanics: Ms;
	/** Model-backed roles under their story names (docs/design/overseer-api.md §1); their names take grants. */
	readonly overseers?: Os;
	readonly grants: Grants<ToolOf<Ms> | CoreTool, NameOf<Os>>;
	/** Tools every resident starts with locked; mechanics unlock them. */
	readonly locked?: readonly ToolOf<Ms>[];
	readonly tools?: ToolPolicies<ToolOf<Ms> | CoreTool, NameOf<Os>>;
	readonly limits?: RunLimits;
	/** Overrides the fields of a mechanic's turn policy; without either, one turn per resident and minute. */
	readonly turns?: TurnPolicy;
	/** Who holds which decision kind, by full kind (§3); without it every name granted `amendDecision` holds every kind. */
	readonly decisions?: DecisionPolicies<NameOf<Os>>;
	/** Overrides the heads' audiences by `<source>.<type>` (§4.1). */
	readonly audiences?: Readonly<Record<string, readonly string[]>>;
	/** What the human may do (§5). */
	readonly human?: HumanPolicy;
}

/** The story as data, for `000-run.json`: mechanics by id with their options. */
export interface CoreStoryData {
	readonly id: string;
	readonly seed: number;
	readonly minutes: number;
	readonly residents: number | readonly ResidentId[];
	readonly mechanics: readonly { readonly id: string; readonly options: unknown }[];
	readonly overseers?: readonly { readonly name: string; readonly id: string; readonly options: unknown }[];
	readonly grants: Grants<string, string>;
	readonly locked?: readonly string[];
	readonly tools?: ToolPolicies<string, string>;
	readonly limits?: RunLimits;
	readonly decisions?: DecisionPolicies<string>;
	readonly audiences?: Readonly<Record<string, readonly string[]>>;
	readonly human?: HumanPolicy;
}
