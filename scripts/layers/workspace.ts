// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** Reads the workspace from disk into the description that `rules.ts` checks. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import ts from "typescript";
import { isSourceFile, isTestFile, listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import type { ImportUse, WorkspacePackage } from "./rules.ts";
import { WORKSPACE_FOLDERS } from "./table.ts";

const Names = Type.Optional(Type.Record(Type.String(), Type.String()));
const Manifest = Type.Object({
	name: Type.String(),
	swarmtales: Type.Optional(
		Type.Object({ layer: Type.Optional(Type.Union([Type.Integer(), Type.String({ pattern: "^L[0-9]$" })])), class: Type.Optional(Type.String()) }),
	),
	dependencies: Names,
	peerDependencies: Names,
	devDependencies: Names,
});

/**
 * Lists the module specifiers a source text imports: `import`, `export ... from`, `import()` and `require()`,
 * type-only imports included.
 *
 * @param text - The source text.
 * @returns The specifiers in order of appearance.
 */
export function importsOf(text: string): readonly string[] {
	return ts.preProcessFile(text, true, true).importedFiles.map((file) => file.fileName);
}

/**
 * Counts the `import(...)` and `require(...)` calls whose target is not a string, so no check can read it.
 *
 * @param text - The source text.
 * @returns The number of such calls.
 */
export function computedImportsOf(text: string): number {
	const source = ts.createSourceFile("imports.ts", text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
	let count = 0;
	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node)) {
			const loads = node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require");
			const [target] = node.arguments;
			if (loads && (target === undefined || !ts.isStringLiteralLike(target))) count += 1;
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return count;
}

function importUses(file: string, text: string): readonly ImportUse[] {
	const inTest = isTestFile(file);
	const computed = Array.from({ length: computedImportsOf(text) }, () => ({ file, specifier: "", inTest, computed: true }));
	return [...importsOf(text).map((specifier) => ({ file, specifier, inTest })), ...computed];
}

/** The layer id of a manifest: `"L3"` as written, or the number `3` of the first scaffold. */
function layerId(layer: number | string | undefined): string | undefined {
	return typeof layer === "number" ? `L${layer}` : layer;
}

function readPackage(folder: string, root: string): WorkspacePackage {
	const raw: unknown = JSON.parse(readText(`${folder}/package.json`, root));
	if (!Value.Check(Manifest, raw)) throw new TypeError(`${folder}/package.json: needs a "name"; "swarmtales.layer" is "L0" to "L6"; the dependency fields map names to versions`);
	const imports: ImportUse[] = listFiles(folder, isSourceFile, root).flatMap((file) => importUses(file, readText(file, root)));
	return {
		name: raw.name,
		folder,
		layer: layerId(raw.swarmtales?.layer),
		mechanicClass: raw.swarmtales?.class,
		dependencies: [...Object.keys(raw.dependencies ?? {}), ...Object.keys(raw.peerDependencies ?? {})],
		devDependencies: Object.keys(raw.devDependencies ?? {}),
		imports,
	};
}

/**
 * Reads the packages that the root `package.json` declares: the tools of the workspace.
 *
 * @param root - The root to read from; the repository root when left out.
 * @returns The names under its dependency fields.
 */
export function readRootTools(root: string = REPO_ROOT): ReadonlySet<string> {
	const raw: unknown = JSON.parse(readText("package.json", root));
	if (!Value.Check(Manifest, raw)) throw new TypeError("package.json: the dependency fields map names to versions");
	return new Set([raw.dependencies, raw.devDependencies, raw.peerDependencies].flatMap((group) => Object.keys(group ?? {})));
}

/**
 * Reads every workspace package.
 *
 * @param root - The root to read from; the repository root when left out.
 * @returns The packages of the workspace folders, in a stable order.
 * @throws TypeError when a `package.json` has no name or malformed dependency fields.
 */
export function readWorkspace(root: string = REPO_ROOT): readonly WorkspacePackage[] {
	return WORKSPACE_FOLDERS.flatMap((top) => {
		if (!existsSync(join(root, top))) return [];
		return readdirSync(join(root, top), { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && existsSync(join(root, top, entry.name, "package.json")))
			.map((entry) => readPackage(`${top}/${entry.name}`, root))
			.sort((a, b) => a.folder.localeCompare(b.folder, "en"));
	});
}
