// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Issue M6-34: the facts of a manifest that name the source of a run. An installed `swt` asks no git about the
 * user's project (lesson P502), and every plugin is recorded under the version of its package (lesson P503).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scriptedSource } from "@swarmtales/models";
import { guessNumber } from "@swarmtales/testkit";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runLive, type LiveInput } from "../src/live.ts";
import { main, type CliIo } from "../src/main.ts";
import { cloneRoot, readSourceTree } from "../src/tree.ts";

const GAME = fileURLToPath(new URL("./fixtures/guess-number.ts", import.meta.url));
const HELLO = fileURLToPath(new URL("../../../games/hello/game.ts", import.meta.url));
const read = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const versionOf = (file: string): unknown => Reflect.get(Object(read(file)), "version");

let temp = "";
const at = (...parts: readonly string[]): string => join(temp, ...parts);
const put = (value: unknown, ...parts: readonly string[]): void => {
	mkdirSync(at(...parts.slice(0, -1)), { recursive: true });
	writeFileSync(at(...parts), JSON.stringify(value));
};
const git = (directory: string, ...args: readonly string[]): string => execFileSync("git", ["-C", directory, "-c", "user.name=t", "-c", "user.email=t@example.test", "-c", "commit.gpgsign=false", ...args], { encoding: "utf8" }).trim();

// A user's project that is a git repository, committed and then made dirty, with the command line installed under its `node_modules`.
function userProject(name: string, projectName: string): { readonly cli: string; readonly commit: string } {
	put({ name: projectName, version: "3.1.4", private: true }, name, "package.json");
	put({ name: "@swarmtales/cli", version: "1.0.0" }, name, "node_modules", "@swarmtales", "cli", "package.json");
	writeFileSync(at(name, ".gitignore"), "node_modules\n");
	git(at(name), "init", "--quiet");
	git(at(name), "add", ".");
	git(at(name), "commit", "--quiet", "--no-verify", "-m", "the user's commit");
	writeFileSync(at(name, "notes.txt"), "a change the user has not committed");
	return { cli: at(name, "node_modules", "@swarmtales", "cli"), commit: git(at(name), "rev-parse", "HEAD") };
}

beforeAll(() => {
	temp = mkdtempSync(join(tmpdir(), "swt-sources-"));
});
afterAll(() => {
	rmSync(temp, { recursive: true, force: true });
});

describe("an installed swt asks no git about the user's project (P502)", () => {
	const experiment = { id: "guess-small", specHash: "0".repeat(64), arm: "small" };
	const io = (cwd: string): CliIo => ({ cwd, now: () => new Date("2026-11-21T12:00:00.000Z"), out: () => undefined, err: () => undefined, installed: { "guess-number": guessNumber } });
	const input = (more: Partial<LiveInput>): LiveInput => ({ file: GAME, seed: undefined, out: "runs", json: false, provider: "anthropic", budget: 1, purpose: "smoke", replicate: 0, env: { ARENA_ANTHROPIC_API_KEY: `canary${"q".repeat(34)}` }, source: scriptedSource({}), ...more });

	it("reads no tree for a command line under the node_modules of a git project, also one whose package is named like a clone", () => {
		for (const projectName of ["user-project", "swarmtales-workspace"]) {
			const { cli } = userProject(`tree-${projectName}`, projectName);
			expect(cloneRoot(cli)).toBeUndefined();
			expect(readSourceTree(cli)).toEqual({ installed: true });
		}
	});

	it("records neither the user's commit nor its state in a live manifest, and plays a confirmatory run of the installed release", async () => {
		const { cli, commit } = userProject("live", "user-project");
		const tree = readSourceTree(cli);
		expect((await runLive(input({ tree }), io(at("live")))).code).toBe(0);
		const manifest = JSON.stringify(read(at("live", "runs", "guess-number-001", "manifest.json")));
		expect([manifest.includes(commit), manifest.includes('"dirty"'), manifest.includes('"commit"')]).toEqual([false, false, false]);
		const confirmatory = await runLive(input({ tree, purpose: "confirmatory", experiment }), io(at("live")));
		expect([confirmatory.code, confirmatory.issues]).toEqual([0, []]);
	});

	it("still asks git in a clone, and refuses a confirmatory run on a dirty clone", async () => {
		const own = fileURLToPath(new URL("..", import.meta.url));
		const root = cloneRoot(own) ?? "";
		expect(versionOf(join(root, "package.json"))).toBeDefined();
		expect(readSourceTree(own).commit).toMatch(/^[0-9a-f]{40,64}$/);
		const refused = await runLive(input({ tree: { commit: "c".repeat(40), dirty: true }, purpose: "confirmatory", experiment }), io(at("live")));
		expect(refused.issues.map((issue) => issue.code)).toEqual(["SWT-C023"]);
	});
});

describe("every plugin of a manifest has the version of its package (P503)", () => {
	it("records the Hello Game's grid at the version of @swarmtales/mechanic-grid and the roster at that of the sdk", async () => {
		mkdirSync(at("hello"));
		const code = await main(["run", HELLO, "--fake", "--out", at("hello", "runs")], { cwd: at("hello"), now: () => new Date("2026-11-21T12:00:00.000Z"), out: () => undefined, err: () => undefined });
		expect(code).toBe(0);
		const plugins: unknown = Reflect.get(Object(read(at("hello", "runs", "hello-game-001", "manifest.json"))), "plugins");
		const grid = fileURLToPath(new URL("../../../mechanics/grid/package.json", import.meta.url));
		const sdk = fileURLToPath(new URL("../../../packages/sdk/package.json", import.meta.url));
		expect(plugins).toMatchObject([
			{ id: "grid", package: "@swarmtales/mechanic-grid", version: versionOf(grid) },
			{ id: "roster", package: "@swarmtales/sdk", version: versionOf(sdk) },
		]);
		expect(JSON.stringify(plugins)).not.toContain('"0.0.0"');
	});
});
