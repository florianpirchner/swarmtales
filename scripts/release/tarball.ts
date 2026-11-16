// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The content check of a tarball (`13-m6-spec.md` 6.2, errata K33 and K34), shared by `pnpm release:check` and the
 * packed-install gate: a tarball is read into its files (a gzip of a ustar archive, read here without a `tar`
 * command), and {@link tarballProblems} names everything a published package must not lack or hold. The leak scan
 * (`swt scan`) runs over the unpacked folders apart, once for all.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

/** The files of a tarball: the path below `package/` to the bytes. */
export type TarballFiles = ReadonlyMap<string, Buffer>;

const text = (block: Buffer, start: number, length: number): string => block.subarray(start, start + length).toString("utf8").replace(/\0.*$/s, "");

/**
 * Reads a packed tarball: every regular file below its top folder `package/`.
 *
 * @param file - The `.tgz` file.
 * @returns The files, by their path below `package/`.
 * @throws What `gunzipSync` throws when the file is no gzip.
 */
export function readTarball(file: string): TarballFiles {
	const archive = gunzipSync(readFileSync(file));
	const files = new Map<string, Buffer>();
	for (let offset = 0; offset + 512 <= archive.length; ) {
		const header = archive.subarray(offset, offset + 512);
		const name = text(header, 0, 100);
		if (name === "") break;
		const size = Number.parseInt(text(header, 124, 12).trim() || "0", 8);
		const prefix = text(header, 345, 155);
		const path = (prefix === "" ? name : `${prefix}/${name}`).replace(/^package\//, "");
		const type = text(header, 156, 1);
		if (type === "" || type === "0") files.set(path, archive.subarray(offset + 512, offset + 512 + size));
		offset += 512 + Math.ceil(size / 512) * 512;
	}
	return files;
}

/**
 * Writes the files of a tarball into a folder, for the leak scan.
 *
 * @param files - The files of a tarball.
 * @param folder - The folder; created.
 */
export function unpackInto(files: TarballFiles, folder: string): void {
	for (const [path, bytes] of files) {
		mkdirSync(dirname(join(folder, path)), { recursive: true });
		writeFileSync(join(folder, path), bytes);
	}
}

const Names = Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Package names to versions" }));
const Packed = Type.Object({
	name: Type.String({ description: "The package name" }),
	license: Type.Optional(Type.String({ description: "The SPDX licence" })),
	files: Type.Optional(Type.Array(Type.String(), { description: "What the tarball holds" })),
	exports: Type.Optional(Type.Record(Type.String(), Type.Unknown(), { description: "The published exports map" })),
	bin: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "The published bins" })),
	dependencies: Names, peerDependencies: Names, optionalDependencies: Names,
}, { description: "The fields of a packed package.json that the content check reads" });

/**
 * What the content check compares a tarball against: the project's `LICENSE` (`licence`), which `dist/LICENSE` must
 * equal; the files that the root `NOTICE` names and only a clone holds (`cloneOnly`), of which a tarball's `NOTICE`
 * names none it lacks; and text no file may hold (`localPaths`), such as the absolute path of the clone.
 */
export interface TarballExpectation { readonly licence: string; readonly cloneOnly: readonly string[]; readonly localPaths: readonly string[] }

const LICENCE = "LicenseRef-SUL-1.0";
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const ALWAYS = /^(package\.json|readme(\.md)?|licen[cs]e(\.md)?)$/i;
const FORBIDDEN = /(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)\.env|(^|\/)\.npmrc$/;
const HOME = /\/(home|Users)\/[A-Za-z0-9._-]+\//;

/** Every file a published export or bin points at. */
function targets(packed: Static<typeof Packed>): readonly string[] {
	const found: string[] = Object.values(packed.bin ?? {});
	const walk = (value: unknown): void => {
		if (typeof value === "string") found.push(value);
		else if (typeof value === "object" && value !== null) for (const inner of Object.values(value)) walk(inner);
	};
	walk(packed.exports);
	return found.map((target) => target.replace(/^\.\//, ""));
}

function manifestProblems(packed: Static<typeof Packed>, files: TarballFiles): readonly string[] {
	const deps = { ...packed.dependencies, ...packed.peerDependencies, ...packed.optionalDependencies };
	const typesOf = Object.values(packed.exports ?? {}).filter((entry) => typeof entry !== "object" || entry === null || typeof Reflect.get(entry, "types") !== "string");
	return [
		...(packed.license === LICENCE ? [] : [`package.json: license is not ${LICENCE}`]),
		...Object.entries(deps).filter(([, range]) => !EXACT.test(range)).map(([name, range]) => `package.json: ${name} is not at an exact version (${range})`),
		...targets(packed).filter((path) => !files.has(path)).map((path) => `package.json names ${path}, which the tarball lacks`),
		...(typesOf.length === 0 ? [] : ["package.json: a published export has no types entry"]),
	];
}

function fileProblems(paths: readonly string[], packed: Static<typeof Packed>): readonly string[] {
	const inFiles = (path: string): boolean => ALWAYS.test(path) || (packed.files ?? []).some((entry) => path === entry || path.startsWith(`${entry.replace(/\/$/, "")}/`));
	const exportsOf = (kind: string): boolean => paths.some((path) => path.startsWith("dist/") && path.endsWith(kind));
	return [
		...paths.filter((path) => FORBIDDEN.test(path)).map((path) => `${path}: a test, .env or .npmrc file`),
		...paths.filter((path) => !inFiles(path)).map((path) => `${path}: outside files`),
		...(exportsOf(".js") && exportsOf(".d.ts") ? [] : ["dist/ holds no .js and .d.ts"]),
	];
}

/** A third-party file ships with its licence and its row of the manifest beside it. */
function thirdPartyProblems(files: TarballFiles): readonly string[] {
	const problems: string[] = [];
	const folders = new Set([...files.keys()].flatMap((path) => /^(.*third_party)\/([^/]+)\//.exec(path)?.slice(1, 3).join("\0") ?? []));
	for (const folder of folders) {
		const [base = "", name = ""] = folder.split("\0");
		if (!files.has(`${base}/${name}/LICENSE`)) problems.push(`${base}/${name}: a third-party file without its LICENSE`);
		const manifest = files.get(`${base}/manifest.json`)?.toString("utf8") ?? "";
		if (!manifest.includes(`"name": "${name}"`)) problems.push(`${base}/${name}: no row in ${base}/manifest.json`);
	}
	return problems;
}

/** The text checks: no inlined package, no local path. */
function contentProblems(files: TarballFiles, expected: TarballExpectation): readonly string[] {
	const problems: string[] = [];
	for (const [path, bytes] of files) {
		const content = bytes.toString("utf8");
		if (path.startsWith("dist/") && path.endsWith(".js") && content.includes("node_modules/")) problems.push(`${path}: the build inlined a package (node_modules/)`);
		if (expected.localPaths.some((local) => content.includes(local)) || HOME.test(content)) problems.push(`${path}: holds a local path`);
	}
	return problems;
}

/**
 * The content check of 6.2 of one tarball's files.
 *
 * @param files - The files of the tarball, from {@link readTarball}.
 * @param expected - The licence, the files only a clone holds, and the local paths.
 * @returns One line per problem; empty when the tarball may be published.
 */
export function tarballProblems(files: TarballFiles, expected: TarballExpectation): readonly string[] {
	const raw = files.get("package.json");
	if (raw === undefined) return ["no package.json"];
	const packed = Value.Parse(Packed, JSON.parse(raw.toString("utf8")));
	const notice = files.get("dist/NOTICE")?.toString("utf8");
	const required = [
		...(files.get("dist/LICENSE")?.toString("utf8") === expected.licence ? [] : ["dist/LICENSE is missing or not the project's LICENSE"]),
		...(notice === undefined ? ["dist/NOTICE is missing"] : expected.cloneOnly.filter((name) => notice.includes(name) && ![...files.keys()].some((path) => path.startsWith(name))).map((name) => `dist/NOTICE names ${name}, which the tarball lacks`)),
		...([...files.keys()].some((path) => /^readme\.md$/i.test(path)) ? [] : ["no README.md"]),
	];
	return [...required, ...manifestProblems(packed, files), ...fileProblems([...files.keys()], packed), ...thirdPartyProblems(files), ...contentProblems(files, expected)];
}
