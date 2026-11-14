// SPDX-License-Identifier: Apache-2.0
/**
 * Done-when 4 of milestone M3: `exile` names no other mechanic. The gate reads `mechanics/exile/package.json` and
 * every file under `mechanics/exile/src/` and finds no mechanic package, no import that leaves the package for
 * another one under `mechanics/`, and no mechanic, service, event or tool id of another mechanic in a string of
 * the code. The head has an empty `requires` and an empty `uses`. Comments are prose and are not read.
 */
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { computedImportsOf, importsOf } from "../layers/workspace.ts";
import { isSourceFile, listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import { loadMechanics, readManifest } from "../mechanic-docs/head.ts";

const EXILE = "mechanics/exile";
const Names = Type.Optional(Type.Record(Type.String(), Type.String()));
const Manifest = Type.Object({ name: Type.String(), dependencies: Names, peerDependencies: Names, optionalDependencies: Names, devDependencies: Names });

/** What `exile` must not name: gathered from the heads and the manifests of the other packages under `mechanics/`. */
interface Foreign {
	/** The npm names of the mechanic packages (`swarmtales.kind` is `mechanic`). */
	readonly mechanics: ReadonlySet<string>;
	/** The npm names of every other package under `mechanics/`, the shared contracts included. */
	readonly packages: ReadonlySet<string>;
	/** An id to what it is, for example `vote` to "the tool `vote` of `court`". */
	readonly ids: ReadonlyMap<string, string>;
	/** The mechanic ids: also refused as a word inside a longer string, and as the owner of a dotted or slashed id. */
	readonly owners: ReadonlySet<string>;
}

async function foreignOf(root: string): Promise<Foreign> {
	const others = (await loadMechanics(root)).filter((mechanic) => `mechanics/${mechanic.folder}` !== EXILE);
	const ids = new Map<string, string>();
	for (const { head } of others) {
		ids.set(head.id, `the mechanic \`${head.id}\``);
		for (const service of head.provides) ids.set(service.name, `the service \`${service.name}\` of \`${head.id}\``);
		for (const event of Object.keys(head.events)) ids.set(event, `the event \`${event}\` of \`${head.id}\``);
		for (const tool of head.tools) ids.set(tool.name, `the tool \`${tool.name}\` of \`${head.id}\``);
	}
	const folders = listFiles("mechanics", (path) => /^mechanics\/[^/]+\/package\.json$/.test(path), root).filter((path) => dirname(path) !== EXILE);
	const names = folders.map((path) => readManifest(join(root, path))?.name).filter((name) => typeof name === "string");
	return { mechanics: new Set(others.map((mechanic) => mechanic.packageName)), packages: new Set(names), ids, owners: new Set(others.map((mechanic) => mechanic.head.id)) };
}

function packageOf(specifier: string, packages: ReadonlySet<string>): string | undefined {
	return [...packages].find((name) => specifier === name || specifier.startsWith(`${name}/`));
}

function manifestOffences(root: string, foreign: Foreign): readonly string[] {
	const raw: unknown = JSON.parse(readText(`${EXILE}/package.json`, root));
	if (!Value.Check(Manifest, raw)) return [`${EXILE}/package.json: not a package manifest`];
	const fields = { dependencies: raw.dependencies, peerDependencies: raw.peerDependencies, optionalDependencies: raw.optionalDependencies, devDependencies: raw.devDependencies };
	return Object.entries(fields).flatMap(([field, names]) =>
		Object.keys(names ?? {})
			.filter((name) => foreign.mechanics.has(name))
			.map((name) => `${EXILE}/package.json: ${field} names the mechanic package ${name}`),
	);
}

function importOffences(file: string, text: string, foreign: Foreign): readonly string[] {
	const offences = importsOf(text).flatMap((specifier) => {
		if (specifier.startsWith(".")) return posix.join(dirname(file), specifier).startsWith(`${EXILE}/`) ? [] : [`${file}: the import "${specifier}" leaves the package`];
		const name = packageOf(specifier, foreign.packages);
		return name === undefined ? [] : [`${file}: imports "${specifier}" of ${name}, a package under mechanics/`];
	});
	return computedImportsOf(text) === 0 ? offences : [...offences, `${file}: an import whose target is computed, so the gate cannot read it`];
}

/** The strings of the code: literals and the fixed parts of templates. Comments are no node and are left out. */
function stringsOf(source: ts.SourceFile): readonly string[] {
	const found: string[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddleOrTemplateTail(node)) found.push(node.text);
		ts.forEachChild(node, visit);
	};
	visit(source);
	return found;
}

function named(text: string, foreign: Foreign): string | undefined {
	const exact = foreign.ids.get(text);
	if (exact !== undefined) return exact;
	const owner = [...foreign.owners].find((id) => new RegExp(`(^|[^A-Za-z0-9_-])${id}($|[^A-Za-z0-9_-])`).test(text));
	return owner === undefined ? undefined : `the mechanic \`${owner}\``;
}

/** A head that names a service to require or to use: any `requires` or `uses` that is not an empty list. */
function headOffences(file: string, source: ts.SourceFile): readonly string[] {
	const offences: string[] = [];
	const visit = (node: ts.Node): void => {
		const key = (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && ts.isIdentifier(node.name) ? node.name.text : undefined;
		const empty = ts.isPropertyAssignment(node) && ts.isArrayLiteralExpression(node.initializer) && node.initializer.elements.length === 0;
		if ((key === "requires" || key === "uses") && !empty) offences.push(`${file}: \`${key}\` is not an empty list`);
		ts.forEachChild(node, visit);
	};
	visit(source);
	return offences;
}

function exileOffences(root: string, foreign: Foreign): readonly string[] {
	const files = listFiles(`${EXILE}/src`, isSourceFile, root);
	if (files.length === 0) return [`${EXILE}/src: no source file, so nothing was read`];
	const offences = [...manifestOffences(root, foreign)];
	for (const file of files) {
		const text = readText(file, root);
		const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
		offences.push(...importOffences(file, text, foreign), ...headOffences(file, source));
		for (const string of stringsOf(source)) {
			const what = named(string, foreign);
			if (what !== undefined) offences.push(`${file}: the string ${JSON.stringify(string)} names ${what}`);
		}
	}
	return offences;
}

/** A copy of the real `exile` (manifest and source) with files added or replaced. */
function fixture(files: Readonly<Record<string, string>>): string {
	const root = mkdtempSync(join(tmpdir(), "swt-exile-"));
	mkdirSync(join(root, EXILE), { recursive: true });
	cpSync(join(REPO_ROOT, EXILE, "package.json"), join(root, EXILE, "package.json"));
	cpSync(join(REPO_ROOT, EXILE, "src"), join(root, EXILE, "src"), { recursive: true });
	for (const [path, text] of Object.entries(files)) writeFileSync(join(root, EXILE, path), text);
	return root;
}

const foreign = await foreignOf(REPO_ROOT);

describe("exile names no other mechanic (M3, done-when 4)", () => {
	it("holds in this repository", async () => {
		expect(exileOffences(REPO_ROOT, foreign)).toEqual([]);
		const head = (await loadMechanics(REPO_ROOT)).find((mechanic) => mechanic.folder === "exile")?.head;
		expect(head?.id).toBe("exile");
		expect(head?.requires).toEqual([]);
		expect(head?.uses).toEqual([]);
	});

	it("does not pass on nothing: it knows the other mechanics and reads the code of exile", () => {
		expect(foreign.mechanics).toContain("@swarmtales/mechanic-puzzles");
		expect(foreign.packages).toContain("@swarmtales/mechanic-contracts");
		expect(foreign.mechanics.has("@swarmtales/mechanic-exile")).toBe(false);
		for (const id of ["puzzles", "ledger", "court", "channels", "decisions", "humanHand", "factor_burned", "board_post", "transferPoints", "vote"]) expect(foreign.ids.has(id)).toBe(true);
		for (const own of ["exile", "exiled"]) expect(foreign.ids.has(own)).toBe(false);
		const files = listFiles(`${EXILE}/src`, isSourceFile);
		expect(files).toEqual([`${EXILE}/src/contract.ts`, `${EXILE}/src/index.ts`]);
		const strings = files.flatMap((file) => stringsOf(ts.createSourceFile(file, readText(file), ts.ScriptTarget.Latest)));
		expect(strings).toContain("exiled");
		expect(strings).toContain("@swarmtales/mechanic-exile");
		expect(exileOffences(fixture({}), foreign)).toEqual([]);
		expect(exileOffences(mkdtempSync(join(tmpdir(), "swt-exile-")), { ...foreign, mechanics: new Set() })[0] ?? "").toContain("no source file");
	});

	it("fails on a fixture in which exile names puzzles", () => {
		const manifest: unknown = JSON.parse(readText(`${EXILE}/package.json`));
		if (!Value.Check(Manifest, manifest)) throw new TypeError("the manifest of exile does not parse");
		const cases: readonly (readonly [Readonly<Record<string, string>>, string])[] = [
			[{ "package.json": JSON.stringify({ ...manifest, dependencies: { ...manifest.dependencies, "@swarmtales/mechanic-puzzles": "workspace:*" } }) }, "dependencies names the mechanic package @swarmtales/mechanic-puzzles"],
			[{ "package.json": JSON.stringify({ ...manifest, devDependencies: { "@swarmtales/mechanic-puzzles": "workspace:*" } }) }, "devDependencies names the mechanic package"],
			[{ "src/pieces.ts": 'import type { Pieces } from "@swarmtales/mechanic-puzzles/contract";\nexport type Held = Pieces;\n' }, 'imports "@swarmtales/mechanic-puzzles/contract"'],
			[{ "src/pieces.ts": 'export { puzzles } from "../../puzzles/src/index.ts";\n' }, "leaves the package"],
			[{ "src/pieces.ts": 'export const load = (name: string): Promise<unknown> => import(name);\n' }, "computed"],
			[{ "src/pieces.ts": 'import { ConsensusSource } from "@swarmtales/mechanic-contracts";\nexport const source = ConsensusSource;\n' }, "a package under mechanics/"],
			[{ "src/pieces.ts": 'export const order = { after: ["puzzles"] };\n' }, 'the string "puzzles" names the mechanic `puzzles`'],
			[{ "src/pieces.ts": 'export const burned = "factor_burned";\n' }, "names the event `factor_burned` of `puzzles`"],
			[{ "src/pieces.ts": "export const prompt = (id: string): string => `puzzles/replies/${id}`;\n" }, "names the mechanic `puzzles`"],
			[{ "src/pieces.ts": 'export const summary = "Banishes a resident; the puzzles mechanic burns its pieces.";\n' }, "names the mechanic `puzzles`"],
			[{ "src/pieces.ts": 'export const tool = "transferPoints";\n' }, "names the tool `transferPoints` of `ledger`"],
			[{ "src/pieces.ts": 'export const service = "channels";\n' }, "`channels`"],
			[{ "src/pieces.ts": "declare const PiecesService: unknown;\nexport const head = { requires: [PiecesService], uses: [] };\n" }, "`requires` is not an empty list"],
			[{ "src/pieces.ts": "declare const uses: readonly unknown[];\nexport const head = { requires: [], uses };\n" }, "`uses` is not an empty list"],
		];
		for (const [files, message] of cases) {
			const offences = exileOffences(fixture(files), foreign);
			expect(offences.length, message).toBeGreaterThan(0);
			expect(offences.join("\n")).toContain(message);
		}
	});

	it("does not read prose in a comment as a name, and takes the ids of exile itself", () => {
		const text = '// The ledger and the puzzles listen; a court calls.\nexport const reason = "exiled";\nexport const head = { id: "exile", requires: [], uses: [] };\n';
		expect(exileOffences(fixture({ "src/pieces.ts": text }), foreign)).toEqual([]);
	});
});
