// SPDX-License-Identifier: Apache-2.0
/**
 * The game types: the builder form of a game (`defineGame`), and what game resolution takes and gives. A game is
 * plain data; the builder form differs from the data form only in naming its mechanics by typed uses instead of ids.
 */
import type { GameData, JsonValue, KernelDefinition, PromptLookup, RecordSource, SchedulerDefinition } from "@swarmtales/contracts";
import type { MechanicDefinition } from "../mechanic/types.ts";
import type { GameFamily } from "./family.ts";

/**
 * One mechanic in a game, with its options: what calling a mechanic definition returns.
 *
 * @public
 */
export interface MechanicUse<D extends MechanicDefinition = MechanicDefinition> {
	/** The definition. */
	readonly mechanic: D;
	/** The options as the game wrote them; the mechanic's schema checks them at load. */
	readonly options: unknown;
	/** Bare tool name to the name a model sees, for a clash of two mechanics. */
	readonly as?: Readonly<Record<string, string>>;
}

/**
 * The bare tool names of a list of mechanics.
 *
 * @public
 */
export type ToolOf<Ms extends readonly MechanicUse[]> = NonNullable<Ms[number]["mechanic"]["toolNames"]>;

/**
 * A change of the tool list that is derived from the mechanics, for one grant name.
 *
 * @public
 */
export interface GrantTweak<T extends string = string> {
	/** The tools taken out of the derived list. */
	readonly drop?: readonly T[];
	/** The tools appended to the derived list. */
	readonly add?: readonly T[];
}

/**
 * The builder form of a game: `GameData` with the mechanics as typed uses instead of ids. `schema: 1` may be left out.
 *
 * @public
 */
export interface Game<Ms extends readonly MechanicUse[] = readonly MechanicUse[]> extends Omit<GameData, "schema" | "mechanics" | "grants" | "locked"> {
	/** The version of the game definition format; 1 when left out. */
	readonly schema?: 1;
	/** The mechanics of the game, in the order they are listed. */
	readonly mechanics: Ms;
	/** The tools each grant name gives: a list replaces the derived one, a tweak changes it. Only tools of the listed mechanics. */
	readonly grants?: Partial<Readonly<Record<string, readonly ToolOf<Ms>[] | GrantTweak<ToolOf<Ms>>>>>;
	/** The tools every resident starts with locked. Only tools of the listed mechanics. */
	readonly locked?: readonly ToolOf<Ms>[];
}

/**
 * What game resolution takes.
 *
 * @public
 */
export interface ResolveInput {
	/** The game, in its builder form or its data form, or a game family. */
	readonly game: Game | GameData | GameFamily;
	/** The overrides of a family's params, by name (`--set`, an arm of an experiment). A game that is no family takes none (SWT-G041). */
	readonly params?: Readonly<Record<string, unknown>>;
	/** The record sources of the run (a driver's); passed through into `KernelDefinition.records` unchanged. */
	readonly records?: readonly RecordSource[];
	/** For a data game: mechanic id to definition. */
	readonly installed?: Readonly<Record<string, MechanicDefinition>>;
	/** Scheduler id to definition (`turns`); passed in because the sdk may not import the engine. */
	readonly schedulers: Readonly<Record<string, SchedulerDefinition>>;
	/** The lookup that renders every text. */
	readonly prompts: PromptLookup;
	/** The seed; it wins over the game's own. */
	readonly seed?: number;
	/** Package name to version, for the manifest; `0.0.0` when absent. */
	readonly versions?: Readonly<Record<string, string>>;
}

/**
 * What game resolution gives: the kernel definition and what a run folder records beside it.
 *
 * @public
 */
export interface ResolvedGame {
	/** What a kernel is created from. */
	readonly definition: KernelDefinition;
	/** The data form with defaults filled and `roster` listed; `definition.game.hash` is its hash. */
	readonly data: GameData;
	/** Every text a model may read, by key. */
	readonly texts: Readonly<Record<string, string>>;
	/** Actor id to briefing. */
	readonly briefings: Readonly<Record<string, string>>;
	/** The key of the fact whose value is the result line; undefined when the game names none. */
	readonly win: string | undefined;
	/** The effective params of a game family: the defaults with the overrides on top; `{}` for a game without params. */
	readonly params: Readonly<Record<string, JsonValue>>;
}
