/**
 * A story for the new core: a list of mechanics with options, the grants per role, tool policies
 * and run limits. Tool names are inferred from the mechanics, so granting or locking a tool whose
 * mechanic is not loaded does not compile. Named `CoreStory` until the old `StoryDefinition` is gone.
 */
import type { MechanicUse } from "./mechanic.ts";
import type { ToolPolicy } from "./tools.ts";
import type { GrantRole, ResidentId } from "./values.ts";

/** The tool names of a list of mechanics. */
export type ToolOf<Ms extends readonly MechanicUse[]> = NonNullable<Ms[number]["mechanic"]["toolNames"]>;

export type Grants<T extends string> = Partial<Readonly<Record<GrantRole, readonly T[]>>>;

/** The referee's own limits. The run's length is `minutes`. */
export interface RunLimits {
	/** Tool calls per resident per minute, refused calls included. */
	readonly maxStepsPerMinute?: number;
	/** Stops the run once the recorded model cost reaches it. */
	readonly maxCostUsd?: number;
}

export interface CoreStory<Ms extends readonly MechanicUse[] = readonly MechanicUse[]> {
	readonly id: string;
	readonly seed: number;
	readonly minutes: number;
	/** A count (ids `A01`..) or the ids themselves. */
	readonly residents: number | readonly ResidentId[];
	/** Loaded in the order of their `requires`; ties keep this order. */
	readonly mechanics: Ms;
	readonly grants: Grants<ToolOf<Ms>>;
	/** Tools every resident starts with locked; mechanics unlock them. */
	readonly locked?: readonly ToolOf<Ms>[];
	readonly tools?: Partial<Readonly<Record<ToolOf<Ms>, ToolPolicy>>>;
	readonly limits?: RunLimits;
}

/** The story as data, for `000-run.json`: mechanics by id with their options. */
export interface CoreStoryData {
	readonly id: string;
	readonly seed: number;
	readonly minutes: number;
	readonly residents: number | readonly ResidentId[];
	readonly mechanics: readonly { readonly id: string; readonly options: unknown }[];
	readonly grants: Grants<string>;
	readonly locked?: readonly string[];
	readonly tools?: Readonly<Record<string, ToolPolicy | undefined>>;
	readonly limits?: RunLimits;
}
