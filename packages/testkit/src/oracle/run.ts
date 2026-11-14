// SPDX-License-Identifier: Apache-2.0
/**
 * The oracle runner: plays a game from the inputs of an oracle file under the game's own scheduler and compares
 * what came out with the file, at the three levels of `oracles/README.md` (specification of M1, section 7).
 */
import { nameOf, type ActorDriver, type GameData, type RunEnd } from "@swarmtales/contracts";
import { turns, TurnsOptions } from "@swarmtales/engine";
import { createPromptLookup } from "@swarmtales/prompts";
import { resolveGame, RESIDENT_KIND, type Game, type ResolvedGame } from "@swarmtales/sdk";
import { Value } from "typebox/value";
import { scriptedDriver, type Plan, type PlannedCall } from "../drivers.ts";
import { play, type PlayOptions } from "../play.ts";
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
// The `core` events the runner maps; `referee_intervened` is a rule (level 1), a lock is scheduling (level 3).
const CORE = ["referee_intervened", "tool_locked", "tool_unlocked"];

// What the runner does not play at M1, as the end of the sentence "the oracle ...".
function unsupportedEntry(entry: OracleEntry, index: number): string | undefined {
	if (entry.k === "resume") return `has a \`resume\` entry (timeline[${String(index)}])`;
	if (entry.k === "call" && !entry.actor.startsWith(`${RESIDENT_KIND}:`)) return `has a call of \`${entry.actor}\`, which is no resident (timeline[${String(index)}])`;
	if (entry.k === "event" && entry.source === "core" && !CORE.includes(entry.type)) return `has the platform event \`core.${entry.type}\` (timeline[${String(index)}])`;
	return undefined;
}

function unsupported(oracle: Oracle): string | undefined {
	if (oracle.truncated !== undefined) return "is truncated";
	if (oracle.setup.definition !== undefined) return "has `setup.definition`";
	if (oracle.setup.turns.order !== "seeded") return `has the turn order \`${oracle.setup.turns.order}\``;
	return oracle.timeline.flatMap((entry, index) => unsupportedEntry(entry, index) ?? []).at(0);
}

// The fields of `setup` as the oracle states them; the mechanics as a sorted list of ids and one field of options per id.
function statedSetup({ setup }: Oracle): Fields {
	return {
		residents: setup.residents,
		residentTools: setup.residentTools,
		locked: setup.locked,
		turns: setup.turns,
		minutes: setup.minutes,
		limits: setup.limits ?? {},
		mechanics: setup.mechanics.map((mechanic) => mechanic.id).sort(),
		...Object.fromEntries(setup.mechanics.map((mechanic) => [`options.${mechanic.id}`, mechanic.options])),
	};
}

// The same fields read from the resolved game, under the oracle's names.
function resolvedSetup({ definition }: ResolvedGame): Fields {
	const shown = (tools: readonly string[] | undefined): readonly string[] => (tools ?? []).map((tool) => (Object.hasOwn(definition.names, tool) ? definition.names[tool] : undefined) ?? tool);
	const options = definition.scheduler.options;
	const plugins = definition.plugins.filter((plugin) => plugin.id !== ROSTER);
	return {
		residents: definition.actors.filter((actor) => actor.kind === RESIDENT_KIND).map((actor) => nameOf(actor.id)),
		residentTools: shown(definition.grants[RESIDENT_KIND]),
		locked: shown(definition.startLocks[RESIDENT_KIND]),
		turns: Value.Check(TurnsOptions, options) ? { passes: options.passes, blockSize: options.blockSize, activation: options.activation, order: options.order } : options,
		minutes: definition.limits.maxTicks,
		limits: definition.limits.maxCallsPerTick === undefined ? {} : { maxStepsPerMinute: definition.limits.maxCallsPerTick },
		mechanics: plugins.map((plugin) => plugin.id).sort(),
		...Object.fromEntries(plugins.map((plugin) => [`options.${plugin.id}`, plugin.options])),
	};
}

const isRecord = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

// A file holds the options of a mechanic as the game wrote them, the resolved game holds them with the defaults
// filled: an option the file leaves out is not compared (a default that changed shows in the timeline).
function asWritten(key: string, stated: unknown, resolved: unknown): unknown {
	if (!key.startsWith("options.") || !isRecord(stated) || !isRecord(resolved)) return resolved;
	return Object.fromEntries(Object.entries(resolved).filter(([option]) => Object.hasOwn(stated, option)));
}

function setupMismatches(stated: Fields, resolved: Fields): readonly OracleMismatch[] {
	const keys = [...new Set([...Object.keys(stated), ...Object.keys(resolved)])];
	return keys.flatMap((key): OracleMismatch[] => {
		const actual = asWritten(key, stated[key], resolved[key]);
		return Value.Equal(stated[key], actual) ? [] : [{ level: 1, at: "setup", index: -1, expected: { [key]: stated[key] }, actual: { [key]: actual } }];
	});
}

// The calls of each resident, turn by turn: at its n-th activation a resident makes the calls that follow its n-th `turn` entry.
function scriptOf(timeline: readonly OracleEntry[]): Plan {
	const script = new Map<string, PlannedCall[][]>();
	for (const entry of timeline) {
		if (entry.k === "turn") script.set(entry.resident, [...(script.get(entry.resident) ?? []), []]);
		if (entry.k === "call") script.get(entry.actor.slice(entry.actor.indexOf(":") + 1))?.at(-1)?.push({ tool: entry.tool, params: entry.params });
	}
	const played = new Map<string, number>();
	return (activation) => {
		const resident = nameOf(activation.actor);
		const turn = played.get(resident) ?? 0;
		played.set(resident, turn + 1);
		return script.get(resident)?.[turn] ?? [];
	};
}

// The driver of a file. The model of a recorded run owed an answer after every turn in which it called a tool, so
// the replay of a live run is pending after such a turn and is woken again without news; a scripted file never is.
function driverOf(oracle: Oracle): ActorDriver {
	const plan = scriptOf(oracle.timeline);
	if (oracle.source.kind !== "live-replay") return scriptedDriver(plan);
	return async (activation) => {
		const calls = await plan(activation);
		for (const call of calls) await activation.call(call.tool, call.params);
		return { pending: calls.length > 0 };
	};
}

// What one level compares of an entry beyond the level below; undefined: the level does not look at the entry.
function compared(entry: OracleEntry, level: OracleLevel): { readonly at: At; readonly value: unknown } | undefined {
	if (entry.k === "call") return { at: "call", value: level === 1 ? { k: entry.k, actor: entry.actor, tool: entry.tool, ok: entry.ok, code: entry.code, stage: entry.stage } : entry };
	if (entry.k === "event") return level === 3 || entry.source !== "core" || entry.type === "referee_intervened" ? { at: "event", value: entry } : undefined;
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
 * Plays `game` from the oracle's inputs and compares up to `level`. The game is played by its own scheduler with
 * the seed of the oracle, for `setup.minutes` ticks; at its n-th activation a resident makes the calls that follow
 * its n-th `turn` entry in the file, and never reads a reply; the replay of a live run is pending after a turn with
 * a call, as the recorded model was. Before the run the resolved game is compared with
 * `setup` (the options of a mechanic only in the fields the file states); after it the log is folded with `timelineOf` and compared entry by entry.
 *
 * @param oracle - The oracle, as `readOracle` gave it.
 * @param game - The game, in its builder form or its data form.
 * @param level - 1 rules, 2 also texts, 3 also scheduling; 3 when absent.
 * @param options - The installed mechanics of a game in its data form, and the prompt lookup.
 * @returns The differences: every field of the setup that differs, the first difference of each kind in the
 * timeline with the lowest level at which it shows, and the end. An empty list is a match.
 * @throws SwtError `SWT-T002` for an oracle the runner does not play at M1: a `resume` entry, a call of an actor
 * that is no resident, a truncated file, `setup.definition`, the turn order `custom`, or a `core` event other than
 * `tool_locked`, `tool_unlocked` and `referee_intervened`. Also what `play` throws.
 * @example
 * ```ts
 * const mismatches = await runOracle(readOracle("oracles/tictactoe/tictactoe-teams-s7.json"), game);
 * ```
 *
 * @public
 */
export async function runOracle(oracle: Oracle, game: Game | GameData, level: OracleLevel = 3, options: Pick<PlayOptions, "installed" | "prompts"> = {}): Promise<readonly OracleMismatch[]> {
	const reason = unsupported(oracle);
	if (reason !== undefined) throw oracleError("SWT-T002", `the oracle \`${oracle.variant}\` with the seed ${String(oracle.seed)} ${reason}`, "Compare this file once the game that needs it is ported; the oracle runner is extended in that issue.");
	const prompts = options.prompts ?? createPromptLookup();
	const installed = options.installed === undefined ? {} : { installed: options.installed };
	const resolved = resolveGame({ game, schedulers: { turns }, prompts, seed: oracle.seed, ...installed });
	const played = await play(game, { ...installed, prompts, seed: oracle.seed, ticks: oracle.setup.minutes, drivers: { [RESIDENT_KIND]: driverOf(oracle) } });
	const end = endOf(played.end);
	return [
		...setupMismatches(statedSetup(oracle), resolvedSetup(resolved)),
		...timelineMismatches(oracle.timeline, timelineOf(played.events), level),
		...(Value.Equal(oracle.end, end) ? [] : [{ level: 1, at: "end", index: -1, expected: oracle.end, actual: end } as const]),
	];
}
