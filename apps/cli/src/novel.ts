/**
 * `pnpm novel <run-dir>`: turns a recorded run into a short story based on
 * true events (SPEC 15, "Novelist"), written to `<run-dir>/novel/`. Needs
 * two models and their API keys; without them it is skipped with a reason.
 * `--dry-run` casts the book and prints the outline prompt's size offline.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { DigestError } from "@swarmtales/chronicle";
import { createProviderRegistry } from "@swarmtales/models";
import {
	buildOutlineRequest,
	castBook,
	chapterCount,
	DEFAULT_NOVEL_OPTIONS,
	DEFAULT_OUTLINE_OPTIONS,
	LANGUAGES,
	loadNovelSource,
	Names,
	NO_STAGE_SPEND,
	NOVEL_FILES,
	NovelError,
	NovelRequestError,
	type NovelSpend,
	resolveEditorModel,
	resolveOutlineModel,
	resolveWriterModel,
	STAGES,
	type StageSpend,
	totalSpend,
	translateStory,
	translationFile,
	writeNovel,
	writeNovelFiles,
	writeOutlineFiles,
	writePartialStory,
} from "@swarmtales/novelist";
import { UsageError } from "./args.ts";
import { NOVEL_USAGE, parseNovelArgs } from "./novel-args.ts";

const envFile = join(process.cwd(), ".env");
// Existing environment variables win; the file only fills gaps.
if (existsSync(envFile)) loadEnvFile(envFile);

function fail(message: string): never {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

function out(line: string): void {
	process.stdout.write(`${line}\n`);
}

let args;
try {
	args = parseNovelArgs(process.argv.slice(2));
} catch (error) {
	if (error instanceof UsageError) fail(`${error.message}\n\n${NOVEL_USAGE}`);
	throw error;
}

const directory = resolve(args.runDirectory);
let source;
try {
	source = loadNovelSource(directory);
} catch (error) {
	if (error instanceof DigestError) fail(error.message);
	throw error;
}
for (const issue of source.analysis.issues) process.stderr.write(`warning: events.jsonl ${issue}\n`);

const names = new Names(source.analysis.facts.names);
const casting = castBook(source.analysis);
out(`casting (${String(source.analysis.facts.agents.length)} residents):`);
for (const pov of casting.povs) out(`  ${names.labelled(pov.agent)}: ${pov.role}, score ${String(pov.score)} (${pov.reasons.join(", ") || "-"})`);

if (args.dryRun) {
	const request = buildOutlineRequest(source, casting, { ...DEFAULT_OUTLINE_OPTIONS, words: args.words });
	const chars = request.system.length + request.prompt.length;
	out(`outline prompt: ${String(chars)} characters (about ${String(Math.round(chars / 4))} tokens), ${String(chapterCount(args.words))} chapters planned for ${String(args.words)} words`);
	out(`gamemaker: ${String(source.gamemaker.thoughts.length)} thoughts, ${String(source.gamemaker.moves.length)} moves, ${String(source.gamemaker.defied.length)} refusals; figure texts: ${String(source.figures.size)}; chronicle: ${source.chronicle === undefined ? "none" : "yes"}`);
	out("dry run: no model was called and nothing was written");
	process.exit(0);
}

const registry = createProviderRegistry();
const outlineModel = resolveOutlineModel(
	{ ...(args.outlineProvider === undefined ? {} : { provider: args.outlineProvider }), ...(args.outlineModel === undefined ? {} : { model: args.outlineModel }) },
	process.env,
	registry,
);
const writerModel = resolveWriterModel(
	{ ...(args.provider === undefined ? {} : { provider: args.provider }), ...(args.model === undefined ? {} : { model: args.model }) },
	process.env,
	registry,
);
if (!outlineModel.ok) {
	out(`novel skipped: outline model: ${outlineModel.reason}`);
	process.exit(0);
}
if (!writerModel.ok) {
	out(`novel skipped: writer model: ${writerModel.reason}`);
	process.exit(0);
}
const editorModel = resolveEditorModel(
	{ ...(args.editorProvider === undefined ? {} : { provider: args.editorProvider }), ...(args.editorModel === undefined ? {} : { model: args.editorModel }) },
	process.env,
	registry,
);
if (!editorModel.ok) {
	out(`novel skipped: editor model: ${editorModel.reason}`);
	process.exit(0);
}

const language = args.translate === undefined ? undefined : LANGUAGES[args.translate];
if (args.translateOnly && args.translate !== undefined && language !== undefined) {
	const storyPath = join(directory, args.out, NOVEL_FILES.story);
	if (!existsSync(storyPath)) fail(`no story to translate: ${storyPath}`);
	try {
		const translated = await translateStory(editorModel.model, readFileSync(storyPath, "utf8"), language, {
			fallback: writerModel.model,
			onPart: (part, parts, by) => {
				out(`translation into ${language}, part ${String(part)}/${String(parts)}: asking ${by.label} ...`);
			},
		});
		const target = join(directory, args.out, translationFile(args.translate));
		writeFileSync(target, names.apply(translated.text));
		for (const warning of translated.warnings) process.stderr.write(`warning: ${warning}\n`);
		out(`translation: ${target}`);
		printSpend({ ...NO_STAGE_SPEND, translation: translated.spend });
	} catch (error) {
		if (!(error instanceof NovelRequestError)) throw error;
		out(`translation failed: ${error.message}`);
		printSpend({ ...NO_STAGE_SPEND, translation: error.spend });
		process.exit(1);
	}
	process.exit(0);
}
try {
	const novel = await writeNovel(
		source,
		{ outline: outlineModel.model, writer: writerModel.model, editor: editorModel.model },
		{ ...DEFAULT_NOVEL_OPTIONS, words: args.words, ...(language === undefined || args.translate === undefined ? {} : { translate: { code: args.translate, language } }) },
		{
			progress: out,
			outlined: (cast, outline, packs) => {
				const written = writeOutlineFiles(directory, source, cast, outline, packs, args.out);
				out(`outline: "${outline.title}", ${String(outline.chapters.length)} chapters (${join(written, NOVEL_FILES.outline)})`);
				for (const warning of outline.warnings) process.stderr.write(`warning: outline ${warning}\n`);
			},
		},
	);
	const written = writeNovelFiles(directory, source, novel, args.out);
	for (const warning of novel.warnings.slice(novel.outline.warnings.length)) process.stderr.write(`warning: ${warning}\n`);
	const words = novel.story.split(/\s+/).filter((word) => word.length > 0).length;
	out(`story:    ${join(written, NOVEL_FILES.story)} (${String(words)} words)`);
	if (novel.translation !== undefined) out(`translation: ${join(written, translationFile(novel.translation.code))}`);
	out(`appendix: ${join(written, NOVEL_FILES.appendix)}`);
	out(`contradictions the editor listed: ${String(novel.contradictions.length)}`);
	printSpend(novel.spend);
} catch (error) {
	if (error instanceof NovelError) {
		out(`novel failed: ${error.message}`);
		if (error.draft?.includes("\n## ") === true) out(`chapters written so far: ${writePartialStory(directory, error.draft, args.out)}`);
		printSpend(error.spend);
		process.exit(1);
	}
	throw error;
}

function printSpend(spend: StageSpend): void {
	out("cost:");
	const row = (label: string, entry: NovelSpend): void => {
		out(`  ${label.padEnd(11)} ${String(entry.requests).padStart(3)} requests, ${String(entry.input + entry.cacheRead + entry.cacheWrite).padStart(8)} in, ${String(entry.output).padStart(7)} out, ${entry.costUsd.toFixed(4)} USD`);
	};
	for (const stage of STAGES) row(stage, spend[stage]);
	row("total", totalSpend(spend));
}
