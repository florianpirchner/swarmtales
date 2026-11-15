// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * A look of the gamemaker over the real `ledger`, `channels`, `progression` and `standoff` (issue M5-35, decision
 * A74): the tracks from `progression.tracks` and `directors.active`, the events since the last look from its quiet
 * triggers (a quoted secret of `puzzles.secrets` redacted), its notes from `channels.notes` and the budget line from
 * `roster.residents`. The facts the report reads parse with its schemas (J143, J147), and the look holds no state:
 * replay and resume at every boundary give the straight log.
 */
import { createHash } from "node:crypto";
import type { ActorDriver, Kernel } from "@swarmtales/contracts";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { LevelPiecesService, progression, ProgressionSectionFact, ProgressionTracksFact } from "@swarmtales/mechanic-progression";
import { standoff, StandoffSectionFact } from "@swarmtales/mechanic-standoff";
import { SectionFact as TribunalSectionFact } from "@swarmtales/mechanic-tribunal";
import { defineGame, defineHead, defineMechanic, parseTake, RESIDENT_KIND } from "@swarmtales/sdk";
import { checkReplay, checkResumeEveryBoundary, play, scriptedDriver, type PlannedCall } from "@swarmtales/testkit";
import { Type, type TSchema } from "typebox";
import { Parse } from "typebox/value";
import { describe, expect, it } from "vitest";
import { ProgressionSectionSchema } from "../src/gamemaker/report/progression.ts";
import { StandoffSectionSchema } from "../src/gamemaker/report/standoff.ts";
import { TribunalSectionSchema } from "../src/gamemaker/report/tribunal.ts";
import { defineGamemaker, gamemakerOptions } from "../src/index.ts";
import { lookup, oldSetup } from "./support.ts";

const Round = Type.Object({ round: Type.Integer({ description: "The tick plus one" }) }, { description: "A round" });
const frame = defineMechanic(defineHead({ id: "arena", package: "@test/frame", summary: "Ends rounds.", events: { round_end: Round } }), {
	hooks: {
		tickEnded: (ctx) => {
			ctx.emit("round_end", { round: ctx.tick + 1 });
		},
	},
});

// The pieces of the levels and the secrets of the deal (`puzzles.secrets`), fixed.
const CODES: Readonly<Record<number, string>> = { 1: "ABC123", 2: "DEFG77" };
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
	facts: { secrets: { output: Type.Unknown({ description: "The secrets" }), compute: () => ({ passwords: Object.values(CODES), numbers: [] }) } },
});

const TOOLS = ["getStatus", "submitSolution", "sendDM", "postBoard", "transferPoints"];
const level = (number: number) => ({ number, title: `Door ${String(number)}`, reward: 5 * number, tools: TOOLS, task: "Level {level}" });
const levels = { levels: [level(1), level(2)], penalty: [2, 4], maxAttemptsPerWindow: 3, attemptWindowMinutes: 3, survivors: 2 };

const setup = oldSetup("oracles/whispers/setup/whispers.story.json");
const options = gamemakerOptions({ city: setup.city, agents: 3, survivors: 2, rules: setup.rules, spec: setup.gamemaker }, lookup);
const FACTS = ["progression.section", "puzzles.secrets", "standoff.section"] as const;
const director = defineGamemaker({ facts: [...FACTS], events: ["channels.dm_sent", "channels.board_post", "progression.submission", "progression.level_up", "ledger.transfer"] });

const game = defineGame({
	id: "gamemaker-look",
	seed: 5,
	residents: 3,
	mechanics: [ledger({ startPoints: 10 }), channels(), pieces(), progression(levels), standoff(), frame()],
	directors: [{ use: director, options }],
	scheduler: { id: "turns", options: { passes: 1, activation: "always", order: "roster", afterBlocks: ["director"] } },
	end: { ticks: 3 },
});

const PLAN: Readonly<Record<string, readonly PlannedCall[]>> = {
	"0 resident:A01": [{ tool: "submitSolution", params: { level: 1, code: "ABC123" } }],
	"0 resident:A02": [{ tool: "submitSolution", params: { level: 1, code: "ZZZ999" } }],
	"0 resident:A03": [{ tool: "sendDM", params: { target: "A01", message: "my piece is ABC123,   keep it" } }],
	"1 resident:A03": [{ tool: "transferPoints", params: { target: "A02", amount: 2, memo: "for DEFG77" } }, { tool: "postBoard", params: { message: "who is behind?" } }],
};
const residents = scriptedDriver((activation) => PLAN[`${String(activation.tick)} ${activation.actor}`] ?? []);

// The engine's driver of a Director up to the look; at each look it leaves a note that carries a digest of its input.
function looking(kernel: Kernel, inputs: string[]): ActorDriver {
	return async (activation) => {
		const taken = await activation.call("take", {});
		const firings = taken.ok ? (parseTake(taken.reply)?.firings ?? []) : [];
		if (firings.length === 0) return;
		const facts = Object.fromEntries(director.facts.map((key) => [key, kernel.fact(key)]));
		const input = director.input({ name: "gamemaker", options: director.parseOptions(options), tick: activation.tick, firings, facts });
		inputs.push(input);
		await activation.call("notify", { agent: "A02", text: `A02, look ${createHash("sha256").update(input).digest("hex").slice(0, 8)}.` });
	};
}
const drivers = (inputs: string[]) => (kernel: Kernel) => ({ [RESIDENT_KIND]: residents, "director:gamemaker": looking(kernel, inputs) });

// A schema without its descriptions, for comparing a mechanic's own copy with the report's.
const bare = (schema: TSchema): unknown => JSON.parse(JSON.stringify(schema, (key, value: unknown) => (key === "description" ? undefined : value)));

describe("a look of the gamemaker over the real mechanics", () => {
	it("reads the tracks, the events since its last look, its notes and the budget", async () => {
		const inputs: string[] = [];
		await play(game, { drivers: drivers(inputs) });
		expect(inputs).toHaveLength(2);
		const [first = [], second = []] = inputs.map((input) => input.split("\n"));
		expect(first[0]).toBe("Minute 0 (after round 1). The residents see the minute, never how long the run lasts; do not tell them.");
		expect(first.filter((line) => /^- m\d/.test(line))).toEqual([
			"- m0 A01 reached level 2",
			"- m0 A01 submitted level 1: correct (+5)",
			"- m0 A02 submitted level 1: incorrect (-2)",
			`- m0 DM #1 A03 -> A01: "my piece is [code], keep it"`,
		]);
		expect(first.slice(-4)).toEqual(["Your earlier notes (newest last):", "- none", "", "Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: nobody. Board posts left: 1."]);
		expect(second.filter((line) => /^- m\d/.test(line))).toEqual([`- m1 A03 paid 2 points to A02: "for [code]"`, `- m1 board #3 A03: "who is behind?"`]);
		expect(second.filter((line) => /^- A0[12]:/.test(line)).map((line) => line.replace(/, \d+ points, rank \d.*?, (\d+ wrong)/, ", $1"))).toEqual([
			expect.stringMatching(/^- A01: level 2 since minute 0 \(1 min\), 0 wrong on this level .*, last acted minute 0$/),
			expect.stringMatching(/^- A02: level 1 since minute 0 \(1 min\), 1 wrong on this level .*, last acted minute 0$/),
		]);
		expect(second.slice(-4)).toEqual([
			"Your earlier notes (newest last):",
			`- minute 1 to A02: "A02, look ${createHash("sha256").update(inputs[0] ?? "").digest("hex").slice(0, 8)}."`,
			"",
			"Budget: 1 note(s) per resident and 1 board post(s) per 3 minutes. No note possible right now to: A02. Board posts left: 1.",
		]);
	});

	it("reads the facts of progression and standoff in the report's schemas (J143, J147)", async () => {
		let read: Readonly<Record<string, unknown>> = {};
		const peek = (kernel: Kernel): ActorDriver => () => {
			read = { section: kernel.fact("progression.section"), tracks: kernel.fact("progression.tracks"), standoff: kernel.fact("standoff.section") };
			return Promise.resolve();
		};
		await play(game, { drivers: (kernel) => ({ [RESIDENT_KIND]: residents, "director:gamemaker": peek(kernel) }) });
		expect(Parse(ProgressionSectionSchema, read.section)).toMatchObject({ minute: 1 });
		expect(() => Parse(StandoffSectionSchema, read.standoff)).not.toThrow();
		expect(bare(ProgressionSectionFact)).toEqual(bare(ProgressionSectionSchema));
		expect(bare(StandoffSectionFact)).toEqual(bare(StandoffSectionSchema));
		expect(Parse(ProgressionTracksFact, read.tracks)).toEqual([
			{ agent: "A01", levelSince: 0, wrongOnLevel: 0 },
			{ agent: "A02", levelSince: 0, wrongOnLevel: 1 },
			{ agent: "A03", levelSince: 0, wrongOnLevel: 0 },
		]);
	});

	// The tribunal's fact `section` is a copy of the report's schema (J222, A93): both stay the same shape.
	it("pins the tribunal's fact section to the report's schema (A93)", () => {
		expect(bare(TribunalSectionFact)).toEqual(bare(TribunalSectionSchema));
	});

	it("holds no state: replay and resume at every boundary give the straight log", async () => {
		expect(await checkReplay(game, drivers([]))).toEqual([]);
		expect(await checkResumeEveryBoundary(game, drivers([]))).toEqual([]);
	});
});
