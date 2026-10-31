/**
 * Differential tests of puzzles and progression against the old engine (docs/design/carve-round2-T3.md):
 * the same calls and minutes on the old `World` and on the new host, replies, lines and state compared.
 */
import { describe, expect, it } from "vitest";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import { Twin } from "./twin.ts";

describe("twin: cityofkeys basics", () => {
	it("plays a first level the same on both sides", async () => {
		const twin = new Twin({ story: cityOfKeys });
		await twin.minuteWith(async () => {
			for (const id of twin.ids) {
				await twin.same(id, "getStatus", {});
				await twin.same(id, "activeTools", {});
				await twin.same(id, "getProblem", { level: 1 });
				await twin.same(id, "listAgents", {});
			}
			await twin.same("A01", "submitSolution", { level: 1, code: "nope" });
			await twin.same("A01", "submitSolution", { level: 1, code: twin.codeOf("A01", 1) });
			await twin.same("A01", "getStatus", {});
			await twin.same("A01", "getProblem", { level: 2 });
		});
		await twin.minutes(2);
		twin.expectSameLog();
		twin.expectSameState();
		expect(twin.logs().old.length).toBeGreaterThan(3);
	});
});
