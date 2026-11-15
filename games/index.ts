// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The games list: one line per game that is played on this platform. The standing checks of a game (replay, resume
 * from every boundary, the fake run) are run over this list, and a gate fails when a folder under `games/` with a
 * `game.ts` is not on it. A game issue adds its line with the game.
 */

/** One game of the list. */
export interface GameEntry {
	/** The folder name under `games/`. */
	readonly name: string;
	/** The game file, as a path from the repository root. */
	readonly file: string;
	/** The seeds of the scripted standing checks. */
	readonly seeds: readonly number[];
	/** The seeds of the fake runs (`swt run --fake --seed`). */
	readonly fakeSeeds: readonly number[];
}

/** The games, in the order they were ported. */
export const GAMES: readonly GameEntry[] = [
	{ name: "hello", file: "games/hello/game.ts", seeds: [1, 2], fakeSeeds: [7] },
	{ name: "tictactoe-teams", file: "games/tictactoe-teams/game.ts", seeds: [7, 11], fakeSeeds: [7] },
	{ name: "quarry", file: "games/quarry/game.ts", seeds: [29, 31], fakeSeeds: [7] },
	{ name: "econ-lab", file: "games/econ-lab/game.ts", seeds: [23, 31], fakeSeeds: [7] },
	{ name: "city-slice", file: "games/city-slice/game.ts", seeds: [7, 11], fakeSeeds: [7, 4] },
	{ name: "harbor-lights", file: "games/harbor-lights/game.ts", seeds: [103, 111], fakeSeeds: [7] },
	{ name: "liars-dice", file: "games/liars-dice/game.ts", seeds: [7, 11], fakeSeeds: [7] },
	{ name: "lanterns", file: "games/lanterns/game.ts", seeds: [73, 107], fakeSeeds: [7] },
	{ name: "chess", file: "games/chess/game.ts", seeds: [13, 29], fakeSeeds: [7] },
	{ name: "holdem", file: "games/holdem/game.ts", seeds: [7, 11], fakeSeeds: [7] },
	{ name: "convoy", file: "games/convoy/game.ts", seeds: [53, 13], fakeSeeds: [7] },
	{ name: "morris-teams", file: "games/morris-teams/game.ts", seeds: [13, 31], fakeSeeds: [7] },
	{ name: "salt-market", file: "games/salt-market/game.ts", seeds: [41, 45], fakeSeeds: [7] },
	{ name: "blind-bid", file: "games/blind-bid/game.ts", seeds: [7, 11], fakeSeeds: [7] },
	{ name: "ember-tricks", file: "games/ember-tricks/game.ts", seeds: [23, 31], fakeSeeds: [7] },
	{ name: "whispers", file: "games/whispers/game.ts", seeds: [7, 11], fakeSeeds: [7] },
];
