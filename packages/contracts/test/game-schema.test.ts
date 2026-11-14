// SPDX-License-Identifier: Apache-2.0
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { GameDefinitionSchema, ResidentIdSchema, type GameData, type PromptLookup } from "../src/game/index.ts";
import { missingDescriptions } from "./descriptions.ts";

/** The data form of the Hello Game (sample 1): two residents, one mechanic. */
const hello = {
	schema: 1,
	id: "hello-game",
	title: "Hello Game",
	residents: ["ada", "bob"],
	mechanics: [{ use: "grid-game", options: { sides: { X: ["ada"], O: ["bob"] }, games: 1 } }],
	end: { ticks: 12 },
	model: "anthropic/haiku",
} as const;

/** The data form of tic-tac-toe teams with a brain (section 8.2 of the M1 specification). */
const tictactoe = {
	schema: 1,
	id: "tictactoe-teams",
	title: "Tic-tac-toe teams",
	seed: 7,
	residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
	mechanics: [
		{ use: "grid-game", options: { size: 3, line: 3, games: 3 } },
		{ use: "consensus", options: {} },
		{ use: "team-channel" },
		{ use: "strategy-brain", options: { enabled: true } },
		{ use: "optimal-referee", options: {} },
	],
	grants: { resident: ["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", "readBrain", "writeBrain"] },
	locked: ["playMove", "writeBrain"],
	scheduler: {
		id: "turns",
		options: { passes: 5, activation: "onNews", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "grid-game" }, { source: "team-channel" }, { source: "consensus" }] },
	},
	limits: { maxCallsPerTick: 8 },
	end: { ticks: 35 },
	win: { fact: "grid-game.tally" },
	briefing: { A01: "You play X.", A04: "You play O." },
	model: "anthropic/haiku",
} as const;

const ok = (value: unknown): boolean => Value.Check(GameDefinitionSchema, value);

describe("GameDefinitionSchema", () => {
	it("accepts the data forms of the Hello Game and of tic-tac-toe teams", () => {
		expect(Value.Errors(GameDefinitionSchema, hello)).toEqual([]);
		expect(Value.Errors(GameDefinitionSchema, tictactoe)).toEqual([]);
	});

	it("accepts every optional form: a resident count, teams, roles, a grant tweak, `as`, one briefing, no directors", () => {
		const game: GameData = {
			schema: 1,
			id: "g",
			residents: 6,
			teams: { red: ["A01"] },
			roles: { captain: ["A01"] },
			mechanics: [{ use: "grid-game", as: { playMove: "place" } }],
			directors: [],
			grants: { resident: { drop: ["viewBoard"], add: ["place"] } },
			end: { ticks: 1 },
			briefing: "Play.",
		};
		expect(Value.Errors(GameDefinitionSchema, game)).toEqual([]);
	});

	it("refuses an unknown field, schema 2 and a non-empty `directors`", () => {
		expect(ok({ ...hello, kind: "game" })).toBe(false);
		expect(ok({ ...hello, schema: 2 })).toBe(false);
		expect(ok({ ...hello, directors: [{ id: "gamemaker" }] })).toBe(false);
	});

	it("refuses a missing end, a malformed id, an empty resident list and a malformed resident id", () => {
		expect(ok({ ...hello, end: undefined })).toBe(false);
		expect(ok({ schema: 1, id: "hello-game", residents: 2, mechanics: [] })).toBe(false);
		expect(ok({ ...hello, id: "Hello Game" })).toBe(false);
		expect(ok({ ...hello, residents: [] })).toBe(false);
		expect(ok({ ...hello, residents: 0 })).toBe(false);
		expect(ok({ ...hello, residents: ["ada", "bob smith"] })).toBe(false);
		expect(ok({ ...hello, end: { ticks: 0 } })).toBe(false);
	});

	it("refuses an unknown field at every level, and leaves the options open", () => {
		const base = { schema: 1, id: "g", residents: 2, mechanics: [], end: { ticks: 1 } };
		expect(ok(base)).toBe(true);
		expect(ok({ ...base, end: { ticks: 1, on: "x" } })).toBe(false);
		expect(ok({ ...base, mechanics: [{ use: "grid-game", option: {} }] })).toBe(false);
		expect(ok({ ...base, scheduler: { id: "turns", passes: 5 } })).toBe(false);
		expect(ok({ ...base, limits: { maxCallsPerTic: 8 } })).toBe(false);
		expect(ok({ ...base, win: { fact: "a.b", score: 1 } })).toBe(false);
		expect(ok({ ...base, grants: { resident: { drop: [], remove: [] } } })).toBe(false);
		expect(ok({ ...base, briefing: { "bob smith": "x" } })).toBe(false);
		expect(ok({ ...base, briefing: { A01: "x" } })).toBe(true);
		expect(ok({ ...base, mechanics: [{ use: "grid-game", options: { any: { thing: 1 } } }], scheduler: { id: "turns", options: { any: "thing" } } })).toBe(true);
	});

	it("exports the resident id schema", () => {
		expect(Value.Check(ResidentIdSchema, "A01")).toBe(true);
		expect(Value.Check(ResidentIdSchema, "resident:A01")).toBe(false);
	});

	it("describes every part", () => {
		expect(missingDescriptions(GameDefinitionSchema, "GameDefinitionSchema")).toEqual([]);
	});
});

describe("PromptLookup", () => {
	it("is implemented by an object with `render(owner, id, variables, declared)`", () => {
		const lookup: PromptLookup = { render: (owner, id, variables, declared) => `${owner}/${id}:${declared.map((name) => variables[name]).join(",")}` };
		expect(lookup.render("grid-game", "tools/playMove", { size: 3 }, ["size"])).toBe("grid-game/tools/playMove:3");
	});
});
