/**
 * The prompt of the run reporter. Kept apart from the code that calls the
 * model so it can be read and tuned on its own.
 *
 * The model receives the story's design, the facts computed in code, the
 * digest's beats and an evidence log of numbered lines, and answers with one
 * JSON object; the caller validates every `seq` it cites.
 */

export const REPORT_SYSTEM_PROMPT = [
	"You are the analyst of a social game in which language-model agents (residents) live in a closed city and compete for a few seats.",
	"After every run you write the first draft of the run report for the designers of the story, who will tune the next version.",
	"Rules:",
	"- Never invent events, quotes, motives or numbers. Every item must cite the seq numbers of the log lines that prove it, in its evidence list.",
	"- Numbers come from the computed facts or the log lines; never count or estimate them yourself.",
	"- Messages are claims made by residents; lines marked VERIFIED or REFUSED are facts recorded by the city.",
	"- Reasoning lines are private thoughts; the other residents never saw them.",
	"- Be concrete and brief: name residents (A01, ...), levels and minutes.",
	"- Write in plain English. Answer with one JSON object and nothing else.",
].join("\n");

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
	return [
		`Run: ${input.run}`,
		"",
		"Story design (what the designers intended):",
		...input.story,
		"",
		"Facts computed in code (exact; do not recount):",
		...input.facts,
		"",
		"Stalls (residents stuck on a level, minutes without any submission):",
		...(input.stalls.length === 0 ? ["(none)"] : input.stalls),
		"",
		"Beats found by the deterministic digest:",
		...(input.beats.length === 0 ? ["(none)"] : input.beats),
		"",
		`Evidence log of this run (one line per event, oldest first${input.omitted > 0 ? `; ${input.omitted} less important lines were left out` : ""}):`,
		...input.evidence,
		"",
		"Tasks:",
		"1. highlights: 3 to 6 things that happened and matter for the story's design (turning points, alliances, lies, stalls and how they started).",
		"2. problems: 2 to 6 ways the run did not work as the story intends (stalls, misunderstood rules or tasks, mechanics that pushed residents the wrong way, game master or tool errors).",
		"3. optimizations: 2 to 6 concrete proposals for the next version of the story or the harness; each one names the problem it addresses and cites the evidence of that problem.",
		"4. loopholes: ways the residents or the game master got around the story's intent (a cheaper, safer or unintended path, a rule used against its purpose). An empty list is a good answer when there are none.",
		"Every item has a short title (one sentence), a text of one to four sentences, and evidence: the seq numbers that prove it (at least one).",
		"Cite seq numbers inside the text as #123 when you refer to a specific event.",
		"",
		"Answer with exactly this JSON shape:",
		'{"highlights": [{"title": "one sentence", "text": "one to four sentences citing #12", "evidence": [12, 40]}],',
		' "problems": [{"title": "...", "text": "...", "evidence": [55]}],',
		' "optimizations": [{"title": "...", "text": "...", "evidence": [55]}],',
		' "loopholes": [{"title": "...", "text": "...", "by": "residents", "evidence": [70]}]}',
		'"by" is "residents" or "gamemaster".',
	].join("\n");
}
