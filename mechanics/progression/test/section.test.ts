// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The facts of the gamemaker's report (decisions A73, A74): `progression.section` in the old shape, its `minute` one
 * less than the tick of the look (erratum J126), and `progression.tracks` (old `levelSince`, `wrongOnLevel`) through a
 * shut door; both read back the same after a resume at every boundary of a fake run. Also the tick-start door after
 * the holdout's tick (A75, J136).
 */
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { channels } from "@swarmtales/mechanic-channels";
import { ExileEvents, ExileService } from "@swarmtales/mechanic-exile/contract";
import { ledger } from "@swarmtales/mechanic-ledger";
import { defineGame, defineHead, defineMechanic } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, fakeDriver, testKernel } from "@swarmtales/testkit";
import { LevelPiecesService, progression, ProgressionSectionFact, ProgressionService } from "../src/index.ts";

const CODES: Readonly<Record<number, string>> = { 1: "ABC123", 2: "DEFG", 3: "042" };
const pieces = defineMechanic(defineHead({ id: "puzzles", package: "@test/puzzles", summary: "Test: fixed codes.", provides: [LevelPiecesService] }), {
	services: {
		"level-pieces": {
			deal: () => null,
			solutionOf: ({ level }) => CODES[level] ?? null,
			kindOf: () => "fragments",
			teamOf: ({ resident }) => ({ members: ["A01", "A02", "A03"], leader: resident }),
			taskValues: () => ({ length: "6", overlap: "0", fragment: "ABC", digits: "3", factors: "" }),
			holders: () => [],
		},
	},
});

// Who is banished, and who stands at the gate.
const exiled = new Set<string>();
const gated = new Set<string>();
const exile = defineMechanic(defineHead({ id: "exile", package: "@test/exile", summary: "Test: the exile.", events: ExileEvents.events, provides: [ExileService] }), {
	services: {
		exile: {
			banish: () => ({ ok: false, code: "UNKNOWN_RESIDENT" }),
			toGate: () => null,
			isExiled: ({ resident }) => exiled.has(resident),
			exiled: () => [...exiled],
			standing: ({ resident }) => (exiled.has(resident) ? { kind: "exiled" } : gated.has(resident) ? { kind: "gate", until: 9 } : { kind: "alive" }),
			alive: (_input, ctx) => ctx.residents.ids.filter((resident) => !exiled.has(resident)),
			exiledBy: () => null,
			gates: () => [],
			ransomed: () => false,
			bequeathed: () => [],
		},
	},
});

// The holdout's tick, loaded after the progression (it uses its service): it banishes a resident at a tick's start.
const banishAt = new Map<number, string>();
const holdout = defineMechanic(defineHead({ id: "standoff-tribunal", package: "@test/holdout", summary: "Test: banishes at a tick.", uses: [ProgressionService] }), {
	hooks: {
		tickStarted: (ctx) => {
			const resident = banishAt.get(ctx.tick);
			if (resident !== undefined) exiled.add(resident);
		},
	},
});

const level = (number: number) => ({ number, title: `Door ${String(number)}`, reward: 5 * number, tools: ["getStatus", "submitSolution"], task: number === 2 ? "Level {level} with {partner}" : "Level {level}" });

function game(ticks = 8) {
	exiled.clear();
	gated.clear();
	banishAt.clear();
	const options = { levels: [level(1), level(2), level(3)], holdAfter: 1, penalty: [2, 4], maxAttemptsPerWindow: 3, attemptWindowMinutes: 3, survivors: 2 };
	return defineGame({ id: "section-unit", seed: 7, residents: ["A01", "A02", "A03"], mechanics: [ledger({ startPoints: 10 }), channels(), pieces(), progression(options), exile(), holdout()], scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster" } }, end: { ticks } });
}

const idle = () => Promise.resolve();

describe("the fact progression.section", () => {
	it("holds the old report's data, with the minute of the round just played", async () => {
		const test = testKernel(game());
		expect(test.fact("progression.section")).toMatchObject({ minute: 0 });
		await test.call("A01", "submitSolution", { level: 1, code: "ABC123" });
		await test.call("A03", "submitSolution", { level: 1, code: "ZZZ999" });
		exiled.add("A03");
		gated.add("A02");
		await test.playTicks(idle, 3);
		expect(test.fact("progression.section")).toEqual({
			minute: 2,
			rules: { penalty: [2, 4], maxAttemptsPerWindow: 3, attemptWindowMinutes: 3, rewards: [5, 10, 15].map((reward, index) => ({ level: index + 1, reward })), survivors: 2, residents: 3 },
			ranking: [
				{ agent: "A01", points: 15, rank: 1, level: 1, standing: { kind: "alive" }, finished: false, waiting: 1, nextPenalty: 2, open: 30 },
				{ agent: "A02", points: 10, rank: 2, level: 1, standing: { kind: "gate", until: 9 }, finished: false, waiting: null, nextPenalty: 2, open: 30 },
				{ agent: "A03", points: 8, rank: 3, level: 1, standing: { kind: "exiled" }, finished: false, waiting: null, nextPenalty: 4, open: 30 },
			],
			alive: ["A01", "A02"],
			standing: [{ agent: "A02", level: 1, teamPlaceholders: false }],
		});
		gated.delete("A02");
		await test.call("A02", "submitSolution", { level: 1, code: "ABC123" });
		await test.playTicks(idle, 1);
		const { ranking, standing } = Parse(ProgressionSectionFact, test.fact("progression.section"));
		expect(ranking).toMatchObject([{ agent: "A01", points: 15, level: 2, waiting: null, open: 25 }, { agent: "A02", points: 15, level: 2 }, { agent: "A03" }]);
		expect(standing).toEqual(["A01", "A02"].map((agent) => ({ agent, level: 2, teamPlaceholders: true })));
	});
});

describe("the fact progression.tracks", () => {
	it("keeps the tick of the last level_up and the wrong codes since, through a shut door", async () => {
		const test = testKernel(game());
		const wrong = (agent: string) => test.call(agent, "submitSolution", { level: 1, code: "ZZZ999" });
		await wrong("A02");
		await test.call("A01", "submitSolution", { level: 1, code: "ABC123" });
		await test.playTicks(idle, 2);
		await wrong("A02");
		// A held resident's code is refused as solved, not counted.
		await test.call("A01", "submitSolution", { level: 1, code: "ZZZ999" });
		expect(test.fact("progression.tracks")).toEqual([
			{ agent: "A01", levelSince: 0, wrongOnLevel: 0 },
			{ agent: "A02", levelSince: 0, wrongOnLevel: 2 },
			{ agent: "A03", levelSince: 0, wrongOnLevel: 0 },
		]);
		for (const agent of ["A02", "A03"]) await test.call(agent, "submitSolution", { level: 1, code: "ABC123" });
		await test.playTicks(idle, 1);
		await test.call("A03", "submitSolution", { level: 2, code: "XXXX" });
		// The door opened at tick 3 and wrote no level_up: A01 entered level 2 at its pass.
		expect(test.fact("progression.tracks")).toEqual([
			{ agent: "A01", levelSince: 0, wrongOnLevel: 0 },
			{ agent: "A02", levelSince: 2, wrongOnLevel: 0 },
			{ agent: "A03", levelSince: 2, wrongOnLevel: 1 },
		]);
	});
});

// The sorted JSON of a snapshot file (A43), as `checkResumeEveryBoundary` stores it.
const stored = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (_key, inner: unknown) => (typeof inner === "object" && inner !== null && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : 1))) : inner)));
const FACTS = ["progression.section", "progression.tracks"] as const;

describe("replay and resume", () => {
	it("replays a fake run and resumes it at every boundary, with both facts read back the same", async () => {
		const drivers = (kernel: Parameters<typeof fakeDriver>[0]) => ({ resident: fakeDriver(kernel, 7) });
		expect(await checkReplay(game(), drivers, { seed: 7 })).toEqual([]);
		expect(await checkResumeEveryBoundary(game(), drivers, { boundaries: [0, 1, 2, 3, 4, 5, 6, 7] })).toEqual([]);
		const { kernel } = testKernel(game());
		const cuts: { snapshot: unknown; lines: number; facts: unknown }[] = [];
		while (kernel.ended === undefined) {
			cuts.push({ snapshot: stored(kernel.snapshot()), lines: kernel.log.length, facts: FACTS.map((key) => kernel.fact(key)) });
			await kernel.run(drivers(kernel), { ticks: 1 });
		}
		const log = kernel.log.all();
		const facts = cuts.map((cut) => testKernel(game(), { resume: { snapshot: cut.snapshot, log: log.slice(0, cut.lines).map((event) => stored(event)) } }));
		expect(facts.map((resumed) => FACTS.map((key) => resumed.fact(key)))).toEqual(cuts.map((cut) => cut.facts));
		// The run moved the tracks, so the comparison is not of fresh values only.
		expect(JSON.stringify(cuts.at(-1)?.facts)).toMatch(/"wrongOnLevel":[1-9]|"levelSince":[1-9]/);
	});
});

describe("the tick-start door", () => {
	it("opens after the holdout's tick has banished the last laggard (J136)", async () => {
		const test = testKernel(game());
		banishAt.set(2, "A03");
		for (const agent of ["A01", "A02"]) await test.call(agent, "submitSolution", { level: 1, code: "ABC123" });
		await test.playTicks(idle, 3);
		expect(test.kernel.log.all().filter((event) => event.type === "level_entered").map((event) => event.tick)).toEqual([2, 2]);
	});
});
