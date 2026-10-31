/**
 * `pnpm mutants <list.json> [id ...]`: runs the listed source mutations (packages/testkit,
 * `runMutants`) in a hard-linked copy of the repository and prints one verdict per mutant. Exits 1
 * when a mutant survived or did not apply, so a round's gate can be re-run as one command.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMutations, runMutants } from "@swarmtales/testkit";

const [list, ...only] = process.argv.slice(2);
if (list === undefined) {
	console.error("usage: pnpm mutants <list.json> [id ...]");
	process.exit(2);
}
const root = resolve(import.meta.dirname, "..");
const all = parseMutations(readFileSync(resolve(list), "utf8"), list);
const mutations = only.length === 0 ? all : all.filter((mutation) => only.includes(mutation.id));
const results = runMutants({ root, mutations });
for (const result of results) {
	console.log(`${result.verdict.padEnd(8)} ${result.id}`);
	if (result.verdict !== "killed") console.log(result.detail.replace(/^/gm, "         "));
}
process.exit(results.every((result) => result.verdict === "killed") ? 0 : 1);
