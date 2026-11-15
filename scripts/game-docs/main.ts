// SPDX-License-Identifier: Apache-2.0
/**
 * `pnpm docs:games`: writes the generated blocks of `GAMES.md` from `games/index.ts`, the game files and the
 * catalogue, then lists what is still wrong. With `--check` it writes nothing. It exits 1 on any problem. It runs
 * on source: `node --conditions=development`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GAMES } from "../../games/index.ts";
import { REPO_ROOT } from "../lib/files.ts";
import { catalogueProblems, gameBlocks, withBlocks } from "./docs.ts";
import { loadHeads } from "./head.ts";

const file = join(REPO_ROOT, "GAMES.md");
const heads = await loadHeads(REPO_ROOT, GAMES);
const before = readFileSync(file, "utf8");
const after = withBlocks(before, gameBlocks(REPO_ROOT, heads));
if (!process.argv.includes("--check") && after !== before) {
	writeFileSync(file, after);
	console.log("wrote GAMES.md");
}
const problems = catalogueProblems(REPO_ROOT, process.argv.includes("--check") ? before : after, heads);
for (const problem of problems) console.error(problem);
console.log(problems.length === 0 ? "GAMES.md: current" : `GAMES.md: ${problems.length} problem(s)`);
process.exitCode = problems.length === 0 ? 0 : 1;
