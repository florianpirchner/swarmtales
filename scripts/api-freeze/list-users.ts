// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The listing of issue M5-50 (section 5.4 of the M5 specification), committed by M5-51 (J284) and widened to the base
 * mechanics and `mechanics/contracts` (J283): every export of a frozen surface, with the files outside its package
 * that import it by name. Run from the repository root:
 *
 *   node scripts/api-freeze/list-users.ts [--json]
 *
 * It prints, per surface, the exports with no user outside the package and its tests: those tagged `@internal`, those
 * that the report's signature of a used export names, and those with neither. Users are counted from import and
 * export-from declarations, `import("…").X` type nodes and `ns.X` after a namespace import, in every .ts, .tsx and
 * .mts file of the workspace folders, outside node_modules, dist and temp.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import ts from "typescript";

/** One frozen surface: a package, its entry files by import specifier, and its committed report. */
interface Surface {
	readonly name: string;
	readonly folder: string;
	readonly report: string;
	readonly entries: ReadonlyMap<string, string>;
}

/** One export of a surface, with its users outside the package and, without a user, the used export that names it. */
interface ExportRow {
	readonly name: string;
	readonly internal: boolean;
	readonly users: readonly string[];
	readonly via?: string;
}

const ROOT = process.cwd();
const PACKAGES = ["contracts", "kernel", "sdk", "engine", "chain", "prompts", "runlog", "testkit", "models"];
const MECHANICS = ["channels", "consensus", "decisions", "exile", "human-hand", "ledger", "team-channel", "contracts"];
const ALIASES: Readonly<Record<string, string>> = { swarmtales: "sdk", "swarmtales/mechanic": "sdk", "swarmtales/testing": "testkit" };
const FOLDERS = ["packages", "mechanics", "games", "samples", "apps", "scripts"];
const SKIP = new Set(["node_modules", "dist", "temp", ".git"]);
const ManifestSchema = Type.Object(
	{ exports: Type.Record(Type.String({ description: "The subpath" }), Type.Object({ development: Type.String({ description: "The source file" }) }, { description: "The conditions of a subpath" }), { description: "The entries" }) },
	{ description: "The part of a mechanic's package.json the listing reads" },
);

function packageSurface(name: string): Surface {
	const entries = new Map([[`@swarmtales/${name}`, join(ROOT, "packages", name, "src", "index.ts")]]);
	for (const [alias, target] of Object.entries(ALIASES)) if (target === name) entries.set(alias, join(ROOT, "packages", name, "src", "index.ts"));
	return { name, folder: `packages${sep}${name}${sep}`, report: join(ROOT, "packages", name, `${name}.api.md`), entries };
}

function mechanicSurface(name: string): Surface {
	const folder = join(ROOT, "mechanics", name);
	const manifest: unknown = JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
	const subpaths = Value.Check(ManifestSchema, manifest) ? Object.entries(manifest.exports) : [];
	const entries = new Map(subpaths.map(([key, value]) => [`@swarmtales/mechanic-${name}${key.slice(1)}`, join(folder, value.development)]));
	return { name: `mechanic-${name}`, folder: `mechanics${sep}${name}${sep}`, report: join(folder, `mechanic-${name}.api.md`), entries };
}

function walk(dir: string, out: string[]): void {
	for (const name of readdirSync(dir)) {
		if (SKIP.has(name)) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else if (/\.(ts|tsx|mts)$/.test(name) && !name.endsWith(".d.ts")) out.push(path);
	}
}

function isInternal(declaration: ts.Declaration): boolean {
	if (ts.getJSDocTags(declaration).some((tag) => tag.tagName.text === "internal")) return true;
	return /@internal\b/.test(ts.getJSDocCommentsAndTags(declaration).map((node) => node.getText()).join("\n"));
}

/** The export names of the entry files of a surface, with whether each is tagged `@internal`. */
function exportsOf(surface: Surface): ReadonlyMap<string, boolean> {
	const files = [...new Set(surface.entries.values())];
	const options = { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, target: ts.ScriptTarget.ES2023, allowImportingTsExtensions: true, noEmit: true, customConditions: ["development"] };
	const program = ts.createProgram(files, options);
	const checker = program.getTypeChecker();
	const result = new Map<string, boolean>();
	for (const entry of files) {
		const source = program.getSourceFile(entry);
		const symbol = source && checker.getSymbolAtLocation(source);
		for (const exported of symbol ? checker.getExportsOfModule(symbol) : []) {
			const real = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
			result.set(exported.name, (result.get(exported.name) ?? false) || (real.declarations ?? []).some(isInternal));
		}
	}
	return result;
}

/** Who uses what: by surface name, by export name, the files. */
type Users = Map<string, Map<string, Set<string>>>;

function use(users: Users, surface: string, name: string, file: string): void {
	const byName = users.get(surface) ?? new Map<string, Set<string>>();
	users.set(surface, byName);
	const files = byName.get(name) ?? new Set<string>();
	byName.set(name, files);
	files.add(relative(ROOT, file));
}

type Add = (surface: string, name: string) => void;

function importUses(node: ts.ImportDeclaration, surface: string, namespaces: Map<string, string>, add: Add): void {
	const bindings = node.importClause?.namedBindings;
	if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) add(surface, (element.propertyName ?? element.name).text);
	if (bindings && ts.isNamespaceImport(bindings)) namespaces.set(bindings.name.text, surface);
}

function moduleUses(node: ts.Node, bySpecifier: ReadonlyMap<string, string>, namespaces: Map<string, string>, add: Add): void {
	if (!(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) || !node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) return;
	const surface = bySpecifier.get(node.moduleSpecifier.text);
	if (surface === undefined) return;
	if (ts.isImportDeclaration(node)) importUses(node, surface, namespaces, add);
	else exportUses(node, surface, add);
}

function exportUses(node: ts.ExportDeclaration, surface: string, add: Add): void {
	if (node.exportClause && ts.isNamedExports(node.exportClause)) for (const element of node.exportClause.elements) add(surface, (element.propertyName ?? element.name).text);
}

function importTypeUse(node: ts.Node, bySpecifier: ReadonlyMap<string, string>, add: Add): void {
	if (!ts.isImportTypeNode(node) || !ts.isLiteralTypeNode(node.argument) || !ts.isStringLiteral(node.argument.literal) || !node.qualifier) return;
	const surface = bySpecifier.get(node.argument.literal.text);
	const first = ts.isIdentifier(node.qualifier) ? node.qualifier : node.qualifier.left;
	if (surface !== undefined && ts.isIdentifier(first)) add(surface, first.text);
}

function namespaceUse(node: ts.Node, namespaces: ReadonlyMap<string, string>, add: Add): void {
	if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
		const surface = namespaces.get(node.expression.text);
		if (surface !== undefined) add(surface, node.name.text);
	}
	if (ts.isQualifiedName(node) && ts.isIdentifier(node.left)) {
		const surface = namespaces.get(node.left.text);
		if (surface !== undefined) add(surface, node.right.text);
	}
}

/** Records the uses of one file. */
function fileUses(file: string, bySpecifier: ReadonlyMap<string, string>, users: Users): void {
	const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ES2023, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
	const namespaces = new Map<string, string>();
	const add: Add = (surface, name) => {
		use(users, surface, name, file);
	};
	const visit = (node: ts.Node): void => {
		moduleUses(node, bySpecifier, namespaces, add);
		importTypeUse(node, bySpecifier, add);
		namespaceUse(node, namespaces, add);
		ts.forEachChild(node, visit);
	};
	visit(source);
}

/** The declaration blocks of a committed report, by the name each declares. */
function reportBlocks(report: string): ReadonlyMap<string, string> {
	const blocks = new Map<string, string>();
	for (const chunk of readFileSync(report, "utf8").split("\n\n")) {
		const match = /^export (?:declare )?(?:abstract )?(?:function|const|let|interface|type|class|enum|namespace) ([A-Za-z_$][\w$]*)/m.exec(chunk);
		if (match?.[1]) blocks.set(match[1], (blocks.get(match[1]) ?? "") + chunk.slice(match.index + match[0].length));
	}
	return blocks;
}

/** The exports reachable from the used ones through the report's signatures, each with the first one that reached it. */
function closure(report: string, names: readonly string[], roots: readonly string[]): ReadonlyMap<string, string> {
	const blocks = reportBlocks(report);
	const reached = new Map<string, string>(roots.map((name) => [name, ""]));
	const queue = [...roots];
	for (let from = queue.shift(); from !== undefined; from = queue.shift()) {
		const body = blocks.get(from) ?? "";
		for (const name of names) {
			if (reached.has(name) || !new RegExp(`\\b${name.replace("$", "\\$")}\\b`).test(body)) continue;
			reached.set(name, from);
			queue.push(name);
		}
	}
	return reached;
}

function rowsOf(surface: Surface, users: Users): readonly ExportRow[] {
	const rows = [...exportsOf(surface)].map(([name, internal]) => ({ name, internal, users: [...(users.get(surface.name)?.get(name) ?? [])].filter((file) => !file.startsWith(surface.folder)).sort() }));
	const used = rows.filter((row) => row.users.length > 0 && !row.internal).map((row) => row.name);
	const reached = closure(surface.report, rows.map((row) => row.name), used);
	return rows.map((row) => (row.users.length === 0 && reached.has(row.name) ? { ...row, via: reached.get(row.name) ?? "" } : row)).sort((a, b) => a.name.localeCompare(b.name));
}

/** Lists every export of the frozen surfaces with its users, by surface. */
function listUsers(): Readonly<Record<string, readonly ExportRow[]>> {
	const surfaces = [...PACKAGES.map(packageSurface), ...MECHANICS.map(mechanicSurface)];
	const bySpecifier = new Map(surfaces.flatMap((surface) => [...surface.entries.keys()].map((specifier) => [specifier, surface.name] as const)));
	const files: string[] = [];
	for (const folder of FOLDERS) walk(join(ROOT, folder), files);
	const users: Users = new Map();
	for (const file of files) fileUses(file, bySpecifier, users);
	return Object.fromEntries(surfaces.map((surface) => [surface.name, rowsOf(surface, users)]));
}

function print(listing: Readonly<Record<string, readonly ExportRow[]>>): void {
	for (const [name, rows] of Object.entries(listing)) {
		const none = rows.filter((row) => row.users.length === 0);
		const signature = none.filter((row) => row.via !== undefined && !row.internal);
		const bare = none.filter((row) => row.via === undefined && !row.internal);
		console.log(`== ${name}: ${rows.length} exports, ${none.length} without a user outside the package: ${none.filter((row) => row.internal).length} @internal, ${signature.length} in a used signature, ${bare.length} neither`);
		for (const row of signature) console.log(`   [signature of ${row.via ?? ""}] ${row.name}`);
		for (const row of bare) console.log(`   [NONE] ${row.name}`);
	}
}

const listing = listUsers();
if (process.argv.includes("--json")) console.log(JSON.stringify(listing, null, 2));
else print(listing);
