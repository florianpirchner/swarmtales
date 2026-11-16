// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (M4 specification 2.2, rules 5, 8 and 9): the sha256 of the briefings of both
 * arms, generated on the old platform (`lanternsEntry(options).briefing` for every resident of the roster, as the JSON
 * of the record resident to text); the tool names a resident is shown, in their order; the output cap of the old
 * entry; and the variant names of the old parser (`lanterns[-nobrain][-g<games>][-c<clues>]`) against the options
 * that give them, with the setup the old platform wrote for them.
 */
import { createHash } from "node:crypto";
import { join } from "node:path";
import { readOracle } from "@swarmtales/testkit";
import { describe, expect, it } from "vitest";
import { lanternsGame, type LanternsOptions } from "../game.ts";
import { RENAMED } from "./support.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const ORACLES = join(import.meta.dirname, "..", "..", "..", "oracles", "lanterns");
const TEAMS = { amber: ["A01", "A02", "A03"], teal: ["A04", "A05", "A06"] };

const OLD_BRIEFINGS: readonly (readonly [string, LanternsOptions, string])[] = [
	["default", {}, "ad7b0be73d20c2c0bec82509ebcb0749bf41e8127c4109b31a11a31aafe00614"],
	["nobrain", { brain: false }, "3c05e7043950bef4d3615d02868e9e1078f1a1369a150864f367b6533faee814"],
];

/**
 * The variant names of the old parser that an oracle file or an old runs index uses, and the one of the old game
 * test, each with the options that give it, the run length and the options of the clue grid the old entry set.
 */
const NAMES: readonly (readonly [string, LanternsOptions, number, Readonly<Record<string, unknown>>])[] = [
	["lanterns", {}, 259, { games: 4, maxClues: 5, deadline: 2, teams: TEAMS }],
	["lanterns-nobrain", { brain: false }, 259, { games: 4, maxClues: 5, deadline: 2, teams: TEAMS }],
	["lanterns-g1", { games: 1 }, 70, { games: 1, maxClues: 5, deadline: 2, teams: TEAMS }],
	["lanterns-nobrain-g2-c6", { brain: false, games: 2, maxClues: 6 }, 157, { games: 2, maxClues: 6, deadline: 2, teams: TEAMS }],
];

/** The oracle file whose setup the old platform wrote for a variant name. */
const FILE_OF: Readonly<Record<string, string>> = { lanterns: "lanterns-s73.json", "lanterns-nobrain": "lanterns-nobrain-s67.json", "lanterns-g1": "lanterns-g1-s13-silent.json" };

// The id of a mechanic on this platform, from the id the file holds (M6-06).
const renamedId = (id: string): string => Object.entries(RENAMED).find(([old]) => old === id)?.[1] ?? id;

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: %s", (_name, options, hash) => {
		const game = lanternsGame(options);
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(hash);
	});

	it("shows a resident the tools of the old game, in its order, and locks the same ones", () => {
		expect(lanternsGame().grants?.resident).toEqual(["viewGrid", "giveClue", "guess", "endGuesses", "postTeam", "readTeam", "readBrain", "writeBrain"]);
		expect(lanternsGame({ brain: false }).grants?.resident).toEqual(["viewGrid", "giveClue", "guess", "endGuesses", "postTeam", "readTeam"]);
		expect([lanternsGame().locked, lanternsGame({ brain: false }).locked]).toEqual([["giveClue", "guess", "endGuesses", "writeBrain"], ["giveClue", "guess", "endGuesses"]]);
	});

	it("keeps the output cap of the old entry (P94), the old seed and one id for every variant", () => {
		expect(lanternsGame().model).toEqual({ id: "anthropic/claude-haiku-5-5", maxOutputTokens: 16000 });
		expect([lanternsGame().seed, lanternsGame({ brain: false, games: 2 }).id]).toEqual([31, "lanterns"]);
	});

	it.each(NAMES)("%s: the options give the run length and the mechanic options of the old entry", (name, options, ticks, grid) => {
		const game = lanternsGame(options);
		expect(game.end).toEqual({ ticks });
		expect(game.mechanics.map((use) => use.mechanic.id)).toEqual(["lanterns", "team-channel", "strategy-brain"]);
		expect(game.mechanics[0].options).toEqual(grid);
		expect(Reflect.get(Object(game.mechanics[2].options), "enabled")).toBe(!name.includes("-nobrain"));
	});

	it.each(Object.entries(FILE_OF))("%s: the options give the setup the old platform recorded", (name, file) => {
		const setup = readOracle(join(ORACLES, file)).setup;
		const game = lanternsGame(NAMES.find(([entry]) => entry === name)?.[1]);
		expect(game.mechanics.map((use) => ({ id: use.mechanic.id, options: use.options }))).toEqual(setup.mechanics.map((use) => ({ ...use, id: renamedId(use.id) })));
		expect([game.end, game.grants?.resident, game.locked, game.limits]).toEqual([{ ticks: setup.minutes }, setup.residentTools, setup.locked, { maxCallsPerTick: 12 }]);
	});
});
