// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The catalogue `GAMES.md` (M4 specification, issue 62): the gate of `pnpm docs:games --check`, so a stale overview,
 * count or ported mark fails the check, and the generator's refusals on small texts.
 */
import { describe, expect, it } from "vitest";
import { GAMES } from "../../games/index.ts";
import { readText, REPO_ROOT } from "../lib/files.ts";
import { CARDS, FAMILIES } from "./catalogue.ts";
import { BLOCKS, CARD_LINES, catalogueProblems, gameBlocks, withBlocks } from "./docs.ts";
import { headOf, loadHeads, type GameHead } from "./head.ts";

const heads = await loadHeads(REPO_ROOT, GAMES);
const markers = BLOCKS.map((name) => `<!-- generated:${name} -->\n<!-- /generated:${name} -->`).join("\n\n");
const HELLO: GameHead = { folder: "hello", residents: 2, mechanics: ["grid"], directors: [], params: undefined };

/** A small catalogue of the Hello Game alone, with current blocks. */
function tiny(card = "## Hello Game\n\nTwo residents.\n\n- Links: [folder](games/hello/).\n"): string {
	return withBlocks(`# Games\n\n${markers}\n\n${card}`, gameBlocks(REPO_ROOT, [HELLO]));
}

describe("GAMES.md", () => {
	it("is current: every block written from the games list and the game files, every game with its card", () => {
		expect(heads.length).toBe(GAMES.length);
		expect(catalogueProblems(REPO_ROOT, readText("GAMES.md"), heads)).toEqual([]);
	});

	it("has a card for each of the thirteen ported tabletop games, beside the Hello Game and the city slice", () => {
		const running = new Set(GAMES.map((entry) => entry.name));
		const ported = FAMILIES.flatMap((entry) => entry.games).filter((game) => running.has(game.folder));
		expect(ported.length).toBeGreaterThanOrEqual(13);
		const text = readText("GAMES.md");
		for (const entry of GAMES) expect(text).toContain(`\n## ${CARDS[entry.name]?.title ?? entry.name}\n`);
	});

	it("reads the head of a game and of a family built with its defaults", () => {
		const hello = heads.find((head) => head.folder === "hello");
		expect(hello).toEqual(HELLO);
		expect(heads.find((head) => head.folder === "city-slice")?.directors).toEqual(["warden"]);
		const chess = heads.find((head) => head.folder === "chess");
		expect(chess?.residents).toBe(2);
		expect(chess?.params?.slice(0, 2)).toEqual(["games", "maxPlies"]);
		const family = { params: { type: "object", properties: { size: { default: 3 } } }, build: ({ size }: { size: number }) => ({ id: "g", residents: size, mechanics: [{ mechanic: { id: "m" } }] }) };
		expect(headOf("g", family)).toEqual({ folder: "g", residents: 3, mechanics: ["m"], directors: [], params: ["size"] });
		expect(() => headOf("g", { id: "g" })).toThrow("games/g/game.ts exports no game");
		expect(() => headOf("g", { id: "g", residents: 1, mechanics: [{ mechanic: {} }] })).toThrow("without an id");
	});

	it("accepts a current catalogue and refuses a stale block, a missing marker and an empty list", () => {
		expect(catalogueProblems(REPO_ROOT, tiny(), [HELLO])).toEqual([]);
		const stale = tiny().replace("| 2 |", "| 3 |");
		expect(catalogueProblems(REPO_ROOT, stale, [HELLO])).toEqual(["GAMES.md: a generated block is stale; run `pnpm docs:games`"]);
		expect(withBlocks(stale, gameBlocks(REPO_ROOT, [HELLO]))).toBe(tiny());
		expect(catalogueProblems(REPO_ROOT, tiny().replace("<!-- /generated:families -->", ""), [HELLO])).toEqual(['GAMES.md: no generated block "families" (markers <!-- generated:families --> ... <!-- /generated:families -->)']);
		expect(catalogueProblems(REPO_ROOT, tiny(), [])).toEqual(["games/index.ts: no game on the list, so the catalogue has nothing to show"]);
	});

	it("refuses a game without a card or without facts, a foreign card, a card without its links, a long card", () => {
		expect(catalogueProblems(REPO_ROOT, tiny(""), [HELLO])).toEqual(['GAMES.md: no card "## Hello Game" for games/hello']);
		expect(catalogueProblems(REPO_ROOT, tiny("## Hello Game\n\nNo links.\n"), [HELLO])).toEqual(['GAMES.md: the card "Hello Game" has no link to games/hello/']);
		expect(catalogueProblems(REPO_ROOT, tiny(`## Hello Game\n\n- [folder](games/hello/)\n\n## Gone\n\nA game that left.\n`), [HELLO])).toEqual(['GAMES.md: the card "Gone" is no game of games/index.ts']);
		expect(catalogueProblems(REPO_ROOT, tiny(`## Hello Game\n\n- [folder](games/hello/)\n${"line\n".repeat(CARD_LINES)}`), [HELLO])).toEqual([`GAMES.md: the card "Hello Game" has more than ${CARD_LINES} lines`]);
		const stranger: GameHead = { ...HELLO, folder: "stranger" };
		expect(catalogueProblems(REPO_ROOT, tiny(), [HELLO, stranger])).toContain("scripts/game-docs/catalogue.ts: no card facts for games/stranger");
		const quarry: GameHead = { ...HELLO, folder: "quarry" };
		expect(catalogueProblems(REPO_ROOT, tiny("## Hello Game\n\n- [folder](games/hello/)\n\n## Quarry\n\n- [folder](games/quarry/)\n"), [HELLO, quarry])).toEqual(['GAMES.md: the card "Quarry" has no link to oracles/quarry/']);
	});
});
