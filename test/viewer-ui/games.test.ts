/** The Games tab's data: parsing and the game of a story name (variants and earlier names). */
import { describe, expect, it } from "vitest";
import { gameOfStory, parseGames, type GameInfo } from "../../packages/viewer-ui/src/games.ts";
import { readmeParts } from "../../scripts/viewer-games.ts";

const game = (id: string, aliases?: readonly string[]): GameInfo => ({ id, title: id, summary: "", readme: "", variants: [id], ...(aliases === undefined ? {} : { aliases: [...aliases] }), mechanics: [], tools: [] });

describe("games", () => {
	it("finds the game of a variant, the longest id first, and of an earlier name", () => {
		const games = [game("morris"), game("morris-teams"), game("cityofkeys", ["nexus"])];
		expect(gameOfStory(games, "morris-teams-nobrain-solo")?.id).toBe("morris-teams");
		expect(gameOfStory(games, "morris")?.id).toBe("morris");
		expect(gameOfStory(games, "nexus")?.id).toBe("cityofkeys");
		expect(gameOfStory(games, "chess")).toBeUndefined();
	});

	it("drops bad entries", () => {
		expect(parseGames([game("chess"), { id: "x" }, 3])).toHaveLength(1);
		expect(parseGames("nope")).toEqual([]);
	});

	it("reads a README's title and first paragraph, skipping a full-description pointer", () => {
		const readme = "# Whispers\n\n**Full description:** [docs](x.md)\n\nSix residents,\none whisperer.\n\nMore.";
		expect(readmeParts(readme, "whispers")).toEqual({ title: "Whispers", summary: "Six residents, one whisperer." });
		expect(readmeParts("No title here.", "x")).toEqual({ title: "x", summary: "No title here." });
	});
});
