// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Done-when 4 of milestone M3: `exile` names no other mechanic. The gate reads `mechanics/exile/package.json` and
 * every file under `mechanics/exile/src/` and finds no mechanic package, no import that leaves the package for
 * another one under `mechanics/`, and no mechanic, service, event or tool id of another mechanic in a string of
 * the code. The head has an empty `requires`. Comments are prose and are not read.
 *
 * Since M5-15 (12-m5-spec.md, row 15: "the names in its texts through `identity`") the exile asks, through `uses`
 * only, three services and no mechanic: `identity` and `notices` of `mechanics/contracts` (`channels` provides
 * `notices`; the exile cannot import `channels`, which imports the ledger, which imports the exile, erratum J36), and
 * `exile-purse`, which its own contract defines and the ledger provides (the ledger imports the exile, so the exile
 * cannot import the ledger). This one import and these three names are the only ones let through.
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
import { IdentityService, NoticesService } from "../../mechanics/contracts/src/index.ts";
import * as exileContract from "../../mechanics/exile/src/contract.ts";
import { loadMechanics, readManifest } from "../mechanic-docs/head.ts";

const EXILE = "mechanics/exile";
/** The imports the exile may make of packages under `mechanics/` (M5-15). */
const ALLOWED_IMPORTS: ReadonlySet<string> = new Set(["@swarmtales/mechanic-contracts"]);
/** The packages of those imports, which its manifest may name. */
const ALLOWED_PACKAGES: ReadonlySet<string> = new Set(["@swarmtales/mechanic-contracts"]);
/** The services the exile may list in `uses`: the purse its own contract defines, identity and notices. */
const ALLOWED_USES: ReadonlySet<string> = new Set(["ExilePurseService", "IdentityService", "NoticesService"]);
/** The names of the services the contract of the exile defines: its own, even when another mechanic provides one. */
const OWN_SERVICES: ReadonlySet<string> = new Set(Object.values(exileContract).flatMap((value) => (typeof value === "object" && "methods" in value && typeof value.name === "string" ? [value.name] : [])));
/** The method names of the allowed services (`notify` of `notices`): a call names them, also where a tool of another mechanic has the same name (M5-60). */
const ALLOWED_METHODS: ReadonlySet<string> = new Set([IdentityService, NoticesService, exileContract.ExilePurseService].flatMap((service) => Object.keys(service.methods)));
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
		for (const service of head.provides) if (!OWN_SERVICES.has(service.name)) ids.set(service.name, `the service \`${service.name}\` of \`${head.id}\``);
		for (const event of Object.keys(head.events)) ids.set(event, `the event \`${event}\` of \`${head.id}\``);
		for (const tool of head.tools) if (!ALLOWED_METHODS.has(tool.name)) ids.set(tool.name, `the tool \`${tool.name}\` of \`${head.id}\``);
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
			.filter((name) => foreign.mechanics.has(name) && !ALLOWED_PACKAGES.has(name))
			.map((name) => `${EXILE}/package.json: ${field} names the mechanic package ${name}`),
	);
}

function importOffences(file: string, text: string, foreign: Foreign): readonly string[] {
	const offences = importsOf(text).flatMap((specifier) => {
		if (specifier.startsWith(".")) return posix.join(dirname(file), specifier).startsWith(`${EXILE}/`) ? [] : [`${file}: the import "${specifier}" leaves the package`];
		const name = ALLOWED_IMPORTS.has(specifier) ? undefined : packageOf(specifier, foreign.packages);
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

/** The two lists of a head, what each may hold, and the offence when it holds more. */
const HEAD_LISTS: ReadonlyMap<string, { readonly allowed: ReadonlySet<string>; readonly message: string }> = new Map([
	["requires", { allowed: new Set<string>(), message: "`requires` is not an empty list" }],
	["uses", { allowed: ALLOWED_USES, message: "`uses` is not a list of the allowed services" }],
]);

/** Whether a `requires` or `uses` property is a list literal of allowed services only: none for `requires`. */
function listFits(node: ts.PropertyAssignment | ts.ShorthandPropertyAssignment, allowed: ReadonlySet<string>): boolean {
	if (!ts.isPropertyAssignment(node) || !ts.isArrayLiteralExpression(node.initializer)) return false;
	return node.initializer.elements.every((element) => ts.isIdentifier(element) && allowed.has(element.text));
}

/** A head that requires a service, or uses one that is not allowed: `requires` not an empty list, `uses` not a list of the allowed. */
function headOffences(file: string, source: ts.SourceFile): readonly string[] {
	const offences: string[] = [];
	const visit = (node: ts.Node): void => {
		const property = ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node) ? node : undefined;
		const key = property !== undefined && ts.isIdentifier(property.name) ? property.name.text : undefined;
		const offence = property === undefined ? undefined : HEAD_LISTS.get(key ?? "");
		if (property !== undefined && offence !== undefined && !listFits(property, offence.allowed)) offences.push(`${file}: ${offence.message}`);
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
		expect(head?.uses.map((service) => service.name)).toEqual(["exile-purse", "identity", "notices"]);
		expect([...OWN_SERVICES]).toEqual(["exile", "exile-purse"]);
	});

	it("does not pass on nothing: it knows the other mechanics and reads the code of exile", () => {
		expect(foreign.mechanics).toContain("@swarmtales/mechanic-puzzles");
		expect(foreign.packages).toContain("@swarmtales/mechanic-contracts");
		expect(foreign.mechanics.has("@swarmtales/mechanic-exile")).toBe(false);
		for (const id of ["puzzles", "ledger", "court", "channels", "decisions", "humanHand", "factor_burned", "board_post", "transferPoints", "vote"]) expect(foreign.ids.has(id)).toBe(true);
		for (const own of ["exile", "exiled"]) expect(foreign.ids.has(own)).toBe(false);
		const files = listFiles(`${EXILE}/src`, isSourceFile);
		expect(files).toEqual(["contract", "gate", "head", "index", "ransom", "will"].map((name) => `${EXILE}/src/${name}.ts`));
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
			[{ "src/pieces.ts": 'import { ChannelsService } from "@swarmtales/mechanic-channels";\nexport const source = ChannelsService;\n' }, "a package under mechanics/"],
			[{ "src/pieces.ts": "declare const ConsensusSourceService: unknown;\nexport const head = { requires: [], uses: [IdentityService, ConsensusSourceService] };\n" }, "`uses` is not a list of the allowed services"],
			[{ "src/pieces.ts": 'export const order = { after: ["puzzles"] };\n' }, 'the string "puzzles" names the mechanic `puzzles`'],
			[{ "src/pieces.ts": 'export const burned = "factor_burned";\n' }, "names the event `factor_burned` of `puzzles`"],
			[{ "src/pieces.ts": "export const prompt = (id: string): string => `puzzles/replies/${id}`;\n" }, "names the mechanic `puzzles`"],
			[{ "src/pieces.ts": 'export const summary = "Banishes a resident; the puzzles mechanic burns its pieces.";\n' }, "names the mechanic `puzzles`"],
			[{ "src/pieces.ts": 'export const tool = "transferPoints";\n' }, "names the tool `transferPoints` of `ledger`"],
			[{ "src/pieces.ts": 'export const service = "channels";\n' }, "`channels`"],
			[{ "src/pieces.ts": "declare const PiecesService: unknown;\nexport const head = { requires: [PiecesService], uses: [] };\n" }, "`requires` is not an empty list"],
			[{ "src/pieces.ts": "declare const uses: readonly unknown[];\nexport const head = { requires: [], uses };\n" }, "`uses` is not a list of the allowed services"],
		];
		for (const [files, message] of cases) {
			const offences = exileOffences(fixture(files), foreign);
			expect(offences.length, message).toBeGreaterThan(0);
			expect(offences.join("\n")).toContain(message);
		}
	});

	it("does not read prose in a comment as a name, and takes the ids of exile itself", () => {
		const text = '// The ledger and the puzzles listen; a court calls.\nexport const reason = "exiled";\nexport const purse = "exile-purse";\nexport const head = { id: "exile", requires: [], uses: [] };\n';
		expect(exileOffences(fixture({ "src/pieces.ts": text }), foreign)).toEqual([]);
	});
});
