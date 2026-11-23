// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm pages:pack <data-runs-folder>`: packs the runs of the public viewer page into `apps/viewer-web/dist/runs/`
 * from a checkout of the branch `data/runs`, then checks the whole artifact and prints every file with its size.
 * Run after `pnpm --filter @swarmtales/viewer-web build`, by `.github/workflows/pages.yml`. Exits 1 on a broken rule.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { REPO_ROOT } from "../lib/files.ts";
import { artifactProblems, type ArtifactFile } from "./artifact.ts";
import { packIndex, packRun, PAGES_RUNS, relativePath } from "./runs.ts";

const DIST = join(REPO_ROOT, "apps", "viewer-web", "dist");

function allFiles(dir: string): readonly string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? allFiles(join(dir, entry.name)) : [join(dir, entry.name)]));
}

function pack(dataRuns: string): void {
	const target = join(DIST, "runs");
	mkdirSync(target, { recursive: true });
	const packs: Record<string, Readonly<Record<string, string>>> = {};
	for (const run of PAGES_RUNS) {
		const texts = packRun(join(dataRuns, run.path), run.name);
		if (Object.keys(texts).length === 0) throw new Error(`${run.path}: no run files in ${dataRuns}`);
		packs[`${run.name}.json`] = texts;
		writeFileSync(join(target, `${run.name}.json`), JSON.stringify(texts));
	}
	writeFileSync(join(target, "index.json"), JSON.stringify(packIndex(packs)));
}

function check(): readonly string[] {
	const files: ArtifactFile[] = [];
	let total = 0;
	for (const file of [...allFiles(DIST)].sort()) {
		const path = relativePath(DIST, file);
		const size = statSync(file).size;
		total += size;
		console.log(`${(size / 1024).toFixed(1).padStart(8)} KB  ${path}`);
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
pack(resolve(process.cwd(), dataRuns));
const problems = check();
for (const problem of problems) console.error(`pages artifact: ${problem}`);
if (problems.length > 0) process.exit(1);
console.log(`pages artifact: the app and ${String(PAGES_RUNS.length)} runs`);
