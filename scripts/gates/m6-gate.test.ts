// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The gate of milestone M6 (issue M6-30): the parts of done-whens 5 and 7 of `13-m6-spec.md` (the list at its head)
 * that no earlier gate checks whole. The rest of each done-when has its own test, named in `docs/ISSUE-RECORD.md`,
 * "The gate of M6".
 *
 * - **Done-when 7, line 3 of the 1.0 list:** each of the fifteen games of REWRITE section 5 (the games list without
 *   the Hello Game and the city slice) has one recorded live baseline (A124): a row of its runs index with its path
 *   on `data/runs` and its code commit. The commit the run replays at is in the clone and on the head's history, and it
 *   stands on the side of the rename (`6b4954b2`, M6-06) that the table says: a baseline recorded before the rename
 *   counts for its renamed game, since it replays at its own code commit (4.3).
 * - **Done-when 5, 6.4:** every command `docs/RELEASE.md` names exists: a `pnpm <script>` is a script of the root
 *   `package.json` (or one of pnpm's own commands), a `node scripts/…` file exists and reads each flag it is given,
 *   and `pnpm exec swt <command>` names a command of the frozen CLI table.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GAMES } from "../../games/index.ts";
import { readText, REPO_ROOT } from "../lib/files.ts";
import { commitOf, gitRead } from "../release/git.ts";
import { runsRows } from "../release/runs-index.ts";
import { RENAMES } from "../rename/table.ts";

/** One baseline of 1.0 line 3. */
interface Baseline {
	readonly game: string;
	/** The path on `data/runs`, as the runs index names it. */
	readonly path: string;
	/** The code commit, as the runs index names it. */
	readonly code: string;
	/** The commit on the branch whose code the run replays at, where the code commit is on no branch. */
	readonly replaysAt?: string;
	/** Where the run stands against the rename of original games. */
	readonly side: "before" | "after";
}

/** The commit that applied the rename of section 4 (M6-06). */
const RENAME_COMMIT = "6b4954b2";

/** The games of the games list that the 1.0 list does not count (sample 1 and the slice of M3). */
const NOT_COUNTED: ReadonlySet<string> = new Set(["hello", "city-slice"]);

/** The folder name of morris before the rename, which the data path of its baseline keeps (4.3). */
const OLD_MORRIS = RENAMES.find((entry) => entry.to === "morris")?.from ?? "morris";

/** The baseline of each game, as `docs/ISSUE-RECORD.md`, "The baselines of 1.0 line 3", names it. */
const BASELINES: readonly Baseline[] = [
	{ game: "tictactoe", path: "tictactoe/baseline/tictactoe-001", code: "155d497e", side: "after" },
	{ game: "quarry", path: "smoke/quarry-001", code: "b7de6505", side: "before" },
	{ game: "econ-lab", path: "smoke/econ-lab-001", code: "b7de6505", side: "before" },
	{ game: "harbor-lights", path: "harbor-lights/harbor-lights-private-notes", code: "5b6336a6", side: "before" },
	{ game: "liars-dice", path: "liars-dice/smoke/liars-dice-002", code: "7ea5ea10", side: "before" },
	{ game: "lanterns", path: "lanterns/lanterns-team-brain", code: "5b6336a6", side: "before" },
	{ game: "chess", path: "chess/chess-requests", code: "5b6336a6", side: "before" },
	{ game: "holdem", path: "holdem/smoke/holdem-001", code: "7ea5ea10", side: "before" },
	{ game: "convoy", path: "convoy/smoke/convoy-001", code: "f0de5e95", replaysAt: "7ea5ea10", side: "before" },
	{ game: "morris", path: `${OLD_MORRIS}/smoke/${OLD_MORRIS}-001`, code: "f0de5e95", replaysAt: "7ea5ea10", side: "before" },
	{ game: "salt-market", path: "salt-market/smoke/salt-market-001", code: "f0de5e95", replaysAt: "7ea5ea10", side: "before" },
	{ game: "blind-bid", path: "blind-bid/smoke/blind-bid-001", code: "7ea5ea10", side: "before" },
	{ game: "ember-tricks", path: "ember-tricks/smoke/ember-tricks-001", code: "7ea5ea10", side: "before" },
	{ game: "whispers", path: "whispers/smoke/whispers-001-r8", code: "8714c7d3", side: "after" },
	{ game: "city", path: "city/base/city-001", code: "1ffa813f", side: "before" },
];

const isAncestor = (root: string, older: string, newer: string): boolean => gitRead(root, ["merge-base", "--is-ancestor", older, newer]) !== undefined;

/** The problem of a baseline's row in its runs index: none, or no row with its path and its code commit. */
function rowProblem(root: string, baseline: Baseline): string | undefined {
	const file = `games/${baseline.game}/RUNS.md`;
	if (!existsSync(join(root, file))) return `${baseline.game}: no runs index`;
	const text = readText(file, root);
	const row = runsRows(file, text).find((entry) => entry.path === baseline.path);
	if (row === undefined) return `${baseline.game}: no row of ${file} names ${baseline.path}`;
	const line = text.split("\n")[row.line - 1] ?? "";
	return line.includes(`\`${baseline.code}`) ? undefined : `${file}:${String(row.line)}: the row does not name the code commit ${baseline.code}`;
}

/** The problems of one baseline: its row, its commits and its side of the rename. */
function baselineProblem(root: string, baseline: Baseline): string | undefined {
	const row = rowProblem(root, baseline);
	if (row !== undefined) return row;
	const replays = baseline.replaysAt ?? baseline.code;
	if (commitOf(root, replays) === undefined || !isAncestor(root, replays, "HEAD")) return `${baseline.game}: the commit ${replays} is not on the head's history`;
	const before = isAncestor(root, replays, RENAME_COMMIT) && replays !== RENAME_COMMIT;
	return (before ? "before" : "after") === baseline.side ? undefined : `${baseline.game}: the commit ${replays} is not ${baseline.side} the rename`;
}

/**
 * The problems of line 3 of the 1.0 list: a counted game without its baseline, a baseline of no counted game, and the
 * problems of each baseline.
 */
function lineThreeProblems(root: string, baselines: readonly Baseline[]): readonly string[] {
	const counted = GAMES.map((entry) => entry.name).filter((name) => !NOT_COUNTED.has(name));
	const named = new Set(baselines.map((baseline) => baseline.game));
	return [
		...counted.filter((name) => !named.has(name)).map((name) => `${name}: no baseline`),
		...[...named].filter((name) => !counted.includes(name)).map((name) => `${name}: not a game of the 1.0 list`),
		...baselines.flatMap((baseline) => baselineProblem(root, baseline) ?? []),
	];
}

/** pnpm's own commands that `docs/RELEASE.md` uses; every other `pnpm <word>` is a script of the root. */
const PNPM_COMMANDS: ReadonlySet<string> = new Set(["install", "publish", "add", "exec"]);

/** The problem of a `node scripts/…` command: a missing file, or a flag the file does not read. */
function nodeProblem(command: string, words: readonly string[], root: string): string | undefined {
	const file = words[1] ?? "";
	if (!existsSync(join(root, file))) return `\`${command}\`: no file ${file}`;
	const source = readText(file, root);
	const unread = words.filter((word) => word.startsWith("--") && !source.includes(`"${word}"`));
	return unread.length === 0 ? undefined : `\`${command}\`: ${file} reads no ${unread.join(", ")}`;
}

/** The problems of one command of a code span. */
function commandProblem(command: string, scripts: ReadonlySet<string>, cli: ReadonlySet<string>, root: string): string | undefined {
	const words = command.split(/\s+/).filter((word) => word !== "");
	if (words[0] === "node") return nodeProblem(command, words, root);
	const rest = words.slice(1).filter((word, index, all) => !word.startsWith("--") && !(all[index - 1] ?? "").startsWith("--dir"));
	const name = (rest[0] ?? "").replace(/:$/, "");
	if (PNPM_COMMANDS.has(name)) return name === "exec" && rest[1] === "swt" && !cli.has(rest[2] ?? "") ? `\`${command}\`: swt has no command ${rest[2] ?? ""}` : undefined;
	return scripts.has(name) ? undefined : `\`${command}\`: the root package.json has no script ${name}`;
}

/** The problems of every `pnpm …` and `node scripts/…` command in the code spans of a checklist. */
function releaseCommandProblems(text: string, root: string): readonly string[] {
	const manifest: unknown = JSON.parse(readText("package.json", root));
	const field: unknown = typeof manifest === "object" && manifest !== null ? Reflect.get(manifest, "scripts") : undefined;
	const scripts = new Set(typeof field === "object" && field !== null ? Object.keys(field) : []);
	const table: unknown = JSON.parse(readText("scripts/api-freeze/surface/cli.json", root));
	const cli = new Set(typeof table === "object" && table !== null ? Object.keys(table) : []);
	const spans = [...text.matchAll(/`((?:pnpm|node scripts\/)[^`]*)`/g)].map((match) => match[1] ?? "");
	if (spans.length === 0) return ["no command was found"];
	return spans.flatMap((span) => commandProblem(span, scripts, cli, root) ?? []);
}

describe("done-when 7 of M6, line 3 of the 1.0 list: one recorded live baseline per game", () => {
	it("holds in this repository: fifteen games, each with its row, its commit and its side of the rename", () => {
		expect(BASELINES).toHaveLength(15);
		expect(lineThreeProblems(REPO_ROOT, BASELINES)).toEqual([]);
	});

	it("counts a renamed game's baseline from before the rename, and every renamed game is on the list", () => {
		const renamed = RENAMES.map((entry) => entry.to).filter((name) => BASELINES.some((baseline) => baseline.game === name));
		expect(renamed).toEqual(["quarry", "lanterns", "harbor-lights", "ember-tricks", "blind-bid", "econ-lab", "tictactoe", "morris"]);
		expect(BASELINES.filter((baseline) => renamed.includes(baseline.game) && baseline.side === "before")).toHaveLength(7);
	});

	it("fails on a game without a baseline, a missing row, another code commit, a commit off the history and the wrong side", () => {
		const [first, ...others] = BASELINES;
		if (first === undefined) throw new TypeError("no baseline");
		expect(lineThreeProblems(REPO_ROOT, others)).toEqual(["tictactoe: no baseline"]);
		expect(lineThreeProblems(REPO_ROOT, [...BASELINES, { ...first, game: "hello" }])).toEqual(["hello: not a game of the 1.0 list", "hello: no row of games/hello/RUNS.md names tictactoe/baseline/tictactoe-001"]);
		expect(baselineProblem(REPO_ROOT, { ...first, path: "tictactoe/baseline/tictactoe-002" })).toBe("tictactoe: no row of games/tictactoe/RUNS.md names tictactoe/baseline/tictactoe-002");
		expect(baselineProblem(REPO_ROOT, { ...first, code: "8714c7d3" })).toMatch(/the row does not name the code commit 8714c7d3$/);
		expect(baselineProblem(REPO_ROOT, { game: "convoy", path: "convoy/smoke/convoy-001", code: "f0de5e95", side: "before" })).toBe("convoy: the commit f0de5e95 is not on the head's history");
		expect(baselineProblem(REPO_ROOT, { ...first, side: "before" })).toBe("tictactoe: the commit 155d497e is not before the rename");
	});
});

describe("done-when 5 of M6, 6.4: every command of docs/RELEASE.md exists", () => {
	it("holds for the checklist of the release", () => {
		expect(releaseCommandProblems(readText("docs/RELEASE.md"), REPO_ROOT)).toEqual([]);
	});

	it("fails on a missing script, a missing file, an unread flag and an unknown command of swt, and on finding none", () => {
		const text = "`pnpm release:publish` `node scripts/release/none.ts` `node scripts/release/links.ts --force` `pnpm exec swt deploy` `pnpm --dir x publish`";
		expect(releaseCommandProblems(text, REPO_ROOT)).toEqual([
			"`pnpm release:publish`: the root package.json has no script release:publish",
			"`node scripts/release/none.ts`: no file scripts/release/none.ts",
			"`node scripts/release/links.ts --force`: scripts/release/links.ts reads no --force",
			"`pnpm exec swt deploy`: swt has no command deploy",
		]);
		expect(releaseCommandProblems("no command here", REPO_ROOT)).toEqual(["no command was found"]);
	});
});
