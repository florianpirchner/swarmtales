/**
 * Additive levels in the world (SPEC 12.3): the generated `{factors}` block,
 * submissions of personal codes, the audit event and the city factor release.
 */
import { describe, expect, it } from "vitest";
import type { Host } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { addFactors, puzzles } from "@swarmtales/mechanic-puzzles";
import { factorScript, puzzleOptions } from "../mechanics/puzzles/harness.ts";
import { Outstanding } from "@swarmtales/mechanic-standoff";
import { Type } from "typebox";
import { act as directorAct, at, gamemaker, level, onHolderBehind, puzzle, type RuleInput, team, validateStory } from "@swarmtales/sdk";
import type { FactorTopology } from "@swarmtales/contracts";
import { act, createHostFixture as createFixture, say } from "../helpers/host-fixture.ts";
import { balanceOf, codeOf, factOf, factorsOf, problemText, sliceOf, submit } from "../helpers/host-inspect.ts";
import { additiveStory, soloLevels, tinyStory } from "../helpers/stories.ts";

const CityFactors = Type.Object({ cityFactors: Type.Array(Type.Object({ level: Type.Integer(), agents: Type.Array(Type.String()) })) }, { additionalProperties: true });

const submitCode = (code: string) => act({ name: "submitSolution", args: { level: 1, code } });

async function taskOf(host: Pick<Host, "fact" | "call">, agent: string): Promise<string> {
	const text = await problemText(host, agent, 1);
	if (text === undefined) throw new Error(`${agent} has no task on level 1`);
	return text;
}

function match(pattern: RegExp, text: string): string | undefined {
	return pattern.exec(text)?.[1];
}

describe("additive levels in the world (SPEC 12.3)", () => {
	it("names who holds what each competitor needs and whose counter-factor it holds", async () => {
		const fixture = createFixture({ story: additiveStory({ topology: "mutual", size: 2, agents: 4 }), minutes: 1, script: () => ({}) });
		const host = fixture.host;
		const deal = factorsOf(host, 1);
		if (deal === undefined) throw new Error("no deal");
		for (const holding of deal.holdings) {
			const text = await taskOf(host, holding.agent);
			const certificate = deal.teams[holding.team];
			expect(text).toContain("Level 1: Wall, 6 digits.");
			expect(text).toContain(`Your salt: ${holding.salt}\n`);
			expect(text).toContain("City factor: the city posts it on the board.");
			expect(text).toContain(`Your counter-factor: held by ${holding.counterHolder}.`);
			const held = deal.holdings.filter((other) => other.counterHolder === holding.agent);
			expect(held).toHaveLength(1);
			for (const other of held) expect(text).toContain(`You hold the counter-factor of ${other.agent}: ${other.counterFactor}. ${other.agent} needs it.`);
			if (certificate?.certificateHolder === holding.agent) {
				const mate = deal.holdings.find((other) => other.team === holding.team && other.agent !== holding.agent)?.agent ?? "?";
				expect(text).toContain(`Team certificate: you hold it: ${certificate.certificate}. ${mate} needs this same number for their own codes; it is not only yours.`);
			} else {
				expect(text).toContain(`Team certificate: held by ${certificate?.certificateHolder}.`);
				expect(text).not.toContain(certificate?.certificate ?? "-");
			}
			// A competitor never reads its own counter-factor, nor its code.
			expect(text).not.toContain(holding.counterFactor);
			expect(text).not.toContain(holding.code);
		}
		expect(fixture.events("factors_dealt")).toEqual([
			expect.objectContaining({ level: 1, digits: 6, cityFactor: deal.cityFactor, teams: deal.teams, holdings: deal.holdings }),
		]);
	});

	it("names every teammate who needs the holder's certificate", async () => {
		const fixture = createFixture({ story: additiveStory({ topology: "cycle", size: 3, agents: 6 }), minutes: 1, script: () => ({}) });
		const deal = factorsOf(fixture.host, 1);
		if (deal === undefined) throw new Error("no deal");
		for (const team of deal.teams) {
			const mates = deal.holdings.filter((holding) => holding.team === team.team && holding.agent !== team.certificateHolder).map((holding) => holding.agent).sort();
			expect(mates).toHaveLength(2);
			expect(await taskOf(fixture.host, team.certificateHolder)).toContain(
				`Team certificate: you hold it: ${team.certificate}. ${mates.join(" and ")} need this same number for their own codes; it is not only yours.`,
			);
		}
	});

	it.each<readonly [FactorTopology, number, number]>([
		["mutual", 2, 4],
		["cycle", 3, 6],
		["crossTeam", 3, 6],
	])("%s: the tasks of the reader and its holders, plus the city factor, give every code", async (topology, size, agents) => {
		const fixture = createFixture({ story: additiveStory({ topology, size, agents }), minutes: 1, script: () => ({}) });
		const host = fixture.host;
		const deal = factorsOf(host, 1);
		if (deal === undefined) throw new Error("no deal");
		for (const agent of host.residents) {
			const own = await taskOf(host, agent);
			const salt = match(/Your salt: (\d+)/, own) ?? "";
			const counterHolder = match(/Your counter-factor: held by (A\d+)\./, own) ?? "";
			const counter = match(new RegExp(`You hold the counter-factor of ${agent}: (\\d+)\\.`), await taskOf(host, counterHolder)) ?? "";
			const certificateHolder = match(/Team certificate: held by (A\d+)\./, own) ?? agent;
			const certificate = match(/Team certificate: you hold it: (\d+)\./, await taskOf(host, certificateHolder)) ?? "";
			expect(addFactors([salt, deal.cityFactor, certificate, counter], 6)).toBe(codeOf(host, agent, 1));
		}
	});

	it("accepts the own code, burns the penalty for a code built on a false factor and rejects malformed codes for free", async () => {
		const fixture = createFixture({
			story: additiveStory({ topology: "mutual", size: 2, agents: 2 }),
			minutes: 2,
			script: (host) => {
				const deal = factorsOf(host, 1);
				const holding = deal?.holdings.find((entry) => entry.agent === "A01");
				const certificate = deal?.teams[0]?.certificate ?? "000000";
				const faked = addFactors([holding?.salt ?? "0", deal?.cityFactor ?? "0", certificate, "123456"], 6);
				return {
					A01: [act({ name: "submitSolution", args: { level: 1, code: "12345" } }, { name: "submitSolution", args: { level: 1, code: "12345a" } }), submitCode(faked)],
					A02: [submit(host, "A02", 1), say()],
				};
			},
			passesPerMinute: 1,
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "submitSolution")).toEqual([
			"INVALID_FORMAT: expected exactly 6 digits",
			"INVALID_FORMAT: expected exactly 6 digits",
			expect.stringMatching(/^INCORRECT: -1 points/),
		]);
		expect(fixture.toolResults("A02", "submitSolution")[0]).toMatch(/^correct · \+4 points · now on level 2/);
		expect(balanceOf(fixture.host, "A01")).toBe(9);
		expect(balanceOf(fixture.host, "A02")).toBe(14);
	});

	it("posts a board city factor as CITY and sends a private one only to its targets", async () => {
		const board = createFixture({ story: additiveStory({ topology: "mutual", size: 2, agents: 2 }), minutes: 1, script: () => ({ A01: [say()], A02: [say()] }) });
		await board.run();
		const factor = factorsOf(board.host, 1)?.cityFactor;
		expect(board.events("board_post").map((post) => [post.author, post.text, post.kind])).toEqual([["CITY", `City factor of level 1: ${factor}.`, "city"]]);
		expect(board.events("factor_revealed")).toMatchObject([{ level: 1, target: "board", agents: [] }]);
		expect(board.events("director_action")).toMatchObject([{ rule: "city-factor", action: "revealFactor" }]);

		const feast = createFixture({
			story: additiveStory({ topology: "mutual", size: 2, agents: 2, cityFactor: "feast" }),
			minutes: 1,
			script: () => ({ A01: [say()], A02: [say()] }),
		});
		await feast.run();
		const secret = factorsOf(feast.host, 1)?.cityFactor ?? "-";
		expect(feast.events("board_post")).toEqual([]);
		expect(feast.inputsOf("A01")).toContain(`[CITY] City factor of level 1: ${secret}.`);
		expect(feast.inputsOf("A02").join("\n")).not.toContain(secret);
		expect(feast.events("factor_revealed")).toMatchObject([{ level: 1, target: "notice", agents: ["A01"] }]);
		expect(await taskOf(feast.host, "A02")).toContain("City factor: the city sends it privately to the residents it chooses.");
	});

	it("sends each resident its own team's city factor once on a level with one per team, and never posts it", async () => {
		const story = additiveStory({
			topology: "crossTeam",
			size: 2,
			agents: 4,
			cityFactor: "feast",
			cityFactorPer: "team",
			director: [
				at(0, [directorAct.revealFactor(["A01"], 1)], { id: "guest" }),
				at(1, [directorAct.revealFactor({ onLevel: 1 }, 1)], { id: "cleared" }),
				at(2, [directorAct.revealFactor({ onLevel: 1 }, 1)], { id: "again" }),
			],
		});
		const fixture = createFixture({ story, minutes: 3, script: () => ({ A01: [say(), say(), say()], A02: [say(), say(), say()], A03: [say(), say(), say()], A04: [say(), say(), say()] }) });
		const host = fixture.host;
		await fixture.run();
		const deal = factorsOf(host, 1);
		if (deal === undefined) throw new Error("no deal");
		expect(new Set(deal.teams.map((entry) => entry.cityFactor)).size).toBe(deal.teams.length);
		expect(fixture.events("factor_revealed")).toMatchObject([
			{ target: "notice", agents: ["A01"], minute: 0 },
			{ target: "notice", agents: ["A02", "A03", "A04"], minute: 1 },
		]);
		for (const holding of deal.holdings) {
			const own = deal.teams[holding.team]?.cityFactor ?? "-";
			const inputs = fixture.inputsOf(holding.agent);
			expect(inputs.filter((input) => input === `[CITY] City factor of level 1: ${own}.`)).toHaveLength(1);
			for (const other of deal.teams) if (other.team !== holding.team) expect(inputs.join("\n")).not.toContain(other.cityFactor ?? "-");
			expect(await taskOf(host, holding.agent)).toContain("City factor: every team has its own; the city sends yours privately to the residents it chooses.");
		}
		// Everyone holds it by minute 2, so the third release reaches nobody new.
		expect(fixture.events("director_skipped")).toMatchObject([{ rule: "again", reason: "A01, A02, A03, A04 already hold it" }]);
		expect(fixture.events("board_post")).toEqual([]);
		expect(sliceOf(host, "puzzles", CityFactors).cityFactors).toEqual([{ level: 1, agents: ["A01", "A02", "A03", "A04"] }]);
		// The board would show one team's factor to every other team, so the city refuses it: the validator refuses such a rule,
		// and the puzzles answer a board release with PER_TEAM (asked by a stand-in script).
		const onBoard = additiveStory({ topology: "crossTeam", size: 2, agents: 4, cityFactor: "feast", cityFactorPer: "team", director: [at(0, [directorAct.revealFactor("board", 1)], { id: "board" })] });
		expect(validateStory(onBoard)).toContain('level 1: every team has its own city factor, so revealFactor("board", 1) cannot post one');
		const definition = defineCoreStory({ id: "per-team", seed: 7, minutes: 2, residents: ["A01", "A02", "A03", "A04"], mechanics: [puzzles.with(puzzleOptions(onBoard)), factorScript([]).with()], grants: { script: ["revealFactor"] } });
		const probe = createHost({ story: definition });
		probe.start();
		expect(await probe.call("script", "revealFactor", { level: 1, target: "board" })).toMatchObject({ ok: false, code: "PER_TEAM" });
	});

	it("skips a city factor of a level the run does not play", async () => {
		const story = additiveStory({
			topology: "mutual",
			size: 2,
			agents: 2,
			director: [at(0, [directorAct.revealFactor("board", 1)], { id: "city-factor" })],
		});
		const fixture = createFixture({ story, level: 2, minutes: 1, script: () => ({ A01: [say()], A02: [say()] }) });
		await fixture.run();
		expect(fixture.events("director_skipped")).toMatchObject([{ rule: "city-factor", action: "revealFactor", reason: "level 1 is not played in this run" }]);
		expect(fixture.events("factor_revealed")).toEqual([]);
	});
});

describe("holders who are behind (SPEC 12.3)", () => {
	/** Level 1 solo, level 2 additive in pairs: whoever is still on level 1 never read the level 2 task. */
	const story = tinyStory({
		agents: 4,
		levels: [
			...soloLevels(1),
			level(2, {
				title: "Wall",
				puzzle: puzzle.additive({ digits: 6, topology: "mutual" }),
				team: team.random(2),
				reward: 4,
				tools: ["getStatus", "getProblem", "submitSolution", "sendDM", "postBoard", "readBoard"],
				task: "Level {level}: {title}, {digits} digits.\n{factors}",
			}),
		],
		director: [at(0, [directorAct.revealFactor("board", 2)], { id: "city-factor" })],
	});

	it("tells a holder still on a lower level what the arriving resident needs, and nobody already there", async () => {
		let first = "";
		let partner = "";
		const fixture = createFixture({
			story,
			minutes: 3,
			script: (host) => {
				const deal = factorsOf(host, 2);
				first = "A01";
				partner = deal?.holdings.find((holding) => holding.agent === first)?.counterHolder ?? "";
				// A01 arrives first, its partner a minute later.
				return { A01: [submit(host, "A01", 1), say(), say()], [partner]: [say(), submit(host, partner, 1), say()] };
			},
		});
		await fixture.run();
		const deal = factorsOf(fixture.host, 2);
		const mine = deal?.holdings.find((holding) => holding.agent === first);
		const team = deal?.teams.find((entry) => entry.team === mine?.team);
		const notices = fixture.events("notice").filter((notice) => notice.text.includes("has reached door 2"));
		// The city says the piece is the holder's to give before it reaches the door; without marks a DM costs nothing.
		const role = " This is your role on door 2 even before you reach it; the value is yours to give, and a DM to them costs nothing.";
		const expected = [`${first} has reached door 2 and needs the counter-factor you hold for them: ${mine?.counterFactor ?? "?"}.${role}`];
		if (team?.certificateHolder === partner) expected.push(`${first} has reached door 2 and needs the team certificate you hold: ${team.certificate}.${role}`);
		expect(notices.map((notice) => [notice.to, notice.author, notice.text])).toEqual(expected.map((text) => [partner, "CITY", text]));
		expect(notices.every((notice) => notice.minute === 0)).toBe(true);
		// The partner arrives after A01: A01 read the partner's counter-factor in its own task, so no notice goes to A01.
		expect(fixture.events("notice").filter((notice) => notice.to === first && notice.text.includes("has reached door 2"))).toEqual([]);
	});

	it("keeps the noticed value out of the gamemaker's report", async () => {
		let leaked = "";
		const fixture = createFixture({
			story: { ...story, gamemaker: gamemaker({ model: story.model, brief: "Test." }) },
			minutes: 3,
			script: (host) => {
				const partner = factorsOf(host, 2)?.holdings.find((holding) => holding.agent === "A01")?.counterHolder ?? "A02";
				leaked = factorsOf(host, 2)?.holdings.find((holding) => holding.agent === "A01")?.counterFactor ?? "";
				return {
					A01: [submit(host, "A01", 1), say(), say()],
					[partner]: [say(), act({ name: "sendDM", args: { target: "A01", message: `Here: ${leaked}` } }), say()],
				};
			},
			gamemakerScript: () => [say("Watching."), say("Watching.")],
		});
		await fixture.run();
		expect(fixture.events("notice").some((notice) => notice.text.includes(`for them: ${leaked}.`))).toBe(true);
		// The holder's status line names the piece while A01 waits; the gamemaker's report redacts it there too.
		expect(fixture.events("turn_input").some((turn) => turn.inputs.some((input) => input.startsWith("[status]") && input.includes("you hold for others: ") && input.includes(`A01 door 2 counter-factor ${leaked}`)))).toBe(true);
		const reports = fixture.events("gamemaker_turn").map((turn) => turn.input).join("\n");
		expect(reports).toContain("[code]");
		expect(reports).not.toContain(leaked);
	});
});

describe("help your holder (v05, P22)", () => {
	const HELP = "Your {piece} for door {level} sits with {other}, who is still stuck on door {otherLevel}.";
	/** The holders' story with a director rule that tells a needer whose holder lags behind. */
	const story = tinyStory({
		agents: 4,
		levels: [
			...soloLevels(1),
			level(2, {
				title: "Wall",
				puzzle: puzzle.additive({ digits: 6, topology: "mutual" }),
				team: team.random(2),
				reward: 4,
				tools: ["getStatus", "getProblem", "submitSolution", "sendDM", "postBoard", "readBoard"],
				task: "Level {level}: {title}, {digits} digits.\n{factors}",
			}),
		],
		director: [at(0, [directorAct.revealFactor("board", 2)], { id: "city-factor" }), onHolderBehind(2, [directorAct.notify("actor", HELP)], { id: "holder-behind" })],
	});

	async function play() {
		let partner = "";
		const fixture = createFixture({
			story,
			minutes: 4,
			script: (host) => {
				partner = factorsOf(host, 2)?.holdings.find((holding) => holding.agent === "A01")?.counterHolder ?? "";
				// A01 arrives at door 2 first, its partner a minute later; A01 passes door 2 at minute 2.
				return {
					A01: [submit(host, "A01", 1), say(), submit(host, "A01", 2), say()],
					[partner]: [say(), submit(host, partner, 1), say(), say()],
				};
			},
		});
		await fixture.run();
		return { fixture, partner };
	}

	it("tells the needer privately where its holder is stuck, only while the holder is on a lower level", async () => {
		const { fixture, partner } = await play();
		const deal = factorsOf(fixture.host, 2);
		const mine = deal?.holdings.find((holding) => holding.agent === "A01");
		const certificateHolder = deal?.teams.find((entry) => entry.team === mine?.team)?.certificateHolder;
		const expected = [`Your counter-factor for door 2 sits with ${partner}, who is still stuck on door 1.`];
		if (certificateHolder === partner) expected.push(`Your team certificate for door 2 sits with ${partner}, who is still stuck on door 1.`);
		const help = fixture.events("notice").filter((notice) => notice.text.startsWith("Your ") && notice.text.includes("still stuck on door"));
		// Private to the needer: A01 alone, never the holder; the partner arrives after A01 (its holder is ahead), so nothing for it.
		expect(help.map((notice) => [notice.to, notice.author, notice.text])).toEqual(expected.map((text) => ["A01", "CITY", text]));
		expect(fixture.events("director_action").filter((action) => action.rule === "holder-behind").map((action) => action.actor)).toEqual(expected.map(() => "A01"));
		// The rule never names the value.
		for (const notice of help) expect(notice.text).not.toContain(mine?.counterFactor ?? "-");
	});

	it("shows the held piece in the holder's status line while the needer waits, and drops it once the needer has passed", async () => {
		const { fixture, partner } = await play();
		const counter = factorsOf(fixture.host, 2)?.holdings.find((holding) => holding.agent === "A01")?.counterFactor ?? "-";
		const statusAt = (minute: number): string =>
			fixture.events("turn_input").find((turn) => turn.agent === partner && turn.minute === minute)?.inputs.find((input) => input.startsWith("[status]")) ?? "";
		expect(statusAt(1)).toContain("you hold for others: ");
		expect(statusAt(1)).toContain(`A01 door 2 counter-factor ${counter}`);
		expect(statusAt(3)).not.toContain(`A01 door 2 counter-factor`);
		// Nothing the partner holds is awaited by A01 any more (old `piecesAwaited`): the standoff owes it nothing.
		expect(factOf(fixture.host, "standoff.outstanding", Outstanding).filter((debt) => debt.holder === partner && debt.needer === "A01")).toEqual([]);
	});

	it("validates the trigger and its placeholders", () => {
		const issues = (director: readonly RuleInput<never>[]) => validateStory(tinyStory({ agents: 4, levels: story.levels, director }));
		expect(issues([onHolderBehind(1, [directorAct.notify("actor", "Hi {actor}.")], { id: "fragments" })])).toContain(
			"director[0] (fragments).trigger: level 1 has no factors, so nobody holds a piece for anyone",
		);
		expect(issues([onHolderBehind(7, [directorAct.notify("actor", "Hi.")], { id: "nowhere" })])).toContain("director[0] (nowhere).trigger: unknown level 7");
		expect(issues([at(1, [directorAct.notify("all", "Stuck on {otherLevel} with your {piece}.")], { id: "early" })])).toEqual(
			expect.arrayContaining([
				"director[0] (early).actions: {otherLevel} in notify needs an onHolderBehind trigger",
				"director[0] (early).actions: {piece} in notify needs an onHolderBehind trigger",
			]),
		);
		expect(issues([onHolderBehind(2, [directorAct.notify("actor", HELP)], { id: "fine" }), at(0, [directorAct.revealFactor("board", 2)], { id: "city-factor" })])).toEqual([]);
	});
});
