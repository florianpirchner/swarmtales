// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm release:version <platform> <plugins>`: writes the version of each line into every listed `package.json`
 * (`13-m6-spec.md` 6.3), and into `CITATION.cff` when it exists, with today's `date-released` (decision A139). Its
 * commit is the release candidate, an integrator's commit. It writes files only: no commit, no tag, no network.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../lib/files.ts";
import { readList } from "./list.ts";

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/**
 * Sets the top-level `version` of a `package.json` text, keeping every other byte.
 *
 * @param text - The file's text.
 * @param version - The new version.
 * @returns The new text, or `undefined` when the text has no top-level `version` line.
 */
export function withVersion(text: string, version: string): string | undefined {
	const line = /^(\t| {2})"version": "[^"]*",?$/m;
	if (!line.test(text)) return undefined;
	return text.replace(line, (found) => found.replace(/"version": "[^"]*"/, `"version": "${version}"`));
}

/**
 * Sets `version` and `date-released` of a `CITATION.cff` text; a missing `date-released` is added after `version`.
 *
 * @param text - The file's text.
 * @param version - The platform version.
 * @param date - The release date, `YYYY-MM-DD`.
 * @returns The new text.
 */
export function withCitation(text: string, version: string, date: string): string {
	const versioned = /^version: .*$/m.test(text) ? text.replace(/^version: .*$/m, `version: "${version}"`) : `${text.trimEnd()}\nversion: "${version}"\n`;
	return /^date-released: .*$/m.test(versioned) ? versioned.replace(/^date-released: .*$/m, `date-released: "${date}"`) : versioned.replace(/^version: .*$/m, (line) => `${line}\ndate-released: "${date}"`);
}

/**
 * Writes the two versions into the listed packages of a root, and into its `CITATION.cff`.
 *
 * @param root - The repository root.
 * @param platform - The version of the platform line.
 * @param plugins - The version of the plugins' line, below the platform's (the gate of the published list, which
 *   `pnpm release:check` runs, refuses it otherwise).
 * @param date - The release date for `CITATION.cff`.
 * @returns One line per problem; nothing is written when there is one.
 */
export function setVersions(root: string, platform: string, plugins: string, date: string): readonly string[] {
	if (!SEMVER.test(platform) || !SEMVER.test(plugins)) return [`not a version: ${SEMVER.test(platform) ? plugins : platform}`];
	const written = readList(root).map((entry) => ({ file: join(root, entry.folder, "package.json"), text: withVersion(readFileSync(join(root, entry.folder, "package.json"), "utf8"), entry.line === "platform" ? platform : plugins) }));
	const problems = written.filter((entry) => entry.text === undefined).map((entry) => `${entry.file}: no top-level version line`);
	if (problems.length > 0) return problems;
	for (const { file, text } of written) if (text !== undefined) writeFileSync(file, text);
	const citation = join(root, "CITATION.cff");
	if (existsSync(citation)) writeFileSync(citation, withCitation(readFileSync(citation, "utf8"), platform, date));
	return [];
}

function main(args: readonly string[]): number {
	const [platform, plugins] = args;
	if (platform === undefined || plugins === undefined) {
		console.error("usage: pnpm release:version <platform> <plugins>, for example 1.0.0 0.1.0");
		return 2;
	}
	const problems = setVersions(REPO_ROOT, platform, plugins, new Date().toISOString().slice(0, 10));
	for (const problem of problems) console.error(`release:version: ${problem}`);
	if (problems.length === 0) console.log(`release:version: platform ${platform}, plugins ${plugins}; commit it as the release candidate, then run pnpm release:check ${platform}`);
	return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === import.meta.filename) process.exitCode = main(process.argv.slice(2));
