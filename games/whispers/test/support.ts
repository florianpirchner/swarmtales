// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the oracle tests: the game of a file's dials, and the registered changes against the files
 * (`oracles/whispers/README.md`, "Registered changes against the files"), applied to the file before the
 * comparison. Each change moves entries of the file to the place the recut gives them; within one source the order
 * stays the file's, and no payload is changed.
 */
import { join } from "node:path";
import type { Oracle, OracleEntry } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { whispersGame, WhispersParams } from "../game.ts";

/** The folder of the oracle files of the game. */
export const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "whispers");

const Effective = Type.Object(
	{
		minutes: Type.Integer(),
		lastLevel: Type.Integer(),
		passesPerMinute: Type.Integer(),
		activation: Type.Literal("always"),
		stopWhenDone: Type.Boolean(),
		stopWhenSeatsDecided: Type.Boolean(),
		gamemaker: Type.Boolean(),
		classifier: Type.Boolean(),
		names: Type.Boolean(),
		coreMotives: Type.Boolean(),
		whisperer: Type.Boolean(),
		guards: Type.Boolean(),
		figureDirection: Type.Integer(),
		gmDirection: Type.Integer(),
	},
	{ description: "The dials of an oracle file that are params of the family" },
);

/**
 * The game of a file: the params of its dials (`setup.definition.effective`), `receipts` from its variant.
 *
 * @param oracle - The file.
 * @returns The game.
 */
export const gameOf = (oracle: Oracle) => whispersGame(Value.Parse(WhispersParams, { ...Value.Parse(Effective, oracle.setup.definition?.effective), receipts: oracle.variant !== "whispers-rumours" }));

type Is = (entry: OracleEntry) => boolean;

const isEvent = (source: string, type: string, where: (payload: unknown) => boolean = () => true): Is => (entry) => entry.k === "event" && entry.source === source && entry.type === type && where(entry.payload);
const field = (payload: unknown, name: string): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, name) : undefined);
const isReceipt = (kind: string): Is => isEvent("receipts", "receipt_issued", (payload) => field(payload, "kind") === kind);

const actorOf = (entry: OracleEntry | undefined): string | undefined => (entry?.k === "event" ? entry.actor : undefined);

// The bursts of a timeline: each maximal run of events of one actor, as [start, end) of the indexes.
function bursts(timeline: readonly OracleEntry[]): readonly (readonly [number, number])[] {
	const found: [number, number][] = [];
	for (let at = 0; at < timeline.length; at++) {
		if (timeline[at]?.k !== "event") continue;
		const start = at;
		const actor = actorOf(timeline[at]);
		while (timeline[at + 1]?.k === "event" && actorOf(timeline[at + 1]) === actor) at++;
		found.push([start, at + 1]);
	}
	return found;
}

/** A move within one burst: the entries that `move` matches go right after the last entry that `after` matches (the end of the burst when `after` is absent). */
interface Move {
	readonly move: Is;
	readonly after?: Is;
	/** Only bursts with an entry this matches. */
	readonly in: Is;
}

function moved(burst: readonly OracleEntry[], { move, after }: Move): readonly OracleEntry[] {
	const rest = burst.filter((entry) => !move(entry));
	const at = after === undefined ? rest.length : rest.findLastIndex(after) + 1;
	return at === 0 && after !== undefined ? burst : [...rest.slice(0, at), ...burst.filter(move), ...rest.slice(at)];
}

/** The moves of the registered changes, in the order they are applied. */
const MOVES: readonly Move[] = [
	// `whispers` requires `ledger` and `channels` and has no `before:` (J150): its `whisperer_chosen` follows the deals of `puzzles`.
	{ in: isEvent("whispers", "whisperer_chosen"), move: isEvent("whispers", "whisperer_chosen"), after: isEvent("puzzles", "fragments_dealt") },
	// A solved level: `progression` writes its events in one go, its listeners follow (the script, then the receipt).
	{ in: isReceipt("levelUp"), move: isEvent("progression", "submission"), after: isEvent("progression", "level_entered") },
	{ in: isReceipt("levelUp"), move: isReceipt("levelUp") },
];

// The look after round r is taken in the start slot of tick r (J126): the gamemaker's activation, its calls and
// what they wrote come after the minute entry, the tick-start lines of the mechanics and the staged `directorMinute`.
const ofGamemaker = (entry: OracleEntry | undefined): boolean => (entry?.k === "event" || entry?.k === "call") && entry.actor === "gamemaker";
const isStaged = (entry: OracleEntry | undefined): boolean => entry?.k === "call" && entry.actor === "script";
function lookAfterTickStart(timeline: readonly OracleEntry[]): readonly OracleEntry[] {
	const out = [...timeline];
	for (let at = 0; at < out.length; at++) {
		if (!ofGamemaker(out[at])) continue;
		let end = at;
		while (ofGamemaker(out[end])) end++;
		let staged = end + 1;
		while (out[staged]?.k === "event" && actorOf(out[staged]) === "host") staged++;
		if (out[end]?.k === "minute" && isStaged(out[staged])) out.splice(at, staged + 1 - at, ...out.slice(end, staged + 1), ...out.slice(at, end));
		at = staged;
	}
	return out;
}

type Turn = Extract<OracleEntry, { k: "turn" }>;
type Input = Turn["inputs"][number];

// The owner of each line the old `withAddenda` put under the task, by the line's start (J31, J102, J187).
const ADDENDA: readonly (readonly [string, string])[] = [
	["Choose the name the city will know you by", "names"],
	["Whoever has reached a door", "standoff-tribunal"],
	["Marks for the whole run", "marks"],
];

/** J31: each owner writes its line under the task as its own input of kind `task`; the joined line names every source. */
function taskSource(input: Input): Input {
	if (input.kind !== "task" || input.source !== "progression") return input;
	const lines = input.text.split("\n");
	const owners = ADDENDA.filter(([start]) => lines.some((line) => line.startsWith(start))).map(([, owner]) => owner);
	return { ...input, source: ["progression", ...owners].join("+") };
}

const RECEIPTS = /^(\d+) receipts?$/;

// The status line with `more` receipts counted on top of the file's count.
function withReceipts(input: Input, more: number): Input {
	const parts = input.text.split(" · ");
	const at = parts.findIndex((part) => RECEIPTS.test(part));
	const count = (at === -1 ? 0 : Number(RECEIPTS.exec(parts[at] ?? "")?.[1])) + more;
	const part = count === 1 ? "1 receipt" : `${String(count)} receipts`;
	if (at === -1) parts.splice(parts.findIndex((line) => line.startsWith("DMs ")), 0, part);
	else parts[at] = part;
	const sources = input.source.split("+");
	if (!sources.includes("receipts")) sources.splice(sources.indexOf("channels"), 0, "receipts");
	return { ...input, text: parts.join(" · "), source: sources.join("+") };
}

/**
 * The receipts of the direct messages delivered as a turn opens: `channels` delivers them in its `turnInputs`, and
 * `receipts` requires `channels`, so its status part now counts them in the same activation; on `legacy` the status
 * part (hook order `status`) ran before the delivery (`dm`) and counted them from the next one.
 */
function deliveredBefore(timeline: readonly OracleEntry[], at: number, resident: string): number {
	let count = 0;
	for (let back = at - 1; back >= 0; back--) {
		const entry = timeline[back];
		if (entry?.k !== "event" || entry.actor !== "host") break;
		if (isReceipt("dm")(entry) && field(entry.payload, "parties") instanceof Array && Reflect.get(Object(field(entry.payload, "parties")), 1) === resident) count++;
	}
	return count;
}

function turnInputs(timeline: readonly OracleEntry[]): readonly OracleEntry[] {
	return timeline.map((entry, at) => {
		if (entry.k !== "turn") return entry;
		const more = deliveredBefore(timeline, at, entry.resident);
		const inputs = entry.inputs.map(taskSource).map((input) => (input.kind === "status" && more > 0 ? withReceipts(input, more) : input));
		return { ...entry, inputs };
	});
}

/**
 * The tools of `setup.locked` start locked in the game (`locked`), so the progression's locks of them at the run start
 * change nothing and the kernel writes no `tool_locked` (it writes one only for a change); `legacy` wrote them.
 */
function withoutStartLocks(oracle: Oracle, timeline: readonly OracleEntry[]): readonly OracleEntry[] {
	const first = timeline.findIndex((entry) => entry.k === "minute");
	const locked = new Set(oracle.setup.locked);
	return timeline.filter((entry, at) => at > first || !isEvent("core", "tool_locked", (payload) => locked.has(String(field(payload, "tool"))))(entry));
}

/**
 * The file with the registered changes applied.
 *
 * @param oracle - The file.
 * @returns The file as this platform writes it, up to its registered changes.
 */
export function registered(oracle: Oracle): Oracle {
	const timeline = [...oracle.timeline];
	// The delivery notice names the coming receipt (A64): it comes before `receipts` issues the receipt of the message.
	for (let at = 0; at + 1 < timeline.length; at++) {
		const [receipt, notice] = [timeline[at], timeline[at + 1]];
		if (receipt !== undefined && notice !== undefined && isReceipt("dm")(receipt) && isEvent("channels", "notice")(notice)) timeline.splice(at, 2, notice, receipt);
	}
	for (const [start, end] of bursts(timeline)) {
		let burst: readonly OracleEntry[] = timeline.slice(start, end);
		for (const rule of MOVES) if (burst.some(rule.in)) burst = moved(burst, rule);
		timeline.splice(start, end - start, ...burst);
	}
	return { ...oracle, timeline: [...turnInputs(lookAfterTickStart(withoutStartLocks(oracle, timeline)))] };
}
