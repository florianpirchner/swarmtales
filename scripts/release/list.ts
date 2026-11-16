// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The published list of the release (`scripts/release/packages.json`, decision A123, `13-m6-spec.md` 6.1) as the
 * release scripts read it: each listed package with its folder, its version line, its version and the workspace
 * packages it depends on, in the order they are published.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

const Line = Type.Union([Type.Literal("platform"), Type.Literal("plugins")], { description: "The version line" });
const Entry = Type.Object({ name: Type.String({ description: "The npm name" }), folder: Type.String({ description: "The package folder, from the root" }), line: Line }, { description: "One published package" });
const ListFile = Type.Object({ packages: Type.Array(Entry, { description: "Every package of the release" }) }, { description: "The part of scripts/release/packages.json the release scripts read" });
const Names = Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Package names to version ranges" }));
const PackageFile = Type.Object({ version: Type.String({ description: "The version" }), dependencies: Names, peerDependencies: Names, optionalDependencies: Names }, { description: "The fields of a package.json that the release scripts read" });

/** One package of the published list, with its version and the listed packages it depends on, from its `package.json`. */
export type ListedPackage = Static<typeof Entry> & { readonly version: string; readonly needs: readonly string[] };

/**
 * Reads the published list and the `package.json` of every listed package.
 *
 * @param root - The repository root.
 * @returns The listed packages, in the order of the list.
 * @throws What `Value.Parse` throws when a file has another shape, and what the file system throws when one is missing.
 */
export function readList(root: string): readonly ListedPackage[] {
	const list = Value.Parse(ListFile, JSON.parse(readFileSync(join(root, "scripts", "release", "packages.json"), "utf8")));
	const names = new Set(list.packages.map((entry) => entry.name));
	return list.packages.map((entry) => {
		const manifest = Value.Parse(PackageFile, JSON.parse(readFileSync(join(root, entry.folder, "package.json"), "utf8")));
		const needs = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies, ...manifest.optionalDependencies }).filter((name) => names.has(name));
		return { ...entry, version: manifest.version, needs };
	});
}

/**
 * Orders the packages so that each comes after every listed package it depends on (the publish order).
 *
 * @param packages - The listed packages.
 * @returns The same packages in dependency order; ties keep the order of the list.
 * @throws TypeError when the dependencies form a cycle.
 */
export function publishOrder(packages: readonly ListedPackage[]): readonly ListedPackage[] {
	const done = new Set<string>();
	const ordered: ListedPackage[] = [];
	while (ordered.length < packages.length) {
		const next = packages.filter((entry) => !done.has(entry.name) && entry.needs.every((name) => done.has(name)));
		if (next.length === 0) throw new TypeError("release: the listed packages depend on each other in a cycle");
		for (const entry of next) done.add(entry.name);
		ordered.push(...next);
	}
	return ordered;
}

/**
 * The platform line against the version a release candidate must have. The other rules of the version lines (one
 * version per line, the plugins' below the platform's) are those of the gate `scripts/gates/release-list.test.ts`,
 * which `pnpm release:check` runs.
 *
 * @param packages - The listed packages.
 * @param wanted - The platform version asked for; any when left out.
 * @returns One line per problem; empty when the line holds.
 */
export function versionProblems(packages: readonly ListedPackage[], wanted?: string): readonly string[] {
	const platform = [...new Set(packages.filter((entry) => entry.line === "platform").map((entry) => entry.version))];
	return wanted === undefined || platform.join() === wanted ? [] : [`the platform line is at ${platform.join(", ")}, not at ${wanted}`];
}
