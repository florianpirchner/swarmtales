// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The published list (decision A123, `13-m6-spec.md` 6.1, issue M6-07): `scripts/release/packages.json` names every
 * package of the release with its folder and its version line. The gate fails when a workspace package is neither
 * listed nor private, when a listed package depends on a workspace package that is not listed, or lacks what a tarball
 * needs (`files` with `dist` and without sources or tests, the licence, `repository`, `engines`, a `types` entry of
 * every published export and no `development` one, a README); when a line holds two versions or the plugins' line is
 * not below the platform's; when the platform line is not `PLATFORM_LINE` of `swt doctor` (errata K15) or misses a base
 * mechanic; and when the umbrella and the CLI lack the `swt` bin. The published fields are those of `publishConfig`
 * where it has them, as `pnpm pack` writes them.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PLATFORM_LINE } from "@swarmtales/cli/src/doctor.ts";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { LICENSE_FILE, libraryConfig, PACKAGE_NOTICE } from "../../tsdown.base.ts";
import { REPO_ROOT } from "../lib/files.ts";
import { WORKSPACE_FOLDERS } from "../layers/table.ts";

const Line = Type.Union([Type.Literal("platform"), Type.Literal("plugins")], { description: "The version line of a published package" });
const ReleaseList = Type.Object(
	{
		description: Type.String({ description: "What the file is" }),
		lines: Type.Record(Type.String(), Type.String(), { description: "Each version line and what it holds" }),
		packages: Type.Array(Type.Object({ name: Type.String({ description: "The npm name" }), folder: Type.String({ description: "The package folder, from the root" }), line: Line }, { description: "One published package" }), { description: "Every package of the release" }),
	},
	{ description: "scripts/release/packages.json" },
);
type ReleaseList = Static<typeof ReleaseList>;

const Names = Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Package names to version ranges" }));
const Exports = Type.Optional(Type.Record(Type.String(), Type.Unknown(), { description: "An exports map" }));
const Bin = Type.Optional(Type.Record(Type.String(), Type.String(), { description: "The bins of a package" }));
const Manifest = Type.Object(
	{
		name: Type.String({ description: "The package name" }),
		version: Type.String({ description: "The version" }),
		private: Type.Optional(Type.Boolean({ description: "Never published" })),
		license: Type.Optional(Type.String({ description: "The SPDX licence" })),
		files: Type.Optional(Type.Array(Type.String(), { description: "What the tarball holds" })),
		repository: Type.Optional(Type.Object({ url: Type.String({ description: "The git URL" }), directory: Type.String({ description: "The package folder" }) }, { description: "Where the source is" })),
		engines: Type.Optional(Type.Object({ node: Type.String({ description: "The Node range" }) }, { description: "The runtimes" })),
		swarmtales: Type.Optional(Type.Object({ class: Type.Optional(Type.String({ description: "The class of a mechanic" })) }, { description: "The platform's own fields" })),
		bin: Bin,
		exports: Exports,
		publishConfig: Type.Optional(Type.Object({ bin: Bin, exports: Exports }, { description: "The fields `pnpm pack` writes instead" })),
		dependencies: Names,
		peerDependencies: Names,
		optionalDependencies: Names,
	},
	{ description: "The fields of a package.json that the gate reads" },
);
type Manifest = Static<typeof Manifest>;

const LICENCE = "LicenseRef-SUL-1.0";

function workspace(root: string): ReadonlyMap<string, { readonly folder: string; readonly manifest: Manifest }> {
	const found = WORKSPACE_FOLDERS.flatMap((top) =>
		existsSync(join(root, top))
			? readdirSync(join(root, top), { withFileTypes: true })
					.filter((entry) => entry.isDirectory() && existsSync(join(root, top, entry.name, "package.json")))
					.map((entry) => ({ folder: `${top}/${entry.name}`, manifest: Value.Parse(Manifest, JSON.parse(readFileSync(join(root, top, entry.name, "package.json"), "utf8"))) }))
			: [],
	);
	return new Map(found.map((entry) => [entry.manifest.name, entry]));
}

const REPOSITORY = "github.com/florianpirchner/swarmtales";
const isRecord = (value: unknown): value is object => typeof value === "object" && value !== null;

// Each rule of a published manifest: the offence, when the rule fails.
const MANIFEST_RULES: readonly ((manifest: Manifest, folder: string) => string | undefined)[] = [
	(manifest) => (manifest.private === true ? "listed, and private" : undefined),
	(manifest) => (manifest.license === LICENCE ? undefined : `license is not ${LICENCE}`),
	({ files = [] }) => (files.includes("dist") && !files.some((file) => /^(src|test)(\/|$)/.test(file)) ? undefined : "files must hold dist and no src or test"),
	({ repository }, folder) => (repository?.directory === folder && repository.url.includes(REPOSITORY) ? undefined : `repository does not name the repository and ${folder}`),
	({ engines }) => (engines === undefined ? "no engines.node" : undefined),
];

// The offences of one published export: a `types` entry, and no `development` condition.
function exportOffences(path: string, target: unknown): readonly string[] {
	const types: unknown = isRecord(target) ? Reflect.get(target, "types") : undefined;
	return [
		...(typeof types === "string" && types.endsWith(".d.ts") ? [] : [`the published export ${path} has no types entry`]),
		...(isRecord(target) && Reflect.has(target, "development") ? [`the published export ${path} keeps the development condition`] : []),
	];
}

// What a published manifest lacks, as `pnpm pack` writes it.
function manifestOffences(folder: string, manifest: Manifest, root: string): readonly string[] {
	const exported = Object.entries(manifest.publishConfig?.exports ?? manifest.exports ?? {}).flatMap(([path, target]) => exportOffences(path, target));
	const offences = [...MANIFEST_RULES.flatMap((rule) => rule(manifest, folder) ?? []), ...exported].map((offence) => `${folder}/package.json: ${offence}`);
	return existsSync(join(root, folder, "README.md")) ? offences : [...offences, `${folder}: no README.md`];
}

// `1.0.0` as numbers, compared part by part.
const versionOf = (text: string): readonly number[] => text.split(/[.-]/).slice(0, 3).map(Number);
function below(a: readonly number[], b: readonly number[]): boolean {
	const index = [0, 1, 2].find((part) => (a[part] ?? 0) !== (b[part] ?? 0));
	return index !== undefined && (a[index] ?? 0) < (b[index] ?? 0);
}

// One version per line, the plugins' below the platform's.
function lineOffences(list: ReleaseList, packages: ReturnType<typeof workspace>): readonly string[] {
	const versions = (line: string): readonly string[] => [...new Set(list.packages.filter((entry) => entry.line === line).flatMap((entry) => packages.get(entry.name)?.manifest.version ?? []))];
	const [platform, plugins] = [versions("platform"), versions("plugins")];
	const offences = [platform, plugins].filter((line) => line.length > 1).map((line) => `a version line holds more than one version: ${line.join(", ")}`);
	const [top = "", low = ""] = [platform[0], plugins[0]];
	if (platform.length === 1 && plugins.length === 1 && !below(versionOf(low), versionOf(top))) offences.push(`the plugins' line ${low} is not below the platform's ${top}`);
	return offences;
}

// The umbrella's own `swt` bin, with its dependency on the CLI.
const umbrellaBin = (umbrella: Manifest | undefined): boolean => umbrella === undefined || (umbrella.bin?.swt !== undefined && umbrella.dependencies?.["@swarmtales/cli"] !== undefined);
// The CLI's published `swt` bin.
const cliBin = (cli: Manifest | undefined): boolean => cli === undefined || (cli.publishConfig?.bin ?? cli.bin)?.swt === "./dist/bin.js";

// The `swt` bins of the umbrella and the CLI.
function binOffences(packages: ReturnType<typeof workspace>): readonly string[] {
	return [
		...(umbrellaBin(packages.get("swarmtales")?.manifest) ? [] : ["swarmtales: needs its own bin swt and a dependency on @swarmtales/cli"]),
		...(cliBin(packages.get("@swarmtales/cli")?.manifest) ? [] : ["@swarmtales/cli: the published bin swt is not ./dist/bin.js"]),
	];
}

// The platform line against `PLATFORM_LINE` and the base mechanics.
function platformOffences(list: ReleaseList, packages: ReturnType<typeof workspace>, platformLine: readonly string[]): readonly string[] {
	const platform = list.packages.filter((entry) => entry.line === "platform").map((entry) => entry.name);
	const bases = [...packages.values()].filter(({ manifest }) => manifest.swarmtales?.class === "base" && !platform.includes(manifest.name));
	return [
		...platform.filter((name) => !platformLine.includes(name)).map((name) => `${name}: on the platform line, not in PLATFORM_LINE of apps/cli/src/doctor.ts`),
		...platformLine.filter((name) => !platform.includes(name)).map((name) => `${name}: in PLATFORM_LINE of apps/cli/src/doctor.ts, not on the platform line`),
		...bases.map(({ manifest }) => `${manifest.name}: a base mechanic, not on the platform line`),
		...binOffences(packages),
	];
}

/** What is wrong with the published list against the workspace of a root; empty when it holds. */
function releaseListOffences(list: ReleaseList, root: string, platformLine: readonly string[]): readonly string[] {
	const packages = workspace(root);
	const listed = new Map(list.packages.map((entry) => [entry.name, entry]));
	const offences = list.packages.length === 0 ? ["scripts/release/packages.json: the list is empty"] : [];
	if (listed.size < list.packages.length) offences.push("scripts/release/packages.json: a package is listed twice");
	for (const entry of list.packages) {
		const found = packages.get(entry.name);
		if (found?.folder !== entry.folder) {
			offences.push(`${entry.name}: no workspace package of that name in ${entry.folder}`);
			continue;
		}
		offences.push(...manifestOffences(entry.folder, found.manifest, root));
		const needs = Object.keys({ ...found.manifest.dependencies, ...found.manifest.peerDependencies, ...found.manifest.optionalDependencies });
		offences.push(...needs.filter((name) => packages.has(name) && !listed.has(name)).map((name) => `${entry.name}: depends on ${name}, which is not listed`));
	}
	for (const [name, { folder, manifest }] of packages) if (!listed.has(name) && manifest.private !== true) offences.push(`${folder}: neither listed nor private`);
	return [...offences, ...lineOffences(list, packages), ...platformOffences(list, packages, platformLine)];
}

const LIST: ReleaseList = Value.Parse(ReleaseList, JSON.parse(readFileSync(join(REPO_ROOT, "scripts", "release", "packages.json"), "utf8")));

const GOOD = { version: "1.0.0", license: LICENCE, files: ["dist"], engines: { node: ">=22.19" }, exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } } };

// A root with the given packages (folder to manifest fields) and a README in each.
function fixture(packages: Readonly<Record<string, Record<string, unknown>>>): string {
	const root = mkdtempSync(join(tmpdir(), "swt-release-list-"));
	for (const [folder, fields] of Object.entries(packages)) {
		mkdirSync(join(root, folder), { recursive: true });
		writeFileSync(join(root, folder, "package.json"), JSON.stringify({ repository: { url: "git+https://github.com/florianpirchner/swarmtales.git", directory: folder }, ...GOOD, ...fields }));
		writeFileSync(join(root, folder, "README.md"), "");
	}
	return root;
}

const listOf = (...packages: ReleaseList["packages"]): ReleaseList => ({ description: "", lines: {}, packages });
const entry = (name: string, folder: string, line: "platform" | "plugins" = "platform"): ReleaseList["packages"][number] => ({ name, folder, line });

describe("the published list", () => {
	it("holds in this repository: 20 packages on the platform line, every other mechanic on the plugins line", () => {
		expect(releaseListOffences(LIST, REPO_ROOT, PLATFORM_LINE)).toEqual([]);
		expect(LIST.packages.filter((listed) => listed.line === "platform")).toHaveLength(20);
		expect(LIST.packages.filter((listed) => listed.line === "plugins").map((listed) => listed.folder)).toContain("mechanics/city-directors");
	});

	it("rejects an empty list, a package listed twice, and a listed name that is not in its folder", () => {
		const root = fixture({ "packages/a": { name: "a" } });
		expect(releaseListOffences(listOf(), root, [])).toEqual(["scripts/release/packages.json: the list is empty", "packages/a: neither listed nor private"]);
		expect(releaseListOffences(listOf(entry("a", "packages/a"), entry("a", "packages/a")), root, ["a"])).toEqual(["scripts/release/packages.json: a package is listed twice"]);
		expect(releaseListOffences(listOf(entry("a", "packages/b")), root, ["a"])).toEqual(["a: no workspace package of that name in packages/b"]);
	});

	it("rejects a package that is neither listed nor private, and a listed one that depends on it", () => {
		const root = fixture({ "packages/a": { name: "a", dependencies: { b: "workspace:*", typebox: "1.3.27" } }, "games/b": { name: "b" }, "games/c": { name: "c", private: true } });
		expect(releaseListOffences(listOf(entry("a", "packages/a")), root, ["a"])).toEqual(["a: depends on b, which is not listed", "games/b: neither listed nor private"]);
	});

	it("rejects a listed package without what a tarball needs", () => {
		const root = fixture({ "packages/a": { name: "a", private: true, license: "MIT", files: ["dist", "src"], repository: undefined, engines: undefined, exports: { ".": "./dist/index.js", "./x": { development: "./src/x.ts", types: "./dist/x.d.ts" } } } });
		expect(releaseListOffences(listOf(entry("a", "packages/a")), root, ["a"])).toEqual([
			"packages/a/package.json: listed, and private",
			"packages/a/package.json: license is not LicenseRef-SUL-1.0",
			"packages/a/package.json: files must hold dist and no src or test",
			"packages/a/package.json: repository does not name the repository and packages/a",
			"packages/a/package.json: no engines.node",
			"packages/a/package.json: the published export . has no types entry",
			"packages/a/package.json: the published export ./x keeps the development condition",
		]);
		const published = fixture({ "packages/a": { name: "a", exports: { ".": { development: "./src/index.ts" }, "./src/*": "./src/*" }, publishConfig: { exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } } } } });
		expect(releaseListOffences(listOf(entry("a", "packages/a")), published, ["a"])).toEqual([]);
	});

	it("rejects two versions on a line, and a plugins' line that is not below the platform's", () => {
		const root = fixture({ "packages/a": { name: "a" }, "packages/b": { name: "b", version: "1.0.1" }, "mechanics/c": { name: "c", version: "1.0.0" } });
		expect(releaseListOffences(listOf(entry("a", "packages/a"), entry("b", "packages/b"), entry("c", "mechanics/c", "plugins")), root, ["a", "b"])).toEqual(["a version line holds more than one version: 1.0.0, 1.0.1"]);
		expect(releaseListOffences(listOf(entry("a", "packages/a"), entry("c", "mechanics/c", "plugins")), fixture({ "packages/a": { name: "a" }, "mechanics/c": { name: "c", version: "1.0.0" } }), ["a"])).toEqual(["the plugins' line 1.0.0 is not below the platform's 1.0.0"]);
	});

	it("rejects a platform line other than PLATFORM_LINE of swt doctor, and a base mechanic off it (errata K15)", () => {
		const root = fixture({ "packages/a": { name: "a" }, "mechanics/m": { name: "m", version: "0.1.0", swarmtales: { class: "base" } } });
		expect(releaseListOffences(listOf(entry("a", "packages/a"), entry("m", "mechanics/m", "plugins")), root, ["a", "z"])).toEqual(["z: in PLATFORM_LINE of apps/cli/src/doctor.ts, not on the platform line", "m: a base mechanic, not on the platform line"]);
		expect(releaseListOffences(listOf(entry("a", "packages/a"), entry("m", "mechanics/m", "plugins")), root, [])[0]).toBe("a: on the platform line, not in PLATFORM_LINE of apps/cli/src/doctor.ts");
	});

	it("rejects an umbrella without its swt bin or its dependency on the CLI, and a CLI without its published bin", () => {
		const root = fixture({ "packages/swarmtales": { name: "swarmtales", bin: { swt: "./dist/swt.js" } }, "apps/cli": { name: "@swarmtales/cli", bin: { swt: "./src/bin.ts" } } });
		expect(releaseListOffences(listOf(entry("swarmtales", "packages/swarmtales"), entry("@swarmtales/cli", "apps/cli")), root, ["swarmtales", "@swarmtales/cli"])).toEqual(["swarmtales: needs its own bin swt and a dependency on @swarmtales/cli", "@swarmtales/cli: the published bin swt is not ./dist/bin.js"]);
	});
});

describe("LICENSE and NOTICE of a tarball", () => {
	it("the build copies the project's LICENSE and writes a NOTICE whose first lines are the root NOTICE's", () => {
		expect(existsSync(LICENSE_FILE)).toBe(true);
		expect(libraryConfig.copy).toEqual([LICENSE_FILE]);
		const root = readFileSync(join(REPO_ROOT, "NOTICE"), "utf8").split("\n");
		expect(PACKAGE_NOTICE.split("\n").slice(0, 2)).toEqual(root.slice(0, 2));
	});

	it("the package NOTICE names no file that only a clone holds, and the build inlines no package", () => {
		for (const name of ["LICENSE-FAQ.md", "THIRD-PARTY-LICENSES.md", "third_party/"]) expect(PACKAGE_NOTICE).not.toContain(name);
		expect(libraryConfig.deps).toEqual({ onlyBundle: [] });
	});
});
