// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The lockfile of the outside project of the packed-install gate (`13-m6-spec.md` 2.1, the way out of its first
 * test): an install without a lockfile resolves every third-party range, which needs the registry's metadata, and a
 * frozen install of the workspace caches the tarballs but not always the metadata (`ERR_PNPM_NO_OFFLINE_META` on a
 * fresh runner). So the gate writes the project's `pnpm-lock.yaml` from the workspace's: each packed package depends
 * on what its importer of the workspace lockfile resolved (a `link:` becomes the tarball of that package), and the
 * entries of the third-party packages they reach are copied as they stand. Then `pnpm install --frozen-lockfile
 * --offline` resolves nothing and only reads the store. The lockfile is read by its lines, as pnpm writes it.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** One package that the outside project installs from a tarball. */
export interface PackedPackage {
	/** The package name. */
	readonly name: string;
	/** Its version. */
	readonly version: string;
	/** The `file:` reference from the project to its tarball. */
	readonly ref: string;
	/** The tarball, for its integrity. */
	readonly tarball: string;
	/** Its dependencies: name to the version as the workspace lockfile resolved it, or a packed package's name. */
	readonly dependencies: Readonly<Record<string, string>>;
}

/** The blocks of one top-level section: the key of each entry to its lines. */
type Section = ReadonlyMap<string, readonly string[]>;

const unquote = (key: string): string => key.replace(/^'(.*)'$/, "$1");
const quote = (key: string): string => (/^[a-z0-9]/.test(key) && !key.includes(":") ? key : `'${key}'`);

/**
 * Splits a lockfile into its top-level sections, each into its entries (indented by two spaces).
 *
 * @param text - The lockfile.
 * @returns The section name to its entries.
 */
export function sections(text: string): ReadonlyMap<string, Section> {
	const found = new Map<string, Map<string, string[]>>();
	let section: Map<string, string[]> | undefined;
	let entry: string[] | undefined;
	for (const line of text.split("\n")) {
		const top = /^([a-z]+):/i.exec(line);
		if (top?.[1] !== undefined) {
			section = new Map();
			found.set(top[1], section);
			entry = undefined;
		} else if (/^ {2}\S/.test(line) && section !== undefined) {
			entry = [];
			section.set(unquote(line.trim().replace(/:( \{\})?$/, "")), entry);
			if (line.endsWith(" {}")) entry.push("{}");
		} else if (line.trim() !== "") entry?.push(line);
	}
	return found;
}

/**
 * The resolved dependencies of one importer of the workspace lockfile (its `dependencies` only).
 *
 * @param importer - The lines of the importer.
 * @returns Name to resolved version (`link:<path>` for a workspace package).
 */
export function importerDependencies(importer: readonly string[]): Readonly<Record<string, string>> {
	const result: Record<string, string> = {};
	let group = "";
	let name = "";
	for (const line of importer) {
		const head = /^ {4}(\w+):$/.exec(line);
		if (head?.[1] !== undefined) group = head[1];
		const dependency = /^ {6}(\S.*):$/.exec(line);
		if (dependency?.[1] !== undefined) name = unquote(dependency[1]);
		const version = /^ {8}version: (.*)$/.exec(line);
		if (version?.[1] !== undefined && group === "dependencies") result[name] = version[1];
	}
	return result;
}

/** The dependencies a snapshot entry names, as snapshot keys. */
function snapshotChildren(lines: readonly string[]): readonly string[] {
	let group = "";
	const children: string[] = [];
	for (const line of lines) {
		const head = /^ {4}(\w+):$/.exec(line);
		if (head?.[1] !== undefined) group = head[1];
		const child = /^ {6}(\S+): (\S+)$/.exec(line);
		if (child?.[1] !== undefined && child[2] !== undefined && (group === "dependencies" || group === "optionalDependencies")) children.push(`${unquote(child[1])}@${child[2]}`);
	}
	return children;
}

/**
 * The third-party snapshot keys a set of packages reaches, with every package they need in turn.
 *
 * @param roots - The snapshot keys the packed packages and the project name directly.
 * @param snapshots - The snapshots of the workspace lockfile.
 * @returns The keys, sorted.
 * @throws RangeError when a key has no snapshot in the workspace lockfile.
 */
export function closure(roots: readonly string[], snapshots: Section): readonly string[] {
	const seen = new Set<string>();
	const queue = [...roots];
	for (let key = queue.shift(); key !== undefined; key = queue.shift()) {
		if (seen.has(key)) continue;
		const lines = snapshots.get(key);
		if (lines === undefined) throw new RangeError(`outside lockfile: the workspace lockfile has no snapshot ${key}`);
		seen.add(key);
		queue.push(...snapshotChildren(lines));
	}
	return [...seen].sort();
}

const integrity = (file: string): string => `sha512-${createHash("sha512").update(readFileSync(file)).digest("base64")}`;
const block = (key: string, lines: readonly string[]): string => (lines[0] === "{}" ? `  ${quote(key)}: {}` : [`  ${quote(key)}:`, ...lines].join("\n"));

/**
 * Writes the lockfile of the outside project.
 *
 * @param workspace - The text of the workspace's `pnpm-lock.yaml`.
 * @param packed - The packed packages; each dependency that names a packed package points at its tarball.
 * @param direct - The project's dependencies: a packed package's name, or a third-party name with its version.
 * @returns The lockfile, for `pnpm install --frozen-lockfile --offline`.
 * @throws RangeError when a third-party package is not in the workspace lockfile.
 */
export function outsideLockfile(workspace: string, packed: readonly PackedPackage[], direct: Readonly<Record<string, string>>): string {
	const lock = sections(workspace);
	const snapshots = lock.get("snapshots") ?? new Map<string, readonly string[]>();
	const packages = lock.get("packages") ?? new Map<string, readonly string[]>();
	const byName = new Map(packed.map((entry) => [entry.name, entry]));
	const resolved = (name: string, version: string): string => byName.get(name)?.ref ?? version;
	const third = (deps: Readonly<Record<string, string>>): readonly string[] => Object.entries(deps).filter(([name]) => !byName.has(name)).map(([name, version]) => `${name}@${version}`);
	const keys = closure([...packed.flatMap((entry) => third(entry.dependencies)), ...third(direct)], snapshots);
	const deps = (record: Readonly<Record<string, string>>): readonly string[] => Object.entries(record).sort(([left], [right]) => left.localeCompare(right)).map(([name, version]) => `      ${quote(name)}: ${resolved(name, version)}`);
	const importer = Object.entries(direct).sort(([left], [right]) => left.localeCompare(right)).flatMap(([name, version]) => [`      ${quote(name)}:`, `        specifier: ${resolved(name, version)}`, `        version: ${resolved(name, version)}`]);
	const bare = (key: string): string => key.replace(/\(.*$/, "");
	return [
		"lockfileVersion: '9.0'",
		"",
		"settings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false",
		"",
		["overrides:", ...packed.map((entry) => `  ${quote(entry.name)}: ${entry.ref}`)].join("\n"),
		"",
		["importers:", "", "  .:", "    dependencies:", ...importer].join("\n"),
		"",
		["packages:", "", ...packed.map((entry) => block(`${entry.name}@${entry.ref}`, [`    resolution: {integrity: ${integrity(entry.tarball)}, tarball: ${entry.ref}}`, `    version: ${entry.version}`])), ...[...new Set(keys.map(bare))].map((key) => block(key, packages.get(key) ?? []))].join("\n\n"),
		"",
		["snapshots:", "", ...packed.map((entry) => block(`${entry.name}@${entry.ref}`, Object.keys(entry.dependencies).length === 0 ? ["{}"] : ["    dependencies:", ...deps(entry.dependencies)])), ...keys.map((key) => block(key, snapshots.get(key) ?? []))].join("\n\n"),
		"",
	].join("\n");
}
