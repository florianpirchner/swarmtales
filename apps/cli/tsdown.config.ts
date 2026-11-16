// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The build of `@swarmtales/cli` (M6-07): the library entry and the `swt` bin. The reference engine of
 * `swt analyse chess` is a third-party file (BSD-3-Clause) that the command finds upwards from its own module
 * (`engineFile` in `src/chess-engine.ts`), so the build ships it under `dist/third_party/garbochess/` with its
 * licence, its README and its row of `third_party/manifest.json` (`13-m6-spec.md` 6.2).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsdown";
import { libraryConfig, LICENSE_FILE, writeNotice } from "../../tsdown.base.ts";

const THIRD_PARTY = join(import.meta.dirname, "..", "..", "third_party");
const ENGINE = "garbochess";

// The rows of `third_party/manifest.json` for what the build ships: the engine's row only.
function writeManifest(outDir: string): void {
	const rows: unknown = JSON.parse(readFileSync(join(THIRD_PARTY, "manifest.json"), "utf8"));
	const shipped = Array.isArray(rows) ? rows.filter((row: unknown) => typeof row === "object" && row !== null && Reflect.get(row, "name") === ENGINE) : [];
	if (shipped.length !== 1) throw new Error(`third_party/manifest.json holds no row for ${ENGINE}`);
	mkdirSync(join(outDir, "third_party"), { recursive: true });
	writeFileSync(join(outDir, "third_party", "manifest.json"), `${JSON.stringify(shipped, null, "\t")}\n`);
}

export default defineConfig({
	...libraryConfig,
	entry: ["src/index.ts", "src/bin.ts"],
	banner: ({ fileName }) => (fileName === "bin.js" ? "#!/usr/bin/env node" : undefined),
	copy: [LICENSE_FILE, { from: ["garbochess.js", "LICENSE", "README.md"].map((file) => join(THIRD_PARTY, ENGINE, file)), to: join("dist", "third_party", ENGINE) }],
	hooks: {
		"build:done": ({ options }) => {
			writeNotice(options.outDir);
			writeManifest(options.outDir);
		},
	},
});
