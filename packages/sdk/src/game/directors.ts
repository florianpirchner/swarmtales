// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The Directors of a game in game resolution: each use is matched with its definition, its options are parsed, its
 * triggers are checked against the events the game's mechanics declare, and its grant gets the tool `take` of the
 * plugin `directors`. It reads definitions and data only: no function of a Director's body runs here.
 */
import { actorId, SwtError, type CanonicalTool, type GameData, type JsonValue, type SwtIssue } from "@swarmtales/contracts";
import type { DirectorDefinition } from "../director/define.ts";
import { directorName, directorNeverActivated, triggerWithoutEvent } from "../errors.ts";
import type { ResolvedDirector } from "./types.ts";

/**
 * The actor kind of a Director; its actor id is `director:<name>`.
 *
 * @public
 */
export const DIRECTOR_KIND = "director";

/**
 * The id of the plugin that queues the firings of every Director; game resolution adds it when a game has one.
 *
 * @public
 */
export const DIRECTORS_PLUGIN = "directors";

/**
 * The canonical name of the tool with which a Director takes its queued firings; first in every Director's grant.
 *
 * @public
 */
export const DIRECTOR_TAKE: CanonicalTool = `@swarmtales/sdk/${DIRECTORS_PLUGIN}/take`;

/**
 * What {@link resolveDirectors} takes.
 *
 * @internal
 */
export interface DirectorsInput {
	/** The game. */
	readonly data: GameData;
	/** Director id to definition: those the caller gave, with those of a builder game on top. */
	readonly definitions: Readonly<Record<string, DirectorDefinition>>;
	/** Every event the mechanics of the game declare, as `<mechanic id>.<event type>`. */
	readonly events: readonly string[];
	/** The scheduler id and its parsed options; undefined when the game names no scheduler of the platform. */
	readonly scheduler: { readonly id: string; readonly options: JsonValue } | undefined;
}

// The parsed options of one use, or the `SWT-G020` issues of the parser with their paths under the use.
function parsed(definition: DirectorDefinition, raw: unknown, root: string): { readonly options: Readonly<Record<string, JsonValue>> | undefined; readonly issues: readonly SwtIssue[] } {
	try {
		return { options: definition.parseOptions(raw), issues: [] };
	} catch (error) {
		if (!(error instanceof SwtError)) throw error;
		return { options: undefined, issues: error.issues.map((issue) => ({ ...issue, where: { ...issue.where, path: `${root}.${issue.where?.path ?? "options"}` } })) };
	}
}

// A scheduler names the actor kinds it activates in list options (`kinds`, `afterBlocks` of `turns`).
const activates = (options: JsonValue): boolean => typeof options === "object" && options !== null && !Array.isArray(options) && Object.values(options).some((value) => Array.isArray(value) && value.includes(DIRECTOR_KIND));

/**
 * The Directors of a game with their definitions, options and limits.
 *
 * @param input - The game, the definitions, the declared events and the scheduler.
 * @returns The Directors in the game's order, a name once (the first use), and the issues: a `use` without a
 * definition (`SWT-D002`), options that do not parse (`SWT-G020`, under `directors[i].options`), a trigger whose
 * event no mechanic of the game declares (`SWT-D001`), and once `SWT-D003` when the game has a Director and no
 * list option of its scheduler names the kind `director`. A taken name is reported by `directorsOf`.
 * @throws Whatever a definition's `parseOptions` throws that is no `SwtError`.
 *
 * @internal
 */
export function resolveDirectors(input: DirectorsInput): { readonly directors: readonly ResolvedDirector[]; readonly issues: readonly SwtIssue[] } {
	const { definitions, events, scheduler } = input;
	const uses = input.data.directors ?? [];
	const directors: ResolvedDirector[] = [];
	const issues: SwtIssue[] = [];
	uses.forEach((use, index) => {
		const root = `directors[${String(index)}]`;
		const name = use.as ?? use.use;
		const definition = Object.hasOwn(definitions, use.use) ? definitions[use.use] : undefined;
		if (definition === undefined) {
			issues.push(directorName({ name: use.use, path: `${root}.use`, taken: "unknown", known: Object.keys(definitions) }));
			return;
		}
		const { options, issues: wrong } = parsed(definition, use.options, root);
		const unheard = definition.on.flatMap((trigger) => ("event" in trigger && !("tool" in trigger) && !events.includes(trigger.event) ? [triggerWithoutEvent({ director: name, event: trigger.event, path: root, declared: events })] : []));
		issues.push(...wrong, ...unheard);
		if (options === undefined || directors.some((director) => director.name === name)) return;
		directors.push({ name, actor: actorId(DIRECTOR_KIND, name), definition, options, limits: use.limits ?? definition.limits, model: use.model });
	});
	if (uses.length > 0 && scheduler !== undefined && !activates(scheduler.options)) issues.push(directorNeverActivated({ scheduler: scheduler.id, directors: [...new Set(uses.map((use) => use.as ?? use.use))] }));
	return { directors, issues };
}

/**
 * The grants of a game with the tool `take` first in the grant of every Director.
 *
 * @param grants - Grant name to its tools, from `resolveGrants`.
 * @param directors - The Directors of the game.
 * @returns The grants; unchanged for a game without a Director.
 *
 * @internal
 */
export function directorGrants(grants: Readonly<Record<string, readonly CanonicalTool[]>>, directors: readonly ResolvedDirector[]): Readonly<Record<string, readonly CanonicalTool[]>> {
	const own = (name: string): readonly CanonicalTool[] => (Object.hasOwn(grants, name) ? grants[name] : undefined) ?? [];
	return Object.fromEntries([...Object.entries(grants), ...directors.map((director): [string, readonly CanonicalTool[]] => [director.name, [DIRECTOR_TAKE, ...own(director.name)]])]);
}
