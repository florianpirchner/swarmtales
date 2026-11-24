// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * How the public viewer page carries the recorded runs: every run folder of the branch `data/runs` (a folder with an
 * `events.jsonl`), packed next to the page, so the page opens them without GitHub and without a token while the
 * repository is private (the owner's go of 2026-11-24: the runs may be public). The shape is the one
 * `apps/viewer-web/src/bundled-source.ts` reads: `runs/index.json` names the packs and the paths in each.
 *
 * The run list reads only the small header files of every run, so those go into one shared pack (`runs/meta.json`);
 * the log and the rest of a run go into the run's own pack, fetched when the run is opened.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** The title the page shows over the packed runs. */
export const PAGES_TITLE = "Swarm Tales: recorded runs";

/** The pack of the header files of all runs. */
export const META_PACK = "meta.json";

/** The files of a run folder the run list reads, for every run at page start. */
const HEADER = /^(manifest\.json|000-run\.json|usage\.json)$/;

/** The other files of a run folder the viewer reads: the log, its chain and key, the game, the texts, the reports, the transcripts. */
const BODY = /^(events\.jsonl|events\.chain\.jsonl|run\.pub|game\.json|texts\.json|analysis\.json|REPORT\.md|ANALYSIS\.md|README\.md|agents\/[^/]+\.md)$/;

/** Path to text, for the files of one pack. */
export type Pack = Readonly<Record<string, string>>;

/** The packs of the page: the shared header pack and one pack per run, by file name. */
export interface Packs {
	readonly meta: Pack;
	readonly runs: Readonly<Record<string, Pack>>;
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

/**
 * The run folders below a root: every folder with an `events.jsonl`, not searched further, in path order.
 *
 * @param root - The checkout of `data/runs`.
 * @returns The folders, relative to the root.
 */
export function runFolders(root: string): readonly string[] {
	const found: string[] = [];
	const walk = (dir: string): void => {
		if (existsSync(join(dir, "events.jsonl"))) {
			found.push(relativePath(root, dir));
			return;
		}
		for (const entry of readdirSync(dir, { withFileTypes: true })) if (entry.isDirectory() && !entry.name.startsWith(".")) walk(join(dir, entry.name));
	};
	walk(root);
	return found.sort();
}

/**
 * The file name of a run's pack: its path with `/` as `__`.
 *
 * @param run - The run folder, relative to the root.
 * @returns The pack's file name.
 */
export function packName(run: string): string {
	return `${run.split("/").join("__")}.json`;
}

/**
 * The files of a run folder that the viewer reads, relative to the folder: the files in it and its transcripts.
 *
 * @param folder - The run folder on disk.
 * @returns The paths, sorted.
 */
function filesOf(folder: string): readonly string[] {
	const out: string[] = [];
	for (const entry of readdirSync(folder, { withFileTypes: true })) {
		if (entry.isFile()) out.push(entry.name);
		else if (entry.isDirectory() && entry.name === "agents") out.push(...readdirSync(join(folder, "agents")).map((name) => `agents/${name}`));
	}
	return out.sort();
}

/**
 * Packs every run folder below a root.
 *
 * @param root - The checkout of `data/runs`.
 * @returns The header pack and the run packs; keys are paths relative to the root.
 */
export function packAll(root: string): Packs {
	const meta: Record<string, string> = {};
	const runs: Record<string, Pack> = {};
	for (const run of runFolders(root)) {
		const body: Record<string, string> = {};
		for (const file of filesOf(join(root, run))) {
			const text = (): string => readFileSync(join(root, run, file), "utf8");
			if (HEADER.test(file)) meta[`${run}/${file}`] = text();
			else if (BODY.test(file)) body[`${run}/${file}`] = text();
		}
		runs[packName(run)] = body;
	}
	return { meta, runs };
}

/**
 * The index of the packs, as `bundled-source.ts` reads it.
 *
 * @param packs - The packs.
 * @returns The index object.
 */
export function packIndex(packs: Packs): { readonly title: string; readonly packs: Readonly<Record<string, readonly string[]>> } {
	const all: Record<string, Pack> = { [META_PACK]: packs.meta, ...packs.runs };
	return { title: PAGES_TITLE, packs: Object.fromEntries(Object.entries(all).map(([file, texts]) => [file, Object.keys(texts).sort()])) };
}
