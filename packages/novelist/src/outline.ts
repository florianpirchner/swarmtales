/**
 * The outline (model): a planner reads the casting, the turning points, the
 * beats, the chronicle and the evidence log and answers in JSON with the
 * chapters. The answer is untrusted: it is parsed with typebox, every cited
 * `seq` must exist, every POV must be a cast figure, and turning points no
 * chapter cites are reported as warnings.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { evidenceLines } from "../digest/chronicle.ts";
import { cite } from "../digest/timeline.ts";
import { turningPoints, type TurningPoint } from "../digest/turning-points.ts";
import type { Casting } from "./casting.ts";
import type { OutlineChapter } from "./chapter.ts";
import { excerpt } from "../digest/relationships.ts";
import { dossier } from "./packs.ts";
import { buildOutlinePrompt, GAMEMAKER_POV, OUTLINE_SYSTEM_PROMPT, type GlossaryEntry } from "./prompts.ts";
import { Names, type NovelSource } from "./source.ts";

export type { OutlineChapter };

export interface Outline {
	readonly title: string;
	readonly chapters: readonly OutlineChapter[];
	/** Game terms and the story's words for them, used by every writer. */
	readonly glossary: readonly GlossaryEntry[];
	/** What the prologue tells; empty when the planner gave nothing. */
	readonly prologue: readonly string[];
	/** Turning points no chapter cites. */
	readonly uncovered: readonly TurningPoint[];
	/** What was dropped or corrected in the model's answer. */
	readonly warnings: readonly string[];
}

export class OutlineError extends Error {
	override readonly name = "OutlineError";
}

export interface OutlineOptions {
	readonly words: number;
	readonly maxEvidenceChars: number;
	readonly excerptChars: number;
	readonly maxChronicleChars: number;
	readonly figureChars: number;
}

export const DEFAULT_OUTLINE_OPTIONS: OutlineOptions = { words: 6_000, maxEvidenceChars: 80_000, excerptChars: 300, maxChronicleChars: 20_000, figureChars: 1_500 };

/** About one chapter per thousand words, at least 3 and at most 12. */
export function chapterCount(words: number): number {
	return Math.min(12, Math.max(3, Math.round(words / 1_000)));
}

/** The most chapters an outline may have: twice the planned count. */
export function maxChaptersFor(words: number): number {
	return 2 * chapterCount(words);
}

/** The prompt of the outline call; the dry run prints its size. */
export function buildOutlineRequest(source: NovelSource, casting: Casting, options: OutlineOptions = DEFAULT_OUTLINE_OPTIONS): { readonly system: string; readonly prompt: string } {
	const { analysis } = source;
	const names = new Names(analysis.facts.names);
	const evidence = evidenceLines(analysis.facts.events, { maxEvidenceChars: options.maxEvidenceChars, excerptChars: options.excerptChars });
	const chronicle = source.chronicle === undefined ? undefined : source.chronicle.slice(0, options.maxChronicleChars);
	const prompt = buildOutlinePrompt({
		run: analysis.run,
		...(analysis.info.storyTitle === undefined ? {} : { storyTitle: analysis.info.storyTitle }),
		words: options.words,
		chapters: chapterCount(options.words),
		lastMinute: lastMinute(source),
		residents: analysis.facts.agents.map((agent) => names.labelled(agent)),
		acts: analysis.acts.spans,
		povs: casting.povs.map((pov) => ({
			agent: pov.agent,
			label: names.labelled(pov.agent),
			role: ROLE_TEXT[pov.role],
			dossier: dossier(source, pov, Number.MAX_SAFE_INTEGER, options.figureChars),
		})),
		turningPoints: turningPoints(analysis.facts.events).map((point) => ({ ...point, text: names.apply(point.text) })),
		beats: analysis.beats.map((beat) => `- ${beat.id} ${beat.kind} (minute ${String(beat.minute)}): ${names.apply(beat.summary)} Evidence: ${cite(beat.evidence)}.`),
		...(chronicle === undefined ? {} : { chronicle }),
		evidence: evidence.lines.map((line) => names.apply(line)),
		omitted: evidence.omitted,
		...(source.world === undefined ? {} : { world: source.world }),
		gamemaker: gamemakerBrief(source, names, options.excerptChars),
	});
	return { system: OUTLINE_SYSTEM_PROMPT, prompt };
}

/**
 * The gamemaker's arc in brief for the planner: his summaries, his moves,
 * the refusals he met and the notes the Guard stopped, one line each.
 */
export function gamemakerBrief(source: NovelSource, names: Names, excerptChars: number): readonly string[] {
	const { gamemaker } = source;
	const cut = (text: string): string => JSON.stringify(excerpt(names.apply(text), excerptChars));
	const lines = [
		...gamemaker.summaries.map((entry) => ({ seq: entry.seq, line: `#${String(entry.seq)} m${String(entry.minute)} his summary: ${cut(entry.text)}` })),
		...gamemaker.moves.map((move) => ({ seq: move.seq, line: `#${String(move.seq)} m${String(move.minute)} his move ${move.tool}: ${cut(move.text)}` })),
		...gamemaker.defied.map((entry) => ({ seq: entry.seq, line: `#${String(entry.seq)} m${String(entry.minute)} ${names.of(entry.agent)} refused his order: ${cut(entry.reason)}` })),
		...gamemaker.refused.map((move) => ({ seq: move.seq, line: `#${String(move.seq)} m${String(move.minute)} the city refused his ${move.tool}: ${cut(move.text)}` })),
	];
	return lines.sort((a, b) => a.seq - b.seq).map((entry) => entry.line);
}

const ROLE_TEXT = {
	winner: "the winner",
	loser: "the one who lost (exiled or last)",
	turn: "someone whose story turns",
	weight: "much happens to this figure",
} as const;

export function lastMinute(source: NovelSource): number {
	return source.analysis.facts.events.reduce((max, event) => Math.max(max, event.minute), 0);
}

const AnswerSchema = Type.Object({
	title: Type.String(),
	glossary: Type.Optional(Type.Array(Type.Object({ term: Type.String(), story: Type.String() }))),
	prologue: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
	chapters: Type.Array(
		Type.Object({
			pov: Type.String(),
			title: Type.String(),
			minutes: Type.Array(Type.Integer(), { minItems: 2, maxItems: 2 }),
			question: Type.Optional(Type.String()),
			beats: Type.Union([Type.Array(Type.String()), Type.String()]),
			// Models sometimes write "#123"; such strings are read as seq numbers.
			evidence: Type.Array(Type.Union([Type.Integer(), Type.String()])),
		}),
	),
});

type Answer = Static<typeof AnswerSchema>;

/** Validates the model's answer against the run and the casting. */
export function interpretOutline(source: NovelSource, casting: Casting, answer: string, options: { readonly words: number } = DEFAULT_OUTLINE_OPTIONS): Outline {
	const parsed = parseAnswer(answer);
	const { analysis } = source;
	const names = analysis.facts.names;
	const povIds = casting.povs.map((pov) => pov.agent);
	const byName = new Map(povIds.map((agent) => [(names.get(agent) ?? agent).toLowerCase(), agent]));
	const end = lastMinute(source);
	const warnings: string[] = [];
	const chapters: OutlineChapter[] = [];

	// Every chapter is one writer call: a runaway outline must not multiply the cost.
	const maxChapters = maxChaptersFor(options.words);
	for (const [index, chapter] of parsed.chapters.entries()) {
		const where = `chapter ${String(index + 1)} ("${chapter.title}")`;
		if (chapters.length >= maxChapters) {
			warnings.push(`${where}: more than ${String(maxChapters)} chapters; chapter dropped`);
			continue;
		}
		const idInText = /\bA\d+\b/.exec(chapter.pov)?.[0];
		const pov = /gamemaker/i.test(chapter.pov)
			? GAMEMAKER_POV
			: idInText !== undefined && povIds.includes(idInText)
				? idInText
				: byName.get(chapter.pov.trim().toLowerCase());
		if (pov === undefined) {
			warnings.push(`${where}: "${chapter.pov}" is not a point-of-view figure; chapter dropped`);
			continue;
		}
		const cited = chapter.evidence.flatMap((entry) => {
			const seq = typeof entry === "number" ? entry : Number(/^\s*#?(\d+)\s*$/.exec(entry)?.[1] ?? Number.NaN);
			return Number.isSafeInteger(seq) ? [seq] : [];
		});
		if (cited.length < chapter.evidence.length) warnings.push(`${where}: ${String(chapter.evidence.length - cited.length)} evidence entries are no seq number; they were dropped`);
		const unknown = cited.filter((seq) => !analysis.seqs.has(seq));
		if (unknown.length > 0) warnings.push(`${where}: cites unknown events ${cite(unknown)}; they were dropped`);
		const evidence = [...new Set(cited.filter((seq) => analysis.seqs.has(seq)))].sort((a, b) => a - b);
		if (evidence.length === 0) {
			warnings.push(`${where}: cites no known event; chapter dropped`);
			continue;
		}
		const [first = 0, second = end] = chapter.minutes;
		const from = clamp(Math.min(first, second), 0, end);
		const to = clamp(Math.max(first, second), 0, end);
		const beats = (typeof chapter.beats === "string" ? [chapter.beats] : chapter.beats).map((beat) => beat.trim()).filter((beat) => beat.length > 0);
		// The gamemaker's chapters show the same hours from above; only the residents' chapters must not overlap.
		const previous = pov === GAMEMAKER_POV ? undefined : chapters.filter((other) => other.pov !== GAMEMAKER_POV).at(-1);
		// The planner is asked not to overlap (a shared boundary minute is fine); an overlap is kept (the writer still has the minutes) but reported.
		if (previous !== undefined && from < previous.to) warnings.push(`${where}: minutes ${String(from)}-${String(to)} overlap the chapter before (${String(previous.from)}-${String(previous.to)})`);
		if (chapters.at(-1)?.pov === pov) warnings.push(`${where}: the same point of view as the chapter before`);
		const question = chapter.question?.trim();
		chapters.push({ number: chapters.length + 1, pov, title: chapter.title.trim(), from, to, beats, ...(question === undefined || question.length === 0 ? {} : { question }), evidence });
	}
	if (chapters.length === 0) throw new OutlineError(`The outline has no usable chapter${warnings.length === 0 ? "" : `: ${warnings.join("; ")}`}`);

	const cited = new Set(chapters.flatMap((chapter) => chapter.evidence));
	const uncovered = turningPoints(analysis.facts.events).filter((point) => !cited.has(point.seq));
	for (const point of uncovered) warnings.push(`turning point #${String(point.seq)} is not covered by any chapter: ${point.text}`);
	const title = parsed.title.trim();
	const glossary = (parsed.glossary ?? []).map((entry) => ({ term: entry.term.trim(), story: entry.story.trim() })).filter((entry) => entry.term.length > 0 && entry.story.length > 0);
	const prologue = (typeof parsed.prologue === "string" ? [parsed.prologue] : (parsed.prologue ?? [])).map((beat) => beat.trim()).filter((beat) => beat.length > 0);
	return { title: title.length === 0 ? analysis.run : title, chapters, glossary, prologue, uncovered, warnings };
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function parseAnswer(answer: string): Answer {
	const start = answer.indexOf("{");
	const end = answer.lastIndexOf("}");
	if (start < 0 || end <= start) throw new OutlineError("The outline model did not answer with a JSON object");
	let value: unknown;
	try {
		value = JSON.parse(answer.slice(start, end + 1));
	} catch {
		throw new OutlineError("The outline model's answer is not valid JSON");
	}
	if (!Check(AnswerSchema, value)) throw new OutlineError("The outline model's answer does not have the expected shape");
	return value;
}

/** The outline as lines for the writer's and editor's prompts, with names. */
export function outlineSummary(outline: Outline, names: Names): readonly string[] {
	return outline.chapters.map((chapter) => `${String(chapter.number)}. "${chapter.title}" (${povName(chapter.pov, names)}): ${chapter.beats.map((beat) => names.apply(beat)).join(" ")}`);
}

/** "the Gamemaker" or the resident's name. */
export function povName(pov: string, names: Names): string {
	return pov === GAMEMAKER_POV ? "the Gamemaker" : names.of(pov);
}
