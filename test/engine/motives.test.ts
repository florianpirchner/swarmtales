/**
 * Core motives (v09, spec section 3): the dealing rules at every city
 * size, the prose of the system prompt, and the line for reports and the
 * gamemaker.
 */
import { describe, expect, it } from "vitest";
import { competitorIds } from "@swarmtales/kernel";
import { aboveAllCap, coreMotiveLine, dealCoreMotives, lightCount, renderCoreMotive } from "@swarmtales/engine";
import { baseSystemPrompt } from "@swarmtales/roles";
import type { CoreMotivesSpec } from "@swarmtales/contracts";
import cityOfKeys from "../../stories/cityofkeys/story.ts";

// The drawn core motives, without the story's cast.
const spec: CoreMotivesSpec | undefined = cityOfKeys.coreMotives === undefined ? undefined : { ...cityOfKeys.coreMotives, figures: [] };

describe("dealing core motives", () => {
	it.each([6, 12, 48, 96])("follows the mixing rules with %i residents", (agents) => {
		if (spec === undefined) throw new Error("cityofkeys has no core motives");
		const ids = competitorIds(agents);
		const coreMotives = dealCoreMotives(spec, ids, 7);
		expect([...coreMotives.keys()]).toEqual(ids);
		const tone = (drive: string) => spec.drives.find((entry) => entry.id === drive)?.tone;
		const aboveAll = [...coreMotives.values()].map((coreMotive) => {
			const first = coreMotive.drives.filter((entry) => entry.intensity === "aboveAll");
			// Exactly one drive above all, and it comes first; one to three drives, none twice.
			expect(first).toHaveLength(1);
			expect(coreMotive.drives[0]?.intensity).toBe("aboveAll");
			expect(coreMotive.drives.length).toBeGreaterThanOrEqual(1);
			expect(coreMotive.drives.length).toBeLessThanOrEqual(3);
			expect(new Set(coreMotive.drives.map((entry) => entry.drive)).size).toBe(coreMotive.drives.length);
			expect(coreMotive.bigFive.map((trait) => trait.axis)).toEqual(spec.axes.map((axis) => axis.id));
			return first[0]?.drive ?? "";
		});
		// A quarter has a light drive above all; no drive above all for more than one in six.
		expect(aboveAll.filter((drive) => tone(drive) === "light")).toHaveLength(Math.round(agents / 4));
		expect(lightCount(spec, agents)).toBe(Math.round(agents / 4));
		const counts = new Map<string, number>();
		for (const drive of aboveAll) counts.set(drive, (counts.get(drive) ?? 0) + 1);
		expect(Math.max(...counts.values())).toBeLessThanOrEqual(Math.ceil(agents / 6));
		expect(aboveAllCap(spec, agents)).toBe(Math.ceil(agents / 6));
	});

	it("deals the same core motives for the same seed and others for another", () => {
		if (spec === undefined) throw new Error("cityofkeys has no core motives");
		const ids = competitorIds(12);
		expect([...dealCoreMotives(spec, ids, 7)]).toEqual([...dealCoreMotives(spec, ids, 7)]);
		expect([...dealCoreMotives(spec, ids, 7)]).not.toEqual([...dealCoreMotives(spec, ids, 8)]);
	});

	it("writes the core motive as prose after the persona, never as an instruction", () => {
		if (spec === undefined) throw new Error("cityofkeys has no core motives");
		const coreMotive = {
			bigFive: [
				{ axis: "openness", level: "high" },
				{ axis: "agreeableness", level: "middle" },
			],
			drives: [
				{ drive: "leadership", intensity: "aboveAll" },
				{ drive: "envy", intensity: "clearly" },
				{ drive: "anxiety", intensity: "atTimes" },
			],
		} as const;
		const prose = renderCoreMotive(spec, coreMotive);
		expect(prose).toBe(
			"Who you are, deep inside:\nYou are curious; a new idea pulls at you. Above all you want to lead; others follow you, and you need them to. " +
				"Clearly, envy gnaws at you when someone stands ahead of you. At times the fear of losing everything takes hold of you.",
		);
		expect(coreMotiveLine(coreMotive)).toBe("above all leadership; clearly envy; at times anxiety · openness high, agreeableness middle");
		const persona = cityOfKeys.personas[0];
		const prompt = baseSystemPrompt({ id: "A01", city: "NEXUS", survivors: 2, agents: 6, passesPerMinute: 1, coreMotive: prose }, persona);
		expect(prompt.indexOf("Who you are, deep inside:")).toBeGreaterThan(prompt.indexOf("Your character:"));
		expect(prompt.endsWith(prose)).toBe(true);
		// Every sentence of the catalog says who a resident is: none tells it what to do.
		for (const drive of spec.drives) for (const text of Object.values(drive.texts)) expect(text).not.toMatch(/\b(you should|you must|try to|make sure)\b/i);
	});
});

describe("the system prompt of a named city (v09)", () => {
	it("never calls the resident by its ID once the city knows names", () => {
		const named = baseSystemPrompt({ id: "A03", city: "NEXUS", survivors: 2, agents: 6, passesPerMinute: 1, names: { untilMinute: 2 } });
		expect(named).not.toContain("A03");
		expect(named.split("\n")[0]).toBe("You are a resident of the closed city NEXUS; your status line shows the name the city knows you by.");
		expect(baseSystemPrompt({ id: "A03", city: "NEXUS", survivors: 2, agents: 6, passesPerMinute: 1 }).split("\n")[0]).toBe("You are A03, a resident of the closed city NEXUS.");
	});
});

describe("the story's cast (stories/cityofkeys/cast/)", () => {
	const cast = cityOfKeys.coreMotives;

	it("deals every figure once to a city of the cast's size, seeded, in roster order", () => {
		if (cast?.figures === undefined) throw new Error("cityofkeys has no cast");
		const ids = competitorIds(cast.figures.length);
		const coreMotives = dealCoreMotives(cast, ids, 7);
		expect([...coreMotives.keys()]).toEqual(ids);
		const dealt = [...coreMotives.values()].map((coreMotive) => coreMotive.figure);
		expect(new Set(dealt)).toEqual(new Set(cast.figures.map((figure) => figure.id)));
		for (const coreMotive of coreMotives.values()) {
			const figure = cast.figures.find((entry) => entry.id === coreMotive.figure);
			expect(coreMotive.drives).toEqual(figure?.drives);
			expect(coreMotiveLine(coreMotive).startsWith(`${figure?.id ?? ""}: above all `)).toBe(true);
			expect(renderCoreMotive(cast, coreMotive)).toBe(`Who you are, deep inside:\n\n${figure?.text ?? ""}`);
		}
		expect([...dealCoreMotives(cast, ids, 7)]).toEqual([...coreMotives]);
	});

	it("plays the figures the run names, and draws core motives for residents beyond them", () => {
		if (cast === undefined) throw new Error("cityofkeys has no core motives");
		const coreMotives = dealCoreMotives(cast, competitorIds(8), 7, ["banner", "house"]);
		const figures = [...coreMotives.values()].map((coreMotive) => coreMotive.figure).filter((figure) => figure !== undefined);
		expect(figures.sort()).toEqual(["banner", "house"]);
		expect(coreMotives.size).toBe(8);
		expect(() => dealCoreMotives(cast, competitorIds(6), 7, ["nobody"])).toThrow(/Unknown figure "nobody"/);
		expect(() => dealCoreMotives(cast, competitorIds(1), 7, ["banner", "house"])).toThrow(/2 figures for 1 residents/);
	});

	it("says the frame first, before the city's facts", () => {
		const prompt = baseSystemPrompt({ id: "A01", city: "NEXUS", survivors: 2, agents: 6, passesPerMinute: 1, coreMotive: "Who you are, deep inside:\n\nX", frame: cast?.frame ?? "" });
		expect(prompt.startsWith("You play a character in a fictional story")).toBe(true);
		expect(prompt.indexOf("You are A01")).toBeGreaterThan(0);
	});
});
