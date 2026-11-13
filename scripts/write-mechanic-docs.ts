/**
 * `pnpm docs:mechanics`: writes the generated blocks of every mechanic README (scripts/mechanic-docs.ts) and creates a
 * README with every section for a mechanic that has none. `--check` writes nothing and exits 1 when a README is missing,
 * lacks a section, still holds a placeholder or has a stale block (what `test/scripts/mechanic-docs.test.ts` checks too).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { readmeProblems, readmeTargets, skeleton, unknownFolders, withBlocks } from "./mechanic-docs.ts";

const ROOT = resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");
const problems: string[] = unknownFolders(ROOT).map((folder) => `mechanics/${folder}: not listed in MECHANICS of scripts/mechanic-docs.ts`);
let written = 0;
for (const target of readmeTargets(ROOT)) {
	const file = relative(ROOT, target.file);
	if (!existsSync(target.file)) {
		if (check) problems.push(`${file}: missing`);
		else {
			writeFileSync(target.file, skeleton(target.title, target.sections, target.blocks));
			written++;
			problems.push(`${file}: created with placeholders; write its handwritten sections`);
		}
		continue;
	}
	const before = readFileSync(target.file, "utf8");
	if (!check) {
		const after = withBlocks(before, target.blocks);
		if (after !== before) {
			writeFileSync(target.file, after);
			written++;
		}
	}
	problems.push(...readmeProblems(file, check ? before : withBlocks(before, target.blocks), target.sections, target.blocks));
}
if (!check) console.log(`mechanic docs: ${String(written)} README(s) written`);
for (const problem of problems) console.error(problem);
process.exitCode = problems.length > 0 ? 1 : 0;
