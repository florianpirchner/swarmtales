// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Two gates of M4 (11-m4-spec.md, section 4.2) over the manifests and the imports of the packages.
 *
 * - **Base alone** generalises `exile-alone.test.ts`: a mechanic package of class `base` (`swarmtales.class` in its
 *   `package.json`) names no mechanic of class `game`. Its manifest lists no such package, no file imports one, and
 *   no string of its source holds a mechanic, service, event or tool id of one. Comments are prose and are not read.
 * - **Unused dependencies:** every dependency in the manifest of a mechanic or game package is imported by at
 *   least one source file of that package (source, tests and the files at its root).
 */
import { cpSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { importsOf } from "../layers/workspace.ts";
import { isSourceFile, listFiles, readText, REPO_ROOT } from "../lib/files.ts";
import { loadMechanics, type HeadView } from "../mechanic-docs/head.ts";

const Names = Type.Optional(Type.Record(Type.String(), Type.String({ description: "A version range." }), { description: "Package name to version range." }));
const Manifest = Type.Object(
	{
		name: Type.String({ description: "The npm name." }),
		swarmtales: Type.Optional(Type.Object({ kind: Type.Optional(Type.String({ description: "mechanic, game, ..." })), class: Type.Optional(Type.String({ description: "base or game." })) }, { description: "The workspace field." })),
		dependencies: Names,
		peerDependencies: Names,
		optionalDependencies: Names,
		devDependencies: Names,
	},
	{ description: "The fields of a package manifest these gates read." },
);
type ManifestView = Static<typeof Manifest>;

const FIELDS = ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"] as const;

/** One package under `mechanics/` or `games/`. */
interface Package {
	/** The folder, relative to the root (`mechanics/ledger`). */
	readonly folder: string;
	readonly manifest: ManifestView;
}

function packagesUnder(top: string, root: string): readonly Package[] {
	const folders = listFiles(top, (path) => new RegExp(`^${top}/[^/]+/package\\.json$`).test(path), root).map((path) => dirname(path));
	return folders.map((folder) => {
		const raw: unknown = JSON.parse(readText(`${folder}/package.json`, root));
		if (!Value.Check(Manifest, raw)) throw new TypeError(`${folder}/package.json: not a package manifest`);
		return { folder, manifest: raw };
	});
}

function dependenciesOf(manifest: ManifestView): readonly (readonly [string, string])[] {
	return FIELDS.flatMap((field) => Object.keys(manifest[field] ?? {}).map((name) => [field, name] as const));
}

function packageOf(specifier: string, names: Iterable<string>): string | undefined {
	return [...names].find((name) => specifier === name || specifier.startsWith(`${name}/`));
}

/** What a base mechanic must not name: gathered from the heads and the manifests of the mechanics of class `game`. */
interface Foreign {
	/** The npm names of the packages of class `game`. */
	readonly packages: ReadonlySet<string>;
	/** An id to what it is, for example `deal` to "the tool `deal` of `holdem`". */
	readonly ids: ReadonlyMap<string, string>;
	/** The mechanic ids: also refused as a word inside a longer string. */
	readonly owners: ReadonlySet<string>;
	/** Per base package (npm name), the ids its own head declares: a base mechanic may use its own id where a game mechanic has the same one (`vote_cast`). */
	readonly own: ReadonlyMap<string, ReadonlySet<string>>;
}

function idsOf(head: HeadView): readonly string[] {
	return [head.id, ...head.provides.map((service) => service.name), ...Object.keys(head.events), ...head.tools.map((tool) => tool.name)];
}

async function foreignOf(root: string): Promise<Foreign> {
	const game = new Set(packagesUnder("mechanics", root).filter((pkg) => pkg.manifest.swarmtales?.class === "game").map((pkg) => pkg.manifest.name));
	const mechanics = await loadMechanics(root);
	const heads = mechanics.filter((mechanic) => game.has(mechanic.packageName)).map((mechanic) => mechanic.head);
	const ids = new Map<string, string>();
	for (const head of heads) {
		ids.set(head.id, `the mechanic \`${head.id}\``);
		for (const service of head.provides) ids.set(service.name, `the service \`${service.name}\` of \`${head.id}\``);
		for (const event of Object.keys(head.events)) ids.set(event, `the event \`${event}\` of \`${head.id}\``);
		for (const tool of head.tools) ids.set(tool.name, `the tool \`${tool.name}\` of \`${head.id}\``);
	}
	const own = new Map(mechanics.filter((mechanic) => !game.has(mechanic.packageName)).map((mechanic) => [mechanic.packageName, new Set(idsOf(mechanic.head))]));
	return { packages: game, ids, owners: new Set(heads.map((head) => head.id)), own };
}

/**
 * Strings a base mechanic carries byte for byte from the old platform (A41), as `file` NUL `string`: a port keeps its
 * option defaults, so the gate lets these through and names why.
 */
const CARRIED: ReadonlyMap<string, string> = new Map([["mechanics/consensus/src/head.ts\0playMove", "the default of the option `tool`, carried from `legacy`"]]);

/** The strings of the code: literals and the fixed parts of templates. */
function stringsOf(file: string, text: string): readonly string[] {
	const found: string[] = [];
	const visit = (node: ts.Node): void => {
		if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddleOrTemplateTail(node)) found.push(node.text);
		ts.forEachChild(node, visit);
	};
	visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));
	return found;
}

function named(text: string, foreign: Foreign, own: ReadonlySet<string>): string | undefined {
	const exact = own.has(text) ? undefined : foreign.ids.get(text);
	if (exact !== undefined) return exact;
	const owner = [...foreign.owners].find((id) => new RegExp(`(^|[^A-Za-z0-9_-])${id}($|[^A-Za-z0-9_-])`).test(text));
	return owner === undefined ? undefined : `the mechanic \`${owner}\``;
}

function baseOffences({ folder, manifest }: Package, root: string, foreign: Foreign): readonly string[] {
	const files = listFiles(`${folder}/src`, isSourceFile, root);
	if (files.length === 0) return [`${folder}/src: no source file, so nothing was read`];
	const offences = dependenciesOf(manifest)
		.filter(([, name]) => foreign.packages.has(name))
		.map(([field, name]) => `${folder}/package.json: ${field} names ${name}, a mechanic of class game`);
	for (const file of files) {
		const text = readText(file, root);
		for (const specifier of importsOf(text)) {
			const name = packageOf(specifier, foreign.packages);
			if (name !== undefined) offences.push(`${file}: imports "${specifier}" of ${name}, a mechanic of class game`);
		}
		for (const string of stringsOf(file, text)) {
			if (CARRIED.has(`${file}\0${string}`)) continue;
			const what = named(string, foreign, foreign.own.get(manifest.name) ?? new Set());
			if (what !== undefined) offences.push(`${file}: the string ${JSON.stringify(string)} names ${what}, a mechanic of class game`);
		}
	}
	return offences;
}

/**
 * Every base mechanic package under `root`, checked against the game mechanics of `foreign`.
 *
 * @param root - The repository root (or a fixture).
 * @param foreign - What no base mechanic may name.
 * @returns One line per offence.
 */
function baseAloneOffences(root: string, foreign: Foreign): readonly string[] {
	const bases = packagesUnder("mechanics", root).filter((pkg) => pkg.manifest.swarmtales?.class === "base");
	if (bases.length === 0) return [`${root}/mechanics: no mechanic of class base, so nothing was read`];
	return bases.flatMap((pkg) => baseOffences(pkg, root, foreign));
}

/**
 * The packages that the committed API report (`*.api.md`) of a package imports: the published declaration files
 * import them, so they are dependencies even when the source reaches their types only through another package.
 */
function reportImports(folder: string, root: string): readonly string[] {
	const reports = listFiles(folder, (path) => dirname(path) === folder && path.endsWith(".api.md"), root);
	return reports.flatMap((report) => [...readText(report, root).matchAll(/^import .* from '([^']+)';$/gm)].flatMap((match) => match[1] ?? []));
}

/**
 * The dependencies of every mechanic and game package under `root` that no source file of the package imports.
 *
 * @param root - The repository root (or a fixture).
 * @returns One line per offence.
 */
function unusedOffences(root: string): readonly string[] {
	const packages = ["mechanics", "games"].flatMap((top) => packagesUnder(top, root));
	if (packages.length === 0) return [`${root}: no mechanic or game package, so nothing was read`];
	return packages.flatMap(({ folder, manifest }) => {
		const files = listFiles(folder, isSourceFile, root);
		if (files.length === 0) return [`${folder}: no source file, so nothing was read`];
		const declared = dependenciesOf(manifest);
		const specifiers = [...files.flatMap((file) => importsOf(readText(file, root))), ...reportImports(folder, root)];
		const imported = new Set(specifiers.flatMap((specifier) => packageOf(specifier, declared.map(([, name]) => name)) ?? []));
		return declared.filter(([, name]) => !imported.has(name)).map(([field, name]) => `${folder}/package.json: ${field} names ${name}, which no file of the package imports`);
	});
}

/** A copy of real packages (manifest and every source file) with files added or replaced, relative to the root. */
function fixture(folders: readonly string[], files: Readonly<Record<string, string>>): string {
	const root = mkdtempSync(join(tmpdir(), "swt-base-alone-"));
	for (const folder of folders) {
		mkdirSync(join(root, folder), { recursive: true });
		cpSync(join(REPO_ROOT, folder, "package.json"), join(root, folder, "package.json"));
		for (const entry of readdirSync(join(REPO_ROOT, folder))) if (["src", "test"].includes(entry) || isSourceFile(entry)) cpSync(join(REPO_ROOT, folder, entry), join(root, folder, entry), { recursive: true });
	}
	for (const [path, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), text);
	}
	return root;
}

function manifestWith(folder: string, field: (typeof FIELDS)[number], name: string): string {
	const raw: unknown = JSON.parse(readText(`${folder}/package.json`));
	if (!Value.Check(Manifest, raw)) throw new TypeError(`${folder}/package.json does not parse`);
	return JSON.stringify({ ...raw, [field]: { ...raw[field], [name]: "workspace:*" } });
}

const foreign = await foreignOf(REPO_ROOT);
const LEDGER = "mechanics/ledger";

describe("a base mechanic names no game mechanic (M4, 4.2)", () => {
	it("holds in this repository", () => {
		expect(baseAloneOffences(REPO_ROOT, foreign)).toEqual([]);
	});

	it("does not pass on nothing: it knows the game mechanics and reads every base mechanic", () => {
		const bases = packagesUnder("mechanics", REPO_ROOT).filter((pkg) => pkg.manifest.swarmtales?.class === "base").map((pkg) => pkg.folder);
		expect(bases).toEqual(["mechanics/channels", "mechanics/consensus", "mechanics/decisions", "mechanics/exile", "mechanics/human-hand", "mechanics/ledger", "mechanics/team-channel"]);
		for (const name of ["@swarmtales/mechanic-puzzles", "@swarmtales/mechanic-court", "@swarmtales/mechanic-strategy-brain", "@swarmtales/mechanic-salt-market"]) expect(foreign.packages).toContain(name);
		for (const id of ["puzzles", "court", "factor_burned"]) expect(foreign.ids.has(id)).toBe(true);
		for (const base of ["ledger", "exile", "channels", "transferPoints"]) expect(foreign.ids.has(base)).toBe(false);
		expect(baseAloneOffences(fixture([LEDGER], {}), foreign)).toEqual([]);
		expect(baseAloneOffences(mkdtempSync(join(tmpdir(), "swt-base-alone-")), foreign)[0]).toContain("no mechanic of class base");
	});

	it("fails on a fixture in which ledger names puzzles", () => {
		const cases: readonly (readonly [Readonly<Record<string, string>>, string])[] = [
			[{ [`${LEDGER}/package.json`]: manifestWith(LEDGER, "dependencies", "@swarmtales/mechanic-puzzles") }, "dependencies names @swarmtales/mechanic-puzzles, a mechanic of class game"],
			[{ [`${LEDGER}/package.json`]: manifestWith(LEDGER, "devDependencies", "@swarmtales/mechanic-puzzles") }, "devDependencies names @swarmtales/mechanic-puzzles"],
			[{ [`${LEDGER}/src/pieces.ts`]: 'import type { PiecesService } from "@swarmtales/mechanic-puzzles/contract";\nexport type Held = typeof PiecesService;\n' }, 'imports "@swarmtales/mechanic-puzzles/contract"'],
			[{ [`${LEDGER}/src/pieces.ts`]: 'export const order = { after: ["puzzles"] };\n' }, 'the string "puzzles" names the mechanic `puzzles`'],
			[{ [`${LEDGER}/src/pieces.ts`]: 'export const burned = "factor_burned";\n' }, "names the event `factor_burned` of `puzzles`"],
			[{ [`${LEDGER}/src/pieces.ts`]: "export const prompt = (id: string): string => `puzzles/replies/${id}`;\n" }, "names the mechanic `puzzles`"],
		];
		for (const [files, message] of cases) {
			const offences = baseAloneOffences(fixture([LEDGER], files), foreign);
			expect(offences.join("\n"), message).toContain(message);
		}
	});

	it("does not read prose in a comment as a name", () => {
		const text = "// The puzzles and the court listen.\nexport const reason = \"transfer\";\n";
		expect(baseAloneOffences(fixture([LEDGER], { [`${LEDGER}/src/pieces.ts`]: text }), foreign)).toEqual([]);
	});
});

describe("no unused dependency in a mechanic or game package (M4, 4.2)", () => {
	it("holds in this repository", () => {
		expect(unusedOffences(REPO_ROOT)).toEqual([]);
	});

	it("does not pass on nothing", () => {
		expect(unusedOffences(mkdtempSync(join(tmpdir(), "swt-unused-")))[0]).toContain("no mechanic or game package");
		expect(unusedOffences(fixture([LEDGER, "games/quarry"], {}))).toEqual([]);
	});

	it("fails on a manifest with @swarmtales/mechanic-contracts and no import of it", () => {
		// The slice's court: it imports no contract of `mechanics/contracts` (the ledger does since M5-12).
		const court = "mechanics/court";
		const offences = unusedOffences(fixture([court, "games/quarry"], { [`${court}/package.json`]: manifestWith(court, "dependencies", "@swarmtales/mechanic-contracts") }));
		expect(offences).toEqual([`${court}/package.json: dependencies names @swarmtales/mechanic-contracts, which no file of the package imports`]);
		const games = unusedOffences(fixture(["games/quarry"], { "games/quarry/package.json": manifestWith("games/quarry", "devDependencies", "@swarmtales/mechanic-contracts") }));
		expect(games).toEqual(["games/quarry/package.json: devDependencies names @swarmtales/mechanic-contracts, which no file of the package imports"]);
	});
});
