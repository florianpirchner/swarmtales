// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The oracle runner: plays a game from the inputs of an oracle file under the game's own scheduler and compares
 * what came out with the file, at the three levels of `oracles/README.md` (specification of M1, section 7).
 */
import { nameOf, SwtError, type ActorDriver, type DriverTable, type GameData, type RunEnd } from "@swarmtales/contracts";
import { turns, TurnsOptions } from "@swarmtales/engine";
import { createPromptLookup } from "@swarmtales/prompts";
import { definitionsOf, DIRECTOR_KIND, DIRECTORS_PLUGIN, resolveGame, RESIDENT_KIND, type Game, type MechanicDefinition, type ResolvedGame } from "@swarmtales/sdk";
import { Value } from "typebox/value";
import { scriptedDriver, type Plan, type PlannedCall } from "../drivers.ts";
import { play, type Played, type PlayOptions } from "../play.ts";
import type { Oracle, OracleEntry } from "./format.ts";
import { oracleError } from "./read.ts";
import { timelineOf } from "./timeline.ts";

/**
 * How much is compared: 1 the rules, 2 also the texts, 3 also the scheduling (the levels of `oracles/README.md`).
 *
 * @public
 */
export type OracleLevel = 1 | 2 | 3;

/**
 * One difference between an oracle and the run of a game.
 *
 * @public
 */
export interface OracleMismatch {
	/** The lowest level at which the difference shows. */
	readonly level: OracleLevel;
	/** What differs: the resolved game, the result of a call, an event, the lines of a turn, the schedule, or the end. */
	readonly at: "setup" | "call" | "event" | "inputs" | "turn" | "end";
	/** The position in the oracle's timeline (its length when the run has more entries than the oracle); -1 for setup and end. */
	readonly index: number;
	/** What the oracle holds, reduced to what the level compares; undefined when the run has an entry the oracle lacks. */
	readonly expected: unknown;
	/** What the run gave, reduced the same way; undefined when the run lacks the entry. */
	readonly actual: unknown;
}

type At = OracleMismatch["at"];
type Fields = Readonly<Record<string, unknown>>;
interface Item {
	readonly k: string;
	readonly at: At;
	readonly index: number;
	readonly value: unknown;
}

const LEVELS = [1, 2, 3] as const;
const ROSTER = "roster";
const GAMEMAKER = "gamemaker";
const SCRIPT = "script";
// The name the grant of every Director shows for `take` of the plugin `directors`.
const TAKE = "take";
// The `core` events the runner maps; `referee_intervened` and the role lines are rules (level 1), the rest scheduling (level 3).
const CORE = ["referee_intervened", "tool_locked", "tool_unlocked", "overseer_called", "overseer_answered", "resident_suspended", "role_asked", "role_answered", "guard_verdict"];
const RULES = ["referee_intervened", "role_asked", "role_answered"];
const OVERSEER = ["overseer_called", "overseer_answered"];

// The old actor of a Director (`gamemaker`, `overseer:<name>`) as its actor here, else undefined.
function directorOf(actor: string): string | undefined {
	if (actor === GAMEMAKER) return `${DIRECTOR_KIND}:${GAMEMAKER}`;
	return actor.startsWith("overseer:") ? `${DIRECTOR_KIND}:${actor.slice(actor.indexOf(":") + 1)}` : undefined;
}

// A guard verdict of the city's check, or of a run without a guard model, writes no line here (12-m5-spec.md 4.3,
// skip and no answerer); a verdict of the guard's model is compared once a file holds one.
const unwritten = (entry: OracleEntry): boolean => entry.k === "event" && entry.source === "core" && entry.type === "guard_verdict" && typeof entry.payload === "object" && entry.payload !== null && "by" in entry.payload && entry.payload.by !== "model";

// Who the runner drives: residents and Directors; a call of `script` is a staged call of the game.
const played = (actor: string): boolean => actor.startsWith(`${RESIDENT_KIND}:`) || actor === SCRIPT || directorOf(actor) !== undefined;

// What the runner does not play, as the end of the sentence "the oracle ...".
function unsupportedEntry(entry: OracleEntry, index: number): string | undefined {
	if (entry.k === "resume") return `has a \`resume\` entry (timeline[${String(index)}])`;
	if (entry.k === "call" && !played(entry.actor)) return `has a call of \`${entry.actor}\`, which is no resident, Director or script (timeline[${String(index)}])`;
	if (entry.k === "event" && entry.source === "core" && (!CORE.includes(entry.type) || (entry.type === "guard_verdict" && !unwritten(entry)))) return `has the platform event \`core.${entry.type}\` (timeline[${String(index)}])`;
	return undefined;
}

// A composed story (`setup.definition`) logged the old arena's order of its turns as `custom`: a rule, not a value
// of `turns`. It is not compared as setup; the `turn` entries show it at level 3.
const composed = ({ setup }: Oracle): boolean => setup.definition !== undefined;
const turnsOf = (turns: Readonly<Record<string, unknown>>, story: boolean): Fields => (story ? Object.fromEntries(Object.entries(turns).filter(([key]) => key !== "order")) : turns);

function unsupported(oracle: Oracle): string | undefined {
	if (oracle.setup.turns.order !== "seeded" && !composed(oracle)) return `has the turn order \`${oracle.setup.turns.order}\``;
	return oracle.timeline.flatMap((entry, index) => unsupportedEntry(entry, index) ?? []).at(0);
}

type Definitions = Readonly<Record<string, MechanicDefinition>>;

// A file holds the options of a mechanic as the old game wrote them, before the defaults; the mechanic's own
// `parseOptions` fills them, so they compare whole with the resolved options. Only a default that changed stays
// uncompared. Options that do not parse stay as written: they differ from every resolved value.
function filled(definition: MechanicDefinition | undefined, options: unknown): unknown {
	try {
		return definition === undefined ? options : definition.parseOptions(options ?? {});
	} catch (error) {
		if (error instanceof SwtError) return options;
		throw error;
	}
}

// The fields of `setup` as the oracle states them; the mechanics as a sorted list of ids and one field of options per
// id, with the defaults. A composed story (`setup.definition`) states no options (`null`): they are not compared.
function statedSetup(oracle: Oracle, definitions: Definitions): Fields {
	const { setup } = oracle;
	const stated = setup.definition === undefined ? setup.mechanics : setup.mechanics.filter((mechanic) => mechanic.options !== null);
	return {
		residents: setup.residents,
		residentTools: setup.residentTools,
		locked: setup.locked,
		turns: turnsOf(setup.turns, composed(oracle)),
		minutes: setup.minutes,
		limits: setup.limits ?? {},
		mechanics: setup.mechanics.map((mechanic) => mechanic.id).sort(),
		...Object.fromEntries(stated.map((mechanic) => [`options.${mechanic.id}`, filled(Object.hasOwn(definitions, mechanic.id) ? definitions[mechanic.id] : undefined, mechanic.options)])),
	};
}

// The same fields read from the resolved game, under the oracle's names; `roster` and `directors` are the platform's
// plugins. For a composed story only the options the file states are read.
function resolvedSetup({ definition }: ResolvedGame, stated: Fields, story: boolean): Fields {
	const shown = (tools: readonly string[] | undefined): readonly string[] => (tools ?? []).map((tool) => (Object.hasOwn(definition.names, tool) ? definition.names[tool] : undefined) ?? tool);
	const options = definition.scheduler.options;
	const plugins = definition.plugins.filter((plugin) => plugin.id !== ROSTER && plugin.id !== DIRECTORS_PLUGIN);
	const read = story ? plugins.filter((plugin) => Object.hasOwn(stated, `options.${plugin.id}`)) : plugins;
	return {
		residents: definition.actors.filter((actor) => actor.kind === RESIDENT_KIND).map((actor) => nameOf(actor.id)),
		residentTools: shown(definition.grants[RESIDENT_KIND]),
		locked: shown(definition.startLocks[RESIDENT_KIND]),
		turns: Value.Check(TurnsOptions, options) ? turnsOf({ passes: options.passes, blockSize: options.blockSize, activation: options.activation, order: options.order }, story) : options,
		minutes: definition.limits.maxTicks,
		limits: definition.limits.maxCallsPerTick === undefined ? {} : { maxStepsPerMinute: definition.limits.maxCallsPerTick },
		mechanics: plugins.map((plugin) => plugin.id).sort(),
		...Object.fromEntries(read.map((plugin) => [`options.${plugin.id}`, plugin.options])),
	};
}

function setupMismatches(stated: Fields, resolved: Fields): readonly OracleMismatch[] {
	const keys = [...new Set([...Object.keys(stated), ...Object.keys(resolved)])];
	return keys.flatMap((key): OracleMismatch[] => {
		return Value.Equal(stated[key], resolved[key]) ? [] : [{ level: 1, at: "setup", index: -1, expected: { [key]: stated[key] }, actual: { [key]: resolved[key] } }];
	});
}

// The actor whose activation an entry opens: a resident's `turn`, a Director's `core.overseer_called`.
function openedBy(entry: OracleEntry): string | undefined {
	if (entry.k === "turn") return `${RESIDENT_KIND}:${entry.resident}`;
	return entry.k === "event" && entry.source === "core" && entry.type === "overseer_called" ? directorOf(entry.actor) : undefined;
}

// The calls of each resident and Director, activation by activation: at its n-th activation an actor makes the
// calls that follow the n-th entry that opened one for it.
function scriptOf(timeline: readonly OracleEntry[]): Plan {
	const script = new Map<string, PlannedCall[][]>();
	for (const entry of timeline) {
		const opened = openedBy(entry);
		if (opened !== undefined) script.set(opened, [...(script.get(opened) ?? []), []]);
		if (entry.k === "call") script.get(directorOf(entry.actor) ?? entry.actor)?.at(-1)?.push({ tool: entry.tool, params: entry.params });
	}
	const played = new Map<string, number>();
	return (activation) => {
		const turn = played.get(activation.actor) ?? 0;
		played.set(activation.actor, turn + 1);
		return script.get(activation.actor)?.[turn] ?? [];
	};
}

// The drivers of a file. A Director takes its firings first, as the engine's driver does. The model of a recorded
// run owed an answer after every turn in which it called a tool, so the replay of a live run is pending after such
// a turn and is woken again without news; a scripted file never is.
function driversOf(oracle: Oracle): DriverTable {
	const plan = scriptOf(oracle.timeline);
	const director = scriptedDriver(async (activation) => [{ tool: TAKE, params: {} }, ...(await plan(activation))]);
	if (oracle.source.kind !== "live-replay") return { [RESIDENT_KIND]: scriptedDriver(plan), [DIRECTOR_KIND]: director };
	const resident: ActorDriver = async (activation) => {
		const calls = await plan(activation);
		for (const call of calls) await activation.call(call.tool, call.params);
		return { pending: calls.length > 0 };
	};
	return { [RESIDENT_KIND]: resident, [DIRECTOR_KIND]: director };
}

// An entry as it is compared: a Director's activation by the overseer's name alone (its count per tick; a scripted
// run holds no model text), every other entry whole.
function reduced(entry: OracleEntry): OracleEntry {
	if (entry.k !== "event" || entry.source !== "core" || !OVERSEER.includes(entry.type)) return entry;
	const name = typeof entry.payload === "object" && entry.payload !== null && "overseer" in entry.payload ? entry.payload.overseer : undefined;
	return { ...entry, payload: { overseer: name } };
}

// What one level compares of an entry beyond the level below; undefined: the level does not look at the entry.
function compared(entry: OracleEntry, level: OracleLevel): { readonly at: At; readonly value: unknown } | undefined {
	if (entry.k === "call") return { at: "call", value: level === 1 ? { k: entry.k, actor: entry.actor, tool: entry.tool, ok: entry.ok, code: entry.code, stage: entry.stage } : entry };
	if (entry.k === "event") return !unwritten(entry) && (level === 3 || entry.source !== "core" || RULES.includes(entry.type)) ? { at: "event", value: reduced(entry) } : undefined;
	return level === 1 ? undefined : scheduled(entry, level);
}

// A `turn` shows its lines at level 2 and its place at level 3; `minute`, `skip` and `resume` are scheduling.
function scheduled(entry: Exclude<OracleEntry, { k: "call" | "event" }>, level: 2 | 3): { readonly at: At; readonly value: unknown } | undefined {
	if (entry.k !== "turn") return level === 3 ? { at: "turn", value: entry } : undefined;
	return level === 2 ? { at: "inputs", value: entry.inputs } : { at: "turn", value: { k: entry.k, resident: entry.resident, pass: entry.pass, block: entry.block } };
}

const itemsOf = (timeline: readonly OracleEntry[], level: OracleLevel): readonly Item[] =>
	timeline.flatMap((entry, index): Item[] => {
		const item = compared(entry, level);
		return item === undefined ? [] : [{ k: entry.k, index, ...item }];
	});

// One level: the first difference of each kind, entry by entry. It stops where the two timelines stop being aligned (another kind of entry, or one is over).
function levelMismatches(expected: readonly OracleEntry[], actual: readonly OracleEntry[], level: OracleLevel): readonly OracleMismatch[] {
	const [stated, given] = [itemsOf(expected, level), itemsOf(actual, level)];
	const none: Partial<Item> = {};
	const found = new Map<At, OracleMismatch>();
	for (let place = 0; place < Math.max(stated.length, given.length); place++) {
		const [want, got] = [stated[place] ?? none, given[place] ?? none];
		if (Value.Equal(want.value, got.value)) continue;
		const at = want.at ?? got.at ?? "turn";
		if (!found.has(at)) found.set(at, { level, at, index: want.index ?? expected.length, expected: want.value, actual: got.value });
		if (want.k !== got.k) break;
	}
	return [...found.values()];
}

// Every level up to the asked one; a kind that differs at a lower level is not reported again above it.
function timelineMismatches(expected: readonly OracleEntry[], actual: readonly OracleEntry[], upTo: OracleLevel): readonly OracleMismatch[] {
	const found: OracleMismatch[] = [];
	for (const level of LEVELS.filter((one) => one <= upTo)) {
		found.push(...levelMismatches(expected, actual, level).filter((mismatch) => !found.some((earlier) => earlier.at === mismatch.at)));
	}
	return found;
}

// The end of a run under the oracle's names: `limit` reads `referee`, `ticks` reads `minutes`, `tick` reads `minute`.
function endOf(end: RunEnd | undefined): unknown {
	if (end === undefined) return undefined;
	const reason = end.reason === "limit" ? "referee" : end.reason === "ticks" ? "minutes" : end.reason;
	return { reason, minute: end.tick, ...(end.limit === undefined ? {} : { limit: end.limit }) };
}

/**
 * How {@link runOracle} and {@link playOracle} play a file: the installed mechanics of a game in its data form, the
 * prompt lookup, the record sources and the schedulers of the run (`{ turns }` when absent), and the params of a
 * composed story.
 *
 * @public
 */
export interface OracleOptions extends Pick<PlayOptions, "installed" | "prompts" | "records" | "schedulers"> {
	/**
	 * The params of the game family for the dials a composed story was played with (`setup.definition.effective`, the
	 * old `agents`, `minutes`, `classifier`, ...). Read only for a file with `setup.definition`; the family's
	 * defaults when absent.
	 */
	readonly dials?: (effective: unknown) => Readonly<Record<string, unknown>>;
}

// The params of a composed story's dials, as an option of `play` and of game resolution.
function paramsOf(oracle: Oracle, dials: OracleOptions["dials"]): { readonly params?: Readonly<Record<string, unknown>> } {
	const definition = oracle.setup.definition;
	return definition === undefined || dials === undefined ? {} : { params: dials(definition.effective) };
}

/**
 * Plays `game` from the oracle's inputs, as {@link runOracle} does, and gives the played run instead of the
 * differences: for a test that reads the new log, such as the metrics of a mechanic over the replay of a file. The
 * game is played by its own scheduler with the seed of the oracle, for `setup.minutes` ticks (a file with `truncated`:
 * for `truncated.afterMinute + 1` ticks); at its n-th activation a resident makes the calls that follow its n-th
 * `turn` entry in the file (a Director: its n-th `core.overseer_called`), and the replay of a live run is pending
 * after a turn with a call.
 *
 * @param oracle - The oracle, as `readOracle` gave it.
 * @param game - The game, in its builder form or its data form.
 * @param options - The installed mechanics of a game in its data form, the prompt lookup, the record sources and the dials.
 * @returns The played run: the kernel, the end, and every event of the new log.
 * @throws SwtError `SWT-T002` for an oracle the runner does not play (as {@link runOracle}). Also what `play` throws.
 * @example
 * ```ts
 * const { events } = await playOracle(readOracle("oracles/liars-dice/liars-dice-s7.json"), liarsDiceGame());
 * ```
 *
 * @public
 */
export async function playOracle(oracle: Oracle, game: Game | GameData, options: OracleOptions = {}): Promise<Played> {
	const reason = unsupported(oracle);
	if (reason !== undefined) throw oracleError("SWT-T002", `the oracle \`${oracle.variant}\` with the seed ${String(oracle.seed)} ${reason}`, "Compare this file once the game that needs it is ported; the oracle runner is extended in that issue.");
	// A cut file is played to the end of the tick of its cut.
	const ticks = oracle.truncated === undefined ? oracle.setup.minutes : oracle.truncated.afterMinute + 1;
	const { dials, ...rest } = options;
	return play(game, { ...rest, ...paramsOf(oracle, dials), seed: oracle.seed, ticks, drivers: driversOf(oracle) });
}

/**
 * Plays `game` from the oracle's inputs and compares up to `level`. The game is played by its own scheduler with
 * the seed of the oracle, for `setup.minutes` ticks (a file with `truncated`: for `truncated.afterMinute + 1` ticks,
 * compared up to the file's last entry and without the end); at its n-th activation a resident makes the calls that follow
 * its n-th `turn` entry in the file, and never reads a reply; the replay of a live run is pending after a turn with
 * a call, as the recorded model was. Before the run the resolved game is compared with `setup`; the options a
 * file states for a mechanic are filled with the defaults of the mechanic's own `parseOptions` and compared whole
 * and deep (stated options that do not parse are a setup mismatch). After the run the log is folded with
 * `timelineOf` and compared entry by entry.
 *
 * A composed story (`setup.definition`, the City of Keys and Whispers; `12-m5-spec.md` 3.4) is played with the
 * params `options.dials` gives for its effective dials. Its options (`null`) and its order `custom` (the old
 * arena's rule) are not compared as setup. A Director is driven as a resident is: at its n-th activation it calls `take`, then the
 * calls that follow its n-th `core.overseer_called`; `gamemaker` reads `director:gamemaker`, `overseer:<name>`
 * reads `director:<name>`. Its activation is compared by its count per tick and its calls; `core.role_asked` and
 * `core.role_answered` are compared at level 1 with the records of the answerer port; a `core.guard_verdict` of the
 * city's check or of a run without a guard model writes no line here and is skipped. A call of `script` is the
 * game's own staged call and is not driven.
 *
 * @param oracle - The oracle, as `readOracle` gave it.
 * @param game - The game, in its builder form or its data form.
 * @param level - 1 rules, 2 also texts, 3 also scheduling; 3 when absent.
 * @param options - The installed mechanics of a game in its data form, the prompt lookup, the record sources and the dials.
 * @returns The differences: every field of the setup that differs, the first difference of each kind in the
 * timeline with the lowest level at which it shows, and the end. An empty list is a match.
 * @throws SwtError `SWT-T002` for an oracle the runner does not play: a `resume` entry, a call of an actor that is
 * no resident, Director or `script`, the turn order `custom` outside a composed story, a `core.guard_verdict` of
 * the guard's model, or a `core` event the runner does not map. Also what `play` throws.
 * @example
 * ```ts
 * const mismatches = await runOracle(readOracle("oracles/tictactoe/tictactoe-teams-s7.json"), game);
 * ```
 *
 * @public
 */
export async function runOracle(oracle: Oracle, game: Game | GameData, level: OracleLevel = 3, options: OracleOptions = {}): Promise<readonly OracleMismatch[]> {
	const prompts = options.prompts ?? createPromptLookup();
	const played = await playOracle(oracle, game, { ...options, prompts });
	const { installed, records } = options;
	const resolved = resolveGame({ game, schedulers: options.schedulers ?? { turns }, prompts, seed: oracle.seed, ...(installed === undefined ? {} : { installed }), ...(records === undefined ? {} : { records }), ...paramsOf(oracle, options.dials) });
	// What the run wrote after the last entry of a cut file is not compared, nor is the end; a line the file has and this platform does not write is not counted.
	const cut = oracle.truncated;
	const timeline = timelineOf(played.events);
	const end = endOf(played.end);
	const stated = statedSetup(oracle, definitionsOf(game, installed));
	return [
		...setupMismatches(stated, resolvedSetup(resolved, stated, composed(oracle))),
		...timelineMismatches(oracle.timeline, cut === undefined ? timeline : timeline.slice(0, oracle.timeline.filter((entry) => !unwritten(entry)).length), level),
		...(cut !== undefined || Value.Equal(oracle.end, end) ? [] : [{ level: 1, at: "end", index: -1, expected: oracle.end, actual: end } as const]),
	];
}
