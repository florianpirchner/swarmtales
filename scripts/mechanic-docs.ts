// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm docs:mechanics`: writes the generated blocks of every mechanic's README (docs/MECHANIC-README.md) from the
 * heads, and creates a README with all sections for a mechanic that has none. It then lists what is still wrong.
 * With `--check` it writes nothing. It exits 1 on any problem. It runs on source: `node --conditions=development`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/files.ts";
import { docsProblems, readmeTargets, skeleton, withBlocks } from "./mechanic-docs/readme.ts";

if (!process.argv.includes("--check")) {
	for (const target of await readmeTargets(REPO_ROOT)) {
		const path = join(REPO_ROOT, target.file);
		const before = existsSync(path) ? readFileSync(path, "utf8") : undefined;
		const after = before === undefined ? skeleton(target.folder, target.blocks) : withBlocks(before, target.blocks);
		if (after === before) continue;
		writeFileSync(path, after);
		console.log(`wrote ${target.file}`);
	}
}
const problems = await docsProblems(REPO_ROOT);
for (const problem of problems) console.error(problem);
console.log(problems.length === 0 ? "mechanic READMEs: current" : `mechanic READMEs: ${problems.length} problem(s)`);
process.exitCode = problems.length === 0 ? 0 : 1;
