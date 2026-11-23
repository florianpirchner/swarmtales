// SPDX-License-Identifier: LicenseRef-SUL-1.0
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

/**
 * Licence families that are never allowed, with no exception path. A match makes the message say so. The project's
 * own licence is among them: a third-party package under a source-available licence would bind the project to
 * someone else's terms.
 */
export const NEVER_ALLOWED = /^(GPL|LGPL|AGPL|MPL|EPL|CDDL|EUPL|OSL|CC-BY-SA|CC-BY-NC|OFL|SSPL|BUSL|Elastic|LicenseRef-SUL)(-|$)|^UNLICENSED$/i;

/**
 * The licence of the project itself (decision A65): the Sustainable Use License 1.0 with the Additional Terms of
 * `LICENSE`. It is the SPDX header of every source file and the `license` of every workspace package. It is not an
 * allowed licence for a dependency: a package of the lockfile is judged against {@link ALLOWED_LICENCES} only.
 */
export const PROJECT_LICENCE = "LicenseRef-SUL-1.0";

/**
 * The GitHub Actions a workflow may use, each with the licence of its repository, read from the licence file at the
 * pinned commit. A workflow pins an action by a full commit id. A new action needs a dependency issue.
 */
export const ALLOWED_ACTIONS: ReadonlyMap<string, string> = new Map([
	["actions/checkout", "MIT"],
	["actions/setup-node", "MIT"],
	["pnpm/action-setup", "MIT"],
	["actions/upload-pages-artifact", "MIT"],
	["actions/deploy-pages", "MIT"],
]);
