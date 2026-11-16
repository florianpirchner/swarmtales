// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Act II against its oracle files (issue M5-47, decision A56). `cityofkeys-act2-s7.json` and
 * `cityofkeys-act2-seal-s7.json` continue the old live run's snapshot `examples/cityofkeys-act1-06a-01/snapshot-L7.json`
 * (`legacy`), whose state has no counterpart here, so they are checked by projection: the game is brought into the
 * situation the snapshot holds and then driven by the files' own calls, and the events of the act are compared.
 *
 * The situation of the snapshot: six residents who passed levels 1 to 7 without a wrong code (80 points each, the
 * start points and the rewards), `A02` 5 points above them and `A05` 5 below (the snapshot's balances), the second act
 * begun at minute 16 (the old run held a door after level 7, `--snapshot-after 7`, and resumed there). Here every
 * resident submits levels 1 to 6 from the facts of `puzzles` at minute 15 and level 7 in its first turn of minute 16,
 * and `A05` transfers 5 points to `A02` at minute 15, so the act begins in the minute the file's does.
 *
 * From minute 16 a resident makes the calls of its turn of the same minute in the file, and the gamemaker those of its
 * look after the same round (taken in the start slot of the next tick here, J126). A number in a call's params (a
 * message or a group) is the file's; it is mapped to the number this run gave the same message or group.
 */
import type { Activation, Envelope, JsonValue, Kernel } from "@swarmtales/contracts";
import { scriptedDriver, type Oracle, type OracleEntry, type PlannedCall, type StandingDrivers } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { CityData } from "../src/compose.ts";
import { CITY } from "../src/story.ts";

/**
 * The story of the Act II files (old `halfCity`, `setup/cityofkeys-act2.story.json`): a target of half the residents,
 * the first tribunal at the latest 14 minutes into the act, and a tribunal as long as the run.
 */
export const ACT2: CityData = { ...CITY, tribunal: { ...CITY.tribunal, targetShare: 1 / 2, maxMinutes: 1000, first: { ...CITY.tribunal.first, latestAfter: 14 } } };

/** The minute the second act begins, as in the files. */
export const ACT_START = 16;

const Solutions = Type.Array(Type.Object({ level: Type.Integer(), agent: Type.String(), code: Type.Union([Type.String(), Type.Null()]) }), { description: "The fact `puzzles.solutions`" });

// The calls that bring a resident into the snapshot's situation.
function actOne(kernel: Kernel, agent: string, tick: number): readonly PlannedCall[] {
	const own = Value.Parse(Solutions, kernel.fact("puzzles.solutions")).filter((entry) => entry.agent === agent && entry.level <= 7);
	const submit = (levels: (level: number) => boolean) => own.filter((entry) => levels(entry.level)).map((entry) => ({ tool: "submitSolution", params: { level: entry.level, code: entry.code } }));
	if (tick === ACT_START - 1) return [...submit((level) => level < 7), ...(agent === "A05" ? [{ tool: "transferPoints", params: { target: "A02", amount: 5 } }] : [])];
	return tick === ACT_START ? submit((level) => level === 7) : [];
}

const field = (payload: unknown, name: string): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, name) : undefined);

// The message and group events and the field that numbers them. One message is known by its type, its author (a
// group by its name), its text with the numbers in it left out, and how many such came before it in the act.
const NUMBERED: readonly (readonly [string, string, string])[] = [
	["dm_sent", "number", "from"],
	["board_post", "postSeq", "author"],
	["group_post", "postSeq", "author"],
	["group_created", "group", "name"],
];

// The number of every message and group of the act (of the file, or of this run's log from the act on), with its key.
function numbers(events: readonly { readonly type: string; readonly payload: unknown }[]): ReadonlyMap<unknown, string> {
	const seen = new Map<string, number>();
	return new Map(
		events.flatMap(({ type, payload }) =>
			NUMBERED.filter(([kind]) => kind === type).map(([, number, by]): [unknown, string] => {
				const key = JSON.stringify([type, field(payload, by), String(field(payload, "text")).replace(/#\d+/g, "#")]);
				seen.set(key, (seen.get(key) ?? 0) + 1);
				return [field(payload, number), `${key}${String(seen.get(key))}`];
			}),
		),
	);
}

const inAct = (log: readonly Envelope[]): readonly Envelope[] => log.filter((event) => event.tick >= ACT_START);

const PARAMS = ["dm", "claim", "groupId"];

/** The calls of a file from the second act on: by actor and tick, with the file's numbers. */
interface Script {
	readonly calls: ReadonlyMap<string, readonly PlannedCall[]>;
	readonly keys: ReadonlyMap<unknown, string>;
}

function scriptOf(oracle: Oracle): Script {
	const calls = new Map<string, PlannedCall[]>();
	let minute = 0;
	for (const entry of oracle.timeline) {
		if (entry.k === "minute") minute = entry.minute;
		if (entry.k !== "call" || entry.actor === "script") continue;
		// The look after round m + 1 closes minute m in the file and opens tick m + 1 here.
		const at = entry.actor === "gamemaker" ? `director:gamemaker@${String(minute + 1)}` : `${entry.actor}@${String(minute)}`;
		calls.set(at, [...(calls.get(at) ?? []), { tool: entry.tool, params: entry.params }]);
	}
	const events = oracle.timeline.flatMap((entry: OracleEntry) => (entry.k === "event" ? [entry] : []));
	return { calls, keys: numbers(events) };
}

// The file's number of a message or group as this run gave it, from the keys of the file and this run's log.
function translator(keys: ReadonlyMap<unknown, string>, log: readonly Envelope[]): (value: unknown) => unknown {
	const ours = new Map([...numbers(inAct(log))].map(([number, key]) => [key, number]));
	return (value) => ours.get(keys.get(value) ?? "") ?? value;
}

// The params of a call with the file's numbers replaced by this run's.
function mapped(params: unknown, of: (value: unknown) => unknown): unknown {
	if (typeof params !== "object" || params === null) return params;
	return Object.fromEntries(Object.entries(params).map(([name, value]: [string, JsonValue]) => [name, PARAMS.includes(name) ? of(value) : value]));
}

const NUMBER_FIELDS = ["dm", "claim", "post", "group", "postSeq", "number"];

/**
 * The file's numbers of messages and groups replaced by those this run gave the same messages and groups, at any
 * depth: in the fields that hold one, and as `#<n>` and `G<n>` in a text.
 *
 * @param oracle - The Act II file.
 * @param log - The run's log.
 * @returns The translation of a value of the file.
 */
export function inRunNumbers(oracle: Oracle, log: readonly Envelope[]): (value: unknown) => unknown {
	const of = translator(scriptOf(oracle).keys, log);
	const text = (value: string): string => value.replace(/#(\d+)/g, (_all, n: string) => `#${String(of(Number(n)))}`).replace(/\bG\d+\b/g, (group) => String(of(group)));
	const walk = (value: unknown, name = ""): unknown => {
		if (NUMBER_FIELDS.includes(name) && (typeof value === "number" || typeof value === "string")) return of(value);
		if (typeof value === "string") return text(value);
		if (Array.isArray(value)) return value.map((item) => walk(item));
		if (typeof value !== "object" || value === null) return value;
		return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, walk(inner, key)]));
	};
	return walk;
}

/**
 * The drivers of a file: the snapshot's situation first, then the file's calls.
 *
 * @param oracle - The Act II file.
 * @returns The drivers, as a function of the kernel.
 */
export function actTwoDrivers(oracle: Oracle): StandingDrivers {
	const script = scriptOf(oracle);
	return (kernel) => {
		const plan = (activation: Activation): readonly PlannedCall[] => {
			const own = script.calls.get(`${activation.actor}@${String(activation.tick)}`) ?? [];
			const of = translator(script.keys, kernel.log.all());
			const calls = own.map((call) => ({ tool: call.tool, params: mapped(call.params, of) }));
			if (activation.actor.startsWith("director:")) return [{ tool: "take", params: {} }, ...calls];
			return [...actOne(kernel, activation.actor.slice("resident:".length), activation.tick), ...calls];
		};
		const driver = scriptedDriver(plan);
		return { resident: driver, director: driver };
	};
}
