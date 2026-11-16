// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The release scripts of M6-21 (`13-m6-spec.md` 6.3): the content check of a tarball packed from a fixture package,
 * the version lines and their writer, the read of the registry with a fake `fetch`, and the test that no script of
 * `scripts/release/` (its tests included) publishes, pushes or tags: the words may stand only in a printed command.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { listFiles, REPO_ROOT } from "../../lib/files.ts";
import { CLONE_ONLY, publishCommands } from "../check.ts";
import { type ListedPackage, publishOrder, versionProblems } from "../list.ts";
import { type Fetcher, nameState, scopeState } from "../names.ts";
import { readTarball, tarballProblems } from "../tarball.ts";
import { setVersions, withVersion } from "../version.ts";

// The commands no script runs, and the single words that would be their argument list.
const PHRASES = ["npm publish", "pnpm publish", "git push", "git tag"];
const ARGV_WORDS = "publish push tag".split(" ");
const RUNNERS = new Set(["exec", "execSync", "execFile", "execFileSync", "spawn", "spawnSync", "fork", "gitRead", "git", "run"]);

/** Where a source runs one of the commands: a literal that is a bare argument word, or a phrase given to a runner. */
function runsForbidden(source: string): readonly string[] {
	const file = ts.createSourceFile("source.ts", source, ts.ScriptTarget.Latest, true);
	const found: string[] = [];
	const literal = (node: ts.Node): node is ts.StringLiteralLike | ts.TemplateLiteralToken => ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node);
	const visit = (node: ts.Node, inRunner: boolean): void => {
		if (literal(node) && ARGV_WORDS.includes(node.text.trim())) found.push(`the argument "${node.text}"`);
		if (literal(node) && inRunner && PHRASES.some((phrase) => node.text.includes(phrase))) found.push(`a runner given "${node.text}"`);
		const runner = ts.isCallExpression(node) && RUNNERS.has(node.expression.getText(file).split(".").at(-1) ?? "");
		for (const child of node.getChildren(file)) visit(child, inRunner || runner);
	};
	visit(file, false);
	return found;
}

describe("no release script publishes, pushes or tags", () => {
	it("holds for every file of scripts/release/, its tests included", () => {
		const files = listFiles("scripts/release", (path) => path.endsWith(".ts"));
		expect(files.length).toBeGreaterThan(10);
		expect(files.flatMap((path) => runsForbidden(readFileSync(join(REPO_ROOT, path), "utf8")).map((hit) => `${path}: ${hit}`))).toEqual([]);
	});

	it("finds a command that is run, and leaves one that is printed", () => {
		expect(runsForbidden('execFileSync("git", ["push", "origin", "main"]);')).toEqual(['the argument "push"']);
		expect(runsForbidden('spawnSync("pnpm", ["publish"], { cwd });')).toEqual(['the argument "publish"']);
		expect(runsForbidden("execSync(`git tag -a ${name} ${commit}`);")).toHaveLength(1);
		expect(runsForbidden('lines.push(`git push origin ${target}:refs/heads/main`); console.log("pnpm --dir x publish --access public");')).toEqual([]);
	});
});

const PACKAGE = { name: "@fixture/a", version: "1.0.0", type: "module", license: "LicenseRef-SUL-1.0", files: ["dist"], exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } }, dependencies: { typebox: "1.3.27" } };

/** A temporary folder with the given files. */
function folderWith(files: Readonly<Record<string, string>>): string {
	const folder = mkdtempSync(join(tmpdir(), "swt-release-"));
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(folder, path)), { recursive: true });
		writeFileSync(join(folder, path), text);
	}
	return folder;
}

/** Packs a fixture package with the given files and returns the files of its tarball. */
function packed(files: Readonly<Record<string, string>>): ReturnType<typeof readTarball> {
	const folder = folderWith({ "package.json": JSON.stringify(PACKAGE), "README.md": "# A\n", ...files });
	execFileSync("pnpm", ["pack", "--pack-destination", folder], { cwd: folder, stdio: "ignore" });
	return readTarball(join(folder, readdirSync(folder).find((name) => name.endsWith(".tgz")) ?? ""));
}

describe("the content of a tarball (6.2)", () => {
	const expected = { licence: "The licence.\n", cloneOnly: CLONE_ONLY, localPaths: ["/work/clone"] };
	const built = { "dist/index.js": "export const a = 1;\n", "dist/index.d.ts": "export declare const a = 1;\n", "dist/LICENSE": "The licence.\n" };

	it("passes a packed tarball with LICENSE and NOTICE, and fails one without NOTICE", () => {
		expect(tarballProblems(packed({ ...built, "dist/NOTICE": "Swarm Tales\n" }), expected)).toEqual([]);
		expect(tarballProblems(packed(built), expected)).toEqual(["dist/NOTICE is missing"]);
	});

	it("fails a test file, a range, a missing export, an inlined package, a local path, a clone-only name and an unlicensed third-party file", () => {
		const files = new Map(packed({ ...built, "dist/NOTICE": "See THIRD-PARTY-LICENSES.md\n", "dist/x.test.js": "", "dist/third_party/eng/e.js": "/work/clone/x" }));
		files.set("package.json", Buffer.from(JSON.stringify({ ...PACKAGE, dependencies: { typebox: "^1.3.27" }, bin: { a: "./dist/bin.js" } })));
		files.set("dist/index.js", Buffer.from("//#region ../../node_modules/x/index.js\n"));
		expect(tarballProblems(files, expected)).toEqual([
			"dist/NOTICE names THIRD-PARTY-LICENSES.md, which the tarball lacks", "package.json: typebox is not at an exact version (^1.3.27)",
			"package.json names dist/bin.js, which the tarball lacks", "dist/x.test.js: a test, .env or .npmrc file",
			"dist/third_party/eng: a third-party file without its LICENSE", "dist/third_party/eng: no row in dist/third_party/manifest.json",
			"dist/third_party/eng/e.js: holds a local path", "dist/index.js: the build inlined a package (node_modules/)",
		]);
	});
});

const listed = (name: string, line: "platform" | "plugins", version: string, needs: readonly string[] = []): ListedPackage => ({ name, folder: `packages/${name}`, line, version, needs });

describe("the version lines", () => {
	it("hold the platform version asked for, and order the publish by dependency", () => {
		const packages = [listed("cli", "platform", "1.0.0", ["sdk"]), listed("sdk", "platform", "1.0.0"), listed("grid", "plugins", "0.1.0", ["sdk"])];
		expect(versionProblems(packages, "1.0.0")).toEqual([]);
		expect(versionProblems(packages, "1.0.1")).toEqual(["the platform line is at 1.0.0, not at 1.0.1"]);
		expect(publishOrder(packages).map((entry) => entry.name)).toEqual(["sdk", "cli", "grid"]);
		expect(publishCommands(packages)[1]).toBe("pnpm --dir packages/sdk publish --access public");
	});

	it("writes both lines into the listed packages and CITATION.cff", () => {
		expect(withVersion('{\n\t"name": "a",\n\t"version": "0.0.0",\n\t"x": { "version": "9" }\n}\n', "1.0.0")).toBe('{\n\t"name": "a",\n\t"version": "1.0.0",\n\t"x": { "version": "9" }\n}\n');
		const manifest = '{\n\t"name": "x",\n\t"version": "0.0.0"\n}\n';
		const list = JSON.stringify({ packages: [{ name: "a", folder: "packages/a", line: "platform" }, { name: "m", folder: "mechanics/m", line: "plugins" }] });
		const root = folderWith({ "scripts/release/packages.json": list, "packages/a/package.json": manifest, "mechanics/m/package.json": manifest, "CITATION.cff": 'cff-version: 1.2.0\nversion: "0.0.0"\n' });
		expect(setVersions(root, "1.0.0", "x", "2026-12-01")).toEqual(["not a version: x"]);
		expect(setVersions(root, "1.0.0", "0.1.0", "2026-12-01")).toEqual([]);
		expect(readFileSync(join(root, "packages/a/package.json"), "utf8")).toContain('"version": "1.0.0"');
		expect(readFileSync(join(root, "mechanics/m/package.json"), "utf8")).toContain('"version": "0.1.0"');
		expect(readFileSync(join(root, "CITATION.cff"), "utf8")).toBe('cff-version: 1.2.0\nversion: "1.0.0"\ndate-released: "2026-12-01"\n');
	});
});

describe("the names of the registry, read with a fake fetch", () => {
	const fake = (answers: Readonly<Record<string, { status: number; body?: unknown }>>): Fetcher => (url) => Promise.resolve({ status: 404, body: undefined, ...answers[url] });

	it("says free, held by the owner, held by another, and the scope", async () => {
		const fetcher = fake({ "https://registry.npmjs.org/swarmtales": { status: 200, body: { maintainers: [{ name: "flo" }] } }, "https://registry.npmjs.org/@swarmtales%2fcli": { status: 200, body: { maintainers: [{ name: "else" }] } } });
		expect((await nameState("swarmtales", fetcher, "flo")).state).toBe("held by the owner");
		expect((await nameState("@swarmtales/cli", fetcher, "flo")).state).toBe("held by another");
		expect((await nameState("create-swarmtales", fetcher, "flo")).state).toBe("free");
		expect((await scopeState(fetcher)).state).toBe("free");
		expect((await nameState("x", fake({ "https://registry.npmjs.org/x": { status: 500 } }))).state).toBe("unknown");
	});
});
