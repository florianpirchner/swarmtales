// SPDX-License-Identifier: Apache-2.0
import { GameDefinitionSchema } from "@swarmtales/contracts";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { defineGame, gameData } from "../src/game/define-game.ts";
import type { MechanicDefinition, PluginHead } from "../src/mechanic/types.ts";

/** A stand-in for what `defineMechanic` (issue 26) returns: `gameData` reads the id of a use's definition only. */
function standIn(id: string): MechanicDefinition {
	const options = Type.Object({}, { description: "No options" });
	const head: PluginHead = { id, package: `@example/${id}`, summary: id, options, state: undefined, version: 1, events: {}, audiences: {}, prompts: {}, requires: [], provides: [], uses: [], tools: [], metrics: [] };
	const plugin = { id, package: head.package, requires: [], provides: [], events: {}, audiences: {}, options: null };
	const definition: MechanicDefinition = Object.assign((given?: object) => ({ mechanic: definition, options: given }), {
		id,
		package: head.package,
		source: `${head.package}/${id}`,
		options,
		events: {},
		head,
		parseOptions: (raw: unknown) => raw,
		resolve: (_options: unknown, _texts: unknown, version: string) => ({
			...plugin,
			version,
			create: () => {
				throw new TypeError("the stand-in is never loaded");
			},
		}),
	});
	return definition;
}

const board = standIn("board");
const chat = standIn("chat");

describe("defineGame", () => {
	it("returns the game it was given", () => {
		const game = { id: "duel", residents: 2, mechanics: [board()], end: { ticks: 3 } };
		expect(defineGame(game)).toBe(game);
	});
});

describe("gameData", () => {
	it("names the mechanics by id, keeps options and renames, and sets schema 1", () => {
		const game = defineGame({
			id: "duel",
			title: "Duel",
			residents: ["ann", "bob"],
			mechanics: [board({ size: 3 }), { ...chat(), as: { post: "say" } }],
			grants: { resident: ["post", "move"], watcher: { drop: ["move"] }, judge: { add: ["post"] } },
			locked: ["move"],
			end: { ticks: 3 },
			win: { fact: "board.winner" },
		});
		const { data, mechanics } = gameData(game);
		expect(data).toEqual({
			schema: 1,
			id: "duel",
			title: "Duel",
			residents: ["ann", "bob"],
			mechanics: [{ use: "board", options: { size: 3 } }, { use: "chat", as: { post: "say" } }],
			grants: { resident: ["post", "move"], watcher: { drop: ["move"] }, judge: { add: ["post"] } },
			locked: ["move"],
			end: { ticks: 3 },
			win: { fact: "board.winner" },
		});
		expect(Value.Check(GameDefinitionSchema, data)).toBe(true);
		expect(mechanics).toEqual({ board, chat });
	});

	it("leaves out what the game left out, so the data form has no undefined value", () => {
		const { data } = gameData({ id: "bare", residents: 1, mechanics: [board()], end: { ticks: 1 } });
		expect(data).toStrictEqual({ id: "bare", residents: 1, schema: 1, mechanics: [{ use: "board" }], end: { ticks: 1 } });
	});

	it("keeps both uses of a doubled mechanic in the data, and the first definition under the id", () => {
		const twin = standIn("board");
		const { data, mechanics } = gameData({ id: "twice", residents: 1, mechanics: [board(), twin()], end: { ticks: 1 } });
		expect(data.mechanics).toEqual([{ use: "board" }, { use: "board" }]);
		expect(mechanics.board).toBe(board);
	});
});
