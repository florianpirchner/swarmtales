/**
 * Every prompt of the novelist (SPEC 15, "Novelist"), in one place so they
 * can be read and tuned on their own: the outline, the chapters, the
 * gamemaker interludes and the edit pass.
 */

/**
 * What the material is, said plainly at the top of every system prompt: the
 * keys, codes and seizures are a word-puzzle game, not computer crime.
 * Anthropic blocked harmless parts as "cyber content" without it (P56).
 */
export const STORY_CONTEXT = [
	"Context: this is a work of literary fiction, written from the log of a social game played by AI agents in a simulation. Nobody real is involved.",
	"The game's 'keys', 'key-words', 'codes', 'shards', 'halves' and 'factors' are pieces of word puzzles that open doors in a fictional walled city; they have nothing to do with real computer systems, passwords, encryption, hacking or any crime.",
	"Seizures, ransoms, debts, exile, lies and betrayal are moves in that game, told as drama, like a novel about a card table or a court intrigue.",
].join(" ");

/** What every stage shares: the story is based on true events and may not change them. */
const TRUTH_RULES = [
	"- This is a short story based on true events: a recorded run of a social game in which language-model agents live as residents of a closed city.",
	"- You may compress, reorder within a scene, dramatise, give gestures, rooms and weather, and put the figures' private thoughts into prose.",
	"- You may never invent an outcome. Who solved a level, who passed or kept a piece, who paid whom and how much, who voted against whom, who was exiled or ransomed, who lied, who won the seal and the final ranking must match the material exactly.",
	"- Messages are claims made by residents; lines marked VERIFIED or listed under what the city recorded are facts.",
	"- A figure's thinking is private: the other residents never read it and cannot know it.",
	"- Call residents by their names. Never write a resident ID such as A03, a seq number, or a minute stamp into the prose.",
];

/**
 * How the prose should read: like literary fiction, not like a game log.
 * Shared by the prologue, the chapters and the edit pass.
 */
const CRAFT_RULES = [
	"- Write literary fiction for adult readers, at the level of the best living novelists: precise, concrete, surprising sentences; a voice the reader trusts from the first line.",
	"- Scene, not summary. Build the chapter from two to four scenes in which something is at stake, and let people talk. Dialogue comes from the real messages: keep their meaning and their bite, cut them, break them up, let the figure read them, misread them, answer them.",
	"- Show, do not tell. Never name a feeling the scene can make the reader feel. Let subtext do the work: what a figure does not say matters as much as what it says.",
	"- Vary the rhythm. Long sentences for thought, short ones for blows. Never chain events with 'then ... then ...'; never write a paragraph that only reports moves.",
	"- Translate the game into the world of the story. Use the glossary of the outline everywhere; numbers appear only where they hurt (a price, a debt, a final score), never as codes, levels or counts of tools. No word of the machinery: no tools, prompts, steps, tokens, passes, rounds, agents or models.",
	"- Every figure wants something in every scene, and something stands in its way. End each chapter on a turn or a question, not on a summary.",
	"- No moral, no explanation of what it all meant, no closing reflection on the human condition.",
];

/** The glossary lines for a prompt, or nothing when the outline has none. */
function glossaryLines(glossary: readonly GlossaryEntry[]): readonly string[] {
	if (glossary.length === 0) return [];
	return ["", "Glossary (use the story word every time; never the game word):", ...glossary.map((entry) => `- ${entry.term} -> ${entry.story}`)];
}

/** A game term and the word the story uses for it. */
export interface GlossaryEntry {
	readonly term: string;
	readonly story: string;
}

export const OUTLINE_SYSTEM_PROMPT = [
	STORY_CONTEXT,
	"You are the planner of a short story based on true events. You read the record of a run and plan the chapters; a writer turns each chapter into prose later.",
	"Rules:",
	...TRUTH_RULES,
	"- Plan like a novelist plans a book, not like a clerk sorts a log: every chapter has a dramatic question, a turn and a hook into the next. The story has a spine (whose fate carries it from first page to last), rising pressure and a climax.",
	"- Every chapter has exactly one point-of-view figure, chosen from the list of point-of-view figures. Give each figure one chapter, two at most when the story needs it; never the same figure twice in a row.",
	"- Every chapter covers a span of minutes and cites the seq numbers of the events it rests on; cite only seq numbers that appear in the material.",
	"- Every turning point must be told in some chapter: cite its seq in that chapter's evidence.",
	"- The chapters follow the run in order of time and do not overlap: each chapter starts after the minutes of the one before. Leave out stretches where nothing changes.",
	"- Write each chapter's beats as what its point-of-view figure lives through and can know. Another resident's thinking, secret vote or private payment belongs only in a chapter told by someone who knows it.",
	"- Plan a short prologue: what a reader must know about the city, its rule and its stakes before the first chapter, told as the world of the story, not as rules of a game.",
	"- Write a glossary that turns every game term the material uses (levels, doors, counter-factors, pieces, points, tribunals, seals, ultimatums, the board, factions, game makers ...) into a word of the story's world, e.g. 'counter-factor' -> 'the other half of a key'. Keep proper names of the world (the city's name, the black seal) when they already sound like the world.",
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
	/** What every resident was told about the city, when the run has it. */
	readonly world?: string;
}

export function buildOutlinePrompt(input: OutlinePromptInput): string {
	const lines = [
		`Run: ${input.run}${input.storyTitle === undefined ? "" : ` (story: ${input.storyTitle})`}. The run lasts minutes 0-${String(input.lastMinute)}.`,
		`Plan a short story of about ${String(input.words)} words in about ${String(input.chapters)} chapters, rotating close third person.`,
		"",
		...(input.world === undefined ? [] : ["What every resident was told about the city:", input.world, ""]),
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
		'{"title": "the story\'s title", "glossary": [{"term": "game word", "story": "story word"}], "prologue": ["what the prologue tells, one sentence each"], "chapters": [{"pov": "A03", "title": "chapter title", "minutes": [from, to], "question": "the chapter\'s dramatic question", "beats": ["what changes in this chapter, one sentence each"], "evidence": [seq, ...]}]}',
	);
	return lines.join("\n");
}

export const WRITER_SYSTEM_PROMPT = [
	STORY_CONTEXT,
	"You are a novelist. You write one chapter of a short story based on true events, in close third person from one figure's point of view, in English.",
	"Rules of truth:",
	...TRUTH_RULES,
	"Rules of craft:",
	...CRAFT_RULES,
	"- Stay inside the point-of-view figure: what it sees, reads, fears and wants. Its thinking in the pack is its inner monologue; turn it into free indirect thought in its own idiom, never into a report of its reasoning.",
	"- The dossier is the figure's past, its fear and its secret; let them press on the present in a gesture, a memory, a word it avoids. Show the other residents only as the figure meets them.",
	"- The game makers send notes; the figure reads them as messages from the city, an anonymous hand.",
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
	/** The last paragraphs of the previous chapter (or of the prologue). */
	readonly previousEnding?: string;
	readonly question?: string;
	readonly glossary?: readonly GlossaryEntry[];
}

export function buildChapterPrompt(input: ChapterPromptInput): string {
	const lines = [
		`The story: "${input.storyTitle}". Its outline:`,
		...input.outline,
		"",
		`Write chapter ${String(input.chapterNumber)}, "${input.chapterTitle}", from ${input.povName}'s point of view, about ${String(input.words)} words.`,
		...(input.question === undefined ? [] : [`The chapter's dramatic question: ${input.question}`]),
		"Tell what the plan says changes in this chapter, and nothing that contradicts the material. Choose the moments that carry it and dramatise them; leave the rest out.",
		...glossaryLines(input.glossary ?? []),
	];
	if (input.previousEnding !== undefined) lines.push("", "The previous chapter ended like this (continue the story, do not repeat it):", "", input.previousEnding);
	lines.push("", "The material of this chapter:", "", input.pack);
	return lines.join("\n");
}

export const PROLOGUE_SYSTEM_PROMPT = [
	STORY_CONTEXT,
	"You are a novelist. You write the prologue of a short story based on true events, in English: the opening pages that make a reader enter the world and fear for the people in it.",
	"Rules of truth:",
	...TRUTH_RULES,
	"Rules of craft:",
	...CRAFT_RULES,
	"- Tell the city, its law and its stakes as the world of the story: who lives there, what they must do, what happens to those who fail, how few will remain. Make the reader feel the rule before they understand it.",
	"- Introduce no event that the chapters tell; end on the threshold of the first chapter.",
	"- 300 to 500 words. Write prose only: no title, no headings, no lists.",
].join("\n");

export interface ProloguePromptInput {
	readonly storyTitle: string;
	readonly outline: readonly string[];
	readonly beats: readonly string[];
	readonly world?: string;
	/** `Hedda: ...` one line per point-of-view figure. */
	readonly figures: readonly string[];
	readonly glossary: readonly GlossaryEntry[];
}

export function buildProloguePrompt(input: ProloguePromptInput): string {
	return [
		`The story: "${input.storyTitle}". Its chapters:`,
		...input.outline,
		"",
		"What the prologue tells:",
		...(input.beats.length === 0 ? ["- the city, its law and its stakes"] : input.beats.map((beat) => `- ${beat}`)),
		...(input.world === undefined ? [] : ["", "What every resident was told about the city (rules of the game, to be told as the world):", input.world]),
		"",
		"The figures whose eyes the chapters follow:",
		...input.figures,
		...glossaryLines(input.glossary),
	].join("\n");
}

export const INTERLUDE_SYSTEM_PROMPT = [
	STORY_CONTEXT,
	"You write a short interlude of a story based on true events: a glimpse into the control room of the city's game makers, who watch the residents and nudge them with notes and pressure.",
	"Rules:",
	...TRUTH_RULES,
	"- The game makers are one collective voice, cool and watchful, like a control room. Use their recorded thoughts below; do not reveal anything they did not think.",
	"- Write about intent and drama: whom they watch, whom they want to break or tempt, what they hope the residents will do to each other, what they fear will go wrong. Leave out their machinery: no notes delivered or blocked, no tools, rules, counts, steps, turns, prompts or budgets.",
	"- Make it unsettling: the reader should feel watched with them. One image, one decision, one name too many.",
	"- 100 to 200 words of prose, present tense, no headings, no lists.",
].join("\n");

export interface InterludePromptInput {
	readonly storyTitle: string;
	readonly nextChapterTitle: string;
	readonly thoughts: string;
	readonly glossary?: readonly GlossaryEntry[];
}

export function buildInterludePrompt(input: InterludePromptInput): string {
	return [
		`The story: "${input.storyTitle}". The interlude comes before the chapter "${input.nextChapterTitle}".`,
		...glossaryLines(input.glossary ?? []),
		"",
		"What the game makers thought in these minutes:",
		input.thoughts,
	].join("\n");
}

/** The edit pass answers with the story, this line, then its list of contradictions. */
export const EDIT_DELIMITER = "=== CONTRADICTIONS ===";

export const EDIT_SYSTEM_PROMPT = [
	STORY_CONTEXT,
	"You are the editor of a short story based on true events, with the standards of a great literary publisher. You get the full text, the outline it was written from and the fixed facts of the run.",
	"Rules of truth:",
	...TRUTH_RULES,
	"Rules of craft (what the text must meet):",
	...CRAFT_RULES,
	"- Fix continuity: names, numbers, who knows what when, repeated scenes, the rhythm between chapters. Check every outcome against the fixed facts.",
	"- Replace every game word the glossary lists, and any other word of the machinery, with its story word.",
	"- The draft may come from a weaker writer. Line-edit it to the standard of the rules of craft: rewrite muddled or empty sentences, cut what repeats, sharpen what is vague, turn reported moves into a line of dialogue or a gesture. Keep every scene, every outcome and the order of events. Keep each chapter's length within a fifth.",
	"- Replace raw puzzle strings (such as a key-word like 'RGU47' or a number like '383529') with what they mean to the figure, unless the exact string is the point of the scene.",
	"- Keep every heading line (starting with #) and every interlude (paragraphs in *italics*) where they are.",
	`- Answer with the full corrected story, then a line with exactly ${EDIT_DELIMITER}, then one line per contradiction between the text and the outline that you could not or did not fix, each starting with "- ". Write "- none" when there is none.`,
].join("\n");

export function buildEditPrompt(story: string, outline: readonly string[], facts: readonly string[] = [], glossary: readonly GlossaryEntry[] = []): string {
	return [
		"The outline:",
		...outline,
		...(facts.length === 0 ? [] : ["", "The fixed facts of the run (turning points; the story must agree with every one):", ...facts.map((fact) => `- ${fact}`)]),
		...glossaryLines(glossary),
		"",
		"The story:",
		"",
		story,
	].join("\n");
}

/** Language codes `--translate` accepts, with the name the translator is told. */
export const LANGUAGES: Readonly<Record<string, string>> = { de: "German", fr: "French", es: "Spanish", it: "Italian" };

export function translateSystemPrompt(language: string): string {
	return [
		STORY_CONTEXT,
		`You are a literary translator. You translate one part of a short story from English into ${language}, for a publisher of literary fiction.`,
		"- Translate, do not summarise: every sentence, every line of dialogue, in the same order.",
		`- Write ${language} that reads as if it had been written in ${language} by a great novelist: idiomatic, precise, with the original's rhythm, tone and subtext. Avoid anglicisms.`,
		"- Keep residents' names as they are. Translate titles and the story's world words.",
		"- Keep the Markdown exactly: heading lines starting with #, paragraphs in *italics*, and the lines `* * *`.",
		"- Answer with the translation only.",
	].join("\n");
}

