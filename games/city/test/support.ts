// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Shared by the oracle tests: the game of a file's dials, and the registered changes against the files
 * (`oracles/cityofkeys/README.md`, "Registered changes of the game"), applied to the file before the comparison. Each
 * change moves entries of the file to the place the recut gives them or names the source of an input line; within
 * one source the order stays the file's, and no payload is changed. The changes that Whispers registered for the
 * same mechanics (`games/whispers/test/support.ts`) hold here too: the receipts of a solved level and of delivered
 * messages, and the look after the tick start.
 */
import { join } from "node:path";
import type { Oracle, OracleEntry } from "@swarmtales/testkit";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { cityGameOf, CityParams } from "../game.ts";
import type { CityData } from "../src/compose.ts";
import { CITY } from "../src/story.ts";

/** The folder of the oracle files of the game. */
export const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "cityofkeys");

const Effective = Type.Object(
	{
		agents: Type.Integer(),
		minutes: Type.Integer(),
		startLevel: Type.Integer(),
		lastLevel: Type.Integer(),
		passesPerMinute: Type.Integer(),
		activation: Type.Literal("always"),
		stopWhenDone: Type.Boolean(),
		stopWhenSeatsDecided: Type.Boolean(),
		personas: Type.Boolean(),
		gamemaker: Type.Boolean(),
		classifier: Type.Boolean(),
		names: Type.Boolean(),
		coreMotives: Type.Boolean(),
		figureDirection: Type.Integer(),
		gmDirection: Type.Integer(),
	},
	{ description: "The dials of an oracle file that are params of the family" },
);

/**
 * The game of a file: the params of its dials (`setup.definition.effective`).
 *
 * @param oracle - The file.
 * @param story - The story data of its setup: the shipped City, or the reduced City of the burn file.
 * @returns The game.
 */
// `Value.Default` fills the defaults into the value it is given, so it gets a copy: the oracle a test read stays as
// it was for the tests after it, in any order (M6-15).
export const gameOf = (oracle: Oracle, story: CityData = CITY) => cityGameOf(story, Value.Parse(CityParams, Value.Default(CityParams, Value.Clone(Value.Parse(Effective, oracle.setup.definition?.effective)))));

type Is = (entry: OracleEntry | undefined) => boolean;

const field = (payload: unknown, name: string): unknown => (typeof payload === "object" && payload !== null ? Reflect.get(payload, name) : undefined);
const isEvent = (source: string, type: string, where: (payload: unknown) => boolean = () => true): Is => (entry) => entry?.k === "event" && entry.source === source && entry.type === type && where(entry.payload);
const isReceipt = (kind: string): Is => isEvent("receipts", "receipt_issued", (payload) => field(payload, "kind") === kind);
const actorOf = (entry: OracleEntry | undefined): string | undefined => (entry?.k === "event" || entry?.k === "call" ? entry.actor : undefined);

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

const isGoalDeal: Is = (entry) => isEvent("goals", "goal_dealt")(entry) || isEvent("channels", "notice", (payload) => String(field(payload, "text")).startsWith("The city deals you a secret goal"))(entry);

const MOVES: readonly Move[] = [
	// `motives` deals in its `start` and writes `motive_dealt` in its `runStarted`, before the deal of `puzzles` (A86);
	// on `legacy` the puzzles were dealt in the world's constructor, before it.
	{ in: isEvent("motives", "motive_dealt"), move: isEvent("motives", "motive_dealt"), after: isEvent("ledger", "ledger_entry") },
	// A solved level: `progression` writes its events in one go, its listeners follow (the receipt).
	{ in: isReceipt("levelUp"), move: isEvent("progression", "submission"), after: isEvent("progression", "level_entered") },
	{ in: isReceipt("levelUp"), move: isReceipt("levelUp") },
	// The act change: `goals` deals as `act_started` is written, after `progression` wrote the solved level in one go.
	{ in: isEvent("goals", "goal_dealt"), move: isGoalDeal, after: isEvent("progression", "submission") },
	// Several messages delivered as one turn opens: `channels` delivers them all in one step, the listener of `receipts` follows it.
	{ in: isReceipt("dm"), move: isReceipt("dm"), after: isEvent("channels", "notice", (payload) => String(field(payload, "text")).startsWith("DM #")) },
	// An exile (M3, "Order after an exile"): the ledger is a base mechanic and burns the points as `exile.exiled` is
	// written; `puzzles` listens after it and burns the piece.
	{ in: isEvent("puzzles", "factor_burned"), move: isEvent("puzzles", "factor_burned"), after: isEvent("ledger", "ledger_entry", (payload) => String(field(payload, "reason")).startsWith("exiled ")) },
];

const ofGamemaker: Is = (entry) => (entry?.k === "event" || entry?.k === "call") && entry.actor === "gamemaker";
const isStaged: Is = (entry) => entry?.k === "call" && entry.actor === "script";
const ofFrame: Is = (entry) => entry?.k === "event" && (entry.actor === "host" || entry.actor === "script");

// The city's message numbers of the board posts and the gamemaker's notes of a moved span, given out again in the new order.
const NUMBERED: readonly (readonly [Is, string])[] = [
	[isEvent("channels", "board_post"), "postSeq"],
	[isEvent("channels", "gamemaker_note"), "number"],
];
function renumbered(span: readonly OracleEntry[]): readonly OracleEntry[] {
	const numberOf = (entry: OracleEntry): [string, number] | undefined => {
		const key = NUMBERED.find(([is]) => is(entry))?.[1];
		const value = entry.k === "event" && key !== undefined ? field(entry.payload, key) : undefined;
		return key !== undefined && typeof value === "number" ? [key, value] : undefined;
	};
	// A post and its note share one number: the order of first appearance gives the new numbers.
	const old = [...new Set(span.flatMap((entry) => numberOf(entry)?.[1] ?? []))];
	const fresh = new Map(old.map((value, index) => [value, [...old].sort((a, b) => a - b)[index] ?? value]));
	return span.map((entry) => {
		const found = numberOf(entry);
		if (found === undefined || entry.k !== "event") return entry;
		const payload: object = typeof entry.payload === "object" && entry.payload !== null ? entry.payload : {};
		return { ...entry, payload: { ...payload, [found[0]]: fresh.get(found[1]) } };
	});
}

/**
 * The look after round r is taken in the start slot of tick r (J126): the gamemaker's activation, its calls and what
 * they wrote come after the minute entry, the tick-start lines and the staged `directorMinute` with what its rules wrote.
 */
function lookAfterTickStart(timeline: readonly OracleEntry[]): readonly OracleEntry[] {
	const out = [...timeline];
	for (let at = 0; at < out.length; at++) {
		if (!ofGamemaker(out[at])) continue;
		let end = at;
		while (ofGamemaker(out[end])) end++;
		let staged = end + 1;
		while (ofFrame(out[staged])) staged++;
		if (out[end]?.k !== "minute" || !isStaged(out[staged])) continue;
		let tail = staged + 1;
		while (ofFrame(out[tail])) tail++;
		out.splice(at, tail - at, ...renumbered([...out.slice(end, tail), ...out.slice(at, end)]));
		at = tail - 1;
	}
	return out;
}

type Input = Extract<OracleEntry, { k: "turn" }>["inputs"][number];

const RECEIPTS = /^(\d+) receipts?$/;

// The status line with `more` receipts counted on top of the file's count.
function withReceipts(input: Input, more: number): Input {
	const parts = input.text.split(" · ");
	const at = parts.findIndex((part) => RECEIPTS.test(part));
	const count = (at === -1 ? 0 : Number(RECEIPTS.exec(parts[at] ?? "")?.[1])) + more;
	const part = count === 1 ? "1 receipt" : `${String(count)} receipts`;
	if (at === -1) parts.splice(parts.findIndex((line) => line.startsWith("you are ")), 0, part);
	else parts[at] = part;
	const sources = input.source.split("+");
	if (!sources.includes("receipts")) sources.splice(sources.indexOf("ledger") + 1, 0, "receipts");
	return { ...input, text: parts.join(" · "), source: sources.join("+") };
}

/**
 * The receipts of the direct messages delivered as a turn opens: `receipts` now counts them in the status of the same
 * activation; on `legacy` the status part ran before the delivery and counted them from the next one.
 */
function deliveredBefore(timeline: readonly OracleEntry[], at: number, resident: string): number {
	let count = 0;
	for (let back = at - 1; back >= 0 && ofFrame(timeline[back]); back--) {
		const entry = timeline[back];
		if (isReceipt("dm")(entry) && entry?.k === "event" && Reflect.get(Object(field(entry.payload, "parties")), 1) === resident) count++;
	}
	return count;
}

/** J31: each owner writes its line under the task as its own input of kind `task`; the joined line names every source. */
const ADDENDA: readonly (readonly [string, string])[] = [
	["Choose the name the city will know you by", "names"],
	["Marks on this level", "marks"],
];
function taskSource(input: Input): Input {
	if (input.kind !== "task" || input.source !== "progression") return input;
	const lines = input.text.split("\n");
	const owners = ADDENDA.filter(([start]) => lines.some((line) => line.startsWith(start))).map(([, owner]) => owner);
	return { ...input, source: ["progression", ...owners].join("+") };
}

// The names chosen before `at`, by resident id.
function namesBefore(timeline: readonly OracleEntry[], at: number): ReadonlyMap<string, string> {
	const chosen = timeline.slice(0, at).filter(isEvent("names", "name_chosen"));
	return new Map(chosen.flatMap((entry) => (entry.k === "event" ? [[String(field(entry.payload, "agent")), String(field(entry.payload, "name"))] as const] : [])));
}

// The texts of the notices to `resident` since its last turn, as its turn input shows them, in the order of the log.
function noticesBefore(timeline: readonly OracleEntry[], at: number, resident: string): readonly string[] {
	const names = namesBefore(timeline, at);
	const shown = (text: string): string => text.replace(/\bA\d\d\b/g, (id) => names.get(id) ?? id);
	const texts: string[] = [];
	for (let back = at - 1; back >= 0; back--) {
		const entry = timeline[back];
		if (entry?.k === "turn" && entry.resident === resident) break;
		if (isEvent("channels", "notice", (payload) => field(payload, "to") === resident)(entry) && entry?.k === "event") texts.unshift(`[${String(field(entry.payload, "author"))}] ${shown(String(field(entry.payload, "text")))}`);
	}
	return texts;
}

/**
 * The goals of the act change (`MOVES`): the notice of the deal moves after the notices of the solved level on the log,
 * and a turn shows its notices in the order of the log. The notices found on the log keep their slots among the inputs.
 */
function inLogOrder(inputs: readonly Input[], texts: readonly string[]): readonly Input[] {
	const rank = (input: Input): number => (input.kind === "notice" ? texts.indexOf(input.text) : -1);
	const sorted = inputs.filter((input) => rank(input) !== -1).sort((a, b) => rank(a) - rank(b));
	let next = 0;
	return inputs.map((input) => (rank(input) === -1 ? input : (sorted[next++] ?? input)));
}

function turnInputs(timeline: readonly OracleEntry[]): readonly OracleEntry[] {
	return timeline.map((entry, at) => {
		if (entry.k !== "turn") return entry;
		const more = deliveredBefore(timeline, at, entry.resident);
		const inputs = entry.inputs.map(taskSource).map((input) => (input.kind === "status" && more > 0 ? withReceipts(input, more) : input));
		return { ...entry, inputs: [...inLogOrder(inputs, noticesBefore(timeline, at, entry.resident))] };
	});
}

/**
 * The tools of `setup.locked` start locked in the game (`locked`): the progression's locks of them at the run start
 * change nothing, and the kernel writes `tool_locked` only for a change; `legacy` wrote them.
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
		if (isReceipt("dm")(receipt) && isEvent("channels", "notice")(notice) && receipt !== undefined && notice !== undefined) timeline.splice(at, 2, notice, receipt);
	}
	for (const [start, end] of bursts(timeline)) {
		let burst: readonly OracleEntry[] = timeline.slice(start, end);
		for (const rule of MOVES) if (burst.some(rule.in)) burst = moved(burst, rule);
		timeline.splice(start, end - start, ...burst);
	}
	return { ...oracle, timeline: [...withoutLookAfterEnd(turnInputs(lookAfterTickStart(withoutStartLocks(oracle, timeline))))] };
}

/**
 * The look after the last round of a run that `arena` stops as a tick starts (the burn file, minute 31): moved into the
 * start slot of that tick (J126), it comes after the end, and the ended run takes no look.
 */
function withoutLookAfterEnd(timeline: readonly OracleEntry[]): readonly OracleEntry[] {
	const end = timeline.findIndex(isEvent("arena", "run_end"));
	return end === -1 ? timeline : timeline.filter((entry, at) => at <= end || !ofGamemaker(entry));
}
