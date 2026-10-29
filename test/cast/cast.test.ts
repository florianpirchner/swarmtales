/**
 * The cast library (cast/): every file parses, every resident uses drives
 * of the nexus catalog and a known profession, has exactly one drive above
 * all, and its text says who it is, never what to do in the game.
 */
import { describe, expect, it } from "vitest";
import { parseResident, readCast } from "../../src/cast/cast.ts";
import { CORES } from "../../stories/nexus/characters.ts";

const cast = readCast("cast");
const catalog = new Map(CORES.drives.map((drive) => [drive.id, drive]));

describe("the cast library", () => {
	it("reads all professions, drives and residents", () => {
		expect(cast.professions.length).toBe(8);
		expect(cast.residents.length).toBe(24);
		expect(new Set(cast.residents.map((resident) => resident.id)).size).toBe(cast.residents.length);
	});

	it("has one drive file per catalog drive, with the catalog's group and tone", () => {
		expect(cast.drives.map((drive) => drive.id).sort()).toEqual([...catalog.keys()].sort());
		for (const drive of cast.drives) {
			expect(drive).toMatchObject({ group: catalog.get(drive.id)?.group, tone: catalog.get(drive.id)?.tone });
		}
	});

	it("builds every resident from known parts, with exactly one drive above all", () => {
		const professions = new Set(cast.professions.map((profession) => profession.id));
		for (const resident of cast.residents) {
			expect(professions.has(resident.profession), `${resident.id} profession`).toBe(true);
			expect(resident.drives.length, resident.id).toBeGreaterThanOrEqual(CORES.perResident.min);
			expect(resident.drives.length, resident.id).toBeLessThanOrEqual(CORES.perResident.max);
			expect(resident.drives.every((drive) => catalog.has(drive.id)), `${resident.id} drives`).toBe(true);
			const above = resident.drives.filter((drive) => drive.intensity === "aboveAll");
			expect(above.length, resident.id).toBe(1);
			expect(resident.tone, resident.id).toBe(catalog.get(above[0]?.id ?? "")?.tone);
		}
	});

	it("keeps the promise: residents say who, not what (no tools, no resident ids)", () => {
		for (const resident of cast.residents) {
			expect(resident.body, resident.id).toMatch(/## Who you are[\s\S]*## Why you are like this[\s\S]*## How you sound/);
			expect(resident.body, resident.id).not.toMatch(/\bA\d{2}\b|\b(bid|seal|ransom|tribunal|submit|vote)_?\w*\(/i);
		}
	});

	it("rejects a bad drive or level", () => {
		const file = (drives: string, openness = "high"): string =>
			`---\nid: c99\ntitle: T\nprofession: merchant\ntone: dark\ndrives: ${drives}\nopenness: ${openness}\nconscientiousness: low\nextraversion: low\nagreeableness: low\nneuroticism: low\n---\nBody`;
		expect(parseResident(file("greed=aboveAll"), "ok").drives).toEqual([{ id: "greed", intensity: "aboveAll" }]);
		expect(() => parseResident(file("greed=always"), "x")).toThrow(/bad drive/);
		expect(() => parseResident(file("greed=aboveAll", "huge"), "x")).toThrow();
	});
});
