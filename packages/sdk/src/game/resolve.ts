// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Game resolution: from a game (builder form or data form) to the definition a kernel is created from. It runs the
 * steps of the files beside it in order, collects every issue, and throws once. It reads heads and data only: no
 * handler and no state function of a mechanic runs here.
 */
import { jsonHash } from "@swarmtales/chain";
import { actorId, SwtError, type ActorSpec, type GameData, type JsonValue, type SchedulerDefinition, type SwtIssue } from "@swarmtales/contracts";
import { Value } from "typebox/value";
import { directorsPlugin } from "../director/plugin.ts";
import { gameSchemaMismatch, noAnswerer, optionMismatch, paramOverride } from "../errors.ts";
import { RESIDENT_KIND } from "../mechanic/context.ts";
import type { MechanicDefinition } from "../mechanic/types.ts";
import { appendRoster } from "../roster/index.ts";
import { gameData } from "./define-game.ts";
import { DIRECTOR_TAKE, directorGrants, DIRECTORS_PLUGIN, resolveDirectors } from "./directors.ts";
import { familyParams, isGameFamily, isJson } from "./family.ts";
import { resolveGrants, unstagedTools } from "./grants.ts";
import { loadOrder } from "./load-order.ts";
import { collectTexts } from "./texts.ts";
import { shownNameClashes, toolNames, type NamedTool } from "./tool-names.ts";
import type { Game, ResolvedDirector, ResolvedGame, ResolveInput } from "./types.ts";
import { actorsOf, checkSchema, directorsOf, mechanicsOf, residentsOf, type UsedMechanic } from "./validate.ts";

const ROSTER = "roster";
const SDK = "@swarmtales/sdk";
const NO_VERSION = "0.0.0";
const DEFAULT_SCHEDULER = "turns";
const MAX_SEED = 4294967295;

type Definitions = Readonly<Record<string, MechanicDefinition>>;

// The builder form names every mechanic by a use (`mechanic`), the data form by an id (`use`).
// What is neither is left to the schema check of step 1, which reports it (a value that is no object, a use without a definition).
function isBuilder(game: unknown): game is Game {
	const uses: unknown = typeof game === "object" && game !== null && "mechanics" in game ? game.mechanics : undefined;
	return Array.isArray(uses) && uses.length > 0 && uses.every((use: unknown) => typeof use === "object" && use !== null && "mechanic" in use && typeof use.mechanic === "function");
}

// The seed of the run (`input.seed`) has the bounds of the game's own seed: the generator reads 32 bits (erratum E8).
function seedIssues(seed: number | undefined): readonly SwtIssue[] {
	if (seed === undefined || (Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED)) return [];
	return [gameSchemaMismatch({ path: "seed", message: `is ${String(seed)} for this run; a seed must be a whole number from 0 to ${String(MAX_SEED)}` })];
}

// Issues in the order of their data path (`mechanics[2]` before `mechanics[10]`); without a path first, ties in step order.
function sorted(issues: readonly SwtIssue[]): readonly SwtIssue[] {
	return issues
		.map((issue, index) => ({ issue, index }))
		.sort((a, b) => (a.issue.where?.path ?? "").localeCompare(b.issue.where?.path ?? "", "en", { numeric: true }) || a.index - b.index)
		.map((entry) => entry.issue);
}

interface Scheduled {
	readonly id: string;
	readonly definition: SchedulerDefinition | undefined;
	readonly options: JsonValue;
	readonly issues: readonly SwtIssue[];
}

type Wrong = (path: string, message: string) => SwtIssue;

// The keys of an options object that its schema does not know; an options schema is an open object, so the schema check lets them pass.
function unknownKeys(schema: object, value: unknown): readonly string[] {
	if (!("properties" in schema) || typeof schema.properties !== "object" || schema.properties === null) return [];
	const known = Object.keys(schema.properties);
	return typeof value === "object" && value !== null && !Array.isArray(value) ? Object.keys(value).filter((key) => !known.includes(key)) : [];
}

// The options of a scheduler with the defaults of its schema, and every mismatch as SWT-G020 under `scheduler.options`.
function parsedOptions(definition: SchedulerDefinition, raw: unknown, wrong: Wrong): { readonly options: JsonValue; readonly issues: readonly SwtIssue[] } {
	const root = "scheduler.options";
	const filled: unknown = Value.Default(definition.options, Value.Clone(raw ?? {}));
	const issues = [
		// Read from what the game wrote: the copy that gets the defaults has lost a key named `__proto__`.
		...unknownKeys(definition.options, raw).map((key) => wrong(`${root}.${key}`, "is unknown")),
		...Value.Errors(definition.options, filled)
			.filter((error) => !error.schemaPath.includes("/anyOf/"))
			.map((error) => wrong(`${root}${error.instancePath.split("/").slice(1).map((part) => (/^\d+$/.test(part) ? `[${part}]` : `.${part}`)).join("")}`, error.message)),
	];
	return isJson(filled) ? { options: filled, issues } : { options: {}, issues: [...issues, wrong(root, "is no JSON value")] };
}

// Step 9: the scheduler of the game (`turns` when it names none) and its parsed options.
function schedulerOf(data: GameData, schedulers: Readonly<Record<string, SchedulerDefinition>>): Scheduled {
	const id = data.scheduler?.id ?? DEFAULT_SCHEDULER;
	const definition = Object.hasOwn(schedulers, id) ? schedulers[id] : undefined;
	const wrong: Wrong = (path, message) => optionMismatch({ owner: id, kind: "scheduler", path, message });
	if (definition === undefined) {
		const known = Object.keys(schedulers).map((name) => `"${name}"`).join(", ");
		return { id, definition, options: {}, issues: [wrong("scheduler.id", `names no scheduler of this platform (known: ${known === "" ? "none" : known})`)] };
	}
	return { id, definition, ...parsedOptions(definition, data.scheduler?.options, wrong) };
}

// Actor id to briefing: one text for every resident, or one per resident id.
function briefingsOf(data: GameData, residents: readonly string[]): Readonly<Record<string, string>> {
	const briefing = data.briefing;
	if (briefing === undefined) return {};
	return Object.fromEntries(
		residents.flatMap((id): [string, string][] => {
			const text = typeof briefing === "string" ? briefing : Object.hasOwn(briefing, id) ? briefing[id] : undefined;
			return text === undefined ? [] : [[actorId(RESIDENT_KIND, id), text]];
		}),
	);
}

// The data form that is hashed and recorded: the seed, every mechanic's options and the scheduler with their defaults, `roster` listed.
// An empty `directors` is left out, so the game has the hash of the game without the field; a Director is listed with its parsed options.
function filledData({ directors: uses, ...data }: GameData, used: readonly UsedMechanic[], scheduler: Scheduled, roster: boolean, resolved: readonly ResolvedDirector[]): GameData {
	const directors = (uses ?? []).map((use) => ({ ...use, options: resolved.find((director) => director.name === (use.as ?? use.use))?.options ?? {} }));
	const mechanics = data.mechanics.map((use, index) => {
		const options = used.find((entry) => entry.index === index)?.options;
		return options === undefined ? use : { ...use, options };
	});
	const listed = data.mechanics.some((use) => use.use === ROSTER);
	return { ...data, ...(directors.length === 0 ? {} : { directors }), seed: data.seed ?? 1, mechanics: roster && !listed ? [...mechanics, { use: ROSTER }] : mechanics, scheduler: { id: scheduler.id, options: scheduler.options } };
}

// Steps 4 to 8: the mechanics in load order with their tool names, grants and texts. A recorded game lists `roster`, which no package installs.
function mechanicSteps(data: GameData, definitions: Definitions, input: ResolveInput) {
	const found = mechanicsOf(data, definitions);
	const own = new Set(data.mechanics.flatMap((use, index) => (use.use === ROSTER && !Object.hasOwn(definitions, ROSTER) ? [`mechanics[${index}].use`] : [])));
	const ordered = loadOrder(found.used.map((entry) => ({ id: entry.definition.id, requires: entry.definition.head.requires, provides: entry.definition.head.provides, uses: entry.definition.head.uses, entry })), [ROSTER]);
	// `loadOrder` counts the mechanics it was given; the path of an issue names the place in the game's own list.
	const placed = ordered.issues.map((issue) => {
		const at = /^mechanics\[(\d+)\]$/.exec(issue.where?.path ?? "")?.[1];
		const index = at === undefined ? undefined : found.used[Number(at)]?.index;
		return index === undefined ? issue : { ...issue, where: { ...issue.where, path: `mechanics[${String(index)}]` } };
	});
	const order = ordered.order.map((placed) => placed.entry);
	const sources = order.map((entry) => ({ mechanic: entry.definition, as: entry.as, path: `mechanics[${entry.index}]` }));
	const names = toolNames(sources);
	const grants = resolveGrants({ tools: names.tools, grants: data.grants, locked: data.locked });
	const texts = collectTexts(sources, input.prompts);
	const issues = [...found.issues.filter((issue) => !(issue.code === "SWT-G022" && own.has(issue.where?.path ?? ""))), ...placed, ...names.issues, ...grants.issues, ...unstagedTools(sources, names.tools, grants.grants), ...texts.issues];
	return { used: found.used, order, tools: names.tools, names: names.names, grants, texts, issues };
}

// Package name to its version, `0.0.0` when the caller gave none.
const versionOf = (versions: Readonly<Record<string, string>>) => (name: string): string => (Object.hasOwn(versions, name) ? versions[name] : undefined) ?? NO_VERSION;

// The game that is resolved and its effective params: a family is built from them, any other game takes no override (SWT-G041).
function builtGame(input: ResolveInput): { readonly game: Game | GameData; readonly params: ResolvedGame["params"] } {
	if (!isGameFamily(input.game)) {
		const issues = Object.keys(input.params ?? {}).map((name) => paramOverride({ name, problem: "no-family" }));
		if (issues.length > 0) throw new SwtError(issues);
		return { game: input.game, params: {} };
	}
	const { params, issues } = familyParams(input.game, input.params);
	if (issues.length > 0) throw new SwtError(issues);
	return { game: input.game.build(params), params };
}

// The tool `take` of the plugin `directors` as the name steps see a tool.
const TAKE: NamedTool = { canonical: DIRECTOR_TAKE, name: "take", shown: "take", owner: DIRECTORS_PLUGIN, for: [], path: "directors" };

// One `SWT-D004` per review of a mechanic whose answerer no Director of the game answers (a mistake of the game's author).
function unanswered(steps: ReturnType<typeof mechanicSteps>, directors: readonly ResolvedDirector[]): readonly SwtIssue[] {
	const answered = directors.flatMap((director) => (director.definition.answers === undefined ? [] : [director.definition.answers]));
	return steps.used.flatMap(({ definition, index }) => [...new Set(definition.head.answerers)].filter((answerer) => !answered.includes(answerer)).map((answerer) => noAnswerer({ mechanic: definition.id, path: `mechanics[${String(index)}]`, answerer, answered })));
}

// One `SWT-G013` per Director whose grant holds a tool of a mechanic that is shown as `take`: its `take` would reach that tool.
function takeClashes(steps: ReturnType<typeof mechanicSteps>, directors: readonly ResolvedDirector[]): readonly SwtIssue[] {
	const grants = Object.fromEntries(Object.entries(directorGrants(steps.grants.grants, directors)).filter(([grant]) => directors.some((director) => director.name === grant)));
	return shownNameClashes(grants, [TAKE, ...steps.tools.filter((tool) => tool.shown === TAKE.shown)]);
}

interface Checked {
	readonly params: ResolvedGame["params"];
	readonly data: GameData;
	readonly residents: readonly string[];
	readonly actors: readonly ActorSpec[];
	readonly directors: readonly ResolvedDirector[];
	readonly steps: ReturnType<typeof mechanicSteps>;
	readonly scheduler: Scheduled;
	readonly definition: SchedulerDefinition;
}

// Step 10: a game without an issue becomes the kernel definition; only here a mechanic's `resolve` runs.
function assembled(input: ResolveInput, parts: Checked): ResolvedGame {
	const { data, steps, scheduler } = parts;
	const version = versionOf(input.versions ?? {});
	// A bare name that two mechanics declare stands for the tool of the one loaded first.
	const tools = new Map(steps.tools.toReversed().map((tool) => [tool.name, tool.canonical]));
	const loaded = steps.order.map((entry) => entry.definition.resolve(entry.options, input.prompts, version(entry.definition.package), tools, steps.names));
	const rostered = appendRoster(loaded, version(SDK));
	// The plugin `directors` is the last plugin, and only a game with a Director has it.
	const plugins = parts.directors.length === 0 ? rostered : [...rostered, directorsPlugin(parts.directors, rostered, version(SDK))];
	const filled = filledData(data, steps.used, scheduler, rostered.length > loaded.length, parts.directors);
	const limits = data.limits?.maxCallsPerTick === undefined ? {} : { maxCallsPerTick: data.limits.maxCallsPerTick };
	return {
		definition: {
			game: { id: data.id, hash: jsonHash(filled) },
			seed: input.seed ?? filled.seed ?? 1,
			actors: parts.actors,
			plugins,
			scheduler: { definition: parts.definition, options: scheduler.options },
			grants: directorGrants(steps.grants.grants, parts.directors),
			names: parts.directors.length === 0 ? steps.names : { ...steps.names, [DIRECTOR_TAKE]: TAKE.shown },
			startLocks: steps.grants.startLocks,
			replies: steps.texts.replies,
			limits: { maxTicks: data.end.ticks, ...limits },
			...(input.records === undefined ? {} : { records: input.records }),
		},
		data: filled,
		texts: steps.texts.texts,
		briefings: briefingsOf(data, parts.residents),
		directors: parts.directors,
		win: data.win?.fact,
		params: parts.params,
	};
}

/**
 * Resolves a game: checks it, orders its mechanics, names and grants their tools, collects every text, and builds
 * the kernel definition. The seed is `input.seed`, else the game's, else 1. The hash of the game is the hash of
 * `data`, which does not hold `input.seed`.
 *
 * A game family is built first, from the defaults of its params with `input.params` on top; what is hashed is the
 * data of the game it builds, so the params are in the hash only through what they change in the game.
 *
 * @param input - The game or the family, the overrides of its params, the installed mechanics (for a data game), the Director definitions, the schedulers by id, the prompt lookup, the seed, the package versions and the record sources.
 * @returns The kernel definition, the data form with defaults filled, the texts, the briefings, the Directors, the key of the win fact and the effective params.
 * @throws SwtError One error with every issue found, sorted by data path (`SWT-G001` to `SWT-G032`, `SWT-D001` to
 * `SWT-D004`, `SWT-M010`, `SWT-P003`, and what the prompt lookup reports). A game that fails its schema is reported with the schema issues
 * alone, and so are overrides that do not fit (`SWT-G041`): an unknown param, a value of the wrong type, or any
 * override for a game that is no family.
 *
 * @example
 * ```ts
 * const resolved = resolveGame({ game, schedulers: { turns }, prompts: createPromptLookup() });
 * const kernel = createKernel(resolved.definition);
 * ```
 *
 * @public
 */
export function resolveGame(input: ResolveInput): ResolvedGame {
	const { game, params } = builtGame(input);
	const builder = isBuilder(game) ? gameData(game) : undefined;
	const checked = checkSchema(builder?.data ?? game);
	if (checked.data === undefined) throw new SwtError(sorted(checked.issues));
	const data = checked.data;
	const residents = residentsOf(data);
	const steps = mechanicSteps(data, { ...input.installed, ...builder?.mechanics }, input);
	const named = directorsOf(data);
	// The actors come after the grants: the actor `human` exists when its grant holds a tool.
	const actors = actorsOf(data, residents.ids, named.names, steps.grants.grants);
	const scheduler = schedulerOf(data, input.schedulers);
	const events = steps.used.flatMap((entry) => Object.keys(entry.definition.events).map((type) => `${entry.definition.id}.${type}`));
	const directors = resolveDirectors({ data, definitions: { ...input.directors, ...builder?.directors }, events, scheduler: scheduler.definition === undefined ? undefined : scheduler });
	const issues = [...seedIssues(input.seed), ...residents.issues, ...actors.issues, ...named.issues, ...directors.issues, ...takeClashes(steps, directors.directors), ...unanswered(steps, directors.directors), ...steps.issues, ...scheduler.issues];
	if (issues.length > 0 || scheduler.definition === undefined) throw new SwtError(sorted(issues));
	return assembled(input, { params, data, residents: residents.ids, actors: actors.actors, directors: directors.directors, steps, scheduler, definition: scheduler.definition });
}
