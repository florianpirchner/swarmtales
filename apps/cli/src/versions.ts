// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The versions of the packages a game's mechanics come from, for the plugins of the run manifest (lesson P503): game
 * resolution records each plugin under the version of its package, and `0.0.0` for a package it is not told of.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

const Deps = (what: string) => Type.Optional(Type.Record(Type.String({ description: "A package name" }), Type.String({ description: "Its version range" }), { description: what }));
const Manifest = Type.Object(
	{
		name: Type.Optional(Type.String({ description: "The package name" })),
		version: Type.Optional(Type.String({ description: "The version of the package" })),
		dependencies: Deps("The packages the package needs"),
		devDependencies: Deps("The packages the package needs to be built and tested"),
	},
	{ description: "The fields of a `package.json` that the versions of a run's plugins are read from" },
);

// The fields of one `package.json`; undefined when it cannot be read or has another shape.
function read(file: string): Static<typeof Manifest> | undefined {
	try {
		const value: unknown = JSON.parse(readFileSync(file, "utf8"));
		return Value.Check(Manifest, value) ? value : undefined;
	} catch {
		return undefined;
	}
}

// The `package.json` of an installed dependency, in the `node_modules` folders from a directory upwards.
function installedFile(name: string, from: string): string | undefined {
	const file = join(from, "node_modules", name, "package.json");
	if (existsSync(file)) return file;
	return dirname(from) === from ? undefined : installedFile(name, dirname(from));
}

/**
 * The versions of the packages that one or more `package.json` files are and list (`dependencies` and
 * `devDependencies`), as they are installed beside each file: in a clone the workspace's, in a project the
 * installed ones. A package that an earlier file names already keeps the version found first; one that is not
 * installed or whose file cannot be read has none.
 *
 * @param packageFiles - The absolute paths of the `package.json` files, the project's first.
 * @returns Package name to version, for `versions` of game resolution.
 * @example
 * ```ts
 * const versions = packageVersions(packageFilesFor(dirname(gameFile), cliPackageFile));
 * versions["@swarmtales/mechanic-grid"]; // "0.1.0"
 * ```
 *
 * @public
 */
export function packageVersions(packageFiles: readonly string[]): Readonly<Record<string, string>> {
	const versions = new Map<string, string>();
	for (const file of new Set(packageFiles)) for (const [name, version] of versionsOf(file)) if (!versions.has(name)) versions.set(name, version);
	return Object.fromEntries(versions);
}

// The version of one `package.json` itself and of each package it lists that is installed beside it.
function versionsOf(file: string): readonly (readonly [string, string])[] {
	const own = read(file);
	if (own === undefined) return [];
	const listed = Object.keys({ ...own.dependencies, ...own.devDependencies }).flatMap((name): (readonly [string, string])[] => {
		const found = installedFile(name, dirname(file));
		const version = found === undefined ? undefined : read(found)?.version;
		return version === undefined ? [] : [[name, version]];
	});
	return own.name === undefined || own.version === undefined ? listed : [[own.name, own.version], ...listed];
}
