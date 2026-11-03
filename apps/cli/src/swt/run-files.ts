/**
 * Reads what a run directory holds for `swt run list|show|cost`: `000-run.json` (dials, story id),
 * `usage.json` (cost), the last lines of `events.jsonl` (how the run ended) and the signed chain.
 * All of it is untrusted input, parsed with Typebox; a missing or broken file leaves its part empty
 * instead of failing, because runs recorded by older versions lack some of them.
 */
import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { CHAIN_FILE, EVENTS_FILE, parseUsageFile, verifyChain, type UsageFile } from "@swarmtales/chronicle";

const MetadataSchema = Type.Object({
	run: Type.Optional(Type.String()),
	startedAt: Type.Optional(Type.String()),
	storyId: Type.Optional(Type.String()),
	provider: Type.Optional(Type.String()),
	model: Type.Optional(Type.String()),
	effective: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
	resumedFrom: Type.Optional(Type.Object({ file: Type.String(), level: Type.Integer(), minute: Type.Integer() })),
});

const EndSchema = Type.Object({
	type: Type.Literal("run_end"),
	minute: Type.Integer(),
	reason: Type.Optional(Type.String()),
	standings: Type.Optional(Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), points: Type.Number(), rank: Type.Integer(), tools: Type.Integer(), activated: Type.Boolean() }))),
});

export type RunEnd = Static<typeof EndSchema>;
export type RunMeta = Static<typeof MetadataSchema>;

export interface RunSummary {
	readonly directory: string;
	readonly name: string;
	readonly meta: RunMeta;
	readonly usage: UsageFile | undefined;
	/** The `run_end` event; undefined while the run goes on, or when it was killed. */
	readonly end: RunEnd | undefined;
	/** The minute of the last event. */
	readonly lastMinute: number | undefined;
	readonly signed: boolean;
}

function readJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined;
	}
}

/** The last lines of a file, without reading all of it (event logs run to many megabytes). */
function tailLines(path: string, bytes = 256 * 1024): readonly string[] {
	const size = statSync(path).size;
	const start = Math.max(0, size - bytes);
	const buffer = Buffer.alloc(size - start);
	const descriptor = openSync(path, "r");
	try {
		readSync(descriptor, buffer, 0, buffer.length, start);
	} finally {
		closeSync(descriptor);
	}
	const lines = buffer.toString("utf8").split(/\r?\n/).filter((line) => line.trim().length > 0);
	// The first line of a chunk that does not start at the file's start may be cut off.
	return start > 0 ? lines.slice(1) : lines;
}

function parseLine(line: string): unknown {
	try {
		return JSON.parse(line);
	} catch {
		return undefined;
	}
}

const MinuteSchema = Type.Object({ minute: Type.Integer() });

/** The directory a reference names: a run directory, the `run/` folder inside a recorded run, or a name under `runsDirectory`. */
export function findRunDirectory(reference: string, runsDirectory: string): string | undefined {
	for (const candidate of [resolve(reference), resolve(runsDirectory, reference)]) {
		for (const directory of [candidate, join(candidate, "run")]) {
			if (existsSync(join(directory, EVENTS_FILE))) return directory;
		}
	}
	return undefined;
}

export function summarizeRun(directory: string): RunSummary {
	const meta = readJson(join(directory, "000-run.json"));
	const usage = existsSync(join(directory, "usage.json")) ? parseUsageFile(readFileSync(join(directory, "usage.json"), "utf8")) : undefined;
	const events = join(directory, EVENTS_FILE);
	const lines = existsSync(events) ? tailLines(events) : [];
	const parsed = lines.map(parseLine);
	const end = parsed.findLast((value): value is RunEnd => Check(EndSchema, value));
	const last = parsed.at(-1);
	return {
		directory,
		name: basename(directory),
		meta: Check(MetadataSchema, meta) ? meta : {},
		usage,
		end,
		lastMinute: Check(MinuteSchema, last) ? last.minute : undefined,
		signed: existsSync(join(directory, CHAIN_FILE)),
	};
}

/** `ok`, a reason it is broken, or `unsigned` for a run recorded without a chain. */
export function chainStatus(summary: RunSummary): string {
	if (!summary.signed) return "unsigned";
	const verdict = verifyChain(summary.directory);
	return verdict.ok ? `ok (${String(verdict.lines)} lines)` : `BROKEN: ${verdict.reason}`;
}

/** Why a run stopped, in a few words. */
export function stopReason(summary: RunSummary): string {
	if (summary.end === undefined) return "no run_end (still running, or killed)";
	return summary.end.reason ?? `completed at minute ${String(summary.end.minute)}`;
}

/** Run directories under `runsDirectory` (`run-001`, ...), oldest first. */
export function listRunDirectories(runsDirectory: string): readonly string[] {
	if (!existsSync(runsDirectory)) return [];
	return readdirSync(runsDirectory)
		.sort()
		.map((entry) => join(runsDirectory, entry))
		.filter((path) => existsSync(join(path, EVENTS_FILE)));
}
