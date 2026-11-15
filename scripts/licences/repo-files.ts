// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The licence checks on the repository's own files: SPDX headers, `package.json` files, workflows, vendored folders. */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { ALLOWED_ACTIONS, PROJECT_LICENCE } from "./allowlist.ts";

/** A file with its text. */
export interface TextFile {
	readonly path: string;
	readonly text: string;
}

const HEADER = `// SPDX-License-Identifier: ${PROJECT_LICENCE}`;

/**
 * Checks that every source file starts with the SPDX line. A `#!` line may come first. Vendored files under
 * `third_party/` keep the header of their source; their licence is in the manifest.
 *
 * @param files - The source files.
 * @returns One offence per file without the header.
 */
export function checkHeaders(files: readonly TextFile[]): readonly string[] {
	return files
		.filter(({ path }) => !path.startsWith("third_party/"))
		.filter(({ text }) => {
			const lines = text.split(/\r?\n/, 2);
			return (lines[0]?.startsWith("#!") === true ? lines[1] : lines[0]) !== HEADER;
		})
		.map(({ path }) => `${path}: the first line must be "${HEADER}"`);
}

const Versions = Type.Optional(Type.Record(Type.String(), Type.String()));
const Manifest = Type.Object({
	license: Type.Optional(Type.String()),
	dependencies: Versions,
	devDependencies: Versions,
	peerDependencies: Versions,
	optionalDependencies: Versions,
});
const EXACT = /^(\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?|workspace:\*)$/;

/**
 * Checks the `package.json` files: the licence field and exact dependency versions.
 *
 * @param files - The `package.json` files of the repository.
 * @returns One offence per wrong licence field and per version range.
 */
export function checkManifests(files: readonly TextFile[]): readonly string[] {
	return files.flatMap(({ path, text }) => {
		const raw: unknown = JSON.parse(text);
		if (!Value.Check(Manifest, raw)) return [`${path}: the licence and dependency fields must be strings`];
		const offences = raw.license === PROJECT_LICENCE ? [] : [`${path}: "license" must be "${PROJECT_LICENCE}"`];
		const groups = [raw.dependencies, raw.devDependencies, raw.peerDependencies, raw.optionalDependencies];
		for (const [name, version] of groups.flatMap((group) => Object.entries(group ?? {}))) {
			if (!EXACT.test(version)) offences.push(`${path}: ${name} has the version "${version}"; name one exact version`);
		}
		return offences;
	});
}

const USES = /(?:^|[\s{,"'-])uses["']?\s*:\s*["']?([^"'\s#,}]+)/g;
const PINNED_ACTION = /^([\w.-]+\/[\w.-]+)(?:\/[^@]*)?@([0-9a-f]{40})$/;
const IMAGE = /(?:^|[\s{,"'-])(?:container|image)["']?\s*:/;

/** One `uses:` of a workflow file. */
interface Use {
	readonly path: string;
	readonly line: number;
	readonly used: string;
}

function usesOf(files: readonly TextFile[]): readonly Use[] {
	return files.flatMap(({ path, text }) =>
		text.split(/\r?\n/).flatMap((content, index) =>
			[...content.replace(/^\s*#.*$/, "").matchAll(USES)].map((match) => ({ path, line: index + 1, used: match[1] ?? "" })),
		),
	);
}

/**
 * Lists the allowed, pinned actions that the workflows use, for the inventory.
 *
 * @param files - The YAML files under `.github/`.
 * @returns Each action with its commit, once.
 */
export function usedActions(files: readonly TextFile[]): readonly { readonly action: string; readonly commit: string }[] {
	const found = new Map<string, { readonly action: string; readonly commit: string }>();
	for (const { used } of usesOf(files)) {
		const [, action, commit] = PINNED_ACTION.exec(used) ?? [];
		if (action !== undefined && commit !== undefined) found.set(`${action}@${commit}`, { action, commit });
	}
	return [...found.values()];
}

/**
 * Checks the workflow files: every `uses:` names an allowed action, pinned by a full commit id, and no job runs in
 * a container image, which would be a download that no gate judges.
 *
 * @param files - The YAML files under `.github/` (workflows and local actions).
 * @returns One offence per line that breaks the rule, and one when there is no workflow at all.
 */
export function checkWorkflows(files: readonly TextFile[]): readonly string[] {
	const images = files.flatMap(({ path, text }) =>
		text.split(/\r?\n/).flatMap((content, index) =>
			IMAGE.test(content.replace(/^\s*#.*$/, "")) ? [`${path}:${index + 1}: a container image is a download that the licence gate cannot judge; run on the hosted runner`] : [],
		),
	);
	const uses = usesOf(files).flatMap(({ path, line, used }) => {
		const action = PINNED_ACTION.exec(used)?.[1];
		if (action === undefined) return [`${path}:${line}: "${used}" must be pinned by a full commit id (owner/repo@<40 hex digits>)`];
		return ALLOWED_ACTIONS.has(action) ? [] : [`${path}:${line}: the action ${action} is not on the list in scripts/licences/allowlist.ts`];
	});
	const none = files.some(({ path }) => path.startsWith(".github/workflows/")) ? [] : [".github/workflows/: no workflow found; the check workflow must exist"];
	return [...none, ...uses, ...images];
}

/** One entry directly under `third_party/`. */
export interface VendoredEntry {
	readonly name: string;
	readonly isFolder: boolean;
	/** True for a folder with a `LICENSE` file inside. */
	readonly hasLicence: boolean;
}

/** The files of `third_party/` itself. */
const THIRD_PARTY_FILES = new Set(["README.md", "manifest.json"]);

/**
 * Checks `third_party/` against the manifest: each folder has a row and a licence text, each row a folder, and no
 * file lies loose beside the folders.
 *
 * @param entries - The entries directly under `third_party/`.
 * @param rows - The names in `third_party/manifest.json`.
 * @returns One offence per loose file, per folder without a row or a licence text, and per row without a folder.
 */
export function checkVendored(entries: readonly VendoredEntry[], rows: readonly string[]): readonly string[] {
	const folders = entries.filter((entry) => entry.isFolder);
	const names = new Set(folders.map((folder) => folder.name));
	return [
		...entries.filter((entry) => !entry.isFolder && !THIRD_PARTY_FILES.has(entry.name)).map((entry) => `third_party/${entry.name}: a vendored file lives in a folder third_party/<name>/ with a LICENSE and a manifest row`),
		...folders.filter((folder) => !rows.includes(folder.name)).map((folder) => `third_party/${folder.name}: no row in third_party/manifest.json`),
		...folders.filter((folder) => !folder.hasLicence).map((folder) => `third_party/${folder.name}: no LICENSE file with the licence text of the source`),
		...rows.filter((name) => !names.has(name)).map((name) => `third_party/manifest.json: the row ${name} has no folder`),
		...rows.filter((name, index) => rows.indexOf(name) !== index).map((name) => `third_party/manifest.json: two rows for ${name}`),
	];
}
