// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The plan of the rename (`13-m6-spec.md` 4.4): every folder and file it moves, every line it changes, every line
 * where an old id stays by an exception, and the clashes that stop it. It reads a tree and writes nothing.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Exception, Rename } from "./table.ts";

/** A folder or a file that moves; its paths as they stand when the moves before it are done. */
export interface Move {
	readonly from: string;
	readonly to: string;
}

/** A changed line, by the file's path before the moves and its line number from 1. */
export interface Edit {
	readonly path: string;
	readonly line: number;
	readonly before: string;
	readonly after: string;
}

/** A line where an old id stays, with the reason of its exception. */
export interface Kept {
	readonly path: string;
	readonly line: number;
	readonly text: string;
	readonly reason: string;
}

/** What the rename would do. An apply refuses a plan with a clash. */
export interface Plan {
	readonly moves: readonly Move[];
	readonly edits: readonly Edit[];
	readonly kept: readonly Kept[];
	readonly clashes: readonly string[];
}

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** An old id, not inside a longer word and not the start of a longer name (`<id>-nobrain`, `<id>-s7.json`). */
const idPattern = (renames: readonly Rename[]): RegExp => new RegExp(`(?<![A-Za-z0-9])(${renames.map((rename) => escaped(rename.from)).join("|")})(?![A-Za-z0-9]|-[A-Za-z0-9])`, "g");

const wholeFile = (exception: Exception): boolean => exception.line === undefined && exception.before === undefined && exception.after === undefined;
const inPath = (exception: Exception, path: string): boolean => exception.path === undefined || exception.path.test(path);

// The reason an id at `index` of a line stays, or undefined.
function keptAt(exceptions: readonly Exception[], path: string, line: string, index: number, length: number): string | undefined {
	const [before, after] = [line.slice(0, index), line.slice(index + length)];
	const found = exceptions.find((exception) => !wholeFile(exception) && exception.line === undefined && inPath(exception, path) && (exception.before?.test(before) ?? true) && (exception.after?.test(after) ?? true));
	return found?.reason;
}

interface Renamer {
	readonly renames: readonly Rename[];
	readonly exceptions: readonly Exception[];
	readonly to: ReadonlyMap<string, string>;
}

// One line rewritten, with the reasons of the ids it keeps.
function renamedLine(renamer: Renamer, path: string, line: string): { readonly text: string; readonly kept: readonly string[] } {
	const kept: string[] = [];
	const text = line.replace(idPattern(renamer.renames), (id: string, _group: string, index: number) => {
		const reason = keptAt(renamer.exceptions, path, line, index, id.length);
		if (reason !== undefined) kept.push(reason);
		return reason === undefined ? (renamer.to.get(id) ?? id) : id;
	});
	return { text, kept };
}

function linesOf(renamer: Renamer, root: string, path: string): { readonly edits: readonly Edit[]; readonly kept: readonly Kept[] } {
	const text = readFileSync(join(root, path), "utf8");
	const [edits, kept]: [Edit[], Kept[]] = [[], []];
	if (text.includes("\u0000") || !idPattern(renamer.renames).test(text)) return { edits, kept };
	text.split("\n").forEach((line, index) => {
		const byLine = renamer.exceptions.find((exception) => exception.line !== undefined && inPath(exception, path) && exception.line.test(line));
		const renamed = byLine === undefined ? renamedLine(renamer, path, line) : { text: line, kept: idPattern(renamer.renames).test(line) ? [byLine.reason] : [] };
		if (renamed.text !== line) edits.push({ path, line: index + 1, before: line, after: renamed.text });
		for (const reason of new Set(renamed.kept)) kept.push({ path, line: index + 1, text: line, reason });
	});
	return { edits, kept };
}

// The first move a path still needs: its first segment with an old id, as a folder (or the file itself).
function firstMove(renamer: Renamer, paths: readonly string[]): Move | undefined {
	for (const path of paths) {
		const parts = path.split("/");
		const index = parts.findIndex((part) => renamedLine(renamer, path, part).text !== part);
		const part = parts[index];
		if (part !== undefined) return { from: parts.slice(0, index + 1).join("/"), to: [...parts.slice(0, index), renamedLine(renamer, path, part).text].join("/") };
	}
	return undefined;
}

function movesOf(renamer: Renamer, files: readonly string[]): readonly Move[] {
	const moves: Move[] = [];
	let paths = files;
	for (let move = firstMove(renamer, paths); move !== undefined; move = firstMove(renamer, paths)) {
		const { from, to } = move;
		moves.push(move);
		paths = paths.map((path) => (path === from || path.startsWith(`${from}/`) ? `${to}${path.slice(from.length)}` : path));
	}
	return moves;
}

const folders = (root: string, folder: string): readonly string[] => (existsSync(join(root, folder)) ? readdirSync(join(root, folder), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) : []);

// The ids of a kind in one table: the folders under `mechanics/` or `games/`, and the names of `games/index.ts`.
function tableOf(root: string, kind: Rename["kind"]): ReadonlySet<string> {
	if (kind === "mechanic") return new Set(folders(root, "mechanics"));
	const index = join(root, "games", "index.ts");
	const named = existsSync(index) ? [...readFileSync(index, "utf8").matchAll(/name: "([^"]+)"/g)].map((match) => match[1] ?? "") : [];
	return new Set([...folders(root, "games"), ...named]);
}

function clashesOf(root: string, renames: readonly Rename[], moves: readonly Move[]): readonly string[] {
	// A rename whose old id the table no longer holds is applied, and its new id is its own.
	const idClashes = renames.filter((rename) => tableOf(root, rename.kind).has(rename.from)).flatMap((rename) => {
		const others = [...tableOf(root, rename.kind)].filter((id) => !renames.some((other) => other.kind === rename.kind && other.from === id));
		const twice = renames.filter((other) => other.kind === rename.kind && other.to === rename.to).length > 1;
		return others.includes(rename.to) || twice ? [`the ${rename.kind} ${rename.from} would be named ${rename.to}, an id the ${rename.kind}s already hold`] : [];
	});
	const taken = moves.filter((move, index) => existsSync(join(root, move.to)) || moves.slice(0, index).some((earlier) => earlier.to === move.to));
	return [...idClashes, ...taken.map((move) => `${move.from} would move to ${move.to}, which is taken`)];
}

/**
 * Plans the rename of a tree: the files git tracks in it.
 *
 * @param root - The tree's root, the root of a git work tree.
 * @param renames - The renamed ids.
 * @param exceptions - The places where an old id stays.
 * @returns The moves, the changed lines, the lines that keep an old id, and the clashes.
 */
export function planRename(root: string, renames: readonly Rename[], exceptions: readonly Exception[]): Plan {
	const renamer: Renamer = { renames, exceptions, to: new Map(renames.map((rename) => [rename.from, rename.to])) };
	const tracked = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 }).stdout.split("\u0000").filter((path) => path !== "" && existsSync(join(root, path)));
	const files = tracked.filter((path) => !exceptions.some((exception) => wholeFile(exception) && inPath(exception, path)));
	const lines = files.map((path) => linesOf(renamer, root, path));
	const moves = movesOf(renamer, files);
	return { moves, edits: lines.flatMap((one) => one.edits), kept: lines.flatMap((one) => one.kept), clashes: clashesOf(root, renames, moves) };
}
