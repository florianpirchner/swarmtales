import { describe, expect, it } from "vitest";
import { act, at, defineStory, every, onFirstEnter, onTeamSplit, team, when } from "../../src/story/define.ts";
import { placeholdersOf, renderTemplate, TemplateError, unknownPlaceholders } from "../../src/story/templates.ts";
import { tinyStory } from "../helpers/stories.ts";

describe("story DSL", () => {
	it("assigns stable rule ids and keeps explicit ones", () => {
		const story = defineStory({
			...tinyStory(),
			director: [at(1, [act.post("CITY", "a")]), onFirstEnter(2, [act.post("COURIER", "b")], { id: "courier" })],
		});
		expect(story.director.map((rule) => rule.id)).toEqual(["rule-01-at", "courier"]);
		expect(story.director[0]?.when).toEqual([]);
	});

	it("defaults to three passes a minute and blocks of one (SPEC 3)", () => {
		const { agents, minutes, seed, survivors, startPoints, activation } = tinyStory().run;
		const run = { agents, minutes, seed, survivors, startPoints, activation };
		expect(defineStory({ ...tinyStory(), run }).run).toMatchObject({ passesPerMinute: 3, blockSize: 1 });
		expect(defineStory({ ...tinyStory(), run: { ...run, passesPerMinute: 2, blockSize: 4 } }).run).toMatchObject({ passesPerMinute: 2, blockSize: 4 });
	});

	it("produces plain data for every helper", () => {
		const rule = every(5, { from: 10 }, [act.grant("actor", 2, "bonus")], { when: [when.cooldown(5, "pair")] });
		expect(rule).toEqual({
			trigger: { kind: "every", minutes: 5, from: 10 },
			when: [{ kind: "cooldown", minutes: 5, per: "pair" }],
			actions: [{ kind: "grant", target: "actor", points: 2, reason: "bonus" }],
		});
		expect(onTeamSplit(4, 3, [act.notify("all", "x")]).trigger).toEqual({ kind: "onTeamSplit", level: 4, forMinutes: 3 });
		expect(team.splitFrom(4, 3)).toEqual({ kind: "splitFrom", level: 4, size: 3 });
		const story = tinyStory();
		expect(JSON.parse(JSON.stringify(story))).toEqual(story);
	});
});

describe("templates", () => {
	it("renders known placeholders and rejects unknown ones", () => {
		expect(renderTemplate("Hello {actor}, minute {minute}", { actor: "A01", minute: "3" })).toBe("Hello A01, minute 3");
		expect(() => renderTemplate("{missing}", {})).toThrow(TemplateError);
	});

	it("lists placeholders in order and finds unknown ones", () => {
		expect(placeholdersOf("{a} and {b} and {a}")).toEqual(["a", "b", "a"]);
		expect(unknownPlaceholders("{level} {lvl}", ["level"])).toEqual(["lvl"]);
		expect(placeholdersOf("no {placeholders here")).toEqual([]);
	});
});
