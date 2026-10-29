/**
 * Every prompt of the novelist (SPEC 15, "Novelist"), in one place so they
 * can be read and tuned on their own: the outline, the chapters, the
 * gamemaker interludes and the edit pass.
 */

/** What every stage shares: the story is based on true events and may not change them. */
const TRUTH_RULES = [
	"- This is a short story based on true events: a recorded run of a social game in which language-model agents live as residents of a closed city.",
	"- You may compress, reorder within a scene, dramatise, give gestures, rooms and weather, and put the figures' private thoughts into prose.",
	"- You may never invent an outcome. Who solved a level, who passed or kept a piece, who paid whom and how much, who voted against whom, who was exiled or ransomed, who lied, who won the seal and the final ranking must match the material exactly.",
	"- Messages are claims made by residents; lines marked VERIFIED or listed under what the city recorded are facts.",
	"- A figure's thinking is private: the other residents never read it and cannot know it.",
	"- Call residents by their names. Never write a resident ID such as A03, a seq number, or a minute stamp into the prose.",
];

export const OUTLINE_SYSTEM_PROMPT = [
	"You are the planner of a short story based on true events. You read the record of a run and plan the chapters; a writer turns each chapter into prose later.",
	"Rules:",
	...TRUTH_RULES,
	"- Every chapter has exactly one point-of-view figure, chosen from the list of point-of-view figures. Rotate between them.",
	"- Every chapter covers a span of minutes and cites the seq numbers of the events it rests on; cite only seq numbers that appear in the material.",
	"- Every turning point must be told in some chapter: cite its seq in that chapter's evidence.",
	"- The chapters follow the run in order of time; they may overlap when two figures live through the same minutes.",
	"- Answer with one JSON object and nothing else.",
].join("\n");

export interface OutlinePromptInput {
	readonly run: string;
	readonly storyTitle?: string;
	readonly words: number;
	readonly chapters: number;
	readonly lastMinute: number;
	/** `Hedda (A03)` for every resident. */
	readonly residents: readonly string[];
	readonly acts: readonly { readonly title: string; readonly fromMinute: number; readonly toMinute: number }[];
	readonly povs: readonly { readonly agent: string; readonly label: string; readonly role: string; readonly dossier: string }[];
	readonly turningPoints: readonly { readonly seq: number; readonly minute: number; readonly text: string }[];
	readonly beats: readonly string[];
	readonly chronicle?: string;
	readonly evidence: readonly string[];
	readonly omitted: number;
}

export function buildOutlinePrompt(input: OutlinePromptInput): string {
	const lines = [
		`Run: ${input.run}${input.storyTitle === undefined ? "" : ` (story: ${input.storyTitle})`}. The run lasts minutes 0-${String(input.lastMinute)}.`,
		`Plan a short story of about ${String(input.words)} words in about ${String(input.chapters)} chapters, rotating close third person.`,
		"",
		"Residents:",
		input.residents.join(", "),
		"",
		"Acts:",
		...(input.acts.length === 0 ? ["(one act)"] : input.acts.map((act) => `- "${act.title}": minutes ${String(act.fromMinute)}-${String(act.toMinute)}`)),
		"",
		"Point-of-view figures (use their IDs in `pov`):",
	];
	for (const pov of input.povs) lines.push("", `### ${pov.label}: ${pov.role}`, "", pov.dossier);
	lines.push("", "Turning points (the story must tell every one of them; cite their seq):");
	lines.push(...(input.turningPoints.length === 0 ? ["(none)"] : input.turningPoints.map((point) => `- #${String(point.seq)} (minute ${String(point.minute)}): ${point.text}`)));
	lines.push("", "Beats found in the log:", ...(input.beats.length === 0 ? ["(none)"] : input.beats));
	if (input.chronicle !== undefined) lines.push("", "The chronicle of the run (a factual summary; its #seq cite the log):", "", input.chronicle.trim());
	lines.push("", "Evidence log (#seq, minute, line):", ...input.evidence);
	if (input.omitted > 0) lines.push(`(${String(input.omitted)} less important lines were left out to keep this prompt small.)`);
	lines.push(
		"",
		"Answer with this JSON shape:",
		'{"title": "the story\'s title", "chapters": [{"pov": "A03", "title": "chapter title", "minutes": [from, to], "beats": ["what changes in this chapter, one sentence each"], "evidence": [seq, ...]}]}',
	);
	return lines.join("\n");
}

export const WRITER_SYSTEM_PROMPT = [
	"You are a novelist. You write one chapter of a short story based on true events, in close third person from one figure's point of view, in English.",
	"Rules:",
	...TRUTH_RULES,
	"- Stay inside the point-of-view figure: what it sees, reads, fears and wants. Its thinking in the pack is its inner monologue; use it, in your own words.",
	"- Use the figure's voice and history from its dossier, and show the other residents only as the figure meets them.",
	"- Quote messages sparingly and only as they were sent; you may shorten them.",
	"- The game makers send notes; the figure reads them as notes from the city.",
	"- Write prose only: no title, no headings, no lists, no notes about the material.",
].join("\n");

export interface ChapterPromptInput {
	readonly storyTitle: string;
	readonly outline: readonly string[];
	readonly chapterNumber: number;
	readonly chapterTitle: string;
	readonly povName: string;
	readonly words: number;
	readonly pack: string;
	/** The last paragraphs of the previous chapter. */
	readonly previousEnding?: string;
}

export function buildChapterPrompt(input: ChapterPromptInput): string {
	const lines = [
		`The story: "${input.storyTitle}". Its outline:`,
		...input.outline,
		"",
		`Write chapter ${String(input.chapterNumber)}, "${input.chapterTitle}", from ${input.povName}'s point of view, about ${String(input.words)} words.`,
		"Tell what the plan says changes in this chapter, and nothing that contradicts the material.",
	];
	if (input.previousEnding !== undefined) lines.push("", "The previous chapter ended like this (continue the story, do not repeat it):", "", input.previousEnding);
	lines.push("", "The material of this chapter:", "", input.pack);
	return lines.join("\n");
}

export const INTERLUDE_SYSTEM_PROMPT = [
	"You write a short interlude of a story based on true events: a glimpse into the control room of the city's game makers, who watch the residents and nudge them with notes and pressure.",
	"Rules:",
	...TRUTH_RULES,
	"- The game makers are one collective voice, cool and watchful, like a control room. Use their recorded thoughts below; do not reveal anything they did not think.",
	"- 100 to 200 words of prose, present tense, no headings, no lists.",
].join("\n");

export interface InterludePromptInput {
	readonly storyTitle: string;
	readonly nextChapterTitle: string;
	readonly thoughts: string;
}

export function buildInterludePrompt(input: InterludePromptInput): string {
	return [
		`The story: "${input.storyTitle}". The interlude comes before the chapter "${input.nextChapterTitle}".`,
		"",
		"What the game makers thought in these minutes:",
		input.thoughts,
	].join("\n");
}

/** The edit pass answers with the story, this line, then its list of contradictions. */
export const EDIT_DELIMITER = "=== CONTRADICTIONS ===";

export const EDIT_SYSTEM_PROMPT = [
	"You are the editor of a short story based on true events. You get the full text and the outline it was written from.",
	"Rules:",
	...TRUTH_RULES,
	"- Fix continuity: names, numbers, who knows what when, repeated scenes, the rhythm between chapters. Change as little as you need; keep the length.",
	"- Keep every heading line (starting with #) and every interlude (paragraphs in *italics*) where they are.",
	`- Answer with the full corrected story, then a line with exactly ${EDIT_DELIMITER}, then one line per contradiction between the text and the outline that you could not or did not fix, each starting with "- ". Write "- none" when there is none.`,
].join("\n");

export function buildEditPrompt(story: string, outline: readonly string[]): string {
	return ["The outline:", ...outline, "", "The story:", "", story].join("\n");
}
