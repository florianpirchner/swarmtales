// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { UserConfig } from "tsdown";

/**
 * The `NOTICE` of a published package (decision A123, `13-m6-spec.md` 6.2). The root `NOTICE` names files that only a
 * clone holds (`LICENSE-FAQ.md`, `THIRD-PARTY-LICENSES.md`, `third_party/`), so a tarball carries this text instead:
 * its first two lines are those of the root `NOTICE`, and it names no file the tarball lacks
 * (`scripts/gates/release-list.test.ts`).
 */
export const PACKAGE_NOTICE = `Swarm Tales
Copyright 2026 Florian Pirchner and the Swarm Tales contributors

This package is part of Swarm Tales and is licensed under the Sustainable Use License 1.0 with Additional Terms,
see LICENSE beside this file. It is source-available, not open source.

The names "Swarm Tales" and "swt" and any logos are not licensed (point 7 of the Additional Terms).

The third-party packages this package depends on are named in its package.json and keep their own licences. A file
copied from a third party ships with its own licence beside it.
`;

/** The project's `LICENSE`, which the build copies into `dist/` of every package. */
export const LICENSE_FILE = join(import.meta.dirname, "LICENSE");

/**
 * Writes the package's `NOTICE` into its output folder; the last step of every build.
 *
 * @param outDir - The output folder of the build.
 */
export function writeNotice(outDir: string): void {
	writeFileSync(join(outDir, "NOTICE"), PACKAGE_NOTICE);
}

/**
 * The one tsdown configuration every package builds with: ESM output plus `.d.ts`, no native code. The build writes
 * `LICENSE` and `NOTICE` into `dist/`, so every tarball carries them without a file outside `dist/` that the tree
 * would hold untracked (M6-07), and it fails when it would inline a package from `node_modules`: every import of a
 * package stays external, so no third-party code ships without its licence.
 */
export const libraryConfig: UserConfig = {
	entry: ["src/index.ts"],
	format: "esm",
	platform: "node",
	target: "node22.19",
	// The declarations come from the composite project of the package, which the typecheck (`tsc -b`) has built under
	// `dist-types/` already: build mode reuses it instead of checking every program a second time (M4-71). Without
	// that output it builds the project first, so `pnpm build` alone gives the same files.
	dts: { build: true },
	clean: true,
	sourcemap: false,
	// `type: module` packages ship `.js` and `.d.ts`, not `.mjs` and `.d.mts`.
	fixedExtension: false,
	deps: { onlyBundle: [] },
	copy: [LICENSE_FILE],
	hooks: {
		"build:done": ({ options }) => {
			writeNotice(options.outDir);
		},
	},
};
