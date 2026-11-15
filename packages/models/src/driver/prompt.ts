// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The system prompt of a resident. A port of the old `baseSystemPrompt` with its `neutralSystemPrompt`, and of the
 * part of the old `hostResidents` that closes the prompt with the whisperer's brief (decision A86). Two worlds: the
 * neutral one (the header, the game's briefing, the steps with the tools sentence, the speech rule) and the City
 * (the header with the city, the ranking, the points, the claims, the steps with the city's tools sentence, the
 * speech rule, the names line). Both may open with the game's frame and go on with the persona and the character.
 * Not carried: the figure direction from 6 on (the old `direction`) and the weaver's text (the old `shift`). The
 * texts are prompt files under `library/prompts/resident/system/`.
 */
import type { PromptLookup } from "@swarmtales/contracts";
import { RESIDENT_RECORDS } from "../records.ts";

/**
 * A persona as the system prompt shows it (the old `Persona`, without its name).
 *
 * @public
 */
export interface PromptPersona {
	/** How it feels and reacts. */
	readonly temperament: string;
	/** What it holds dear. */
	readonly values: string;
	/** How it speaks. */
	readonly voice: string;
}

/**
 * The facts of the City world (the old `PromptFacts` of `baseSystemPrompt` with the world `city`).
 *
 * @public
 */
export interface CityPromptFacts {
	/** The name of the closed city, `ECHO`. */
	readonly name: string;
	/** How many residents remain at the end. */
	readonly survivors: number;
	/** How many residents the run has. */
	readonly residents: number;
	/** `story`: the resident sees only the tools of the city's doors (the old `toolScope: "story"`); `all`: every tool. */
	readonly tools: "story" | "all";
	/** With names: the tick before which a resident chooses its name (the old `names.untilMinute`); the header then names no id. */
	readonly namesUntil?: number;
}

/**
 * What the system prompt says about one resident.
 *
 * @public
 */
export interface PromptFacts {
	/** The resident's name, as it reads it (`A01`). */
	readonly id: string;
	/** The passes a tick gives it: the steps it gets at most per virtual minute. */
	readonly passes: number;
	/** The game's briefing for it, after the header; it is trimmed, and an empty one is left out (the old City had none). */
	readonly briefing: string;
	/** The game's frame (`prompt.frame` of the game), first in the prompt; it is trimmed, and an empty one is left out. */
	readonly frame?: string;
	/** The City world; the neutral one when absent. */
	readonly city?: CityPromptFacts;
	/** The persona block, after the speech rule (and the names line). */
	readonly persona?: PromptPersona;
	/** Who the resident is (the fact `prompt.character` of the game names, as `motives.prose`), after the persona, as it is. */
	readonly character?: string;
	/** A text only this resident reads, last, after a blank line (the whisperer's brief); it is trimmed. */
	readonly brief?: string;
}

type Render = (id: string, variables?: Readonly<Record<string, string | number>>) => string;

function stepsLine(passes: number, tools: string, render: Render): string {
	return render("steps", { passes, step: passes === 1 ? "step" : "steps", tools: render(tools) });
}

// The old `neutralSystemPrompt` between its frame and its persona.
function neutralLines(facts: PromptFacts, briefing: readonly string[], render: Render): readonly string[] {
	return [render("header-neutral", { id: facts.id }), ...briefing, stepsLine(facts.passes, "tools-neutral", render), render("speak")];
}

// The old `baseSystemPrompt` of the world `city` between its frame and its persona.
function cityLines(facts: PromptFacts, city: CityPromptFacts, briefing: readonly string[], render: Render): readonly string[] {
	const named = city.namesUntil;
	return [
		named === undefined ? render("header-id", { id: facts.id, city: city.name }) : render("header-named", { city: city.name }),
		...briefing,
		render("ranking", { survivors: city.survivors, agents: city.residents }),
		render("points"),
		render("claims"),
		stepsLine(facts.passes, city.tools === "story" ? "tools-story" : "tools-all", render),
		render("speak"),
		...(named === undefined ? [] : [render("names", { untilMinute: named })]),
	];
}

/**
 * Builds the system prompt of one resident. It is built once, after the kernel is created and before it starts, and
 * stays fixed for the run. Without `frame`, `city`, `persona`, `character` and `brief` it is the neutral prompt of
 * M1, byte for byte.
 *
 * @param facts - The resident's name, its passes and its briefing; the frame, the City, the persona, the character and the brief where they are given.
 * @param texts - The lookup that renders the prompt files.
 * @returns The system prompt.
 * @throws What the lookup throws when a prompt file is missing or declares other variables (`SWT-P010` to `SWT-P014`).
 * @example
 * ```ts
 * const prompt = systemPrompt({ id: "A01", passes: 4, briefing: resolved.briefings["resident:A01"] ?? "" }, createPromptLookup());
 * ```
 *
 * @public
 */
export function systemPrompt(facts: PromptFacts, texts: PromptLookup): string {
	const render: Render = (id, variables = {}) => texts.render(RESIDENT_RECORDS.id, `resident/system/${id}`, variables, Object.keys(variables));
	const frame = facts.frame?.trim() ?? "";
	const briefing = [facts.briefing.trim()].filter((text) => text.length > 0);
	const { persona, character } = facts;
	const base = [
		...(frame.length === 0 ? [] : [frame, ""]),
		...(facts.city === undefined ? neutralLines(facts, briefing, render) : cityLines(facts, facts.city, briefing, render)),
		...(persona === undefined ? [] : ["", render("persona", { temperament: persona.temperament, values: persona.values, voice: persona.voice })]),
		...(character === undefined ? [] : ["", character]),
	].join("\n");
	return facts.brief === undefined ? base : [base, facts.brief.trim()].join("\n\n");
}
