// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The shape of the workspace: the rules that make sure every gate sees every package. A package in a folder that
 * no gate reads, without a `tsconfig.json`, or without an API report would pass the check unseen.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { WORKSPACE_FOLDERS } from "../layers/table.ts";
import { isSourceFile, listFiles, readText, REPO_ROOT, SKIPPED_FOLDERS } from "./files.ts";

/** The folders whose packages are published and therefore carry an API report. */
export const PUBLISHED_FOLDERS = ["packages", "mechanics"] as const;

const Manifest = Type.Object({ name: Type.String(), scripts: Type.Optional(Type.Record(Type.String(), Type.String())) });
const Tsconfig = Type.Object({ references: Type.Optional(Type.Array(Type.Object({ path: Type.String() }))) });

/**
 * Lists the package folders of the workspace: every folder that holds a `package.json`, the root left out.
 *
 * @param root - The root to read from.
 * @returns The folders, relative to the root.
 */
export function packageFolders(root: string = REPO_ROOT): readonly string[] {
	return listFiles(".", (path) => path.endsWith("/package.json"), root).map((path) => path.slice(0, -"/package.json".length));
}

/**
 * Reads the package globs of `pnpm-workspace.yaml`.
 *
 * @param text - The text of the file.
 * @returns The entries of its `packages:` list.
 */
export function workspaceGlobs(text: string): readonly string[] {
	const lines = text.split(/\r?\n/);
	const start = lines.findIndex((line) => /^packages:\s*$/.test(line));
	const globs: string[] = [];
	for (const line of start < 0 ? [] : lines.slice(start + 1)) {
		const entry = /^\s+-\s*["']?([^"'\s]+)["']?\s*$/.exec(line)?.[1];
		if (entry === undefined) break;
		globs.push(entry);
	}
	return globs;
}

function publishedOffences(folder: string, name: string, scripts: Readonly<Record<string, string>>, has: (file: string) => boolean): readonly string[] {
	const report = `${name.split("/").at(-1) ?? ""}.api.md`;
	return [
		...["build", "api"].filter((script) => scripts[script] === undefined).map((script) => `${folder}/package.json: no "${script}" script, so the gate skips the package`),
		...(has("api-extractor.json") ? [] : [`${folder}: no api-extractor.json`]),
		...(has(report) ? [] : [`${folder}: no committed API report ${report}; run pnpm api:update`]),
	];
}

function packageOffences(folder: string, root: string, referenced: ReadonlySet<string>): readonly string[] {
	const has = (file: string): boolean => existsSync(join(root, folder, file));
	const raw: unknown = JSON.parse(readText(`${folder}/package.json`, root));
	if (!Value.Check(Manifest, raw)) return [`${folder}/package.json: needs a "name"; "scripts" maps names to commands`];
	const inner = (path: string): string => path.slice(folder.length + 1);
	const stray = listFiles(folder, isSourceFile, root).filter((path) => inner(path).includes("/") && !/^(src|test)\//.test(inner(path)));
	const published = PUBLISHED_FOLDERS.some((top) => folder.startsWith(`${top}/`));
	return [
		...(has("tsconfig.json") ? [] : [`${folder}: no tsconfig.json, so the typecheck does not see the package`]),
		...(referenced.has(folder) ? [] : [`${folder}: the root tsconfig.json does not reference it, so the typecheck does not see the package`]),
		...stray.map((path) => `${path}: a package holds source under src/ and test/ only, and configuration files at its root`),
		...(published ? publishedOffences(folder, raw.name, raw.scripts ?? {}, has) : []),
	];
}

/**
 * Checks the shape of the workspace.
 *
 * @param root - The root to read from; the repository root when left out.
 * @returns One message per broken rule; an empty list when every package is where the gates look.
 */
export function workspaceShapeOffences(root: string = REPO_ROOT): readonly string[] {
	const expected = WORKSPACE_FOLDERS.map((folder) => `${folder}/*`);
	const globs = workspaceGlobs(readText("pnpm-workspace.yaml", root));
	const tsconfig: unknown = JSON.parse(readText("tsconfig.json", root));
	const referenced = new Set(Value.Check(Tsconfig, tsconfig) ? (tsconfig.references ?? []).map((reference) => reference.path.replace(/^\.\//, "")) : []);
	const folders = packageFolders(root);
	const misplaced = folders.filter((folder) => !WORKSPACE_FOLDERS.some((top) => new RegExp(`^${top}/[^/]+$`).test(folder)));
	const aliased = listFiles(".", (path) => /(^|\/)tsconfig[^/]*\.json$/.test(path), root).filter((path) => /"(paths|baseUrl)"\s*:/.test(readText(path, root)));
	return [
		...(JSON.stringify(globs) === JSON.stringify(expected) ? [] : [`pnpm-workspace.yaml: the packages must be ${expected.join(", ")} (scripts/layers/table.ts), found ${globs.join(", ") || "none"}`]),
		...misplaced.map((folder) => `${folder}: a package.json outside ${expected.join(", ")}; no gate reads a package there`),
		...aliased.map((path) => `${path}: "paths" and "baseUrl" hide imports from the layer check; import packages by name`),
		...folders.filter((folder) => !misplaced.includes(folder)).flatMap((folder) => packageOffences(folder, root, referenced)),
	];
}

/**
 * Finds tracked files that the gates do not read, because a folder on their path has a skipped name.
 *
 * @param tracked - The paths that git tracks, relative to the root.
 * @returns The hidden paths.
 */
export function hiddenFromGates(tracked: readonly string[]): readonly string[] {
	return tracked.filter((path) => path.split("/").slice(0, -1).some((part) => SKIPPED_FOLDERS.has(part)));
}
