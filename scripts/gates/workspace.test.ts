// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The workspace shape: every package and every tracked file is where the gates look. */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { WORKSPACE_FOLDERS } from "../layers/table.ts";
import { listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import { hiddenFromGates, packageFolders, workspaceGlobs, workspaceShapeOffences } from "../lib/workspace-shape.ts";

function fixture(files: Readonly<Record<string, string>>): string {
	const root = mkdtempSync(join(tmpdir(), "swt-shape-"));
	const all = {
		"pnpm-workspace.yaml": `packages:\n${WORKSPACE_FOLDERS.map((folder) => `  - "${folder}/*"\n`).join("")}saveExact: true\n`,
		"tsconfig.json": JSON.stringify({ references: [{ path: "packages/a" }] }),
		"packages/a/package.json": JSON.stringify({ name: "@swarmtales/a", scripts: { build: "tsdown", api: "api-extractor run" } }),
		"packages/a/tsconfig.json": "{}",
		"packages/a/api-extractor.json": "{}",
		"packages/a/a.api.md": "",
		"packages/a/src/index.ts": "",
		...files,
	};
	for (const [path, text] of Object.entries(all)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	return root;
}

describe("workspace shape", () => {
	it("holds in this repository", () => {
		expect(packageFolders().length).toBeGreaterThan(0);
		expect(workspaceShapeOffences()).toEqual([]);
	});

	it("reads the package globs of pnpm-workspace.yaml", () => {
		expect(workspaceGlobs('# c\npackages:\n  - "packages/*"\n  - apps/*\nsaveExact: true\n')).toEqual(["packages/*", "apps/*"]);
		expect(workspaceGlobs(readText("pnpm-workspace.yaml"))).toEqual(WORKSPACE_FOLDERS.map((folder) => `${folder}/*`));
	});

	it("accepts a complete package", () => {
		expect(workspaceShapeOffences(fixture({}))).toEqual([]);
	});

	it("rejects a package where no gate looks, and a workspace glob the table does not know", () => {
		expect(workspaceShapeOffences(fixture({ "tools/x/package.json": '{"name":"x"}' }))[0]).toContain("tools/x: a package.json outside");
		expect(workspaceShapeOffences(fixture({ "packages/a/inner/package.json": '{"name":"y"}' }))[0]).toContain("packages/a/inner");
		expect(workspaceShapeOffences(fixture({ "pnpm-workspace.yaml": 'packages:\n  - "packages/*"\n  - "tools/*"\n' }))[0]).toContain("pnpm-workspace.yaml");
	});

	it("rejects a package that the typecheck or the API report would skip", () => {
		const bare = workspaceShapeOffences(fixture({ "packages/b/package.json": '{"name":"@swarmtales/b"}' })).join("\n");
		for (const part of ["no tsconfig.json", "does not reference it", 'no "build" script', 'no "api" script', "no api-extractor.json", "no committed API report b.api.md"]) {
			expect(bare).toContain(part);
		}
		const game = workspaceShapeOffences(fixture({ "games/g/package.json": '{"name":"g"}', "games/g/tsconfig.json": "{}", "tsconfig.json": JSON.stringify({ references: [{ path: "packages/a" }, { path: "./games/g" }] }) }));
		expect(game).toEqual([]);
	});

	it("rejects source outside src/ and test/, and a tsconfig with path aliases", () => {
		expect(workspaceShapeOffences(fixture({ "packages/a/lib/more.ts": "" }))[0]).toContain("packages/a/lib/more.ts");
		expect(workspaceShapeOffences(fixture({ "packages/a/tsdown.config.ts": "", "packages/a/test/helper.ts": "" }))).toEqual([]);
		expect(workspaceShapeOffences(fixture({ "packages/a/tsconfig.json": '{ "compilerOptions": { "paths": {} } }' }))[0]).toContain('"paths"');
	});

	it("finds tracked files in folders that the gates skip", () => {
		expect(hiddenFromGates(["a/b.ts", "packages/kernel/src/temp/x.ts", "runs/r.json", "packages/a/dist/x.js", "temp.ts"])).toEqual([
			"packages/kernel/src/temp/x.ts", "runs/r.json", "packages/a/dist/x.js",
		]);
	});

	it("reads every file that git tracks", () => {
		const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0").filter((path) => path !== "");
		expect(tracked.length).toBeGreaterThan(50);
		expect(hiddenFromGates(tracked)).toEqual([]);
		const seen = new Set(listFiles(".", () => true));
		expect(tracked.filter((path) => !seen.has(path))).toEqual([]);
	});
});
