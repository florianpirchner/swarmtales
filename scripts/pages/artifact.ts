// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The rules of the public viewer page's artifact (`apps/viewer-web/dist` after `pnpm pages:build`): the page goes
 * public while the repository is private, so it may hold the app and the runs of {@link PAGES_RUNS}, nothing else.
 * Refused anywhere: source map links, local paths, anything that looks like a key.
 */
import { PAGES_RUNS } from "./runs.ts";

/** One file of the artifact. */
export interface ArtifactFile {
	/** The path in the artifact, with `/`. */
	readonly path: string;
	/** Its text. */
	readonly text: string;
}

const RUN_PACKS = new Set(PAGES_RUNS.map((run) => `runs/${run.name}.json`));
const ALLOWED: readonly RegExp[] = [/^index\.html$/, /^assets\/[\w.-]+\.(js|css)$/, /^runs\/index\.json$/];

/** Patterns that must not appear in any file. */
const FORBIDDEN: readonly (readonly [string, RegExp])[] = [
	["a source map link", /sourceMappingURL=/],
	["a local path", /\/home\/[a-z]|\/Users\/[A-Za-z]|[A-Z]:\\\\Users\\\\/],
	["a GitHub token", /\b(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
	["an API key", /\bsk-(ant|or)-[A-Za-z0-9_-]{20,}/],
	["a private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

/**
 * Whether a path may be part of the artifact.
 *
 * @param path - The path in the artifact.
 * @returns True for the app's files and the listed run packs.
 */
export function allowedPath(path: string): boolean {
	return RUN_PACKS.has(path) || ALLOWED.some((pattern) => pattern.test(path));
}

/**
 * The broken rules of an artifact.
 *
 * @param files - Every file of the artifact.
 * @returns One line per broken rule; empty when the artifact may be published.
 */
export function artifactProblems(files: readonly ArtifactFile[]): readonly string[] {
	const problems: string[] = [];
	for (const file of files) {
		if (!allowedPath(file.path)) problems.push(`${file.path}: not part of the page`);
		for (const [what, pattern] of FORBIDDEN) if (pattern.test(file.text)) problems.push(`${file.path}: contains ${what}`);
	}
	const index = files.find((file) => file.path === "index.html");
	if (index === undefined) problems.push("index.html is missing");
	else if (!index.text.includes('http-equiv="Content-Security-Policy"')) problems.push("index.html has no Content Security Policy");
	return problems;
}
