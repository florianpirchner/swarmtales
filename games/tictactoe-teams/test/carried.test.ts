// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the game (M1 specification 8): the sha256 of the briefings of nine variants, generated
 * on the old platform (`tictactoeEntry(options).briefing` for every resident of the roster, as the JSON of the
 * record resident to text), and the tool names a resident is shown, in their order.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { tictactoeGame, type TicTacToeOptions } from "../game.ts";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const OLD_BRIEFINGS: readonly (readonly [string, TicTacToeOptions, string])[] = [
	["default", {}, "d6991dfd1041d412edff130a3c9e64a03ced4249a10d1cd77542c6bf967353ce"],
	["nobrain", { brain: false }, "94740c9bba1a3f2778e21b9ed1051acc2cc58ed5e70385b24c1d4175c751eb77"],
	["solo", { teamSize: 1 }, "9668f083575d1692d9020bc9e559b7cf37a2e12a6b84de1cf72a90756c6db83c"],
	["4x4", { size: 4, line: 4 }, "262631e11603681f8700e5d9dae6ba01de9b2938918694c54992c077314bfc18"],
	["5x5-nobrain-solo", { size: 5, line: 4, brain: false, teamSize: 1 }, "0fc2e4131e909d5cf15bf881f4ee2c4009c4a35647532c5a3dd35e173395976b"],
	["brain-o", { brainTeams: ["O"] }, "adfa71fa7267de22aaa721555549fff37a9ce8235f2143a5fea5b6d83c2f2efe"],
	["solo-o", { soloSide: "O" }, "5202f8ce87aa4b0b103c8dee884129bd196c7090e4c99546322f51087e8a4695"],
	["solo-x-5x5", { soloSide: "X", size: 5, line: 4 }, "7254c20b86d36706f5869546a7d4f0b1f07dfb6eea6847c4c0074d498b8d2d2f"],
	["fixed-captain", { fixedCaptain: true }, "80e0c34423eadcf0f1b017475bd293331301bfe8cbb6d13b1818fd249d3d610b"],
];

describe("carried byte for byte", () => {
	it.each(OLD_BRIEFINGS)("has the briefings of the old platform: %s", (_name, options, hash) => {
		const game = tictactoeGame(options);
		expect(Object.keys(game.briefing ?? {})).toEqual(game.residents);
		expect(sha256(JSON.stringify(game.briefing))).toBe(hash);
	});

	it("shows a resident the tools of the old game, in its order", () => {
		expect(tictactoeGame().grants?.resident).toEqual(["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove", "readBrain", "writeBrain"]);
		expect(tictactoeGame({ brain: false }).grants?.resident).toEqual(["viewBoard", "proposeMove", "castVote", "postTeam", "readTeam", "playMove"]);
		expect([tictactoeGame().locked, tictactoeGame({ brain: false }).locked]).toEqual([["playMove", "writeBrain"], ["playMove"]]);
	});
});
