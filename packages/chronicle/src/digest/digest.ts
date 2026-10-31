/**
 * The deterministic digest of a run directory (SPEC 15): reads
 * `events.jsonl` and `000-run.json`, runs every detector, builds the
 * relationship graph and writes `digest/beats.json`,
 * `digest/relationships.json` and `digest/timeline.md`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { mapActs, type ActMap } from "./acts.ts";
import { numberBeats, type Beat } from "./beats.ts";
import { DEFAULT_DETECTOR_OPTIONS, runDetectors, type DetectorOptions } from "./detectors/index.ts";
import { parseEventLog, parseRunMetadata, type RunInfo } from "./event-log.ts";
import { buildFacts, type RunFacts } from "./facts.ts";
import { buildRelationships, type RelationshipGraph } from "./relationships.ts";
import { renderTimeline } from "./timeline.ts";

export const DIGEST_DIRECTORY = "digest";
export const DIGEST_FILES = {
	beats: "beats.json",
	relationships: "relationships.json",
	timeline: "timeline.md",
	chronicle: "chronicle.md",
} as const;

export class DigestError extends Error {
	override readonly name = "DigestError";
}

/** Everything the digest knows about one run, before anything is written. */
export interface RunAnalysis {
	readonly run: string;
	readonly info: RunInfo;
	readonly facts: RunFacts;
	readonly acts: ActMap;
	/** Deterministic beats. */
	readonly beats: readonly Beat[];
	/** Every `seq` in the log, valid evidence references. */
	readonly seqs: ReadonlySet<number>;
	/** Unusable lines of the log. */
	readonly issues: readonly string[];
}

/** Analyses the texts of `events.jsonl` and (optionally) `000-run.json`. Pure. */
export function analyzeLog(run: string, eventsJsonl: string, metadataJson?: string, options: DetectorOptions = DEFAULT_DETECTOR_OPTIONS): RunAnalysis {
	const log = parseEventLog(eventsJsonl);
	const info = metadataJson === undefined ? { acts: [] } : parseRunMetadata(metadataJson);
	const facts = buildFacts(log.events);
	const acts = mapActs(log.events, info.acts);
	const beats = numberBeats(runDetectors(facts, options), "deterministic", (minute) => acts.actOf(minute));
	return { run: info.run ?? run, info, facts, acts, beats, seqs: log.seqs, issues: log.issues };
}

/** Reads a run directory. */
export function analyzeRun(directory: string, options?: DetectorOptions): RunAnalysis {
	const eventsPath = join(directory, "events.jsonl");
	if (!existsSync(eventsPath)) throw new DigestError(`No events.jsonl in ${directory}`);
	const metadataPath = join(directory, "000-run.json");
	const metadata = existsSync(metadataPath) ? readFileSync(metadataPath, "utf8") : undefined;
	return analyzeLog(basename(directory), readFileSync(eventsPath, "utf8"), metadata, options);
}

export interface DigestDocuments {
	readonly beats: string;
	readonly relationships: string;
	readonly timeline: string;
	readonly graph: RelationshipGraph;
	readonly allBeats: readonly Beat[];
}

/** Renders the digest files; `narrative` beats come from the optional chronicle pass. */
export function renderDigest(analysis: RunAnalysis, narrative: readonly Beat[] = []): DigestDocuments {
	const allBeats = [...analysis.beats, ...narrative].sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
	const graph = buildRelationships(analysis.facts, allBeats);
	const beats = {
		run: analysis.run,
		...(analysis.info.storyTitle === undefined ? {} : { story: analysis.info.storyTitle }),
		layers: narrative.length > 0 ? ["deterministic", "narrative"] : ["deterministic"],
		acts: analysis.acts.spans,
		counts: countByKind(allBeats),
		beats: allBeats,
		issues: analysis.issues,
	};
	const relationships = { run: analysis.run, residents: graph.residents, pairs: graph.pairs };
	return {
		beats: `${JSON.stringify(beats, null, 2)}\n`,
		relationships: `${JSON.stringify(relationships, null, 2)}\n`,
		timeline: renderTimeline(
			{ run: analysis.run, ...(analysis.info.storyTitle === undefined ? {} : { storyTitle: analysis.info.storyTitle }) },
			analysis.facts,
			analysis.acts,
			allBeats,
		),
		graph,
		allBeats,
	};
}

export interface WrittenDigest {
	readonly directory: string;
	readonly beats: string;
	readonly relationships: string;
	readonly timeline: string;
	readonly documents: DigestDocuments;
}

/** Writes `digest/beats.json`, `digest/relationships.json` and `digest/timeline.md`. */
export function writeDigest(runDirectory: string, analysis: RunAnalysis, narrative: readonly Beat[] = []): WrittenDigest {
	const directory = join(runDirectory, DIGEST_DIRECTORY);
	mkdirSync(directory, { recursive: true });
	const documents = renderDigest(analysis, narrative);
	const paths = {
		beats: join(directory, DIGEST_FILES.beats),
		relationships: join(directory, DIGEST_FILES.relationships),
		timeline: join(directory, DIGEST_FILES.timeline),
	};
	writeFileSync(paths.beats, documents.beats);
	writeFileSync(paths.relationships, documents.relationships);
	writeFileSync(paths.timeline, documents.timeline);
	return { directory, ...paths, documents };
}

function countByKind(beats: readonly Beat[]): Readonly<Record<string, number>> {
	const counts: Record<string, number> = {};
	for (const beat of beats) counts[beat.kind] = (counts[beat.kind] ?? 0) + 1;
	return counts;
}
