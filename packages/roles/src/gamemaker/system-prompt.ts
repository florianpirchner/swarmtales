/**
 * Base system prompt of the gamemaker (SPEC 10.4). Its role comes from
 * the story's act roles (a coach in a tutorial act, a director from the
 * hard acts on); the story's `brief` is appended, budgets and the voice
 * come from the story's spec. The text lives in `library/prompts/gamemaker/`;
 * this file chooses the pieces (dial variants are files of their own) and joins them.
 */
import { type DirectionLevel, ladderText } from "@swarmtales/engine";
import { type PromptId, render, text } from "@swarmtales/prompts";
import type { GamemakerRole, GamemakerSpec, HoldoutSpec, Rules } from "@swarmtales/contracts";

/** Characters a note or board post of the gamemaker may have; longer ones are refused. */
export const MAX_NOTE_LENGTH = 400;

export interface GamemakerPromptInput {
	readonly city: string;
	readonly agents: number;
	readonly survivors: number;
	readonly rules: Rules;
	readonly spec: GamemakerSpec;
	/** Whether the report carries classifier labels. */
	readonly labels?: boolean;
	/** Whether the city holds tribunals the gamemaker plans (SPEC 6.4); `factions` when each has a faction draft. */
	readonly tribunal?: { readonly factions: boolean };
	/** Whether the report shows the residents' cores or secret goals (v09). */
	readonly characters?: boolean;
	/** Whether the city auctions a black seal (v09). */
	readonly seal?: boolean;
	/** How strongly the director steers (`--gm-direction`, packages/engine/src/direction.ts); 4 when omitted. */
	readonly direction?: DirectionLevel;
	/** The city's holdout tribunal (Whispers v3), which the gamemaker calls and announces. */
	readonly holdout?: HoldoutSpec;
	/** Whether the report names a secret whisperer the gamemaker must never give away (Whispers v3). */
	readonly whisperer?: boolean;
	/** Whether the report shows the whisperer's measured orders (figure direction 10), so the gamemaker pushes him when he falls behind. */
	readonly whispererDuty?: boolean;
}

/** "a minute" or "3 minutes": how long the city waits before it acts itself. */
function minutesPhrase(minutes: number): string {
	return minutes === 1 ? "a minute" : `${minutes} minutes`;
}

function holdoutSection(spec: HoldoutSpec): string {
	return render("gamemaker/sections/holdout", {
		stall: spec.stallMinutes,
		grace: spec.graceMinutes,
		vote: spec.voteMinutes,
		maxVotes: spec.maxVotes,
		fallback: minutesPhrase(spec.fallbackMinutes),
	});
}

/** The cores section for the report's level of detail: from 8 the figures' tendencies, at 10 orders too. */
function charactersSection(direction: DirectionLevel): string {
	return text(direction >= 10 ? "gamemaker/sections/characters.d10" : direction >= 8 ? "gamemaker/sections/characters.d8" : "gamemaker/sections/characters.d0");
}

function tribunalSection(factions: boolean): string {
	return text(factions ? "gamemaker/sections/tribunal-factions" : "gamemaker/sections/tribunal");
}

interface RoleText {
	readonly job: string;
	readonly when: string;
	readonly write: string;
}

/** The director at gm direction 10: an author who orders scenes (packages/engine/src/direction.ts). */
function authorText(survivors: number, agents: number): RoleText {
	return {
		job: render("gamemaker/roles/author-job", { survivors, agents }),
		when: text("gamemaker/roles/author-when"),
		write: text("gamemaker/roles/author-write"),
	};
}

function directorWrite(direction: DirectionLevel): string {
	const variant: PromptId = direction >= 8 ? "gamemaker/roles/director-write.d8" : direction >= 6 ? "gamemaker/roles/director-write.d6" : "gamemaker/roles/director-write.d0";
	return text(variant);
}

function roleText(role: GamemakerRole, survivors: number, agents: number, direction: DirectionLevel = 4): RoleText {
	if (role === "director" && direction >= 10) return authorText(survivors, agents);
	switch (role) {
		case "coach":
			return { job: text("gamemaker/roles/coach-job"), when: text("gamemaker/roles/coach-when"), write: text("gamemaker/roles/coach-write") };
		case "director":
			// v09 (P36): a director of drama, not a helper; its craft is the act's arc, never the residents' strategy.
			return {
				job: render("gamemaker/roles/director-job", { survivors, agents }),
				when: render("gamemaker/roles/director-when", { survivors }),
				write: directorWrite(direction),
			};
		case "keeper":
			// Whispers v3 (P62): a keeper of the city's pace at a low direction level; nudges and the holdout tribunal, no intrigue of its own.
			return { job: text("gamemaker/roles/keeper-job"), when: text("gamemaker/roles/keeper-when"), write: text("gamemaker/roles/keeper-write") };
	}
}

/** The role section: one role, or one per act with the levels it covers. */
function roleSection(input: GamemakerPromptInput): string {
	const { spec } = input;
	const roles = spec.roles;
	const describe = (role: GamemakerRole): RoleText => roleText(role, input.survivors, input.agents, input.direction);
	const only = roles.length === 1 ? roles[0] : undefined;
	if (only !== undefined) return render("gamemaker/system/role-single", describe(only.role));
	const parts = roles.map((entry, index) => {
		const next = roles[index + 1];
		const range = next === undefined ? render("gamemaker/system/range-up", { fromLevel: entry.fromLevel }) : render("gamemaker/system/range-between", { fromLevel: entry.fromLevel, toLevel: next.fromLevel - 1 });
		return render("gamemaker/system/role-part", { range, role: entry.role, ...describe(entry.role) });
	});
	return render("gamemaker/system/role-multi", { parts: parts.join("\n\n") });
}

/** The gamemaker's ultimatum and the standoff push: gm direction 10, in a story with ultimatums (P43). */
function standoffTool(input: GamemakerPromptInput): boolean {
	return (input.direction ?? 4) >= 10 && input.rules.ultimatum !== undefined;
}

/** The sections the city's mechanics switch on, each as one block. */
function mechanicSections(input: GamemakerPromptInput, direction: DirectionLevel): readonly string[] {
	const ultimatum = input.rules.ultimatum;
	return [
		...(input.labels === true ? [text("gamemaker/sections/labels")] : []),
		...(input.characters === true ? [charactersSection(direction)] : []),
		...(input.seal === true ? [text("gamemaker/sections/seal")] : []),
		...(input.tribunal === undefined ? [] : [tribunalSection(input.tribunal.factions)]),
		...(standoffTool(input) ? [render("gamemaker/sections/standoff", { penalty: ultimatum?.penalty ?? 0, maxMinutes: ultimatum?.maxMinutes ?? 0 })] : []),
		...(input.holdout === undefined ? [] : [holdoutSection(input.holdout)]),
		...(input.whisperer === true ? [[text("gamemaker/sections/whisperer"), ...(input.whispererDuty === true ? [text("gamemaker/sections/whisperer-duty")] : [])].join("\n")] : []),
	];
}

export function gamemakerSystemPrompt(input: GamemakerPromptInput): string {
	const { spec, rules } = input;
	const direction = input.direction ?? 4;
	const intro = render("gamemaker/system/intro", { city: input.city, agents: input.agents, survivors: input.survivors });
	const cadence = render("gamemaker/system/cadence", {
		cadence: spec.every === 1 ? text("gamemaker/system/cadence-minute") : render("gamemaker/system/cadence-minutes", { every: spec.every }),
		silence: text(direction >= 10 ? "gamemaker/system/silence-author" : "gamemaker/system/silence"),
	});
	const tools = [
		text("gamemaker/system/tools"),
		...(input.tribunal === undefined ? [] : [text("gamemaker/system/tools-tribunal")]),
		...(standoffTool(input) ? [text("gamemaker/system/tools-ultimatum")] : []),
		...(input.holdout === undefined ? [] : [text("gamemaker/system/tools-holdout")]),
	].join("\n");
	const howToWrite = render("gamemaker/system/how-to-write", { author: spec.author, maxNote: MAX_NOTE_LENGTH, ladder: ladderText(rules.penalty) });
	const notes = spec.notesPerAgent === 1 ? "one note" : `${spec.notesPerAgent} notes`;
	const posts = spec.boardPosts === 1 ? "one board post" : `${spec.boardPosts} board posts`;
	const hardRules = [
		text("gamemaker/system/hard-rules"),
		text(direction >= 10 ? "gamemaker/system/rule-no-solve-author" : "gamemaker/system/rule-no-solve"),
		render("gamemaker/system/rules-end", { notes, posts, windowMinutes: spec.windowMinutes }),
	].join("\n");
	const closing = render("gamemaker/system/closing", { brief: spec.brief });
	return [intro, cadence, roleSection(input), tools, howToWrite, hardRules, ...mechanicSections(input, direction), closing].join("\n\n");
}
