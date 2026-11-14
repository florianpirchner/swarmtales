// SPDX-License-Identifier: Apache-2.0
/**
 * Game resolution: from a game (builder form or data form) to the definition a kernel is created from. It runs the
 * steps of the files beside it in order, collects every issue, and throws once. It reads heads and data only: no
 * handler and no state function of a mechanic runs here.
 */
import { jsonHash } from "@swarmtales/chain";
import { actorId, SwtError, type ActorSpec, type GameData, type JsonValue, type SchedulerDefinition, type SwtIssue } from "@swarmtales/contracts";
import { Value } from "typebox/value";
import { optionMismatch } from "../errors.ts";
import { RESIDENT_KIND } from "../mechanic/context.ts";
import type { MechanicDefinition } from "../mechanic/types.ts";
import { appendRoster } from "../roster/index.ts";
import { gameData } from "./define-game.ts";
import { resolveGrants } from "./grants.ts";
import { loadOrder } from "./load-order.ts";
import { collectTexts } from "./texts.ts";
import { toolNames } from "./tool-names.ts";
import type { Game, ResolvedGame, ResolveInput } from "./types.ts";
import { actorsOf, checkSchema, mechanicsOf, residentsOf, type UsedMechanic } from "./validate.ts";

const ROSTER = "roster";
const SDK = "@swarmtales/sdk";
const NO_VERSION = "0.0.0";
const DEFAULT_SCHEDULER = "turns";

type Definitions = Readonly<Record<string, MechanicDefinition>>;

// The builder form names every mechanic by a use (`mechanic`), the data form by an id (`use`).
function isBuilder(game: Game | GameData): game is Game {
	const uses: unknown = game.mechanics;
	return Array.isArray(uses) && uses.length > 0 && uses.every((use) => typeof use === "object" && use !== null && "mechanic" in use);
}

function isJson(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every(isJson);
	return typeof value === "object" && Object.values(value).every(isJson);
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
		...unknownKeys(definition.options, filled).map((key) => wrong(`${root}.${key}`, "is unknown")),
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
function filledData(data: GameData, used: readonly UsedMechanic[], scheduler: Scheduled, roster: boolean): GameData {
	const mechanics = data.mechanics.map((use, index) => {
		const options = used.find((entry) => entry.index === index)?.options;
		return options === undefined ? use : { ...use, options };
	});
	const listed = data.mechanics.some((use) => use.use === ROSTER);
	return { ...data, seed: data.seed ?? 1, mechanics: roster && !listed ? [...mechanics, { use: ROSTER }] : mechanics, scheduler: { id: scheduler.id, options: scheduler.options } };
}

// Steps 4 to 8: the mechanics in load order with their tool names, grants and texts. A recorded game lists `roster`, which no package installs.
function mechanicSteps(data: GameData, definitions: Definitions, input: ResolveInput) {
	const found = mechanicsOf(data, definitions);
	const own = new Set(data.mechanics.flatMap((use, index) => (use.use === ROSTER && !Object.hasOwn(definitions, ROSTER) ? [`mechanics[${index}].use`] : [])));
	const ordered = loadOrder(found.used.map((entry) => ({ id: entry.definition.id, requires: entry.definition.head.requires, provides: entry.definition.head.provides, uses: entry.definition.head.uses, entry })));
	const order = ordered.order.map((placed) => placed.entry);
	const sources = order.map((entry) => ({ mechanic: entry.definition, as: entry.as, path: `mechanics[${entry.index}]` }));
	const names = toolNames(sources);
	const grants = resolveGrants({ tools: names.tools, grants: data.grants, locked: data.locked });
	const texts = collectTexts(sources, input.prompts);
	const issues = [...found.issues.filter((issue) => !(issue.code === "SWT-G022" && own.has(issue.where?.path ?? ""))), ...ordered.issues, ...names.issues, ...grants.issues, ...texts.issues];
	return { used: found.used, order, names: names.names, grants, texts, issues };
}

// Package name to its version, `0.0.0` when the caller gave none.
const versionOf = (versions: Readonly<Record<string, string>>) => (name: string): string => (Object.hasOwn(versions, name) ? versions[name] : undefined) ?? NO_VERSION;

interface Checked {
	readonly data: GameData;
	readonly residents: readonly string[];
	readonly actors: readonly ActorSpec[];
	readonly steps: ReturnType<typeof mechanicSteps>;
	readonly scheduler: Scheduled;
	readonly definition: SchedulerDefinition;
}

// Step 10: a game without an issue becomes the kernel definition; only here a mechanic's `resolve` runs.
function assembled(input: ResolveInput, parts: Checked): ResolvedGame {
	const { data, steps, scheduler } = parts;
	const version = versionOf(input.versions ?? {});
	const loaded = steps.order.map((entry) => entry.definition.resolve(entry.options, input.prompts, version(entry.definition.package)));
	const plugins = appendRoster(loaded, version(SDK));
	const filled = filledData(data, steps.used, scheduler, plugins.length > loaded.length);
	const limits = data.limits?.maxCallsPerTick === undefined ? {} : { maxCallsPerTick: data.limits.maxCallsPerTick };
	return {
		definition: {
			game: { id: data.id, hash: jsonHash(filled) },
			seed: input.seed ?? filled.seed ?? 1,
			actors: parts.actors,
			plugins,
			scheduler: { definition: parts.definition, options: scheduler.options },
			grants: steps.grants.grants,
			names: steps.names,
			startLocks: steps.grants.startLocks,
			replies: steps.texts.replies,
			limits: { maxTicks: data.end.ticks, ...limits },
		},
		data: filled,
		texts: steps.texts.texts,
		briefings: briefingsOf(data, parts.residents),
		win: data.win?.fact,
	};
}

/**
 * Resolves a game: checks it, orders its mechanics, names and grants their tools, collects every text, and builds
 * the kernel definition. The seed is `input.seed`, else the game's, else 1. The hash of the game is the hash of
 * `data`, which does not hold `input.seed`.
 *
 * @param input - The game, the installed mechanics (for a data game), the schedulers by id, the prompt lookup, the seed and the package versions.
 * @returns The kernel definition, the data form with defaults filled, the texts, the briefings and the key of the win fact.
 * @throws SwtError One error with every issue found, sorted by data path (`SWT-G001` to `SWT-G032`, `SWT-M010`,
 * `SWT-P003`, and what the prompt lookup reports). A game that fails its schema is reported with the schema issues alone.
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
	const builder = isBuilder(input.game) ? gameData(input.game) : undefined;
	const checked = checkSchema(builder?.data ?? input.game);
	if (checked.data === undefined) throw new SwtError(sorted(checked.issues));
	const data = checked.data;
	const residents = residentsOf(data);
	const actors = actorsOf(data, residents.ids);
	const steps = mechanicSteps(data, { ...input.installed, ...builder?.mechanics }, input);
	const scheduler = schedulerOf(data, input.schedulers);
	const issues = [...residents.issues, ...actors.issues, ...steps.issues, ...scheduler.issues];
	if (issues.length > 0 || scheduler.definition === undefined) throw new SwtError(sorted(issues));
	return assembled(input, { data, residents: residents.ids, actors: actors.actors, steps, scheduler, definition: scheduler.definition });
}
