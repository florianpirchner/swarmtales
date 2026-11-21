// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The staging of the old runs (M6-18, `13-m6-spec.md` 7.2 row 3) on a fixture clone: a tag with run data, story code
 * and other files, and a run data branch with a `legacy/` folder of its own.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Scanner } from "../data-repo.ts";
import { MANIFEST_FILE, SCAN_FILE, stageLegacyRuns, STAGING_BRANCH, stagingCommands } from "../legacy-runs.ts";

const RUN = "{\"type\":\"run_started\"}\n";
const OLD: Readonly<Record<string, string>> = {
	"stories/alpha/runs/s7/log.jsonl": RUN,
	"stories/alpha/runs/s7/REPORT.md": "# Report\n",
	"stories/alpha/story.ts": "export {};\n",
	"stories/beta/README.md": "# Beta, no runs\n",
	"examples/act2/v01/README.md": "# v01\n",
	"src/old.ts": "export {};\n",
};
const STAGED = ["legacy/examples/act2/v01/README.md", "legacy/stories/alpha/runs/s7/REPORT.md", "legacy/stories/alpha/runs/s7/log.jsonl"];

let root = "";
let base = "";
const scanned: string[][] = [];
const clean: Scanner = (folder) => {
	scanned.push(readdirSync(folder, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name).slice(folder.length + 1)).sort());
	return { clean: true, files: 3 };
};

function git(...args: string[]): string {
	return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function commitFiles(files: Readonly<Record<string, string>>, message: string): string {
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	git("add", "-A");
	git("commit", "-q", "-m", message);
	return git("rev-parse", "HEAD");
}

const sha = (text: string): string => createHash("sha256").update(text).digest("hex");
const show = (path: string): string => git("show", `${STAGING_BRANCH}:${path}`);

beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "swt-legacy-runs-test-"));
	git("init", "-q", "-b", "old");
	git("config", "user.name", "Fixture");
	git("config", "user.email", "fixture@example.com");
	commitFiles(OLD, "the old state");
	git("update-ref", "refs/tags/v0-fixture", "HEAD");
	git("checkout", "-q", "--orphan", "data/runs");
	git("rm", "-rqf", ".");
	base = commitFiles({ "README.md": "# Run data\n", "legacy/README.md": "# Bridge runs\n" }, "run data");
});

afterAll(() => {
	rmSync(root, { recursive: true, force: true });
});

describe("the staging of the old runs", () => {
	it("stages the run data of the tag onto the data branch, with the manifest and the scan report", () => {
		const result = stageLegacyRuns({ root, source: "v0-fixture", scan: clean, signOff: "A Person <a@example.com>" });
		expect(result.problems).toEqual([]);
		const commit = git("rev-parse", STAGING_BRANCH);
		expect(result.staged).toMatchObject({ commit, files: 3, bytes: 38, largest: 23 });
		expect(git("rev-parse", `${STAGING_BRANCH}^`)).toBe(base);
		expect(git("ls-tree", "-r", "--name-only", STAGING_BRANCH).split("\n")).toEqual(["README.md", "legacy/MANIFEST-v0-final.sha256", "legacy/README.md", "legacy/SCAN-v0-final.json", ...STAGED]);
		expect(scanned.at(-1)).toEqual(STAGED.map((path) => path.slice("legacy/".length)));
		const manifest = `${show(MANIFEST_FILE)}\n`;
		expect(manifest).toBe(`${sha(OLD["examples/act2/v01/README.md"] ?? "")}  ${STAGED[0] ?? ""}\n${sha("# Report\n")}  ${STAGED[1] ?? ""}\n${sha(RUN)}  ${STAGED[2] ?? ""}\n`);
		expect(result.staged?.digest).toBe(sha(manifest));
		expect(JSON.parse(show(SCAN_FILE))).toEqual({ source: "v0-final", files: 3, bytes: 38, manifest: MANIFEST_FILE, manifestSha256: sha(manifest), scan: { clean: true, files: 3 } });
		expect(git("log", "-1", "--format=%B", STAGING_BRANCH)).toContain("Signed-off-by: A Person <a@example.com>");
		expect(result.lines).toEqual(expect.arrayContaining([`manifest digest: ${sha(manifest)}`, ...stagingCommands(commit)]));
		expect(stagingCommands(commit).join("\n")).toContain(`${commit}:refs/heads/main`);
	});

	it("gives the same digest and tree on a second run, and stages again over the branch", () => {
		const first = stageLegacyRuns({ root, source: "v0-fixture", scan: clean });
		const tree = git("rev-parse", `${STAGING_BRANCH}^{tree}`);
		const second = stageLegacyRuns({ root, source: "v0-fixture", scan: clean, expectedDigest: first.staged?.digest ?? "" });
		expect(second.problems).toEqual([]);
		expect(second.staged?.digest).toBe(first.staged?.digest);
		expect(git("rev-parse", `${STAGING_BRANCH}^{tree}`)).toBe(tree);
	});

	it("writes no branch on a held key value, a scan of nothing, or a digest that differs from the record", () => {
		// Each test stages what it needs, so that it holds in any order (M6-15).
		expect(stageLegacyRuns({ root, source: "v0-fixture", scan: clean }).problems).toEqual([]);
		const before = git("rev-parse", STAGING_BRANCH);
		expect(stageLegacyRuns({ root, source: "v0-fixture", scan: () => ({ clean: false, files: 3 }) }).problems).toEqual(["`swt scan` found a held key value in the old runs; nothing was staged"]);
		expect(stageLegacyRuns({ root, source: "v0-fixture", scan: () => ({ clean: null, files: 0 }) }).problems).toEqual([
			"`swt scan` scanned nothing: no key variable is set, so no value can be looked for; nothing was staged",
		]);
		const differs = stageLegacyRuns({ root, source: "v0-fixture", scan: clean, expectedDigest: "0".repeat(64) });
		expect(differs.problems).toEqual([`the manifest digest differs from the record of M6-18 (${"0".repeat(64)}); nothing was staged`]);
		expect(differs.staged).toBeUndefined();
		expect(git("rev-parse", STAGING_BRANCH)).toBe(before);
	});

	it("never passes on nothing: no old state, no data branch, no run data, or a clash under legacy/", () => {
		expect(stageLegacyRuns({ root, source: "v0-none", scan: clean }).problems).toEqual(["the clone does not hold the old state v0-none"]);
		expect(stageLegacyRuns({ root, source: "v0-fixture", base: "data/none", scan: clean }).problems).toEqual(["the clone holds no branch data/none"]);
		expect(stageLegacyRuns({ root, source: "data/runs", scan: clean }).problems).toEqual(["the old state holds no `stories/<name>/runs/` and no `examples/`; nothing was staged"]);
		expect(stageLegacyRuns({ root, source: "v0-fixture", scan: clean }).problems).toEqual([]);
		expect(stageLegacyRuns({ root, source: "v0-fixture", base: STAGING_BRANCH, scan: clean }).problems).toEqual([`${STAGING_BRANCH} already holds a path of the staging under legacy/`]);
	});
});
