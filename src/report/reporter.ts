/**
 * The run reporter: writes `<run>/REPORT.md`, the first draft of the run
 * report a human analyst used to write by hand.
 *
 * The header and the result tables are computed in code ({@link computeFacts}).
 * A model reads an evidence pack and writes the digest highlights, problems,
 * optimizations and loophole candidates. Its answer is untrusted: it is
 * parsed with typebox, and every item that cites no event or an unknown
 * `seq` is dropped with a warning, so the report cannot invent events.
 * An answer that is not the expected JSON is asked for once more. Without a
 * model, or when its answer stays unusable, the report keeps the
 * computed sections and says why the rest was skipped; it never fails a run.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import { analyzeLog } from "../digest/digest.ts";
import { excerpt } from "../digest/relationships.ts";
import { buildEvidence } from "./evidence.ts";
import { computeFacts, DEFAULT_REPORT_OPTIONS, type ReportFacts, type ReportOptions } from "./facts.ts";
import { ReporterRequestError, type ReporterChoice, type ReporterModel } from "./model.ts";
import { buildReportPrompt, REPORT_SYSTEM_PROMPT } from "./prompt.ts";
import { factsMarkdown, renderReport, SECTION_TITLES, type Narrative, type ReportItem, type ReportSections, type ReporterSpend } from "./render.ts";
import { readRunFiles, type RunFiles } from "./run-log.ts";

export const REPORT_FILE = "REPORT.md";

export interface ReporterOptions extends ReportOptions {
	/** Upper bound of the prompt in characters. */
	readonly maxPromptChars: number;
	/** Characters kept of each message, thought or note in the evidence. */
	readonly excerptChars: number;
	/** Items kept per section. */
	readonly maxItems: number;
}

export const DEFAULT_REPORTER_OPTIONS: ReporterOptions = { ...DEFAULT_REPORT_OPTIONS, maxPromptChars: 120_000, excerptChars: 300, maxItems: 8 };

const TITLE_CHARS = 200;
const TEXT_CHARS = 1_500;
const STORY_CHARS = 12_000;
const MIN_EVIDENCE_CHARS = 10_000;

export class ReportError extends Error {
	override readonly name = "ReportError";
}

const ItemSchema = Type.Object({
	title: Type.String(),
	text: Type.String(),
	evidence: Type.Array(Type.Integer()),
	by: Type.Optional(Type.String()),
});
const AnswerSchema = Type.Object({
	highlights: Type.Array(ItemSchema),
	problems: Type.Array(ItemSchema),
	optimizations: Type.Array(ItemSchema),
	loopholes: Type.Optional(Type.Array(ItemSchema)),
});
type Answer = Static<typeof AnswerSchema>;
type AnswerItem = Static<typeof ItemSchema>;

/** The prompt for one run, within the character budget. */
export function buildPrompt(facts: ReportFacts, files: RunFiles, options: ReporterOptions = DEFAULT_REPORTER_OPTIONS): { readonly prompt: string; readonly omitted: number } {
	const analysis = analyzeLog(facts.run, files.events, files.metadata);
	const beats = analysis.beats
		.filter((beat) => beat.seq >= facts.counted.fromSeq)
		.map((beat) => `- ${beat.id} ${beat.kind} (minute ${beat.minute}): ${beat.summary} Evidence: ${beat.evidence.map((seq) => `#${seq}`).join(", ")}`);
	const stalls = [
		...facts.stalls.map((stall) => `- ${stall.agent} on level ${stall.level} from minute ${stall.fromMinute} to ${stall.toMinute} (${stall.minutes} minutes${stall.untilEnd ? ", until the end" : ""})`),
		...facts.deadSpans.map((span) => `- no submission in minutes ${span.fromMinute}-${span.toMinute} (${span.minutes} minutes)`),
	];
	const parts = { run: facts.run, story: storyLines(facts), facts: factsMarkdown(facts), stalls, beats };
	const fixed = buildReportPrompt({ ...parts, evidence: [], omitted: 0 }).length;
	const evidence = buildEvidence(facts.events, { maxChars: Math.max(MIN_EVIDENCE_CHARS, options.maxPromptChars - fixed - 200), excerptChars: options.excerptChars });
	return { prompt: buildReportPrompt({ ...parts, evidence: evidence.lines, omitted: evidence.omitted }), omitted: evidence.omitted };
}

/** The story's design for the prompt: title, acts, rules and every level's task, within {@link STORY_CHARS}. */
function storyLines(facts: ReportFacts): readonly string[] {
	const story = facts.metadata.story;
	if (story === undefined) return ["(unknown: 000-run.json has no story)"];
	const lines = [`Title: ${story.title ?? story.id ?? "unknown"}`];
	if (facts.survivors !== undefined) lines.push(`Seats: the ${facts.survivors} best-ranked residents survive.`);
	if (story.acts !== undefined) lines.push(`Acts: ${story.acts.map((act) => `"${act.title}" from level ${act.fromLevel}`).join(", ")}`);
	if (story.rules !== undefined) lines.push(`Rules: ${excerpt(JSON.stringify(story.rules), 2_000)}`);
	for (const level of story.levels ?? []) lines.push(`Level ${level.number} "${level.title}": ${excerpt(level.task ?? "", 700)}`);
	const kept: string[] = [];
	let total = 0;
	for (const line of lines) {
		total += line.length + 1;
		if (total > STORY_CHARS) break;
		kept.push(line);
	}
	return kept;
}

export interface InterpretedAnswer {
	readonly sections: ReportSections;
	readonly warnings: readonly string[];
}

/** Validates the model's answer against the log. Throws {@link ReportError} when it is not the expected JSON. */
export function interpretAnswer(answer: string, seqs: ReadonlySet<number>, maxItems = DEFAULT_REPORTER_OPTIONS.maxItems): InterpretedAnswer {
	const parsed = parseAnswer(answer);
	const warnings: string[] = [];
	const section = (key: keyof ReportSections, items: readonly AnswerItem[], withBy: boolean): readonly ReportItem[] => {
		const kept: ReportItem[] = [];
		for (const [index, entry] of items.entries()) {
			const where = `${SECTION_TITLES[key]} item ${index + 1}`;
			const title = clean(entry.title, TITLE_CHARS);
			const text = clean(entry.text, TEXT_CHARS);
			if (title.length === 0 && text.length === 0) {
				warnings.push(`${where}: empty`);
				continue;
			}
			if (entry.evidence.length === 0) {
				warnings.push(`${where}: cites no evidence`);
				continue;
			}
			const inline = [...`${title} ${text}`.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
			const unknown = [...new Set([...entry.evidence, ...inline])].filter((seq) => !seqs.has(seq));
			if (unknown.length > 0) {
				warnings.push(`${where}: cites unknown events ${unknown.map((seq) => `#${seq}`).join(", ")}`);
				continue;
			}
			if (kept.length >= maxItems) {
				warnings.push(`${where}: more than ${maxItems} items`);
				continue;
			}
			const by = withBy ? byOf(entry.by) : undefined;
			kept.push({
				title: title.length === 0 ? "(untitled)" : title,
				text,
				evidence: [...new Set(entry.evidence)].sort((a, b) => a - b),
				...(by === undefined ? {} : { by }),
			});
		}
		return kept;
	};
	if (parsed.loopholes === undefined) warnings.push(`${SECTION_TITLES.loopholes}: missing from the answer`);
	const sections: ReportSections = {
		highlights: section("highlights", parsed.highlights, false),
		problems: section("problems", parsed.problems, false),
		optimizations: section("optimizations", parsed.optimizations, false),
		loopholes: section("loopholes", parsed.loopholes ?? [], true),
	};
	return { sections, warnings };
}

function parseAnswer(answer: string): Answer {
	const start = answer.indexOf("{");
	const end = answer.lastIndexOf("}");
	if (start < 0 || end <= start) throw new ReportError("the model did not answer with a JSON object");
	let value: unknown;
	try {
		value = JSON.parse(answer.slice(start, end + 1));
	} catch {
		throw new ReportError("the model's answer is not valid JSON");
	}
	if (!Check(AnswerSchema, value)) throw new ReportError("the model's answer does not have the expected shape");
	return value;
}

function byOf(value: string | undefined): "residents" | "gamemaker" | undefined {
	if (value === undefined) return undefined;
	const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
	if (normalized === "gamemaker") return "gamemaker";
	if (normalized === "residents" || normalized === "resident") return "residents";
	return undefined;
}

/** One line of plain text, at most `length` characters. */
function clean(text: string, length: number): string {
	return excerpt(text, length);
}

export interface WrittenReport {
	readonly path: string;
	readonly narrative: Narrative;
	/** Items dropped from the model's answer, or why an asked model's answer was unusable. */
	readonly warnings: readonly string[];
}

/**
 * Writes `<directory>/REPORT.md`. Asks the model when `choice` holds one;
 * records its spend under `reporter` in `usage.json`. Throws only when the
 * run directory cannot be read or written.
 */
export async function writeRunReport(directory: string, choice: ReporterChoice, options: ReporterOptions = DEFAULT_REPORTER_OPTIONS): Promise<WrittenReport> {
	const files = readRunFiles(directory);
	const facts = computeFacts(basename(directory), files, options);
	const narrative = choice.ok ? await askModel(facts, files, choice.model, options) : ({ kind: "skipped", reason: choice.reason } as const);
	if (narrative.spend !== undefined && narrative.label !== undefined) recordReporterSpend(directory, narrative.label, narrative.spend);
	const path = join(directory, REPORT_FILE);
	writeFileSync(path, renderReport(facts, narrative));
	// A model that was asked but gave nothing usable is a warning; a reporter without a model is not.
	const warnings = narrative.kind === "written" ? narrative.warnings : narrative.label === undefined ? [] : [`model sections skipped: ${narrative.reason}`];
	return { path, narrative, warnings };
}

/**
 * Asks the model for the narrative sections. An answer that is not the
 * expected JSON is asked for once more (P26: a model sometimes breaks its
 * JSON); the spend of both requests is recorded.
 */
async function askModel(facts: ReportFacts, files: RunFiles, model: ReporterModel, options: ReporterOptions): Promise<Narrative> {
	const { prompt } = buildPrompt(facts, files, options);
	let spent: ReporterSpend | undefined;
	for (let attempt = 1; ; attempt++) {
		let answer;
		try {
			answer = await model.complete(REPORT_SYSTEM_PROMPT, prompt);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			const spend = error instanceof ReporterRequestError ? addSpend(spent, error.spend) : spent;
			return { kind: "skipped", reason, label: model.label, ...(spend === undefined ? {} : { spend }) };
		}
		spent = addSpend(spent, answer.spend);
		try {
			const interpreted = interpretAnswer(answer.text, facts.seqs, options.maxItems);
			return { kind: "written", label: model.label, sections: interpreted.sections, warnings: interpreted.warnings, spend: spent };
		} catch (error) {
			if (!(error instanceof ReportError)) throw error;
			if (attempt >= REPORTER_ATTEMPTS) return { kind: "skipped", reason: error.message, label: model.label, spend: spent };
		}
	}
}

/** Requests of the reporter per report: the first answer and one retry when it is not the expected JSON. */
export const REPORTER_ATTEMPTS = 2;

function addSpend(total: ReporterSpend | undefined, spend: ReporterSpend): ReporterSpend {
	if (total === undefined) return spend;
	return {
		requests: total.requests + spend.requests,
		input: total.input + spend.input,
		output: total.output + spend.output,
		cacheRead: total.cacheRead + spend.cacheRead,
		cacheWrite: total.cacheWrite + spend.cacheWrite,
		costUsd: total.costUsd + spend.costUsd,
	};
}

const SpendSchema = Type.Object({
	model: Type.String(),
	requests: Type.Number(),
	input: Type.Number(),
	output: Type.Number(),
	cacheRead: Type.Number(),
	cacheWrite: Type.Number(),
	costUsd: Type.Number(),
});
const UsageObjectSchema = Type.Record(Type.String(), Type.Unknown());

/**
 * Adds the reporter's spend to `usage.json` under `reporter`: every report
 * written for the run so far, with the latest model. It is kept apart from
 * `own`, so it never counts against the run's budget.
 */
export function recordReporterSpend(directory: string, label: string, spend: ReporterSpend): void {
	const path = join(directory, "usage.json");
	let usage: Record<string, unknown> = {};
	if (existsSync(path)) {
		try {
			const value: unknown = JSON.parse(readFileSync(path, "utf8"));
			if (Check(UsageObjectSchema, value)) usage = value;
		} catch {
			// A broken usage.json is replaced by the reporter's entry alone.
		}
	}
	const previous = usage.reporter;
	const before = Check(SpendSchema, previous) ? previous : undefined;
	usage.reporter = {
		model: label,
		requests: (before?.requests ?? 0) + spend.requests,
		input: (before?.input ?? 0) + spend.input,
		output: (before?.output ?? 0) + spend.output,
		cacheRead: (before?.cacheRead ?? 0) + spend.cacheRead,
		cacheWrite: (before?.cacheWrite ?? 0) + spend.cacheWrite,
		costUsd: (before?.costUsd ?? 0) + spend.costUsd,
	};
	writeFileSync(path, `${JSON.stringify(usage, null, 2)}\n`);
}

/** One line for the end-of-run summary. */
export function reportSummary(report: WrittenReport): string {
	const { narrative } = report;
	const spend = narrative.spend === undefined ? "" : ` · reporter ${narrative.spend.costUsd.toFixed(4)} USD (${narrative.label ?? "model"}, not in the run's budget)`;
	const state = narrative.kind === "written" ? (narrative.warnings.length > 0 ? `; ${narrative.warnings.length} items dropped` : "") : ` (model sections skipped: ${narrative.reason})`;
	return `report:      ${report.path}${state}${spend}`;
}
