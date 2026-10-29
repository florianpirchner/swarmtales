/**
 * `pnpm novel <run-dir>`: turns a recorded run into a short story based on
 * true events (SPEC 15, "Novelist"), written to `<run-dir>/novel/`. Needs
 * two models and their API keys; without them it is skipped with a reason.
 * `--dry-run` casts the book and prints the outline prompt's size offline.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { DigestError } from "../digest/digest.ts";
import { createProviderRegistry } from "../model/providers.ts";
import { castBook } from "../novel/casting.ts";
import { resolveOutlineModel, resolveWriterModel, type NovelSpend } from "../novel/model.ts";
import { buildOutlineRequest, chapterCount, DEFAULT_OUTLINE_OPTIONS } from "../novel/outline.ts";
import { DEFAULT_NOVEL_OPTIONS, NOVEL_FILES, NovelError, STAGES, totalSpend, writeNovel, writeNovelFiles, writeOutlineFiles, writePartialStory, type StageSpend } from "../novel/novel.ts";
import { loadNovelSource, Names } from "../novel/source.ts";
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
	out(`gamemaker thoughts for interludes: ${String(source.gamemaker.thoughts.length)}; figure texts: ${String(source.figures.size)}; chronicle: ${source.chronicle === undefined ? "none" : "yes"}`);
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

try {
	const novel = await writeNovel(
		source,
		{ outline: outlineModel.model, writer: writerModel.model },
		{ ...DEFAULT_NOVEL_OPTIONS, words: args.words },
		{
			progress: out,
			outlined: (cast, outline, packs) => {
				const written = writeOutlineFiles(directory, source, cast, outline, packs);
				out(`outline: "${outline.title}", ${String(outline.chapters.length)} chapters (${join(written, NOVEL_FILES.outline)})`);
				for (const warning of outline.warnings) process.stderr.write(`warning: outline ${warning}\n`);
			},
		},
	);
	const written = writeNovelFiles(directory, source, novel);
	for (const warning of novel.warnings.slice(novel.outline.warnings.length)) process.stderr.write(`warning: ${warning}\n`);
	const words = novel.story.split(/\s+/).filter((word) => word.length > 0).length;
	out(`story:    ${join(written, NOVEL_FILES.story)} (${String(words)} words)`);
	out(`appendix: ${join(written, NOVEL_FILES.appendix)}`);
	out(`contradictions the editor listed: ${String(novel.contradictions.length)}`);
	printSpend(novel.spend);
} catch (error) {
	if (error instanceof NovelError) {
		out(`novel failed: ${error.message}`);
		if (error.draft?.includes("\n## ") === true) out(`chapters written so far: ${writePartialStory(directory, error.draft)}`);
		printSpend(error.spend);
		process.exit(1);
	}
	throw error;
}

function printSpend(spend: StageSpend): void {
	out("cost:");
	const row = (label: string, entry: NovelSpend): void => {
		out(`  ${label.padEnd(10)} ${String(entry.requests).padStart(3)} requests, ${String(entry.input + entry.cacheRead + entry.cacheWrite).padStart(8)} in, ${String(entry.output).padStart(7)} out, ${entry.costUsd.toFixed(4)} USD`);
	};
	for (const stage of STAGES) row(stage, spend[stage]);
	row("total", totalSpend(spend));
}
