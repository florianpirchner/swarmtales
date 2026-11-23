// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The runs the public viewer page carries, and how they are packed next to it. The page is public while the
 * repository is private, so it carries only the runs listed here (the owner's go of 2026-11-23): the README links
 * them, and they open without a token. Each run becomes one `runs/<name>.json` (path to text) beside a
 * `runs/index.json`, the shape `apps/viewer-web/src/bundled-source.ts` reads.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** One run the page carries. */
export interface PagesRun {
	/** The run folder's name: the folder in the pack and the `run=` of a link into the page. */
	readonly name: string;
	/** The folder on the branch `data/runs`. */
	readonly path: string;
}

/** The title the page shows over the packed runs. */
export const PAGES_TITLE = "Swarm Tales: recorded runs";

/** The runs of the page, in the order of the README. */
export const PAGES_RUNS: readonly PagesRun[] = [
	{ name: "econ-lab-007", path: "econ-lab/econ-lab-brain/econ-lab-007" },
	{ name: "hello-game-001", path: "hello/release/hello-game-001" },
	{ name: "whispers-001", path: "whispers/smoke/whispers-001" },
];

/** The files of a run folder the viewer reads: the log, its chain and key, the manifest, the game, the texts, the reports. */
const READ = /^(events\.jsonl|events\.chain\.jsonl|run\.pub|manifest\.json|game\.json|texts\.json|usage\.json|REPORT\.md|README\.md)$/;

/**
 * The names of the files of a folder, sorted, with the folders below it (paths with `/`).
 *
 * @param dir - The folder.
 * @returns The paths relative to `dir`.
 */
function filesOf(dir: string): readonly string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) out.push(...filesOf(join(dir, entry.name)).map((path) => `${entry.name}/${path}`));
		else out.push(entry.name);
	}
	return out.sort();
}

/**
 * Packs one run folder: the files the viewer reads, keyed `<name>/<file>`.
 *
 * @param folder - The run folder on disk.
 * @param name - The run's name in the pack.
 * @returns Path to text.
 */
export function packRun(folder: string, name: string): Readonly<Record<string, string>> {
	const texts: Record<string, string> = {};
	for (const path of filesOf(folder)) if (READ.test(path)) texts[`${name}/${path}`] = readFileSync(join(folder, path), "utf8");
	return texts;
}

/**
 * The index of the packs, as `bundled-source.ts` reads it.
 *
 * @param packs - Pack file name to the packed texts.
 * @returns The index object.
 */
export function packIndex(packs: Readonly<Record<string, Readonly<Record<string, string>>>>): { readonly title: string; readonly packs: Readonly<Record<string, readonly string[]>> } {
	return { title: PAGES_TITLE, packs: Object.fromEntries(Object.entries(packs).map(([file, texts]) => [file, Object.keys(texts).sort()])) };
}

/**
 * A path relative to a root, with `/`.
 *
 * @param root - The root.
 * @param path - A path below it.
 * @returns The relative path.
 */
export function relativePath(root: string, path: string): string {
	return relative(root, path).split("\\").join("/");
}
