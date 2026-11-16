// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What the overview of `GAMES.md` takes that no game file holds: the card's title, the family, a note on the
 * residents, the oracle folder and the proof. Everything else comes from `games/index.ts` and the game files. A
 * game issue adds its entry here with its card; the families table names the games of the old platform by the
 * folder their port has (or will have) under `games/`, so a port is marked as soon as its line is in the list.
 */

/** The hand-kept facts of one card. */
export interface CardFacts {
	/** The card's heading in `GAMES.md`. */
	readonly title: string;
	/** The family, for a game that is no port of a game of the families table. */
	readonly family?: string;
	/** Said after the count of residents, such as "(two teams of three)". */
	readonly residents?: string;
	/** The folder under `oracles/` whose files the game replays. */
	readonly oracles?: string;
	/** The proof, after the oracle count where there is one. */
	readonly proof?: string;
}

/** The cards by folder under `games/`. */
export const CARDS: Readonly<Record<string, CardFacts>> = {
	hello: { title: "Hello Game", family: "none (sample 1 of the README)", proof: "its test plays it with the sampled player and with `swt run --fake`, and verifies the log" },
	"tictactoe": { title: "Tic-tac-toe teams", residents: "(two teams of three)", oracles: "tictactoe" },
	quarry: { title: "Quarry", oracles: "quarry" },
	"econ-lab": { title: "Econ Lab", oracles: "econ-lab" },
	"harbor-lights": { title: "Harbor Lights", oracles: "harbor-lights" },
	lanterns: { title: "Lanterns", residents: "(two teams of three)", oracles: "lanterns" },
	"city-slice": {
		title: "The city slice",
		family: "societies (a slice of City of Keys, not the game)",
		proof: "three committed timelines; replay and resume give the same log; projections of the City's oracle files prove the ported rules",
	},
	"liars-dice": { title: "Liar's dice", residents: "(2 to 6)", oracles: "liars-dice" },
	chess: { title: "Chess", residents: "(4 with teams)", oracles: "chess" },
	holdem: { title: "Hold'em", residents: "(2 to 6)", oracles: "holdem" },
	convoy: { title: "Convoy", oracles: "convoy" },
	"morris": { title: "Nine men's morris", residents: "(two teams of three), 2, or 1 against the search", oracles: "morris-teams" },
	"salt-market": { title: "Salt Market", oracles: "salt-market" },
	"blind-bid": { title: "Blind Bid", oracles: "blind-bid" },
	"ember-tricks": { title: "Ember Tricks", oracles: "ember-tricks" },
	whispers: { title: "Whispers", proof: "three of the four oracle files match at level 3, the holdout file up to its trial and the trial by projection; a fake run reaches every reachable tool; replay and resume give the same log" },
	city: { title: "City of Keys", proof: "four of the seven oracle files (Act I at seeds 7 and 11, the resumed Act I, the burn file) match at level 3, the two Act II files by projection; a fake run reaches every reachable tool; replay and resume give the same log, also after `--pause-on`" },
};

/** One game of the old platform: its name there and the folder of its port. */
export interface OldGame {
	readonly name: string;
	readonly folder: string;
}

/** The families of the fifteen games of the old platform. */
export const FAMILIES: readonly { readonly family: string; readonly games: readonly OldGame[] }[] = [
	{ family: "Societies", games: [{ name: "City of Keys", folder: "city" }, { name: "Whispers", folder: "whispers" }] },
	{ family: "Board games, all information public", games: [{ name: "chess", folder: "chess" }, { name: "nine men's morris", folder: "morris" }, { name: "tic-tac-toe teams", folder: "tictactoe" }] },
	{ family: "Hidden information and bluff", games: [{ name: "Hold'em", folder: "holdem" }, { name: "Liar's Dice", folder: "liars-dice" }, { name: "Convoy", folder: "convoy" }] },
	{ family: "Cooperation under hidden information", games: [{ name: "Harbor Lights", folder: "harbor-lights" }, { name: "Lanterns", folder: "lanterns" }] },
	{
		family: "Markets, bids and economics",
		games: [{ name: "Econ Lab", folder: "econ-lab" }, { name: "Salt Market", folder: "salt-market" }, { name: "Blind Bid", folder: "blind-bid" }, { name: "Quarry", folder: "quarry" }, { name: "Ember Tricks", folder: "ember-tricks" }],
	},
];
