// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rename of original games (`13-m6-spec.md` 4.2, decision A122) as data: the ids that change, and the exceptions,
 * the places where an old id stays (4.3, 4.4).
 */

/** One renamed id: a mechanic (its folder under `mechanics/`) or a game (its folder under `games/`). */
export interface Rename {
	readonly kind: "mechanic" | "game";
	readonly from: string;
	readonly to: string;
}

/** The table of 4.2. A package is renamed with its id: `@swarmtales/mechanic-<from>`, `@swarmtales/game-<from>`. */
export const RENAMES: readonly Rename[] = [
	{ kind: "mechanic", from: "grid-game", to: "grid" },
	{ kind: "mechanic", from: "draft-rounds", to: "quarry" },
	{ kind: "mechanic", from: "clue-grid", to: "lanterns" },
	{ kind: "mechanic", from: "hint-towers", to: "harbor-lights" },
	{ kind: "mechanic", from: "trick-play", to: "ember-tricks" },
	{ kind: "mechanic", from: "sealed-auction", to: "blind-bid" },
	{ kind: "mechanic", from: "econ-games", to: "econ-lab" },
	{ kind: "game", from: "tictactoe-teams", to: "tictactoe" },
	{ kind: "game", from: "morris-teams", to: "morris" },
];

/**
 * A place where an old id stays. `path` alone: the file is neither rewritten nor moved. With `line`: the lines of such
 * a file that match keep their words. With `before` or `after`: an id whose text before it ends with `before`, or
 * whose text after it starts with `after`, stays.
 */
export interface Exception {
	readonly path?: RegExp;
	readonly line?: RegExp;
	readonly before?: RegExp;
	readonly after?: RegExp;
	readonly reason: string;
}

/** The exceptions. An id followed by `-` and a letter or digit is part of a longer name (a variant, a run folder, an oracle file) and is no match at all. */
export const EXCEPTIONS: readonly Exception[] = [
	{ path: /^oracles\//, reason: "oracle files stay byte-equal to the old platform (4.3)" },
	{ path: /^(games\/[^/]+-ledger\.jsonl|apps\/cli\/test\/fixtures\/|packages\/viewer-core\/test\/fixtures\/)/, reason: "run data, recorded (4.3)" },
	{ path: /^docs\/(refactoring-before-release|ideas)\//, reason: "carried docs, specifications and errata (4.4)" },
	{ path: /^docs\/(LESSONS-LEARNED|FINDINGS|ISSUE-RECORD|M2-GATE|M4-GATE|M4-REVIEW|RERUN-PLAN|RERUN-PLAN-M4)\.md$/, reason: "records of past runs and issues (4.4)" },
	{ path: /^scripts\/rename\//, reason: "the table of the rename itself" },
	{ path: /\/prompts\/.*\.md$/, line: /^(?!id: )/, reason: "a prompt text is model-facing; only its id moves (D14, A50)" },
	{ before: /\brng\(\s*"$/, reason: "a random label stays byte-identical, or the seeded draws change (A41)" },
	{ before: /(stories|test\/mechanics)\/$/, reason: "a path of the old platform (`stories/<id>/`, `test/stories/<id>`, `test/mechanics/<id>/`)" },
	{ before: /oracles\/(mechanics\/)?$|"oracles", "$|oracles: "$/, reason: "the oracle folders and notes stay as the old platform wrote them (4.3)" },
	{ path: /(^|\/)RUNS\.md$/, before: /`$/, after: /^\//, reason: "a data path of a recorded run (4.4)" },
	{ path: /^games\/[^/]+\/test\/[^/]+\.ts$/, before: /^\s*"$/, after: /^": \{/, reason: "an old variant name, the key of a game test's table of the oracles' variants" },
	{ after: /^\((\?:)?-/, reason: "a pattern of the old variant names (`<id>(-nobrain)?`)" },
];
