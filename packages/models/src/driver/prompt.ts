// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The neutral system prompt of a resident. A port of the old `neutralSystemPrompt` without its City parts (frame,
 * persona, motive, shift): the header, the game's briefing, the steps with the tools sentence and the speech rule,
 * joined by newlines. The four texts are prompt files under `library/prompts/resident/system/`.
 */
import type { PromptLookup } from "@swarmtales/contracts";
import { RESIDENT_RECORDS } from "../records.ts";

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
	/** The game's briefing for it; it is trimmed, and an empty one is left out. */
	readonly briefing: string;
}

/**
 * Builds the system prompt of one resident. It is built once, before the genesis, and stays fixed for the run.
 *
 * @param facts - The resident's name, its passes and its briefing.
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
	const owner = RESIDENT_RECORDS.id;
	const briefing = facts.briefing.trim();
	const tools = texts.render(owner, "resident/system/tools-neutral", {}, []);
	return [
		texts.render(owner, "resident/system/header-neutral", { id: facts.id }, ["id"]),
		...(briefing.length === 0 ? [] : [briefing]),
		texts.render(owner, "resident/system/steps", { passes: facts.passes, step: facts.passes === 1 ? "step" : "steps", tools }, ["passes", "step", "tools"]),
		texts.render(owner, "resident/system/speak", {}, []),
	].join("\n");
}
