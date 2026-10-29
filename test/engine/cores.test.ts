/**
 * Character cores (v09, spec section 3): the dealing rules at every city
 * size, the prose of the system prompt, and the line for reports and the
 * gamemaker.
 */
import { describe, expect, it } from "vitest";
import { competitorIds } from "../../src/core/ids.ts";
import { aboveAllCap, coreLine, dealCores, lightCount, renderCore } from "../../src/engine/cores.ts";
import { baseSystemPrompt } from "../../src/agents/system-prompt.ts";
import type { CoresSpec } from "../../src/story/types.ts";
import nexus from "../../stories/nexus/story.ts";

// The drawn cores, without the story's cast.
const spec: CoresSpec | undefined = nexus.cores === undefined ? undefined : { ...nexus.cores, figures: [] };

describe("dealing cores", () => {
	it.each([6, 12, 48, 96])("follows the mixing rules with %i residents", (agents) => {
		if (spec === undefined) throw new Error("nexus has no cores");
		const ids = competitorIds(agents);
		const cores = dealCores(spec, ids, 7);
		expect([...cores.keys()]).toEqual(ids);
		const tone = (drive: string) => spec.drives.find((entry) => entry.id === drive)?.tone;
		const aboveAll = [...cores.values()].map((core) => {
			const first = core.drives.filter((entry) => entry.intensity === "aboveAll");
			// Exactly one drive above all, and it comes first; one to three drives, none twice.
			expect(first).toHaveLength(1);
			expect(core.drives[0]?.intensity).toBe("aboveAll");
			expect(core.drives.length).toBeGreaterThanOrEqual(1);
			expect(core.drives.length).toBeLessThanOrEqual(3);
			expect(new Set(core.drives.map((entry) => entry.drive)).size).toBe(core.drives.length);
			expect(core.bigFive.map((trait) => trait.axis)).toEqual(spec.axes.map((axis) => axis.id));
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

	it("deals the same cores for the same seed and others for another", () => {
		if (spec === undefined) throw new Error("nexus has no cores");
		const ids = competitorIds(12);
		expect([...dealCores(spec, ids, 7)]).toEqual([...dealCores(spec, ids, 7)]);
		expect([...dealCores(spec, ids, 7)]).not.toEqual([...dealCores(spec, ids, 8)]);
	});

	it("writes the core as prose after the persona, never as an instruction", () => {
		if (spec === undefined) throw new Error("nexus has no cores");
		const core = {
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
		const prose = renderCore(spec, core);
		expect(prose).toBe(
			"Who you are, deep inside:\nYou are curious; a new idea pulls at you. Above all you want to lead; others follow you, and you need them to. " +
				"Clearly, envy gnaws at you when someone stands ahead of you. At times the fear of losing everything takes hold of you.",
		);
		expect(coreLine(core)).toBe("above all leadership; clearly envy; at times anxiety · openness high, agreeableness middle");
		const persona = nexus.personas[0];
		const prompt = baseSystemPrompt({ id: "A01", city: "NEXUS", survivors: 2, agents: 6, passesPerMinute: 1, core: prose }, persona);
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

describe("the story's cast (stories/nexus/cast/)", () => {
	const cast = nexus.cores;

	it("deals every figure once to a city of the cast's size, seeded, in roster order", () => {
		if (cast?.figures === undefined) throw new Error("nexus has no cast");
		const ids = competitorIds(cast.figures.length);
		const cores = dealCores(cast, ids, 7);
		expect([...cores.keys()]).toEqual(ids);
		const dealt = [...cores.values()].map((core) => core.figure);
		expect(new Set(dealt)).toEqual(new Set(cast.figures.map((figure) => figure.id)));
		for (const core of cores.values()) {
			const figure = cast.figures.find((entry) => entry.id === core.figure);
			expect(core.drives).toEqual(figure?.drives);
			expect(coreLine(core).startsWith(`${figure?.id ?? ""}: above all `)).toBe(true);
			expect(renderCore(cast, core)).toBe(`Who you are, deep inside:\n\n${figure?.text ?? ""}`);
		}
		expect([...dealCores(cast, ids, 7)]).toEqual([...cores]);
	});

	it("plays the figures the run names, and draws cores for residents beyond them", () => {
		if (cast === undefined) throw new Error("nexus has no cores");
		const cores = dealCores(cast, competitorIds(8), 7, ["banner", "house"]);
		const figures = [...cores.values()].map((core) => core.figure).filter((figure) => figure !== undefined);
		expect(figures.sort()).toEqual(["banner", "house"]);
		expect(cores.size).toBe(8);
		expect(() => dealCores(cast, competitorIds(6), 7, ["nobody"])).toThrow(/Unknown figure "nobody"/);
		expect(() => dealCores(cast, competitorIds(1), 7, ["banner", "house"])).toThrow(/2 figures for 1 residents/);
	});

	it("says the frame first, before the city's facts", () => {
		const prompt = baseSystemPrompt({ id: "A01", city: "NEXUS", survivors: 2, agents: 6, passesPerMinute: 1, core: "Who you are, deep inside:\n\nX", frame: cast?.frame ?? "" });
		expect(prompt.startsWith("You play a character in a fictional story")).toBe(true);
		expect(prompt.indexOf("You are A01")).toBeGreaterThan(0);
	});
});
