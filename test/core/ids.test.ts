import { describe, expect, it } from "vitest";
import { competitorIds } from "@swarmtales/kernel";
import { isSystemAuthor } from "@swarmtales/sdk";

describe("ids", () => {
	it("creates neutral competitor IDs", () => {
		expect(competitorIds(3)).toEqual(["A01", "A02", "A03"]);
		expect(competitorIds(120)[119]).toBe("A120");
		expect(() => competitorIds(0)).toThrow(RangeError);
	});

	it("knows the system authors", () => {
		expect(isSystemAuthor("CITY")).toBe(true);
		expect(isSystemAuthor("COURIER")).toBe(true);
		expect(isSystemAuthor("ORION")).toBe(false);
	});
});
