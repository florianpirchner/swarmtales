/**
 * Packs run folders into a built viewer (`apps/viewer-web/dist` by default): one `runs/<name>.json` per folder (path to
 * text) and `runs/index.json`, so the page opens them without GitHub or a token. For a private copy only (for example a
 * claude.ai artifact): the GitHub Pages check refuses a `runs/` folder.
 *
 *   tsx scripts/bundle-viewer-runs.ts [--out <dist>] [--title <title>] <run-folder>...
 *
 * Only the files the viewer reads are packed (`events.jsonl`, the chain, `run.pub`, the JSON and report files beside it,
 * `agents/*.md`, a `README.md`); per-minute snapshot folders (`NNN-minute/`) are skipped, they would show up as runs.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
	const at = args.indexOf(name);
	if (at < 0) return undefined;
	const value = args[at + 1];
	args.splice(at, 2);
	return value;
};
const out = resolve(process.cwd(), option("--out") ?? join(ROOT, "apps", "viewer-web", "dist"));
const title = option("--title") ?? "bundled runs";
if (args.length === 0) {
	console.error("usage: bundle-viewer-runs.ts [--out <dist>] [--title <title>] <run-folder>...");
	process.exit(1);
}

const SNAPSHOT = /^\d{3}-minute$/;
const READ = /(^|\/)(events\.jsonl|events\.chain\.jsonl|run\.pub|000-run\.json|usage\.json|analysis\.json|REPORT\.md|ANALYSIS\.md|README\.md|agents\/[^/]+\.md)$/;

function files(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? (SNAPSHOT.test(entry.name) ? [] : files(join(dir, entry.name))) : [join(dir, entry.name)]));
}

const target = join(out, "runs");
mkdirSync(target, { recursive: true });
const packs: Record<string, string[]> = {};
for (const folder of args.map((arg) => resolve(process.cwd(), arg))) {
	const name = basename(folder);
	const texts: Record<string, string> = {};
	for (const file of files(folder)) {
		const path = `${name}/${relative(folder, file).split("\\").join("/")}`;
		if (READ.test(path)) texts[path] = readFileSync(file, "utf8");
	}
	writeFileSync(join(target, `${name}.json`), JSON.stringify(texts));
	packs[`${name}.json`] = Object.keys(texts).sort();
}
writeFileSync(join(target, "index.json"), JSON.stringify({ title, packs }));
console.log(`packed ${String(args.length)} runs, ${String(Object.values(packs).flat().length)} files -> ${relative(ROOT, target)}`);
