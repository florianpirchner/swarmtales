/** The one tsdown configuration every package builds with: ESM output plus `.d.ts`, no native code. */
import type { UserConfig } from "tsdown";

export const libraryConfig: UserConfig = {
	entry: ["src/index.ts"],
	format: "esm",
	platform: "node",
	target: "node26",
	dts: true,
	clean: true,
	sourcemap: false,
	// `type: module` packages ship `.js` and `.d.ts`, not `.mjs` and `.d.mts`.
	fixedExtension: false,
};
