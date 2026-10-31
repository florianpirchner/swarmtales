import { defineConfig } from "tsdown";
import { libraryConfig } from "../../tsdown.base.ts";

export default defineConfig({
	...libraryConfig,
	entry: ["src/swt.ts"],
	dts: false,
	// The stories are not part of the binary: they stay beside it as TypeScript (Node strips the types).
	deps: { neverBundle: [/stories\/index\.ts$/] },
});
