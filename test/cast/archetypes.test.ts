/**
 * The archetypes library and the City of Keys cast: every file parses, every figure
 * uses drives of the City of Keys catalog and a known profession, has exactly one
 * drive above all, and its text says who it is, never what to do in the game.
 */
import { describe, expect, it } from "vitest";
import { parseFigure, readArchetypes, readFigures, type FigureFile } from "../../src/cast/figures.ts";
import { CORES } from "../../stories/cityofkeys/characters.ts";

const library = readArchetypes("archetypes");
const cityOfKeysCast = readFigures("stories/cityofkeys/cast");
const catalog = new Map(CORES.drives.map((drive) => [drive.id, drive]));

describe("the archetypes library and the cityofkeys cast", () => {
	it("reads all professions, drives and residents", () => {
		expect(library.professions.length).toBe(8);
		expect(library.figures.length).toBe(24);
		expect(new Set(library.figures.map((resident) => resident.id)).size).toBe(library.figures.length);
	});

	it("has one drive file per catalog drive, with the catalog's group and tone", () => {
		expect(library.drives.map((drive) => drive.id).sort()).toEqual([...catalog.keys()].sort());
		for (const drive of library.drives) {
			expect(drive).toMatchObject({ group: catalog.get(drive.id)?.group, tone: catalog.get(drive.id)?.tone });
		}
	});

	it("builds every figure from known parts, with exactly one drive above all", () => {
		const professions = new Set(library.professions.map((profession) => profession.id));
		for (const resident of [...library.figures, ...cityOfKeysCast]) {
			expect(professions.has(resident.profession), `${resident.id} profession`).toBe(true);
			expect(resident.drives.length, resident.id).toBeGreaterThanOrEqual(CORES.perResident.min);
			expect(resident.drives.length, resident.id).toBeLessThanOrEqual(CORES.perResident.max);
			expect(resident.drives.every((drive) => catalog.has(drive.id)), `${resident.id} drives`).toBe(true);
			const above = resident.drives.filter((drive) => drive.intensity === "aboveAll");
			expect(above.length, resident.id).toBe(1);
			expect(resident.tone, resident.id).toBe(catalog.get(above[0]?.id ?? "")?.tone);
		}
	});

	it("keeps the promise: figures say who, not what (no tools, no resident ids)", () => {
		for (const resident of [...library.figures, ...cityOfKeysCast]) {
			expect(resident.body, resident.id).toMatch(/## Who you are[\s\S]*## Why you are like this[\s\S]*## How you sound/);
			expect(resident.body, resident.id).not.toMatch(/\bA\d{2}\b|\b(bid|seal|ransom|tribunal|submit|vote)_?\w*\(/i);
		}
	});

	it("builds every cityofkeys figure on an archetype and gives it the story's wants and limits", () => {
		const bases = new Set(library.figures.map((figure: FigureFile) => figure.id));
		expect(cityOfKeysCast.length).toBeGreaterThanOrEqual(6);
		expect(new Set(cityOfKeysCast.map((figure) => figure.id)).size).toBe(cityOfKeysCast.length);
		for (const figure of cityOfKeysCast) {
			expect(bases.has(figure.base ?? ""), `${figure.id} base`).toBe(true);
			expect(figure.body, figure.id).toMatch(/## What you want here[\s\S]*## What you will not do/);
		}
	});

	it("rejects a bad drive or level", () => {
		const file = (drives: string, openness = "high"): string =>
			`---\nid: c99\ntitle: T\nprofession: merchant\ntone: dark\ndrives: ${drives}\nopenness: ${openness}\nconscientiousness: low\nextraversion: low\nagreeableness: low\nneuroticism: low\n---\nBody`;
		expect(parseFigure(file("greed=aboveAll"), "ok").drives).toEqual([{ id: "greed", intensity: "aboveAll" }]);
		expect(() => parseFigure(file("greed=always"), "x")).toThrow(/bad drive/);
		expect(() => parseFigure(file("greed=aboveAll", "huge"), "x")).toThrow();
	});
});
