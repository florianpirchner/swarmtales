/**
 * Base system prompt (SPEC §5.4): the facts of the world and nothing else.
 * No goals, no strategy hints; a persona block is appended when present, and
 * after it the resident's character core as prose (v09), who it is, never
 * what to do; a story's frame for the cores comes first (who the resident
 * plays and how seriously). From figure direction 6 on the figure leads and
 * its direction closes the prompt (packages/engine/src/direction.ts). The prompt is built once per run from facts a resume keeps, so
 * it stays identical across a resume (prompt caching); the weaver (`--weaver`) rebuilds it with who the
 * story has made of the resident, a text the snapshot keeps as well.
 */
import type { CompetitorId } from "@swarmtales/kernel";
import { VOICE_RULE, type DirectionLevel } from "@swarmtales/engine";
import { render, text } from "@swarmtales/prompts";
import type { Persona } from "@swarmtales/contracts";

export interface PromptFacts {
	readonly id: CompetitorId;
	readonly city: string;
	readonly survivors: number;
	readonly agents: number;
	/** Steps a competitor may get per virtual minute (one per pass, SPEC §3). */
	readonly passesPerMinute: number;
	/** Resident names (v08): chosen before `untilMinute`. */
	readonly names?: { readonly untilMinute: number };
	/** The character core in prose (v09), heading and sentences. */
	readonly core?: string;
	/** The story's frame for residents with a core: what they play and how seriously, first in the prompt. */
	readonly frame?: string;
	/**
	 * A cast figure's direction (`--figure-direction`): from 6 the figure comes
	 * right after the frame with the voice rule; `block` (tendencies, rivals,
	 * orders) closes the prompt.
	 */
	readonly direction?: { readonly level: DirectionLevel; readonly block?: string };
	/**
	 * Who the story has made of the resident so far (the weaver, `--weaver`):
	 * follows its core, which it shifts and never replaces. Kept in the run
	 * snapshot, so a resumed run builds the same prompt.
	 */
	readonly shift?: string;
	/** The story shows only its own tools (`toolScope: "story"`); a tool the city opens later may appear. */
	readonly storyTools?: boolean;
}

/** The heading of the weaver's text in a resident's prompt. */
export const SHIFT_HEADING = text("competitor/system/shift-heading");

export function baseSystemPrompt(facts: PromptFacts, persona?: Persona): string {
	const lines = [
		// v09: in a city of names the resident is never "A03"; its status line shows the name the city knows it by.
		facts.names === undefined ? render("competitor/system/header-id", { id: facts.id, city: facts.city }) : render("competitor/system/header-named", { city: facts.city }),
		render("competitor/system/ranking", { survivors: facts.survivors, agents: facts.agents }),
		text("competitor/system/points"),
		text("competitor/system/claims"),
		render("competitor/system/steps", {
			passes: facts.passesPerMinute,
			step: facts.passesPerMinute === 1 ? "step" : "steps",
			tools: text(facts.storyTools === true ? "competitor/system/tools-story" : "competitor/system/tools-all"),
		}),
		text("competitor/system/speak"),
		...namesLines(facts),
	];
	if (persona !== undefined) {
		lines.push("", render("competitor/system/persona", { temperament: persona.temperament, values: persona.values, voice: persona.voice }));
	}
	const frame = facts.frame?.trim() ?? "";
	const direction = facts.direction;
	const shift = facts.shift?.trim() ?? "";
	const shiftBlock = shift.length === 0 ? [] : ["", SHIFT_HEADING, shift];
	if (direction !== undefined && direction.level >= 6 && facts.core !== undefined) {
		// Who the resident is comes before the city, and what it must do comes last, nearest to its answers.
		const head = [...(frame.length === 0 ? [] : [frame, ""]), facts.core, ...shiftBlock, "", VOICE_RULE, "", text("competitor/system/city-heading")];
		return [...head, ...lines, ...(direction.block === undefined ? [] : ["", direction.block])].join("\n");
	}
	if (facts.core !== undefined) lines.push("", facts.core);
	lines.push(...shiftBlock);
	return frame.length === 0 ? lines.join("\n") : [frame, "", ...lines].join("\n");
}

function namesLines(facts: PromptFacts): readonly string[] {
	const names = facts.names;
	if (names === undefined) return [];
	return [render("competitor/system/names", { untilMinute: names.untilMinute })];
}
