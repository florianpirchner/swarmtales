// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm api:freeze`: checks the frozen surface (the text forms under `surface/` are what the code says, the frozen
 * files are those that `docs/API-FREEZE.md` lists, and the gate of `gate.ts` passes). `pnpm api:freeze --write` first
 * writes the text forms, then records the text now of every frozen file that changed into `frozen.json`, once a row of
 * `docs/API-FREEZE.md` names it. `pnpm api:update` keeps writing the API reports; run it first.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../lib/files.ts";
import { freezeProblems, frozenSetProblems, recordFrozen } from "./gate.ts";
import { FROZEN_LIST, listText } from "./records.ts";
import { frozenPaths, SURFACE_FOLDER, surfaceTexts } from "./surface.ts";

const write = process.argv.includes("--write");
const problems: string[] = [];
if (write) mkdirSync(join(REPO_ROOT, SURFACE_FOLDER), { recursive: true });
for (const [path, text] of surfaceTexts()) {
	const file = join(REPO_ROOT, path);
	const current = existsSync(file) ? readFileSync(file, "utf8") : undefined;
	if (current === text) continue;
	if (write) writeFileSync(file, text);
	else problems.push(`${path} is not what the code says: run \`pnpm api:freeze --write\` after adding a row to docs/API-FREEZE.md`);
}
if (write) {
	const recorded = recordFrozen(REPO_ROOT, frozenPaths());
	problems.push(...recorded.problems);
	if (recorded.problems.length === 0) writeFileSync(join(REPO_ROOT, FROZEN_LIST), listText(recorded.files));
}
if (problems.length === 0) problems.push(...frozenSetProblems(REPO_ROOT, frozenPaths()), ...freezeProblems(REPO_ROOT, frozenPaths()));
for (const problem of problems) console.error(`api-freeze: ${problem}`);
console.log(problems.length === 0 ? `api-freeze: ${frozenPaths().length} frozen files, each as recorded` : `api-freeze: ${problems.length} problem(s)`);
process.exitCode = problems.length === 0 ? 0 : 1;
