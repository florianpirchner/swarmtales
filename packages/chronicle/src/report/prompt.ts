/**
 * The prompt of the run reporter. Kept apart from the code that calls the
 * model so it can be read and tuned on its own.
 *
 * The model receives the story's design, the facts computed in code, the
 * digest's beats and an evidence log of numbered lines, and answers with one
 * JSON object; the caller validates every `seq` it cites.
 */
import { render, text } from "../prompts/library.ts";

export const REPORT_SYSTEM_PROMPT = text("reporter/system");

export interface ReportPromptInput {
	readonly run: string;
	/** The story's design: title, rules, acts and level tasks. */
	readonly story: readonly string[];
	/** The header and result tables, as computed in code. */
	readonly facts: readonly string[];
	/** Stuck residents and minutes without submissions. */
	readonly stalls: readonly string[];
	/** Beats of the deterministic digest. */
	readonly beats: readonly string[];
	/** Numbered evidence lines, e.g. `#42 m7 A03 DM to A05: "..."`. */
	readonly evidence: readonly string[];
	/** Number of evidence lines left out to keep the prompt small. */
	readonly omitted: number;
}

export function buildReportPrompt(input: ReportPromptInput): string {
	const none = text("reporter/none");
	const omitted = input.omitted > 0 ? `; ${render("reporter/evidence-omitted", { omitted: input.omitted })}` : "";
	return [
		render("reporter/run", { run: input.run }),
		"",
		text("reporter/story-heading"),
		...input.story,
		"",
		text("reporter/facts-heading"),
		...input.facts,
		"",
		text("reporter/stalls-heading"),
		...(input.stalls.length === 0 ? [none] : input.stalls),
		"",
		text("reporter/beats-heading"),
		...(input.beats.length === 0 ? [none] : input.beats),
		"",
		render("reporter/evidence-heading", { omitted }),
		...input.evidence,
		"",
		text("reporter/tasks"),
		"",
		text("reporter/answer-shape"),
	].join("\n");
}
