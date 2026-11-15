// SPDX-License-Identifier: Apache-2.0
/**
 * The games list is whole (M4 specification 4.3): every folder under `games/` with a `game.ts` has its line in
 * `games/index.ts`, every line names a game file that exists, a seed and a fake seed, and the game has its
 * in-process standing checks (`games/<name>/test/standing.test.ts`). The command-line standing checks run over the
 * list (`apps/cli/test/standing.test.ts`), so a game that is not on it would be played by no standing check.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMES, type GameEntry } from "../../games/index.ts";
import { REPO_ROOT } from "../lib/files.ts";

/** What is wrong with a games list against the folders under `games/` of a root; empty when the list is whole. */
function gamesListOffences(list: readonly GameEntry[], root: string = REPO_ROOT): readonly string[] {
	const folders = readdirSync(join(root, "games"), { withFileTypes: true }).filter((entry) => entry.isDirectory() && existsSync(join(root, "games", entry.name, "game.ts")));
	const listed = new Set(list.map((entry) => entry.name));
	const offences = folders.filter((folder) => !listed.has(folder.name)).map((folder) => `games/${folder.name}: has a game.ts and no line in games/index.ts`);
	if (list.length === 0) offences.push("games/index.ts: the list is empty");
	if (listed.size < list.length) offences.push("games/index.ts: a game is listed twice");
	for (const entry of list) {
		if (entry.file !== `games/${entry.name}/game.ts` || !existsSync(join(root, entry.file))) offences.push(`games/index.ts: ${entry.name}: the game file ${entry.file} is not the game.ts of its folder, or is missing`);
		if (entry.seeds.length === 0 || entry.fakeSeeds.length === 0) offences.push(`games/index.ts: ${entry.name}: needs a seed and a fake seed`);
		if (!existsSync(join(root, "games", entry.name, "test", "standing.test.ts"))) offences.push(`games/${entry.name}: no test/standing.test.ts with the in-process standing checks`);
	}
	return offences;
}

function fixture(files: readonly string[]): string {
	const root = mkdtempSync(join(tmpdir(), "swt-games-list-"));
	for (const path of ["games/a/game.ts", "games/a/test/standing.test.ts", ...files]) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), "");
	}
	return root;
}

const A: GameEntry = { name: "a", file: "games/a/game.ts", seeds: [1], fakeSeeds: [7] };

describe("the games list", () => {
	it("holds in this repository, with the five games that were played before M4", () => {
		expect(gamesListOffences(GAMES)).toEqual([]);
		expect(GAMES.map((entry) => entry.name)).toEqual(expect.arrayContaining(["hello", "tictactoe-teams", "quarry", "econ-lab", "city-slice"]));
	});

	it("accepts a whole list; a folder without a game.ts needs no line", () => {
		expect(gamesListOffences([A], fixture(["games/stub/README.md"]))).toEqual([]);
	});

	it("rejects a game folder that is not on the list, and an empty list", () => {
		expect(gamesListOffences([A], fixture(["games/b/game.ts"]))).toEqual(["games/b: has a game.ts and no line in games/index.ts"]);
		expect(gamesListOffences([], fixture([]))).toEqual(["games/a: has a game.ts and no line in games/index.ts", "games/index.ts: the list is empty"]);
	});

	it("rejects a line twice, a missing or foreign game file, a line without seeds, and a game without standing checks", () => {
		expect(gamesListOffences([A, A], fixture([]))).toEqual(["games/index.ts: a game is listed twice"]);
		const b = { ...A, name: "b" };
		expect(gamesListOffences([A, b], fixture([]))).toEqual(["games/index.ts: b: the game file games/a/game.ts is not the game.ts of its folder, or is missing", "games/b: no test/standing.test.ts with the in-process standing checks"]);
		expect(gamesListOffences([{ ...A, fakeSeeds: [] }], fixture([]))).toEqual(["games/index.ts: a: needs a seed and a fake seed"]);
		expect(gamesListOffences([{ ...b, file: "games/b/game.ts" }, A], fixture(["games/b/game.ts"]))).toEqual(["games/b: no test/standing.test.ts with the in-process standing checks"]);
	});
});
