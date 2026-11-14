// SPDX-License-Identifier: Apache-2.0
/**
 * The installed table: mechanic id to definition, for a game in its data form. It is built from the `swarmtales`
 * field of the dependencies of one `package.json` (the command line's own), which names the exports of a package
 * that are mechanic definitions. Nobody writes the table by hand.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { SwtError, type SwtIssue } from "@swarmtales/contracts";
import type { MechanicDefinition } from "@swarmtales/sdk";
import { importFile } from "./load-game.ts";
import { Type } from "typebox";
import { Parse } from "typebox/value";

const Manifest = Type.Object(
	{
		dependencies: Type.Optional(Type.Record(Type.String({ description: "A package name" }), Type.String({ description: "Its version range" }), { description: "The packages the package needs" })),
		swarmtales: Type.Optional(
			Type.Object(
				{
					kind: Type.Optional(Type.String({ description: "What the package is; `mechanic` for a package of mechanics" })),
					mechanics: Type.Optional(Type.Array(Type.String({ description: "The name of an export" }), { description: "The exports that are mechanic definitions" })),
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
		why: "A game in its data form names its mechanics by id; the ids come from the `swarmtales.mechanics` field of the installed packages, each entry the name of an export that is a mechanic definition.",
		fix: "Install the dependencies again; in a mechanic package, list in `swarmtales.mechanics` only exports made with `defineMechanic`, and give every mechanic its own id.",
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

/**
 * Reads the mechanic definitions that one dependency registers.
 *
 * @param name - The package name of the dependency.
 * @param packageFile - The `package.json` that lists the dependency.
 * @param load - Imports the dependency.
 * @returns Each registered export name with the definition behind it; empty for a package without mechanics.
 * @throws SwtError `SWT-C030` when the dependency is not installed or cannot be imported, or a named export is no
 * mechanic definition.
 */
async function definitionsOf(name: string, packageFile: string, load: LoadPackage): Promise<readonly (readonly [string, MechanicDefinition])[]> {
	const file = manifestOf(name, dirname(packageFile));
	if (file === undefined) throw new SwtError(installedTableBroken({ file: packageFile, problem: `the dependency "${name}" is not installed` }));
	const registration = manifest(file).swarmtales;
	const exports = registration?.kind === "mechanic" ? (registration.mechanics ?? []) : [];
	if (exports.length === 0) return [];
	const loaded: unknown = await load(name).catch((cause: unknown) => {
		throw new SwtError(installedTableBroken({ file, problem: `the package "${name}" cannot be imported` }), { cause });
	});
	const members = new Map<string, unknown>(typeof loaded === "object" && loaded !== null ? Object.entries(loaded) : []);
	return exports.map((exported) => {
		const definition = members.get(exported);
		if (!isDefinition(definition)) throw new SwtError(installedTableBroken({ file, problem: `the export "${exported}" of "${name}" is no mechanic definition` }));
		return [exported, definition] as const;
	});
}

/**
 * Builds the installed table from the dependencies of one `package.json`.
 *
 * @param packageFile - The absolute path of the `package.json` whose dependencies are read.
 * @param load - Imports a dependency by name; by default the entry that Node resolves from `packageFile`.
 * @returns Mechanic id to definition, in the order of the dependencies and of each `mechanics` list.
 * @throws SwtError `SWT-C030` when a package file cannot be read, a dependency is not installed or cannot be
 * imported, a named export is no mechanic definition, or two definitions share an id.
 * @example
 * ```ts
 * const installed = await installedTable(fileURLToPath(new URL("../package.json", import.meta.url)));
 * ```
 *
 * @public
 */
export async function installedTable(packageFile: string, load?: LoadPackage): Promise<Readonly<Record<string, MechanicDefinition>>> {
	const entry = createRequire(packageFile);
	const loader: LoadPackage = load ?? (async (name) => importFile(entry.resolve(name)));
	const table = new Map<string, MechanicDefinition>();
	for (const name of Object.keys(manifest(packageFile).dependencies ?? {})) {
		for (const [exported, definition] of await definitionsOf(name, packageFile, loader)) {
			if (table.has(definition.id)) throw new SwtError(installedTableBroken({ file: packageFile, problem: `the mechanic id "${definition.id}" is installed twice; the second is the export "${exported}" of "${name}"` }));
			table.set(definition.id, definition);
		}
	}
	return Object.fromEntries(table);
}
