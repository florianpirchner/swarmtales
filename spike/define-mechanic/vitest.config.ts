/**
 * Runs the repository's existing tests against the one-object copies of `chess` and `channels`:
 * every import of the two packages, from tests, stories and other packages, resolves to the spike.
 * `pnpm vitest --run --config spike/define-mechanic/vitest.config.ts <test paths>` from the root.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	root: here("../.."),
	resolve: {
		alias: [
			{ find: /^@swarmtales\/mechanic-chess$/, replacement: here("./src/chess/index.ts") },
		],
	},
	test: { testTimeout: 30000, exclude: ["**/node_modules/**", ".claude/**"] },
});
