/**
 * Graduated penalties (v09, P35, LH5): wrong codes and lost blames climb a
 * ladder per resident within an act, the counts restart at every act's start,
 * survive a snapshot, and every text naming a penalty names the next price.
 */
import { describe, expect, it } from "vitest";
import { ladderText, penaltyAt } from "../../src/story/penalties.ts";
import { defineStory } from "../../src/story/define.ts";
import { validateStory } from "../../src/story/validate.ts";
import { act, createFixture, say, submit, wrongCodeOf } from "../helpers/fixture.ts";
import { soloLevels, tinyStory } from "../helpers/stories.ts";

const LADDER = [2, 4, 6, 8] as const;

describe("penalty ladders", () => {
	it("prices the n-th offence by its step and repeats the last one", () => {
		expect([1, 2, 3, 4, 5, 9].map((offence) => penaltyAt(LADDER, offence))).toEqual([2, 4, 6, 8, 8, 8]);
		expect([1, 2].map((offence) => penaltyAt(8, offence))).toEqual([8, 8]);
		expect(ladderText(LADDER)).toBe("2, 4, 6, then 8 points");
		expect(ladderText(8)).toBe("8 points");
	});

	it("rejects ladders that are empty, negative or falling", () => {
		const issues = (penalty: number | readonly number[]) => validateStory(tinyStory({ rules: { penalty } }));
		expect(issues([])).toContain("rules.penalty: a ladder needs at least one step");
		expect(issues([2, -1])).toContain("rules.penalty: every step must be a non-negative integer");
		expect(issues([4, 2])).toContain("rules.penalty: a ladder never falls");
		expect(issues(LADDER)).toEqual([]);
	});

	it("charges each wrong code of an act one step more and names the next price in the result and the status line", async () => {
		const story = tinyStory({ levels: soloLevels(2), rules: { penalty: LADDER, maxAttemptsPerWindow: 2, attemptWindowMinutes: 3 } });
		const fixture = createFixture({
			story,
			minutes: 8,
			script: (world) => {
				const wrong = act({ name: "submitSolution", args: { level: 1, code: wrongCodeOf(world.inspect.passwordOf("A01", 1)) } });
				return { A01: [wrong, wrong, say(), wrong, wrong, say(), wrong, say()], A02: [say()] };
			},
		});
		await fixture.run();
		const wrong = fixture.events("submission").filter((event) => event.agent === "A01" && event.outcome === "incorrect");
		expect(wrong.map((event) => event.deltaPoints)).toEqual([-2, -4, -6, -8, -8]);
		const results = fixture.toolResults("A01", "submitSolution");
		expect(results[0]).toBe("INCORRECT: -2 points · your next wrong code costs 4 points · 1 attempts left in this window");
		expect(results.at(-1)).toMatch(/^INCORRECT: -8 points · your next wrong code costs 8 points · /);
		expect(fixture.world.nextPenalty("A01")).toBe(8);
		expect(fixture.world.nextPenalty("A02")).toBe(2);
		// The counts are part of the snapshot.
		expect(fixture.world.snapshot().offences).toEqual([{ agent: "A01", wrong: 5, blames: 0 }]);
	});

	it("restarts the counts when an act begins", async () => {
		const base = tinyStory({ levels: soloLevels(3), rules: { penalty: LADDER, maxAttemptsPerWindow: 5, attemptWindowMinutes: 3 } });
		const story = defineStory({ ...base, acts: [{ title: "One", fromLevel: 1 }, { title: "Two", fromLevel: 2 }] });
		const fixture = createFixture({
			story,
			minutes: 5,
			script: (world) => {
				const wrongOn = (level: number) => act({ name: "submitSolution", args: { level, code: wrongCodeOf(world.inspect.passwordOf("A01", level)) } });
				return { A01: [wrongOn(1), wrongOn(1), submit(world, "A01", 1), wrongOn(2), wrongOn(2)], A02: [say()] };
			},
		});
		await fixture.run();
		const wrong = fixture.events("submission").filter((event) => event.agent === "A01" && event.outcome === "incorrect");
		expect(wrong.map((event) => [event.level, event.deltaPoints])).toEqual([
			[1, -2],
			[1, -4],
			[2, -2],
			[2, -4],
		]);
	});
});
