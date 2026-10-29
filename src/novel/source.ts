/**
 * The raw material of the novelist (SPEC 15, "Novelist"): the digest's
 * analysis of a run, plus what the digest does not model: the gamemaker's
 * thinking and notes from `events.jsonl`, the residents' figure texts from
 * `cast/`, and the chronicle if one was written. Everything read here is
 * untrusted and parsed with typebox.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { Type } from "typebox";
import { Check } from "typebox/value";
import { analyzeRun, DIGEST_DIRECTORY, DIGEST_FILES, type RunAnalysis } from "../digest/digest.ts";

/** A thought of the gamemaker (the city's game makers). */
export interface GamemakerThought {
	readonly seq: number;
	readonly minute: number;
	readonly text: string;
}

/** A gamemaker note to one resident. */
export interface GamemakerNote {
	readonly seq: number;
	readonly minute: number;
	readonly to: string;
	readonly text: string;
}

export interface GamemakerLog {
	readonly thoughts: readonly GamemakerThought[];
	readonly notes: readonly GamemakerNote[];
}

export interface NovelSource {
	readonly analysis: RunAnalysis;
	readonly gamemaker: GamemakerLog;
	/** The figure text of each resident by ID (from `cast/<ID>-<figure>.md`), when the run has one. */
	readonly figures: ReadonlyMap<string, string>;
	/** `digest/chronicle.md`, when it exists. */
	readonly chronicle?: string;
}

const Base = { seq: Type.Integer({ minimum: 1 }), minute: Type.Integer({ minimum: 0 }) };
const ThinkingSchema = Type.Object({ ...Base, type: Type.Literal("gamemaker_thinking"), text: Type.String() });
const NoteSchema = Type.Object({ ...Base, type: Type.Literal("gamemaker_note"), to: Type.String(), text: Type.String() });

/** The gamemaker's thinking and notes in the text of an `events.jsonl`; other and broken lines are skipped. */
export function parseGamemakerLog(eventsJsonl: string): GamemakerLog {
	const thoughts: GamemakerThought[] = [];
	const notes: GamemakerNote[] = [];
	for (const line of eventsJsonl.split(/\r?\n/)) {
		if (!line.includes('"gamemaker_thinking"') && !line.includes('"gamemaker_note"')) continue;
		let value: unknown;
		try {
			value = JSON.parse(line);
		} catch {
			continue;
		}
		if (Check(ThinkingSchema, value)) thoughts.push({ seq: value.seq, minute: value.minute, text: value.text });
		else if (Check(NoteSchema, value)) notes.push({ seq: value.seq, minute: value.minute, to: value.to, text: value.text });
	}
	thoughts.sort((a, b) => a.seq - b.seq);
	notes.sort((a, b) => a.seq - b.seq);
	return { thoughts, notes };
}

/**
 * The part of a cast file a writer needs: from "Who you are" up to the
 * direction (the orders are game mechanics, not character).
 */
export function figureText(castMarkdown: string): string {
	const start = castMarkdown.indexOf("## Who you are");
	const body = start < 0 ? castMarkdown : castMarkdown.slice(start);
	const end = body.indexOf("## Direction");
	return (end < 0 ? body : body.slice(0, end)).trim();
}

/** Figure texts by resident ID from a run's `cast/` folder. */
export function readFigures(runDirectory: string): ReadonlyMap<string, string> {
	const directory = join(runDirectory, "cast");
	const figures = new Map<string, string>();
	if (!existsSync(directory)) return figures;
	for (const entry of readdirSync(directory).sort()) {
		const match = /^(A\d+)-.*\.md$/.exec(entry);
		const agent = match?.[1];
		if (agent === undefined) continue;
		figures.set(agent, figureText(readFileSync(join(directory, entry), "utf8")));
	}
	return figures;
}

/** Reads a run directory; throws `DigestError` without an `events.jsonl`. */
export function loadNovelSource(runDirectory: string): NovelSource {
	const analysis = { ...analyzeRun(runDirectory), run: runLabel(runDirectory) };
	const gamemaker = parseGamemakerLog(readFileSync(join(runDirectory, "events.jsonl"), "utf8"));
	const chroniclePath = join(runDirectory, DIGEST_DIRECTORY, DIGEST_FILES.chronicle);
	const chronicle = existsSync(chroniclePath) ? readFileSync(chroniclePath, "utf8") : undefined;
	return { analysis, gamemaker, figures: readFigures(runDirectory), ...(chronicle === undefined ? {} : { chronicle }) };
}

/**
 * The run's name for the story's header: the folder name, or the folder
 * above it for a run kept as `<name>/run` (as under `stories/<story>/runs/`).
 */
export function runLabel(runDirectory: string): string {
	const absolute = resolve(runDirectory);
	const name = basename(absolute);
	return name === "run" ? basename(dirname(absolute)) : name;
}

/** Resident names, so the writer never sees a bare ID it could copy into the prose. */
export class Names {
	readonly #names: ReadonlyMap<string, string>;

	constructor(names: ReadonlyMap<string, string>) {
		this.#names = names;
	}

	/** The name of a resident, or its ID in a run without names. */
	of(agent: string): string {
		return this.#names.get(agent) ?? agent;
	}

	/** `Hedda (A03)`, for prompts and audit files. */
	labelled(agent: string): string {
		const name = this.#names.get(agent);
		return name === undefined ? agent : `${name} (${agent})`;
	}

	/** Replaces every known resident ID in a text with its name. */
	apply(text: string): string {
		return text.replace(/\bA\d+\b/g, (id) => this.#names.get(id) ?? id);
	}
}
