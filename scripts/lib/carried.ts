// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The documents carried from the old platform (DECISIONS.md, section 8.3). They are evidence and stay as they were
 * written: the name lint does not read them, and their links into old code and runs point at the tag `v0-final`.
 */
export const CARRIED_DOCS = [
	"docs/refactoring-before-release/",
	"docs/LESSONS-LEARNED.md",
	"docs/FINDINGS.md",
	"docs/RUNTIME-REVISIONS.md",
	"docs/ideas/",
	"docs/history/",
	"oracles/",
] as const;

/**
 * Says whether a path is a carried document.
 *
 * @param path - The path, relative to the repository root.
 * @returns True for a file on the carry list.
 */
export function isCarried(path: string): boolean {
	return CARRIED_DOCS.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry));
}
