// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker's system text, carried from old `packages/roles/src/gamemaker/system-prompt.ts`: its role comes
 * from the game's act roles, the game's brief is appended, the budgets and the voice come from the game's spec, the
 * direction dial picks the variants. The text lives in `prompts/gamemaker/` of this package; this file chooses the
 * pieces and joins them. Only the readers changed: the old `text` and `render` are the {@link GamemakerTexts} the
 * game hands in.
 */
import type { DirectionLevel, GamemakerPromptInput, GamemakerRole, HoldoutTiming, PenaltyLadder } from "./spec.ts";
import type { GamemakerTexts } from "./texts.ts";

/**
 * Characters a note or board post of the gamemaker may have; longer ones are refused (old `MAX_NOTE_LENGTH`).
 *
 * @public
 */
export const MAX_NOTE_LENGTH = 400;

// "2, 4, 6, then 8 points" or "8 points": the ladder in words (old `ladderText`).
function ladderText(ladder: PenaltyLadder): string {
	const steps = typeof ladder === "number" ? [ladder] : ladder;
	const last = steps.at(-1) ?? 0;
	if (steps.length <= 1) return `${String(last)} ${last === 1 ? "point" : "points"}`;
	return `${steps.slice(0, -1).join(", ")}, then ${String(last)} points`;
}

// "a minute" or "3 minutes": how long the city waits before it acts itself.
function minutesPhrase(minutes: number): string {
	return minutes === 1 ? "a minute" : `${String(minutes)} minutes`;
}

function holdoutSection(t: GamemakerTexts, spec: HoldoutTiming): string {
	return t.render("gamemaker/sections/holdout", { stall: spec.stallMinutes, grace: spec.graceMinutes, vote: spec.voteMinutes, maxVotes: spec.maxVotes, fallback: minutesPhrase(spec.fallbackMinutes) });
}

// The core motives section for the report's level of detail: from 8 the figures' tendencies, at 10 orders too.
function charactersSection(t: GamemakerTexts, direction: DirectionLevel): string {
	return t.text(direction >= 10 ? "gamemaker/sections/characters.d10" : direction >= 8 ? "gamemaker/sections/characters.d8" : "gamemaker/sections/characters.d0");
}

interface RoleText {
	readonly job: string;
	readonly when: string;
	readonly write: string;
}

function directorWrite(t: GamemakerTexts, direction: DirectionLevel): string {
	return t.text(direction >= 8 ? "gamemaker/roles/director-write.d8" : direction >= 6 ? "gamemaker/roles/director-write.d6" : "gamemaker/roles/director-write.d0");
}

function roleText(t: GamemakerTexts, role: GamemakerRole, input: GamemakerPromptInput, direction: DirectionLevel): RoleText {
	const { survivors, agents } = input;
	// The director at direction 10 is an author who orders scenes.
	if (role === "director" && direction >= 10) return { job: t.render("gamemaker/roles/author-job", { survivors, agents }), when: t.text("gamemaker/roles/author-when"), write: t.text("gamemaker/roles/author-write") };
	switch (role) {
		case "coach":
			return { job: t.text("gamemaker/roles/coach-job"), when: t.text("gamemaker/roles/coach-when"), write: t.text("gamemaker/roles/coach-write") };
		case "director":
			return { job: t.render("gamemaker/roles/director-job", { survivors, agents }), when: t.render("gamemaker/roles/director-when", { survivors }), write: directorWrite(t, direction) };
		case "keeper":
			return { job: t.text("gamemaker/roles/keeper-job"), when: t.text("gamemaker/roles/keeper-when"), write: t.text("gamemaker/roles/keeper-write") };
	}
}

// The role section: one role, or one per act with the levels it covers.
function roleSection(t: GamemakerTexts, input: GamemakerPromptInput, direction: DirectionLevel): string {
	const roles = input.spec.roles;
	const describe = (role: GamemakerRole): RoleText => roleText(t, role, input, direction);
	const only = roles.length === 1 ? roles[0] : undefined;
	if (only !== undefined) return t.render("gamemaker/system/role-single", { ...describe(only.role) });
	const parts = roles.map((entry, index) => {
		const next = roles[index + 1];
		const range = next === undefined ? t.render("gamemaker/system/range-up", { fromLevel: entry.fromLevel }) : t.render("gamemaker/system/range-between", { fromLevel: entry.fromLevel, toLevel: next.fromLevel - 1 });
		return t.render("gamemaker/system/role-part", { range, role: entry.role, ...describe(entry.role) });
	});
	return t.render("gamemaker/system/role-multi", { parts: parts.join("\n\n") });
}

// The gamemaker's ultimatum and the standoff push: direction 10, in a game with ultimatums.
function standoffTool(input: GamemakerPromptInput, direction: DirectionLevel): boolean {
	return direction >= 10 && input.rules.ultimatum !== undefined;
}

function whispererSection(t: GamemakerTexts, input: GamemakerPromptInput): readonly string[] {
	if (input.whisperer !== true) return [];
	return [[t.text("gamemaker/sections/whisperer"), ...(input.whispererDuty === true ? [t.text("gamemaker/sections/whisperer-duty")] : [])].join("\n")];
}

// The tribunal's and the standoff's sections.
function conflictSections(t: GamemakerTexts, input: GamemakerPromptInput, direction: DirectionLevel): readonly string[] {
	const ultimatum = input.rules.ultimatum;
	return [
		...(input.tribunal === undefined ? [] : [t.text(input.tribunal.factions ? "gamemaker/sections/tribunal-factions" : "gamemaker/sections/tribunal")]),
		...(standoffTool(input, direction) ? [t.render("gamemaker/sections/standoff", { penalty: ultimatum?.penalty ?? 0, maxMinutes: ultimatum?.maxMinutes ?? 0 })] : []),
	];
}

// The sections the city's mechanics switch on, each as one block.
function mechanicSections(t: GamemakerTexts, input: GamemakerPromptInput, direction: DirectionLevel): readonly string[] {
	return [
		...(input.labels === true ? [t.text("gamemaker/sections/labels")] : []),
		...(input.characters === true ? [charactersSection(t, direction)] : []),
		...(input.seal === true ? [t.text("gamemaker/sections/seal")] : []),
		...conflictSections(t, input, direction),
		...(input.holdout === undefined ? [] : [holdoutSection(t, input.holdout)]),
		...whispererSection(t, input),
	];
}

function toolsSection(t: GamemakerTexts, input: GamemakerPromptInput, direction: DirectionLevel): string {
	return [
		t.text("gamemaker/system/tools"),
		...(input.tribunal === undefined ? [] : [t.text("gamemaker/system/tools-tribunal")]),
		...(standoffTool(input, direction) ? [t.text("gamemaker/system/tools-ultimatum")] : []),
		...(input.holdout === undefined ? [] : [t.text("gamemaker/system/tools-holdout")]),
	].join("\n");
}

function hardRules(t: GamemakerTexts, input: GamemakerPromptInput, direction: DirectionLevel): string {
	const { spec } = input;
	const notes = spec.notesPerAgent === 1 ? "one note" : `${String(spec.notesPerAgent)} notes`;
	const posts = spec.boardPosts === 1 ? "one board post" : `${String(spec.boardPosts)} board posts`;
	return [
		t.text("gamemaker/system/hard-rules"),
		t.text(direction >= 10 ? "gamemaker/system/rule-no-solve-author" : "gamemaker/system/rule-no-solve"),
		t.render("gamemaker/system/rules-end", { notes, posts, windowMinutes: spec.windowMinutes }),
	].join("\n");
}

/**
 * The gamemaker's system text (old `gamemakerSystemPrompt`).
 *
 * @param input - The game's data and dials.
 * @param t - The readers of the prompt files.
 * @returns The text, the same for every look of the run.
 * @throws Whatever a reader throws: a missing prompt file, or variables that differ from the file's.
 *
 * @public
 */
export function gamemakerSystemPrompt(input: GamemakerPromptInput, t: GamemakerTexts): string {
	const { spec } = input;
	const direction = input.direction ?? 4;
	const intro = t.render("gamemaker/system/intro", { city: input.city, agents: input.agents, survivors: input.survivors });
	const cadence = t.render("gamemaker/system/cadence", {
		cadence: spec.every === 1 ? t.text("gamemaker/system/cadence-minute") : t.render("gamemaker/system/cadence-minutes", { every: spec.every }),
		silence: t.text(direction >= 10 ? "gamemaker/system/silence-author" : "gamemaker/system/silence"),
	});
	const howToWrite = t.render("gamemaker/system/how-to-write", { author: spec.author, maxNote: MAX_NOTE_LENGTH, ladder: ladderText(input.rules.penalty) });
	const closing = t.render("gamemaker/system/closing", { brief: spec.brief });
	return [intro, cadence, roleSection(t, input, direction), toolsSection(t, input, direction), howToWrite, hardRules(t, input, direction), ...mechanicSections(t, input, direction), closing].join("\n\n");
}
