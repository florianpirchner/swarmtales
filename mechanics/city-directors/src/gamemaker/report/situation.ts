// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The text of one look, carried from old `apps/cli/src/host/report.ts` (`hostSituation`, `waitLines`, `noteLines`):
 * every section from its owner's fact, in the old order, then the parts the gamemaker keeps itself (the events
 * since its last look, the Confessor's labels, its notes, the budget line). A mechanic that is not loaded has no
 * fact, and its section is empty, as the old report wrote none without the feature. Every fact value is parsed
 * with its schema (untrusted input); a value that does not fit throws.
 */
import { Type, type Static, type TSchema } from "typebox";
import { Parse } from "typebox/value";
import type { DirectionLevel } from "../spec.ts";
import { characterLines, FiguresSchema, LinesSchema, type Figure } from "./characters.ts";
import { HoldoutSectionSchema, renderHoldoutSection } from "./holdout.ts";
import { ProgressionSectionSchema, renderProgressionHeader, renderResidents, type ProgressionSection, type ResidentTrack } from "./progression.ts";
import { Id, Ids, Int } from "./schema.ts";
import { renderRiskSection, renderStandoffSection, StandoffSectionSchema } from "./standoff.ts";
import { renderTribunalSection, TribunalSectionSchema } from "./tribunal.ts";
import { renderSealSection, renderWhispererSection, SealSectionSchema, WhispererSectionSchema } from "./whisperer-seal.ts";

/**
 * The value of the fact `puzzles.needs` (old `NeedsFact`): who each resident in the city depends on at its level.
 *
 * @public
 */
export const NeedsSchema = Type.Array(
	Type.Object({ agent: Id(), level: Int("Its level"), fragments: Type.Boolean({ description: "The level is dealt as fragments" }), on: Ids("Who it depends on") }, { description: "One resident" }),
	{ description: "The dependencies of the residents in the city" },
);

/**
 * A note or board post of the gamemaker (old `Note`).
 *
 * @public
 */
export interface GamemakerNote {
	/** The tick it was sent. */
	readonly minute: number;
	/** A resident id, `board`, or `tribunal` for a tribunal's line. */
	readonly to: string;
	/** Its text. */
	readonly text: string;
}

/**
 * What a look reads besides the facts: the parts the gamemaker keeps itself.
 *
 * @public
 */
export interface LookParts {
	/** The round the look follows. */
	readonly round: number;
	/** The direction of the report (the gamemaker's direction level). */
	readonly direction: DirectionLevel;
	/** The figures of the game's cast with their direction. */
	readonly cast: readonly Figure[];
	/** The tracks per resident. */
	readonly tracks: ReadonlyMap<string, ResidentTrack>;
	/** The lines under "Since your last look:", each starting with `- `; empty: nothing happened. */
	readonly recent: readonly string[];
	/** The Confessor's label blocks, each with its blank line. */
	readonly labels: readonly string[];
	/** The gamemaker's notes, oldest first. */
	readonly notes: readonly GamemakerNote[];
	/** The budget line. */
	readonly budget: string;
}

/** Most lines under "Since your last look:" (old `MAX_RECENT_LINES`): a large city writes hundreds between two looks. */
const MAX_RECENT_LINES = 150;

// A fact's value parsed with `schema`, or `fallback` when the fact is not read.
function factOr<T extends TSchema, F>(facts: Readonly<Record<string, unknown>>, key: string, schema: T, fallback: F): Static<T> | F {
	const value = facts[key];
	return value === undefined ? fallback : Parse(schema, value);
}

// The lines under "Who waits on whom" (old `waitLines`); a level that hides its teams names nobody.
function waitLines(progression: ProgressionSection, needs: Static<typeof NeedsSchema>): readonly string[] {
	const levelOf = new Map(progression.ranking.map((entry) => [entry.agent, entry.level]));
	const level = (agent: string): number => levelOf.get(agent) ?? 0;
	const lines = progression.standing.flatMap((entry) => {
		const need = needs.find((candidate) => candidate.agent === entry.agent && candidate.level === entry.level);
		const behind = need === undefined ? [] : need.on.filter((member) => level(member) < entry.level);
		if (need === undefined || behind.length === 0) return [];
		const levels = [...new Set(behind.map(level))].sort((a, b) => a - b).join("/");
		const blockers = need.fragments && !entry.teamPlaceholders ? `${String(behind.length)} unnamed ${behind.length === 1 ? "teammate" : "teammates"} on level ${levels} (this level hides its teams)` : behind.map((member) => `${member} (level ${String(level(member))})`).join(", ");
		return [`- ${entry.agent} (level ${String(entry.level)}) waits on ${blockers}`];
	});
	return lines.length === 0 ? ["- nobody"] : lines;
}

function recentLines(recent: readonly string[]): readonly string[] {
	if (recent.length === 0) return ["- nothing happened"];
	if (recent.length <= MAX_RECENT_LINES) return recent;
	return [`- (${String(recent.length - MAX_RECENT_LINES)} earlier lines left out)`, ...recent.slice(-MAX_RECENT_LINES)];
}

function noteLines(notes: readonly GamemakerNote[]): readonly string[] {
	return notes.length === 0 ? ["- none"] : notes.slice(-12).map((note) => `- minute ${String(note.minute)} to ${note.to}: "${note.text}"`);
}

// The blocks of the city between the residents and the waits, each from its fact.
function cityLines(facts: Readonly<Record<string, unknown>>, parts: LookParts, alive: readonly string[]): readonly string[] {
	const characters = { lines: factOr(facts, "motives.lines", LinesSchema, {}), figures: factOr(facts, "motives.coreMotives", FiguresSchema, {}), goals: factOr(facts, "goals.texts", LinesSchema, {}), cast: parts.cast, direction: parts.direction };
	return [
		...characterLines(characters, alive),
		...renderTribunalSection(factOr(facts, "tribunal.section", TribunalSectionSchema, null)),
		...renderWhispererSection(factOr(facts, "whispers.section", WhispererSectionSchema, null)),
		...renderHoldoutSection(factOr(facts, "standoff-tribunal.section", HoldoutSectionSchema, null)),
		...renderSealSection(factOr(facts, "seal.section", SealSectionSchema, null)),
	];
}

/**
 * The text of one look (old `hostSituation`), before the names of the city are applied.
 *
 * @param facts - The facts the gamemaker reads, by key; `progression.section` must be among them.
 * @param parts - The round, the direction, the cast and what the gamemaker keeps itself.
 * @returns The text.
 * @throws TypeBox's parse error when a fact's value does not fit its schema, or `progression.section` is missing.
 *
 * @public
 */
export function gamemakerSituation(facts: Readonly<Record<string, unknown>>, parts: LookParts): string {
	const progression = Parse(ProgressionSectionSchema, facts["progression.section"]);
	const standoff = factOr(facts, "standoff.section", StandoffSectionSchema, null);
	const levelSince = (agent: string): number => parts.tracks.get(agent)?.levelSince ?? 0;
	return [
		...renderProgressionHeader(progression, parts.round),
		"",
		...renderResidents(progression, parts.tracks),
		"",
		...cityLines(facts, parts, progression.alive),
		"Who waits on whom (a door opens only with every fragment or factor a resident needs):",
		...waitLines(progression, factOr(facts, "puzzles.needs", NeedsSchema, [])),
		"",
		...(standoff === null ? [] : [...renderStandoffSection(standoff, levelSince), ...renderRiskSection(standoff)]),
		"Since your last look:",
		...recentLines(parts.recent),
		"",
		...parts.labels,
		"Your earlier notes (newest last):",
		...noteLines(parts.notes),
		"",
		`Budget: ${parts.budget}`,
	].join("\n");
}
