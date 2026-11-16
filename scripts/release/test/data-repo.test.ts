// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The dry run of the data repository (M6-17, `13-m6-spec.md` 7.1) on a fixture clone: a temporary git repository
 * with a run data branch, a branch without a `LICENSE`, a commit beside the branch, and a work tree with a runs index.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dryRun, ownerCommands, type Scanner } from "../data-repo.ts";
import { runsRows } from "../runs-index.ts";

const LICENCE = "The project's licence.\n";
const RUN_FILE = "quarry/smoke/quarry-001/log.jsonl";
const HEAD = "| Series | Path on `data/runs` | Data commit | Code commit | Cost (USD) |\n|---|---|---|---|---:|\n";
const clean: Scanner = () => ({ clean: true, files: 3 });

let root = "";
let data = "";
let side = "";

function git(...args: string[]): string {
	return execFileSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", ...args], { cwd: root, encoding: "utf8" }).trim();
}

function put(files: Readonly<Record<string, string>>): void {
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
}

const commit = (message: string): string => git("add", "-A") + git("commit", "-q", "-m", message) + git("rev-parse", "HEAD");

/** The work tree: the root `LICENSE`, one runs index with the given rows, and a README with the given text. */
function workTree(rows: string, readme = "# Fixture\n"): void {
	put({ LICENSE: LICENCE, "games/quarry/RUNS.md": `# Runs of Quarry\n\n${HEAD}${rows}`, "README.md": readme });
}

const row = (path: string, commitId: string): string => `| Pilot | \`${path}\` | \`${commitId.slice(0, 8)}\` | \`b7de6505\` | 0.03 |\n`;

beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "swt-data-repo-test-"));
	git("init", "-q", "-b", "data/runs");
	put({ "README.md": "# Run data\n", LICENSE: LICENCE, [RUN_FILE]: "{}\n" });
	data = commit("run data");
	git("checkout", "-q", "-b", "side");
	put({ "side/run/log.jsonl": "{}\n" });
	side = commit("beside the branch");
	git("checkout", "-q", "-b", "data/no-licence", data);
	git("rm", "-q", "LICENSE");
	commit("no licence");
	git("checkout", "-q", "data/runs");
	for (const path of ["README.md", "LICENSE", "quarry"]) rmSync(join(root, path), { recursive: true, force: true });
});

afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

describe("the runs index", () => {
	it("reads the path and the data commit of each row by the columns of the table's head", () => {
		const text = `${HEAD}| a | \`quarry/x/\` | \`0f726704\` on \`data/runs\` | \`b7\` | 1 |\n\nprose\n\n| Other | table |\n|---|---|\n| \`p\` | \`0f726704\` |\n`;
		expect(runsRows("RUNS.md", text)).toEqual([{ file: "RUNS.md", line: 3, path: "quarry/x", commit: "0f726704" }]);
	});
});

describe("the dry run of the data repository", () => {
	it("passes on a branch with README, the project's LICENSE and every row's data, and prints the owner's commands", () => {
		workTree(row(RUN_FILE, data), "[runs](https://github.com/florianpirchner/swarmtales/tree/data/runs/quarry/smoke).\n");
		const scanned: string[] = [];
		const scan: Scanner = (folder) => {
			scanned.push(readFileSync(join(folder, RUN_FILE), "utf8"), String(existsSync(join(folder, "LICENSE"))));
			return { clean: true, files: 3 };
		};
		const result = dryRun({ root, scan });
		expect(result.problems).toEqual([]);
		expect(scanned).toEqual(["{}\n", "true"]);
		expect(result.lines).toContain("links: data/runs, run data: 1 links in 1 files");
		expect(result.lines).toEqual(expect.arrayContaining([...ownerCommands(data)]));
		expect(ownerCommands(data).join("\n")).toContain(`${data}:refs/heads/main`);
	});

	it("fails on a branch without LICENSE, and on a LICENSE that is not the project's", () => {
		workTree(row(RUN_FILE, data));
		expect(dryRun({ root, ref: "data/no-licence", scan: clean }).problems).toEqual(["the branch has no LICENSE; add the project's LICENSE (A65) in one data commit"]);
		put({ LICENSE: "Apache License 2.0\n" });
		expect(dryRun({ root, scan: clean }).problems).toEqual(["the branch's LICENSE is not the project's (A65): it differs from the root LICENSE"]);
	});

	it("fails on a row whose data commit is unknown or beside the branch, or whose path the commit does not hold", () => {
		workTree(row(RUN_FILE, "deadbeefdeadbeef") + row("side/run", side) + row("quarry/smoke/quarry-002", data) + "| Empty | none | none | none | 0 |\n");
		expect(dryRun({ root, scan: clean }).problems).toEqual([
			"games/quarry/RUNS.md:5: the data commit deadbeef is not in the clone",
			`games/quarry/RUNS.md:6: the data commit ${side.slice(0, 8)} is not on the branch`,
			`games/quarry/RUNS.md:7: quarry/smoke/quarry-002 is not in the data commit ${data.slice(0, 8)}`,
			"games/quarry/RUNS.md:8: the row names no path or no data commit",
		]);
	});

	it("never passes on nothing: no row, no branch, or a scan that scanned nothing", () => {
		workTree("");
		expect(dryRun({ root, scan: clean }).problems).toEqual(["no row of a runs index names a data commit; nothing was checked"]);
		expect(dryRun({ root, ref: "data/none", scan: clean }).problems).toEqual(["the clone holds no branch data/none"]);
		workTree(row(RUN_FILE, data));
		expect(dryRun({ root, scan: () => ({ clean: null, files: 0 }) }).problems).toEqual([
			"`swt scan` scanned nothing: no key variable is set, so no value can be looked for",
		]);
	});

	it("fails on a held key value and on a link to a path the branch does not hold", () => {
		workTree(row(RUN_FILE, data), "[gone](https://github.com/florianpirchner/swarmtales/tree/data/runs/quarry/gone)\n");
		expect(dryRun({ root, scan: () => ({ clean: false, files: 3 }) }).problems).toEqual([
			"README.md:1: data/runs/quarry/gone has no class (the branch holds no such path)",
			"`swt scan` found a held key value on the branch; the branch is not pushed",
		]);
	});
});
