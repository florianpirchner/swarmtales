// SPDX-License-Identifier: LicenseRef-SUL-1.0
import { defineConfig } from "tsdown";
import { libraryConfig } from "../../tsdown.base.ts";

// The viewer runs in a browser. Its style sheets are not bundled: they are copied beside the output, and the
// bundler of the page that mounts the viewer loads them through the imports that stay in the code.
export default defineConfig({
	...libraryConfig,
	platform: "browser",
	target: "es2023",
	external: [/\.css$/],
	copy: [{ from: "src/styles", to: "dist" }],
});
