// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rename script (issue M6-05, `13-m6-spec.md` 4.4): it renames a fixture tree, keeps the old id where an
 * exception says so, refuses a clash, and its dry run on this repository plans the changes of 4.3 and no
 * model-facing text.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { REPO_ROOT } from "../lib/files.ts";
import { planRename } from "./plan.ts";
import { applyRename, describePlan } from "./rename.ts";
import { EXCEPTIONS, RENAMES, type Rename } from "./table.ts";

const FIXTURE: Readonly<Record<string, string>> = {
	"mechanics/old-mech/package.json": '{ "name": "@swarmtales/mechanic-old-mech" }\n',
	"mechanics/old-mech/mechanic-old-mech.api.md": "## API Report File for \"@swarmtales/mechanic-old-mech\"\n",
	"mechanics/old-mech/src/head.ts": 'export const head = { id: "old-mech", tool: "old-mech/tools/play" };\nconst rng = ctx.rng("old-mech", "deal");\n// A port of `stories/old-game/story.ts`.\n',
	"mechanics/old-mech/prompts/old-mech/tools/play.md": "---\nid: old-mech/tools/play\n---\nPlay old-mech now.\n",
	"mechanics/other/package.json": '{ "name": "@swarmtales/mechanic-other" }\n',
	"games/old-game/game.ts": 'import { oldMech } from "@swarmtales/mechanic-old-mech";\nexport const game = { id: "old-game", win: { fact: "old-mech.tally" } };\nconst variants = { "old-game-solo": {} };\n',
	"games/old-game/RUNS.md": "| run | `old-game/smoke/old-game-001` | games/old-game |\n",
	"games/index.ts": 'export const GAMES = [{ name: "old-game", file: "games/old-game/game.ts" }];\n',
	"oracles/old-game/old-game-s7.json": '{ "id": "old-mech" }\n',
	"tsconfig.json": '{ "references": [{ "path": "mechanics/old-mech" }, { "path": "games/old-game" }] }\n',
};
const TABLE: readonly Rename[] = [
	{ kind: "mechanic", from: "old-mech", to: "new-mech" },
	{ kind: "game", from: "old-game", to: "new-game" },
];

const roots: string[] = [];
function fixtureTree(): string {
	const root = mkdtempSync(join(tmpdir(), "swt-rename-"));
	roots.push(root);
	for (const [path, text] of Object.entries(FIXTURE)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	for (const args of [["init", "-q"], ["add", "-A"]]) spawnSync("git", args, { cwd: root });
	return root;
}
afterAll(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true });
});
const read = (root: string, path: string): string => readFileSync(join(root, path), "utf8");

describe("the rename of a fixture tree", () => {
	it("moves folders and files, rewrites ids and package names, and keeps what the exceptions keep", () => {
		const root = fixtureTree();
		const plan = planRename(root, TABLE, EXCEPTIONS);
		expect(plan.clashes).toEqual([]);
		expect(plan.moves).toEqual([
			{ from: "games/old-game", to: "games/new-game" },
			{ from: "mechanics/old-mech", to: "mechanics/new-mech" },
			{ from: "mechanics/new-mech/mechanic-old-mech.api.md", to: "mechanics/new-mech/mechanic-new-mech.api.md" },
			{ from: "mechanics/new-mech/prompts/old-mech", to: "mechanics/new-mech/prompts/new-mech" },
		]);
		expect(plan.kept.map((kept) => `${kept.path}:${String(kept.line)}`)).toEqual(["games/old-game/RUNS.md:1", "mechanics/old-mech/prompts/old-mech/tools/play.md:4", "mechanics/old-mech/src/head.ts:2", "mechanics/old-mech/src/head.ts:3"]);
		expect(describePlan(plan).at(-1)).toBe("4 moves, 9 changed lines in 8 files, 4 kept lines, 0 clashes");
		applyRename(root, plan, false);
		expect(read(root, "games/new-game/game.ts")).toBe('import { oldMech } from "@swarmtales/mechanic-new-mech";\nexport const game = { id: "new-game", win: { fact: "new-mech.tally" } };\nconst variants = { "old-game-solo": {} };\n');
		expect(read(root, "mechanics/new-mech/src/head.ts")).toBe('export const head = { id: "new-mech", tool: "new-mech/tools/play" };\nconst rng = ctx.rng("old-mech", "deal");\n// A port of `stories/old-game/story.ts`.\n');
		expect(read(root, "mechanics/new-mech/prompts/new-mech/tools/play.md")).toBe("---\nid: new-mech/tools/play\n---\nPlay old-mech now.\n");
		expect(read(root, "mechanics/new-mech/mechanic-new-mech.api.md")).toContain('"@swarmtales/mechanic-new-mech"');
		expect(read(root, "games/new-game/RUNS.md")).toBe("| run | `old-game/smoke/old-game-001` | games/new-game |\n");
		expect([read(root, "games/index.ts"), read(root, "tsconfig.json")].join("")).not.toMatch(/old-(game|mech)/);
		expect(read(root, "oracles/old-game/old-game-s7.json")).toBe(FIXTURE["oracles/old-game/old-game-s7.json"]);
		expect(existsSync(join(root, "mechanics/old-mech"))).toBe(false);
		const tracked = spawnSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).stdout;
		expect(tracked).toContain("mechanics/new-mech/prompts/new-mech/tools/play.md");
		expect(tracked).not.toMatch(/^(games\/old-game|mechanics\/old-mech)\//m);
	});

	it("refuses a new id that another mechanic holds, or a taken folder, and applies nothing", () => {
		const root = fixtureTree();
		const plan = planRename(root, [{ kind: "mechanic", from: "old-mech", to: "other" }], EXCEPTIONS);
		expect(plan.clashes).toEqual(["the mechanic old-mech would be named other, an id the mechanics already hold", "mechanics/old-mech would move to mechanics/other, which is taken"]);
		expect(() => {
			applyRename(root, plan, false);
		}).toThrow(/2 clash\(es\), nothing applied/);
		expect(read(root, "games/old-game/game.ts")).toBe(FIXTURE["games/old-game/game.ts"]);
	});
});

// After the apply (issue M6-06) the dry run finds nothing left to do; before it, it plans the rename.
const applied = !existsSync(join(REPO_ROOT, "mechanics", "grid-game"));

describe("the dry run on this repository", () => {
	const plan = planRename(REPO_ROOT, RENAMES, EXCEPTIONS);
	const ids = RENAMES.map((rename) => rename.from).join("|");

	it.runIf(applied)("finds nothing left to rename once the rename is applied", () => {
		expect([plan.moves, plan.edits, plan.clashes]).toEqual([[], [], []]);
	});

	it.skipIf(applied)("plans the moves and the changes of 4.3 without a clash", () => {
		expect(plan.clashes).toEqual([]);
		const folders = RENAMES.map((rename) => `${rename.kind === "game" ? "games" : "mechanics"}/${rename.from} -> ${rename.kind === "game" ? "games" : "mechanics"}/${rename.to}`);
		expect(plan.moves.map((move) => `${move.from} -> ${move.to}`)).toEqual(expect.arrayContaining([...folders, "mechanics/grid/prompts/grid-game -> mechanics/grid/prompts/grid"]));
		const changed = new Set(plan.edits.map((edit) => edit.path));
		for (const path of ["tsconfig.json", "pnpm-lock.yaml", "games/index.ts", "GAMES.md", "README.md", "mechanics/grid-game/package.json", "mechanics/grid-game/src/head.ts", "games/tictactoe-teams/game.ts"]) expect(changed).toContain(path);
		expect(plan.edits.map((edit) => edit.after)).toContain('\t"name": "@swarmtales/mechanic-grid",');
	});

	it.skipIf(applied)("changes no model-facing text, random label, oracle file or record", () => {
		const prompts = plan.edits.filter((edit) => /\/prompts\/.*\.md$/.test(edit.path));
		expect(prompts.length).toBeGreaterThan(0);
		expect(prompts.filter((edit) => !edit.before.startsWith("id: "))).toEqual([]);
		expect(plan.edits.filter((edit) => new RegExp(`rng\\(\\s*"(${ids})"`).test(edit.before) && !new RegExp(`rng\\(\\s*"(${ids})"`).test(edit.after))).toEqual([]);
		expect(plan.kept.filter((kept) => kept.text.includes("ctx.rng(")).length).toBeGreaterThan(0);
		expect(plan.edits.filter((edit) => /^(oracles\/|docs\/refactoring-before-release\/|apps\/cli\/test\/fixtures\/|games\/[^/]+-ledger\.jsonl)/.test(edit.path))).toEqual([]);
	});
});
