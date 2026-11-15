// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm docs:errors`: writes `docs/reference/errors.md` from the code catalogues of all packages. With `--check` it
 * writes nothing and exits 1 when the page is not what the source says. Either way it exits 1 when a code has no
 * summary, why or fix in the source, and lists them.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../lib/files.ts";
import { errorPage, ERRORS_PAGE } from "./page.ts";

const path = join(REPO_ROOT, ERRORS_PAGE);
const page = errorPage();
const current = existsSync(path) ? readFileSync(path, "utf8") : undefined;
const problems = [...page.gaps];
if (process.argv.includes("--check")) {
	if (current !== page.text) problems.push(`${ERRORS_PAGE} is stale: run \`pnpm docs:errors\``);
} else if (current !== page.text) {
	writeFileSync(path, page.text);
	console.log(`wrote ${ERRORS_PAGE}`);
}
for (const problem of problems) console.error(problem);
console.log(problems.length === 0 ? `error reference: current, ${page.entries.length} codes` : `error reference: ${problems.length} problem(s)`);
process.exitCode = problems.length === 0 ? 0 : 1;
