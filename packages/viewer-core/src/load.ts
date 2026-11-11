/**
 * Finding and loading run folders. A run folder is a folder with an `events.jsonl`; everything
 * else in it is optional (`000-run.json`, `events.chain.jsonl`, `run.pub`, `usage.json`,
 * `analysis.json`, `REPORT.md`, `ANALYSIS.md`, `agents/*.md`).
 */
import { CHAIN_FILE, EVENTS_FILE, GenesisEntrySchema, PUBLIC_KEY_FILE, type ChainGenesis } from "@swarmtales/chain";
import { Check } from "typebox/value";
import { type ActorVocabulary, type LoadIssue, parseEvents, type RunEvent } from "./events.ts";
import { isAnyJson, isRunMeta, isUsageFile, parseJsonFile, type RunMeta, type UsageFile } from "./files.ts";
import { joinPath, type RunSource } from "./source.ts";

export const RUN_FILE = "000-run.json";
export const USAGE_FILE = "usage.json";
export const ANALYSIS_FILE = "analysis.json";
export const REPORT_FILE = "REPORT.md";
export const ANALYSIS_REPORT_FILE = "ANALYSIS.md";
export const AGENTS_DIR = "agents";

/** A run folder as a list shows it, from its small files only (never `events.jsonl`). */
export interface RunSummary {
	/** The folder, relative to the source root. */
	readonly dir: string;
	readonly name: string;
	readonly story?: string;
	readonly title?: string;
	/** When the run started (ISO 8601). */
	readonly startedAt?: string;
	readonly agents?: number;
	readonly costUsd?: number;
	readonly signed: boolean;
	readonly hasReport: boolean;
}

/** An agent's files under `agents/`: the transcript and, when there is one, its system prompt. */
export interface Transcript {
	readonly agent: string;
	readonly path: string;
	readonly promptPath?: string;
}

/** One run, loaded. The texts the chain is checked over are kept, so `verifyRun` needs no second read. */
export interface RunModel {
	readonly dir: string;
	readonly name: string;
	readonly meta?: RunMeta;
	/** The chain's genesis entry as written (not verified: `verifyRun` says whether it holds). */
	readonly genesis?: ChainGenesis;
	readonly events: readonly RunEvent[];
	readonly usage?: UsageFile;
	/** `analysis.json` as parsed JSON; its shape is the story's own. */
	readonly analysis?: unknown;
	/** `REPORT.md`. */
	readonly report?: string;
	/** `ANALYSIS.md`. */
	readonly analysisReport?: string;
	readonly transcripts: readonly Transcript[];
	readonly texts: { readonly events: string; readonly chain?: string; readonly publicKey?: string };
	readonly issues: readonly LoadIssue[];
}

/** Folders a search never enters. */
const SKIPPED = new Set(["node_modules", ".git", "dist", "dist-types"]);

export interface FindRunsOptions {
	/** How deep below `dir` to look (default 6). */
	readonly depth?: number;
}

/**
 * The run folders under `dir` (a folder with `events.jsonl`), in path order, each summarised from
 * `000-run.json` and `usage.json`. A run folder is not searched further.
 */
export async function findRuns(source: RunSource, dir = "", options: FindRunsOptions = {}): Promise<readonly RunSummary[]> {
	const found: RunSummary[] = [];
	const visit = async (folder: string, depth: number): Promise<void> => {
		const entries = await source.list(folder);
		const names = new Set(entries.filter((entry) => entry.kind === "file").map((entry) => entry.name));
		if (names.has(EVENTS_FILE)) {
			found.push(await summarise(source, folder, names));
			return;
		}
		if (depth <= 0) return;
		for (const entry of entries) {
			if (entry.kind === "dir" && !SKIPPED.has(entry.name) && !entry.name.startsWith(".")) await visit(joinPath(folder, entry.name), depth - 1);
		}
	};
	await visit(joinPath(dir), options.depth ?? 6);
	return found.sort((left, right) => (left.dir < right.dir ? -1 : left.dir > right.dir ? 1 : 0));
}

function nameOf(dir: string): string {
	return dir.split("/").at(-1) ?? dir;
}

/** A run's name: its folder, or the folder above a folder called `run` (`stories/<story>/runs/<name>/run`). */
function runName(dir: string): string {
	return nameOf(dir) === "run" && dir.includes("/") ? nameOf(dir.slice(0, dir.lastIndexOf("/"))) : nameOf(dir);
}

/** An optional read: a source that rejects (a rate limit, a folder that went away) gives an issue, not a failed load. */
async function optional<T>(read: () => Promise<T>, file: string, issues: LoadIssue[]): Promise<T | undefined> {
	try {
		return await read();
	} catch (error) {
		issues.push({ file, reason: `could not be read${error instanceof Error && error.message !== "" ? ` (${error.message})` : ""}` });
		return undefined;
	}
}

async function readJson<T>(source: RunSource, path: string, check: (value: unknown) => value is T, issues: LoadIssue[]): Promise<T | undefined> {
	const text = await optional(() => source.readText(path), path, issues);
	if (text === undefined) return undefined;
	const parsed = parseJsonFile(text, check);
	if ("reason" in parsed) {
		issues.push({ file: path, reason: parsed.reason });
		return undefined;
	}
	return parsed.value;
}

async function summarise(source: RunSource, dir: string, files: ReadonlySet<string>): Promise<RunSummary> {
	const issues: LoadIssue[] = [];
	const meta = files.has(RUN_FILE) ? await readJson(source, joinPath(dir, RUN_FILE), isRunMeta, issues) : undefined;
	const usage = files.has(USAGE_FILE) ? await readJson(source, joinPath(dir, USAGE_FILE), isUsageFile, issues) : undefined;
	const agents = meta?.effective?.agents ?? meta?.agents?.length;
	return {
		dir,
		name: runName(dir),
		...(meta?.storyId === undefined ? {} : { story: meta.storyId }),
		...(meta?.title === undefined ? {} : { title: meta.title }),
		...(meta?.startedAt === undefined ? {} : { startedAt: meta.startedAt }),
		...(agents === undefined ? {} : { agents }),
		...(usage?.totals.costUsd === undefined ? {} : { costUsd: usage.totals.costUsd }),
		signed: files.has(CHAIN_FILE),
		hasReport: files.has(REPORT_FILE),
	};
}

function genesisOf(chain: string | undefined, issues: LoadIssue[]): ChainGenesis | undefined {
	if (chain === undefined) return undefined;
	const first = chain.split("\n", 1)[0] ?? "";
	try {
		const value: unknown = JSON.parse(first);
		if (Check(GenesisEntrySchema, value)) return value.genesis;
	} catch {
		// Reported below.
	}
	issues.push({ file: CHAIN_FILE, line: 1, reason: "not a genesis entry" });
	return undefined;
}

async function transcriptsOf(source: RunSource, dir: string, issues: LoadIssue[]): Promise<readonly Transcript[]> {
	const folder = joinPath(dir, AGENTS_DIR);
	const entries = (await optional(() => source.list(folder), folder, issues)) ?? [];
	const names = new Set(entries.filter((entry) => entry.kind === "file").map((entry) => entry.name));
	return [...names]
		.filter((name) => name.endsWith(".md") && !name.endsWith(".prompt.md"))
		.sort()
		.map((name) => {
			const agent = name.slice(0, -".md".length);
			const prompt = `${agent}.prompt.md`;
			return { agent, path: joinPath(folder, name), ...(names.has(prompt) ? { promptPath: joinPath(folder, prompt) } : {}) };
		});
}

/**
 * Loads one run folder. Throws only when its `events.jsonl` is missing or cannot be read; any other
 * unreadable file becomes an issue. `actors` are added to the default actor rules (`DEFAULT_ACTORS`).
 */
export async function loadRun(source: RunSource, dir: string, options: { readonly actors?: ActorVocabulary } = {}): Promise<RunModel> {
	const folder = joinPath(dir);
	const at = (name: string): string => joinPath(folder, name);
	const events = await source.readText(at(EVENTS_FILE));
	if (events === undefined) throw new Error(`${at(EVENTS_FILE)} is missing`);
	const issues: LoadIssue[] = [];
	const parsed = parseEvents(events, at(EVENTS_FILE), options.actors);
	issues.push(...parsed.issues);
	const [meta, usage, analysis, report, analysisReport, chain, publicKey, transcripts] = await Promise.all([
		readJson(source, at(RUN_FILE), isRunMeta, issues),
		readJson(source, at(USAGE_FILE), isUsageFile, issues),
		readJson(source, at(ANALYSIS_FILE), isAnyJson, issues),
		optional(() => source.readText(at(REPORT_FILE)), at(REPORT_FILE), issues),
		optional(() => source.readText(at(ANALYSIS_REPORT_FILE)), at(ANALYSIS_REPORT_FILE), issues),
		optional(() => source.readText(at(CHAIN_FILE)), at(CHAIN_FILE), issues),
		optional(() => source.readText(at(PUBLIC_KEY_FILE)), at(PUBLIC_KEY_FILE), issues),
		transcriptsOf(source, folder, issues),
	]);
	const genesis = genesisOf(chain, issues);
	return {
		dir: folder,
		name: runName(folder),
		...(meta === undefined ? {} : { meta }),
		...(genesis === undefined ? {} : { genesis }),
		events: parsed.events,
		...(usage === undefined ? {} : { usage }),
		...(analysis === undefined ? {} : { analysis }),
		...(report === undefined ? {} : { report }),
		...(analysisReport === undefined ? {} : { analysisReport }),
		transcripts,
		texts: { events, ...(chain === undefined ? {} : { chain }), ...(publicKey === undefined ? {} : { publicKey }) },
		issues,
	};
}
