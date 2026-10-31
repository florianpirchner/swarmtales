/**
 * The small vocabulary of the new core (docs/design/mechanic-api.md): who acts, what a value may be,
 * where randomness comes from and how prompts are named. No game words live here.
 */

/** A resident's id, e.g. `A03`. Residents are an id plus attributes that mechanics own. */
export type ResidentId = string;

/** The roles a story grants tools to. Tools are not bound to a role; the story's `grants` decide. */
export type GrantRole = "resident" | "gamemaker" | "script";

export const GRANT_ROLES = ["resident", "gamemaker", "script"] as const satisfies readonly GrantRole[];

/** A resident acting, e.g. `resident:A03`. */
export type ResidentActor = `resident:${ResidentId}`;

/**
 * Who caused something: a resident, the gamemaker role, the script, or the host itself (clock,
 * scheduler, hooks that no actor triggered).
 */
export type Actor = ResidentActor | "gamemaker" | "script" | "host";

/** A value that survives `JSON.stringify` unchanged: what attributes, job data and snapshots hold. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/**
 * Seeded randomness handed out by the host. Mechanics never call `Math.random()`; the host derives
 * every stream from the run seed and the event log, so a replay draws the same numbers.
 */
export interface RandomSource {
	/** Uniform in [0, 1). */
	next(): number;
	/** Integer in [min, max], both inclusive. */
	int(min: number, max: number): number;
	/** One element; throws on an empty list. */
	pick<T>(items: readonly T[]): T;
	/** A shuffled copy. */
	shuffle<T>(items: readonly T[]): T[];
}

/**
 * The prompts a mechanic owns: prompt id (a path under its `prompts/` folder, without `.md`) to the
 * names of its variables. Ids and variables are checked at compile time where the mechanic renders.
 */
export type PromptKeys = Readonly<Record<string, readonly string[]>>;

/** The variables one prompt takes. */
export type PromptVariables<Names extends readonly string[]> = Readonly<Record<Names[number], string | number>>;

/**
 * Finds and renders prompt files. Lookup order: the story's folder, then the owning mechanic's
 * folder, then `library/prompts/`. `declared` is the variable list the owner declared for `id`;
 * the file must declare exactly these. The prompts package implements it (`createPromptLookup`).
 */
export interface PromptLookup {
	render(owner: string, id: string, variables: Readonly<Record<string, string | number>>, declared: readonly string[]): string;
}
