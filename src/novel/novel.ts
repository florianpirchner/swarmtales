/**
 * The novelist (SPEC 15, "Novelist"): turns a recorded run into a short story
 * based on true events.
 *
 * 1. casting (code) picks the point-of-view figures;
 * 2. the outline (model) plans the chapters, validated against the log;
 * 3. scene packs (code) gather each chapter's material;
 * 4. chapters (model), one call each, with the previous chapter's ending;
 * 5. gamemaker interludes (model) between chapters, from its thinking;
 * 6. an edit pass (model) over the whole text;
 * 7. the appendix (code): the events each chapter rests on.
 *
 * Output: `<run>/novel/story.md`, `outline.json`, `appendix.md`, `packs/NN.md`.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cite } from "../digest/timeline.ts";
import { turningPoints } from "../digest/turning-points.ts";
import { castBook, type Casting } from "./casting.ts";
import { addSpend, MAX_TOKENS, NO_SPEND, NovelRequestError, type NovelModel, type NovelSpend } from "./model.ts";
import { buildOutlineRequest, DEFAULT_OUTLINE_OPTIONS, interpretOutline, outlineSummary, type Outline, type OutlineOptions } from "./outline.ts";
import { buildInterludePack, buildPack, DEFAULT_PACK_OPTIONS, type PackOptions, type ScenePack } from "./packs.ts";
import { Names, type NovelSource } from "./source.ts";
import { editStory, lastParagraphs, writeChapter, writeInterlude } from "./writer.ts";

export const NOVEL_DIRECTORY = "novel";
export const NOVEL_FILES = { story: "story.md", partial: "story.partial.md", outline: "outline.json", appendix: "appendix.md", packs: "packs" } as const;

export const DEFAULT_WORDS = 6_000;

export interface NovelOptions {
	readonly words: number;
	readonly outline: OutlineOptions;
	readonly pack: PackOptions;
}

export const DEFAULT_NOVEL_OPTIONS: NovelOptions = { words: DEFAULT_WORDS, outline: DEFAULT_OUTLINE_OPTIONS, pack: DEFAULT_PACK_OPTIONS };

export const STAGES = ["outline", "chapters", "interludes", "edit"] as const;
export type Stage = (typeof STAGES)[number];
export type StageSpend = Readonly<Record<Stage, NovelSpend>>;

export interface NovelModels {
	readonly outline: NovelModel;
	readonly writer: NovelModel;
}

export interface Interlude {
	/** The chapter it comes before. */
	readonly before: number;
	readonly text: string;
	readonly seqs: readonly number[];
}

export interface WrittenChapter {
	readonly number: number;
	readonly text: string;
}

export interface Novel {
	readonly casting: Casting;
	readonly outline: Outline;
	readonly packs: readonly ScenePack[];
	readonly chapters: readonly WrittenChapter[];
	readonly interludes: readonly Interlude[];
	readonly story: string;
	readonly appendix: string;
	readonly contradictions: readonly string[];
	readonly warnings: readonly string[];
	readonly spend: StageSpend;
}

export interface NovelHooks {
	/** One line of progress. */
	readonly progress?: (line: string) => void;
	/** The outline and packs are ready, before any prose is written (to save them for audit). */
	readonly outlined?: (casting: Casting, outline: Outline, packs: readonly ScenePack[]) => void;
}

/** A stage failed; what was spent so far is kept, and so are the chapters already written (`draft`). */
export class NovelError extends Error {
	override readonly name = "NovelError";

	constructor(
		message: string,
		readonly spend: StageSpend,
		readonly draft?: string,
	) {
		super(message);
	}
}

export async function writeNovel(source: NovelSource, models: NovelModels, options: NovelOptions = DEFAULT_NOVEL_OPTIONS, hooks: NovelHooks = {}): Promise<Novel> {
	const names = new Names(source.analysis.facts.names);
	const spend: Record<Stage, NovelSpend> = { outline: NO_SPEND, chapters: NO_SPEND, interludes: NO_SPEND, edit: NO_SPEND };
	const progress = hooks.progress ?? ((): void => undefined);
	let stage: Stage = "outline";
	let partial: (() => string) | undefined;
	try {
		const casting = castBook(source.analysis);
		const request = buildOutlineRequest(source, casting, { ...options.outline, words: options.words });
		progress(`outline: asking ${models.outline.label} (${String(request.prompt.length)} characters) ...`);
		const outlineAnswer = await models.outline.complete(request.system, request.prompt, MAX_TOKENS.outline);
		spend.outline = addSpend(spend.outline, outlineAnswer.spend);
		const outline = interpretOutline(source, casting, outlineAnswer.text, { words: options.words });

		const packs = outline.chapters.map((chapter) => {
			const pov = casting.povs.find((figure) => figure.agent === chapter.pov);
			if (pov === undefined) throw new Error(`chapter ${String(chapter.number)} has no cast figure`);
			return buildPack(source, chapter, pov, options.pack);
		});
		hooks.outlined?.(casting, outline, packs);

		const summary = outlineSummary(outline, names);
		const words = Math.max(300, Math.round(options.words / outline.chapters.length));
		const warnings = [...outline.warnings];
		const chapters: WrittenChapter[] = [];
		partial = (): string => renderStory(source, outline, chapters, []);
		stage = "chapters";
		for (const chapter of outline.chapters) {
			const pack = packs[chapter.number - 1];
			if (pack === undefined) continue;
			progress(`chapter ${String(chapter.number)}/${String(outline.chapters.length)}: asking ${models.writer.label} ...`);
			const previous = chapters.at(-1);
			const written = await writeChapter(models.writer, {
				storyTitle: outline.title,
				outline: summary,
				chapterNumber: chapter.number,
				chapterTitle: chapter.title,
				povName: names.of(chapter.pov),
				words,
				pack: pack.markdown,
				...(previous === undefined ? {} : { previousEnding: lastParagraphs(previous.text) }),
			});
			spend.chapters = addSpend(spend.chapters, written.spend);
			chapters.push({ number: chapter.number, text: withoutIds(written.text, names, `chapter ${String(chapter.number)}`, warnings) });
		}

		stage = "interludes";
		const interludes: Interlude[] = [];
		const used = new Set<number>();
		for (const chapter of outline.chapters.slice(1)) {
			const pack = buildInterludePack(source, chapter.from, chapter.to, used);
			if (pack === undefined) continue;
			for (const seq of pack.seqs) used.add(seq);
			progress(`interlude before chapter ${String(chapter.number)}: asking ${models.outline.label} ...`);
			let written;
			try {
				// The outline model writes the interludes: they retell the gamemaker's own reasoning, and Anthropic
				// refuses to rewrite another model's reasoning ("duplicating model outputs").
				written = await writeInterlude(models.outline, { storyTitle: outline.title, nextChapterTitle: chapter.title, thoughts: pack.markdown });
			} catch (error) {
				// An interlude is an ornament: losing one must not cost the chapters already paid for.
				if (!(error instanceof NovelRequestError)) throw error;
				spend.interludes = addSpend(spend.interludes, error.spend);
				warnings.push(`interlude before chapter ${String(chapter.number)}: ${error.message}; left out`);
				continue;
			}
			spend.interludes = addSpend(spend.interludes, written.spend);
			interludes.push({ before: chapter.number, text: withoutIds(written.text, names, `interlude before chapter ${String(chapter.number)}`, warnings), seqs: pack.seqs });
		}

		stage = "edit";
		const draft = renderStory(source, outline, chapters, interludes);
		progress(`edit pass: asking ${models.writer.label} (${String(draft.length)} characters) ...`);
		let edited;
		try {
			edited = await editStory(models.writer, draft, summary);
		} catch (error) {
			// A failed edit keeps the unedited draft instead of throwing the chapters away.
			if (!(error instanceof NovelRequestError)) throw error;
			edited = { text: draft, contradictions: [], warnings: [`${error.message}; the unedited text was kept`], spend: error.spend };
		}
		spend.edit = addSpend(spend.edit, edited.spend);
		warnings.push(...edited.warnings.map((warning) => `edit pass: ${warning}`));
		const story = names.apply(edited.text);

		const novel = { casting, outline, packs, chapters, interludes, story, contradictions: edited.contradictions, warnings, spend: { ...spend } };
		return { ...novel, appendix: renderAppendix(source, novel, models) };
	} catch (error) {
		if (error instanceof NovelRequestError) spend[stage] = addSpend(spend[stage], error.spend);
		const message = error instanceof Error ? error.message : String(error);
		throw new NovelError(`${stage}: ${message}`, { ...spend }, partial?.());
	}
}

/** Replaces resident IDs the writer let slip with names, and says so. */
function withoutIds(text: string, names: Names, where: string, warnings: string[]): string {
	const ids = [...new Set(text.match(/\bA\d+\b/g) ?? [])];
	if (ids.length > 0) warnings.push(`${where}: the prose named resident IDs ${ids.join(", ")}; replaced by names`);
	return names.apply(text);
}

export function renderStory(source: NovelSource, outline: Outline, chapters: readonly WrittenChapter[], interludes: readonly Interlude[]): string {
	const { analysis } = source;
	const lines = [
		`# ${outline.title}`,
		"",
		`*A short story based on true events: run ${analysis.run}${analysis.info.storyTitle === undefined ? "" : ` of ${analysis.info.storyTitle}`}. The appendix lists the events each chapter rests on.*`,
		"",
	];
	for (const chapter of outline.chapters) {
		const text = chapters.find((written) => written.number === chapter.number)?.text;
		if (text === undefined) continue;
		const interlude = interludes.find((entry) => entry.before === chapter.number);
		if (interlude !== undefined) lines.push("* * *", "", interlude.text, "", "* * *", "");
		lines.push(`## ${String(chapter.number)}. ${chapter.title}`, "", text, "");
	}
	return `${lines.join("\n").trimEnd()}\n`;
}

function renderAppendix(source: NovelSource, novel: Omit<Novel, "appendix">, models: NovelModels): string {
	const names = new Names(source.analysis.facts.names);
	const { outline } = novel;
	const points = turningPoints(source.analysis.facts.events);
	const lines = [
		`# Appendix: the events behind "${outline.title}"`,
		"",
		`Run ${source.analysis.run}. Outline and interludes by ${models.outline.label}; prose and edit by ${models.writer.label}.`,
		"Every `#seq` refers to a line of `events.jsonl`. The pack of each chapter (`packs/NN.md`) is exactly what its writer saw.",
		"",
		"## Point-of-view figures (cast in code)",
		"",
		...novel.casting.povs.map((pov) => `- ${names.labelled(pov.agent)}: ${pov.role}, score ${String(pov.score)} (${pov.reasons.join(", ") || "no turning points or beats"})`),
		"",
	];
	for (const chapter of outline.chapters) {
		const pack = novel.packs.find((entry) => entry.chapter === chapter.number);
		const told = points.filter((point) => chapter.evidence.includes(point.seq));
		lines.push(
			`## ${String(chapter.number)}. ${chapter.title}`,
			"",
			`- Point of view: ${names.labelled(chapter.pov)}, minutes ${String(chapter.from)}-${String(chapter.to)}`,
			`- What changes: ${chapter.beats.map((beat) => names.apply(beat)).join(" ")}`,
			`- Outline rests on: ${cite(chapter.evidence)}`,
			...told.map((point) => `- Turning point told: #${String(point.seq)} ${names.apply(point.text)}`),
			`- Pack (\`packs/${String(chapter.number).padStart(2, "0")}.md\`, ${String(pack?.seqs.length ?? 0)} events${pack !== undefined && pack.omitted > 0 ? `, ${String(pack.omitted)} lines left out` : ""}): ${cite(pack?.seqs ?? [])}`,
			"",
		);
	}
	if (novel.interludes.length > 0) {
		lines.push("## Interludes (the gamemaker's thinking)", "");
		for (const interlude of novel.interludes) lines.push(`- Before chapter ${String(interlude.before)}: ${cite(interlude.seqs)}`);
		lines.push("");
	}
	if (outline.uncovered.length > 0) {
		lines.push("## Turning points no chapter covers", "");
		for (const point of outline.uncovered) lines.push(`- #${String(point.seq)} (minute ${String(point.minute)}): ${names.apply(point.text)}`);
		lines.push("");
	}
	lines.push("## Contradictions the editor found", "");
	lines.push(...(novel.contradictions.length === 0 ? ["None listed."] : novel.contradictions.map((entry) => `- ${entry}`)), "");
	if (novel.warnings.length > 0) {
		lines.push("## Warnings", "");
		for (const warning of novel.warnings) lines.push(`- ${warning}`);
		lines.push("");
	}
	lines.push("## Cost", "", "| Stage | Requests | Input tokens | Output tokens | USD |", "|---|---:|---:|---:|---:|");
	for (const stage of STAGES) lines.push(spendRow(stage, novel.spend[stage]));
	lines.push(spendRow("total", totalSpend(novel.spend)));
	return `${lines.join("\n").trimEnd()}\n`;
}

function spendRow(label: string, spend: NovelSpend): string {
	return `| ${label} | ${String(spend.requests)} | ${String(spend.input + spend.cacheRead + spend.cacheWrite)} | ${String(spend.output)} | ${spend.costUsd.toFixed(4)} |`;
}

export function totalSpend(spend: StageSpend): NovelSpend {
	return STAGES.reduce((sum, stage) => addSpend(sum, spend[stage]), NO_SPEND);
}

/** `outline.json`: the validated outline with the casting, for audit. */
export function renderOutlineJson(source: NovelSource, outline: Outline, casting: Casting): string {
	const names = source.analysis.facts.names;
	return `${JSON.stringify(
		{
			run: source.analysis.run,
			title: outline.title,
			povs: casting.povs.map((pov) => ({ ...pov, name: names.get(pov.agent) ?? pov.agent })),
			scores: casting.scores,
			chapters: outline.chapters,
			uncovered: outline.uncovered,
			warnings: outline.warnings,
		},
		null,
		2,
	)}\n`;
}

/** Writes `outline.json` and `packs/NN.md`; returns the novel directory. */
export function writeOutlineFiles(runDirectory: string, source: NovelSource, casting: Casting, outline: Outline, packs: readonly ScenePack[]): string {
	const directory = join(runDirectory, NOVEL_DIRECTORY);
	// Packs of an earlier, longer outline would otherwise stay next to the new ones.
	rmSync(join(directory, NOVEL_FILES.packs), { recursive: true, force: true });
	mkdirSync(join(directory, NOVEL_FILES.packs), { recursive: true });
	writeFileSync(join(directory, NOVEL_FILES.outline), renderOutlineJson(source, outline, casting));
	for (const pack of packs) writeFileSync(join(directory, NOVEL_FILES.packs, `${String(pack.chapter).padStart(2, "0")}.md`), pack.markdown);
	return directory;
}

/** Writes the chapters of a failed novel to `story.partial.md`; returns its path. */
export function writePartialStory(runDirectory: string, draft: string): string {
	const directory = join(runDirectory, NOVEL_DIRECTORY);
	mkdirSync(directory, { recursive: true });
	const path = join(directory, NOVEL_FILES.partial);
	writeFileSync(path, draft);
	return path;
}

/** Writes `story.md` and `appendix.md` (and again `outline.json` and the packs). */
export function writeNovelFiles(runDirectory: string, source: NovelSource, novel: Novel): string {
	const directory = writeOutlineFiles(runDirectory, source, novel.casting, novel.outline, novel.packs);
	writeFileSync(join(directory, NOVEL_FILES.story), novel.story);
	writeFileSync(join(directory, NOVEL_FILES.appendix), novel.appendix);
	return directory;
}
