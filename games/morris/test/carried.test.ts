// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the briefings of nine
 * variants, generated on the old platform (`briefing(...)` of `stories/morris-teams/story.ts` for every resident of
 * the roster, as the JSON of the record resident to text), the tool names a resident is shown, the model block with
 * its output cap, the run length, and the old variant names against the options that give them. The prompt files are
 * the mechanics' and are pinned by their own `carried.test.ts`.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { morrisGame, ticksFor, type MorrisOptions } from "../game.ts";
import { VARIANTS } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const OLD_BRIEFINGS: readonly (readonly [string, MorrisOptions, string])[] = [
	["default", {}, "304116e6fe40106955817e6e3b8c125c8c8950afc09459c258aa515d085c5bcb"],
	["nobrain", { brain: false }, "560018d6423f61a554770cb87dc381d7b5983f7b8201d9431e934aa5e6ffb151"],
	["solo", { teamSize: 1 }, "ea2c2f5bb63d89e903d27da949818a8f1923edb50a9719201f49b13fd18167c7"],
	["nobrain-solo", { brain: false, teamSize: 1 }, "3791eef9da7081387876864dbcbafad46e0b484b784f58b5ef97500f9def799c"],
	["solo-vs-engine3", { teamSize: 1, engineDepth: 3 }, "9613f6df266e4b7034803b8576547faa2f535d00145b50d3302fd1db336ac44b"],
	["nobrain-solo-vs-engine3", { brain: false, teamSize: 1, engineDepth: 3 }, "0ebfb11004ab58575805ed05d7194a029c4ee76e2d84cad827697ba5dcc0a578"],
	["vs-engine3", { engineDepth: 3 }, "83cfe6afa2e16598eca890d7e689640bfd6af2b4faaffd7df316a049e349a6f7"],
	["fc", { fixedCaptain: true }, "cdd1c7b4770ce1a694ff1f74aa7780e21eba73e7fe6ea2e6549347f5ea881a85"],
	["t60-solo", { maxTurns: 60, teamSize: 1 }, "7f29cdb732062b4cee349279f9cf01469cb0a5eac999f2a87ed9ef79bfc19e42"],
];

/** The old parser (`parseMorris` of `stories/index.ts`), carried as the reference of the names. */
const NAME = /^morris-teams(-nobrain)?(?:-g(\d+))?(?:-r(\d+))?(?:-t(\d+))?(-solo)?(-fc)?(?:-vs-engine(\d))?$/;
const numberOf = (part: string | undefined): number | undefined => (part === undefined ? undefined : Number(part));
const outOf = (value: number | undefined, least: number, most: number): boolean => value !== undefined && (value < least || value > most);
/** The part of the options that is present only when `value` is. */
const when = <V, T extends object>(value: V | undefined, part: (value: V) => T): T | object => (value === undefined ? {} : part(value));
/** The options the old parser gave a name, or undefined for a name it refused. */
function oldOptions(id: string): MorrisOptions | undefined {
	const match = NAME.exec(id);
	if (match === null) return undefined;
	const [games, maxRounds, maxTurns, engineDepth] = [2, 3, 4, 7].map((index) => numberOf(match[index]));
	if (outOf(games, 1, 20) || outOf(maxRounds, 1, 20) || outOf(maxTurns, 10, 400) || outOf(engineDepth, 1, 6)) return undefined;
	const flags = { ...when(match[1], () => ({ brain: false })), ...when(match[5], () => ({ teamSize: 1 as const })), ...when(match[6], () => ({ fixedCaptain: true })) };
	return { ...flags, ...when(games, (games) => ({ games })), ...when(maxRounds, (maxRounds) => ({ maxRounds })), ...when(maxTurns, (maxTurns) => ({ maxTurns })), ...when(engineDepth, (engineDepth) => ({ engineDepth })) };
}

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: %s", (_name, options, hash) => {
		const game = morrisGame(options);
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(hash);
	});

	it("shows a resident the tools of the old game, in its order, and locks the move and the brain", () => {
		expect(morrisGame().grants?.resident).toEqual(["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", "readBrain", "writeBrain"]);
		expect(morrisGame({ brain: false }).grants?.resident).toEqual(["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove"]);
		expect([morrisGame().locked, morrisGame({ brain: false }).locked]).toEqual([["playMove", "writeBrain"], ["playMove"]]);
	});

	it("carries the model block of the old entry with its output cap of 16000 tokens (P94), and its title", () => {
		for (const options of Object.values(VARIANTS)) expect(morrisGame(options).model).toEqual({ id: "anthropic/claude-haiku-5-5", maxOutputTokens: 16000 });
		expect([morrisGame().title, morrisGame({ teamSize: 1 }).title, morrisGame({ engineDepth: 3 }).title]).toEqual(["Nine men's morris teams", "Nine men's morris solo", "Nine men's morris teams against the engine"]);
	});

	it("gives every old variant name of an oracle file by the options of its row, under the one id", () => {
		for (const [name, options] of Object.entries(VARIANTS)) expect(options, name).toEqual(oldOptions(name));
		expect(["morris-teams-t5", "morris-teams-vs-engine9", "morris-teams-g0"].map(oldOptions)).toEqual([undefined, undefined, undefined]);
		for (const options of Object.values(VARIANTS)) expect(morrisGame(options).id).toBe("morris");
	});

	it("has the old registry default as its defaults, and the old minutes of the files as its run length", () => {
		expect(morrisGame()).toMatchObject({ seed: 13, residents: ["A01", "A02", "A03", "A04", "A05", "A06"], end: { ticks: 494 }, limits: { maxCallsPerTick: 12 }, win: { fact: "morris.tally" } });
		expect([morrisGame({ teamSize: 1 }).residents, morrisGame({ engineDepth: 3 }).residents, morrisGame({ teamSize: 1, engineDepth: 3 }).residents]).toEqual([["A01", "A04"], ["A01", "A02", "A03"], ["A01"]]);
		expect([ticksFor(3, 120), ticksFor(2, 40), morrisGame({ ticks: 9 }).end]).toEqual([494, 124, { ticks: 9 }]);
	});
});
