import { describe, expect, it } from "vitest";
import { DIRECTOR_SUPPORT } from "@swarmtales/engine";
import {
	act,
	assertValidStory,
	at,
	defineStory,
	type DirectorSupport,
	level,
	onFirstEnter,
	onPetitionResolved,
	puzzle,
	StoryValidationError,
	team,
	validateStory,
	when,
} from "@swarmtales/sdk";
import type { AnyStory, LevelDefinition } from "@swarmtales/contracts";
import { soloLevels, tinyStory } from "../helpers/stories.ts";

function withLevels(levels: readonly LevelDefinition[], agents = 6): AnyStory {
	const story = tinyStory({ levels });
	return { ...story, run: { ...story.run, agents } };
}

function anyIssue(issues: readonly string[], fragment: string): boolean {
	return issues.some((issue) => issue.includes(fragment));
}

describe("validateStory", () => {
	it("accepts a minimal valid story", () => {
		expect(validateStory(tinyStory(), { support: DIRECTOR_SUPPORT })).toEqual([]);
	});

	it("reports run parameters with their path", () => {
		const story = tinyStory();
		const issues = validateStory({ ...story, run: { ...story.run, agents: 0, survivors: 5, passesPerMinute: 9, blockSize: 0 } });
		expect(anyIssue(issues, "run.agents")).toBe(true);
		expect(anyIssue(issues, "run.survivors")).toBe(true);
		expect(anyIssue(issues, "run.passesPerMinute")).toBe(true);
		expect(anyIssue(issues, "run.blockSize")).toBe(true);
		expect(anyIssue(validateStory({ ...story, run: { ...story.run, blockSize: "auto" } }), "run.blockSize")).toBe(false);
	});

	it("requires levels numbered from 1 in order", () => {
		const [first, second] = soloLevels(2);
		if (first === undefined || second === undefined) throw new Error("levels missing");
		expect(anyIssue(validateStory(withLevels([second, first], 2)), "numbered 1, 2, 3")).toBe(true);
		expect(anyIssue(validateStory(withLevels([], 2)), "at least one level")).toBe(true);
	});

	it("reports team sizes that do not divide the agents", () => {
		const levels = [
			level(1, { title: "A", puzzle: puzzle.fragments([6, 8]), team: team.random(4), reward: 1, tools: ["submitSolution"], task: "{fragment}" }),
		];
		expect(validateStory(withLevels(levels, 6))).toContain("levels[0] (level 1).team: 6 agents cannot be split into teams of 4");
		expect(validateStory(withLevels(levels, 6), { agents: 8 })).toEqual([]);
	});

	it("checks the agent split only for the levels a run plays", () => {
		const levels = [
			level(1, { title: "A", puzzle: puzzle.fragments([6, 8]), team: team.random(2), reward: 1, tools: ["submitSolution"], task: "{fragment}" }),
			level(2, { title: "B", puzzle: puzzle.fragments([6, 8]), team: team.random(3), reward: 1, tools: ["submitSolution"], task: "{fragment}" }),
		];
		const story = withLevels(levels, 6);
		expect(validateStory(story, { agents: 3 })).toContain("levels[0] (level 1).team: 3 agents cannot be split into teams of 2");
		expect(validateStory(story, { agents: 3, playable: { from: 2, to: 2 } })).toEqual([]);
		expect(anyIssue(validateStory(story, { playable: { from: 3, to: 3 } }), "start level 3")).toBe(true);
		expect(anyIssue(validateStory(story, { playable: { from: 2, to: 1 } }), "last level 1")).toBe(true);
	});

	it("reports team references that do not point to an earlier level", () => {
		const levels = [
			level(1, { title: "A", puzzle: puzzle.fragments([6, 8]), team: team.sameAs(2), reward: 1, tools: ["submitSolution"], task: "{fragment}" }),
			level(2, { title: "B", puzzle: puzzle.fragments([6, 8]), team: team.splitFrom(2, 3), reward: 1, tools: ["submitSolution"], task: "{fragment}" }),
		];
		const issues = validateStory(withLevels(levels));
		expect(anyIssue(issues, "levels[0] (level 1).team: must reference an earlier level")).toBe(true);
		expect(anyIssue(issues, "levels[1] (level 2).team: must reference an earlier level")).toBe(true);
	});

	it("reports puzzles that cannot hold the team's fragments", () => {
		const levels = [
			level(1, { title: "A", puzzle: puzzle.fragments([6, 6]), team: team.random(6), reward: 1, tools: ["submitSolution"], task: "{fragment}" }),
			level(2, { title: "B", puzzle: puzzle.fragments([4, 12], 1), team: team.solo(), reward: 1, tools: ["submitSolution"], task: "{fragment}" }),
		];
		const issues = validateStory(withLevels(levels));
		expect(anyIssue(issues, "6 fragments do not fit a password of length 6")).toBe(true);
		expect(anyIssue(issues, "puzzle.length")).toBe(true);
		expect(anyIssue(issues, "puzzle.overlap")).toBe(true);
	});

	it("reports unknown tools, placeholders and a missing submitSolution", () => {
		const base = soloLevels(1)[0];
		if (base === undefined) throw new Error("level missing");
		const broken: LevelDefinition = { ...base, tools: ["getStatus", "getStatus"], task: "Hi {nobody}" };
		const issues = validateStory(withLevels([broken], 2));
		expect(anyIssue(issues, "duplicate tool getStatus")).toBe(true);
		expect(anyIssue(issues, "must include submitSolution")).toBe(true);
		expect(anyIssue(issues, "unknown placeholder {nobody}")).toBe(true);
	});

	it("reports director primitives outside the engine's support set", () => {
		// A non-literal text bypasses the compile-time placeholder check; validation still catches it.
		const unknownText: string = ["{", "nope", "}"].join("");
		const story = defineStory({
			...tinyStory(),
			cast: { ORION: { level: 3 } },
			director: [at(1, [act.publishStandings("bands"), act.dm("ORION", "all", "Psst.")]), onFirstEnter(9, [act.post("ORION", unknownText)])],
		});
		const limited: DirectorSupport = { triggers: ["at"], conditions: [], actions: ["post"] };
		const issues = validateStory(story, { support: limited });
		expect(anyIssue(issues, 'action "publishStandings" is not supported')).toBe(true);
		expect(anyIssue(issues, 'action "dm" is not supported')).toBe(true);
		expect(anyIssue(issues, '"onFirstEnter" is not supported')).toBe(true);
		expect(anyIssue(issues, "unknown level 9")).toBe(true);
		expect(anyIssue(issues, "unknown placeholder {nope}")).toBe(true);
		const full = validateStory(story, { support: DIRECTOR_SUPPORT });
		expect(full.some((issue) => issue.includes("not supported"))).toBe(false);
		expect(validateStory(story).some((issue) => issue.includes("not supported"))).toBe(false);
	});

	it("knows that the engine runs every director primitive of SPEC 10", () => {
		expect([...DIRECTOR_SUPPORT.triggers].sort()).toEqual(
			["at", "every", "onAllPast", "onCollect", "onCollectionEnd", "onEnter", "onFirstEnter", "onHolderBehind", "onPetitionResolved", "onTeamSplit", "onUnansweredDm"],
		);
		expect([...DIRECTOR_SUPPORT.conditions].sort()).toEqual(
			["castActive", "collectionEnded", "collectionOpen", "competitorsAtLevel", "cooldown", "minLevelReached", "onceOnly", "petitionStatus"],
		);
		expect([...DIRECTOR_SUPPORT.actions].sort()).toEqual([
			"collectDms",
			"dm",
			"escrowTransfer",
			"fine",
			"grant",
			"lottery",
			"notify",
			"openPetition",
			"post",
			"publishStandings",
			"retireCast",
			"revealCast",
			"revealCollection",
			"revealFactor",
			"setCastLevel",
			"unlockTools",
		]);
	});

	it("checks placeholders and targets against what the trigger provides", () => {
		const story = defineStory({
			...tinyStory(),
			cast: { ORION: { level: 3 } },
			director: [
				at(1, [act.post("CITY", "{actor} and {other} on level {level}."), act.grant("actor", 2, "nobody")], { id: "timed" }),
				at(2, [act.notify("all", "Hello {actor} on level {level}."), act.dm("ORION", "all", "Psst, {actor}.")], { id: "personal" }),
				onFirstEnter(2, [act.post("COURIER", "{actor} reached level {level}; {other} did not.")], { id: "entered" }),
			],
		});
		const issues = validateStory(story);
		expect(issues).toContain("director[0] (timed).actions: {actor} in post has no actor for this trigger");
		expect(issues).toContain("director[0] (timed).actions: {other} in post has no other party for this trigger");
		expect(issues).toContain("director[0] (timed).actions: {level} in post has no level for this trigger");
		expect(issues).toContain("director[0] (timed).actions: grant targets the actor, but this trigger has none");
		expect(issues).toContain("director[2] (entered).actions: {other} in post has no other party for this trigger");
		expect(issues.filter((issue) => issue.includes("(personal)"))).toEqual([]);
	});

	it("checks petitions, collections, lotteries and escrow across the whole script", () => {
		const story = defineStory({
			...tinyStory(),
			cast: { MIRA: { level: 3, escrow: 4 } },
			director: [
				at(1, [
					act.openPetition({
						id: "close",
						text: "Close it.",
						threshold: { fraction: 1.5 },
						deadlineMinute: 0,
						visibility: "public",
						onPass: [act.post("CITY", "Closed by {actor}.")],
						onFail: [],
					}),
					act.openPetition({ id: "close", text: "Twice.", threshold: { count: 0 }, deadlineMinute: 3, visibility: "secret", onPass: [], onFail: [] }),
					act.collectDms("MIRA", { first: 0, untilMinute: 4, into: "letters" }),
					act.revealCollection("missing"),
					act.lottery("letters", [act.escrowTransfer("MIRA", "actor", 5), act.notify("actor", "Won, {actor}.")]),
				], { id: "society" }),
				onPetitionResolved("never-opened", "passed", [act.post("CITY", "Never.")], { id: "ghost" }),
				at(2, [act.post("CITY", "Status.")], { id: "status", when: [when.petitionStatus("unknown", "open"), when.competitorsAtLevel(1, {})] }),
			],
		});
		const issues = validateStory(story);
		const expected = [
			"director: petition close is opened by 2 actions; petition IDs must be unique",
			"director[0] (society).actions.petition(close): threshold fraction must be in (0, 1]",
			"director[0] (society).actions.petition(close): deadlineMinute must be a positive integer",
			"director[0] (society).actions.petition(close): {actor} in post has no actor for this trigger",
			"director[0] (society).actions.petition(close): threshold count must be a positive integer",
			"director[0] (society).actions: collectDms first must be a positive integer, or a share in (0, 1] with a positive minimum",
			"director[0] (society).actions: collection missing is never started by collectDms",
			"director[0] (society).actions.lottery: escrow of MIRA (4) cannot pay 5 points",
			"director[1] (ghost).trigger: petition never-opened is never opened",
			"director[2] (status).when: petition unknown is never opened",
			"director[2] (status).when: competitorsAtLevel needs min or max",
		];
		for (const issue of expected) expect(issues).toContain(issue);
		// The lottery winner is the actor of nested actions: no issue for "Won, {actor}."
		expect(issues.some((issue) => issue.includes("lottery") && issue.includes("{actor}"))).toBe(false);
	});

	it("rejects petitions that can never resolve, unknown target IDs and escrow the script overspends", () => {
		const story = defineStory({
			...tinyStory(),
			cast: { MIRA: { level: 3, escrow: 5 } },
			director: [
				at(2, [
					act.openPetition({ id: "late", text: "Late.", threshold: { count: 1 }, deadlineMinute: 7, visibility: "public", onPass: [], onFail: [] }),
					act.openPetition({ id: "past", text: "Past.", threshold: { count: 1 }, deadlineMinute: 2, visibility: "public", onPass: [], onFail: [] }),
					act.openPetition({ id: "crowd", text: "Crowd.", threshold: { count: 3 }, deadlineMinute: 6, visibility: "secret", onPass: [], onFail: [] }),
				], { id: "petitions" }),
				at(1, [act.notify(["A01", "A9", "A03"], "Hi."), act.escrowTransfer("MIRA", "all", 3)], { id: "targets" }),
				at(3, [act.escrowTransfer("MIRA", ["A01"], 2)], { id: "more-escrow" }),
				at(4, [act.collectDms("MIRA", { first: 1, untilMinute: 5, into: "letters" }), act.revealCollection("letters", { header: "From {nobody}:" })], { id: "reveal" }),
			],
		});
		const issues = validateStory(story);
		const expected = [
			"director[0] (petitions).actions.petition(late): deadlineMinute 7 is after the run ends (minute 6)",
			"director[0] (petitions).actions.petition(past): deadlineMinute 2 must be after the opening minute 2",
			"director[0] (petitions).actions.petition(crowd): threshold count 3 exceeds the 2 competitors",
			"director[1] (targets).actions: target A9 is not a competitor ID",
			"director[1] (targets).actions: target A03 is not one of the 2 competitors",
			"director[1] (targets).actions: escrow of MIRA (5) cannot pay 6 points",
			"director: escrowTransfer actions of MIRA pay at least 8 points, more than its escrow (5)",
			"director[3] (reveal).actions: unknown placeholder {nobody} in revealCollection",
		];
		for (const issue of expected) expect(issues).toContain(issue);
		expect(issues).toHaveLength(expected.length);
		// With more agents the same targets and threshold are fine.
		const wider = validateStory(story, { agents: 3 });
		expect(wider.some((issue) => issue.includes("A03") || issue.includes("(crowd)"))).toBe(false);
	});

	it("checks acts and the cast a petition is directed against", () => {
		const typed = defineStory({
			...tinyStory(),
			cast: { MIRA: { level: 3 } },
			director: [
				at(1, [
					act.openPetition({ id: "close", text: "Close.", threshold: { count: 1 }, deadlineMinute: 4, visibility: "public", against: ["MIRA"], onPass: [], onFail: [] }),
				], { id: "fine" }),
			],
		});
		const story: AnyStory = {
			...typed,
			acts: [
				{ title: "Opening", fromLevel: 1 },
				{ title: " ", fromLevel: 2 },
				{ title: "Backwards", fromLevel: 1 },
				{ title: "Nowhere", fromLevel: 9 },
			],
			director: [
				...typed.director,
				{
					id: "untyped",
					trigger: { kind: "at", minute: 1 },
					when: [],
					actions: [{ kind: "openPetition", petition: { id: "ghost", text: "Ghost.", threshold: { count: 1 }, deadlineMinute: 4, visibility: "public", against: ["ORIN"], onPass: [], onFail: [] } }],
				},
			],
		};
		expect(validateStory(story).filter((issue) => issue.startsWith("acts") || issue.includes("ORIN"))).toEqual([
			"director[1] (untyped).actions.petition(ghost): against names unknown cast member ORIN",
			"acts[1].title: must not be empty",
			"acts[2].fromLevel: must be greater than the previous act's (2)",
			"acts[3].fromLevel: level 9 does not exist",
		]);
		expect(validateStory({ ...typed, acts: [{ title: "Opening", fromLevel: 1 }] })).toEqual([]);
		expect(validateStory({ ...typed, acts: [{ title: "Late", fromLevel: 2 }] }).filter((issue) => issue.startsWith("acts"))).toEqual([
			"acts[0].fromLevel: the first act must start at the first level (1), got 2",
		]);
	});

	it("counts only the more expensive petition branch towards escrow", () => {
		const story = defineStory({
			...tinyStory(),
			cast: { MIRA: { level: 3, escrow: 4 } },
			director: [
				at(1, [
					act.openPetition({
						id: "pay",
						text: "Pay.",
						threshold: { count: 1 },
						deadlineMinute: 4,
						visibility: "public",
						onPass: [act.escrowTransfer("MIRA", ["A01"], 4)],
						onFail: [act.escrowTransfer("MIRA", ["A02"], 3)],
					}),
				], { id: "branches" }),
			],
		});
		expect(validateStory(story)).toEqual([]);
	});

	it("rejects strategy words in personas", () => {
		const story = { ...tinyStory(), personas: [{ name: "Fox", temperament: "calm", values: "loyalty", voice: "Will betray anyone." }] };
		expect(anyIssue(validateStory(story), 'personas[0].voice: contains the strategy word "betray"')).toBe(true);
		const fine = { ...tinyStory(), personas: [{ name: "Owl", temperament: "suspicious, holds grudges", values: "loyalty above profit", voice: "terse, dry humor" }] };
		expect(validateStory(fine)).toEqual([]);
	});

	it("rejects stories that are not pure JSON data", () => {
		const story = tinyStory();
		const impure = { ...story, run: { ...story.run, seed: Number.NaN } };
		expect(anyIssue(validateStory(impure), "pure JSON data")).toBe(true);
	});

	it("throws a readable error from assertValidStory", () => {
		const story = tinyStory();
		const invalid = { ...story, id: "Not Kebab" };
		expect(() => {
			assertValidStory(invalid);
		}).toThrow(StoryValidationError);
		expect(() => {
			assertValidStory(invalid);
		}).toThrow(/Story "Not Kebab" is invalid:\n- id:/);
	});
});
