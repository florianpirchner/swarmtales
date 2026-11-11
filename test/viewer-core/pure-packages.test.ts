/**
 * The pure packages (docs/design/viewer-build.md): `@swarmtales/chain` and `@swarmtales/viewer-core`
 * run in a browser and a Web Worker, so their sources import no `node:*` module (nor a bare Node
 * built-in) and use no `Buffer`, `process`, `require` or `__dirname`. Tests may use Node.
 */
import { readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const PURE = ["packages/chain/src", "packages/viewer-core/src"];
const NODE_GLOBALS = new Set(["Buffer", "process", "require", "__dirname", "__filename", "global", "setImmediate"]);
const BUILTINS = new Set(builtinModules);

function sources(dir: string): readonly string[] {
	return readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
		.map((entry) => join(entry.parentPath, entry.name));
}

/** What a source file does that a browser cannot: a Node module import or a Node global. */
function nodeUses(file: string): readonly string[] {
	const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
	const found: string[] = [];
	const visit = (node: ts.Node): void => {
		if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
			const specifier = node.moduleSpecifier.text;
			if (specifier.startsWith("node:") || BUILTINS.has(specifier.split("/")[0] ?? "")) found.push(`imports ${specifier}`);
		}
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const [argument] = node.arguments;
			if (argument !== undefined && ts.isStringLiteral(argument) && argument.text.startsWith("node:")) found.push(`imports ${argument.text}`);
		}
		if (ts.isIdentifier(node) && NODE_GLOBALS.has(node.text)) found.push(`uses ${node.text} (line ${String(source.getLineAndCharacterOfPosition(node.getStart()).line + 1)})`);
		ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
}

describe("the pure packages", () => {
	for (const dir of PURE) {
		it(`${dir} imports no node: module and uses no Node global`, () => {
			const files = sources(dir);
			expect(files.length).toBeGreaterThan(0);
			expect(files.flatMap((file) => nodeUses(file).map((use) => `${file.slice(ROOT.length + 1)}: ${use}`))).toEqual([]);
		});
	}

	it("sees a node: import (this test file has one)", () => {
		const probe = join(ROOT, "test", "viewer-core", "pure-packages.test.ts");
		expect(nodeUses(probe).some((use) => use.startsWith("imports node:fs"))).toBe(true);
	});
});
