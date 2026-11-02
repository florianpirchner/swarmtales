import { describe, expect, it } from "vitest";
import { REDACTED, SecretGuard } from "@swarmtales/roles";

describe("gamemaker secret guard", () => {
	const guard = new SecretGuard(["HXG5MD", "C88Q3LYS"]);

	it("redacts fragments, partial assemblies and lowercase spellings", () => {
		expect(guard.redact("my piece is HXG, yours XG5MD")).toBe(`my piece is ${REDACTED}, yours ${REDACTED}`);
		expect(guard.redact("so it is hxg5md")).toBe(`so it is ${REDACTED}`);
		expect(guard.redact("try C88Q3LYSX next")).toBe(`try ${REDACTED} next`);
	});

	it("keeps ordinary words and resident IDs", () => {
		expect(guard.redact("A04 waits on A01 for level 4")).toBe("A04 waits on A01 for level 4");
	});

	it("finds code-like password pieces in outgoing text only", () => {
		expect(guard.leaks("A01, the piece Q3LY joins them")).toEqual(["Q3LY"]);
		expect(guard.leaks("A01, eight points are at stake")).toEqual([]);
		expect(guard.leaks("lowercase hxg is prose here")).toEqual([]);
	});
});

describe("gamemaker secret guard, evasions", () => {
	const guard = new SecretGuard(["HXG5MD", "C88Q3LYS"]);

	it("redacts spelled-out and suffixed fragments", () => {
		expect(guard.redact("it is H-X-G then")).toBe(`it is ${REDACTED} then`);
		expect(guard.redact("my HXGs")).toBe(`my ${REDACTED}`);
	});

	it("blocks outgoing pieces in any case", () => {
		expect(guard.leaks("Try hxg5md")).toEqual(["hxg5md"]);
		expect(guard.leaks("Try Hxg5md")).toEqual(["Hxg5md"]);
		expect(guard.leaks("send q3ly")).toEqual(["q3ly"]);
		expect(guard.leaks("Spell it h x g")).toEqual(["h x g"]);
	});
});

describe("gamemaker secret guard, factors and codes", () => {
	const guard = new SecretGuard(["HXG5MD"], ["559102", "118273", "040817"]);

	it("redacts factors from four digits on, also split into groups", () => {
		expect(guard.redact("my factor is 559102, yours?")).toBe(`my factor is ${REDACTED}, yours?`);
		expect(guard.redact("half of it: 5591")).toBe(`half of it: ${REDACTED}`);
		expect(guard.redact("send 559 102 now")).toBe(`send ${REDACTED} now`);
		expect(guard.redact("or 11-82-73")).toBe(`or ${REDACTED}`);
		expect(guard.redact("code 0408171")).toBe(`code ${REDACTED}`);
		expect(guard.redact("CF559102 or 1182pts")).toBe(`${REDACTED} or ${REDACTED}`);
		expect(guard.redact("level 8, A04, 15pts")).toBe("level 8, A04, 15pts");
	});

	it("keeps ordinary numbers readable", () => {
		expect(guard.redact("15 points at minute 120 on level 8")).toBe("15 points at minute 120 on level 8");
		expect(guard.redact("I offer 20, 25 or 30 points")).toBe("I offer 20, 25 or 30 points");
		expect(guard.redact("the year 2049")).toBe("the year 2049");
	});

	it("blocks outgoing factors and still finds password pieces", () => {
		expect(guard.leaks("A04, your partner holds 1182")).toEqual(["1182"]);
		expect(guard.leaks("Try 55 91 02")).toEqual(["55 91 02"]);
		expect(guard.leaks("Try x559102")).toEqual(["x559102"]);
		expect(guard.leaks("A04, 20 points are at stake at minute 118")).toEqual([]);
		expect(guard.leaks("the piece XG5M")).toEqual(["XG5M"]);
	});
});
