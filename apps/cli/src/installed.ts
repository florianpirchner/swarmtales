// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The installed table: mechanic id to definition and Director id to definition, for a game in its data form. It is
 * built from the `swarmtales` field of the dependencies of the project's `package.json` (the nearest one above the
 * game file) and of the command line's own, which names the exports of a package that are mechanic definitions
 * (`mechanics`) and Director definitions (`directors`). Nobody writes the table by hand (decision A121).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { SwtError, type SwtIssue } from "@swarmtales/contracts";
import type { DirectorDefinition, MechanicDefinition } from "@swarmtales/sdk";
import { importFile } from "./load-game.ts";
import { Type } from "typebox";
import { Parse } from "typebox/value";

const Exports = (what: string) => Type.Optional(Type.Array(Type.String({ description: "The name of an export" }), { description: `The exports that are ${what} definitions` }));
const Manifest = Type.Object(
	{
		dependencies: Type.Optional(Type.Record(Type.String({ description: "A package name" }), Type.String({ description: "Its version range" }), { description: "The packages the package needs" })),
		swarmtales: Type.Optional(
			Type.Object(
				{
					kind: Type.Optional(Type.String({ description: "What the package is; `mechanic` for a package of mechanics or Directors" })),
					mechanics: Exports("mechanic"),
					directors: Exports("Director"),
				},
				{ description: "The registration of the package with the platform" },
			),
		),
	},
	{ description: "The fields of a `package.json` that the installed table reads" },
);

/**
 * Imports the entry module of a dependency.
 *
 * @public
 */
export type LoadPackage = (name: string) => Promise<unknown>;

/**
 * The installed table of a project: the mechanics and the Directors its packages register, each by id.
 *
 * @public
 */
export interface InstalledPackages {
	/** Mechanic id to definition. */
	readonly mechanics: Readonly<Record<string, MechanicDefinition>>;
	/** Director id to definition. */
	readonly directors: Readonly<Record<string, DirectorDefinition>>;
}

/**
 * `SWT-C030`: the installed table cannot be built.
 *
 * @param input - The package file and what is wrong.
 * @param input.file - The `package.json` that was read, or the one whose dependency failed.
 * @param input.problem - What is wrong, as one sentence without a full stop.
 * @returns The issue.
 *
 * @public
 */
export function installedTableBroken(input: { readonly file: string; readonly problem: string }): SwtIssue {
	return {
		code: "SWT-C030",
		summary: input.problem,
		where: { file: input.file },
		why: "A game in its data form names its mechanics and its Directors by id; the ids come from the `swarmtales.mechanics` and `swarmtales.directors` fields of the packages that the project's `package.json` and the command line's own list as dependencies, each entry the name of an export that is a definition.",
		fix: "Install the dependencies again; in a mechanic package, list in `swarmtales.mechanics` only exports made with `defineMechanic` and in `swarmtales.directors` only exports made with `defineDirector`, and give every mechanic and every Director its own id.",
	};
}

/**
 * Tells whether an export is a mechanic definition, by the members every definition has.
 *
 * @param value - The export.
 * @returns True for a callable with an id, a package name and the two methods of a definition.
 */
function isDefinition(value: unknown): value is MechanicDefinition {
	if (typeof value !== "function" || !("id" in value) || !("package" in value) || !("parseOptions" in value) || !("resolve" in value)) return false;
	return typeof value.id === "string" && typeof value.package === "string" && typeof value.parseOptions === "function" && typeof value.resolve === "function";
}

// The members every Director definition has, by their `typeof` (`defineDirector` of the sdk).
const DIRECTOR_MEMBERS: Readonly<Record<string, string>> = { id: "string", summary: "string", parseOptions: "function", system: "function", input: "function", act: "function", fallback: "function" };

/**
 * Tells whether an export is a Director definition, by the members every definition has.
 *
 * @param value - The export.
 * @returns True for an object with an id, a summary, a list of triggers and the methods of a definition.
 */
function isDirector(value: unknown): value is DirectorDefinition {
	if (typeof value !== "object" || value === null || !Array.isArray(Reflect.get(value, "on"))) return false;
	return Object.entries(DIRECTOR_MEMBERS).every(([member, type]) => typeof Reflect.get(value, member) === type);
}

/**
 * Reads the fields of one `package.json`.
 *
 * @param file - The path of the file.
 * @returns The dependencies and the registration.
 * @throws SwtError `SWT-C030` when the file cannot be read or its fields have the wrong shape.
 */
function manifest(file: string): ReturnType<typeof Parse<typeof Manifest>> {
	try {
		return Parse(Manifest, JSON.parse(readFileSync(file, "utf8")));
	} catch (cause) {
		throw new SwtError(installedTableBroken({ file, problem: "the package file cannot be read" }), { cause });
	}
}

/**
 * Finds the `package.json` of a dependency in the `node_modules` folders from a directory upwards.
 *
 * @param name - The package name.
 * @param from - The directory to start in.
 * @returns The path, or undefined when the package is not installed.
 */
function manifestOf(name: string, from: string): string | undefined {
	const file = join(from, "node_modules", name, "package.json");
	if (existsSync(file)) return file;
	return dirname(from) === from ? undefined : manifestOf(name, dirname(from));
}

interface Registered {
	readonly mechanics: readonly (readonly [string, MechanicDefinition])[];
	readonly directors: readonly (readonly [string, DirectorDefinition])[];
}

/**
 * The export names a package registers: only a package of the kind `mechanic` registers any.
 *
 * @param file - The `package.json` of the package.
 * @returns The names of its `mechanics` and its `directors` lists; empty lists for a package of another kind.
 */
function registeredExports(file: string): { readonly mechanics: readonly string[]; readonly directors: readonly string[] } {
	const registration = manifest(file).swarmtales;
	if (registration?.kind !== "mechanic") return { mechanics: [], directors: [] };
	return { mechanics: registration.mechanics ?? [], directors: registration.directors ?? [] };
}

/**
 * Reads the mechanic and the Director definitions that one dependency registers.
 *
 * @param name - The package name of the dependency.
 * @param packageFile - The `package.json` that lists the dependency.
 * @param load - Imports the dependency.
 * @returns Each registered export name with the definition behind it; empty for a package that registers none.
 * @throws SwtError `SWT-C030` when the dependency is not installed or cannot be imported, or a named export is no
 * definition of its kind.
 */
async function definitionsOf(name: string, packageFile: string, load: LoadPackage): Promise<Registered> {
	const file = manifestOf(name, dirname(packageFile));
	if (file === undefined) throw new SwtError(installedTableBroken({ file: packageFile, problem: `the dependency "${name}" is not installed` }));
	const { mechanics, directors } = registeredExports(file);
	if (mechanics.length + directors.length === 0) return { mechanics: [], directors: [] };
	const loaded: unknown = await load(name).catch((cause: unknown) => {
		throw new SwtError(installedTableBroken({ file, problem: `the package "${name}" cannot be imported` }), { cause });
	});
	const members = new Map<string, unknown>(typeof loaded === "object" && loaded !== null ? Object.entries(loaded) : []);
	const source = file;
	function picked<T>(exports: readonly string[], is: (value: unknown) => value is T, what: string): readonly (readonly [string, T])[] {
		return exports.map((exported) => {
			const definition = members.get(exported);
			if (!is(definition)) throw new SwtError(installedTableBroken({ file: source, problem: `the export "${exported}" of "${name}" is no ${what} definition` }));
			return [exported, definition] as const;
		});
	}
	return { mechanics: picked(mechanics, isDefinition, "mechanic"), directors: picked(directors, isDirector, "Director") };
}

/**
 * Adds the definitions of one dependency to a table by id.
 *
 * @param table - The table so far.
 * @param found - The export names with their definitions.
 * @param where - The kind of the definitions, the `package.json` that lists the dependency and its name.
 * @param where.kind - `mechanic` or `Director`, for the problem.
 * @param where.file - The `package.json` that lists the dependency.
 * @param where.name - The package name of the dependency.
 * @throws SwtError `SWT-C030` when an id is in the table already.
 */
function addTo<T extends { readonly id: string }>(table: Map<string, T>, found: readonly (readonly [string, T])[], where: { readonly kind: string; readonly file: string; readonly name: string }): void {
	for (const [exported, definition] of found) {
		if (table.has(definition.id)) throw new SwtError(installedTableBroken({ file: where.file, problem: `the ${where.kind} id "${definition.id}" is installed twice; the second is the export "${exported}" of "${where.name}"` }));
		table.set(definition.id, definition);
	}
}

/**
 * Builds the installed table from the dependencies of one or more `package.json` files, in their order. A package
 * that an earlier file lists already is read once, from the first file that lists it.
 *
 * @param packageFiles - The absolute paths of the `package.json` files whose dependencies are read, the project's first.
 * @param load - Imports a dependency by name; by default the entry that Node resolves from the file that lists it.
 * @returns Mechanic id to definition and Director id to definition, in the order of the files, of their
 * dependencies and of each `mechanics` and `directors` list.
 * @throws SwtError `SWT-C030` when a package file cannot be read, a dependency is not installed or cannot be
 * imported, a named export is no definition of its kind, or two definitions of one kind share an id.
 * @example
 * ```ts
 * const { mechanics, directors } = await installedPackages(packageFilesFor(dirname(gameFile), cliPackageFile));
 * ```
 *
 * @public
 */
export async function installedPackages(packageFiles: readonly string[], load?: LoadPackage): Promise<InstalledPackages> {
	const mechanics = new Map<string, MechanicDefinition>();
	const directors = new Map<string, DirectorDefinition>();
	const read = new Set<string>();
	for (const file of new Set(packageFiles)) {
		const entry = createRequire(file);
		const loader: LoadPackage = load ?? (async (name) => importFile(entry.resolve(name)));
		for (const name of Object.keys(manifest(file).dependencies ?? {}).filter((dependency) => !read.has(dependency))) {
			read.add(name);
			const found = await definitionsOf(name, file, loader);
			addTo(mechanics, found.mechanics, { kind: "mechanic", file, name });
			addTo(directors, found.directors, { kind: "Director", file, name });
		}
	}
	return { mechanics: Object.fromEntries(mechanics), directors: Object.fromEntries(directors) };
}

/**
 * Builds the mechanic half of the installed table from the dependencies of one `package.json`.
 *
 * @param packageFile - The absolute path of the `package.json` whose dependencies are read.
 * @param load - Imports a dependency by name; by default the entry that Node resolves from `packageFile`.
 * @returns Mechanic id to definition, in the order of the dependencies and of each `mechanics` list.
 * @throws SwtError `SWT-C030` as {@link installedPackages}.
 * @example
 * ```ts
 * const installed = await installedTable(fileURLToPath(new URL("../package.json", import.meta.url)));
 * ```
 *
 * @public
 */
export async function installedTable(packageFile: string, load?: LoadPackage): Promise<Readonly<Record<string, MechanicDefinition>>> {
	return (await installedPackages([packageFile], load)).mechanics;
}

/**
 * The nearest `package.json` in a directory or above it.
 *
 * @param directory - The absolute directory to start in.
 * @returns The path, or undefined when no directory up to the root holds one.
 */
function nearestPackage(directory: string): string | undefined {
	const file = join(directory, "package.json");
	if (existsSync(file)) return file;
	return dirname(directory) === directory ? undefined : nearestPackage(dirname(directory));
}

/**
 * The `package.json` files the installed table of a project reads: the nearest one in a directory or above it (the
 * project's), then the command line's own.
 *
 * @param directory - The absolute directory of the game file, or of a run folder.
 * @param own - The command line's own `package.json`.
 * @returns The files, the project's first; the command line's alone when no other is found, or the nearest is it.
 *
 * @public
 */
export function packageFilesFor(directory: string, own: string): readonly string[] {
	const nearest = nearestPackage(directory);
	return nearest === undefined || nearest === own ? [own] : [nearest, own];
}

/**
 * The prompt folders of the installed packages, as `mechanicPromptFolders` of the prompts package lists those of a
 * clone: a dependency that ships a `prompts/` folder serves every owner it holds a folder `prompts/<owner>/` for. An
 * installed tree has no `mechanics/` folder above the prompts package, so without this list the lookup finds no
 * prompt file of an installed mechanic (errata K36). A package file that cannot be read lends no folder.
 *
 * @param packageFiles - The absolute paths of the `package.json` files whose dependencies are read, the project's first.
 * @returns Owner id to the folder that holds its prompt files; the first package that serves an owner wins.
 *
 * @public
 */
export function installedPromptFolders(packageFiles: readonly string[]): Readonly<Record<string, string>> {
	const folders: Record<string, string> = {};
	for (const file of new Set(packageFiles)) {
		for (const prompts of dependencyPromptFolders(file)) {
			for (const entry of readdirSync(prompts, { withFileTypes: true })) if (entry.isDirectory()) folders[entry.name] ??= prompts;
		}
	}
	return folders;
}

/**
 * The `prompts/` folders of the dependencies of one `package.json` that ship one.
 *
 * @param file - The `package.json`.
 * @returns The folders, in the order of the dependencies; none when the file cannot be read.
 */
function dependencyPromptFolders(file: string): readonly string[] {
	let names: readonly string[] = [];
	try {
		names = Object.keys(manifest(file).dependencies ?? {});
	} catch {
		// A broken package file is reported where the installed table reads it, not here.
	}
	return names.flatMap((name) => {
		const found = manifestOf(name, dirname(file));
		const prompts = found === undefined ? "" : join(dirname(found), "prompts");
		return prompts !== "" && existsSync(prompts) ? [prompts] : [];
	});
}
