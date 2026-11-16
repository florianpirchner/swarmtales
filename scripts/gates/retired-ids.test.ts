// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The name lint's retired ids (`13-m6-spec.md` 4.4, issue M6-06): after the rename an old mechanic or game id, or
 * its old package name, stands only where an exception of the rename keeps it (oracle files, run data, carried docs,
 * records, paths of the old platform, random labels, prompt texts, this list and its test). The plan of the rename with the retired ids as
 * its table is the check: it must find nothing to move and no line to change, and keep the lines the exceptions keep.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { REPO_ROOT } from "../lib/files.ts";
import { RETIRED_IDS } from "../lib/names.ts";
import { planRename, type Plan } from "../rename/plan.ts";
import { EXCEPTIONS } from "../rename/table.ts";

/** Where a tree still uses a retired id: every move and changed line the plan of the retired ids finds. */
function offences(root: string): { readonly found: readonly string[]; readonly plan: Plan } {
	const plan = planRename(root, RETIRED_IDS.map((retired) => ({ kind: retired.kind, from: retired.id, to: retired.use })), EXCEPTIONS);
	return { found: [...plan.moves.map((move) => `${move.from}: a path with a retired id`), ...plan.edits.map((edit) => `${edit.path}:${String(edit.line)}: ${edit.before.trim()}`)], plan };
}

const roots: string[] = [];
afterAll(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function tree(files: Readonly<Record<string, string>>): string {
	const root = mkdtempSync(join(tmpdir(), "swt-retired-ids-"));
	roots.push(root);
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	for (const args of [["init", "-q"], ["add", "-A"]]) spawnSync("git", args, { cwd: root });
	return root;
}

describe("the retired ids of the rename", () => {
	it("list the package of every id", () => {
		for (const retired of RETIRED_IDS) expect(retired.pkg).toBe(`@swarmtales/${retired.kind}-${retired.id}`);
	});

	it("stand in this repository only where an exception of the rename keeps them", () => {
		const { found, plan } = offences(REPO_ROOT);
		expect(found).toEqual([]);
		expect(plan.kept.length).toBeGreaterThan(0);
	});

	it("are found in code, docs and paths outside the exceptions, and left where an exception keeps them", () => {
		const root = tree({
			"games/hello/game.ts": 'import { grid } from "@swarmtales/mechanic-grid-game";\n',
			"docs/SCHEDULERS.md": "The `tictactoe-teams` game.\n",
			"mechanics/sealed-auction/README.md": "x\n",
			"oracles/tictactoe/tictactoe-teams-s7.json": '{ "id": "grid-game" }\n',
			"mechanics/blind-bid/src/flow.ts": 'const draw = ctx.rng("sealed-auction", "tie");\n',
		});
		expect(offences(root).found).toEqual(["mechanics/sealed-auction: a path with a retired id", 'docs/SCHEDULERS.md:1: The `tictactoe-teams` game.', 'games/hello/game.ts:1: import { grid } from "@swarmtales/mechanic-grid-game";']);
	});
});
