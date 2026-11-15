// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Plain mechanics (11-m4-spec.md, section 4.2): a mechanic is the value `defineMechanic` returned, and nothing in
 * `mechanics/*\/src` reaches past the sdk into the kernel's plugin form. The gate fails on
 *
 * - an import or a use of `ResolvedPlugin`, `PluginPort` or `KernelDefinition`, or a use of `.port`;
 * - a declared mechanic (`swarmtales.mechanics` in `package.json`) that `src/index.ts` does not export as
 *   `export const <name> = defineMechanic(...)`, with `defineMechanic` imported from `@swarmtales/sdk`;
 * - a declared mechanic that a file changes afterwards (`<name>.resolve = ...`, `Object.assign(<name>, ...)`);
 * - a loaded mechanic whose `resolve`, or whose set of fields, differs from what `defineMechanic` gives.
 *
 * `decisions` replaced `resolve` and wrapped `create` until M3-34; `fixtures/plain-mechanic/` keeps that file.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Type } from "typebox";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { isSourceFile, listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import { readManifest } from "../mechanic-docs/head.ts";

const FORBIDDEN: ReadonlySet<string> = new Set(["ResolvedPlugin", "PluginPort", "KernelDefinition"]);
const FIXTURE = "scripts/gates/fixtures/plain-mechanic/decisions-before-m3-34.ts.fixture";

function lineOf(source: ts.SourceFile, node: ts.Node): string {
	return String(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
}

function parse(file: string, text: string): ts.SourceFile {
	return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function isNamed(node: ts.Node, names: ReadonlySet<string>): node is ts.Identifier {
	return ts.isIdentifier(node) && names.has(node.text);
}

function fieldOf(node: ts.Node, declared: ReadonlySet<string>): ts.Identifier | undefined {
	return (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && isNamed(node.expression, declared) ? node.expression : undefined;
}

function isAssignment(node: ts.Node): node is ts.BinaryExpression {
	return ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
}

/** A call of `Object.<method>` or `Reflect.<method>` whose first argument is a declared mechanic. */
function reflected(node: ts.Node, declared: ReadonlySet<string>): string | undefined {
	if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || !ts.isIdentifier(node.expression.expression)) return undefined;
	const [first] = node.arguments;
	const owner = ["Object", "Reflect"].includes(node.expression.expression.text);
	return owner && first !== undefined && isNamed(first, declared) ? `passes ${first.text} to ${node.expression.getText()}` : undefined;
}

/** Changes a file makes to a declared mechanic after `defineMechanic` returned it. */
function changes(node: ts.Node, declared: ReadonlySet<string>): string | undefined {
	const assigned = isAssignment(node) ? fieldOf(node.left, declared) : undefined;
	if (assigned !== undefined) return `assigns to a field of ${assigned.text}`;
	const deleted = ts.isDeleteExpression(node) ? fieldOf(node.expression, declared) : undefined;
	if (deleted !== undefined) return `deletes a field of ${deleted.text}`;
	return reflected(node, declared);
}

/**
 * The offences of one source file of a mechanic package.
 *
 * @param file - The path, for the messages.
 * @param text - The source text.
 * @param declared - The export names of the package's mechanics.
 * @returns One line per offence.
 */
function fileOffences(file: string, text: string, declared: ReadonlySet<string>): readonly string[] {
	const source = parse(file, text);
	const offences: string[] = [];
	const visit = (node: ts.Node): void => {
		if (isNamed(node, FORBIDDEN)) offences.push(`${file}:${lineOf(source, node)}: uses ${node.text}, a type of the kernel's plugin form`);
		const port = (ts.isPropertyAccessExpression(node) && node.name.text === "port") || (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === "port");
		if (port) offences.push(`${file}:${lineOf(source, node)}: uses .port, the kernel's plugin port`);
		const change = changes(node, declared);
		if (change !== undefined) offences.push(`${file}:${lineOf(source, node)}: ${change}, so it is no longer the value defineMechanic returned`);
		ts.forEachChild(node, visit);
	};
	visit(source);
	return offences;
}

function importsDefineMechanic(source: ts.SourceFile): boolean {
	return source.statements.some((statement) => {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== "@swarmtales/sdk") return false;
		const bindings = statement.importClause?.namedBindings;
		return bindings !== undefined && ts.isNamedImports(bindings) && bindings.elements.some((element) => !element.isTypeOnly && element.propertyName === undefined && element.name.text === "defineMechanic");
	});
}

function definedPlainly(source: ts.SourceFile, name: string): boolean {
	return source.statements.some((statement) => {
		if (!ts.isVariableStatement(statement) || !(statement.modifiers ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) return false;
		if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) return false;
		return statement.declarationList.declarations.some((declaration) => {
			const init = declaration.initializer;
			return ts.isIdentifier(declaration.name) && declaration.name.text === name && init !== undefined && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === "defineMechanic";
		});
	});
}

/**
 * The offences of the `src/index.ts` of a mechanic package: each declared mechanic is exported as the value of a
 * call of `defineMechanic` from `@swarmtales/sdk`.
 *
 * @param file - The path of the index, for the messages.
 * @param text - Its source text.
 * @param declared - The export names of the package's mechanics.
 * @returns One line per offence.
 */
function indexOffences(file: string, text: string, declared: ReadonlySet<string>): readonly string[] {
	const source = parse(file, text);
	const sdk = importsDefineMechanic(source) ? [] : [`${file}: does not import defineMechanic from @swarmtales/sdk`];
	const plain = [...declared].filter((name) => !definedPlainly(source, name)).map((name) => `${file}: ${name} is not exported as \`export const ${name} = defineMechanic(...)\``);
	return [...sdk, ...plain];
}

/** A mechanic package: its folder and the export names of its mechanics. */
interface MechanicPackage {
	readonly folder: string;
	readonly declared: ReadonlySet<string>;
}

function mechanicPackages(root: string): readonly MechanicPackage[] {
	return listFiles("mechanics", (path) => /^mechanics\/[^/]+\/package\.json$/.test(path), root).flatMap((path) => {
		const field = readManifest(join(root, path))?.swarmtales;
		const kind: unknown = typeof field === "object" && field !== null ? Reflect.get(field, "kind") : undefined;
		const names: unknown = typeof field === "object" && field !== null ? Reflect.get(field, "mechanics") : undefined;
		if (kind !== "mechanic") return [];
		const declared = Array.isArray(names) ? names.filter((name) => typeof name === "string") : [];
		return [{ folder: path.slice(0, -"/package.json".length), declared: new Set(declared) }];
	});
}

function repositoryOffences(root: string): readonly string[] {
	const packages = mechanicPackages(root);
	if (packages.length === 0) return ["mechanics: no mechanic package, so nothing was read"];
	return packages.flatMap(({ folder, declared }) => {
		const files = listFiles(`${folder}/src`, isSourceFile, root);
		if (files.length === 0) return [`${folder}/src: no source file, so nothing was read`];
		const index = `${folder}/src/index.ts`;
		const own = files.includes(index) ? indexOffences(index, readText(index, root), declared) : [`${index}: missing`];
		return [...own, ...files.flatMap((file) => fileOffences(file, readText(file, root), declared))];
	});
}

/** The fields and the `resolve` source of a definition, which a replaced `resolve` or an added field changes. */
function shapeOf(definition: unknown): string {
	const fields = typeof definition === "function" || (typeof definition === "object" && definition !== null) ? Reflect.ownKeys(definition).map(String).sort() : [];
	const resolve: unknown = fields.includes("resolve") && (typeof definition === "function" || typeof definition === "object") && definition !== null ? Reflect.get(definition, "resolve") : undefined;
	return `${fields.join(",")}|${typeof resolve === "function" ? resolve.toString() : "no resolve"}`;
}

async function referenceShape(): Promise<string> {
	const sdk: unknown = await import(pathToFileURL(join(REPO_ROOT, "packages/sdk/src/index.ts")).href);
	const define: unknown = typeof sdk === "object" && sdk !== null ? Reflect.get(sdk, "defineMechanic") : undefined;
	if (typeof define !== "function") throw new TypeError("packages/sdk/src/index.ts exports no defineMechanic");
	const head = { id: "probe", package: "@swarmtales/mechanic-probe", summary: "A probe of the gate.", options: Type.Object({}) };
	const made: unknown = Reflect.apply(define, undefined, [head, {}]);
	return shapeOf(made);
}

async function loadedOffences(root: string, reference: string): Promise<readonly string[]> {
	const offences: string[] = [];
	for (const { folder, declared } of mechanicPackages(root)) {
		const exports: unknown = await import(pathToFileURL(join(root, folder, "src/index.ts")).href);
		for (const name of declared) {
			const definition: unknown = typeof exports === "object" && exports !== null ? Reflect.get(exports, name) : undefined;
			if (shapeOf(definition) !== reference) offences.push(`${folder}/src/index.ts: the loaded ${name} has other fields or another resolve than defineMechanic gives`);
		}
	}
	return offences;
}

const reference = await referenceShape();

describe("plain mechanics (M4, 4.2)", () => {
	it("holds in this repository, in the source and in the loaded values", async () => {
		expect(repositoryOffences(REPO_ROOT)).toEqual([]);
		expect(await loadedOffences(REPO_ROOT, reference)).toEqual([]);
	});

	it("does not pass on nothing: it reads every mechanic package", () => {
		const packages = mechanicPackages(REPO_ROOT);
		expect(packages.length).toBeGreaterThanOrEqual(26);
		expect(packages.find((pkg) => pkg.folder === "mechanics/decisions")?.declared).toEqual(new Set(["decisions"]));
		expect(packages.some((pkg) => pkg.folder === "mechanics/contracts")).toBe(false);
		expect(reference).toContain("resolve(options");
		expect(repositoryOffences(join(REPO_ROOT, "scripts/gates/fixtures"))).toEqual(["mechanics: no mechanic package, so nothing was read"]);
	});

	it("fails on the fixture: decisions as it was before M3-34, wrapping resolve and create", () => {
		const declared = new Set(["decisions"]);
		const text = readText(FIXTURE);
		const offences = [...indexOffences("index.ts", text, declared), ...fileOffences("index.ts", text, declared)];
		expect(offences).toContain("index.ts: decisions is not exported as `export const decisions = defineMechanic(...)`");
		expect(offences).toContain("index.ts:11: uses ResolvedPlugin, a type of the kernel's plugin form");
		expect(offences).toContain("index.ts:136: uses ResolvedPlugin, a type of the kernel's plugin form");
	});

	it("fails on every other way past the plain form", () => {
		const declared = new Set(["counter"]);
		const plain = 'import { defineMechanic } from "@swarmtales/sdk";\nexport const counter = defineMechanic(head, {});\n';
		expect(indexOffences("index.ts", plain, declared)).toEqual([]);
		const cases: readonly (readonly [string, string])[] = [
			['import { defineMechanic as define } from "@swarmtales/sdk";\nexport const counter = define(head, {});\n', "does not import defineMechanic"],
			['import { defineMechanic } from "./local.ts";\nexport const counter = defineMechanic(head, {});\n', "does not import defineMechanic"],
			['import { defineMechanic } from "@swarmtales/sdk";\nconst counter = defineMechanic(head, {});\nexport { counter };\n', "counter is not exported"],
			['import { defineMechanic } from "@swarmtales/sdk";\nexport let counter = defineMechanic(head, {});\n', "counter is not exported"],
			['import { defineMechanic } from "@swarmtales/sdk";\nexport const counter = wrap(defineMechanic(head, {}));\n', "counter is not exported"],
		];
		for (const [text, message] of cases) expect(indexOffences("index.ts", text, declared).join("\n"), message).toContain(message);
		const uses: readonly (readonly [string, string])[] = [
			['import type { PluginPort } from "@swarmtales/contracts";\n', "uses PluginPort"],
			["export const make = (definition: KernelDefinition): void => {};\n", "uses KernelDefinition"],
			["export const actors = (ctx: { port: unknown }): unknown => ctx.port;\n", "uses .port"],
			['export const actors = (ctx: { port: unknown }): unknown => ctx["port"];\n', "uses .port"],
			["counter.resolve = () => undefined;\n", "assigns to a field of counter"],
			['Object.assign(counter, { resolve: () => undefined });\n', "passes counter to Object.assign"],
			['Reflect.set(counter, "create", () => undefined);\n', "passes counter to Reflect.set"],
			["delete counter.head;\n", "deletes a field of counter"],
		];
		for (const [text, message] of uses) expect(fileOffences("other.ts", text, declared).join("\n"), message).toContain(message);
	});

	it("fails on a loaded mechanic whose resolve was replaced or that has a field more", async () => {
		const exile: unknown = await import(pathToFileURL(join(REPO_ROOT, "mechanics/exile/src/index.ts")).href);
		const plain: unknown = typeof exile === "object" && exile !== null ? Reflect.get(exile, "exile") : undefined;
		expect(shapeOf(plain)).toBe(reference);
		const fields = typeof plain === "function" ? Object.fromEntries(Object.entries(plain)) : {};
		expect(shapeOf(Object.assign(() => undefined, fields))).toBe(reference);
		expect(shapeOf(Object.assign(() => undefined, fields, { resolve: () => undefined }))).not.toBe(reference);
		expect(shapeOf(Object.assign(() => undefined, fields, { extra: 1 }))).not.toBe(reference);
	});
});
