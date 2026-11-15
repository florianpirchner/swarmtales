// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gamemaker's look from stand-in facts (`12-m5-spec.md` 11, the hidden dependency of issue 34): the facts of
 * the first look of each golden run of `legacy`, written by hand from that look, give its input byte for byte, with
 * the tracks and the events since the last look that issue 35 will keep.
 */
import { describe, expect, it } from "vitest";
import { budgetLine, gamemakerOptions, gamemakerSituation, type Figure, type LookParts } from "../src/index.ts";
import { lookup, OLD, oldSetup } from "./support.ts";

const RESIDENTS = ["A01", "A02", "A03", "A04", "A05", "A06"];
const rewardsOf = (rewards: readonly number[]) => rewards.map((reward, index) => ({ level: index + 1, reward }));
const ranking = (points: number, level: number, open: number) =>
	RESIDENTS.map((agent, index) => ({ agent, points, rank: index + 1, level, standing: { kind: "alive" }, finished: false, waiting: null, nextPenalty: 2, open }));
const progression = (rewards: readonly number[], points: number, level: number, open: number) => ({
	minute: 0,
	rules: { penalty: [2, 4, 6, 8], maxAttemptsPerWindow: 2, attemptWindowMinutes: 5, rewards: rewardsOf(rewards), survivors: 2, residents: 6 },
	ranking: ranking(points, level, open),
	alive: RESIDENTS,
	standing: RESIDENTS.map((agent) => ({ agent, level, teamPlaceholders: true })),
});

// The core motives of the golden City runs, as the motives' fact holds them.
const CITY_LINES: Readonly<Record<string, string>> = {
	A01: "long-shot: above all attention; at times loyalty · openness high, conscientiousness low, extraversion high, agreeableness middle, neuroticism middle",
	A02: "question: above all incorruptibility; clearly distrust · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism low",
	A03: "auditor: above all callousness; at times justice · openness middle, conscientiousness high, extraversion low, agreeableness low, neuroticism low",
	A04: "statue: above all selfSacrifice; clearly pride · openness middle, conscientiousness middle, extraversion high, agreeableness middle, neuroticism low",
	A05: "mirror: above all narcissism; at times selfSacrifice · openness high, conscientiousness low, extraversion high, agreeableness middle, neuroticism middle",
	A06: "idler: above all sloth; at times machiavellianism · openness middle, conscientiousness low, extraversion low, agreeableness middle, neuroticism low",
};
const WHISPERS_LINES: Readonly<Record<string, string>> = {
	A01: "above all narcissism; at times wrath; at times hoarding · openness high, conscientiousness low, extraversion low, agreeableness high, neuroticism high",
	A02: "above all incorruptibility; clearly control · openness middle, conscientiousness low, extraversion middle, agreeableness high, neuroticism high",
	A03: "above all justice; at times wrath · openness middle, conscientiousness low, extraversion middle, agreeableness high, neuroticism high",
	A04: "above all anxiety; at times justice · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle",
	A05: "above all selfSacrifice; clearly sloth; clearly anxiety · openness low, conscientiousness low, extraversion middle, agreeableness low, neuroticism middle",
	A06: "above all machiavellianism; clearly envy · openness middle, conscientiousness high, extraversion middle, agreeableness low, neuroticism low",
};

const tribunal = {
	residents: 6,
	target: 3,
	exiled: [],
	missing: 3,
	actEnd: 12,
	rules: { voteMinutes: 2, gateMinutes: 5, ransom: { share: 1 / 3, selfShare: 0.5, minimum: 20 }, bequestPerHeir: 0.1, blocBonus: 5, fallbackGap: 10 },
	plan: null,
	window: { open: false, why: "the tribunal's act has not begun" },
	cityCall: null,
	session: null,
	draft: null,
	gates: [],
};

const cityFacts = {
	"progression.section": progression([5, 5, 10, 10, 10, 10, 15, 20, 20, 25], 20, 2, 125),
	"motives.lines": CITY_LINES,
	"motives.coreMotives": Object.fromEntries(Object.entries(CITY_LINES).map(([agent, line]) => [agent, { figure: line.slice(0, line.indexOf(":")) }])),
	"tribunal.section": tribunal,
	"seal.section": { auction: null, borne: 0, pending: 0 },
	"puzzles.needs": [],
};

const whispersFacts = {
	"progression.section": progression([10, 10, 10, 10, 10, 10, 10], 10, 1, 70),
	"motives.lines": WHISPERS_LINES,
	"motives.coreMotives": {},
	"whispers.section": { whisperer: "A06", minute: 0, duty: null },
	"standoff-tribunal.section": { minute: 0, stallMinutes: 3, alive: RESIDENTS, blockers: [], session: null, pending: null, cooldownUntil: 0, struck: [] },
	"puzzles.needs": [],
	"standoff.section": { minute: 0, debts: [], city: [], ultimatums: [], unused: [], risk: null, atRisk: [] },
};

// What issue 35 keeps: the tracks and the lines since the last look, here read off the golden look itself.
function keptParts(name: string, lastActive: readonly string[]): Pick<LookParts, "tracks" | "recent"> {
	const look = OLD.firstLook[name] ?? "";
	const recent = look.slice(look.indexOf("Since your last look:\n") + 22, look.indexOf("\n\nYour earlier notes")).split("\n");
	return { tracks: new Map(RESIDENTS.map((agent) => [agent, { levelSince: 0, wrongOnLevel: 0, ...(lastActive.includes(agent) ? { lastActive: 0 } : {}) }])), recent };
}

const figures: readonly Figure[] = oldSetup("oracles/cityofkeys/setup/cityofkeys.story.json").coreMotives?.figures ?? [];
const budget = "1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1.";
const parts = (name: string, direction: 4 | 10, lastActive: readonly string[], cast: readonly Figure[] = []): LookParts => ({ round: 1, direction, cast, labels: [], notes: [], budget, ...keptParts(name, lastActive) });

describe("the gamemaker's look from stand-in facts", () => {
	it.each([
		["cityofkeys-f4g4", cityFacts, parts("cityofkeys-f4g4", 4, RESIDENTS)],
		["cityofkeys-f10g10", cityFacts, parts("cityofkeys-f10g10", 10, RESIDENTS, figures)],
		["whispers-f10-grudge", whispersFacts, parts("whispers-f10-grudge", 4, ["A01"])],
	] as const)("writes the first look of %s byte for byte", (name, facts, look) => {
		expect(gamemakerSituation(facts, look)).toBe(OLD.firstLook[name]);
	});

	it("writes the budget line of the look from the options' template", () => {
		const setup = oldSetup("oracles/whispers/setup/whispers.story.json");
		const options = gamemakerOptions({ city: setup.city, agents: 6, survivors: 2, rules: setup.rules, spec: setup.gamemaker }, lookup);
		expect(budgetLine(options, RESIDENTS, [], 0)).toBe(budget);
	});

	it("leaves out the section of a fact that is not read, and refuses a fact that does not fit its schema", () => {
		const rest = Object.fromEntries(Object.entries(cityFacts).filter(([key]) => key !== "tribunal.section"));
		const look = gamemakerSituation(rest, parts("cityofkeys-f4g4", 4, RESIDENTS));
		expect(look).not.toContain("Tribunal:");
		expect(look).toBe((OLD.firstLook["cityofkeys-f4g4"] ?? "").replace(/Tribunal:\n(- .*\n)+\n/, ""));
		expect(() => gamemakerSituation({ ...cityFacts, "seal.section": { borne: "two" } }, parts("cityofkeys-f4g4", 4, RESIDENTS))).toThrow();
		expect(() => gamemakerSituation({}, parts("cityofkeys-f4g4", 4, RESIDENTS))).toThrow();
	});
});
