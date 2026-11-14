// SPDX-License-Identifier: Apache-2.0
/**
 * Steps 1 to 4 of game resolution: the schema of the data form, the residents, the teams and roles, and the
 * mechanics with their options and event types. Each step collects issues and throws nothing; resolution throws
 * once, with the issues of every step. The `roster` plugin of step 4 is appended by `appendRoster` after the load
 * order (step 5), since it is a plugin and no mechanic definition.
 */
import { actorId, GameDefinitionSchema, KERNEL_EVENTS, ResidentIdSchema, SwtError, type ActorSpec, type GameData, type JsonValue, type SwtIssue } from "@swarmtales/contracts";
import { Value } from "typebox/value";
import { directorsReserved, eventTypeTaken, gameSchemaMismatch, mechanicNotInstalled, mechanicTwice, memberNotResident, residentId, schemaVersion } from "../errors.ts";
import type { MechanicDefinition } from "../mechanic/types.ts";

const KIND = "resident";

/**
 * One mechanic of a game after step 4: its definition and its options, parsed, with defaults.
 *
 * @public
 */
export interface UsedMechanic {
	/** The position in the game's `mechanics`, for the data path of a later issue. */
	readonly index: number;
	/** The definition. */
	readonly definition: MechanicDefinition;
	/** The options, parsed by the definition; undefined when they did not parse (`SWT-G020`). */
	readonly options: unknown;
	/** Bare tool name to the name a model sees. */
	readonly as: Readonly<Record<string, string>>;
}

// A JSON pointer as a data path: `/teams/X/0` is `teams.X[0]`.
const dataPath = (pointer: string): string => pointer.split("/").slice(1).map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`)).join("").slice(1);

/**
 * The issues of a game that have a code of their own: a schema version that is not 1, Directors, malformed ids.
 *
 * @param game - The game, as it was read.
 * @returns `SWT-G002`, `SWT-G003` and `SWT-G010` issues.
 */
function namedIssues(game: object): readonly SwtIssue[] {
	if ("schema" in game && game.schema !== 1) return [schemaVersion({ found: game.schema })];
	const directors = "directors" in game && Array.isArray(game.directors) ? game.directors.length : 0;
	const ids: readonly unknown[] = "residents" in game && Array.isArray(game.residents) ? game.residents : [];
	const malformed = ids.flatMap((id, index) => (typeof id === "string" && !Value.Check(ResidentIdSchema, id) ? [residentId({ id, path: `residents[${index}]`, reason: "malformed" })] : []));
	return [...(directors > 0 ? [directorsReserved({ count: directors })] : []), ...malformed];
}

/**
 * Step 1: checks the data form of a game against `GameDefinitionSchema`.
 *
 * @param game - The game in its data form, as it was read; untrusted.
 * @returns The game when it matches, else undefined and the issues: `SWT-G002` alone for another schema version;
 * else `SWT-G003` for Directors, `SWT-G010` for a malformed resident id and `SWT-G001` for every other mismatch.
 *
 * @public
 */
export function checkSchema(game: unknown): { readonly data: GameData | undefined; readonly issues: readonly SwtIssue[] } {
	if (Value.Check(GameDefinitionSchema, game)) return { data: game, issues: [] };
	const named = typeof game === "object" && game !== null ? namedIssues(game) : [];
	if (named[0]?.code === "SWT-G002") return { data: undefined, issues: named };
	const covered = new Set<string>(named.map((issue) => (issue.code === "SWT-G010" ? "/residents" : "/directors")));
	const rest = Value.Errors(GameDefinitionSchema, game).flatMap((error) => {
		// A union reports each of its forms; only its own line says something true. An unknown field is reported twice.
		if (error.schemaPath.includes("/anyOf/") || error.keyword === "additionalProperties" || covered.has(error.instancePath)) return [];
		const message = error.keyword === "anyOf" ? "matches none of the forms the format allows" : error.keyword === "boolean" ? "is not a field of the format" : error.message;
		return [gameSchemaMismatch({ path: dataPath(error.instancePath), message })];
	});
	return { data: undefined, issues: [...named, ...rest] };
}

/**
 * Step 2: the resident ids of a game. A count gives `A01`, `A02`, ... (two digits, or as many as the count has).
 *
 * @param data - The game.
 * @returns The ids in the game's order, each once, and one `SWT-G010` per id that is listed again.
 *
 * @public
 */
export function residentsOf(data: GameData): { readonly ids: readonly string[]; readonly issues: readonly SwtIssue[] } {
	const count = data.residents;
	const listed = typeof count === "number" ? Array.from({ length: count }, (_, index) => `A${String(index + 1).padStart(Math.max(2, String(count).length), "0")}`) : count;
	const issues = listed.flatMap((id, index) => (listed.indexOf(id) < index ? [residentId({ id, path: `residents[${index}]`, reason: "doubled" })] : []));
	return { ids: [...new Set(listed)], issues };
}

/**
 * Step 3: the actors of a game. Each resident becomes the actor `resident:<id>` of kind and grant `resident`; its
 * team and its role are written into `shared` (`team`, `role`), where the `roster` plugin reads them.
 *
 * @param data - The game.
 * @param ids - The resident ids of step 2.
 * @returns The actors in the game's order, and one `SWT-G011` per member of a team or a role that is no resident.
 * A resident that several teams (or roles) name gets the first of them.
 *
 * @public
 */
export function actorsOf(data: GameData, ids: readonly string[]): { readonly actors: readonly ActorSpec[]; readonly issues: readonly SwtIssue[] } {
	const issues: SwtIssue[] = [];
	const shared = new Map(ids.map((id): [string, Record<string, JsonValue>] => [id, {}]));
	for (const kind of ["team", "role"] as const) {
		for (const [group, members] of Object.entries((kind === "team" ? data.teams : data.roles) ?? {})) {
			members.forEach((id, index) => {
				const bag = shared.get(id);
				if (bag === undefined) issues.push(memberNotResident({ kind, group, id, path: `${kind}s.${group}[${index}]`, residents: ids }));
				else bag[kind] ??= group;
			});
		}
	}
	return { actors: ids.map((id) => ({ id: actorId(KIND, id), kind: KIND, grant: KIND, shared: shared.get(id) ?? {} })), issues };
}

/**
 * Parses the options of one use with the definition's own parser.
 *
 * @param definition - The definition.
 * @param raw - The options as the game wrote them.
 * @param root - The data path of the use, for example `mechanics[1]`.
 * @returns The options, or the issues of the parser with their paths under `root`.
 * @throws Whatever the parser throws that is no `SwtError`.
 */
function parsed(definition: MechanicDefinition, raw: unknown, root: string): { readonly options: unknown; readonly issues: readonly SwtIssue[] } {
	try {
		return { options: definition.parseOptions(raw), issues: [] };
	} catch (error) {
		if (!(error instanceof SwtError)) throw error;
		const under = (path: string | undefined): string => (path === undefined ? `${root}.options` : path.startsWith("mechanics[") ? path : `${root}.${path}`);
		return { options: undefined, issues: error.issues.map((issue) => ({ ...issue, where: { ...issue.where, path: under(issue.where?.path) } })) };
	}
}

/**
 * The event types that are taken: by the kernel, or by a mechanic that is listed before.
 *
 * @param definitions - The definitions of the game, in its order.
 * @returns One `SWT-M010` per event type that the kernel reserves or an earlier mechanic declares.
 */
function eventIssues(definitions: readonly MechanicDefinition[]): readonly SwtIssue[] {
	const owners = new Map<string, string>();
	return definitions.flatMap((definition) =>
		Object.keys(definition.events).flatMap((type) => {
			const taken = { mechanic: definition.id, type, package: definition.package };
			if (Object.hasOwn(KERNEL_EVENTS, type)) return [eventTypeTaken(taken)];
			const owner = owners.get(type);
			if (owner === undefined) owners.set(type, definition.id);
			return owner === undefined ? [] : [eventTypeTaken({ ...taken, owner })];
		}),
	);
}

/**
 * Step 4: the mechanics of a game with their options.
 *
 * @param data - The game.
 * @param definitions - Mechanic id to definition: the mechanics a builder game imported, or the installed ones.
 * @returns The mechanics that were found, in the game's order, each once, and the issues: a mechanic that is not
 * installed (`SWT-G022`), one that is listed again (`SWT-G021`), options that do not parse (`SWT-G020`, as the
 * definition reports them), an event type the kernel or an earlier mechanic holds (`SWT-M010`).
 * @throws Whatever a definition's `parseOptions` throws that is no `SwtError`.
 *
 * @public
 */
export function mechanicsOf(data: GameData, definitions: Readonly<Record<string, MechanicDefinition>>): { readonly used: readonly UsedMechanic[]; readonly issues: readonly SwtIssue[] } {
	const issues: SwtIssue[] = [];
	const used: UsedMechanic[] = [];
	data.mechanics.forEach((use, index) => {
		const root = `mechanics[${index}]`;
		const definition = Object.hasOwn(definitions, use.use) ? definitions[use.use] : undefined;
		if (definition === undefined) issues.push(mechanicNotInstalled({ mechanic: use.use, path: `${root}.use`, installed: Object.keys(definitions) }));
		else if (used.some((other) => other.definition.id === definition.id)) issues.push(mechanicTwice({ mechanic: use.use, path: root }));
		else {
			const { options, issues: wrong } = parsed(definition, use.options, root);
			issues.push(...wrong);
			used.push({ index, definition, options, as: use.as ?? {} });
		}
	});
	return { used, issues: [...issues, ...eventIssues(used.map((entry) => entry.definition))] };
}
