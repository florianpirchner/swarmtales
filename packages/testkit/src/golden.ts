/**
 * Per-mechanic golden gates (review 2c, "Carve plan corrections"): until the turn loop moves (carve
 * step 18) no team can run a whole golden story on the new host, so each team compares the lines
 * its mechanic writes with the golden lines of its own event types. A line is compared without
 * `seq` (the adapter renumbers over what it writes, so a partial run has other numbers) and
 * without the sink's wall clock `at`; the order of the remaining keys is kept, since the golden
 * files are compared byte for byte.
 */
import { readFileSync } from "node:fs";
import { LEGACY_EVENT_OWNERS, legacyOwner, type LegacyOwner } from "@swarmtales/chronicle";

/** One flat line of an old log, parsed. */
export type LegacyLine = Readonly<Record<string, unknown>>;

/** A golden line reduced to what a mechanic must reproduce, in its key order. */
export type GoldenLine = string;

/** A tool call of a golden log with the reply the old engine gave (`tool_call` and its `tool_result`). */
export interface GoldenCall {
	readonly minute: number;
	readonly agent: string;
	readonly tool: string;
	readonly args: unknown;
	readonly isError: boolean | undefined;
	readonly text: string | undefined;
}

/** The first line where two filtered logs differ. */
export interface GoldenMismatch {
	readonly index: number;
	readonly expected: GoldenLine | undefined;
	readonly actual: GoldenLine | undefined;
}

function record(value: unknown, where: string): LegacyLine {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${where}: not an object`);
	return Object.fromEntries(Object.entries(value));
}

/** Parses an old log (`*.events.jsonl`): one flat event per line. */
export function readLegacyLog(path: string): readonly LegacyLine[] {
	return parseLegacyLog(readFileSync(path, "utf8"), path);
}

/** Parses the text of an old log; `where` names it in errors. */
export function parseLegacyLog(text: string, where = "log"): readonly LegacyLine[] {
	return text
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line, index) => record(JSON.parse(line), `${where}:${String(index + 1)}`));
}

/** The old event types the carve plan gives to an owner (LEGACY_EVENT_OWNERS), sorted. */
export function eventTypesOf(owner: LegacyOwner): readonly string[] {
	return Object.entries(LEGACY_EVENT_OWNERS)
		.filter(([, owned]) => owned === owner)
		.map(([type]) => type)
		.sort();
}

function typeOf(line: LegacyLine): string {
	return typeof line.type === "string" ? line.type : "";
}

/** A line without `seq` and `at`, keys in their order, as JSON. */
export function goldenLine(line: LegacyLine): GoldenLine {
	return JSON.stringify(Object.fromEntries(Object.entries(line).filter(([key]) => key !== "seq" && key !== "at")));
}

/** The lines of a log whose type belongs to one of `owners`, reduced to `goldenLine`s. */
export function ownedBy(lines: readonly LegacyLine[], owners: readonly LegacyOwner[]): readonly GoldenLine[] {
	return lines.filter((line) => owners.includes(legacyOwner(typeOf(line)))).map(goldenLine);
}

/** The first difference of two filtered logs, or undefined when they are equal. */
export function compareGolden(expected: readonly GoldenLine[], actual: readonly GoldenLine[]): GoldenMismatch | undefined {
	const length = Math.max(expected.length, actual.length);
	for (let index = 0; index < length; index++) {
		if (expected[index] !== actual[index]) return { index, expected: expected[index], actual: actual[index] };
	}
	return undefined;
}

/**
 * The tool calls of a golden log, each with the reply its agent got next (the old runner writes
 * `tool_result` for the same agent and tool after the call's events). A team replays them on the
 * new host and compares the replies and the owned lines.
 */
export function goldenCalls(lines: readonly LegacyLine[]): readonly GoldenCall[] {
	const calls: { -readonly [K in keyof GoldenCall]: GoldenCall[K] }[] = [];
	const open = new Map<string, number[]>();
	for (const line of lines) {
		const type = typeOf(line);
		if (type !== "tool_call" && type !== "tool_result") continue;
		const agent = typeof line.agent === "string" ? line.agent : "";
		const tool = typeof line.tool === "string" ? line.tool : "";
		const key = `${agent}\u0000${tool}`;
		if (type === "tool_call") {
			const minute = typeof line.minute === "number" ? line.minute : 0;
			open.set(key, [...(open.get(key) ?? []), calls.length]);
			calls.push({ minute, agent, tool, args: line.args, isError: undefined, text: undefined });
			continue;
		}
		const waiting = open.get(key) ?? [];
		const index = waiting.shift();
		const call = index === undefined ? undefined : calls[index];
		if (call === undefined) continue;
		call.isError = typeof line.isError === "boolean" ? line.isError : undefined;
		call.text = typeof line.text === "string" ? line.text : undefined;
	}
	return calls;
}
