// SPDX-License-Identifier: LicenseRef-SUL-1.0
import type { UserConfig } from "tsdown";

/** The one tsdown configuration every package builds with: ESM output plus `.d.ts`, no native code. */
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
};
