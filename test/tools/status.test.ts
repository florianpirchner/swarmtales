import { describe, expect, it } from "vitest";
import { act, createFixture, say, submit } from "../helpers/fixture.ts";

describe("status tools", () => {
	it("getStatus shows own facts only", async () => {
		const fixture = createFixture({
			agents: 3,
			minutes: 1,
			only: 1,
			script: () => ({ A01: [act({ name: "getStatus" })], A02: [say()], A03: [say()] }),
		});
		await fixture.run();
		const status = fixture.toolResults("A01", "getStatus")[0] ?? "";
		expect(status).toContain("you: A01");
		expect(status).toContain("level: 1");
		expect(status).toContain("points: 15");
		expect(status).toContain("survivors at the end: 2");
		expect(status).not.toContain("A02");
		expect(status).not.toContain("A03");
	});

	it("getProblem returns reached levels and refuses future ones", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			lastLevel: 2,
			script: (world) => ({
				A01: [submit(world, "A01", 1), act({ name: "getProblem", args: { level: 1 } }, { name: "getProblem", args: { level: 2 } }, { name: "getProblem", args: { level: 5 } })],
				A02: [act({ name: "getProblem", args: { level: 2 } }), say()],
			}),
		});
		await fixture.run();
		const results = fixture.toolResults("A01", "getProblem");
		expect(results[0]).toContain("(You have already solved this level.)");
		expect(results[1]).toContain("Level 2: Notes on the board");
		expect(results[2]).toBe("UNKNOWN_LEVEL");
		expect(fixture.toolResults("A02", "getProblem")).toEqual(["LEVEL_NOT_REACHED"]);
	});

	it("listAgents shows every competitor with level", async () => {
		const fixture = createFixture({ agents: 2, minutes: 1, only: 1, script: () => ({ A01: [act({ name: "listAgents" })], A02: [say()] }) });
		await fixture.run();
		expect(fixture.toolResults("A01", "listAgents")).toEqual(["A01: level 1 (you)\nA02: level 1"]);
	});
});
