// SPDX-License-Identifier: Apache-2.0
/**
 * The licence allowlist (DECISIONS.md, section 5.2; `docs/LICENCE-POLICY.md`). A licence comes onto this list only
 * through an issue that quotes its text and shows that it has no share-alike and no source-disclosure duty.
 */

/** SPDX ids, and ids with an exception, that a package may be used under. */
export const ALLOWED_LICENCES: ReadonlySet<string> = new Set([
	// permissive code
	"Apache-2.0", "MIT", "MIT-0", "ISC", "BSD-2-Clause", "BSD-3-Clause", "0BSD", "Zlib", "BlueOak-1.0.0", "Python-2.0",
	"Apache-2.0 WITH LLVM-exception",
	// public domain
	"CC0-1.0", "Unlicense",
	// data and text inside packages
	"CC-BY-4.0", "CC-BY-3.0", "Unicode-3.0", "Unicode-DFS-2016",
]);

/** Licence families that are never allowed, with no exception path. A match makes the message say so. */
export const NEVER_ALLOWED = /^(GPL|LGPL|AGPL|MPL|EPL|CDDL|EUPL|OSL|CC-BY-SA|CC-BY-NC|OFL|SSPL|BUSL)(-|$)|^UNLICENSED$/i;

/** The licence of the project itself: the SPDX header of every source file and the `license` of every package. */
export const PROJECT_LICENCE = "Apache-2.0";

/**
 * The GitHub Actions a workflow may use, each with the licence of its repository, read from the licence file at the
 * pinned commit. A workflow pins an action by a full commit id. A new action needs a dependency issue.
 */
export const ALLOWED_ACTIONS: ReadonlyMap<string, string> = new Map([
	["actions/checkout", "MIT"],
	["actions/setup-node", "MIT"],
	["pnpm/action-setup", "MIT"],
]);
