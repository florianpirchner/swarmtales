/**
 * The gamemaker's report built from host data (step 18, item 2; decision C2-4): the old
 * `describeSituation` (packages/roles/src/gamemaker/situation.ts) written from the mechanics' facts
 * at the look (`GamemakerLook.facts`) instead of the old `World`, so the gamemaker overseer
 * (`defineGamemaker`) can replace the app's gamemaker. Every section comes from its owner's fact and
 * renderer, in the old order:
 *
 * | section | fact | renderer |
 * |---|---|---|
 * | header, "Residents:" | `progression.section` | `renderProgressionHeader`, `renderResidents` (progression) |
 * | "Who they are" | `motives.lines`, `motives.coreMotives`, `goals.texts` | `characterLines` here (figure direction: the story's figures, `directFigure`) |
 * | "Tribunal:" | `tribunal.section` | `renderTribunalSection` (tribunal) |
 * | the whisperer | `whispers.section` | `renderWhispererSection` (whispers) |
 * | blockers, holdout tribunal | `standoff-tribunal.section` | `renderHoldoutSection` (standoff-tribunal) |
 * | black seal | `seal.section` | `renderSealSection` (seal) |
 * | "Who waits on whom" | `progression.section`, `puzzles.needs` | `waitLines` here |
 * | standoffs, at risk | `standoff.section` | `renderStandoffSection`, `renderRiskSection` (standoff) |
 * | since your last look, labels | the overseer's log reads, the guard from `puzzles.secrets` | `recentLines`, `labelLines` (roles) |
 * | notes, budget | the overseer's state | here |
 *
 * A mechanic that is not loaded has no fact, and its section is empty, as the old world wrote none
 * without the feature. Every fact value is parsed with its owner's schema (untrusted input).
 * Gate: test/cli/host-gamemaker-golden.test.ts (every golden look, byte for byte).
 */
import type { AnyStory, DirectionLevel } from "@swarmtales/contracts";
import { directFigure, figureOf } from "./direction.ts";
import { progressionSectionOf, renderProgressionHeader, renderResidents, type ProgressionSection } from "@swarmtales/mechanic-progression";
import { needsFrom, secretsFrom, type Needs } from "@swarmtales/mechanic-puzzles";
import { renderSealSection, sealSectionOf } from "@swarmtales/mechanic-seal";
import { renderRiskSection, renderStandoffSection, standoffSectionOf } from "@swarmtales/mechanic-standoff";
import { holdoutSectionOf, renderHoldoutSection } from "@swarmtales/mechanic-standoff-tribunal";
import { renderTribunalSection, tribunalSectionOf } from "@swarmtales/mechanic-tribunal";
import { renderWhispererSection, whispererSectionOf } from "@swarmtales/mechanic-whispers";
import { labelLines, recentLines, SecretGuard, type GamemakerLook, type GamemakerReport, type Note } from "@swarmtales/roles";
import { Type } from "typebox";
import { Parse } from "typebox/value";

const Lines = Type.Record(Type.String(), Type.String());
const Figures = Type.Record(Type.String(), Type.Object({ figure: Type.Optional(Type.String()) }));

/** A fact's value parsed with `schema`, or `fallback` when the fact's mechanic is not loaded. */
function factOr<T>(facts: Readonly<Record<string, unknown>>, name: string, parse: (value: unknown) => T, fallback: T): T {
	const value = facts[name];
	return value === undefined ? fallback : parse(value);
}

/** The "Who they are" block (old `characterLines`): core motive, goal and, from direction 8, the figure's material. */
export function characterLines(story: AnyStory, look: Pick<GamemakerLook, "facts" | "direction">, alive: readonly string[]): readonly string[] {
	const lines = factOr(look.facts, "motives.lines", (value) => Parse(Lines, value), {});
	const figures = factOr(look.facts, "motives.coreMotives", (value) => Parse(Figures, value), {});
	const goals = factOr(look.facts, "goals.texts", (value) => Parse(Lines, value), {});
	const playedBy = (figure: string): string | undefined => alive.find((agent) => figures[agent]?.figure === figure);
	const direction: DirectionLevel = look.direction;
	const entries = alive.flatMap((agent) => {
		const line = lines[agent];
		const goal = goals[agent];
		if (line === undefined && goal === undefined) return [];
		const parts = [...(line === undefined ? [] : [`core motive: ${line}`]), ...(goal === undefined ? [] : [`secret goal: ${goal}`])];
		const directed = direction < 8 ? undefined : directFigure(direction, figureOf(story.coreMotives?.figures, figures[agent]?.figure)?.direction, playedBy);
		if (directed !== undefined) {
			if (directed.tendencies.length > 0) parts.push(`tendencies: ${directed.tendencies.join(" ")}`);
			if (directed.rivals.length > 0) parts.push(`rivals: ${directed.rivals.map((rival) => `${rival.agent} (${rival.text})`).join(" ")}`);
			if (directed.orders.length > 0) parts.push(`orders: ${directed.orders.join(" ")}`);
			if (directed.duty !== undefined) parts.push(`duty this act: ${directed.duty}`);
		}
		return [`- ${agent}: ${parts.join(" · ")}`];
	});
	if (entries.length === 0) return [];
	return ["Who they are (private: use a resident's core motive or goal only in a note to that same resident, never on the board or to anyone else):", ...entries, ""];
}

/** The lines under "Who waits on whom" (old `waitLines`): a resident's dependencies still on a lower level; a level that hides its teams names nobody. */
function waitLines(progression: ProgressionSection, needs: Needs): readonly string[] {
	const levelOf = new Map(progression.ranking.map((entry) => [entry.agent, entry.level]));
	const level = (agent: string): number => levelOf.get(agent) ?? 0;
	const lines = progression.standing.flatMap((entry) => {
		const need = needs.find((candidate) => candidate.agent === entry.agent && candidate.level === entry.level);
		if (need === undefined) return [];
		const behind = need.on.filter((member) => level(member) < entry.level);
		if (behind.length === 0) return [];
		const blockers =
			need.fragments && !entry.teamPlaceholders
				? `${String(behind.length)} unnamed ${behind.length === 1 ? "teammate" : "teammates"} on level ` +
					[...new Set(behind.map(level))].sort((a, b) => a - b).join("/") +
					" (this level hides its teams)"
				: behind.map((member) => `${member} (level ${String(level(member))})`).join(", ");
		return [`- ${entry.agent} (level ${String(entry.level)}) waits on ${blockers}`];
	});
	return lines.length === 0 ? ["- nobody"] : lines;
}

function noteLines(notes: readonly Note[]): readonly string[] {
	return notes.length === 0 ? ["- none"] : notes.slice(-12).map((note) => `- minute ${String(note.minute)} to ${note.to}: "${note.text}"`);
}

/** The text of one look, before the overseer applies the host's names (`ctx.display`). */
export function hostSituation(story: AnyStory, look: GamemakerLook): string {
	const { facts } = look;
	const progression = progressionSectionOf(facts["progression.section"]);
	const needs = factOr(facts, "puzzles.needs", needsFrom, []);
	const secrets = factOr(facts, "puzzles.secrets", secretsFrom, { passwords: [], numbers: [] });
	const standoff = factOr(facts, "standoff.section", standoffSectionOf, null);
	const levelSince = (agent: string): number => look.tracks.get(agent)?.levelSince ?? 0;
	const lines: string[] = [
		...renderProgressionHeader(progression, look.round),
		"",
		...renderResidents(progression, look.tracks),
		"",
		...characterLines(story, look, progression.alive),
		...renderTribunalSection(tribunalSectionOf(facts["tribunal.section"])),
		...renderWhispererSection(whispererSectionOf(facts["whispers.section"])),
		...renderHoldoutSection(holdoutSectionOf(facts["standoff-tribunal.section"])),
		...renderSealSection(sealSectionOf(facts["seal.section"])),
		"Who waits on whom (a door opens only with every fragment or factor a resident needs):",
		...waitLines(progression, needs),
		"",
		...(standoff === null ? [] : [...renderStandoffSection(standoff, levelSince), ...renderRiskSection(standoff)]),
		`Since your last look:`,
		...recentLines(look.recent, new SecretGuard(secrets.passwords, secrets.numbers)),
		"",
		...labelLines(look.recent),
		"Your earlier notes (newest last):",
		...noteLines(look.notes),
		"",
		`Budget: ${look.budget}`,
	];
	return lines.join("\n");
}

/** The gamemaker overseer's report of a story's city from the host's facts (`defineGamemaker(hostGamemakerReport(story))`). */
export function hostGamemakerReport(story: AnyStory): GamemakerReport {
	return { situation: (look) => hostSituation(story, look) };
}
