import { describe, expect, it } from "vitest";
import { competitorIds, isSystemAuthor } from "../../src/core/ids.ts";
import { VirtualClock } from "../../src/core/clock.ts";

describe("ids and clock", () => {
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

	it("advances one virtual minute per call", () => {
		const clock = new VirtualClock(3);
		expect(clock.minute).toBe(0);
		expect(clock.advance()).toBe(1);
		expect(clock.remainingMinutes).toBe(2);
		expect(() => new VirtualClock(0)).toThrow(RangeError);
	});
});
