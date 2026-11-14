/**
 * Runs the repository's existing tests against the one-object copies of `chess` and `channels`:
 * every import of the two packages, from tests, stories and other packages, resolves to the spike.
 * `pnpm vitest --run --config spike/define-mechanic/vitest.config.ts <test paths>` from the root.
 * `SPIKE_FORM=declared` takes the copies in the recommended form (the head declares the tools, the
 * body holds handlers); `SPIKE_CHESS=head-apart` takes the chess variant whose head is written apart.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const DECLARED = process.env["SPIKE_FORM"] === "declared";
const CHESS = DECLARED ? "chess-declared" : process.env["SPIKE_CHESS"] === "head-apart" ? "chess-head-apart" : "chess";
const CHANNELS = DECLARED ? "channels-declared" : "channels";

export default defineConfig({
	root: here("../.."),
	resolve: {
		alias: [
			{ find: /^@swarmtales\/mechanic-chess$/, replacement: here(`./src/${CHESS}/index.ts`) },
			{ find: /^@swarmtales\/mechanic-channels$/, replacement: here(`./src/${CHANNELS}/index.ts`) },
		],
	},
	test: { testTimeout: 30000, exclude: ["**/node_modules/**", ".claude/**"] },
});
