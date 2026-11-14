// SPDX-License-Identifier: Apache-2.0
/**
 * Finding and loading run folders. A run folder is a folder with an `events.jsonl`; everything
 * else in it is optional (`000-run.json`, `events.chain.jsonl`, `run.pub`, `usage.json`,
 * `analysis.json`, `REPORT.md`, `ANALYSIS.md`, `agents/*.md`). A folder with a `manifest.json` whose
 * log format is the envelope log is a run of the new platform: the envelope reader reads its lines
 * and its header (`envelope.ts`); every other folder is read by the legacy reader, as before.
 */
import { CHAIN_FILE, EVENTS_FILE, GenesisEntrySchema, PUBLIC_KEY_FILE, type ChainGenesis, type ChainGenesisV2 } from "@swarmtales/chain";
import { SwtError, type RunManifest } from "@swarmtales/contracts";
import { Check } from "typebox/value";
import { headerOf, isEnvelopeManifest, MANIFEST_FILE, parseEnvelopes } from "./envelope.ts";
import { type ActorVocabulary, type LoadIssue, parseEvents, type RunEvent } from "./events.ts";
import { isAnyJson, isRunMeta, isUsageFile, parseJsonFile, type RunMeta, type UsageFile } from "./files.ts";
import { optional, readJson } from "./read.ts";
import { joinPath, type RunSource } from "./source.ts";

/** The header of an old run. */
export const RUN_FILE = "000-run.json";
/** Tokens and cost of a run. */
export const USAGE_FILE = "usage.json";
/** The analysis of a run, as JSON. */
export const ANALYSIS_FILE = "analysis.json";
/** The report of a run. */
export const REPORT_FILE = "REPORT.md";
/** The analysis of a run, as text. */
export const ANALYSIS_REPORT_FILE = "ANALYSIS.md";
/** The folder of the actors' transcripts. */
export const AGENTS_DIR = "agents";

/**
 * A run folder as a list shows it, from its small files only (never `events.jsonl`).
 *
 * @public
 */
export interface RunSummary {
	/** The folder, relative to the source root. */
	readonly dir: string;
	/** The name of the run: its folder. */
	readonly name: string;
	/** The name of the game the run played. */
	readonly story?: string;
	/** The title of the game. */
	readonly title?: string;
	/** When the run started (ISO 8601). */
	readonly startedAt?: string;
	/** The number of actors. */
	readonly agents?: number;
	/** The total cost in US dollars, from `usage.json`. */
	readonly costUsd?: number;
	/** Whether the folder has a chain file. */
	readonly signed: boolean;
	/** Whether the folder has a `REPORT.md`. */
	readonly hasReport: boolean;
	/** Set on a row of a listing whose details (story, date, agents, cost) are still being read (`FindRunsOptions.onDetails`). */
	readonly pending?: true;
}

/**
 * An agent's files under `agents/`: the transcript and, when there is one, its system prompt.
 *
 * @public
 */
export interface Transcript {
	/** The name of the actor. */
	readonly agent: string;
	/** The path of the transcript. */
	readonly path: string;
	/** The path of the system prompt. */
	readonly promptPath?: string;
}

/**
 * One run, loaded. The texts the chain is checked over are kept, so `verifyRun` needs no second read.
 *
 * @public
 */
export interface RunModel {
	/** The folder, relative to the root of the source. */
	readonly dir: string;
	/** The name of the run: its folder. */
	readonly name: string;
	/** The run's header: `000-run.json`, or what the manifest of a run of the new platform says. */
	readonly meta?: RunMeta;
	/** The manifest of a run of the new platform; such a run was read by the envelope reader. */
	readonly manifest?: RunManifest;
	/** The chain's genesis entry as written (not verified: `verifyRun` says whether it holds); its `version` tells which one. */
	readonly genesis?: ChainGenesis | ChainGenesisV2;
	/** The events of the log, in file order. */
	readonly events: readonly RunEvent[];
	/** `usage.json`: tokens and cost. */
	readonly usage?: UsageFile;
	/** `analysis.json` as parsed JSON; its shape is the story's own. */
	readonly analysis?: unknown;
	/** `REPORT.md`. */
	readonly report?: string;
	/** `ANALYSIS.md`. */
	readonly analysisReport?: string;
	/** The actors' transcripts under `agents/`. */
	readonly transcripts: readonly Transcript[];
	/** The texts the chain is checked over, as read. */
	readonly texts: { readonly events: string; readonly chain?: string; readonly publicKey?: string; readonly manifest?: string };
	/** What could not be read; the rest of the run is loaded. */
	readonly issues: readonly LoadIssue[];
}

/** Folders a search never enters. */
const SKIPPED = new Set(["node_modules", ".git", "dist", "dist-types"]);

/**
 * What `findRuns` takes beside the folder.
 *
 * @public
 */
export interface FindRunsOptions {
	/** How deep below `dir` to look (default 6). */
	readonly depth?: number;
	/**
	 * Answer from the listing alone: the runs come back at once, marked `pending`, and each run's details
	 * are read afterwards and handed to this callback (a source over the network lists 200 runs at once,
	 * but reads their files one request each).
	 */
	readonly onDetails?: (run: RunSummary) => void;
	/** How many runs' details are read at the same time (default 6). */
	readonly concurrency?: number;
}

// Runs `work` over `items`, at most `limit` at a time.
async function eachLimited<T>(items: readonly T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
	let next = 0;
	const lane = async (): Promise<void> => {
		while (next < items.length) {
			const item = items[next];
			next += 1;
			if (item !== undefined) await work(item);
		}
	};
	await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
}

/**
 * The run folders under `dir` (a folder with `events.jsonl`), in path order, each summarised from
 * `000-run.json` and `usage.json` (or, with `onDetails`, from the listing first). A run folder is not
 * searched further.
 *
 * @param source - Where the files are read from.
 * @param dir - The folder to search, relative to the root of the source.
 * @param options - The depth of the search and how the details are read.
 * @returns The summaries of the run folders, in path order.
 * @public
 */
export async function findRuns(source: RunSource, dir = "", options: FindRunsOptions = {}): Promise<readonly RunSummary[]> {
	const found: { readonly dir: string; readonly names: ReadonlySet<string> }[] = [];
	const visit = async (folder: string, depth: number): Promise<void> => {
		const entries = await source.list(folder);
		const names = new Set(entries.filter((entry) => entry.kind === "file").map((entry) => entry.name));
		if (names.has(EVENTS_FILE)) {
			found.push({ dir: folder, names });
			return;
		}
		if (depth <= 0) return;
		for (const entry of entries) {
			if (entry.kind === "dir" && !SKIPPED.has(entry.name) && !entry.name.startsWith(".")) await visit(joinPath(folder, entry.name), depth - 1);
		}
	};
	await visit(joinPath(dir), options.depth ?? 6);
	found.sort((left, right) => (left.dir < right.dir ? -1 : left.dir > right.dir ? 1 : 0));
	const limit = options.concurrency ?? 6;
	const { onDetails } = options;
	if (onDetails !== undefined) {
		// `summarise` never rejects; a callback that throws must not stop the other runs.
		void eachLimited(found, limit, async (run) => {
			const summary = await summarise(source, run.dir, run.names);
			try {
				onDetails(summary);
			} catch {
				// The caller's own failure; the next run still gets its details.
			}
		});
		return found.map((run) => ({ ...bareSummary(run.dir, run.names), pending: true }));
	}
	const summaries = new Map<string, RunSummary>();
	await eachLimited(found, limit, async (run) => { summaries.set(run.dir, await summarise(source, run.dir, run.names)); });
	return found.flatMap((run) => summaries.get(run.dir) ?? []);
}

function nameOf(dir: string): string {
	return dir.split("/").at(-1) ?? dir;
}

// A run's name: its folder, or the folder above a folder called `run` (`stories/<story>/runs/<name>/run`).
function runName(dir: string): string {
	return nameOf(dir) === "run" && dir.includes("/") ? nameOf(dir.slice(0, dir.lastIndexOf("/"))) : nameOf(dir);
}

// What the listing alone tells about a run folder.
function bareSummary(dir: string, files: ReadonlySet<string>): RunSummary {
	return { dir, name: runName(dir), signed: files.has(CHAIN_FILE), hasReport: files.has(REPORT_FILE) };
}

// The header of a run folder from its small files: the manifest of a run of the new platform, else `000-run.json`.
async function headerIn(source: RunSource, dir: string, files: ReadonlySet<string>, issues: LoadIssue[]): Promise<RunMeta | undefined> {
	if (files.has(MANIFEST_FILE)) {
		const manifest = await readJson(source, joinPath(dir, MANIFEST_FILE), isEnvelopeManifest, issues);
		if (manifest !== undefined) return headerOf(manifest);
	}
	return files.has(RUN_FILE) ? readJson(source, joinPath(dir, RUN_FILE), isRunMeta, issues) : undefined;
}

// The fields of a summary that the header gives; a header without a field leaves it out.
function headerFields(meta: RunMeta | undefined): Pick<RunSummary, "story" | "title" | "startedAt" | "agents"> {
	if (meta === undefined) return {};
	const agents = meta.effective?.agents ?? meta.agents?.length;
	return {
		...(meta.storyId === undefined ? {} : { story: meta.storyId }),
		...(meta.title === undefined ? {} : { title: meta.title }),
		...(meta.startedAt === undefined ? {} : { startedAt: meta.startedAt }),
		...(agents === undefined ? {} : { agents }),
	};
}

// A run's summary; a file that cannot be read leaves its fields out (it never rejects).
async function summarise(source: RunSource, dir: string, files: ReadonlySet<string>): Promise<RunSummary> {
	const issues: LoadIssue[] = [];
	const meta = await headerIn(source, dir, files, issues);
	const usage = files.has(USAGE_FILE) ? await readJson(source, joinPath(dir, USAGE_FILE), isUsageFile, issues) : undefined;
	return {
		...bareSummary(dir, files),
		...headerFields(meta),
		...(usage?.totals.costUsd === undefined ? {} : { costUsd: usage.totals.costUsd }),
	};
}

function genesisOf(chain: string | undefined, issues: LoadIssue[]): ChainGenesis | ChainGenesisV2 | undefined {
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

/** The texts and files beside the log; each is left out of the model when the folder has none. */
interface SideFiles {
	readonly usage: UsageFile | undefined;
	readonly analysis: unknown;
	readonly report: string | undefined;
	readonly analysisReport: string | undefined;
}

async function sideFiles(source: RunSource, at: (name: string) => string, issues: LoadIssue[]): Promise<SideFiles> {
	const [usage, analysis, report, analysisReport] = await Promise.all([
		readJson(source, at(USAGE_FILE), isUsageFile, issues),
		readJson(source, at(ANALYSIS_FILE), isAnyJson, issues),
		optional(() => source.readText(at(REPORT_FILE)), at(REPORT_FILE), issues),
		optional(() => source.readText(at(ANALYSIS_REPORT_FILE)), at(ANALYSIS_REPORT_FILE), issues),
	]);
	return { usage, analysis, report, analysisReport };
}

function sideFields(files: SideFiles): Pick<RunModel, "usage" | "analysis" | "report" | "analysisReport"> {
	return {
		...(files.usage === undefined ? {} : { usage: files.usage }),
		...(files.analysis === undefined ? {} : { analysis: files.analysis }),
		...(files.report === undefined ? {} : { report: files.report }),
		...(files.analysisReport === undefined ? {} : { analysisReport: files.analysisReport }),
	};
}

// The manifest of a run of the new platform, or `undefined` for a folder the legacy reader reads.
function manifestOf(text: string | undefined, file: string, issues: LoadIssue[]): RunManifest | undefined {
	if (text === undefined) return undefined;
	const parsed = parseJsonFile(text, isEnvelopeManifest);
	if ("value" in parsed) return parsed.value;
	issues.push({ file, reason: `${parsed.reason} (not the manifest of an envelope log; the run is read as an old run)` });
	return undefined;
}

// The header and the events of a run: by the envelope reader when the folder has a manifest, else by the legacy reader.
async function readLog(source: RunSource, at: (name: string) => string, events: string, manifest: RunManifest | undefined, options: LoadRunOptions, issues: LoadIssue[]): Promise<{ readonly meta: RunMeta | undefined; readonly events: readonly RunEvent[] }> {
	const file = at(EVENTS_FILE);
	const parsed = manifest === undefined ? parseEvents(events, file, options.actors) : parseEnvelopes(events, file);
	issues.push(...parsed.issues);
	return { meta: manifest === undefined ? await readJson(source, at(RUN_FILE), isRunMeta, issues) : headerOf(manifest), events: parsed.events };
}

function missingLog(file: string): SwtError {
	return new SwtError({
		code: "SWT-L001",
		summary: `${file} is missing`,
		where: { file },
		why: "A run folder is a folder with an events.jsonl; the viewer reads a run from its log.",
		fix: "Open the folder that holds the run's events.jsonl.",
	});
}

/**
 * What {@link loadRun} takes beside the folder.
 *
 * @public
 */
export interface LoadRunOptions {
	/** Actor rules by event type, added to the default actor rules (`DEFAULT_ACTORS`); an old run only. */
	readonly actors?: ActorVocabulary;
}

/**
 * Loads one run folder. A folder whose `manifest.json` names the envelope log is read by the envelope
 * reader, every other folder by the legacy reader. Any unreadable file beside the log becomes an issue.
 *
 * @param source - Where the files are read from.
 * @param dir - The run folder, relative to the root of the source.
 * @param options - The actor rules of the caller, for an old run.
 * @returns The run: its header, its events, the files beside them and the texts the chain is checked over.
 * @throws SwtError `SWT-L001` when the folder's `events.jsonl` is missing; a source that cannot read it rejects with its own error.
 * @public
 */
export async function loadRun(source: RunSource, dir: string, options: LoadRunOptions = {}): Promise<RunModel> {
	const folder = joinPath(dir);
	const at = (name: string): string => joinPath(folder, name);
	const events = await source.readText(at(EVENTS_FILE));
	if (events === undefined) throw missingLog(at(EVENTS_FILE));
	const issues: LoadIssue[] = [];
	const manifestText = await optional(() => source.readText(at(MANIFEST_FILE)), at(MANIFEST_FILE), issues);
	const manifest = manifestOf(manifestText, at(MANIFEST_FILE), issues);
	const [log, files, chain, publicKey, transcripts] = await Promise.all([
		readLog(source, at, events, manifest, options, issues),
		sideFiles(source, at, issues),
		optional(() => source.readText(at(CHAIN_FILE)), at(CHAIN_FILE), issues),
		optional(() => source.readText(at(PUBLIC_KEY_FILE)), at(PUBLIC_KEY_FILE), issues),
		transcriptsOf(source, folder, issues),
	]);
	const genesis = genesisOf(chain, issues);
	return {
		dir: folder,
		name: runName(folder),
		...(log.meta === undefined ? {} : { meta: log.meta }),
		...(manifest === undefined ? {} : { manifest }),
		...(genesis === undefined ? {} : { genesis }),
		events: log.events,
		...sideFields(files),
		transcripts,
		texts: {
			events,
			...(chain === undefined ? {} : { chain }),
			...(publicKey === undefined ? {} : { publicKey }),
			...(manifest === undefined || manifestText === undefined ? {} : { manifest: manifestText }),
		},
		issues,
	};
}
