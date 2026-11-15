// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The Games tab's data: parsing and the game of a run's name (variants and earlier names). */
import { describe, expect, it } from "vitest";
import { gameOfRun, parseGames, type GameInfo } from "../src/games.ts";

const game = (id: string, aliases?: readonly string[]): GameInfo => ({ id, title: id, summary: "", readme: "", variants: [id], ...(aliases === undefined ? {} : { aliases: [...aliases] }), mechanics: [], tools: [] });

describe("games", () => {
	it("finds the game of a variant, the longest id first, and of an earlier name", () => {
		const games = [game("morris"), game("morris-teams"), game("cityofkeys", ["nexus"])];
		expect(gameOfRun(games, "morris-teams-nobrain-solo")?.id).toBe("morris-teams");
		expect(gameOfRun(games, "morris")?.id).toBe("morris");
		expect(gameOfRun(games, "nexus")?.id).toBe("cityofkeys");
		expect(gameOfRun(games, "chess")).toBeUndefined();
	});

	it("drops bad entries", () => {
		expect(parseGames([game("chess"), { id: "x" }, 3])).toHaveLength(1);
		expect(parseGames("nope")).toEqual([]);
	});
});
