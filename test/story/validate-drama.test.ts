/** Validation of the v09 story specs: cores, goals, the black seal, the scaled feast and the exile share per size. */
import { describe, expect, it } from "vitest";
import { exileTarget } from "../../src/story/tribunal.ts";
import { resolveCount } from "../../src/story/counts.ts";
import { validateStory } from "../../src/story/validate.ts";
import type { AnyStory, CoresSpec, GoalsSpec, SealSpec } from "../../src/story/types.ts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

function specs(): { readonly cores: CoresSpec; readonly goals: GoalsSpec; readonly seal: SealSpec } {
	const { cores, goals, seal } = cityOfKeys;
	if (cores === undefined || goals === undefined || seal === undefined) throw new Error("cityofkeys lacks a v09 spec");
	return { cores, goals, seal };
}

function withoutTribunal(story: AnyStory): AnyStory {
	const copy = { ...story };
	Reflect.deleteProperty(copy, "tribunal");
	return copy;
}

describe("validating the drama specs (v09)", () => {
	it("accepts cityofkeys", () => {
		expect(validateStory(cityOfKeys)).toEqual([]);
	});

	it("checks the core catalog and its mixing rules", () => {
		const { cores } = specs();
		const story: AnyStory = {
			...cityOfKeys,
			cores: {
				...cores,
				drives: cores.drives.filter((drive) => drive.tone === "dark").map((drive, index) => (index === 0 ? { ...drive, cues: [] } : drive)),
				perResident: { min: 2, max: 4 },
				lightShare: 2,
			},
		};
		const issues = validateStory(story);
		expect(issues).toContain("cores.drives: needs at least one light drive");
		expect(issues).toContain("cores.drives.envy.cues: name at least one word that would give the drive away");
		expect(issues).toContain("cores.perResident: 1 to 3 drives, min <= max");
		expect(issues).toContain("cores.lightShare: must be a share between 0 and 1");
		expect(issues).toContain("goals.matches.protect: unknown drive loyalty");
	});

	it("checks goals: acts that exist, known drives and placeholders", () => {
		const { goals } = specs();
		const story: AnyStory = { ...cityOfKeys, goals: { ...goals, acts: [9], matches: { ...goals.matches, outrank: ["nobody"] }, texts: { ...goals.texts, protect: "keep {victim} here" } } };
		const issues = validateStory(story);
		expect(issues).toContain("goals.acts: no act starts at level 9");
		expect(issues).toContain("goals.matches.outrank: unknown drive nobody");
		expect(issues).toContain("goals.texts.protect: unknown placeholder {victim}");
	});

	it("checks the seal: the tribunal's act, its minutes and texts", () => {
		const { seal } = specs();
		const story: AnyStory = { ...cityOfKeys, seal: { ...seal, act: 1, bidMinutes: 0, spacing: 2, texts: { ...seal.texts, won: "{holder} bears {seal}." } } };
		const issues = validateStory(story);
		expect(issues).toContain("seal.act: the seal belongs to the tribunal's act (level 8)");
		expect(issues).toContain("seal.bidMinutes: must be a positive integer");
		expect(issues).toContain("seal.texts.won: unknown placeholder {holder}");
		expect(validateStory({ ...withoutTribunal(cityOfKeys), goals: { ...specs().goals, matches: {} } })).toContain("seal: the black seal counts toward a tribunal's target; the story needs a tribunal");
		expect(validateStory({ ...cityOfKeys, levels: cityOfKeys.levels.map((entry) => (entry.number === 8 ? { ...entry, tools: [...entry.tools, "bid"] } : entry)) })).toContain(
			"level 8: the tribunal grants bid itself; levels must not list them",
		);
	});

	it("scales the feast table and the exile share with the city", () => {
		expect([6, 12, 13, 48, 96].map((residents) => resolveCount({ share: 1 / 4, minimum: 3 }, residents))).toEqual([3, 3, 4, 12, 24]);
		expect(resolveCount(5, 48)).toBe(5);
		const tribunal = cityOfKeys.tribunal;
		if (tribunal === undefined) throw new Error("cityofkeys has no tribunal");
		expect([6, 8, 12, 48, 96].map((residents) => exileTarget(tribunal, residents))).toEqual([3, 4, 3, 12, 24]);
		expect(validateStory({ ...cityOfKeys, tribunal: { ...tribunal, targetShare: [{ share: 1 / 2 }, { from: 12, share: 1 / 4 }] } })).toContain(
			"tribunal.targetShare[1]: rules go from the largest city down, and only the last one may leave out from",
		);
	});
});
