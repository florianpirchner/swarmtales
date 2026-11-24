// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm pages:pack <data-runs-folder>`: packs every run of a checkout of the branch `data/runs` into
 * `apps/viewer-web/dist/runs/`, then checks the whole artifact and prints its size.
 * Run after `pnpm --filter @swarmtales/viewer-web build`, by `.github/workflows/pages.yml`. Exits 1 on a broken rule.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { REPO_ROOT } from "../lib/files.ts";
import { artifactProblems, type ArtifactFile } from "./artifact.ts";
import { META_PACK, packAll, packIndex, relativePath } from "./runs.ts";

const DIST = join(REPO_ROOT, "apps", "viewer-web", "dist");

function allFiles(dir: string): readonly string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? allFiles(join(dir, entry.name)) : [join(dir, entry.name)]));
}

function pack(dataRuns: string): number {
	const target = join(DIST, "runs");
	mkdirSync(target, { recursive: true });
	const packs = packAll(dataRuns);
	const count = Object.keys(packs.runs).length;
	if (count === 0) throw new RangeError(`${dataRuns}: no run folder (a folder with an events.jsonl)`);
	writeFileSync(join(target, META_PACK), JSON.stringify(packs.meta));
	for (const [file, texts] of Object.entries(packs.runs)) writeFileSync(join(target, file), JSON.stringify(texts));
	writeFileSync(join(target, "index.json"), JSON.stringify(packIndex(packs)));
	return count;
}

function check(): readonly string[] {
	const files: ArtifactFile[] = [];
	let total = 0;
	for (const file of [...allFiles(DIST)].sort()) {
		const path = relativePath(DIST, file);
		const size = statSync(file).size;
		total += size;
		files.push({ path, text: readFileSync(file, "utf8") });
	}
	console.log(`${(total / 1024).toFixed(1).padStart(8)} KB  total, ${String(files.length)} files`);
	return artifactProblems(files);
}

const dataRuns = process.argv[2];
if (dataRuns === undefined) {
	console.error("usage: pnpm pages:pack <data-runs-folder>");
	process.exit(1);
}
const count = pack(resolve(process.cwd(), dataRuns));
const problems = check();
for (const problem of problems) console.error(`pages artifact: ${problem}`);
if (problems.length > 0) process.exit(1);
console.log(`pages artifact: the app and ${String(count)} runs`);
