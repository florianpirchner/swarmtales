/**
 * The novelist (SPEC 15, "Novelist"): turns a recorded run into a short story
 * based on true events.
 *
 * 1. casting (code) picks the point-of-view figures;
 * 2. the outline (model) plans the chapters, validated against the log;
 * 3. scene packs (code) gather each chapter's material;
 * 4. the prologue (model): the city and its stakes, from what every resident was told;
 * 5. chapters (model), one call each, with the previous chapter's ending: the
 *    residents' chapters and two or three from the gamemaker's control room;
 * 6. an edit pass (model) over the whole text;
 * 7. the city's records (code) between the chapters: writs, the seal, tribunals, wills, the closing ledger;
 * 8. optionally a translation (model), part by part;
 * 9. the appendix (code): the events each chapter rests on.
 *
 * Output: `<run>/novel/story.md`, `outline.json`, `appendix.md`, `packs/NN.md`,
 * and `story.<lang>.md` with a translation.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cite, turningPoints } from "@swarmtales/chronicle";
import { castBook, type Casting } from "./casting.ts";
import { addSpend, MAX_TOKENS, NO_SPEND, NovelRequestError, type NovelModel, type NovelSpend } from "./model.ts";
import { buildOutlineRequest, DEFAULT_OUTLINE_OPTIONS, interpretOutline, outlineSummary, povName, type Outline, type OutlineOptions } from "./outline.ts";
import { buildGamemakerPack, buildPack, DEFAULT_PACK_OPTIONS, type PackOptions, type ScenePack } from "./packs.ts";
import { GAMEMAKER_POV, gamemakerTeam } from "./prompts.ts";
import { cityRecords, placeRecords, renderRecord, type CityRecord } from "./records.ts";
import { Names, type NovelSource } from "./source.ts";
import { editStory, lastParagraphs, translateStory, writeChapter, writeGamemakerChapter, writePrologue } from "./writer.ts";

export const NOVEL_DIRECTORY = "novel";
export const NOVEL_FILES = { story: "story.md", partial: "story.partial.md", outline: "outline.json", appendix: "appendix.md", packs: "packs" } as const;

export const DEFAULT_WORDS = 6_000;

export interface NovelOptions {
	readonly words: number;
	readonly outline: OutlineOptions;
	readonly pack: PackOptions;
	/** Translate the edited story into this language (`code` names the file, `language` is told to the model). */
	readonly translate?: { readonly code: string; readonly language: string };
}

export const DEFAULT_NOVEL_OPTIONS: NovelOptions = { words: DEFAULT_WORDS, outline: DEFAULT_OUTLINE_OPTIONS, pack: DEFAULT_PACK_OPTIONS };

export const STAGES = ["outline", "chapters", "gamemaker", "edit", "translation"] as const;
export type Stage = (typeof STAGES)[number];
export type StageSpend = Readonly<Record<Stage, NovelSpend>>;

export const NO_STAGE_SPEND: StageSpend = { outline: NO_SPEND, chapters: NO_SPEND, gamemaker: NO_SPEND, edit: NO_SPEND, translation: NO_SPEND };

export interface NovelModels {
	readonly outline: NovelModel;
	readonly writer: NovelModel;
	/** Line-edits and translates the draft; the writer when absent. */
	readonly editor?: NovelModel;
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
	/** The city's records after each chapter, by chapter number. */
	readonly records: ReadonlyMap<number, readonly CityRecord[]>;
	readonly prologue?: string;
	readonly story: string;
	readonly translation?: { readonly code: string; readonly text: string };
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
	const spend: Record<Stage, NovelSpend> = { ...NO_STAGE_SPEND };
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
			if (chapter.pov === GAMEMAKER_POV) return buildGamemakerPack(source, chapter, gamemakerTeam(), options.pack);
			const pov = casting.povs.find((figure) => figure.agent === chapter.pov);
			if (pov === undefined) throw new Error(`chapter ${String(chapter.number)} has no cast figure`);
			return buildPack(source, chapter, pov, options.pack);
		});
		hooks.outlined?.(casting, outline, packs);

		const summary = outlineSummary(outline, names);
		const words = Math.max(300, Math.round(options.words / outline.chapters.length));
		const warnings = [...outline.warnings];
		const chapters: WrittenChapter[] = [];
		stage = "chapters";
		progress(`prologue: asking ${models.writer.label} ...`);
		const writtenPrologue = await writePrologue(models.writer, {
			storyTitle: outline.title,
			outline: summary,
			beats: outline.prologue.map((beat) => names.apply(beat)),
			...(source.world === undefined ? {} : { world: source.world }),
			figures: [...casting.povs.map((pov) => `- ${names.of(pov.agent)}: ${pov.role}`), ...(outline.chapters.some((chapter) => chapter.pov === GAMEMAKER_POV) ? ["- the Gamemaker, who makes the city's games, with his small team"] : [])],
			glossary: outline.glossary,
		});
		spend.chapters = addSpend(spend.chapters, writtenPrologue.spend);
		const prologue = withoutIds(writtenPrologue.text, names, "prologue", warnings);
		partial = (): string => renderStory(source, outline, chapters, prologue);
		// P55: Anthropic will not retell another model's reasoning, and the gamemaker thinks with DeepSeek.
		const gamemakerWriter = models.writer.provider === "anthropic" ? models.outline : models.writer;
		for (const chapter of outline.chapters) {
			const pack = packs[chapter.number - 1];
			if (pack === undefined) continue;
			const fromAbove = chapter.pov === GAMEMAKER_POV;
			stage = fromAbove ? "gamemaker" : "chapters";
			const writer = fromAbove ? gamemakerWriter : models.writer;
			progress(`chapter ${String(chapter.number)}/${String(outline.chapters.length)}${fromAbove ? " (the Gamemaker)" : ""}: asking ${writer.label} ...`);
			const previous = chapters.at(-1)?.text ?? prologue;
			const input = {
				storyTitle: outline.title,
				outline: summary,
				chapterNumber: chapter.number,
				chapterTitle: chapter.title,
				povName: povName(chapter.pov, names),
				words,
				pack: pack.markdown,
				glossary: outline.glossary,
				...(chapter.question === undefined ? {} : { question: names.apply(chapter.question) }),
				previousEnding: lastParagraphs(previous),
			};
			const written = fromAbove ? await writeGamemakerChapter(writer, input) : await writeChapter(writer, input);
			spend[stage] = addSpend(spend[stage], written.spend);
			chapters.push({ number: chapter.number, text: withoutIds(written.text, names, `chapter ${String(chapter.number)}`, warnings) });
		}

		stage = "edit";
		const editor = models.editor ?? models.writer;
		const draft = renderStory(source, outline, chapters, prologue);
		progress(`edit pass: asking ${editor.label} (${String(draft.length)} characters) ...`);
		let edited;
		try {
			const facts = turningPoints(source.analysis.facts.events).map((point) => names.apply(point.text));
			edited = await editStory(editor, draft, summary, facts, outline.glossary);
		} catch (error) {
			// A failed edit keeps the unedited draft instead of throwing the chapters away.
			if (!(error instanceof NovelRequestError)) throw error;
			edited = { text: draft, contradictions: [], warnings: [`${error.message}; the unedited text was kept`], spend: error.spend };
		}
		spend.edit = addSpend(spend.edit, edited.spend);
		warnings.push(...edited.warnings.map((warning) => `edit pass: ${warning}`));
		// The records come from the log, exact to the point; they go in after the edit so no model touches them.
		const filed = cityRecords(source.analysis.facts.events, names);
		const records = placeRecords(
			filed,
			outline.chapters.map((chapter) => ({ ...chapter, aside: chapter.pov === GAMEMAKER_POV })),
		);
		const left = filed.length - [...records.values()].reduce((sum, placed) => sum + placed.length, 0);
		if (left > 0) warnings.push(`city records: ${String(left)} of ${String(filed.length)} left out (at most three between two chapters)`);
		const story = withRecords(names.apply(edited.text), outline, records);

		let translation: { readonly code: string; readonly text: string } | undefined;
		if (options.translate !== undefined) {
			stage = "translation";
			const { code, language } = options.translate;
			try {
				// The editor translates; a part it refuses goes to the writer (or the outliner when they are one model).
				const translated = await translateStory(editor, story, language, {
					fallback: editor === models.writer ? models.outline : models.writer,
					onPart: (part, parts, by) => {
						progress(`translation into ${language}, part ${String(part)}/${String(parts)}: asking ${by.label} ...`);
					},
				});
				spend.translation = addSpend(spend.translation, translated.spend);
				warnings.push(...translated.warnings.map((warning) => `translation into ${language}: ${warning}`));
				translation = { code, text: names.apply(translated.text) };
			} catch (error) {
				// The English story is paid for; a failed translation must not lose it.
				if (!(error instanceof NovelRequestError)) throw error;
				spend.translation = addSpend(spend.translation, error.spend);
				warnings.push(`translation into ${language}: ${error.message}; no translation was written`);
			}
		}

		const novel = {
			casting,
			outline,
			packs,
			chapters,
			records,
			prologue,
			story,
			...(translation === undefined ? {} : { translation }),
			contradictions: edited.contradictions,
			warnings,
			spend: { ...spend },
		};
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

export function renderStory(source: NovelSource, outline: Outline, chapters: readonly WrittenChapter[], prologue?: string): string {
	const { analysis } = source;
	const lines = [
		`# ${outline.title}`,
		"",
		`*A short story based on true events: run ${analysis.run}${analysis.info.storyTitle === undefined ? "" : ` of ${analysis.info.storyTitle}`}. The appendix lists the events each chapter rests on.*`,
		"",
	];
	if (prologue !== undefined) lines.push("## Prologue", "", prologue, "");
	for (const chapter of outline.chapters) {
		const text = chapters.find((written) => written.number === chapter.number)?.text;
		if (text === undefined) continue;
		lines.push(`## ${String(chapter.number)}. ${chapter.title}`, "", text, "");
	}
	return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * Puts the city's records after their chapters: before the next chapter's
 * heading, or at the end after the last one. A record whose chapter heading
 * the text lacks is left out.
 */
export function withRecords(story: string, outline: Outline, records: ReadonlyMap<number, readonly CityRecord[]>): string {
	let text = story.trimEnd();
	const numbers = outline.chapters.map((chapter) => chapter.number).sort((a, b) => a - b);
	// From the last chapter back, so earlier insertions do not move later headings.
	for (const [index, number] of [...numbers.entries()].reverse()) {
		const placed = records.get(number);
		if (placed === undefined || placed.length === 0 || !text.includes(`\n## ${String(number)}. `)) continue;
		const block = placed.map(renderRecord).join("\n\n");
		// Before the next chapter heading the text still has; at the end after the last one.
		const at = numbers
			.slice(index + 1)
			.map((next) => text.indexOf(`\n## ${String(next)}. `))
			.find((position) => position >= 0) ?? -1;
		text = at < 0 ? `${text}\n\n${block}` : `${text.slice(0, at).trimEnd()}\n\n${block}\n\n${text.slice(at + 1)}`;
	}
	return `${text}\n`;
}

function renderAppendix(source: NovelSource, novel: Omit<Novel, "appendix">, models: NovelModels): string {
	const names = new Names(source.analysis.facts.names);
	const { outline } = novel;
	const points = turningPoints(source.analysis.facts.events);
	const lines = [
		`# Appendix: the events behind "${outline.title}"`,
		"",
		models.editor === undefined || models.editor === models.writer
			? `Run ${source.analysis.run}. Outline by ${models.outline.label}; prologue, prose, edit${novel.translation === undefined ? "" : " and translation"} by ${models.writer.label}.`
			: `Run ${source.analysis.run}. Outline by ${models.outline.label}; prologue and draft by ${models.writer.label}; edit${novel.translation === undefined ? "" : " and translation"} by ${models.editor.label}.`,
		"The Gamemaker's chapters retell his recorded thoughts, notes and moves; his team (the Courier, the Guard, the Scribe) are real parts of the city, and their lines are built from his thoughts and the records of their work. The city's records between the chapters are computed from the log, not written by a model.",
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
			`- Point of view: ${chapter.pov === GAMEMAKER_POV ? "the Gamemaker" : names.labelled(chapter.pov)}, minutes ${String(chapter.from)}-${String(chapter.to)}`,
			`- What changes: ${chapter.beats.map((beat) => names.apply(beat)).join(" ")}`,
			`- Outline rests on: ${cite(chapter.evidence)}`,
			...told.map((point) => `- Turning point told: #${String(point.seq)} ${names.apply(point.text)}`),
			`- Pack (\`packs/${String(chapter.number).padStart(2, "0")}.md\`, ${String(pack?.seqs.length ?? 0)} events${pack !== undefined && pack.omitted > 0 ? `, ${String(pack.omitted)} lines left out` : ""}): ${cite(pack?.seqs ?? [])}`,
			"",
		);
	}
	if (novel.records.size > 0) {
		lines.push("## The city's records (computed from the log)", "");
		for (const [chapter, placed] of [...novel.records].sort((a, b) => a[0] - b[0])) {
			for (const record of placed) lines.push(`- After chapter ${String(chapter)}: ${record.title} (${cite(record.seqs)})`);
		}
		lines.push("");
	}
	if (outline.glossary.length > 0) {
		lines.push("## Glossary (game word -> story word)", "");
		for (const entry of outline.glossary) lines.push(`- ${entry.term} -> ${entry.story}`);
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
			glossary: outline.glossary,
			prologue: outline.prologue,
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
export function writeOutlineFiles(runDirectory: string, source: NovelSource, casting: Casting, outline: Outline, packs: readonly ScenePack[], name: string = NOVEL_DIRECTORY): string {
	const directory = join(runDirectory, name);
	// Packs of an earlier, longer outline would otherwise stay next to the new ones.
	rmSync(join(directory, NOVEL_FILES.packs), { recursive: true, force: true });
	mkdirSync(join(directory, NOVEL_FILES.packs), { recursive: true });
	writeFileSync(join(directory, NOVEL_FILES.outline), renderOutlineJson(source, outline, casting));
	for (const pack of packs) writeFileSync(join(directory, NOVEL_FILES.packs, `${String(pack.chapter).padStart(2, "0")}.md`), pack.markdown);
	return directory;
}

/** Writes the chapters of a failed novel to `story.partial.md`; returns its path. */
export function writePartialStory(runDirectory: string, draft: string, name: string = NOVEL_DIRECTORY): string {
	const directory = join(runDirectory, name);
	mkdirSync(directory, { recursive: true });
	const path = join(directory, NOVEL_FILES.partial);
	writeFileSync(path, draft);
	return path;
}

/** `story.de.md` for a German translation. */
export function translationFile(code: string): string {
	return `story.${code}.md`;
}

/** Writes `story.md`, a translation, and `appendix.md` (and again `outline.json` and the packs). */
export function writeNovelFiles(runDirectory: string, source: NovelSource, novel: Novel, name: string = NOVEL_DIRECTORY): string {
	const directory = writeOutlineFiles(runDirectory, source, novel.casting, novel.outline, novel.packs, name);
	writeFileSync(join(directory, NOVEL_FILES.story), novel.story);
	if (novel.translation !== undefined) writeFileSync(join(directory, translationFile(novel.translation.code)), novel.translation.text);
	writeFileSync(join(directory, NOVEL_FILES.appendix), novel.appendix);
	return directory;
}
